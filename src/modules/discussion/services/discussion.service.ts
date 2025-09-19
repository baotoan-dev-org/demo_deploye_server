import {
  DataSource,
  DeepPartial,
  EntityManager,
  In,
  IsNull,
  Repository,
  TreeRepository,
} from 'typeorm';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { UserType } from '@/modules/user/user.enum';
import { OrderType } from '@/common/enums/order-type.enum';
import { NotificationService } from '@/modules/notification/services/notification.service';
import { NotificationType } from '@/modules/notification/notification.enum';
import { ProjectTaskAssignee } from '@/modules/project-task/entities/project-task-assignee.entity';
import { ProjectTask } from '@/modules/project-task/entities/project-task.entity';
import { ProjectTaskHandle } from '@/modules/project-task/project-task.handle';
import { CreateDiscussionDto } from '../dtos/create-discussion.dto';
import { UpdateDiscussionDto } from '../dtos/update-discussion.dto';
import { DiscussionTag } from '../entities/discussion-tag.entity';
import { Discussion } from '../entities/discussion.entity';
import { DiscussionTagType, DiscussionType } from '../discussion.enum';
import { DiscussionTagInfo } from '../interfaces/discussion.interface';
import { ProjectTaskType } from '@/modules/project-task/project-task.enum';
import { DiscussionReaction } from '../entities/discussion-reaction.entity';
import { UserMovement } from '@/modules/user/entities/user-movement.entity';
import { CreateDiscussionReactionDto } from '../dtos/create-discussion-reaction.dto';
import { SocketChatService } from '@/modules/socket/services/socket-chat.service';
import { SocketSystemEvent } from '@/modules/socket/socket.enum';
import { GetListDiscussionDto } from '../dtos/get-list-discussion.dto';
import { DiscussionHistory } from '../entities/discussion-history.entity';
import { AttachmentDto } from '@/common/dtos/attachment.dto';
import * as isEqual from 'lodash.isequal';
import { ProjectTaskProposal } from '@/modules/project-task/entities/project-task-proposal.entity';
import { ProjectTaskService } from '@/modules/project-task/service/project-task.service';
import { ProjectTaskProposalService } from '@/modules/project-task/service/project-task-proposal.service';

@Injectable()
export class DiscussionService {
  constructor(
    @InjectRepository(Discussion)
    private readonly discussionRepo: TreeRepository<Discussion>,

    @InjectRepository(ProjectTask)
    private readonly projectTaskRepo: TreeRepository<ProjectTask>,

    @InjectRepository(ProjectTaskAssignee)
    private readonly projectTaskAssigneeRepo: TreeRepository<ProjectTaskAssignee>,

    @InjectRepository(DiscussionReaction)
    private readonly discussionReactionRepo: TreeRepository<DiscussionReaction>,

    @InjectRepository(UserMovement)
    private readonly userMovementRepo: TreeRepository<UserMovement>,

    @InjectRepository(DiscussionHistory)
    private readonly discussionHistoryRepo: Repository<DiscussionHistory>,

    @InjectRepository(ProjectTaskProposal)
    private readonly projectTaskProposalRepo: TreeRepository<ProjectTaskProposal>,

    private readonly projectTaskHandle: ProjectTaskHandle,

    private readonly dataSource: DataSource,

    private readonly notificationService: NotificationService,

    private readonly projectTaskService: ProjectTaskService,

    private readonly socketChatService: SocketChatService,

    private readonly projectTaskProposalService: ProjectTaskProposalService,
  ) {}

  async getListRepliesOfDiscussion(parentDiscussionId: string, user: UserRequest) {
    const replies = await this.discussionRepo.find({
      where: { parent: { id: parentDiscussionId } },
      relations: ['createdBy', 'parent', 'children', 'discussionTags'],
      order: { createdAt: OrderType.ASC },
      select: {
        id: true,
        createdBy: { id: true, name: true, url: true },
        reactionCount: true,
        reactionSummary: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        attachments: true,
        lastModifiedAt: true,
        childrenCount: true,
        parent: {
          id: true,
          content: true,
          createdBy: { id: true, name: true, url: true },
          children: true,
        },
        discussionTags: { id: true, userId: true, type: true, index: true, length: true },
      },
    });

    if (!replies.length) return [];

    return this.buildTreeFromFlatList(replies, user);
  }

