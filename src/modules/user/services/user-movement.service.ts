import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Brackets,
  DataSource,
  DeepPartial,
  EntityManager,
  FindOptionsWhere,
  In,
  IsNull,
  LessThanOrEqual,
  Not,
  Repository,
  TreeRepository,
} from 'typeorm';
import { UserHandle } from '../user.handle';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import {
  SubManagerStatus,
  UserApproveTransferType,
  UserMovementApproveType,
  UserMovementSearchType,
  UserMovementStatus,
  UserMovementType,
  UserTrackingType,
  UserType,
} from '../user.enum';
import { QueryService } from '@/common/services/query.service';
import { v4 as uuidv4 } from 'uuid';
import { Position } from '@/modules/position/entities/position.entity';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { UserOrgUnitPosition } from '../entities/user-unit-position.entity';
import { UserRequest } from '@/common/interfaces/user-request.type';
import {
  CreateUserMovementDto,
  CreateUserSubManagerDto,
} from '../dtos/movements/create-user-movement';
import { UserMovement } from '../entities/user-movement.entity';
import { UserMovementApprover } from '../entities/user-movement-approve.entity';
import { GetListUserMovementDto } from '../dtos/get-list-user-movement.dto';
import { OrgUnitType } from '@/modules/org-unit/org-unit.enum';
import { UpdateUserMovementApproveDto } from '../dtos/movements/update-user-movement-approve.dto';
import { CreateUserMovementNotifyDto } from '../dtos/create-user-movement-notify.dto';
import { UserMovementNotify } from '../entities/user-movement-notify.entity';
import { NotificationService } from '@/modules/notification/services/notification.service';
import { userMovementTypeToNotificationType } from '../user.constant';
import { GetListApproverDto } from '../dtos/get-list-approver.dto';
import { PositionSubManager, PositionType } from '@/modules/position/position.enum';
import { AddUserFollowersDto } from '../dtos/movements/add-user-followers.dto';
import { DeleteUserFollowersDto } from '../dtos/movements/delete-user-followers.dto';
import { SubManager } from '../entities/sub-manager.entity';
import { Cron } from '@nestjs/schedule';
import { UpdateUserMovementDto } from '../dtos/movements/update-user-movement.dto';
import { UserTracking } from '../entities/user-tracking';
import { CACHE_KEY } from '@/common/consts/cache.const';
import { CacheService } from '@/common/services/cache.service';
import { OrderType } from '@/common/enums/order-type.enum';

@Injectable()
export class UserMovementService {
  constructor(
    private dataSource: DataSource,

    private userHandle: UserHandle,

    private queryService: QueryService,

    private cacheService: CacheService,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Position)
    private positionRepository: Repository<Position>,

    @InjectRepository(OrgUnit)
    private orgUnitRepository: TreeRepository<OrgUnit>,

    @InjectRepository(UserOrgUnitPosition)
    private userOrgUnitPositionRepository: Repository<UserOrgUnitPosition>,

    @InjectRepository(UserMovement)
    private userMovementRepo: Repository<UserMovement>,

    @InjectRepository(UserMovementApprover)
    private userMovementApproverRepo: Repository<UserMovementApprover>,

    @InjectRepository(UserMovementNotify)
    private userMovementNotifyRepo: Repository<UserMovementNotify>,

    @InjectRepository(SubManager)
    private subManagerRepo: Repository<SubManager>,

    @InjectRepository(UserTracking)
    private userTrackingRepo: Repository<UserTracking>,

