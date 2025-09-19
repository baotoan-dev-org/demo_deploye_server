import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dtos/create-user.dto';
import { UpdateUserDto } from './dtos/update-user.dto';
import { DeepPartial, FindOptionsWhere, In, Repository, TreeRepository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Not, IsNull } from 'typeorm';
import { Position } from '../position/entities/position.entity';
import { OrgUnit } from '../org-unit/entities/org-unit.entity';
import { UserOrgUnitPosition } from './entities/user-unit-position.entity';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { OrgUnitType } from '../org-unit/org-unit.enum';
import { PositionType } from '../position/position.enum';
import { CreateApproversDto, OrgUnitValueDto } from './dtos/movements/create-user-movement';
import { UserMovementStatus, UserMovementType, UserStatus, UserType } from './user.enum';
import {
  UserPermissionInterface,
  UserRelationUpdate,
} from './interfaces/user.permission.interface';
import { CreateUserOrgUnitPositionDto } from './dtos/relations/create-user-relation.dto';
import { UserMovement } from './entities/user-movement.entity';

@Injectable()
export class UserHandle {
  constructor() {}

  errorConflictPhoneCodeEmail(conflict: User, payload: CreateUserDto | UpdateUserDto) {
    const { code, email, phone, cccd } = payload;

    if (conflict) {
      if (conflict.email === email) throw new ConflictException('Email đã được sử dụng!');
      if (conflict.code === code) throw new ConflictException('Mã đã được sử dụng!');
      if (conflict.phone === phone) throw new ConflictException('Số điện thoại đã được sử dụng!');
      if (conflict.cccd === cccd) throw new ConflictException('CCCD đã được sử dụng!');
    }
  }

  errorNotFoundEntityWithId<T>(entity: T | null | undefined, entityName: string, id: string): void {
    if (!entity) {
      throw new NotFoundException(`${entityName} with id ${id} not found`);
    }
  }

  async insertUserRelationData<T extends { id: string }>(options: {
    ids: string[];
    userId: string;
    user: UserRequest;
    status?: string;
    idFieldName: string;
    repository: Repository<T>;
    defaultStatus: string;
    dateAppointment?: Date;
  }) {
    const { ids, userId, user, status, idFieldName, repository, defaultStatus, dateAppointment } =
      options;

    if (ids && ids.length > 0) {
      const count = await repository.count({ where: { id: In(ids) } as FindOptionsWhere<T> });
      if (count !== ids.length)
        throw new BadRequestException('Một hoặc nhiều phần tử không tồn tại!');

      return ids.map((id) => ({
        id: uuidv4(),
        [idFieldName]: id,
        userId,
        createdById: user?.id,
        status: status || defaultStatus,
        dateAppointment: dateAppointment || new Date(),
      }));
    }
    return [];
  }

  async buildUserRelationInsert<T extends { id: string }>(options: {
    items;
    userId: string;
    user: UserRequest;
    key: string;
    repository;
  }) {
    const { items, userId, user, key, repository } = options;

    if (!items || items.length === 0) return [];

    const ids = items?.map((e) => e[key]) || [];

    const count = await repository.count({ where: { id: In(ids) } as FindOptionsWhere<T> });
    if (count !== ids.length) {
      throw new BadRequestException(`Một hoặc nhiều ${key} không tồn tại!`);
    }
    return items.map((e) => ({
      id: uuidv4(),
      [key]: e[key],
      userId,
      createdById: user?.id,
      dateAppointment: e.dateAppointment || new Date(),
    }));
  }

  async buildUserRelationUpdate<T extends { id: string }>(options: {
    items;
    userId: string;
    user: UserRequest;
    key: string;
    repository: Repository<any>;
    relationRepo: Repository<any>;
  }): Promise<UserRelationUpdate> {
    const { items, userId, user, key, repository } = options;

    if (!items || items.length === 0) return { entity: [], ids: [] };

    const ids = items?.map((e) => e[key]) || [];
    const count = await repository.count({ where: { id: In(ids) } as FindOptionsWhere<T> });
    if (count !== ids.length) {
      throw new BadRequestException(`Một hoặc nhiều ${key} không tồn tại!`);
    }

    const entity = items.map((e) => ({
      id: e.id || uuidv4(), // lấy id cũ nếu có, không thì sinh mới
      [key]: e[key],
      userId,
      createdById: user?.id,
      dateAppointment: e.dateAppointment || new Date(),
    }));

    return { entity, ids };
  }