  async getListDiscussionsForEntity(
    getListDiscussionDto: GetListDiscussionDto,
    entityId: string,
    user: UserRequest,
  ) {
    const { page, take, orderBy, order } = getListDiscussionDto;
    const [list, total] = await this.discussionRepo.findAndCount({
      where: { entityId, parent: IsNull() },
      relations: ['createdBy', 'parent', 'discussionTags'],
      order: { [orderBy]: order },
      select: {
        id: true,
        createdBy: { id: true, name: true, url: true },
        reactionCount: true,
        reactionSummary: true,
        content: true,
        createdAt: true,
        updatedAt: true,
        attachments: true,
        childrenCount: true,
        lastModifiedAt: true,
        parent: {
          id: true,
          content: true,
          createdBy: { id: true, name: true, url: true },
          children: true,
        },
        discussionTags: { id: true, userId: true, type: true, index: true, length: true },
      },
      skip: (page - 1) * take,
      take,
    });

    const reactions = await this.discussionReactionRepo.find({
      where: { discussion: In(list.map((d) => d.id)), createdById: user.id },
      select: {
        discussionId: true,
        createdById: true,
        type: true,
      },
    });

    return {
      total,
      list: Array.isArray(list)
        ? list.map((item) => ({
            ...item,
            children: [],
            myReactionType: reactions.find((r) => r.discussionId === item.id),
          }))
        : [],
    };
  }

  async emitDiscussionTreePayload(
    entityId: string,
    discussionId: string,
    manager: EntityManager,
    event: SocketSystemEvent = SocketSystemEvent.UPDATE_DISCUSSION,
    user: UserRequest,
  ) {
    let rootDiscussion = await manager.findOne(Discussion, {
      where: { id: discussionId },
      relations: ['parent'],
    });
    while (rootDiscussion && rootDiscussion.parentId) {
      rootDiscussion = await manager.findOne(Discussion, {
        where: { id: rootDiscussion.parentId },
        relations: ['parent'],
      });
      if (!rootDiscussion) break;
    }
    if (!rootDiscussion) return;

    const descendants = await manager.getRepository(Discussion).find({
      where: { entityId: rootDiscussion.entityId },
      relations: ['createdBy', 'parent', 'children', 'discussionTags'],
      order: { createdAt: OrderType.ASC },
      select: {
        id: true,
        createdBy: { id: true, name: true, url: true },
        reactionCount: true,
        reactionSummary: true,
        content: true,
        createdAt: true,
        attachments: true,
        childrenCount: true,
        lastModifiedAt: true,
        parent: {
          id: true,
          content: true,
          createdBy: { id: true, name: true, url: true },
          children: true,
        },
        discussionTags: { id: true, userId: true, type: true, index: true, length: true },
      },
    });

    const treeNodes = await this.buildTreeFromFlatList(descendants, user);
    const treePayload = treeNodes.find((node) => node.id === rootDiscussion.id);

    this.socketChatService.emitRoom({
      room: `chat_${entityId}`,
      payload: treePayload,
      event,
    });
  }

  async buildTreeFromFlatList(list: Discussion[], user: UserRequest) {
    const reactionsOfUser = await this.discussionReactionRepo.find({
      where: { discussion: In(list.map((item) => item.id)), createdById: user.id },
      select: {
        discussionId: true,
        createdById: true,
        type: true,
      },
    });
    type DiscussionTreeNode = Omit<Discussion, 'children'> & {
      children: DiscussionTreeNode[];
      myReactionType?: DiscussionReaction;
    };
    const map = new Map<string, DiscussionTreeNode>();
    const roots: DiscussionTreeNode[] = [];
    for (const item of list)
      map.set(item.id, {
        ...item,
        children: [],
        myReactionType: reactionsOfUser.find((r) => r.discussionId === item.id),
      });
    for (const item of list) {
      const node = map.get(item.id)!;
      const parentId = item.parent?.id;
      if (parentId && map.has(parentId)) map.get(parentId)!.children!.push(node);
      else roots.push(node);
    }
    return roots;
  }