    private readonly notificationService: NotificationService,
  ) {}

  @Cron('0 30 7 * * *', { timeZone: 'Asia/Ho_Chi_Minh' }) // 0h02 sáng: cập nhật trạng thái đề xuất
  // @Cron('*/5 * * * * *', { timeZone: 'Asia/Ho_Chi_Minh' }) // Chạy mỗi 5 giây để test
  async updateUserMovementStatus() {
    console.log(`start updateUserMovementStatus`);

    const userMovements = await this.userMovementRepo.find({
      where: {
        status: UserMovementStatus.APPROVED,
        dateAppointment: LessThanOrEqual(new Date()),
      },
      relations: ['userMovementApprovers', 'user', 'position', 'orgUnit'],
      select: {
        id: true,
        status: true,
        userId: true,
        orgUnitId: true,
        positionId: true,
        createdById: true,
        oldValue: true,
        dateAppointment: true,
        type: true,
        user: {
          id: true,
          name: true,
        },
        position: {
          id: true,
          name: true,
          type: true,
          subManager: true,
        },
        orgUnit: {
          id: true,
          name: true,
        },
        userMovementApprovers: {
          id: true,
          approverId: true,
        },
      },
    });

    console.log(`userMovements`, userMovements.length);

    await this.checkUpdateUserMovementEffective(userMovements);
  }

  async checkUpdateUserMovementEffective(
    userMovements: UserMovement[],
    externalManager?: EntityManager,
  ) {
    console.log(`checkUpdateUserMovementEffective`, userMovements.length);

    for (const userMovement of userMovements) {
      if (new Date(userMovement.dateAppointment).getTime() <= new Date().getTime()) {
        const whereUserPositionOld = {
          userId: userMovement.userId,
          orgUnitId: userMovement.oldValue.orgUnit.id,
          positionId: userMovement.oldValue.position.id,
        };

        const [existsOldManger, existsSubManager, userOrgPositionOld] = await Promise.all([
          this.orgUnitRepository.findOne({
            where: { id: userMovement.oldValue.orgUnit.id, managerId: userMovement.userId },
          }),

          userMovement.orgUnitId &&
          userMovement.position?.subManager === PositionSubManager.SUB_MANAGER
            ? this.subManagerRepo.findOne({
                where: {
                  userId: userMovement.userId,
                  orgUnitParentId: userMovement.orgUnitId,
                  status: SubManagerStatus.INACTIVE,
                },
              })
            : null,

          this.userOrgUnitPositionRepository.findOne({
            where: whereUserPositionOld,
            select: ['positionType'],
          }),
        ]);

        const oldUnitPositionDelete: DeepPartial<UserOrgUnitPosition> = whereUserPositionOld;

        const newUnitPositionInsert: DeepPartial<UserOrgUnitPosition> =
          userMovement.orgUnitId && userMovement.positionId && userOrgPositionOld
            ? {
                userId: userMovement.userId,
                orgUnitId: userMovement.orgUnitId,
                positionId: userMovement.positionId,
                positionType: userOrgPositionOld.positionType,
              }
            : null;

        // Sử dụng manager từ bên ngoài hoặc tạo transaction mới
        if (externalManager) {
          await this.executeUserMovementUpdate(
            userMovement,
            oldUnitPositionDelete,
            newUnitPositionInsert,
            existsOldManger,
            existsSubManager,
            externalManager,
          );

          // Gửi notification khi dùng externalManager
          await this.sendNotification(userMovement);
        } else {
          await this.dataSource
            .transaction(async (manager) => {
              await this.executeUserMovementUpdate(
                userMovement,
                oldUnitPositionDelete,
                newUnitPositionInsert,
                existsOldManger,
                existsSubManager,
                manager,
              );
            })
            .then(async () => {
              // Gửi notification khi dùng transaction mới
              await this.sendNotification(userMovement);
            })
            .catch((err) => {
              console.log(err);
            });
        }

        // xóa cache
        await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);
        await this.cacheService.del(CACHE_KEY.POSITION_TREE);
      }
    }
  }

  async createUserMovement(createUserMovementDto: CreateUserMovementDto, user?: UserRequest) {
    // if (!user.orgUnitId) throw new BadRequestException('Người dùng không phải quản lý đơn vị!');

    const { newValue, oldValue, type, userId, approvers, followers, dateAppointment, subManagers } =
      createUserMovementDto;

    const approverIds = [...new Set(approvers.map((e) => e.approverId))];

    const orgUnitIds = subManagers.map((s) => s.orgUnitId);

    const [
      existsPositionNew,
      existsOrgUnitNew,
      existsPositionOld,
      existsOrgUnitOld,
      existsUser,
      conflictUserMovement,
      existingApproversCount,
      existsOrgUnitRoot,
      existsUserOrgUnitPosition,
      existsPositionRoot,
      conflictUserMovementNew,
      countOrgUnits,
      conflictSubManager,
    ] = await Promise.all([
      newValue?.position?.id &&
        this.positionRepository.findOne({
          where: { id: newValue.position.id },
          select: ['type', 'subManager'],
        }),

      newValue?.orgUnit?.id &&
        this.orgUnitRepository.findOne({ where: { id: newValue.orgUnit.id } }),

      this.positionRepository.exists({ where: { id: oldValue.position.id } }),

      this.orgUnitRepository.findOne({
        where: { id: oldValue.orgUnit.id },
        relations: ['manager'],
        select: {
          manager: {
            id: true,
          },
        },
      }),

      this.userRepo.findOne({ where: { id: userId }, select: ['id', 'code', 'name', 'url'] }),

      this.userMovementRepo.exists({
        where: { userId, status: In([UserMovementStatus.PENDING, UserMovementStatus.APPROVED]) },
      }),

      this.userRepo.count({ where: { id: In(approverIds) } }),

      this.orgUnitRepository.exists({ where: { id: user.orgUnitId, parentId: IsNull() } }),

      newValue?.orgUnit?.id &&
        newValue?.position?.id &&
        this.userOrgUnitPositionRepository.exists({
          where: {
            userId,
            orgUnitId: newValue.orgUnit.id,
            positionId: newValue.position.id,
          },
        }),

      this.positionRepository.exists({ where: { id: user.positionId, parentId: IsNull() } }),

      newValue?.position?.id &&
        newValue?.orgUnit?.id &&
        this.userMovementRepo.findOne({
          relations: ['user'],
          where: {
            positionId: newValue.position.id,
            orgUnitId: newValue.orgUnit.id,
            status: UserMovementStatus.PENDING,
          },
          select: {
            id: true,
            user: {
              id: true,
              name: true,
            },
          },
        }),

      this.orgUnitRepository.count({ where: { id: In(orgUnitIds) } }),

      this.subManagerRepo.findOne({
        where: { orgUnitId: In(orgUnitIds), userId: Not(userId) },
        relations: ['orgUnit', 'user'],
        select: {
          id: true,
          orgUnit: { id: true, name: true },
          user: { id: true, name: true },
        },
      }),
    ]);

    const [conflictUnit, conflictAssistant] = await Promise.all([
      // check conflict unit manager
      existsPositionNew && existsPositionNew.type === PositionType.MANAGER
        ? await this.orgUnitRepository.findOne({
            relations: ['manager'],
            where: {
              id: newValue.orgUnit.id,
            },
            select: {
              id: true,
              name: true,
              managerId: true,
              manager: {
                id: true,
                name: true,
              },
            },
          })
        : null,

      // check conflict assistant
      existsPositionNew && existsPositionNew.type === PositionType.ASSISTANT
        ? await this.userOrgUnitPositionRepository.findOne({
            where: { orgUnitId: newValue.orgUnit.id, positionId: newValue.position.id },
            relations: ['user'],
            select: {
              id: true,
              user: {
                id: true,
                name: true,
              },
            },
          })
        : null,
    ]);

    if (!existsPositionNew && type !== UserMovementType.DEMOTION)
      throw new BadRequestException('Vị trí mới không tồn tại!');

    if (!existsOrgUnitNew && type !== UserMovementType.DEMOTION)
      throw new BadRequestException('Đơn vị mới không tồn tại!');

    if (!existsPositionOld) throw new BadRequestException('Vị trí cũ không tồn tại!');
    if (!existsOrgUnitOld) throw new BadRequestException('Đơn vị cũ không tồn tại!');
    if (!existsUser) throw new BadRequestException('Người dùng không tồn tại!');

    if (
      existsUserOrgUnitPosition &&
      existsPositionNew.subManager !== PositionSubManager.SUB_MANAGER
    )
      throw new BadRequestException(
        `Bạn đã có vị trí ${newValue.position.positionName} cho đơn vị ${existsOrgUnitNew.name}`,
      );

    if (
      conflictUserMovementNew &&
      (existsPositionNew.type === PositionType.MANAGER ||
        existsPositionNew.subManager === PositionSubManager.SUB_MANAGER)
    )
      throw new BadRequestException(
        `Chức vụ ${newValue.position.positionName} đơn vị ${newValue.orgUnit.orgName} đã có đề xuất của ${conflictUserMovementNew.user.name} chưa được duyệt!`,
      );

    if (existingApproversCount !== approverIds.length)
      throw new BadRequestException(`Một số người duyệt không tồn tại`);

    if (conflictUserMovement)
      throw new BadRequestException('Người dùng hiện tại có đề xuất chưa được duyệt');

    if (conflictUnit && conflictUnit.managerId && conflictUnit.managerId !== userId)
      throw new BadRequestException(
        `Đơn vị ${conflictUnit.name} đã có ${conflictUnit.manager?.name} quản lý!`,
      );

    if (countOrgUnits !== orgUnitIds.length)
      throw new BadRequestException('Một hoặc nhiều đơn vị tổ chức không tồn tại!');

    if (conflictSubManager && existsPositionNew.subManager === PositionSubManager.SUB_MANAGER)
      throw new BadRequestException(
        `Đơn vị ${conflictSubManager.orgUnit.name} đang được quản lý bởi ${conflictSubManager.user.name}`,
      );

    let [ancestorsFlatNew, ancestorsFlatOld] = await Promise.all([
      existsOrgUnitNew ? this.orgUnitRepository.findAncestors(existsOrgUnitNew) : [],
      this.orgUnitRepository.findAncestors(existsOrgUnitOld),
    ]);

    const descendantIds = ancestorsFlatOld.map((unit) => unit.id);

    // Kiểm tra điều kiện type và ancestor
    if (type === UserMovementType.APPOINTMENT && !descendantIds.includes(newValue.orgUnit.id))
      throw new BadRequestException(
        'Đơn vị mới phải cùng đơn vị của đơn vị hiện tại khi bổ nhiệm!',
      );

    if (conflictAssistant)
      throw new BadRequestException(
        `Vị trí ${newValue.position.positionName} đã có ${conflictAssistant.user.name} đang đảm nhiệm!`,
      );

    // Đảm bảo dateAppointment có giờ phút giây bằng 0
    const normalizedDateAppointment = new Date(dateAppointment);
    normalizedDateAppointment.setHours(0, 0, 0, 0);
    let userMovementInsert: DeepPartial<UserMovement> = {
      id: uuidv4(),
      ...createUserMovementDto,
      createdById: user?.id,
      positionId: newValue?.position?.id || null,
      orgUnitId: newValue?.orgUnit?.id || null,
      dateAppointment: normalizedDateAppointment,
      newValue: newValue
        ? {
            ...newValue,
            orgUnit: this.userHandle.findOrgUnitInfo(newValue.orgUnit, ancestorsFlatNew),
            subManagers: [],
          }
        : null,
      oldValue: {
        ...oldValue,
        orgUnit: this.userHandle.findOrgUnitInfo(oldValue.orgUnit, ancestorsFlatOld),
        subManagers: [],
        user: {
          id: userId,
          code: existsUser.code,
          name: existsUser.name,
          url: existsUser.url,
        },
      },
      status: UserMovementStatus.PENDING,
    } as DeepPartial<UserMovement>;

    if (orgUnitIds.length > 0) {
      const { subManagerOld, subManagerNew } = await this.getSubManagerHistory(
        orgUnitIds,
        newValue.orgUnit.id,
        userId,
      );

      userMovementInsert.oldValue.subManagers = subManagerOld;
      userMovementInsert.newValue.subManagers = subManagerNew;
    }

    // Lọc approvers trùng lặp, lấy order lớn nhất cho mỗi approverId
    const uniqueApprovers = this.userHandle.filterUniqueApprovers(approvers);

    // Map sang userMovementApprovers với approvers đã được lọc
    let userMovementApprovers: DeepPartial<UserMovementApprover>[] = uniqueApprovers.map(
      (approver) => ({
        id: uuidv4(),
        userMovementId: userMovementInsert.id,
        approverId: approver.approverId,
        order: approver.order,
        allowedApprove: true,
        createdById: user?.id,
        transferType: approver.transferType,
        status:
          approver.approverId === user.id
            ? UserMovementStatus.APPROVED
            : UserMovementStatus.PENDING,
      }),
    );

    if (userMovementApprovers.length === 0) throw new BadRequestException('Không có người duyệt!');

    const userMovementFollowers: DeepPartial<UserMovementApprover>[] = [...new Set(followers)].map(
      (followerId) => ({
        id: uuidv4(),
        userMovementId: userMovementInsert.id,
        approverId: followerId,
        allowedApprove: false,
        createdById: user?.id,
        status: UserMovementStatus.VIEW,
        approveType: UserMovementApproveType.FOLLOWERS,
        order: 0,
      }),
    );

    if (
      !uniqueApprovers.some((e) => e.approverId === user.id) &&
      !userMovementFollowers.some((e) => e.approverId === user.id)
    )
      userMovementApprovers.push({
        id: uuidv4(),
        userMovementId: userMovementInsert.id,
        approverId: user.id,
        allowedApprove: false,
        createdById: user?.id,
        status: UserMovementStatus.VIEW,
        approveType: UserMovementApproveType.CREATOR,
        order: 0,
      });

    // nếu chỉ có 1 mình ceo duyệt thì cho approve luôn
    const STATUS_APPROVED =
      existsOrgUnitRoot &&
      existsPositionRoot &&
      user.type !== UserType.ROOT &&
      userMovementApprovers.length === 1;

    if (STATUS_APPROVED) userMovementInsert.status = UserMovementStatus.APPROVED;

    if (
      userMovementInsert.status === UserMovementStatus.APPROVED &&
      new Date(dateAppointment).getTime() <= new Date().getTime()
    )
      userMovementInsert.status = UserMovementStatus.EFFECTIVE;

    const subManagerInsert: DeepPartial<SubManager>[] = subManagers.map((s) => ({
      id: uuidv4(),
      orgUnitId: s.orgUnitId,
      orgUnitParentId: s.orgUnitParentId,
      userId,
      createdById: user.id,
      status:
        userMovementInsert.status === UserMovementStatus.EFFECTIVE
          ? SubManagerStatus.ACTIVE
          : SubManagerStatus.INACTIVE,
    }));

    return await this.dataSource
      .transaction(async (manager) => {
        if (userMovementInsert.status !== UserMovementStatus.EFFECTIVE)
          await manager.insert(SubManager, subManagerInsert);

        delete (userMovementInsert as UserMovement & { subManagers: CreateUserSubManagerDto })
          .subManagers;

        await manager.insert(UserMovement, userMovementInsert);

        await manager.insert(UserMovementApprover, userMovementApprovers);

        await manager.insert(UserMovementApprover, userMovementFollowers);

        // Khi chỉ có một mình giám đốc tạo và duyệt thì thành công luôn
        if (userMovementInsert.status === UserMovementStatus.EFFECTIVE) {
          // kiểm tra user position type
          const whereUserPositionOld = {
            userId: userId,
            orgUnitId: oldValue.orgUnit.id,
            positionId: oldValue.position.id,
          };

          const userOrgPositionOld = await this.userOrgUnitPositionRepository.findOne({
            where: whereUserPositionOld,
            select: ['positionType'],
          });

          // xóa user org position cũ
          await manager.delete(UserOrgUnitPosition, whereUserPositionOld);

          if (existsPositionNew?.type === PositionType.MANAGER)
            await manager.update(OrgUnit, newValue.orgUnit.id, { managerId: userId });

          if (newValue)
            await manager.insert(UserOrgUnitPosition, {
              userId: userId,
              orgUnitId: newValue.orgUnit.id,
              positionId: newValue.position.id,
              positionType: userOrgPositionOld.positionType,
            });

          if (existsOrgUnitOld.managerId === userId)
            await manager.update(OrgUnit, oldValue.orgUnit.id, { managerId: null });

          // 1. delete old
          await manager.delete(SubManager, { userId, orgUnitParentId: oldValue.orgUnit.id });

          // 2. insert new
          await manager.insert(SubManager, subManagerInsert);

          await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);
          await this.cacheService.del(CACHE_KEY.POSITION_TREE);
        }
      })
      .then(async () => {
        // gửi thông báo cho các approvers đã được lọc
        const message = `Có một yêu cầu ${type} nhân sự. Vui lòng kiểm tra và cập nhật phê duyệt!`;
        const approverIds = [
          ...new Set(uniqueApprovers?.map((e) => e.approverId)?.filter((e) => e !== user.id) || []),
        ];
        await this.pushNotifyDefault(type, message, approverIds, user.id);

        // gửi thông báo cho followers
        const messageFollowers = `${user.name} đã thêm bạn là người theo dõi của đề xuất ${type} nhân sự ${existsUser.name}`;
        await this.pushNotifyDefault(type, messageFollowers, [...new Set(followers)], user.id);

        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getSubManagerHistory(orgUnitIds: string[], orgUnitParentId: string, userId: string) {
    const [subManagerOld, subManagerNew] = await Promise.all([
      this.subManagerRepo.find({
        relations: ['orgUnit'],
        where: { orgUnitParentId, status: SubManagerStatus.ACTIVE, userId },
        select: {
          id: true,
          orgUnit: {
            id: true,
            name: true,
            type: true,
          },
        },
      }),

      this.orgUnitRepository.find({
        where: { id: In(orgUnitIds) },
        select: { id: true, name: true, type: true },
      }),
    ]);

    return { subManagerOld: subManagerOld.map((e) => e.orgUnit), subManagerNew };
  }

  async updateUserMovementApprove(
    approveId: string,
    updateUserMovementApproveDto: UpdateUserMovementApproveDto,
    user: UserRequest,
  ) {
    const { status } = updateUserMovementApproveDto;

    const [existsApprove, userMovementApprover] = await Promise.all([
      this.userMovementApproverRepo.findOne({
        where: { id: approveId },
        select: ['allowedApprove', 'order'],
      }),

      this.userMovementApproverRepo.findOne({
        where: { id: approveId },
        relations: ['userMovement'],
      }),
    ]);

    if (!existsApprove) throw new NotFoundException('Yêu cầu phê duyệt không tồn tại!');

    if (!userMovementApprover)
      throw new NotFoundException('Yêu cầu phê duyệt không tồn tại hoặc đã được phê duyệt!');

    // global userMovementId
    const userMovementId = userMovementApprover.userMovementId;

    const [approves, userMovement, allUserApprover] = await Promise.all([
      this.userMovementApproverRepo.find({
        where: {
          userMovementId: userMovementApprover.userMovementId,
          approveType: UserMovementApproveType.APPROVE,
        },
        select: ['id', 'status'],
      }),

      this.userMovementRepo.findOne({
        relations: { user: true, orgUnit: true, position: true },
        where: { id: userMovementId },
        select: {
          id: true,
          userId: true,
          oldValue: true,
          orgUnitId: true,
          positionId: true,
          type: true,
          status: true,
          createdById: true,
          dateAppointment: true,
          user: {
            id: true,
            name: true,
          },
          orgUnit: {
            id: true,
            name: true,
          },
          position: {
            id: true,
            name: true,
            type: true,
          },
        },
      }),

      this.userMovementApproverRepo.find({ where: { userMovementId }, select: ['approverId'] }),
    ]);

    if (userMovement.status === UserMovementStatus.REJECTED)
      throw new BadRequestException(`Đề xuất đã có người từ chối trướt đó`);

    if (status === UserMovementStatus.CANCELLED && userMovement.dateAppointment <= new Date())
      throw new BadRequestException(`Hết hạn huỷ ban hành`);

    // handle update user movement
    const userMovementUpdate: DeepPartial<UserMovement> = {};

    const approveReject = approves.find((e) => e.status === UserMovementStatus.REJECTED);

    // Cập nhật phê duyệt cho phép
    if (!approveReject && status === UserMovementStatus.APPROVED) {
      const approveApproves = approves.filter((e) => e.status === UserMovementStatus.APPROVED);

      // nếu là lần duyệt cuối cùng và tất cả đều đồng ý
      if (approveApproves.length + 1 === approves.length) {
        userMovementUpdate.status = UserMovementStatus.APPROVED;

        // nếu ngày bổ nhiệm <= ngày hiện tại thì set status = EFFECTIVE
        if (new Date(userMovement.dateAppointment).getTime() <= new Date().getTime())
          userMovementUpdate.status = UserMovementStatus.EFFECTIVE;
      }
    }

    // Cập nhật trạng thái và thông tin từ chối/hủy
    if ([UserMovementStatus.REJECTED, UserMovementStatus.CANCELLED].includes(status)) {
      userMovementUpdate.status = status;
      userMovementUpdate.reasonReject = updateUserMovementApproveDto.reasonReject;
      userMovementUpdate.rejectionReason = updateUserMovementApproveDto.rejectionReason;

      // Xử lý thêm cho trường hợp CANCELLED
      if (status === UserMovementStatus.CANCELLED) {
        const userAuth = await this.userRepo.findOne({
          where: { id: user.id },
          select: ['id', 'code', 'name', 'url'],
        });

        if (!userAuth) throw new NotFoundException('Người dùng không tồn tại!');

        userMovementUpdate.cancelledValue = {
          id: userAuth.id,
          code: userAuth.code,
          name: userAuth.name,
          url: userAuth.url,
        };
        userMovementUpdate.cancelledAt = new Date();
      }
    }

    // handle update approve
    const approveUpdate: DeepPartial<UserMovementApprover> = {
      ...updateUserMovementApproveDto,
      status: status === UserMovementStatus.CANCELLED ? UserMovementStatus.APPROVED : status,
      updatedById: user.id,
    };

    const existsOldManger = await this.orgUnitRepository.findOne({
      where: { id: userMovement.oldValue.orgUnit.id, managerId: userMovement.userId },
    });

    const oldUnitPositionDelete: DeepPartial<UserOrgUnitPosition> = {
      userId: userMovement.userId,
      orgUnitId: userMovement.oldValue.orgUnit.id,
      positionId: userMovement.oldValue.position.id,
    };

    const newUnitPositionInsert: DeepPartial<UserOrgUnitPosition> =
      userMovement.orgUnitId && userMovement.positionId
        ? {
            userId: userMovement.userId,
            orgUnitId: userMovement.orgUnitId,
            positionId: userMovement.positionId,
          }
        : null;

    // list userId gửi thông báo
    const approveIds = [
      ...new Set([
        userMovement.userId,
        userMovement.createdById,
        ...allUserApprover.filter((e) => e.approverId !== user.id).map((e) => e.approverId),
      ]),
    ];

    return await this.dataSource
      .transaction(async (manager) => {
        // nếu status là reject -> update UserMovementApprover UserMovement, reject
        await manager.update(UserMovementApprover, approveId, approveUpdate);

        if (userMovementUpdate.status)
          await manager.update(UserMovement, userMovementId, userMovementUpdate);

        // khi lần duyệt cuối cùng và tất cả điều đồng ý
        if (userMovementUpdate.status === UserMovementStatus.EFFECTIVE) {
          const userOrgPositionOld = await this.userOrgUnitPositionRepository.findOne({
            where: oldUnitPositionDelete as FindOptionsWhere<UserOrgUnitPosition>,
            select: ['positionType'],
          });

          await manager.delete(UserOrgUnitPosition, oldUnitPositionDelete);

          // 1. xóa manager cũ
          if (existsOldManger)
            await manager.update(OrgUnit, userMovement.oldValue.orgUnit.id, { managerId: null });

          // 2. cập nhật manager mới
          if (userMovement.position?.type === PositionType.MANAGER)
            await manager.update(OrgUnit, userMovement.orgUnitId, {
              managerId: userMovement.userId,
            });

          newUnitPositionInsert &&
            (await manager.insert(UserOrgUnitPosition, {
              ...newUnitPositionInsert,
              positionType: userOrgPositionOld.positionType,
            }));

          const whereSubManager = {
            userId: userMovement.userId,
            orgUnitParentId: userMovement.oldValue.orgUnit?.id,
          };

          if (userMovement.orgUnitId && userMovement.positionId) {
            // delete subManagerActive
            await manager.delete(SubManager, {
              ...whereSubManager,
              status: SubManagerStatus.ACTIVE,
            });

            // active subManagerInactive
            await manager.update(
              SubManager,
              {
                userId: userMovement.userId,
                orgUnitParentId: userMovement.orgUnitId,
                status: SubManagerStatus.INACTIVE,
              },
              { status: SubManagerStatus.ACTIVE },
            );
          } else {
            // delete all subManager
            await manager.delete(SubManager, whereSubManager);
          }

          // xóa cache
          await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);
          await this.cacheService.del(CACHE_KEY.POSITION_TREE);

          const message = userMovement.position?.name
            ? `Nhân sự ${userMovement.user?.name} đã được ${userMovement.type} chức danh ${userMovement.position?.name} đơn vị ${userMovement.orgUnit?.name} thành công`
            : `Nhân sự ${userMovement.user?.name} đã được ${userMovement.type} thành công`;
          // push notify cho người duyệt
          await this.pushNotifyDefault(
            userMovement.type,
            message,
            approveIds?.filter((e) => e !== userMovement.userId),
            user.id,
          );

          const messageUser = userMovement.position?.name
            ? `Bạn đã được ${userMovement.type} đến vị trí ${userMovement.position?.name} đơn vị ${userMovement.orgUnit?.name} thành công`
            : `Bạn đã được ${userMovement.type} khỏi vị trí ${userMovement.oldValue.position?.positionName} - đơn vị ${userMovement.oldValue.orgUnit?.orgName}`;

          await this.pushNotifyDefault(
            userMovement.type,
            messageUser,
            [userMovement.userId],
            user.id,
          );
        }

        if (status === UserMovementStatus.CANCELLED) {
          await this.subManagerRepo.delete({
            userId: userMovement.userId,
            orgUnitParentId: userMovement.orgUnitId,
            status: SubManagerStatus.INACTIVE,
          });
          const message = userMovement.position?.name
            ? `${user?.name} đã huỷ ban hành đề xuất ${userMovement.type} nhân sự ${userMovement.user?.name} - chức danh ${userMovement.position?.name} đơn vị ${userMovement.orgUnit?.name}`
            : `${user?.name} đã huỷ ban hành đề xuất ${userMovement.type} nhân sự ${userMovement.user?.name}`;
          await this.pushNotifyDefault(userMovement.type, message, approveIds, user.id);
        }
      })
      .then(async () => {
        // gửi thông báo
        if (status === UserMovementStatus.APPROVED) {
          const message = userMovement.position?.name
            ? `${user?.name} đã duyệt đề xuất ${userMovement.type} nhân sự ${userMovement.user?.name} - chức danh ${userMovement.position?.name} đơn vị ${userMovement.orgUnit?.name}`
            : `${user?.name} đã duyệt đề xuất ${userMovement.type} nhân sự ${userMovement.user?.name}`;
          await this.pushNotifyDefault(userMovement.type, message, approveIds, user.id);
        }

        if (userMovementUpdate.status === UserMovementStatus.APPROVED) {
          const message = userMovement.position?.name
            ? `Nhân sự ${userMovement.user?.name} đã được ${userMovement.type} chức danh ${userMovement.position?.name} đơn vị ${userMovement.orgUnit?.name} đang chờ hiệu lực`
            : `Nhân sự ${userMovement.user?.name} đã được ${userMovement.type} đang chờ hiệu lực`;
          await this.pushNotifyDefault(userMovement.type, message, approveIds, user.id);
        }

        if (userMovementUpdate.status === UserMovementStatus.REJECTED) {
          const message = userMovement.position?.name
            ? `Nhân sự ${userMovement.user?.name} đã bị từ chối ${userMovement.type} chức danh ${userMovement.position?.name} đơn vị ${userMovement.orgUnit?.name}`
            : `Nhân sự ${userMovement.user?.name} đã bị từ chối ${userMovement.type}`;
          await this.pushNotifyDefault(userMovement.type, message, approveIds, user.id);
        }

        return {
          success: true,
        };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async updateUserMovement(
    id: string,
    updateUserMovementDto: UpdateUserMovementDto,
    user: UserRequest,
  ) {
    const { dateAppointment, file, reason } = updateUserMovementDto;

    const userMovement = await this.userMovementRepo.findOne({
      where: { id },
      relations: ['userMovementApprovers', 'user', 'position', 'orgUnit'],
      select: {
        id: true,
        status: true,
        userId: true,
        orgUnitId: true,
        positionId: true,
        createdById: true,
        oldValue: true,
        dateAppointment: true,
        file: true,
        reason: true,
        type: true,
        user: {
          id: true,
          name: true,
        },
        position: {
          id: true,
          name: true,
          type: true,
          subManager: true,
        },
        orgUnit: {
          id: true,
          name: true,
        },
        userMovementApprovers: {
          id: true,
          approverId: true,
        },
      },
    });

    if (!userMovement) throw new NotFoundException('Yêu cầu phê duyệt không tồn tại!');

    if ([UserMovementStatus.EFFECTIVE, UserMovementStatus.REJECTED].includes(userMovement.status))
      throw new BadRequestException('Yêu cầu phê duyệt không thể cập nhật khi ở trạng thái này!');

    const userTrackingInsert: DeepPartial<UserTracking> = {
      id: uuidv4(),
      userId: userMovement.userId,
      userMovementId: userMovement.id,
      oldValue: {
        dateAppointment: userMovement.dateAppointment.toISOString(),
        file: userMovement.file,
        reason: userMovement.reason,
      },
      newValue: {
        dateAppointment: dateAppointment,
        file: file,
        reason: reason,
      },
      type: UserTrackingType.USER_MOVEMENT_UPDATE,
      createdById: user.id,
    };

    // Đảm bảo dateAppointment có giờ phút giây bằng 0
    const normalizedDateAppointment = new Date(dateAppointment);
    normalizedDateAppointment.setHours(0, 0, 0, 0);

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.update(UserMovement, id, {
          dateAppointment: normalizedDateAppointment,
          file,
          reason,
          updatedById: user.id,
        });

        await manager.insert(UserTracking, userTrackingInsert);

        if (
          userMovement &&
          userMovement.status === UserMovementStatus.APPROVED &&
          normalizedDateAppointment <= new Date()
        ) {
          userMovement.dateAppointment = normalizedDateAppointment;

          await this.checkUpdateUserMovementEffective([userMovement], manager);
        }
      })
      .then(async () => {
        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async pushNotifyDefault(type: string, content: string, userIds: string[], createdById: string) {
    return await this.notificationService.createManyNotification({
      notification: {
        title: `Thông báo ${type} nhân sự`,
        content,
        type: userMovementTypeToNotificationType[type],
        path: `/dashboard/proposals-user-transfer`,
        userIds,
        createdById,
      },
      isPushFCM: true,
    });
  }

  async addUserFollowers(addUserFollowersDto: AddUserFollowersDto, user: UserRequest) {
    const { userIds, userMovementId } = addUserFollowersDto;

    const userIdsUnique = [...new Set(userIds)];

    const [userMovement, userFollowers, userMovementApprovers, createdBy] = await Promise.all([
      this.userMovementRepo.findOne({
        where: { id: userMovementId },
        relations: ['user'],
        select: { id: true, type: true, user: { id: true, name: true } },
      }),

      this.userRepo.count({ where: { id: In(userIdsUnique) } }),

      this.userMovementApproverRepo.find({
        where: {
          userMovementId: userMovementId,
          approveType: UserMovementApproveType.FOLLOWERS,
        },
      }),

      this.userRepo.findOne({ where: { id: user.id }, select: { id: true, name: true } }),
    ]);

    if (!userMovement) throw new NotFoundException('Yêu cầu phê duyệt không tồn tại!');

    if (userFollowers !== userIdsUnique.length)
      throw new BadRequestException('Danh sách user không tồn tại!');

    // Lấy danh sách userIds đã có trong userMovementApprovers
    const existingApproverIds = userMovementApprovers.map((approver) => approver.approverId);

    // Lọc ra những userIds chưa có trong userMovementApprovers để thêm mới
    const newUserIds = userIdsUnique.filter((userId) => !existingApproverIds.includes(userId));

    // Lọc ra những userIds cần xóa (có trong userMovementApprovers nhưng không có trong userIdsUnique)
    const userIdsToDelete = existingApproverIds.filter(
      (approverId) => !userIdsUnique.includes(approverId),
    );

    const userMovementFollowers: DeepPartial<UserMovementApprover>[] = newUserIds.map(
      (followerId) => ({
        id: uuidv4(),
        userMovementId: userMovementId,
        approverId: followerId,
        allowedApprove: false,
        createdById: user?.id,
        status: UserMovementStatus.VIEW,
        approveType: UserMovementApproveType.FOLLOWERS,
        order: 0,
      }),
    ) as DeepPartial<UserMovementApprover>[];

    return await this.dataSource
      .transaction(async (manager) => {
        // Thêm những followers mới
        if (userMovementFollowers.length > 0)
          await manager.insert(UserMovementApprover, userMovementFollowers);

        // Xóa những followers không còn trong danh sách
        if (userIdsToDelete.length > 0)
          await manager.delete(UserMovementApprover, {
            userMovementId: userMovementId,
            approverId: In(userIdsToDelete),
            approveType: UserMovementApproveType.FOLLOWERS,
          });
      })
      .then(async () => {
        // gửi thông báo cho followers
        const messageFollowers = `${createdBy.name} đã thêm bạn là người theo dõi của đề xuất ${userMovement.type} nhân sự ${userMovement.user.name}`;
        await this.pushNotifyDefault(
          userMovement.type,
          messageFollowers,
          [...new Set(newUserIds)],
          user.id,
        );

        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async deleteUserFollowers(deleteUserFollowersDto: DeleteUserFollowersDto, user: UserRequest) {
    const { userId, userMovementId } = deleteUserFollowersDto;

    const [userMovement, userMovementApprovers] = await Promise.all([
      this.userMovementRepo.findOne({ where: { id: userMovementId } }),

      this.userMovementApproverRepo.findOne({
        where: {
          userMovementId: userMovementId,
          approverId: userId,
          approveType: UserMovementApproveType.FOLLOWERS,
        },
      }),
    ]);

    if (!userMovement) throw new NotFoundException('Yêu cầu phê duyệt không tồn tại!');

    if (!userMovementApprovers) throw new NotFoundException('Người theo dõi không tồn tại!');

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.delete(UserMovementApprover, {
          userMovementId: userMovementId,
          approverId: userId,
          approveType: UserMovementApproveType.FOLLOWERS,
        });
      })
      .then(async () => {
        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async handleRoleManagerAssistant(user: UserRequest) {
    const positionAssistant = await this.positionRepository.exists({
      where: { id: user.positionId, type: PositionType.ASSISTANT },
    });

    let managerOrgUnitId: string;

    if (positionAssistant) {
      const orgUnitManager = await this.userOrgUnitPositionRepository.findOne({
        where: { userId: user.id, positionId: user.positionId, orgUnitId: user.orgUnitId },
        relations: ['orgUnit', 'orgUnit.manager'],
        select: {
          orgUnit: {
            id: true,
            managerId: true,
            manager: {
              id: true,
              type: true,
            },
          },
        },
      });

      if (orgUnitManager) managerOrgUnitId = orgUnitManager.orgUnit.managerId;

      user.type = orgUnitManager?.orgUnit.manager.type;

      return managerOrgUnitId;
    }

    return;
  }

  async handleUserMovementQuery(user: UserRequest, getListUserMovementDto: GetListUserMovementDto) {
    const {
      orderBy,
      order,
      page,
      take,
      type,
      statusMovement,
      search,
      dateAppointmentFrom,
      dateAppointmentTo,
      createdAtFrom,
      createdAtTo,
      searchType,
      status,
      orgUnitIds,
    } = getListUserMovementDto;

    const managerOrgUnitId = await this.handleRoleManagerAssistant(user);

    // Query để lấy IDs - cần join userMovementApprovers
    const idsQuery = this.userMovementRepo
      .createQueryBuilder('userMovement')
      .leftJoin('userMovement.userMovementApprovers', 'userMovementApprovers')
      .leftJoin('userMovement.user', 'user');

    // Apply filter theo role
    if (![UserType.ADMIN, UserType.ROOT].includes(user.type)) {
      idsQuery.andWhere(
        new Brackets((qb) => {
          qb.where('userMovement.createdById = :userId', { userId: user.id }).orWhere(
            'userMovementApprovers.approverId = :userId',
            { userId: user.id },
          );
        }),
      );
    }

    // Xử lý status filter cho userMovementApprovers
    if (status) {
      if (status === UserMovementStatus.VIEW) {
        if (![UserType.ADMIN, UserType.ROOT].includes(user.type)) {
          idsQuery.andWhere('userMovementApprovers.status = :status', { status });
        } else {
          // Admin/Root:  filter theo status khác tất cả trừ VIEW
          idsQuery.andWhere(
            new Brackets((qb) => {
              qb.where(
                'NOT EXISTS (SELECT 1 FROM user_movement_approver uma WHERE uma.userMovementId = userMovement.id AND uma.approverId = :userId)',
                { userId: user.id },
              ).orWhere(
                new Brackets((subQb) => {
                  subQb
                    .where('userMovementApprovers.status = :status', { status })
                    .andWhere('userMovementApprovers.approverId = :approverId', {
                      approverId: user.id,
                    });
                }),
              );
            }),
          );
        }
      } else {
        idsQuery.andWhere('userMovementApprovers.status = :status', { status });
        idsQuery.andWhere('userMovementApprovers.approverId = :approverId', {
          approverId: user.id,
        });
      }
    }

    if (statusMovement) {
      idsQuery.andWhere('userMovement.status = :statusMovement', { statusMovement });

      if (![UserType.ADMIN, UserType.ROOT].includes(user.type)) {
        idsQuery.andWhere('userMovementApprovers.approverId = :approverId', {
          approverId: user.id,
        });
      }
    }

    // Filter theo type của userMovement
    if (type) {
      idsQuery.andWhere('userMovement.type = :type', { type });
    }

    // Filter theo status của userMovement
    if (statusMovement) {
      idsQuery.andWhere('userMovement.status = :statusMovement', { statusMovement });
    }

    // Filter theo tên user
    if (search) {
      idsQuery.andWhere('user.name LIKE :search', { search: `%${search}%` });
    }

    // Filter theo ngày appointment
    if (dateAppointmentFrom || dateAppointmentTo) {
      if (dateAppointmentFrom && dateAppointmentTo) {
        idsQuery.andWhere('userMovement.dateAppointment BETWEEN :dateFrom AND :dateTo', {
          dateFrom: this.userHandle.handleDateStart(dateAppointmentFrom),
          dateTo: this.userHandle.handleDateEnd(dateAppointmentTo),
        });
      } else if (dateAppointmentFrom) {
        idsQuery.andWhere('userMovement.dateAppointment >= :dateFrom', {
          dateFrom: this.userHandle.handleDateStart(dateAppointmentFrom),
        });
      } else if (dateAppointmentTo) {
        idsQuery.andWhere('userMovement.dateAppointment <= :dateTo', {
          dateTo: this.userHandle.handleDateEnd(dateAppointmentTo),
        });
      }
    }

    // Filter theo ngày tạo
    if (createdAtFrom || createdAtTo) {
      if (createdAtFrom && createdAtTo) {
        idsQuery.andWhere('userMovement.createdAt BETWEEN :createdFrom AND :createdTo', {
          // cho createdAtFrom về 00:00:00
          createdFrom: this.userHandle.handleDateStart(createdAtFrom),
          // cho createdAtTo về 23:59:59
          createdTo: this.userHandle.handleDateEnd(createdAtTo),
        });
      } else if (createdAtFrom) {
        idsQuery.andWhere('userMovement.createdAt >= :createdFrom', {
          createdFrom: this.userHandle.handleDateStart(createdAtFrom),
        });
      } else if (createdAtTo) {
        idsQuery.andWhere('userMovement.createdAt <= :createdTo', {
          createdTo: this.userHandle.handleDateEnd(createdAtTo),
        });
      }
    }

    // Xử lý logic theo searchType và user role
    if (searchType === UserMovementSearchType.NEED_APPROVE) {
      // Chỉ lấy những movement mà user là approver và chưa VIEW
      idsQuery.andWhere('userMovementApprovers.approverId = :userId', { userId: user.id });
      idsQuery.andWhere('userMovementApprovers.status != :viewStatus', {
        viewStatus: UserMovementStatus.VIEW,
      });
    } else if (searchType === UserMovementSearchType.MY_PROPOSAL) {
      // Chỉ lấy những movement do user tạo
      idsQuery.andWhere('userMovement.createdById = :userId', { userId: user.id });
    } else if (searchType === UserMovementSearchType.ALL) {
      if (![UserType.ADMIN, UserType.ROOT].includes(user.type)) {
        // Non-admin user: chỉ thấy movement mà họ tạo hoặc là approver
        idsQuery.andWhere(
          new Brackets((qb) => {
            qb.where('userMovement.createdById = :userId', {
              userId: managerOrgUnitId || user.id,
            }).orWhere('userMovementApprovers.approverId = :userId2', {
              userId2: managerOrgUnitId || user.id,
            });
          }),
        );
      }
      // Admin/Root user: thấy tất cả, không cần thêm điều kiện
    }

    if (orgUnitIds && orgUnitIds.length > 0) {
      // Lấy tất cả descendants cho từng orgUnit
      const allDescendants = [];
      for (const orgUnitId of orgUnitIds) {
        const orgUnit = await this.orgUnitRepository.findOne({ where: { id: orgUnitId } });
        const descendants = await this.orgUnitRepository.findDescendants(orgUnit);
        allDescendants.push(...descendants);
      }

      // Lấy tất cả IDs (bao gồm cả orgUnitIds gốc và descendants)
      const allOrgUnitIds = [...orgUnitIds, ...allDescendants.map((desc) => desc.id)];

      idsQuery.andWhere('userMovement.orgUnitId IN (:...allOrgUnitIds)', {
        allOrgUnitIds: [...new Set(allOrgUnitIds)],
      });
    }

    // Ordering
    const orderField = `userMovement.${orderBy}`;
    const orderDirection = order === OrderType.ASC ? 'ASC' : 'DESC';
    idsQuery.orderBy(orderField, orderDirection as 'ASC' | 'DESC');

    // Group by để tránh duplicate khi có nhiều approvers
    idsQuery.groupBy('userMovement.id');

    // Pagination
    const total = await idsQuery.getCount();
    idsQuery.offset((page - 1) * take).limit(take);
    const movements = await idsQuery.getRawMany();

    const movementIds = movements.map((item) => item.userMovement_id);

    return { total, movementIds: [...new Set(movementIds)] };
  }

  async getListUserMovementByManager(
    getListUserMovementDto: GetListUserMovementDto,
    user: UserRequest,
  ) {
    const { total, movementIds } = await this.handleUserMovementQuery(user, getListUserMovementDto);

    if (movementIds.length === 0) return { totalQuery: 0, list: [], total: 0 };
    // Bắt đầu với query builder từ UserMovement
    const queryBuilder = this.userMovementRepo
      .createQueryBuilder('userMovement')
      .leftJoinAndSelect('userMovement.user', 'user')
      .leftJoinAndSelect('userMovement.createdBy', 'createdBy')
      .leftJoinAndSelect('userMovement.orgUnit', 'orgUnit')
      .leftJoinAndSelect('userMovement.userMovementApprovers', 'userMovementApprovers')
      .leftJoinAndSelect('userMovementApprovers.approver', 'approver')
      .where('userMovement.id IN (:...ids)', {
        ids: movementIds,
      });

    const rawResults = await queryBuilder.getMany();
    const list = rawResults.map((userMovement) => {
      // Tìm approver record tương ứng với user hiện tại (nếu có)
      let currentUserApprover = userMovement.userMovementApprovers?.find(
        (approver) => approver.approverId === user.id,
      );

      // Nếu không tìm thấy, lấy approver đầu tiên
      if (!currentUserApprover && userMovement.userMovementApprovers?.length > 0) {
        currentUserApprover = userMovement.userMovementApprovers[0];
      }

      return {
        id: currentUserApprover?.id || null,
        status: currentUserApprover?.status || null,
        reasonReject: currentUserApprover?.reasonReject || null,
        approvedAt: currentUserApprover?.approvedAt || null,
        updatedAt: currentUserApprover?.updatedAt || null,
        userMovementId: userMovement.id,
        userMovement: {
          id: userMovement.id,
          type: userMovement.type,
          reason: userMovement.reason,
          status: userMovement.status,
          dateAppointment: userMovement.dateAppointment,
          createdAt: userMovement.createdAt,
          createdById: userMovement.createdById,
          newValue: userMovement.newValue,
          oldValue: userMovement.oldValue,
          orgUnit: userMovement.orgUnit
            ? {
                id: userMovement.orgUnit.id,
                name: userMovement.orgUnit.name,
              }
            : null,
          user: userMovement.user
            ? {
                id: userMovement.user.id,
                code: userMovement.user.code,
                name: userMovement.user.name,
                url: userMovement.user.url,
              }
            : null,
          createdBy: userMovement.createdBy
            ? {
                id: userMovement.createdBy.id,
                code: userMovement.createdBy.code,
                name: userMovement.createdBy.name,
                url: userMovement.createdBy.url,
              }
            : null,
        },
        approver: currentUserApprover?.approver
          ? {
              id: currentUserApprover.approver.id,
              code: currentUserApprover.approver.code,
              name: currentUserApprover.approver.name,
              url: currentUserApprover.approver.url,
            }
          : null,
        isMe: !userMovement.userMovementApprovers.some(
          (approver) => approver.approverId === user.id,
        ),
      };
    });

    return {
      list,
      total,
    };
  }

  private async getListUserMovementForRegularUser(
    getListUserMovementDto: GetListUserMovementDto,
    user: UserRequest,
    orderBy: string,
    order: any,
    page: number,
    take: number,
  ) {
    const { status, statusMovement, search, type, searchType } = getListUserMovementDto;

    // Handle role manager assistant
    const managerOrgUnitId = await this.handleRoleManagerAssistant(user);

    const queryBuilder = this.userMovementApproverRepo
      .createQueryBuilder('approver')
      .leftJoinAndSelect('approver.userMovement', 'userMovement')
      .leftJoinAndSelect('userMovement.createdBy', 'createdBy')
      .leftJoinAndSelect('userMovement.user', 'user')
      .leftJoinAndSelect('userMovement.orgUnit', 'orgUnit')
      .leftJoinAndSelect('approver.approver', 'approverUser');

    // Apply where conditions using QueryBuilder
    this.buildWhereConditionsForRegularUser(queryBuilder, {
      status,
      statusMovement,
      search,
      type,
      searchType,
      userId: user.id,
      managerOrgUnitId,
    });

    // Apply grouping để tránh duplicate userMovementId
    // this.applyGroupingForUniqueUserMovement(queryBuilder, user.id, orderBy, order);

    // // Apply pagination
    // const { skip, take: takeLimit } = this.queryService.getPagination({ page, take });
    // queryBuilder.skip(skip).take(takeLimit);

    const list = await queryBuilder.getMany();

    // Group by userMovementId ưu tiên có approverId = userId
    const groupedByUserMovementId = new Map();

    // Sắp xếp danh sách trước khi nhóm để ưu tiên bản ghi có approverId = userId
    const sortedList = [...list].sort((a, b) => {
      return a.approverId === user.id ? -1 : b.approverId === user.id ? 1 : 0;
    });

    // Lấy bản ghi đầu tiên cho mỗi userMovementId (đã được sắp xếp ưu tiên)
    for (const item of sortedList) {
      const userMovementId = item.userMovementId;
      if (!groupedByUserMovementId.has(userMovementId)) {
        groupedByUserMovementId.set(userMovementId, item);
      }
    }

    let allFilteredList = Array.from(groupedByUserMovementId.values());

    // Sắp xếp ưu tiên theo approverId = userId
    allFilteredList = allFilteredList.sort((a, b) => {
      const aIsMe = a.approverId === user.id;
      const bIsMe = b.approverId === user.id;

      // Ưu tiên theo approverId = userId
      if (aIsMe && !bIsMe) return -1;
      if (!aIsMe && bIsMe) return 1;

      // Nếu cùng trạng thái approverId, sắp xếp theo orderBy và order
      const aValue = a[orderBy] || a.updatedAt;
      const bValue = b[orderBy] || b.updatedAt;

      // Sắp xếp theo thứ tự chỉ định (ASC hoặc DESC)
      if (order === 'desc') {
        return bValue > aValue ? 1 : bValue < aValue ? -1 : 0;
      } else {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      }
    });

    // Tính tổng số bản ghi trước khi phân trang
    const totalRecords = allFilteredList.length;

    // Áp dụng phân trang
    const { skip, take: takeLimit } = this.queryService.getPagination({ page, take });
    allFilteredList = allFilteredList.slice(skip, skip + takeLimit);

    return { list: allFilteredList, total: totalRecords };
  }

  private buildWhereConditionsForRegularUser(
    queryBuilder: any,
    filters: {
      status?: any;
      statusMovement?: any;
      search?: string;
      type?: any;
      searchType?: any;
      userId: string;
      managerOrgUnitId?: string;
    },
  ) {
    const { status, statusMovement, search, type, searchType, userId, managerOrgUnitId } = filters;

    // Handle status conditions
    if (status && status !== UserMovementStatus.VIEW) {
      queryBuilder.andWhere('approver.status = :status', { status });
    } else if (status === UserMovementStatus.VIEW) {
      queryBuilder.andWhere('approver.status = :viewStatus', { viewStatus: status });
    }

    // Handle search type conditions
    if (searchType === UserMovementSearchType.NEED_APPROVE) {
      queryBuilder
        .andWhere('approver.approverId = :approverId', { approverId: userId })
        .andWhere('approver.status != :viewStatus', { viewStatus: UserMovementStatus.VIEW });
    }

    if (searchType === UserMovementSearchType.ALL) {
      // Logic for ALL search type - sử dụng managerOrgUnitId nếu có
      const approverIdToUse = managerOrgUnitId || userId;

      // Sử dụng Brackets để group OR conditions
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('userMovement.createdById = :createdById', { createdById: userId }).orWhere(
            'approver.approverId = :approverId',
            { approverId: approverIdToUse },
          );
        }),
      );
    }
    if (searchType === UserMovementSearchType.MY_PROPOSAL) {
      queryBuilder.andWhere('userMovement.createdById = :createdById', { createdById: userId });
    }

    // Handle userMovement conditions
    if (type) {
      queryBuilder.andWhere('userMovement.type = :type', { type });
    }

    if (statusMovement) {
      queryBuilder.andWhere('userMovement.status = :statusMovement', { statusMovement });
    }

    if (search) queryBuilder.andWhere('user.name LIKE :searchName', { searchName: `%${search}%` });
  }

  async getListApproverPendingCount(user: UserRequest) {
    const count = await this.userMovementApproverRepo.count({
      where: {
        status: UserMovementStatus.PENDING,
        approverId: user.id,
      },
    });
    return { count };
  }

  async getUserMovementHistory(id: string, _: UserRequest) {
    const userMovementHistory = await this.userTrackingRepo.find({
      relations: ['createdBy'],
      where: { userMovementId: id, type: UserTrackingType.USER_MOVEMENT_UPDATE },
      order: { updatedAt: 'DESC' }, // Sắp xếp theo thời gian cập nhật
      select: {
        id: true,
        updatedAt: true,
        oldValue: true,
        newValue: true,
        createdBy: { id: true, name: true, url: true },
      },
    });

    const list = [];

    for (const item of userMovementHistory) {
      const oldValue = item.oldValue as UpdateUserMovementDto;
      const newValue = item.newValue as UpdateUserMovementDto;

      // Sử dụng array để check các field changes
      const changes = [
        {
          condition: oldValue.dateAppointment !== newValue.dateAppointment,
          data: {
            field: 'dateAppointment',
            label: 'Ngày có hiệu lực',
            dateAppointmentOld: oldValue.dateAppointment,
            dateAppointmentNew: newValue.dateAppointment,
          },
        },
        {
          condition: oldValue.file !== newValue.file,
          data: {
            field: 'file',
            label: 'File đính kèm',
            fileOld: oldValue.file,
            fileNew: newValue.file,
          },
        },
        {
          condition: !this.userHandle.compareHtmlContentByText(oldValue.reason, newValue.reason),
          data: {
            field: 'reason',
            label: 'Lý do điều chuyển',
            reasonOld: oldValue.reason,
            reasonNew: newValue.reason,
          },
        },
      ];

      let listItem = {
        userMovementHistory: {
          id: item.id,
          updatedAt: item.updatedAt,
          createdBy: item.createdBy,
        },
        changes: [],
      };

      // Thêm tất cả changes vào list (không dùng else if)
      changes.forEach((change) => {
        if (change.condition) listItem.changes.push(change.data);
      });

      list.push(listItem);
    }

    return list;
  }

  async getApproveDetail(id: string, approveId: string, user: UserRequest) {
    const userMovement = await this.userMovementRepo.findOne({
      relations: ['user', 'orgUnit', 'position', 'createdBy'],
      where: { id },
      select: {
        id: true,
        type: true,
        reason: true,
        status: true,
        dateAppointment: true,
        oldValue: true,
        newValue: true,
        reasonReject: true,
        rejectionReason: true,
        file: true,
        createdById: true,
        createdAt: true,
        orgUnitId: true,
        userId: true,
        cancelledValue: true,
        cancelledAt: true,
        createdBy: {
          id: true,
          code: true,
          name: true,
          url: true,
        },
        user: {
          id: true,
          code: true,
          name: true,
          url: true,
        },
        orgUnit: {
          id: true,
          name: true,
          type: true,
        },
        position: {
          id: true,
          name: true,
          type: true,
        },
      },
    });

    if (!userMovement) throw new NotFoundException('Yêu cầu phê duyệt không tồn tại');

    const [approvers, subManagers, userCreator] = await Promise.all([
      // danh sách phê duyệt
      this.userMovementApproverRepo.find({
        relations: [
          'approver',
          'approver.userOrgUnitPositions',
          'approver.userOrgUnitPositions.position',
        ],
        where: {
          userMovementId: id,
        },
        order: {
          order: 'ASC',
        },
        select: {
          id: true,
          status: true,
          reasonReject: true,
          order: true,
          allowedApprove: true,
          approveType: true,
          approver: {
            id: true,
            code: true,
            name: true,
            url: true,
            userOrgUnitPositions: {
              id: true,
              positionId: true,
              position: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
      }),

      // phó phòng, phó bộ phận
      this.subManagerRepo.find({
        relations: ['orgUnit'],
        where: { orgUnitId: userMovement.orgUnitId, user: { id: userMovement.userId } },
        select: {
          id: true,
          status: true,
          orgUnit: {
            id: true,
            name: true,
            type: true,
          },
        },
      }),

      // nguoi de xuat
      this.userMovementRepo.findOne({
        relations: { createdBy: { userOrgUnitPositions: { orgUnit: true, position: true } } },
        where: { id: userMovement.id },
        select: {
          id: true,
          createdBy: {
            id: true,
            name: true,
            code: true,
            url: true,
            userOrgUnitPositions: {
              id: true,
              orgUnitId: true,
              orgUnit: {
                id: true,
                name: true,
                type: true,
              },
              positionId: true,
              position: {
                id: true,
                name: true,
              },
            },
          },
        },
      }),
    ]);

    const managerApprover = approvers.find((e) => e.approver?.id === user.id && e.id === approveId);

    const ancestors = await this.orgUnitRepository.findAncestors(userMovement.orgUnit);

    return {
      ...userMovement,
      createdBy: userCreator?.createdBy || null,
      approvers,
      approverStatus: managerApprover?.status || null,
      newValue: ancestors
        ?.filter((e) => e.type !== OrgUnitType.BOARD_OF_DIRECTORS)
        ?.map((e) => ({ id: e.id, name: e.name, type: e.type, createdAt: e.createdAt }))
        ?.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()),
      approveId: managerApprover?.id || null,
      newValueHistory: userMovement.newValue,
      subManagers,
    };
  }

  async getUserDetail(id: string, _: UserRequest) {
    const [userDetail, allUserOrgUnitPositions] = await Promise.all([
      this.userRepo.findOne({
        where: { id },
        relations: ['subManagers', 'subManagers.orgUnit'],
        select: {
          subManagers: {
            id: true,
            status: true,
            orgUnitParentId: true,
            orgUnit: {
              id: true,
              type: true,
              name: true,
            },
          },
        },
      }),

      this.userOrgUnitPositionRepository.find({
        where: { userId: id },
        relations: ['orgUnit', 'orgUnit.manager', 'position'],
        select: {
          orgUnit: {
            id: true,
            name: true,
            manager: {
              id: true,
              name: true,
              url: true,
            },
          },
          position: {
            id: true,
            name: true,
          },
        },
      }),
    ]);

    if (!userDetail) throw new NotFoundException('Người dùng không tồn tại');

    let userOrgUnitPositions = await this.userOrgUnitPositionRepository.find({
      relations: ['position', 'orgUnit'],
      where: {
        userId: id,
      },
      order: {
        createdAt: 'DESC',
      },
      select: {
        id: true,
        createdAt: true,
        orgUnitId: true,
        positionType: true,
        position: {
          id: true,
          name: true,
        },
        orgUnit: {
          id: true,
          name: true,
          managerId: true,
        },
      },
    });

    userOrgUnitPositions = await Promise.all(
      userOrgUnitPositions.map(async (e) => ({
        ...e,
        orgUnits: await this.orgUnitRepository.findAncestors(e.orgUnit, {
          relations: ['manager'],
        }),
      })),
    );

    const managersByOrgUnit = await this.getNearestManagersForUsers(allUserOrgUnitPositions, id);
    return {
      ...userDetail,
      orgUnits: managersByOrgUnit,
      userOrgUnitPositions,
    };
  }

  async getSubManager(node: OrgUnit): Promise<SubManager> {
    return await this.subManagerRepo.findOne({
      relations: ['user'],
      where: { orgUnitId: node.id, status: SubManagerStatus.ACTIVE },
      select: {
        id: true,
        user: {
          id: true,
          name: true,
          email: true,
          url: true,
        },
      },
    });
  }

  async getNearestManagersForUsers(allUserOrgUnitPositions: UserOrgUnitPosition[], userId: string) {
    let managersByOrgUnit = [];

    for (const pos of allUserOrgUnitPositions) {
      // Lấy ancestor tree cho orgUnit này
      const ancestorTree = await this.orgUnitRepository.findAncestorsTree(pos.orgUnit, {
        relations: ['manager', 'parent'],
      });
      // Đệ quy gom ancestor từ node hiện tại lên root
      const collectAncestors = async (node: OrgUnit, arr = []) => {
        if (!node) return arr;

        // phó phòng, phó bộ phận
        const subManager: SubManager = await this.getSubManager(node);

        // push phó phòng, phó bộ phận
        if (subManager && subManager.user) {
          const customNode = {
            id: `${node.parent?.id}_sub_${subManager.user.id}`, // Tạo ID unique
            name: node.parent?.name,
            type: node.parent?.type + 1,
            manager: subManager.user,
          };

          if (subManager.user.id !== userId) arr.push(customNode);
        }

        if (node.manager && node.manager.id !== userId) arr.push(node);

        if (node.parent) await collectAncestors(node.parent, arr);

        return arr;
      };
      const ancestors = await collectAncestors(ancestorTree, []);
      // Lọc các orgUnit có manager, giữ thứ tự từ gần nhất lên xa nhất
      const managersWithOrgUnits = ancestors
        .filter((ancestor) => ancestor.manager)
        .map((ancestor, idx) => ({
          orgUnit: ancestor,
          manager: ancestor.manager,
          level: idx,
        }));
      // Lấy 2 manager gần nhất
      managersWithOrgUnits.forEach((item) => {
        if (!managersByOrgUnit.some((e) => e.manager.id === item.manager.id)) {
          managersByOrgUnit.push({
            id: item.orgUnit.id,
            name: item.orgUnit.name,
            parentId: item.orgUnit.parentId,
            managerId: item.orgUnit.managerId,
            type: item.orgUnit.type ? item.orgUnit.type : 10,
            manager: {
              id: item.manager.id,
              name: item.manager.name,
              email: item.manager.email,
              url: item.manager.url,
            },
            level: item.level,
          });
        }
      });
    }

    return managersByOrgUnit.sort((a, b) => a.type - b.type);
  }

  async createUserMovementNotify(dto: CreateUserMovementNotifyDto) {
    const { userMovementId, userIds } = dto;
    if (!userMovementId || !userIds?.length) {
      throw new BadRequestException('Thiếu userMovementId hoặc userIds');
    }

    const [userMovement, users, existing] = await Promise.all([
      this.userMovementRepo.exists({ where: { id: userMovementId } }),

      this.userRepo.find({ where: { id: In(userIds) } }),

      this.userMovementNotifyRepo.find({ where: { userMovementId }, select: ['userId', 'id'] }),
    ]);

    if (!userMovement) throw new NotFoundException('không có userMovementId');

    if (users.length !== userIds.length)
      throw new NotFoundException('Một số người dùng không tồn tại');

    const existingUserIds = existing.map((e) => e.userId);
    // Tìm userId cần thêm mới
    const toAdd = userIds.filter((id) => !existingUserIds.includes(id));
    // Tìm id cần xoá
    const toDelete = existing.filter((e) => !userIds.includes(e.userId)).map((e) => e.id);

    // Chuẩn bị entity thêm mới
    const notifyInsert = toAdd.map((userId) => ({
      id: uuidv4(),
      userMovementId,
      userId,
    }));

    return await this.dataSource
      .transaction(async (manager) => {
        if (notifyInsert.length) await manager.save(UserMovementNotify, notifyInsert);

        if (toDelete.length) await manager.delete(UserMovementNotify, toDelete);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListApprovers(getListApproverDto: GetListApproverDto, user: UserRequest) {
    const { orgUnitId, oldOrgUnitId, userId } = getListApproverDto;

    const [existsOrgUnitOld, existsOrgUnitNew] = await Promise.all([
      this.orgUnitRepository.findOne({ where: { id: oldOrgUnitId }, relations: ['manager'] }),

      this.orgUnitRepository.findOne({ where: { id: orgUnitId }, relations: ['manager'] }),
    ]);

    const [ancestorsTreeOld, ancestorsTreeNew] = await Promise.all([
      oldOrgUnitId
        ? this.orgUnitRepository.findAncestorsTree(existsOrgUnitOld, { relations: ['manager'] })
        : null,

      this.orgUnitRepository.findAncestorsTree(existsOrgUnitNew, { relations: ['manager'] }),
    ]);

    let [ancestorsOld, ancestorsNew] = await Promise.all([
      oldOrgUnitId
        ? this.userHandle.findAncestorsApprover(ancestorsTreeOld, UserApproveTransferType.OLD)
        : null,

      this.userHandle.findAncestorsApprover(ancestorsTreeNew, UserApproveTransferType.NEW),
    ]);

    if (ancestorsOld) {
      // Lọc ancestorsOld, chỉ giữ lại những id không trùng với ancestorsNew
      const ancestorsNewIds = ancestorsNew.map((a) => a.id);
      const uniqueAncestorsOld = ancestorsOld.filter((a) => !ancestorsNewIds.includes(a.id));

      // Tạo danh sách approvers: ancestorsOld (đã lọc) + ancestorsNew
      ancestorsNew = [...uniqueAncestorsOld, ...ancestorsNew];
    }

    ancestorsNew = ancestorsNew.map((e) => (e.id === user.id ? { ...e, order: 0 } : e));

    return ancestorsNew.filter((e) => e.id !== userId);
  }

  // Tách logic xử lý update thành method riêng để tái sử dụng
  private async executeUserMovementUpdate(
    userMovement: UserMovement,
    oldUnitPositionDelete: DeepPartial<UserOrgUnitPosition>,
    newUnitPositionInsert: DeepPartial<UserOrgUnitPosition> | null,
    existsOldManger: any,
    existsSubManager: any,
    manager: EntityManager,
  ) {
    console.log(`executeUserMovementUpdate`, userMovement.id);

    // update user movement status effective
    await manager.update(UserMovement, userMovement.id, {
      status: UserMovementStatus.EFFECTIVE,
    });

    // delete old unit position
    await manager.delete(UserOrgUnitPosition, oldUnitPositionDelete);

    // 1. xóa manager cũ
    if (existsOldManger)
      await manager.update(OrgUnit, userMovement.oldValue.orgUnit.id, { managerId: null });

    // 2. cập nhật manager mới
    if (userMovement.position?.type === PositionType.MANAGER)
      await manager.update(OrgUnit, userMovement.orgUnitId, {
        managerId: userMovement.userId,
      });

    // insert new unit position
    newUnitPositionInsert && (await manager.insert(UserOrgUnitPosition, newUnitPositionInsert));

    const whereSubManager = {
      userId: userMovement.userId,
      orgUnitParentId: userMovement.oldValue.orgUnit?.id,
    };

    if (userMovement.orgUnitId && userMovement.positionId) {
      // delete subManagerActive
      await manager.delete(SubManager, {
        ...whereSubManager,
        status: SubManagerStatus.ACTIVE,
      });

      // active subManagerInactive
      if (existsSubManager)
        await manager.update(
          SubManager,
          {
            userId: userMovement.userId,
            orgUnitParentId: userMovement.orgUnitId,
            status: SubManagerStatus.INACTIVE,
          },
          { status: SubManagerStatus.ACTIVE },
        );
    } else {
      // delete all subManager
      await manager.delete(SubManager, whereSubManager);
    }

    // // delete old sub manager
    // await manager.delete(SubManager, {
    //   userId: userMovement.userId,
    //   orgUnitParentId: userMovement.oldValue.orgUnit.id,
    //   status: SubManagerStatus.ACTIVE,
    // });

    // // handle subManager
    // if (existsSubManager) {
    //   // active subManagerInactive
    //   await manager.update(
    //     SubManager,
    //     {
    //       userId: userMovement.userId,
    //       orgUnitParentId: userMovement.orgUnitId,
    //       status: SubManagerStatus.INACTIVE,
    //     },
    //     { status: SubManagerStatus.ACTIVE },
    //   );
    // }
  }

  // Tách logic gửi notification thành method riêng
  private async sendNotification(userMovement: UserMovement) {
    const userIds = [
      ...new Set([
        ...userMovement.userMovementApprovers.map((u) => u.approverId),
        userMovement.createdById,
      ]),
    ];

    const message =
      userMovement.position?.name && userMovement.orgUnit?.name
        ? `Nhân sự ${userMovement.user?.name} đã được ${userMovement.type} chức danh ${userMovement.position?.name} đơn vị ${userMovement.orgUnit?.name}`
        : `Nhân sự ${userMovement.user?.name} đã được ${userMovement.type} thành công`;

    await this.pushNotifyDefault(userMovement.type, message, userIds, userMovement.createdById);

    const messageUser =
      userMovement.position?.name && userMovement.orgUnit?.name
        ? `Bạn đã được ${userMovement.type} đến vị trí ${userMovement.position?.name} đơn vị ${userMovement.orgUnit?.name} thành công`
        : `Bạn đã được ${userMovement.type} khỏi vị trí ${userMovement.oldValue.position?.positionName} - đơn vị ${userMovement.oldValue.orgUnit?.orgName}`;

    await this.pushNotifyDefault(
      userMovement.type,
      messageUser,
      [userMovement.userId],
      userMovement.createdById,
    );
  }

  async getListUserByUserMovementId(id: string, _: UserRequest) {
    const userMovement = await this.userMovementRepo.findOne({
      relations: ['userMovementApprovers', 'userMovementApprovers.approver', 'createdBy'],
      where: { id },
      select: {
        userMovementApprovers: {
          id: true,
          approver: {
            id: true,
            name: true,
            url: true,
          },
        },
        createdBy: {
          id: true,
          name: true,
          url: true,
        },
      },
    });

    if (!userMovement) throw new NotFoundException('Yêu cầu phê duyệt không tồn tại!');

    const users = [
      ...userMovement.userMovementApprovers?.map((u) => u.approver),
      userMovement?.createdBy,
    ];

    const uniqueUsers = Array.from(new Map(users.map((user) => [user?.id, user])).values());

    return uniqueUsers;
  }

  async deleteUserMovement(id: string, _: UserRequest) {
    const [userMovement, userMovementApprovers] = await Promise.all([
      this.userMovementRepo.findOne({ where: { id } }),
      this.userMovementApproverRepo.find({ where: { userMovementId: id } }),
    ]);

    if (!userMovement) throw new NotFoundException('Yêu cầu phê duyệt không tồn tại!');

    const noPendingApprover = userMovementApprovers.every(
      (u) => u.status === UserMovementStatus.PENDING,
    );

    if (noPendingApprover)
      throw new BadRequestException('Yêu cầu phê duyệt đã có người phê duyệt!');

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.delete(UserMovement, { id });
      })
      .then(() => {
        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }
}
