import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  And,
  Between,
  DataSource,
  DeepPartial,
  Equal,
  FindOptionsWhere,
  In,
  IsNull,
  Not,
  Repository,
  TreeRepository,
} from 'typeorm';
import { UserHandle } from '../user.handle';
import { BcryptService } from 'src/common/services/bcrypt.service';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { CreateUserDto } from '../dtos/create-user.dto';
import {
  SubManagerStatus,
  UserExportExcelColumn,
  UserMovementApproveType,
  UserMovementStatus,
  UserPositionType,
  UserStatus,
  UserTrackingType,
  UserType,
} from '../user.enum';
import { GetListUserDto } from '../dtos/get-list-user.dto';
import { QueryService } from '@/common/services/query.service';
import { isUUID, MAX_DATE, MIN_DATE } from 'class-validator';
import { v4 as uuidv4 } from 'uuid';
import { UpdateAccountDto } from '../dtos/update-account.dto';
import {
  CreateUserOrgUnitPositionDto,
  CreateUserRelationDto,
} from '../dtos/relations/create-user-relation.dto';
import { Position } from '@/modules/position/entities/position.entity';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { UserOrgUnitPosition } from '../entities/user-unit-position.entity';
import { UpdateUserRelationDto } from '../dtos/relations/update-user-relation.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { OrgUnitType } from '@/modules/org-unit/org-unit.enum';
import { UserMovement } from '../entities/user-movement.entity';
import { OrgUnitService } from '../../org-unit/services/org-unit.service';
import { GetListUserByUnitsDto } from '../dtos/get-list-user-by-units.dto';
import { UserMovementApprover } from '../entities/user-movement-approve.entity';
import { PositionSubManager, PositionType } from '@/modules/position/position.enum';
import { UserMovementApprovedPayload } from '../interfaces/user-movement-approved-payload';
import { NotificationService } from '@/modules/notification/services/notification.service';
import { userMovementTypeToNotificationType } from '../user.constant';
import * as ExcelJS from 'exceljs';
import { SubManager } from '../entities/sub-manager.entity';
import { UserTracking } from '../entities/user-tracking';
import { GetListUserExportExcelDto } from '../dtos/get-list-user-export-excel.dto';
import { CACHE_KEY } from '@/common/consts/cache.const';
import { CacheService } from '@/common/services/cache.service';
import { GetListUserOrgUnitDto } from '../dtos/get-list-user-org-unit.dto';
import { KafkaService } from '@/modules/kafka/services/kafka.service';
import { KafkaActionType, KafkaTopics } from '@/modules/kafka/kafka.enum';
import { GetListUserOrgPositionDto } from '../dtos/get-list-user-org-position.dto';
import { UserMovementService } from './user-movement.service';
import { UserDeletedValue, UserHistory } from '../interfaces/user.interface';

@Injectable()
export class UserService {
  constructor(
    private dataSource: DataSource,

    private userHandle: UserHandle,

    private queryService: QueryService,

    private bcryptService: BcryptService,

    private cacheService: CacheService,

    private orgUnitService: OrgUnitService,

    private kafkaService: KafkaService,

    private readonly notificationService: NotificationService,

    private readonly userMovementService: UserMovementService,

    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(UserMovement)
    private userMovementRepo: Repository<UserMovement>,

    @InjectRepository(UserMovementApprover)
    private userMovementApproverRepo: Repository<UserMovementApprover>,

    @InjectRepository(Position)
    private positionRepo: TreeRepository<Position>,

    @InjectRepository(OrgUnit)
    private orgUnitRepo: TreeRepository<OrgUnit>,

    @InjectRepository(UserOrgUnitPosition)
    private userOrgUnitPositionRepo: Repository<UserOrgUnitPosition>,

    @InjectRepository(SubManager)
    private subManagerRepo: Repository<SubManager>,

    @InjectRepository(UserTracking)
    private userTrackingRepo: Repository<UserTracking>,
  ) {}