  async checkProjectTaskPermission(
    isAdmin: boolean,
    user: UserRequest,
    discussionData: CreateDiscussionDto,
  ) {
    switch (discussionData.type) {
      case DiscussionType.PROJECT_TASK:
        const allDescendantIds = await this.projectTaskHandle.getAllDescendantIdsByUserId(
          isAdmin,
          user.id,
          user?.orgUnitId,
        );
        if (!isAdmin && !allDescendantIds.includes(discussionData.entityId))
          throw new BadRequestException('Bạn không có quyền bình luận về công việc dự án này.');
        break;
      case DiscussionType.PROJECT_TASK_PROPOSAL:
        break;
      case DiscussionType.USER_MOVEMENT:
        break;
    }
  }

  async getNotificationUsers(
    entityId: string,
    type: DiscussionType,
    discussionTags: DiscussionTagInfo[],
    user: UserRequest,
  ) {
    let userIdsNotification: string[] = [];
    let taggedUserIds: string[] = [];
    const isTagAll = discussionTags?.some((tag) => tag.type === DiscussionTagType.ALL);

    const getTaggedUserIds = (userNotificationIds: string[]) =>
      (discussionTags || [])
        .map((tag) => tag.userId)
        .filter((id) => id && id !== user.id && !userNotificationIds.includes(id));

    if (type === DiscussionType.PROJECT_TASK || type === DiscussionType.PROJECT_TASK_PROPOSAL) {
      let users: any[] = [];
      if (type === DiscussionType.PROJECT_TASK) {
        users = await this.projectTaskService.getListUserOfProjectTask(entityId, user);
      } else users = await this.projectTaskProposalService.getListUserOfProposal(entityId, user);

      const userNotificationIds = users.map((u) => u.id).filter((id) => id && id !== user.id);

      if (discussionTags && discussionTags.length > 0) {
        if (isTagAll) {
          taggedUserIds = userNotificationIds;
          userIdsNotification = [];
        } else {
          taggedUserIds = getTaggedUserIds(userNotificationIds);
          userIdsNotification = userNotificationIds.filter((id) => !taggedUserIds.includes(id));
        }
      } else {
        userIdsNotification = userNotificationIds;
        taggedUserIds = [];
      }
    } else if (type === DiscussionType.USER_MOVEMENT) {
      const userMovement = await this.userMovementRepo.findOne({
        relations: { userMovementApprovers: true },
        where: { id: entityId },
        select: {
          id: true,
          createdById: true,
          userId: true,
          userMovementApprovers: true,
        },
      });
      const userApprovers =
        userMovement?.userMovementApprovers.map((approver) => approver.approverId) || [];
      const userIds = Array.from(
        new Set([...userApprovers, userMovement?.createdById].filter(Boolean)),
      );
      taggedUserIds = (discussionTags || [])
        .map((tag) => tag.userId)
        .filter((id) => id && id !== user.id);
      userIdsNotification = userIds.filter((id) => id !== user.id && !taggedUserIds.includes(id));
      if (isTagAll) {
        userIdsNotification = [];
        taggedUserIds = userIds;
      }
    }
    return {
      userIdsNotification,
      taggedUserIds,
    };
  }