  async validateUserOrgUnitPositions(
    userOrgUnitPositions: CreateUserOrgUnitPositionDto[],
    id = null,
    positionRepository: Repository<Position>,
    orgUnitRepository: Repository<OrgUnit>,
    userOrgUnitPositionRepository: Repository<UserOrgUnitPosition>,
    userMovementRepository: Repository<UserMovement>,
    status: UserStatus,
  ) {
    const seen = new Set<string>();
    const userOrgPositionInsert: DeepPartial<UserOrgUnitPosition>[] = [];
    let userOrgPositionDelete = [];
    let managerOrgUnit: string[] = [];

    // Lấy danh sách các quan hệ hiện tại của user (nếu đang update)
    const existingRelations = id
      ? await userOrgUnitPositionRepository.find({
          where: { userId: id },
          select: ['positionId', 'orgUnitId'],
        })
      : [];

    // Tạo Set các quan hệ mới để so sánh
    const newRelationsSet = new Set(
      userOrgUnitPositions.map(({ positionId, orgUnitId }) => `${positionId}-${orgUnitId}`),
    );

    // Xác định các quan hệ cần xóa (có trong DB nhưng không có trong request mới)
    if (id && existingRelations.length > 0) {
      userOrgPositionDelete = existingRelations
        .filter(({ positionId, orgUnitId }) => !newRelationsSet.has(`${positionId}-${orgUnitId}`))
        .map(({ positionId, orgUnitId }) => ({ positionId, orgUnitId, userId: id }));
    }

    const validations = userOrgUnitPositions.map(({ positionId, orgUnitId, positionType }) =>
      (async () => {
        const key = `${positionId}-${orgUnitId}`;

        if (seen.has(key)) throw new BadRequestException(`Chức vụ bị trùng lặp`);

        seen.add(key);

        const [
          positionExists,
          orgUnitExists,
          conflictUserPosition,
          conflictUserOrgUnitPosition,
          conflictUserMovement,
        ] = await Promise.all([
          positionRepository.findOne({
            where: { id: positionId },
            select: ['id', 'type', 'name'],
          }),

          orgUnitRepository.findOne({
            where: { id: orgUnitId },
            relations: ['manager'],
            select: {
              id: true,
              name: true,
              managerId: true,
              type: true,
              manager: {
                name: true,
              },
            },
          }),

          // validate position root alow one user
          userOrgUnitPositionRepository.findOne({
            relations: ['position'],
            where: {
              positionId,
              userId: id ? Not(id) : Not(IsNull()),
              position: { parentId: IsNull() },
            },
            select: { id: true, position: { name: true } },
          }),

          userOrgUnitPositionRepository.findOne({
            relations: ['user'],
            where: { positionId, orgUnitId, userId: id ? Not(id) : Not(IsNull()) },
            select: { id: true, user: { name: true } },
          }),

          userMovementRepository.findOne({
            relations: ['user'],
            where: {
              positionId,
              orgUnitId,
              status: Not(
                In([
                  UserMovementStatus.EFFECTIVE,
                  UserMovementStatus.CANCELLED,
                  UserMovementStatus.REJECTED,
                ]),
              ),
            },
            select: { id: true, user: { name: true } },
          }),
        ]);

        // Gọi errorNotFoundEntityWithId nếu không tồn tại
        this.errorNotFoundEntityWithId(positionExists, 'Position', positionId);
        this.errorNotFoundEntityWithId(orgUnitExists, 'OrgUnit', orgUnitId);

        if (conflictUserPosition)
          throw new ConflictException(
            `Chức vụ ${conflictUserPosition.position.name} đã được sử dụng`,
          );

        // Kiểm tra vị trí MANAGER
        if (positionExists.type === PositionType.MANAGER) {
          // Nếu đã có manager khác đang đảm nhiệm
          if (
            orgUnitExists.managerId &&
            orgUnitExists.managerId !== id &&
            status === UserStatus.ACTIVE
          )
            throw new ConflictException(
              `Vị trí ${positionExists.name} cho đơn vị ${orgUnitExists.name} đã có ${orgUnitExists.manager.name} đảm nhiệm`,
            );
          // Nếu chưa có manager, thêm vào danh sách cần cập nhật
          else if (
            !orgUnitExists.managerId &&
            orgUnitExists.type !== OrgUnitType.BOARD_OF_DIRECTORS
          )
            managerOrgUnit.push(orgUnitId);
        }

        // Kiểm tra vị trí ASSISTANT
        if (positionExists.type === PositionType.ASSISTANT && !orgUnitExists.managerId)
          throw new BadRequestException(
            `Vị trí ${positionExists.name} cho đơn vị ${orgUnitExists.name} không có người quản lý`,
          );

        // kiểm tra trợ lý đã có người dùng khác đang đảm nhiệm
        if (conflictUserOrgUnitPosition && positionExists.type === PositionType.ASSISTANT)
          throw new BadRequestException(
            `Vị trí ${positionExists.name} cho đơn vị ${orgUnitExists.name} đã có ${conflictUserOrgUnitPosition.user.name} đảm nhiệm`,
          );

        // kiểm tra chức danh có trùng với đề xuất không
        if (conflictUserMovement)
          throw new BadRequestException(
            `Vị trí ${positionExists.name} cho đơn vị ${orgUnitExists.name} đang được đề xuất cho ${conflictUserMovement.user.name}`,
          );

        // Kiểm tra xem quan hệ này đã tồn tại cho user hiện tại chưa
        const existingForCurrentUser = id
          ? await userOrgUnitPositionRepository.findOne({
              where: { positionId, orgUnitId, userId: id },
            })
          : null;

        // Chỉ thêm vào danh sách insert nếu chưa tồn tại
        if (!existingForCurrentUser)
          userOrgPositionInsert.push({ positionId, userId: id, orgUnitId, positionType });
      })(),
    );

    await Promise.all(validations);

    if (id) return { userOrgPositionInsert, userOrgPositionDelete, managerOrgUnit };

    return { managerOrgUnit };
  }