  async createCeo(createUserDto: CreateUserDto, user?: UserRequest) {
    const { code, phone, type, password, email } = createUserDto;

    const [conflict, existsCeo, positionRoot, orgUnitRoot] = await Promise.all([
      this.userRepo.findOne({
        where: [{ code }, { phone }, { email }],
        select: ['code', 'email', 'phone'],
      }),

      this.userRepo.exists({
        relations: [
          'userOrgUnitPositions',
          'userOrgUnitPositions.orgUnit',
          'userOrgUnitPositions.position',
        ],
        where: {
          userOrgUnitPositions: {
            orgUnit: { parentId: IsNull() },
            position: { parentId: IsNull() },
          },
        },
      }),

      this.positionRepo.findRoots(),

      this.orgUnitRepo.findRoots(),
    ]);

    this.userHandle.errorConflictPhoneCodeEmail(conflict, createUserDto);

    if (existsCeo) throw new BadRequestException('Tài khoản CEO đã tồn tại!');

    if (positionRoot.length === 0) throw new BadRequestException(`Vị trí root không tồn tại`);
    if (orgUnitRoot.length === 0) throw new BadRequestException(`Đơn vị root không tồn tại`);

    if (password) createUserDto.password = await this.bcryptService.hash(password);

    const userInsert: DeepPartial<User> = {
      id: uuidv4(),
      ...createUserDto,
      createdById: user?.id,
    };

    const userOrgUnitPositionInsert: DeepPartial<UserOrgUnitPosition> = {
      userId: userInsert.id,
      positionId: positionRoot[0].id,
      orgUnitId: orgUnitRoot[0].id,
    };

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.insert(User, userInsert);

        delete userInsert.password;

        await manager.insert(UserOrgUnitPosition, userOrgUnitPositionInsert);

        await manager.update(OrgUnit, orgUnitRoot[0].id, { managerId: userInsert.id });
      })
      .then(() => userInsert)
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async createRoot(createUserDto: CreateUserDto, user?: UserRequest) {
    const { code, phone, type, password, email } = createUserDto;

    const [conflict, existsRoot] = await Promise.all([
      this.userRepo.findOne({
        where: [{ code }, { phone }, { email }],
        select: ['code', 'email', 'phone'],
      }),
      type === UserType.ROOT && this.userRepo.exists({ where: { type: UserType.ROOT } }),
    ]);

    this.userHandle.errorConflictPhoneCodeEmail(conflict, createUserDto);

    if (existsRoot) throw new BadRequestException('Tài khoản ROOT đã tồn tại!');

    if (password) createUserDto.password = await this.bcryptService.hash(password);

    const userInsert: DeepPartial<User> = {
      id: uuidv4(),
      ...createUserDto,
      createdById: user?.id,
    };

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.insert(User, userInsert);

        delete userInsert.password;
      })
      .then(() => userInsert)
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async createUserRelation(createUserRelationDto: CreateUserRelationDto, user: UserRequest) {
    const { code, phone, type, password, email, userOrgUnitPositions, subManagers, cccd } =
      createUserRelationDto;

    if ([UserType.HR && UserType.USER].includes(user.type) && [UserType.ROOT].includes(type))
      throw new ForbiddenException('Bạn không có quyền thực hiện chức năng này!');

    const subManagerIds = subManagers.map((s) => s.orgUnitId);

    const [conflict, existsRoot, { managerOrgUnit }, orgUnits, subManager] = await Promise.all([
      this.userRepo.findOne({
        where: [{ code }, { phone }, { email }, { cccd }],
        withDeleted: true,
        select: ['code', 'email', 'phone', 'cccd'],
      }),

      type === UserType.ROOT && this.userRepo.exists({ where: { type: UserType.ROOT } }),

      // validate user orgUnit position
      this.validateUserOrgUnitPositions(userOrgUnitPositions),

      this.orgUnitRepo.count({ where: { id: In(subManagerIds) } }),

      this.subManagerRepo.findOne({
        where: { orgUnitId: In(subManagerIds) },
        relations: ['orgUnit', 'user'],
        select: {
          id: true,
          orgUnit: { id: true, name: true },
          user: { id: true, name: true },
        },
      }),
    ]);

    this.userHandle.errorConflictPhoneCodeEmail(conflict, createUserRelationDto);

    if (existsRoot) throw new BadRequestException('Tài khoản ROOT đã tồn tại!');

    if (orgUnits !== subManagers.length)
      throw new BadRequestException('Một hoặc nhiều đơn vị tổ chức không tồn tại!');

    if (subManager)
      throw new BadRequestException(
        `Đơn vị ${subManager.orgUnit.name} đang được quản lý bởi ${subManager.user.name} hoặc đang chờ phê duyệt`,
      );

    if (password) createUserRelationDto.password = await this.bcryptService.hash(password);

    const userInsertId = uuidv4();
    const subManagerInsert: DeepPartial<SubManager>[] = subManagers.map((e) => ({
      id: uuidv4(),
      orgUnitId: e.orgUnitId,
      userId: userInsertId,
      orgUnitParentId: e.orgUnitParentId,
      createdById: user.id,
    }));

    delete createUserRelationDto.subManagers;

    const userInsert: DeepPartial<User> = {
      id: userInsertId,
      ...createUserRelationDto,
      birthday: createUserRelationDto.birthday,
      createdById: user?.id,
    };

    const userOrgInsert: DeepPartial<UserOrgUnitPosition[]> = userOrgUnitPositions.map((e) => ({
      id: uuidv4(),
      positionId: e.positionId,
      orgUnitId: e.orgUnitId,
      userId: userInsert.id,
      positionType: e.positionType,
    }));

    const orgUnitManagerUpdate: DeepPartial<OrgUnit>[] = managerOrgUnit.map((orgUnitId) => ({
      id: orgUnitId,
      managerId: userInsert.id,
    }));

    const userTrackingInsert: DeepPartial<UserTracking> = {
      id: uuidv4(),
      userId: userInsert.id,
      userMovementId: null,
      type: UserTrackingType.USER_CREATE,
      oldValue: {},
      newValue: {},
      createdById: user.id,
    };

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.insert(User, userInsert);

        delete userInsert.password;

        await manager.insert(UserOrgUnitPosition, userOrgInsert);

        await manager.save(OrgUnit, orgUnitManagerUpdate);

        await manager.insert(SubManager, subManagerInsert);

        await manager.insert(UserTracking, userTrackingInsert);

        if (userOrgInsert.length > 0) {
          await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);
          await this.cacheService.del(CACHE_KEY.POSITION_TREE);
        }
        await this.cacheService.delByPattern(`${CACHE_KEY.USER_RELATION_ANCESTOR}_*`);
      })
      .then(async () => {
        const userRelation = await this.getListUserRelationAncestorOrgUnit({
          page: 0,
          take: 0,
          codes: [code],
        });

        if (userRelation.list.length > 0) {
          await this.kafkaService.emitEvent(KafkaTopics.USER_ACTION, {
            key: code,
            value: {
              type: KafkaActionType.CREATE,
              data: userRelation.list[0],
            },
          });
        }

        return userInsert;
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async validateUserOrgUnitPositions(
    userOrgUnitPositions: CreateUserOrgUnitPositionDto[],
    id = null,
    status = UserStatus.ACTIVE,
  ) {
    return this.userHandle.validateUserOrgUnitPositions(
      userOrgUnitPositions,
      id,
      this.positionRepo,
      this.orgUnitRepo,
      this.userOrgUnitPositionRepo,
      this.userMovementRepo,
      status,
    );
  }

  async updateUserRelation(
    id: string,
    updateUserRelationDto: UpdateUserRelationDto,
    user: UserRequest,
  ) {
    const { code, email, phone, password, userOrgUnitPositions, status, subManagers, cccd } =
      updateUserRelationDto;

    const orgUnitIds = subManagers.map((s) => s.orgUnitId);

    const [
      conflict,
      userDb,
      { userOrgPositionInsert, userOrgPositionDelete, managerOrgUnit },
      countOrgUnits,
      subManagerOfUser,
      orgUnits,
      conflictSubManager,
    ] = await Promise.all([
      (code || phone || email) &&
        this.userRepo.findOne({
          where: [
            code ? { id: Not(id), code } : undefined,
            email ? { id: Not(id), email } : undefined,
            phone ? { id: Not(id), phone } : undefined,
            cccd ? { id: Not(id), cccd } : undefined,
          ],
          withDeleted: true,
        }),

      this.userRepo.findOne({ where: { id }, withDeleted: true }),

      // validate user orgUnit position
      this.validateUserOrgUnitPositions(userOrgUnitPositions, id, status),

      this.orgUnitRepo.count({ where: { id: In(subManagers.map((s) => s.orgUnitId)) } }),

      this.subManagerRepo.find({ where: { userId: id } }),

      this.orgUnitRepo.count({ where: { id: In(orgUnitIds) } }),

      this.subManagerRepo.findOne({
        where: { orgUnitId: In(orgUnitIds), userId: Not(id) },
        relations: ['orgUnit', 'user'],
        select: {
          id: true,
          orgUnitId: true,
          userId: true,
          orgUnit: { id: true, name: true },
          user: { id: true, name: true },
        },
      }),
    ]);

    if (orgUnits !== subManagers.length)
      throw new BadRequestException('Một hoặc nhiều đơn vị tổ chức không tồn tại!');

    if (conflictSubManager && conflictSubManager?.user)
      throw new BadRequestException(
        `Đơn vị ${conflictSubManager.orgUnit.name} đang được quản lý bởi ${conflictSubManager.user?.name} hoặc đang chờ phê duyệt`,
      );

    // if (id === user.id)
    //   throw new BadRequestException('Vui lòng không sử dụng API này để cập nhật chính mình!');

    // Không update người cùng cấp hoặc lớn hơn
    // if (user.type === UserType.ADMIN && [UserType.ROOT, UserType.ADMIN].includes(userDb.type))
    //   throw new ForbiddenException('Bạn không có quyền thực hiện chức năng này!');

    this.userHandle.errorConflictPhoneCodeEmail(conflict, updateUserRelationDto);

    if (countOrgUnits !== subManagers.length)
      throw new BadRequestException('Một hoặc nhiều đơn vị tổ chức không tồn tại!');

    let orgUnitDeleteManager: DeepPartial<OrgUnit[]> = [];
    if (status === UserStatus.INACTIVE) {
      // check user có đề xuất chưa duyệt không
      await this.checkUserHasPendingMovement(id);

      const userOrgUnitPosition = await this.userOrgUnitPositionRepo.find({
        where: { userId: id, orgUnit: { managerId: id } },
        relations: ['orgUnit'],
        select: {
          id: true,
          orgUnitId: true,
          orgUnit: {
            managerId: true,
          },
        },
      });

      orgUnitDeleteManager = userOrgUnitPosition.map((e) => ({
        id: e.orgUnitId,
        managerId: null,
      }));
    }

    if (password) updateUserRelationDto.password = await this.bcryptService.hash(password);

    // subManagerOfUser nếu có orgUnitIds thì bỏ qua, nếu mới thì tạo, nếu không có truyền vào thì delete
    const existingOrgUnitIds = subManagerOfUser.map((sm) => sm.orgUnitId);
    const newSubManagers = subManagers.filter((s) => !existingOrgUnitIds.includes(s.orgUnitId));

    const subManagerInsert: DeepPartial<SubManager>[] = newSubManagers.map((s) => ({
      id: uuidv4(),
      orgUnitId: s.orgUnitId,
      userId: id,
      orgUnitParentId: s.orgUnitParentId,
      createdById: user.id,
    }));

    const userTrackingInsert: DeepPartial<UserTracking> = await this.buildUserTracking(
      id,
      userDb,
      updateUserRelationDto,
      userOrgPositionInsert,
      subManagerInsert,
      user,
    );

    delete updateUserRelationDto.subManagers;
    delete updateUserRelationDto.userOrgUnitPositions;

    const orgUnitManagerUpdate: DeepPartial<OrgUnit>[] = managerOrgUnit.map((orgUnitId) => ({
      id: orgUnitId,
      managerId: id,
    }));

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.insert(SubManager, subManagerInsert);

        await manager.update(User, id, { ...updateUserRelationDto, updatedById: user.id });

        if (conflictSubManager && !conflictSubManager?.user)
          await manager.delete(SubManager, { id: conflictSubManager.id });

        for await (const where of userOrgPositionDelete) {
          // delete userOrgUnitPosition old
          await manager.delete(UserOrgUnitPosition, where);

          // delete manager orgUnit old if exists
          const orgUnitOld = await manager.exists(OrgUnit, {
            where: { id: where.orgUnitId, managerId: id },
          });

          if (orgUnitOld) await manager.update(OrgUnit, where.orgUnitId, { managerId: null });
        }

        await manager.insert(UserOrgUnitPosition, userOrgPositionInsert);

        // update manager orgUnit
        if (status === UserStatus.ACTIVE) await manager.save(OrgUnit, orgUnitManagerUpdate);

        // nếu gnười dùng nghỉ việc
        if (status === UserStatus.INACTIVE) await manager.save(OrgUnit, orgUnitDeleteManager);

        await manager.insert(UserTracking, userTrackingInsert);

        if (userOrgPositionInsert.length > 0) {
          await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);
          await this.cacheService.del(CACHE_KEY.POSITION_TREE);
        }
        await this.cacheService.delByPattern(`${CACHE_KEY.USER_RELATION_ANCESTOR}_*`);
      })
      .then(async () => {
        const userRelation = await this.getListUserRelationAncestorOrgUnit({
          page: 0,
          take: 0,
          codes: [code],
        });

        if (userRelation.list.length > 0) {
          this.kafkaService.emitEvent(KafkaTopics.USER_ACTION, {
            key: code,
            value: {
              type: KafkaActionType.UPDATE,
              data: userRelation.list[0],
            },
          });
        }

        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async buildUserTracking(
    id: string,
    userDb: User,
    updateUserRelationDto: UpdateUserRelationDto,
    userOrgPositionInsert: DeepPartial<UserOrgUnitPosition>[],
    subManagerInsert: DeepPartial<SubManager>[],
    user: UserRequest,
  ) {
    let userOrgUnitPositions = [];
    let subManagers = [];

    for (const item of userOrgPositionInsert) {
      const [orgUnit, position] = await Promise.all([
        this.orgUnitRepo.findOne({ where: { id: item.orgUnitId }, select: ['id', 'name'] }),
        this.positionRepo.findOne({ where: { id: item.positionId }, select: ['id', 'name'] }),
      ]);

      userOrgUnitPositions.push({
        orgUnit,
        position,
      } as UserOrgUnitPosition);
    }

    for (const item of subManagerInsert) {
      const orgUnit = await this.orgUnitRepo.findOne({
        where: { id: item.orgUnitId },
        select: ['id', 'name'],
      });
      subManagers.push({
        id: item.id,
        orgUnitParentId: item.orgUnitParentId,
        orgUnit,
      } as SubManager);
    }

    const userTrackingInsert: DeepPartial<UserTracking> = {
      id: uuidv4(),
      userId: id,
      userMovementId: null,
      type: UserTrackingType.USER_UPDATE,
      oldValue: {
        code: userDb.code,
        name: userDb.name,
        type: userDb.type,
        email: userDb.email,
        phone: userDb.phone,
        cccd: userDb.cccd,
        gender: userDb.gender,
        status: userDb.status,
        address: userDb.address,
        tempAddress: userDb.tempAddress,
        birthday: userDb.birthday,
        url: userDb.url,
        password: userDb.password,
        dateOnboard: userDb.dateOnboard,
        officialStatus: userDb.officialStatus,
        userOrgUnitPositions: [],
        subManagers: [],
      },
      newValue: {
        id,
        code: updateUserRelationDto.code,
        name: updateUserRelationDto.name,
        type: updateUserRelationDto.type,
        email: updateUserRelationDto.email,
        phone: updateUserRelationDto.phone,
        cccd: updateUserRelationDto.cccd,
        gender: updateUserRelationDto.gender,
        status: updateUserRelationDto.status,
        address: updateUserRelationDto.address,
        tempAddress: updateUserRelationDto.tempAddress,
        url: updateUserRelationDto.url,
        birthday: updateUserRelationDto.birthday,
        password: updateUserRelationDto.password,
        dateOnboard: updateUserRelationDto.dateOnboard,
        officialStatus: updateUserRelationDto.officialStatus,
        userOrgUnitPositions: userOrgUnitPositions || [],
        subManagers: subManagers || [],
      },
      createdById: user.id,
    };

    return userTrackingInsert;
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

  async getUserMovementApprovedIds(userId: string) {
    const userMovementApprovers = await this.userMovementApproverRepo.find({
      where: {
        approverId: userId,
        approveType: Not(UserMovementApproveType.FOLLOWERS),
        userMovement: {
          status: UserMovementStatus.PENDING,
          userMovementApprovers: { approveType: Not(UserMovementApproveType.FOLLOWERS) },
        },
      },
      relations: [
        'userMovement',
        'userMovement.userMovementApprovers',
        'userMovement.position',
        'userMovement.orgUnit',
        'userMovement.user',
      ],
      select: {
        id: true,
        userMovement: {
          id: true,
          oldValue: true,
          newValue: true,
          positionId: true,
          userId: true,
          type: true,
          position: {
            name: true,
            type: true,
          },
          orgUnit: {
            name: true,
          },
          user: {
            name: true,
          },
          userMovementApprovers: {
            id: true,
            status: true,
            userMovementId: true,
            approverId: true,
            approveType: true,
          },
        },
      },
    });

    const deleteUserMovementApproverIds: string[] = [];
    let userMovementApproved: UserMovementApprovedPayload[] = [];

    for (const approver of userMovementApprovers) {
      // Lấy danh sách các approver khác userId hiện tại
      const otherApprovers = approver.userMovement.userMovementApprovers.filter(
        (a) => a.approverId !== userId,
      );

      // Nếu tất cả các approver khác đều đã APPROVED (không còn ai chưa approved)
      if (
        otherApprovers.length > 0 &&
        !otherApprovers.find((a) => a.status !== UserMovementStatus.APPROVED)
      ) {
        const existsOldManger = await this.orgUnitRepo.findOne({
          where: {
            id: approver.userMovement.oldValue.orgUnit.id,
            managerId: approver.userMovement.userId,
          },
        });

        let oldUnitPositionDelete: DeepPartial<UserOrgUnitPosition> = {
          userId: approver.userMovement.userId,
          orgUnitId: approver.userMovement.oldValue.orgUnit.id,
          positionId: approver.userMovement.oldValue.position.id,
        };

        let newUnitPositionInsert: DeepPartial<UserOrgUnitPosition> = {
          userId: approver.userMovement.userId,
          orgUnitId: approver.userMovement.newValue.orgUnit.id,
          positionId: approver.userMovement.newValue.position.id,
        };

        let payload: UserMovementApprovedPayload = {
          userMovementId: otherApprovers[0].userMovementId,
          oldUnitPositionDelete,
          newUnitPositionInsert,
          isManager: false,
          oldManager: false,
          approverIds: otherApprovers.map((a) => a.approverId),
          userMovement: {
            type: approver.userMovement.type,
            position: approver.userMovement.position,
            orgUnit: approver.userMovement.orgUnit,
            user: approver.userMovement.user,
            userId: approver.userMovement.userId,
          } as UserMovement,
        };

        if (approver.userMovement.position.type === PositionType.MANAGER)
          payload = {
            ...payload,
            isManager: true,
            orgUnitId: approver.userMovement.newValue.orgUnit.id,
          };

        if (existsOldManger)
          payload = {
            ...payload,
            oldManager: true,
            oldOrgUnitId: approver.userMovement.oldValue.orgUnit.id,
          };

        userMovementApproved.push(payload);
      }

      // delete user movement approver when user inactive
      const userApprovers = approver.userMovement.userMovementApprovers
        .filter((a) => a.approverId === userId)
        .map((a) => a.id);

      if (userApprovers.length > 0) deleteUserMovementApproverIds.push(...userApprovers);
    }

    return { userMovementApproved, deleteUserMovementApproverIds };
  }

  async updateAccount(updateAccountDto: UpdateAccountDto, user: UserRequest) {
    const { email, phone, passwordOld, password } = updateAccountDto;

    if (password && !passwordOld)
      throw new BadRequestException('Vui lòng cung cấp mật khẩu cũ để cập nhật mật khẩu!');

    const conflict = await this.userRepo.findOne({
      where: [
        { id: Not(user.id), email: And(Not(null), Equal(email)) },
        { id: Not(user.id), phone: And(Not(null), Equal(phone)) },
      ],
      select: ['email', 'phone'],
    });

    if (conflict) {
      if (conflict.email === email) throw new ConflictException('Email đã được sử dụng!');
      if (conflict.phone === phone) throw new ConflictException('Số điện thoại đã được sử dụng!');
    }

    if (password && passwordOld) {
      const userDb = await this.userRepo.findOne({
        where: { id: user.id },
        select: ['password'],
      });
      const isMatch = await this.bcryptService.compareHash(passwordOld, userDb.password);

      if (!isMatch) throw new UnauthorizedException('Mật khẩu cũ không chính xác!');

      updateAccountDto.password = await this.bcryptService.hash(password);
    }

    delete updateAccountDto.passwordOld;

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.update(User, user.id, {
          ...updateAccountDto,
          updatedById: user.id,
        });

        delete updateAccountDto.password;
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({
          message: err.message,
          code: err.code,
          success: false,
        });
      });
  }

  async removeUser(id: string, user: UserRequest) {
    const [userDb, orgUnits, orgUnitDirectors, _] = await Promise.all([
      this.userRepo.findOne({ where: { id }, select: ['type', 'code'] }),

      this.orgUnitRepo.find({ where: { managerId: id } }),

      this.orgUnitRepo.exists({
        where: { id: user.orgUnitId, type: OrgUnitType.BOARD_OF_DIRECTORS },
      }),

      this.checkUserHasPendingMovement(id),
    ]);

    if (!userDb) throw new NotFoundException('Tài khoản không tồn tại!');

    if (
      ![UserType.ROOT, UserType.ADMIN].includes(user.type) ||
      (UserType.ADMIN === userDb.type && !orgUnitDirectors)
    )
      throw new ForbiddenException('Bạn không có quyền thực hiện chức năng này!');

    // nếu orgUnit có manager bằng id thì manager = null
    const orgUnitUpdate: DeepPartial<OrgUnit>[] = orgUnits.map((e) => ({
      id: e.id,
      managerId: null,
    }));

    // lấy userDetailHistory
    const userDetailHistory = await this.userMovementService.getUserDetail(id, user);
    const userMovementHistory = await this.getUserMovementHistory(id, user);
    const userHistory = await this.getUserHistory(id, user);

    const userDeletedValue: UserDeletedValue = {
      userDetailHistory: {
        orgUnits: userDetailHistory.orgUnits,
        userOrgUnitPositions: userDetailHistory.userOrgUnitPositions as UserOrgUnitPosition[] & {
          orgUnits: OrgUnit[];
        },
      },
      userMovementHistory: {
        userMovements: userMovementHistory.userMovements,
      },
      userHistory: userHistory as unknown as UserHistory,
    };

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.update(
          User,
          { id },
          { deletedValue: userDeletedValue, deletedById: user.id },
        );

        await manager.softDelete(User, { id });

        // Xóa các quan hệ user-orgunit
        await manager.delete(UserOrgUnitPosition, { userId: id });

        // 2. cập nhật manager orgUnit null
        await manager.save(OrgUnit, orgUnitUpdate);

        // 3. delete subManager
        await manager.delete(SubManager, { userId: id });
      })
      .then(async () => {
        // xóa cache
        await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);
        await this.cacheService.del(CACHE_KEY.POSITION_TREE);
        await this.cacheService.delByPattern(`${CACHE_KEY.USER_RELATION_ANCESTOR}_*`);

        await this.kafkaService.emitEvent(KafkaTopics.USER_ACTION, {
          key: userDb.code,
          value: {
            type: KafkaActionType.REMOVE,
            data: { id, ...userDb, deletedAt: new Date() } as User,
          },
        });

        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListUser(getListUserDto: GetListUserDto, _: UserRequest) {
    let {
      page,
      take,
      orderBy,
      order,
      search,
      status,
      type,
      gender,
      positionIds,
      orgUnitIds,
      isSearchOrgUnit,
      notType,
      followersIds,
      notUserIds,
      subManager,
      currentOrgUnitId,
    } = getListUserDto;

    if (isSearchOrgUnit && orgUnitIds.length > 0)
      orgUnitIds = await this.userHandle.getIdsWithDescendants(orgUnitIds, this.orgUnitRepo);

    const whereItem: FindOptionsWhere<User> = {};

    if (status) whereItem.status = status;
    if (type) whereItem.type = type;
    else if (notType) whereItem.type = Not(In([UserType.CANDIDATE, UserType.EMPLOYEE, notType]));
    else whereItem.type = Not(In([UserType.CANDIDATE, UserType.EMPLOYEE, UserType.ROOT]));
    if (gender) whereItem.gender = gender;
    if (notUserIds) whereItem.id = Not(In(notUserIds));
    if (orgUnitIds.length || positionIds.length) {
      whereItem.userOrgUnitPositions = {};

      if (orgUnitIds.length) whereItem.userOrgUnitPositions.orgUnitId = In(orgUnitIds);

      if (positionIds.length) whereItem.userOrgUnitPositions.positionId = In(positionIds);
    }

    let where: FindOptionsWhere<User>[] = [whereItem];

    // sử lý where cho form thêm người xét duyệt
    if (type && subManager === PositionSubManager.SUB_MANAGER && currentOrgUnitId) {
      const currentOrgUnit = await this.orgUnitRepo.findOne({ where: { id: currentOrgUnitId } });

      if (!currentOrgUnit) throw new NotFoundException('Đơn vị không tồn tại!');

      const ancestors = await this.orgUnitRepo.findAncestors(currentOrgUnit);

      const orgUnitIdsUnique = [...new Set([...ancestors.map((e) => e.id), currentOrgUnitId])];

      // First condition: users with specific type
      const firstCondition: FindOptionsWhere<User> = {
        ...whereItem,
        type,
      };

      const wherePosition: FindOptionsWhere<UserOrgUnitPosition> = {
        position: { subManager: subManager },
        orgUnitId: In(orgUnitIdsUnique),
      };

      // Second condition: users with subManager position
      delete whereItem.type;
      let secondCondition: FindOptionsWhere<User> = {
        ...whereItem,
        userOrgUnitPositions: wherePosition,
      };

      if (orgUnitIds.length)
        secondCondition.userOrgUnitPositions = { ...wherePosition, orgUnitId: In(orgUnitIds) };

      if (positionIds.length)
        secondCondition.userOrgUnitPositions = { ...wherePosition, positionId: In(positionIds) };

      where = [firstCondition, secondCondition];
    }

    if (search) {
      if (where.length === 1) {
        // Nếu chỉ có một điều kiện, áp dụng search trực tiếp
        where = this.queryService.search({
          arrayPropertyLike: ['name', 'email', 'phone', 'code'],
          search,
          whereItem: where[0],
        });
      } else {
        // Nếu có nhiều điều kiện (firstCondition và secondCondition), áp dụng search cho từng điều kiện
        const searchResults: FindOptionsWhere<User>[] = [];
        where.forEach((condition) => {
          const searchConditions = this.queryService.search({
            arrayPropertyLike: ['name', 'email', 'phone', 'code'],
            search,
            whereItem: condition,
          });
          searchResults.push(...searchConditions);
        });
        where = searchResults;
      }
    }

    let [list, total] = await this.userRepo.findAndCount({
      where,
      ...this.queryService.getPagination({ page, take }),
      order:
        orderBy !== 'updatedAt'
          ? { [orderBy]: order }
          : { userOrgUnitPositions: { position: { level: 'ASC', name: 'ASC' } }, name: 'ASC' },
      relations: { userOrgUnitPositions: { position: true, orgUnit: true } },
      select: {
        userOrgUnitPositions: {
          id: true,
          orgUnitId: true,
          positionId: true,
          position: {
            id: true,
            name: true,
            level: true,
          },
          orgUnit: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (followersIds && followersIds.length > 0) {
      // Sắp xếp: checked users lên đầu
      list = list.map((e, index) =>
        followersIds?.includes(e.id) ? { ...e, order: 1 } : { ...e, order: index + 2 },
      );
      list.sort((a: User & { order: number }, b: User & { order: number }) => a.order - b.order);
    }

    return { total, list };
  }

  async getListUserRelations(getListUserDto: GetListUserDto, user: UserRequest) {
    let {
      page,
      take,
      orderBy,
      order,
      search,
      status,
      type,
      gender,
      positionIds,
      orgUnitIds,
      isSearchOrgUnit,
      officialStatus,
      cccd,
    } = getListUserDto;

    if (isSearchOrgUnit && orgUnitIds.length > 0)
      orgUnitIds = (await this.userHandle.getIdsWithDescendants(
        orgUnitIds,
        this.orgUnitRepo,
      )) as string[];

    const whereItem: FindOptionsWhere<User> = {};

    if (status) whereItem.status = status;
    if (officialStatus) whereItem.officialStatus = officialStatus;
    if (type) whereItem.type = type;
    else whereItem.type = Not(In([UserType.CANDIDATE, UserType.EMPLOYEE]));
    if (gender) whereItem.gender = gender;
    if (orgUnitIds.length || positionIds.length) {
      whereItem.userOrgUnitPositions = {};

      if (orgUnitIds.length) whereItem.userOrgUnitPositions.orgUnitId = In(orgUnitIds);

      if (positionIds.length) whereItem.userOrgUnitPositions.positionId = In(positionIds);
    }

    let where: FindOptionsWhere<User>[] = [whereItem];

    if (search)
      where = this.queryService.search({
        arrayPropertyLike: ['name', 'email', 'phone', 'code', 'cccd'],
        search,
        whereItem,
      });

    const [[list, total], positionAssistant, subManager] = await Promise.all([
      this.userRepo.findAndCount({
        where,
        ...this.queryService.getPagination({ page, take }),
        order: { [orderBy]: order },
        relations: { userOrgUnitPositions: true },
        select: {
          userOrgUnitPositions: {
            id: true,
            orgUnitId: true,
            positionId: true,
          },
        },
      }),

      this.positionRepo.exists({
        where: { id: user.positionId, type: PositionType.ASSISTANT },
      }),

      this.positionRepo.exists({
        where: { id: user.positionId, subManager: PositionSubManager.SUB_MANAGER },
      }),
    ]);

    // Lấy tất cả orgUnit con (bao gồm cả chính nó) của user đang đăng nhập
    let descendantOrgUnitIds: string[] = [];
    let currentOrgUnit;
    let managerOrgUnitId: string;

    // handle role manager assistant
    if (positionAssistant) {
      const orgUnitManager = await this.userOrgUnitPositionRepo.findOne({
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
    }

    const [managerOrgUnit, subManagerOrgUnit] = await Promise.all([
      this.orgUnitRepo.exists({
        where: { id: user.orgUnitId, managerId: managerOrgUnitId || user.id },
      }),

      subManager
        ? this.subManagerRepo.find({
            where: {
              userId: user.id,
              orgUnitParentId: user.orgUnitId,
              status: SubManagerStatus.ACTIVE,
            },
            relations: ['orgUnit'],
            select: { id: true, orgUnit: true },
          })
        : [],
    ]);

    // Lấy tất cả orgUnit con của phòng phụ trách
    if (subManagerOrgUnit.length > 0) {
      for (const subManager of subManagerOrgUnit) {
        if (subManager.orgUnit) {
          const orgUnitDescendants = await this.orgUnitRepo.findDescendants(subManager.orgUnit);

          descendantOrgUnitIds.push(...orgUnitDescendants.map((unit) => unit.id));
        }
      }
    }

    // gdk
    if (user.orgUnitId && !subManager) {
      currentOrgUnit = await this.orgUnitRepo.findOne({ where: { id: user.orgUnitId } });

      if (currentOrgUnit) {
        const orgUnitTreeRepo = this.orgUnitRepo.manager.getTreeRepository(this.orgUnitRepo.target);

        const descendants = await orgUnitTreeRepo.findDescendants(currentOrgUnit);
        descendantOrgUnitIds = descendants.map((unit) => unit.id);
      }
    }

    // Lấy danh sách userId
    const userIds = list.map((u: User) => u.id);
    // Lấy managers cho tất cả user (theo format mới)
    const userManagers = await this.getNearestManagersForUsers(userIds);
    // Gom managers theo userId
    const managersByUser: Record<string, any> = {};
    for (const item of userManagers) {
      managersByUser[item.userId] = item.managers;
    }

    // handle permission
    this.userHandle.handlePermission({
      user,
      currentOrgUnit,
      descendantOrgUnitIds,
      list,
      managersByUser,
    });

    return {
      total,
      list,
      isManager: managerOrgUnit || subManager,
      userType: user.type,
    };
  }

  async getListUserByUnit(getListUserByUnitsDto: GetListUserByUnitsDto, _: UserRequest) {
    const { page, take, orderBy, order, search, orgUnitIds, status, type, gender } =
      getListUserByUnitsDto;

    const whereItem: FindOptionsWhere<User> = {};

    if (status) whereItem.status = status;
    if (type) whereItem.type = type;
    if (gender) whereItem.gender = gender;

    let where: FindOptionsWhere<User>[] = [whereItem];

    if (orgUnitIds && Array.isArray(orgUnitIds) && orgUnitIds.length > 0)
      where = [
        ...where,
        {
          userOrgUnitPositions: {
            orgUnitId: In(orgUnitIds),
          },
        },
      ];
    else
      where = [
        ...where,
        {
          userOrgUnitPositions: {
            orgUnitId: Not(IsNull()),
          },
        },
      ];

    if (search)
      where = this.queryService.search({
        arrayPropertyLike: ['name', 'email', 'phone', 'code'],
        search,
        whereItem,
      });

    const [list, total] = await this.userRepo.findAndCount({
      where,
      ...this.queryService.getPagination({ page, take }),
      order: { [orderBy]: order },
      relations: { userOrgUnitPositions: true, userNotifications: true },
      select: {
        userOrgUnitPositions: {
          id: true,
          orgUnitId: true,
        },
        userNotifications: {
          id: true,
          userMovementId: true,
        },
      },
    });

    return { list, total };
  }

  async getUser(idOrCode: string) {
    const where = isUUID(idOrCode) ? { id: idOrCode } : { code: idOrCode };

    const user = await this.userRepo.findOne({
      relations: {
        managedOrgUnits: true,
        userOrgUnitPositions: { position: true, orgUnit: { manager: true } },
        subManagers: { orgUnit: true },
      },
      where,
      select: {
        managedOrgUnits: {
          id: true,
          name: true,
          type: true,
        },
        userOrgUnitPositions: {
          id: true,
          positionType: true,
          position: {
            id: true,
            name: true,
            type: true,
            parentId: true,
          },
          orgUnit: {
            id: true,
            name: true,
            type: true,
            managerId: true,
            manager: {
              id: true,
              name: true,
            },
          },
        },
        subManagers: {
          id: true,
          userId: true,
          orgUnitId: true,
          orgUnitParentId: true,
          status: true,
          orgUnit: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Tài khoản không tồn tại!');

    delete user.password;

    let numberPermission = 4;

    if (user.userOrgUnitPositions && user.userOrgUnitPositions.length > 0) {
      for (const userOrg of user.userOrgUnitPositions) {
        if (userOrg.position?.parentId === null) {
          numberPermission = 1;
          break;
        }

        if (userOrg.orgUnit?.managerId === user.id) {
          // TP
          if (userOrg.orgUnit.type === OrgUnitType.DIVISION) {
            // GĐK
            numberPermission = 2;
          } else if (userOrg.orgUnit.type === OrgUnitType.DEPARTMENT) {
            numberPermission = 3;
          }
        }
      }
    }

    user['numberPermission'] = numberPermission;

    if (numberPermission === 3 && user.managedOrgUnits && user.managedOrgUnits.length > 0) {
      const managedOrgUnitsArr = Array.isArray(user.managedOrgUnits)
        ? [...user.managedOrgUnits]
        : [];
      user.managedOrgUnits = await Promise.all(
        managedOrgUnitsArr.map(async (orgUnit) => {
          if (Number(orgUnit.type) > Number(OrgUnitType.DIVISION)) {
            return {
              ...orgUnit,
              divisionId: await this.getOrgUnitIdByType(OrgUnitType.DIVISION, orgUnit.id),
            };
          }
          return { ...orgUnit };
        }),
      );
    }

    return {
      ...user,
      subManagers:
        user.subManagers && user.subManagers.length > 0
          ? user.subManagers.filter((sub) => sub.status === SubManagerStatus.ACTIVE)
          : [],
    };
  }

  async getOrgUnitIdByType(type: OrgUnitType, orgUnitId: string): Promise<string | null> {
    let current = await this.orgUnitRepo.findOne({ where: { id: orgUnitId } });
    while (current) {
      if (current.type === type) return current.id;
      if (!current.parentId) break;
      current = await this.orgUnitRepo.findOne({ where: { id: current.parentId } });
    }
    return null;
  }

  async getUserByRoot(id: string) {
    let user = await this.userRepo.findOne({ where: { id } });

    let userOrgUnitPositions = await this.userOrgUnitPositionRepo.find({
      where: { orgUnit: { parentId: IsNull() }, position: { parentId: IsNull() } },
      relations: ['orgUnit', 'position'],
      select: {
        id: true,
        position: {
          id: true,
          name: true,
          parentId: true,
        },
        orgUnit: {
          id: true,
          name: true,
          type: true,
          managerId: true,
        },
      },
    });

    if (userOrgUnitPositions.length > 0)
      userOrgUnitPositions = userOrgUnitPositions.filter(
        (item) => item.orgUnit !== null && item.position !== null,
      );

    user.managedOrgUnits = userOrgUnitPositions.map((item) => ({
      id: item.orgUnit.id,
      name: item.orgUnit.name,
    })) as OrgUnit[];

    user.userOrgUnitPositions = userOrgUnitPositions;

    return user;
  }

  async getUserByType(user: User) {
    switch (user.type) {
      case UserType.ROOT:
        return this.getUserByRoot(user.id);
      default:
        return this.getUser(user.id);
    }
  }

  async getUserMovementHistory(id: string, _: UserRequest) {
    const user = await this.userRepo.findOne({
      where: { id },
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    if (!user) throw new NotFoundException(`Người dùng không tồn tại!`);

    const userMovements = await this.userMovementRepo.find({
      where: [
        { userId: user.id, status: UserMovementStatus.EFFECTIVE },
        { userId: user.id, status: UserMovementStatus.REJECTED },
        { userId: user.id, status: UserMovementStatus.CANCELLED },
      ],
      relations: { createdBy: { userOrgUnitPositions: { position: true } } },
      select: {
        id: true,
        dateAppointment: true,
        createdAt: true,
        type: true,
        oldValue: true,
        newValue: true,
        reason: true,
        orgUnitId: true,
        status: true,
        reasonReject: true,
        rejectionReason: true,
        createdBy: {
          id: true,
          name: true,
          url: true,
          userOrgUnitPositions: {
            id: true,
            orgUnitId: true,
            position: {
              id: true,
              name: true,
            },
          },
        },
      },
      order: {
        dateAppointment: 'DESC',
      },
    });

    if (!userMovements.length) return { ...user, userMovements: [] };

    // Lọc lại position của createdBy theo orgUnitId cùng cây với orgUnitId của userMovement
    for (const userMovement of userMovements) {
      const movementOrgUnitId = userMovement.orgUnitId;
      const createdBy = userMovement.createdBy;
      if (createdBy && Array.isArray(createdBy.userOrgUnitPositions)) {
        // Tạo mảng promise kiểm tra cùng cây
        const checks = await Promise.all(
          createdBy.userOrgUnitPositions.map((pos) =>
            this.orgUnitService.isSameOrgUnitTree(pos.orgUnitId, movementOrgUnitId),
          ),
        );
        // Lọc lại theo kết quả
        createdBy.userOrgUnitPositions = createdBy.userOrgUnitPositions.filter(
          (_, idx) => checks[idx],
        );
      }
    }

    user.userMovements = userMovements;

    return user;
  }

  async getNearestManagersByUserRequest(user: UserRequest) {
    if (!user.orgUnitId) {
      throw new BadRequestException('User does not have orgUnitId');
    }

    const currentOrgUnit = await this.orgUnitRepo.findOne({
      where: { id: user.orgUnitId },
      relations: ['manager'],
    });
    if (!currentOrgUnit) {
      throw new NotFoundException('OrgUnit not found');
    }
    const ancestorTree = await this.orgUnitRepo.findAncestorsTree(currentOrgUnit, {
      relations: ['manager', 'parent'],
    });

    function collectAncestors(node, arr = []) {
      if (!node) return arr;

      if (node.manager && node.manager.id !== user.id) arr.push(node);

      if (node.parent) {
        collectAncestors(node.parent, arr);
      }
      return arr;
    }
    const ancestors = collectAncestors(ancestorTree, []);

    const managersWithOrgUnits = ancestors
      .filter((ancestor) => ancestor.manager)
      .map((ancestor, idx) => ({
        orgUnit: ancestor,
        manager: ancestor.manager,
        level: idx,
      }));

    const nearestManagers = managersWithOrgUnits.slice(0, 2);

    return nearestManagers.map((item) => ({
      id: item.manager.id,
      name: item.manager.name,
      email: item.manager.email,
      orgUnitId: item.orgUnit.id,
      orgUnitName: item.orgUnit.name,
      level: item.level,
    }));
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

  /**
   * Lấy 2 manager gần nhất cho mỗi orgUnit của từng user trong danh sách,
   * không lọc theo cây của UserRequest nữa
   * @param userIds: string[] - danh sách userId cần lấy
   * @returns Array<{ userId, managers: { [orgUnit_{orgUnitId}]: [ ...2 manager info... ] } }>
   */
  async getNearestManagersForUsers(userIds: string[]) {
    // Lấy tất cả UserOrgUnitPosition của các user
    const allUserOrgUnitPositions = await this.userOrgUnitPositionRepo.find({
      where: { userId: In(userIds) },
      relations: ['orgUnit', 'orgUnit.manager', 'position'],
      select: {
        orgUnit: {
          id: true,
          name: true,
          type: true,
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
    });

    // Gom theo userId
    const result = [];
    for (const userId of userIds) {
      // Lấy các vị trí của user này
      const positions = allUserOrgUnitPositions.filter((pos) => pos.userId === userId);
      const managersByOrgUnit: Record<string, any> = {};
      for (const pos of positions) {
        // Lấy ancestor tree cho orgUnit này
        const ancestorTree = await this.orgUnitRepo.findAncestorsTree(pos.orgUnit, {
          relations: ['manager', 'parent'],
        });
        // Đệ quy gom ancestor từ node hiện tại lên root
        try {
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
          const nearestManagers = managersWithOrgUnits.map((item) => ({
            orgUnitId: item.orgUnit.id,
            orgUnitName: item.orgUnit.name,
            managerId: item.manager.id,
            managerName: item.manager.name,
            managerEmail: item.manager.email,
            url: item.manager.url,
            level: item.level,
            type: item.orgUnit.type,
          }));
          managersByOrgUnit[`orgUnit_${pos.orgUnitId}`] = {
            orgUnitName: pos.orgUnit?.name,
            positionName: pos.position?.name,
            nearestManagers: nearestManagers?.sort((a, b) => b.type - a.type),
          };
        } catch (error) {
          console.log(error);
        }
      }
      result.push({ userId, managers: managersByOrgUnit });
    }
    return result;
  }

  async getListUserUnitPosition(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId }, select: ['id', 'code'] });

    if (!user) throw new NotFoundException('User not found');

    let userOrgUnitPositions = await this.userOrgUnitPositionRepo.find({
      where: { userId },
      relations: [
        'orgUnit',
        'position',
        'orgUnit.subManagersParent',
        'orgUnit.subManagersParent.orgUnit',
      ],
      select: {
        id: true,
        orgUnit: {
          id: true,
          name: true,
          subManagersParent: {
            id: true,
            orgUnitId: true,
            userId: true,
            status: true,
            orgUnit: {
              id: true,
              name: true,
            },
          },
        },
        position: { id: true, name: true },
      },
    });

    userOrgUnitPositions = userOrgUnitPositions.map((e) => {
      if (e.orgUnit.subManagersParent) {
        e.orgUnit.subManagersParent = e.orgUnit.subManagersParent.filter(
          (s) => s.userId === userId && s.status === SubManagerStatus.ACTIVE,
        );
      }
      return e;
    });

    // Dùng Promise.all để lấy ancestors song song
    const result = await Promise.all(
      userOrgUnitPositions.map(async (userOrgUnitPosition) => {
        const ancestors = await this.orgUnitRepo.findAncestors(userOrgUnitPosition.orgUnit);
        return {
          id: userOrgUnitPosition.id,
          position: userOrgUnitPosition.position,
          orgUnit: userOrgUnitPosition.orgUnit,
          orgUnits: ancestors,
        };
      }),
    );

    return { user, userOrgUnitPositions: result };
  }

  async getAssignedHrForUser(user: UserRequest) {
    const isAdminOrRoot = [UserType.ADMIN, UserType.ROOT].includes(user.type);

    const listHr = await this.userRepo.find({
      where: { type: UserType.HR },
      select: ['id', 'name'],
    });

    const children = await this.positionRepo
      .createQueryBuilder('p')
      .innerJoin('position_closure', 'pc', 'pc.id_descendant = p.id')
      .where('pc.id_ancestor = :id', { id: user.positionId })
      .getMany();

    const listPosition = children.map((child) => child.id);

    const result = await this.userRepo
      .createQueryBuilder('user')
      .select(['user.id', 'user.name'])
      .where((qb) => {
        const subQuery = qb.subQuery().select('uop.userId').from('user_org_unit_position', 'uop');

        if (!isAdminOrRoot) {
          subQuery
            .where('uop.userId IN (:...hrIds)', { hrIds: listHr.map((hr) => hr.id) })
            .andWhere('uop.positionId IN (:...positionIds)', { positionIds: listPosition });
        } else {
          subQuery.where('uop.userId IN (:...hrIds)', { hrIds: listHr.map((hr) => hr.id) });
        }

        return 'user.id IN ' + subQuery.getQuery();
      })
      .setParameters({
        hrIds: listHr.map((hr) => hr.id),
        positionIds: listPosition,
      })
      .getMany();

    return result;
  }

  async getUserHistory(id: string, _: UserRequest) {
    const userHistories = await this.userTrackingRepo.find({
      relations: ['createdBy'],
      where: [
        { userId: id, type: UserTrackingType.USER_UPDATE },
        { userId: id, type: UserTrackingType.USER_CREATE },
      ],
      order: { updatedAt: 'DESC' },
      select: {
        id: true,
        updatedAt: true,
        oldValue: true,
        newValue: true,
        createdBy: { id: true, code: true, name: true, url: true },
        type: true,
      },
    });

    const list = [];

    for (const item of userHistories) {
      const oldValue = item.oldValue as User;
      const newValue = item.newValue as User;

      let listItem = {
        userHistory: {
          id: item.id,
          type: item.type,
          updatedAt: item.updatedAt,
          createdBy: item.createdBy,
        },
        changes: [],
      };

      // So sánh tất cả columns và tìm ra những thay đổi
      const columnChanges = this.userHandle.compareUserColumns(oldValue, newValue);

      if (Object.keys(columnChanges).length > 0) listItem.changes = columnChanges;

      if (newValue.userOrgUnitPositions?.length)
        listItem.changes.push({
          field: 'userOrgUnitPositions',
          old: oldValue.userOrgUnitPositions,
          new: newValue.userOrgUnitPositions,
        });

      if (newValue.subManagers?.length)
        listItem.changes.push({
          field: 'subManagers',
          old: oldValue.subManagers,
          new: newValue.subManagers,
        });

      list.push(listItem);
    }

    // map thêm lable cho field
    const labelMap = {
      code: 'Mã nhân sự',
      name: 'Tên nhân sự',
      email: 'Email',
      phone: 'Số điện thoại',
      cccd: 'CCCD',
      birthday: 'Ngày sinh',
      url: 'Ảnh đại diện',
      address: 'Địa chỉ',
      tempAddress: 'Địa chỉ thường trú',
      officialStatus: 'Tình trạng chính thức',
      gender: 'Giới tính',
      type: 'Loại nhân sự',
      status: 'Trạng thái',
      password: 'Mật khẩu',
      dateOnboard: 'Ngày vào làm',
      userOrgUnitPositions: 'Vị trí công việc',
      subManagers: 'Đơn vị quản lý',
    };

    list.forEach((item) => {
      item.changes.forEach((change) => {
        change.field = labelMap[change.field] || change.field;
      });
    });

    return list;
  }

  // check user là ngừoi duyệt đề xuất có còn đề xuất chưa duyệt không
  async checkUserHasPendingMovement(userId: string) {
    const userMovementApproved = await this.userMovementApproverRepo.find({
      where: {
        approverId: userId,
        status: UserMovementStatus.PENDING,
        approveType: UserMovementApproveType.APPROVE,
        userMovement: { status: UserMovementStatus.PENDING },
      },
      relations: ['userMovement', 'userMovement.user'],
      select: {
        id: true,
        userMovement: {
          id: true,
          user: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (userMovementApproved.length) {
      const approveName = userMovementApproved.map((e) => e.userMovement.user.name).join(', ');
      throw new ForbiddenException(`Tài khoản còn đề xuất của ${approveName} đang chờ duyệt!`);
    }

    return true;
  }

  // ... existing code ...
  async exportUser(getListUserExportExcelDto: GetListUserExportExcelDto, _: UserRequest) {
    const { fromDate, toDate, listColumn } = getListUserExportExcelDto;
    let dateWhere: FindOptionsWhere<User>[] = [];

    if (fromDate || toDate) {
      const startBetween =
        fromDate || toDate
          ? Between(
              fromDate ? new Date(fromDate) : new Date(MIN_DATE),
              toDate ? new Date(toDate) : new Date(MAX_DATE),
            )
          : undefined;
      const endBetween =
        fromDate || toDate
          ? Between(
              fromDate ? new Date(fromDate) : new Date(MIN_DATE),
              toDate ? new Date(toDate) : new Date(MAX_DATE),
            )
          : undefined;
      dateWhere = [
        { type: Not(UserType.ROOT), dateOnboard: startBetween },
        { type: Not(UserType.ROOT), dateOnboard: endBetween },
      ];
    } else {
      dateWhere = [{ type: Not(UserType.ROOT) }];
    }

    let users = await this.userRepo.find({
      where: dateWhere,
      relations: [
        'userOrgUnitPositions',
        'userOrgUnitPositions.orgUnit',
        'userOrgUnitPositions.position',
      ],
      select: {
        code: true,
        name: true,
        cccd: true,
        email: true,
        phone: true,
        birthday: true,
        dateOnboard: true,
        address: true,
        tempAddress: true,
        gender: true,
        officialStatus: true,
        userOrgUnitPositions: {
          id: true,
          positionType: true,
          orgUnit: {
            id: true,
            name: true,
          },
          position: {
            id: true,
            name: true,
            level: true,
          },
        },
      },
      order: { userOrgUnitPositions: { position: { level: 'ASC', name: 'ASC' } }, name: 'ASC' },
    });

    const usersLast = users.filter((user) => user.userOrgUnitPositions.length === 0);
    users = users.filter((user) => user.userOrgUnitPositions.length > 0);

    users = [...users, ...usersLast];

    // Xử lý dữ liệu để phù hợp với Excel

    let processedUsers = [];
    for (const user of users) {
      let orgUnit = user.userOrgUnitPositions.length ? user.userOrgUnitPositions[0].orgUnit : null;

      const orgUnits = orgUnit ? await this.orgUnitRepo.findAncestors(orgUnit) : [];

      processedUsers.push({
        code: user.code || '',
        name: user.name || '',
        cccd: user.cccd || '',
        email: user.email || '',
        phone: user.phone || '',
        birthday: user.birthday ? new Date(user.birthday).toLocaleDateString('vi-VN') : '',
        dateOnboard: user.dateOnboard ? new Date(user.dateOnboard).toLocaleDateString('vi-VN') : '',
        address: user.address || '',
        tempAddress: user.tempAddress || '',
        position: user.userOrgUnitPositions.length
          ? user.userOrgUnitPositions?.find((uop) => uop?.positionType === UserPositionType.MAIN)
              ?.position.name
          : '',
        officialStatus: user.officialStatus || '',
        gender: user.gender || '',
        // Xử lý orgUnit và position (có thể có nhiều)
        // director: orgUnits.find((org) => org.type === OrgUnitType.BOARD_OF_DIRECTORS)?.name || '',
        division: orgUnits.find((org) => org.type === OrgUnitType.DIVISION)?.name || '',
        department: orgUnits.find((org) => org.type === OrgUnitType.DEPARTMENT)?.name || '',
        part: orgUnits.find((org) => org.type === OrgUnitType.PART)?.name || '',
        team: orgUnits.find((org) => org.type === OrgUnitType.TEAM)?.name || '',
      });
    }

    // Tạo Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');

    // Định nghĩa columns
    worksheet.columns = [];

    // Định nghĩa mapping cho các columns
    const columnMappings = {
      [UserExportExcelColumn.CODE]: { header: 'MSNV', key: 'code', width: 15 },
      [UserExportExcelColumn.NAME]: { header: 'Tên nhân viên', key: 'name', width: 25 },
      [UserExportExcelColumn.CCCD]: { header: 'CCCD', key: 'cccd', width: 25 },
      [UserExportExcelColumn.EMAIL]: { header: 'Email', key: 'email', width: 30 },
      [UserExportExcelColumn.PHONE]: { header: 'Số điện thoại', key: 'phone', width: 15 },
      [UserExportExcelColumn.BIRTHDAY]: { header: 'Ngày sinh', key: 'birthday', width: 15 },
      [UserExportExcelColumn.DATE_ONBOARD]: {
        header: 'Ngày nhận việc',
        key: 'dateOnboard',
        width: 15,
      },
      [UserExportExcelColumn.ADDRESS]: { header: 'Địa chỉ tạm trú', key: 'address', width: 40 },
      [UserExportExcelColumn.TEMP_ADDRESS]: {
        header: 'Địa chỉ thường trú',
        key: 'tempAddress',
        width: 40,
      },
      [UserExportExcelColumn.GENDER]: { header: 'Giới tính', key: 'gender', width: 10 },
      [UserExportExcelColumn.POSITION]: { header: 'Chức vụ', key: 'position', width: 20 },
      [UserExportExcelColumn.OFFICIAL_STATUS]: {
        header: 'Tình trạng',
        key: 'officialStatus',
        width: 10,
      },
      // [UserExportExcelColumn.DIRECTOR]: { header: 'Ban giám đốc', key: 'director', width: 15 },
      [UserExportExcelColumn.DIVISION]: { header: 'Khối', key: 'division', width: 30 },
      [UserExportExcelColumn.DEPARTMENT]: { header: 'Phòng ban', key: 'department', width: 30 },
      [UserExportExcelColumn.PART]: { header: 'Bộ phận', key: 'part', width: 30 },
      [UserExportExcelColumn.TEAM]: { header: 'Team', key: 'team', width: 30 },
    };

    // Chỉ thêm các columns được chọn
    worksheet.columns = listColumn
      .filter((column) => columnMappings[column])
      .map((column) => columnMappings[column]);
    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // Thêm dữ liệu
    worksheet.addRows(processedUsers);

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      if (column.width) {
        column.width = Math.max(column.width, 10);
      }
    });

    // Tạo buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Tự động tạo mã user tiếp theo
   * Ví dụ: 00338 -> 00339, 03954 -> 03955
   */
  async generateNextUserCode(): Promise<string> {
    // Lấy user có mã cao nhất
    const lastUser = await this.userRepo
      .createQueryBuilder('user')
      .select('user.code')
      .where('user.code IS NOT NULL AND user.code != ""')
      .orderBy('CAST(user.code AS UNSIGNED)', 'DESC') // Sắp xếp theo giá trị số
      .limit(1)
      .getOne();

    let nextCode: string;

    if (!lastUser || !lastUser.code) {
      // Nếu chưa có user nào hoặc chưa có code, bắt đầu từ 00001
      nextCode = '00001';
    } else {
      // Chuyển code hiện tại thành số, tăng lên 1, rồi format lại
      const currentNumber = parseInt(lastUser.code, 10);
      const nextNumber = currentNumber + 1;

      // Giữ nguyên độ dài của code gốc bằng cách thêm số 0 đầu
      const codeLength = lastUser.code.length;
      nextCode = nextNumber.toString().padStart(codeLength, '0');
    }

    return this.ensureUniqueUserCode(nextCode);
  }

  /**
   * Đảm bảo mã người dùng không trùng lặp
   * Nếu trùng, tăng mã lên 1 và kiểm tra lại đệ quy
   */
  private async ensureUniqueUserCode(code: string): Promise<string> {
    const existUser = await this.userRepo.exists({ where: { code }, withDeleted: true });

    if (existUser) {
      const nextCodeNumber = parseInt(code, 10) + 1;
      const nextCode = nextCodeNumber.toString().padStart(code.length, '0');
      return this.ensureUniqueUserCode(nextCode);
    }

    return code;
  }

  async getListUserRelationAncestorOrgUnit(getListUserOrgUnitDto: GetListUserOrgUnitDto): Promise<{
    list: User[];
    total: number;
  }> {
    const { page, take, orderBy, order, codes, gender, type, status, search, withDeleted } =
      getListUserOrgUnitDto;

    // Tạo cache key dựa trên page và take
    const cacheKey = `${CACHE_KEY.USER_RELATION_ANCESTOR}_${page}_${take}`;

    // Thử lấy dữ liệu từ cache
    if (codes && codes.length === 0 && !gender && !type && !status) {
      const cachedData = await this.cacheService.get(cacheKey);

      if (cachedData) {
        return cachedData as { list: User[]; total: number };
      }
    }

    const whereItem: FindOptionsWhere<User> = {};

    if (codes && codes.length) whereItem.code = In(codes);
    if (gender) whereItem.gender = gender;
    if (type) whereItem.type = type;
    if (status) whereItem.status = status;

    let where: FindOptionsWhere<User>[] = [whereItem];

    if (search)
      where = this.queryService.search({
        arrayPropertyLike: ['name', 'email', 'phone', 'code', 'cccd'],
        search,
        whereItem,
      });

    let [list, total] = await this.userRepo.findAndCount({
      withDeleted,
      where,
      ...this.queryService.getPagination({ page, take }),
      order: { [orderBy]: order },
      relations: {
        userOrgUnitPositions: { orgUnit: true, position: true },
        createdBy: true,
        updatedBy: true,
        deletedBy: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        url: true,
        email: true,
        phone: true,
        cccd: true,
        dateOnboard: true,
        status: true,
        officialStatus: true,
        type: true,
        gender: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
        address: true,
        tempAddress: true,
        birthday: true,
        deletedBy: {
          id: true,
          code: true,
          name: true,
          url: true,
        },
        userOrgUnitPositions: {
          id: true,
          orgUnitId: true,
          positionId: true,
          positionType: true,
          orgUnit: {
            id: true,
            name: true,
          },
          position: {
            id: true,
            name: true,
          },
        },

        createdBy: {
          id: true,
          code: true,
          name: true,
          url: true,
        },
        updatedBy: {
          id: true,
          code: true,
          name: true,
          url: true,
        },
      },
    });

    // Tối ưu: Thu thập tất cả orgUnit IDs duy nhất trước
    const uniqueOrgUnitIds = new Set<string>();
    const orgUnitMap = new Map<string, any>();

    list.forEach((user) => {
      user.userOrgUnitPositions?.forEach((pos) => {
        if (pos.orgUnit?.id) {
          uniqueOrgUnitIds.add(pos.orgUnit.id);
          orgUnitMap.set(pos.orgUnit.id, pos.orgUnit);
        }
      });
    });

    // Tối ưu: Lấy ancestors cho tất cả orgUnits cùng lúc bằng Promise.all
    const ancestorsMap = new Map<string, any[]>();

    const ancestorPromises = Array.from(uniqueOrgUnitIds).map(async (orgUnitId) => {
      try {
        const orgUnit = orgUnitMap.get(orgUnitId);
        if (orgUnit) {
          let ancestors = await this.orgUnitRepo.findAncestors(orgUnit);
          ancestors = ancestors.map((ancestor) => ({
            id: ancestor.id,
            name: ancestor.name,
            type: ancestor.type,
          })) as OrgUnit[];
          return { orgUnitId, ancestors };
        }
        return { orgUnitId, ancestors: [] };
      } catch (error) {
        console.error(`Error fetching ancestors for orgUnit ${orgUnitId}:`, error);
        return { orgUnitId, ancestors: [] };
      }
    });

    const ancestorResults = await Promise.all(ancestorPromises);

    // Xây dựng map từ kết quả
    ancestorResults.forEach(({ orgUnitId, ancestors }) => {
      ancestorsMap.set(orgUnitId, ancestors);
    });

    // Gán ancestors vào từng userOrgUnitPosition
    list.forEach((user) => {
      user.createdBy = user.createdBy?.name as unknown as User;
      user.updatedBy = user.updatedBy?.name as unknown as User;
      user.userOrgUnitPositions?.forEach(
        (userOrgUnitPosition: UserOrgUnitPosition & { orgUnits: OrgUnit[] }) => {
          if (userOrgUnitPosition.orgUnit?.id) {
            userOrgUnitPosition.orgUnits = ancestorsMap.get(userOrgUnitPosition.orgUnit.id) || [];
          } else {
            userOrgUnitPosition.orgUnits = [];
          }
        },
      );
    });

    const result = { total, list };

    // Lưu kết quả vào cache với thời gian hết hạn là 5 phút
    await this.cacheService.set(cacheKey, result, 300);

    return result;
  }

  async checkUserCode(code: string) {
    const user = await this.userRepo.findOne({
      where: { code: code },
      select: ['name'],
    });

    if (!user) throw new NotFoundException('User không tồn tại!');

    return user;
  }

  async getOldestOnboardDate() {
    const oldestOnboardDate = await this.userRepo.findOne({
      where: {
        dateOnboard: Not(IsNull()),
      },
      order: {
        dateOnboard: 'ASC',
      },
    });

    return oldestOnboardDate;
  }

  async restoreUser(id: string, user: UserRequest) {
    const userExist = await this.userRepo.findOne({ where: { id }, withDeleted: true });

    if (!userExist) throw new NotFoundException(`Đơn vị tổ chức không tồn tại`);

    // kiểm tra quá 7 ngày không cho khôi phục
    if (
      userExist.deletedAt &&
      new Date(userExist.deletedAt).getTime() + 7 * 24 * 60 * 60 * 1000 < Date.now()
    )
      throw new BadRequestException('Nhân sự đã bị xóa quá 7 ngày không thể khôi phục!');

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.restore(User, { id });
      })
      .then(async () => {
        // xóa cache
        await this.cacheService.del(CACHE_KEY.USER_RELATION_ANCESTOR);

        this.kafkaService.emitEvent(KafkaTopics.USER_ACTION, {
          key: userExist.code,
          value: {
            type: KafkaActionType.RESTORE,
            data: { id, name: userExist.name, restoredBy: user.id, deletedAt: null },
          },
        });

        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListUserOrgPosition(pageOptionsDto: GetListUserOrgPositionDto) {
    let { page, take, orderBy, order, userPositionType } = pageOptionsDto;

    const whereItem: FindOptionsWhere<UserOrgUnitPosition> = {};
    if (userPositionType) whereItem.positionType = userPositionType;

    let where: FindOptionsWhere<UserOrgUnitPosition>[] = [whereItem];

    const [list, total] = await this.userOrgUnitPositionRepo.findAndCount({
      where,
      ...this.queryService.getPagination({ page, take }),
      order: { [orderBy]: order },
    });

    return { total, list };
  }

  async getListUserRestore(getListUserDto: GetListUserDto, _: UserRequest) {
    const { page, take, orderBy, order, search, type, status, officialStatus } = getListUserDto;

    const whereItem: FindOptionsWhere<User> = { deletedAt: Not(IsNull()) };

    if (type) whereItem.type = type;
    if (status) whereItem.status = status;
    if (officialStatus) whereItem.officialStatus = officialStatus;

    let where: FindOptionsWhere<User>[] = [whereItem];

    if (search)
      where = this.queryService.search({
        arrayPropertyLike: ['name', 'email', 'phone', 'code', 'cccd'],
        search,
        whereItem,
      });

    const [list, total] = await this.userRepo.findAndCount({
      where,
      ...this.queryService.getPagination({ page, take }),
      order: { [orderBy]: order },
      withDeleted: true,
      relations: ['deletedBy'],
      select: {
        id: true,
        name: true,
        code: true,
        email: true,
        phone: true,
        cccd: true,
        gender: true,
        type: true,
        status: true,
        officialStatus: true,
        dateOnboard: true,
        address: true,
        tempAddress: true,
        deletedAt: true,
        updatedAt: true,
        deletedBy: {
          id: true,
          code: true,
          name: true,
          url: true,
        },
      },
    });

    return { total, list };
  }

  async getListUserRestoreDetail(id: string) {
    const user = await this.userRepo.findOne({ where: { id }, withDeleted: true });

    if (!user) throw new NotFoundException(`Nhân sự không tồn tại`);

    return user;
  }

  async deleteUser(id: string, _: UserRequest) {
    const userExist = await this.userRepo.findOne({ where: { id }, withDeleted: true });

    if (!userExist) throw new NotFoundException(`Nhân sự không tồn tại`);

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.delete(User, { id });
      })
      .then(async () => {
        // xóa cache
        await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);
        await this.cacheService.del(CACHE_KEY.POSITION_TREE);
        await this.cacheService.delByPattern(`${CACHE_KEY.USER_RELATION_ANCESTOR}_*`);

        await this.kafkaService.emitEvent(KafkaTopics.USER_ACTION, {
          key: userExist.code,
          value: {
            type: KafkaActionType.DELETE,
            data: { id, ...userExist, deletedAt: new Date() } as User,
          },
        });

        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getOrgUnitPositionsByUserIds(userIds: string[]) {
    return await this.userOrgUnitPositionRepo.find({
      where: { userId: In(userIds) },
      relations: ['orgUnit', 'position'],
      select: {
        id: true,
        userId: true,
        positionType: true,
        position: {
          id: true,
          name: true,
        },
        orgUnit: {
          id: true,
          name: true,
        },
      },
    });
  }
}