  async getEntityInfo(id: string, type: string, user: UserRequest) {
    let content: string = '';
    let contentTag: string = '';
    let path: string = '';
    switch (type) {
      case DiscussionType.PROJECT_TASK:
        const projectTask = await this.projectTaskRepo.findOne({
          where: { id },
          select: ['name', 'type'],
        });
        if (!projectTask) throw new BadRequestException('Dự án/công việc không tồn tại');
        const type = projectTask.type === ProjectTaskType.PROJECT ? 'Dự án' : 'Công việc';
        content = `${user.name} đã bình luận về "${type} ${projectTask.name}"`;
        contentTag = `${user.name} đã nhắc đến bạn trong bình luận về "${type} ${projectTask.name}"`;
        path = `/dashboard/project-task?projectTaskId=${projectTask.id}`;
        break;
      case DiscussionType.PROJECT_TASK_PROPOSAL:
        const proposal = await this.projectTaskProposalRepo.findOne({
          where: { id },
          select: ['title', 'projectTaskId'],
        });
        if (!proposal) throw new BadRequestException('Đề xuất phê duyệt không tồn tại');
        content = `${user.name} đã bình luận về đề xuất "${proposal.title}""`;
        contentTag = `${user.name} đã nhắc đến bạn trong bình luận về đề xuất "${proposal.title}""`;
        path = `/dashboard/project-task?projectTaskId=${proposal.projectTaskId}&proposalId=${proposal.id}`;
        break;
      case DiscussionType.USER_MOVEMENT:
        const userMovement = await this.userMovementRepo.findOne({
          relations: ['user'],
          where: { id },
          select: {
            id: true,
            type: true,
            user: {
              name: true,
            },
          },
        });

        if (!userMovement) throw new BadRequestException('Đề xuất phê duyệt không tồn tại');
        content = `${user.name} đã bình luận về đề xuất "${userMovement.type}" của nhân sự ${userMovement.user?.name}`;
        contentTag = `${user.name} đã nhắc đến bạn trong bình luận về đề xuất "${userMovement.type}" của nhân sự ${userMovement.user?.name}`;
        path = `/dashboard/proposals-user-transfer?userMovementId=${id}`;
        break;
    }
    return { content, contentTag, path };
  }

  async createDiscussion(createDiscussionDto: CreateDiscussionDto, user: UserRequest) {
    const isAdmin = [UserType.ADMIN, UserType.ROOT].includes(user.type);
    const { parentDiscussionId, discussionTags, ...discussionData } = createDiscussionDto;

    const { content, contentTag, path } = await this.getEntityInfo(
      discussionData.entityId,
      discussionData.type,
      user,
    );

    await this.checkProjectTaskPermission(isAdmin, user, discussionData);

    const discussionInsert: DeepPartial<Discussion> = {
      ...discussionData,
      createdById: user.id,
      reactionSummary: {},
      parent: parentDiscussionId ? { id: parentDiscussionId } : null,
    };

    return await this.dataSource
      .transaction(async (manager) => {
        const savedDiscussion = await manager.save(Discussion, discussionInsert);

        // Update childrenCount for parent
        if (savedDiscussion.parentId)
          await manager.increment(Discussion, { id: savedDiscussion.parentId }, 'childrenCount', 1);

        if (discussionTags && discussionTags.length > 0) {
          await manager.save(
            DiscussionTag,
            discussionTags.map((tag) => ({
              ...tag,
              discussionId: savedDiscussion.id,
            })),
          );
        }

        await this.emitDiscussionTreePayload(
          discussionData.entityId,
          savedDiscussion.id,
          manager,
          SocketSystemEvent.UPDATE_DISCUSSION,
          user,
        );

        const { userIdsNotification, taggedUserIds } = await this.getNotificationUsers(
          discussionData.entityId,
          createDiscussionDto.type,
          discussionTags,
          user,
        );

        if (userIdsNotification.length > 0) {
          await this.notificationService.createManyNotification({
            notification: {
              title: 'Bình luận mới từ ' + user.name,
              content,
              type: NotificationType.COMMENT,
              path,
              createdById: user.id,
              userIds: userIdsNotification,
            },
            isPushFCM: true,
            manager,
          });
        }

        if (taggedUserIds.length > 0) {
          await this.notificationService.createManyNotification({
            notification: {
              title: 'Bạn được nhắc đến trong bình luận từ ' + user.name,
              content: contentTag,
              type: NotificationType.COMMENT,
              path,
              createdById: user.id,
              userIds: taggedUserIds,
            },
            isPushFCM: true,
            manager,
          });
        }
      })
      .then(() => {
        return { success: true };
      })
      .catch((error) => {
        throw new BadRequestException(`Error creating comment: ${error.message}`);
      });
  }

  async getDetailReactionOfDiscussion(discussionId: string) {
    const discussion = await this.discussionRepo.findOne({
      where: { id: discussionId },
      select: {
        id: true,
      },
    });

    if (!discussion) throw new BadRequestException('Thảo luận không tồn tại.');

    return await this.discussionReactionRepo.find({
      where: { discussionId },
      relations: ['createdBy'],
      select: {
        id: true,
        type: true,
        createdBy: { id: true, name: true, url: true },
      },
    });
  }