  findAncestorsOrder(orgUnit: OrgUnit) {
    const ancestors: Array<{
      id: string;
      name: string;
      managerId: string;
      order: number;
      allowedApprove: boolean;
      type: OrgUnitType;
    }> = [];

    // Hàm đệ quy để map ancestors
    const mapAncestorsToSelectFields = async (
      currentOrgUnit: OrgUnit,
      currentOrder: number,
    ): Promise<void> => {
      // Thêm org unit hiện tại vào danh sách

      if (currentOrgUnit.managerId)
        ancestors.push({
          id: currentOrgUnit.id,
          name: currentOrgUnit.name,
          managerId: currentOrgUnit.managerId,
          order: currentOrder,
          allowedApprove: !ancestors.length ? true : false, // Chỉ cho phép phê duyệt ở cấp đầu tiên
          type: currentOrgUnit.type,
        });

      // Nếu có parent, tiếp tục đệ quy (tương tự như children trong hàm gốc)
      if (currentOrgUnit.parent) {
        mapAncestorsToSelectFields(currentOrgUnit.parent, currentOrder + 1);
      }
    };

    // Bắt đầu từ org unit hiện tại
    mapAncestorsToSelectFields(orgUnit, 1);

    return ancestors.sort((a, b) => a.order - b.order);
  }

  findAncestorsApprover(orgUnit: OrgUnit, type: string) {
    const ancestors: Array<{
      id: string;
      name: string;
      url: string;
      order: number;
      transferType: string;
    }> = [];

    if (!orgUnit) return [];

    // Hàm đệ quy để map ancestors
    const mapAncestorsToSelectFields = async (
      currentOrgUnit: OrgUnit,
      currentOrder: number,
    ): Promise<void> => {
      // Thêm org unit hiện tại vào danh sách

      if (currentOrgUnit && currentOrgUnit.managerId && currentOrgUnit.manager)
        ancestors.push({
          id: currentOrgUnit.manager.id,
          name: currentOrgUnit.manager.name,
          url: currentOrgUnit.manager.url,
          order: currentOrder,
          transferType: type,
        });

      // Nếu có parent, tiếp tục đệ quy (tương tự như children trong hàm gốc)
      if (currentOrgUnit.parent) {
        mapAncestorsToSelectFields(currentOrgUnit.parent, currentOrder + 1);
      }
    };

    // Bắt đầu từ org unit hiện tại
    mapAncestorsToSelectFields(orgUnit, 1);

    return ancestors.sort((a, b) => a.order - b.order);
  }