  async getListHistoryOfDiscussion(discussionId: string) {
    return await this.discussionHistoryRepo.find({
      where: { discussionId },
      relations: ['createdBy'],
      select: {
        id: true,
        oldContent: true,
        newContent: true,
        oldAttachments: true,
        newAttachments: true,
        createdAt: true,
        createdBy: { id: true, name: true, url: true },
      },
    });
  }

  async updateDiscussion(id: string, updateDiscussionDto: UpdateDiscussionDto, user: UserRequest) {
    const { parentDiscussionId } = updateDiscussionDto;
    const [existingDiscussion, parentDiscussion] = await Promise.all([
      this.discussionRepo.findOne({ where: { id } }),
      parentDiscussionId
        ? this.discussionRepo.exists({ where: { id: parentDiscussionId } })
        : false,
    ]);

    if (!existingDiscussion) throw new BadRequestException(`Bình luận với id ${id} không tồn tại.`);

    if (parentDiscussionId && !parentDiscussion)
      throw new BadRequestException(`Bình luận cha không tồn tại.`);

    const { discussionTags: existingDiscussionTags, ...existingData } = existingDiscussion;

    if (existingDiscussion.createdById !== user.id)
      throw new BadRequestException('Bạn không có quyền sửa bình luận này.');

    const { content, contentTag, path } = await this.getEntityInfo(
      existingDiscussion.entityId,
      existingDiscussion.type,
      user,
    );

    const { discussionTags, ...updateData } = updateDiscussionDto;
    const updatedDiscussion: DeepPartial<Discussion> = {
      id: existingDiscussion.id,
      ...existingData,
      ...updateData,
      updatedById: user.id,
      updatedAt: new Date(),
    };

    const isContentChanged = !isEqual(existingData.content, updatedDiscussion.content);
    const isTagsChanged = !isEqual(existingDiscussionTags, updatedDiscussion.discussionTags);
    const isAttachmentsChanged = !isEqual(existingData.attachments, updatedDiscussion.attachments);

    return await this.dataSource
      .transaction(async (manager) => {
        if (isContentChanged || isTagsChanged || isAttachmentsChanged) {
          updatedDiscussion.lastModifiedAt = new Date();
          let createDiscussionHistory: Partial<DiscussionHistory> = {
            discussionId: updatedDiscussion.id,
            oldContent: isContentChanged ? existingData.content : null,
            newContent: isContentChanged ? updatedDiscussion.content : null,
            oldAttachments: isAttachmentsChanged ? existingData.attachments : null,
            newAttachments: isAttachmentsChanged
              ? (updatedDiscussion.attachments as AttachmentDto[])
              : null,
            createdById: user.id,
          };

          await manager.save(DiscussionHistory, createDiscussionHistory);
        }

        await manager.save(Discussion, updatedDiscussion);

        if (discussionTags && discussionTags.length > 0) {
          await manager.delete(DiscussionTag, { discussionId: updatedDiscussion.id });
          const newTags = discussionTags.map((tag) => ({
            ...tag,
            discussionId: updatedDiscussion.id,
          }));
          await manager.insert(DiscussionTag, newTags);
        }

        await this.emitDiscussionTreePayload(
          updatedDiscussion.entityId,
          updatedDiscussion.id,
          manager,
          SocketSystemEvent.UPDATE_DISCUSSION,
          user,
        );

        const { userIdsNotification, taggedUserIds } = await this.getNotificationUsers(
          updatedDiscussion.entityId,
          updatedDiscussion.type,
          discussionTags,
          user,
        );

        if (userIdsNotification.length > 0)
          await this.notificationService.createManyNotification({
            notification: {
              title: 'Bình luận cập nhật từ ' + user.name,
              content,
              type: NotificationType.COMMENT,
              path,
              createdById: user.id,
              userIds: userIdsNotification,
            },
            isPushFCM: true,
            manager,
          });

        if (taggedUserIds.length > 0)
          await this.notificationService.createManyNotification({
            notification: {
              title: 'Bạn được nhắc đến trong bình luận từ ' + user.name,
              content: contentTag,
              type: NotificationType.COMMENT,
              path,
              createdById: user.id,
              userIds: taggedUserIds,
            },
            isPushFCM: true,
            manager,
          });
      })
      .then(() => {
        return { success: true };
      })
      .catch((error) => {
        throw new BadRequestException(`Lỗi cập nhật bình luận: ${error.message}`);
      });
  }

  async deleteDiscussion(id: string, user: UserRequest) {
    const existingDiscussion = await this.discussionRepo.findOne({
      where: { id },
    });
    if (!existingDiscussion) throw new BadRequestException(`Bình luận với id ${id} không tồn tại.`);
    if (existingDiscussion.createdById !== user.id)
      throw new BadRequestException('Bạn không có quyền xóa bình luận này.');

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.delete(Discussion, { id });

        if (existingDiscussion.parentId) {
          await manager.decrement(
            Discussion,
            { id: existingDiscussion.parentId },
            'childrenCount',
            1,
          );
          await this.emitDiscussionTreePayload(
            existingDiscussion.entityId,
            existingDiscussion.parentId,
            manager,
            SocketSystemEvent.UPDATE_DISCUSSION,
            user,
          );
        } else {
          this.socketChatService.emitRoom({
            room: `chat_${existingDiscussion.entityId}`,
            payload: {
              id: existingDiscussion.id,
              entityId: existingDiscussion.entityId,
            },
            event: SocketSystemEvent.DELETE_DISCUSSION,
          });
        }
      })
      .then(() => {
        return { success: true };
      })
      .catch((error) => {
        throw new BadRequestException(`Error creating comment: ${error.message}`);
      });
  }

  async createReaction(
    discussionId: string,
    createDiscussionReactionDto: CreateDiscussionReactionDto,
    user: UserRequest,
  ) {
    const { type } = createDiscussionReactionDto;
    const discussion = await this.discussionRepo.findOne({ where: { id: discussionId } });
    if (!discussion) throw new BadRequestException('Thảo luận không tồn tại.');

    return await this.dataSource.transaction(async (manager) => {
      let reactionSummary = discussion.reactionSummary ? { ...discussion.reactionSummary } : {};
      let reactionCount = discussion.reactionCount || 0;

      const existingReaction = await manager.findOne(DiscussionReaction, {
        where: { createdById: user.id, discussion: { id: discussionId } },
      });

      if (existingReaction) {
        if (existingReaction.type === type) {
          await manager.delete(DiscussionReaction, { id: existingReaction.id });
          reactionSummary[type] = Math.max(0, (reactionSummary[type] || 1) - 1);
          reactionCount = Math.max(0, reactionCount - 1);
          await manager.update(Discussion, discussionId, { reactionSummary, reactionCount });
          await this.emitDiscussionTreePayload(
            discussion.entityId,
            discussion.id,
            manager,
            SocketSystemEvent.UPDATE_DISCUSSION,
            user,
          );
          return { success: true, type: null };
        } else {
          reactionSummary[existingReaction.type] = Math.max(
            0,
            (reactionSummary[existingReaction.type] || 1) - 1,
          );
          reactionSummary[type] = (reactionSummary[type] || 0) + 1;
          await manager.save(DiscussionReaction, { ...existingReaction, type });
          await manager.update(Discussion, discussionId, { reactionSummary, reactionCount });
          await this.emitDiscussionTreePayload(
            discussion.entityId,
            discussion.id,
            manager,
            SocketSystemEvent.UPDATE_DISCUSSION,
            user,
          );
          return { success: true, type };
        }
      }

      await manager.save(DiscussionReaction, {
        createdById: user.id,
        type,
        discussion: { id: discussionId },
      });
      reactionSummary[type] = (reactionSummary[type] || 0) + 1;
      reactionCount += 1;
      await manager.update(Discussion, discussionId, { reactionSummary, reactionCount });
      await this.emitDiscussionTreePayload(
        discussion.entityId,
        discussion.id,
        manager,
        SocketSystemEvent.UPDATE_DISCUSSION,
        user,
      );

      return { success: true, type };
    });
  }
}