  findOrgUnitInfo(orgUnit: OrgUnitValueDto, ancestorsFlat: OrgUnit[]) {
    return {
      ...orgUnit,
      divisionName: ancestorsFlat.find((e) => e.type === OrgUnitType.DIVISION)?.name,
      departmentName: ancestorsFlat.find((e) => e.type === OrgUnitType.DEPARTMENT)?.name,
      partName: ancestorsFlat.find((e) => e.type === OrgUnitType.PART)?.name,
      teamsName: ancestorsFlat
        .filter((e) => e.type === OrgUnitType.TEAM)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((e) => e.name),
    };
  }

  async getIdsWithDescendants(ids: string[], repository: TreeRepository<any>): Promise<string[]> {
    const entities = await repository.find({ where: { id: In(ids) } });
    const descendants = await Promise.all(
      entities.map(async (e) => {
        const descendants = await repository.findDescendants(e);
        return descendants.map((e) => e.id);
      }),
    );

    return [...new Set([...ids, ...descendants])] as string[];
  }

  handlePermission(query: UserPermissionInterface) {
    const { user, currentOrgUnit, descendantOrgUnitIds, list, managersByUser } = query;

    list.forEach((u: User) => {
      delete u.password;
      // Kiểm tra nếu user có ít nhất 1 vị trí thuộc orgUnit nằm trong descendantOrgUnitIds
      u['permission'] =
        currentOrgUnit?.type === OrgUnitType.BOARD_OF_DIRECTORS
          ? true
          : user.type === UserType.ADMIN
            ? true
            : Array.isArray(u.userOrgUnitPositions) &&
              u.userOrgUnitPositions.some((pos: UserOrgUnitPosition) =>
                descendantOrgUnitIds.includes(pos.orgUnitId),
              );
      // Thêm object managers dạng { orgUnit_{orgUnitId}: [managers] }
      u['managers'] = managersByUser[u.id] || {};
    });
  }

  // Lọc approvers trùng lặp, lấy order lớn nhất cho mỗi approverId
  filterUniqueApprovers(approvers: CreateApproversDto[]) {
    return approvers.reduce(
      (acc, current) => {
        const existing = acc.find((item) => item.approverId === current.approverId);
        if (!existing) {
          acc.push(current);
        } else if (current.order > existing.order) {
          // Thay thế bằng record có order lớn hơn
          const index = acc.findIndex((item) => item.approverId === current.approverId);
          acc[index] = current;
        }
        return acc;
      },
      [] as typeof approvers,
    );
  }

  compareHtmlContentByText(oldHtml: string, newHtml: string): boolean {
    if (!oldHtml && !newHtml) return true;
    if (!oldHtml || !newHtml) return false;

    // Extract text content only (remove HTML tags)
    const extractText = (html: string) => {
      return html
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    return extractText(oldHtml) === extractText(newHtml);
  }

  // Function helper để so sánh tất cả columns
  compareUserColumns(oldValue: User, newValue: User): Array<{ field: string; old: any; new: any }> {
    const changes: Array<{ field: string; old: any; new: any }> = [];

    // Danh sách tất cả columns cần so sánh (bỏ qua relations và các field đặc biệt)
    const columnsToCompare = [
      // Columns từ User entity
      'code',
      'name',
      'email',
      'phone',
      'cccd',
      'birthday',
      'address',
      'tempAddress',
      'officialStatus',
      'url',
      'gender',
      'type',
      'status',
      'password',
      'dateOnboard',
    ];

    for (const column of columnsToCompare) {
      const oldVal = oldValue?.[column];
      const newVal = newValue?.[column];

      // So sánh giá trị, xử lý cả null/undefined
      if (!this.isEqual(oldVal, newVal)) {
        if (column === 'password') {
          changes.push({
            field: column,
            old: '********',
            new: '********',
          });

          continue;
        }

        changes.push({
          field: column,
          old: oldVal,
          new: newVal,
        });
      }
    }

    return changes;
  }

  private isEqual(oldVal: any, newVal: any): boolean {
    // Nếu cả 2 đều null/undefined
    if (oldVal == null && newVal == null) {
      return true;
    }

    // Nếu một trong 2 null/undefined
    if ((oldVal == null) !== (newVal == null)) {
      return false;
    }

    // Xử lý Date objects
    if (oldVal instanceof Date && newVal instanceof Date) {
      return oldVal.getTime() === newVal.getTime();
    }

    // So sánh thường
    return oldVal === newVal;
  }

  handleDateStart(date: string) {
    return new Date(new Date(date).setHours(0, 0, 0, 0));
  }

  handleDateEnd(date: string) {
    return new Date(new Date(date).setHours(23, 59, 59, 999));
  }
}
