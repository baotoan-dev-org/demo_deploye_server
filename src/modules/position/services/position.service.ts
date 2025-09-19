import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  DeepPartial,
  FindOptionsWhere,
  In,
  IsNull,
  Not,
  Raw,
  Repository,
  TreeRepository,
} from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CreatePositionDto } from '../dtos/create-position.dto';
import { GetListPositionDto } from '../dtos/get-list-position.dto';
import { UpdatePositionDto } from '../dtos/update-position.dto';
import { Position } from '../entities/position.entity';
import { PositionHandle, PositionRecord } from '../position.handle';
import { QueryService } from '@/common/services/query.service';
import { PositionStatus, PositionType } from '../position.enum';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { UserMovementType, UserType } from '@/modules/user/user.enum';
import { OrgUnitType } from '@/modules/org-unit/org-unit.enum';
import { GetListPositionUserMovementQueryDto } from '../dtos/get-list-position-user-movement.dto';
import { GetPositionSearchDto } from '../dtos/get-position-search.dto';
import { OrgUnitService } from '@/modules/org-unit/services/org-unit.service';
import { UserOrgUnitPosition } from '@/modules/user/entities/user-unit-position.entity';
import { OrgUnitWithPositionsDto, PositionLiteDto } from '../dtos/org-unit-with-position.dto';
import { CacheService } from '@/common/services/cache.service';
import { CACHE_KEY } from '@/common/consts/cache.const';
import { KafkaActionType, KafkaTopics } from '@/modules/kafka/kafka.enum';
import { KafkaService } from '@/modules/kafka/services/kafka.service';
import * as mammoth from 'mammoth';
import { StringService } from '@/common/services/string.service';

@Injectable()
export class PositionService implements OnModuleInit {
  constructor(
    private dataSource: DataSource,

    private positionHandle: PositionHandle,

    private queryService: QueryService,

    private orgUnitService: OrgUnitService,

    private cacheService: CacheService,

    private kafkaService: KafkaService,

    private stringService: StringService,

    @InjectRepository(Position)
    private positionRepo: TreeRepository<Position>,

    @InjectRepository(UserOrgUnitPosition)
    private userOrgUnitPositionRepo: Repository<UserOrgUnitPosition>,
  ) {}

  // tạo vị trí tổng giám đốc khi khởi tạo module
  async onModuleInit() {
    const name = 'Tổng giám đốc';
    const exists = await this.positionRepo.findOne({ where: { name } });
    if (!exists) {
      const position = this.positionRepo.create({
        id: uuidv4(),
        name,
        status: PositionStatus.ACTIVE,
      }) as Position;
      await this.positionRepo.save(position);
    }
  }

  async createPosition(createPositionDto: CreatePositionDto, user: UserRequest) {
    const { name, parentId } = createPositionDto;

    const [parent, conflictName] = await Promise.all([
      parentId ? this.positionRepo.findOne({ where: { id: parentId } }) : null,
      this.positionRepo.exists({ where: { name } }),
    ]);

    if (parentId) {
      if (!parent) {
        this.positionHandle.errorNotFoundEntityWithId(parent, Position.name, parentId);
      } else if (parent.status === PositionStatus.INACTIVE) {
        throw new BadRequestException(`Không thể gán parent là vị trí ${PositionStatus.INACTIVE}`);
      }
    }

    if (conflictName) throw new BadRequestException(`Tên vị trí "${name}" đã tồn tại!`);

    const positionInsert: DeepPartial<Position> = {
      ...createPositionDto,
      id: uuidv4(),
      createdById: user.id,
      parent: parentId ? parent : null,
      level: parent ? parent.level + 1 : 1,
    };

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.save(Position, positionInsert);

        // xóa cache
        await this.cacheService.del(CACHE_KEY.POSITION_TREE);
        await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);
      })
      .then(() => {
        this.kafkaService.emitEvent(KafkaTopics.POSITION_ACTION, {
          key: positionInsert.id,
          value: {
            type: KafkaActionType.CREATE,
            data: positionInsert,
          },
        });

        return positionInsert;
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async updatePosition(id: string, updatePositionDto: UpdatePositionDto, user: UserRequest) {
    const { name, parentId, status } = updatePositionDto;

    // Kiểm tra trạng thái của node cha nếu có parentId
    let newParent = null;
    if (parentId) {
      newParent = await this.positionRepo.findOne({ where: { id: parentId } });
      if (!newParent) {
        this.positionHandle.errorNotFoundEntityWithId(newParent, Position.name, parentId);
      } else if (newParent.status === PositionStatus.INACTIVE) {
        throw new BadRequestException(`Không thể gán parent là vị trí ${PositionStatus.INACTIVE}`);
      }
    }

    const [existsPosition, conflictName] = await Promise.all([
      this.positionRepo.findOne({
        where: { id },
      }),
      this.positionRepo.findOne({
        where: {
          name: Raw((alias) => `LOWER(${alias}) = LOWER(:name)`, { name }),
          id: Not(id),
        },
      }),
    ]);

    this.positionHandle.errorNotFoundEntityWithId(existsPosition, name, id);

    this.positionHandle.errorConflictName(conflictName, name);

    if (status === PositionStatus.INACTIVE) {
      // get các node con của vị trí hiện tại - trừ chính nó
      const children = (await this.positionRepo.findDescendants(existsPosition)).filter(
        (child) => child.id !== id,
      );

      const uniqueStatus = Array.from(new Set(children.map((child) => child.status)));

      if (
        uniqueStatus.length > 1 ||
        (uniqueStatus.length === 1 && uniqueStatus[0] === PositionStatus.ACTIVE)
      ) {
        throw new BadRequestException(
          `Không thể cập nhật vị trí có các node con với trạng thái ${PositionStatus.ACTIVE}`,
        );
      }
    }

    // Tính level mới nếu thay đổi parent
    let newLevel = existsPosition.level;
    if (parentId !== existsPosition.parentId) newLevel = newParent ? newParent.level + 1 : 1;

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.update(Position, id, {
          ...updatePositionDto,
          updatedById: user.id,
          level: newLevel,
        });

        // Nếu level thay đổi, update level cho tất cả children
        if (newLevel !== existsPosition.level) {
          const levelDifference = newLevel - existsPosition.level;
          const descendants = await this.positionRepo.findDescendants(existsPosition);

          for (const descendant of descendants) {
            await manager.update(Position, descendant.id, {
              level: descendant.level + levelDifference,
            });
          }
        }

        // xóa cache
        await this.cacheService.del(CACHE_KEY.POSITION_TREE);
        await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);
      })
      .then(() => {
        this.kafkaService.emitEvent(KafkaTopics.POSITION_ACTION, {
          key: id,
          value: {
            type: KafkaActionType.UPDATE,
            data: { id, updatedById: user.id, level: newLevel, ...updatePositionDto },
          },
        });

        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async removePosition(id: string, user: UserRequest) {
    const existsPosition = await this.positionRepo.findOne({
      where: { id },
      relations: ['children'],
    });

    this.positionHandle.errorNotFoundEntityWithId(existsPosition, Position.name, id);

    const descendants = existsPosition
      ? await this.positionRepo.findDescendants(existsPosition)
      : [];

    const allIds = descendants.map((d) => d.id);

    return await this.dataSource
      .transaction(async (manager) => {
        if (allIds.length > 0) {
          await manager.update(Position, { id: In(allIds) }, { deletedById: user.id });
          await manager.softDelete(Position, { id: In(allIds) });
          await manager.delete(UserOrgUnitPosition, { positionId: In(allIds) });
        }
      })
      .then(async () => {
        // xóa cache
        await this.cacheService.del(CACHE_KEY.POSITION_TREE);
        await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);

        this.kafkaService.emitEvent(KafkaTopics.POSITION_ACTION, {
          key: id,
          value: {
            type: KafkaActionType.REMOVE,
            data: { id, ...existsPosition, deletedAt: new Date() },
          },
        });

        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListPosition(getListPositionDto: GetListPositionDto) {
    let { page, take, orderBy, order, search, status, withDeleted } = getListPositionDto;

    const whereItem: FindOptionsWhere<Position> = {};
    if (status) whereItem.status = status;

    let where: FindOptionsWhere<Position>[] = [whereItem];

    if (search)
      where = this.queryService.search({
        arrayPropertyLike: ['name'],
        search,
        whereItem,
      });

    const [list, total] = await this.positionRepo.findAndCount({
      withDeleted,
      where,
      ...this.queryService.getPagination({ page, take }),
      order: { [orderBy]: order },
      relations: ['deletedBy'],
      select: {
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

  async getFullTreePosition(getPositionSearchDto: GetPositionSearchDto) {
    const { search } = getPositionSearchDto;

    // Luôn lấy toàn bộ tree
    const fullTree = await this.positionRepo.findTrees();

    if (!search) return fullTree;

    // Filter tree theo từ khóa
    return this.positionHandle.filterTreeBySearch(fullTree, search);
  }

  async getTreePositionNode(getPositionSearchDto: GetPositionSearchDto, user: UserRequest) {
    const { search } = getPositionSearchDto;

    let positionTree = [];

    if (!user.orgUnitId || !user.positionId)
      throw new NotFoundException(`Người dùng không có chức vụ trong đơn vị và phòng ban`);

    if ([UserType.ADMIN, UserType.ROOT, UserType.C_B].includes(user.type))
      positionTree = await this.getTreePositionFull();
    else positionTree = await this.getTreePositionNodeByPosition(user);

    if (search) return this.positionHandle.filterTreeBySearch(positionTree, search);

    return positionTree;
  }

  async getTreePositionNodeByPosition(user: UserRequest) {
    if (!user.orgUnitId || !user.positionId)
      throw new NotFoundException(`Người dùng không có chức vụ trong đơn vị và phòng ban`);

    // Lấy node cha
    const parent = await this.positionRepo.findOne({
      where: { id: user.positionId },
      relations: ['children'],
    });
    if (!parent) throw new BadRequestException('Không tìm thấy đơn vị cha!');

    // Lấy toàn bộ cây con (bao gồm cả parent)
    const tree = await this.positionRepo.findDescendantsTree(parent, {
      relations: ['children'],
    });
    return [tree];
  }

  async getTreePositionFull() {
    const treeOrgUnit = await this.positionRepo.findTrees({
      relations: ['children'],
    });

    return treeOrgUnit;
  }

  async getTreePositionUser(user: UserRequest) {
    const cachedTree = await this.cacheService.get(CACHE_KEY.POSITION_TREE);

    if (cachedTree) return cachedTree;
    Logger.log(`không có cache ${CACHE_KEY.POSITION_TREE}`);

    const [positionDirectors, allOrgUnits, orgUnitsDivision] = await Promise.all([
      this.positionRepo.findTrees({
        relations: [
          'userOrgUnitPositions',
          'userOrgUnitPositions.orgUnit',
          'userOrgUnitPositions.orgUnit.manager',
          'userOrgUnitPositions.user',
        ],
      }),

      this.dataSource
        .getRepository(OrgUnit)
        .createQueryBuilder('orgUnit')
        .leftJoinAndSelect('orgUnit.manager', 'manager')
        .leftJoinAndSelect('manager.userOrgUnitPositions', 'userOrgUnitPositions')
        .leftJoinAndSelect('userOrgUnitPositions.position', 'position')
        .leftJoinAndSelect('orgUnit.children', 'children')
        .leftJoinAndSelect('children.manager', 'childrenManager')
        .orderBy('orgUnit.createdAt', 'ASC')
        .getMany(),

      // lấy tất cả orgUnit type DIVISION
      this.dataSource
        .getRepository(OrgUnit)
        .createQueryBuilder('orgUnit')
        .leftJoinAndSelect('orgUnit.manager', 'manager')
        .leftJoinAndSelect('manager.userOrgUnitPositions', 'userOrgUnitPositions')
        .leftJoinAndSelect('userOrgUnitPositions.position', 'position')
        .leftJoinAndSelect('orgUnit.children', 'children')
        .leftJoinAndSelect('children.manager', 'childrenManager')
        .orderBy('orgUnit.createdAt', 'ASC')
        .where('orgUnit.type = :type', { type: OrgUnitType.DIVISION.toString() })
        // .andWhere('userOrgUnitPositions.id IS NULL')
        .getMany(),
    ]);

    const orgUnitMap = new Map();
    allOrgUnits.forEach((orgUnit) => {
      orgUnitMap.set(orgUnit.id, orgUnit);
    });

    // Lấy parentId gốc của position root
    const rootParentId = positionDirectors[0]?.parentId ?? null;

    const orgUnitMapDivision = new Map();
    orgUnitsDivision.forEach((orgUnit) => {
      orgUnitMapDivision.set(orgUnit.id, orgUnit);
    });

    // processPositionTreeReplace không được lặp lại item khi build tree, 1 item chỉ được xuất hiện 1 lần
    const uniqueOrgUnit = new Set<string>();
    // Đệ quy xử lý, truyền parentId gốc và userId
    const processedTree = this.positionHandle.processPositionTreeReplace(
      positionDirectors,
      orgUnitMap,
      orgUnitMapDivision,
      rootParentId,
      user.id,
      uniqueOrgUnit,
    );

    await this.cacheService.set(CACHE_KEY.POSITION_TREE, processedTree);

    return processedTree;
  }

  async getPositionFlatArray() {
    const positions = await this.positionRepo.findTrees();

    const flatArray: Position[] = [];

    function collect(positions: Position[]) {
      positions.forEach((position) => {
        flatArray.push({ ...position, children: [] });

        if (position.children.length) collect(position.children);
      });
    }

    collect(positions);

    return flatArray;
  }

  async getAllExceptDescendants(childrenId: string) {
    const childrenNode = await this.positionRepo.findOneBy({ id: childrenId });
    if (!childrenNode) throw new NotFoundException('Không tìm thấy vị trí con');

    // Lấy tất cả descendants (bao gồm cả node hiện tại)
    const descendants = await this.positionRepo.findDescendants(childrenNode);
    const descendantIds = descendants.map((d) => d.id);

    // Lấy tất cả node
    const allNodes = await this.positionRepo.find();

    // Lọc ra các node không nằm trong descendants
    const result = allNodes.filter((node) => !descendantIds.includes(node.id));

    return result.sort((a, b) => a.level - b.level);
  }

  async getPositionPathToChildren(childrenId: string, search: string) {
    const childrenNode = await this.positionRepo.findOneBy({ id: childrenId });

    if (!childrenNode) throw new NotFoundException('Không tìm thấy vị trí con');

    // Lấy đường dẫn từ root đến children node (ancestors)
    // const ancestors = await this.positionRepo.findAncestors(childrenNode);
    // lấy ancestors từ root đến children node đệ quy bằng function
    const getAncestors = async (node: Position) => {
      const ancestors = [];
      while (node.parentId) {
        node = await this.positionRepo.findOneBy({ id: node.parentId });
        ancestors.push(node);
      }
      return ancestors;
    };

    const ancestors = await getAncestors(childrenNode);

    // const ancestorsWithoutDirector = ancestors.filter((e) => e.type !== PositionType.DIRECTOR);

    // Trả về tree từ cha xuống con
    const tree = this.positionHandle.buildPathTreeManyRoots(ancestors);

    if (search) return this.positionHandle.filterTreeBySearch(tree, search);

    return tree;
  }

  async getListPositionDescendants(positionId: string, search: string) {
    const position = await this.positionRepo.findOneBy({ id: positionId });

    if (!position) throw new NotFoundException('Không tìm thấy vị trí');

    const descendants = await this.positionRepo.findDescendantsTree(position);

    if (search) return this.positionHandle.filterTreeBySearch([descendants], search);

    return [descendants];
  }

  async getListPositionWithoutRoot(search: string): Promise<Position[]> {
    const positionWithoutDirector = await this.positionRepo.find({
      where: { type: Not(PositionType.DIRECTOR) },
    });

    const tree = this.positionHandle.buildPathTreeManyRoots(positionWithoutDirector);

    if (search) return this.positionHandle.filterTreeBySearch(tree, search);

    return tree;
  }

  async getListPositionUserMovement(query: GetListPositionUserMovementQueryDto) {
    const { positionId, type, search } = query;

    if (type === UserMovementType.APPOINTMENT)
      return await this.getPositionPathToChildren(positionId, search);
    else if (type === UserMovementType.DEMOTION)
      return await this.getListPositionDescendants(positionId, search);
    else return await this.getListPositionWithoutRoot(search);
  }

  async getListChildrenPosition(id: string) {
    const node = await this.positionRepo.findOneBy({ id });

    if (!node) this.positionHandle.errorNotFoundEntityWithId(node, Position.name, id);

    const listChildren = await this.dataSource
      .createQueryBuilder()
      .select(['p.id as id', 'p.name as name'])
      .from(Position, 'p')
      .innerJoin('position_closure', 'pc', 'pc.id_descendant = p.id')
      .where('pc.id_ancestor = :id', { id })
      .andWhere('p.deletedAt IS NULL') // nếu có soft delete
      .getRawMany();
    return listChildren;
  }

  async getTreeChildrenPosition(id: string) {
    const node = await this.positionRepo.findOneBy({ id });

    if (!node) this.positionHandle.errorNotFoundEntityWithId(node, Position.name, id);

    const treeRepo = await this.dataSource.getTreeRepository(Position);

    const tree = await treeRepo.findDescendantsTree(node);
    return tree;
  }

  async getBranch(id: string) {
    const node = await this.positionRepo.findOneBy({ id });
    if (!node) this.positionHandle.errorNotFoundEntityWithId(node, Position.name, id);

    const treeRepo = this.dataSource.getTreeRepository(Position);

    // 1. Lấy cây tổ tiên
    const ancestorTree = await treeRepo.findAncestorsTree(node);

    // 2. Lấy cây con
    const descendantTree = await treeRepo.findDescendantsTree(node);

    // 3. Tìm node target trong cây ancestor (node ở tầng sâu nhất)
    function attachDescendants(root: any): boolean {
      if (root.id === node.id) {
        root.children = descendantTree.children || [];
        return true;
      }
      return (root.children || []).some(attachDescendants);
    }

    attachDescendants(ancestorTree);

    return ancestorTree;
  }

  async getPosition(id: string) {
    const position = await this.positionRepo.findOneBy({ id });

    return position ?? this.positionHandle.errorNotFoundPosition(id);
  }

  // function to support job recruitmnet
  async getFlatTreePositionNode(user: UserRequest) {
    if (!user.orgUnitId || !user.positionId)
      throw new NotFoundException(`Người dùng không có chức vụ trong đơn vị và phòng ban`);

    const orgUnits = (await this.orgUnitService.getBranchDepartmentsByUser(
      user,
    )) as OrgUnitWithPositionsDto[];

    for (const unit of orgUnits) {
      const cachedPositions = new Map<OrgUnitType, Position[]>();

      if (
        !unit.managerId ||
        unit.type === OrgUnitType.BOARD_OF_DIRECTORS ||
        unit.type === OrgUnitType.DIVISION
      ) {
        if (!cachedPositions.has(unit.type)) {
          const positions = await this.getListPositionNotSpecified(unit.type);
          cachedPositions.set(unit.type, positions);
        }
        unit.positions = [...(cachedPositions.get(unit.type) ?? [])];
        continue;
      }

      const positionIds = await this.userOrgUnitPositionRepo.find({
        select: ['positionId'],
        where: {
          orgUnitId: unit.id,
          userId: unit.managerId,
        },
      });

      const allPositions: PositionLiteDto[] = [];

      for (const pos of positionIds) {
        const positions = await this.dataSource.query(
          `
          WITH RECURSIVE position_tree AS (
            SELECT id, name
            FROM position
            WHERE id = ?

            UNION ALL

            SELECT p.id, p.name
            FROM position p
            INNER JOIN position_tree pt ON p.parentId = pt.id
          )
          SELECT * FROM position_tree
        `,
          [pos.positionId],
        );

        allPositions.push(...positions);
      }

      const uniquePositions = Array.from(new Map(allPositions.map((p) => [p.id, p])).values());

      unit.positions = uniquePositions;
    }

    return orgUnits;
  }

  async getListPositionNotSpecified(orgUnitType: OrgUnitType) {
    const handlers = {
      [OrgUnitType.BOARD_OF_DIRECTORS]: () =>
        this.positionRepo.find({
          where: {
            name: Raw((alias) => `LOWER(${alias}) LIKE LOWER(:name)`, { name: '%Tổng giám đốc%' }),
          },
          select: ['id', 'name'],
        }),

      [OrgUnitType.DIVISION]: () =>
        this.positionRepo.find({
          where: {
            name: 'Giám đốc khối',
          },
          select: ['id', 'name'],
        }),

      [OrgUnitType.DEPARTMENT]: () =>
        this.dataSource.query(`
          WITH RECURSIVE position_tree AS (
            SELECT id, name
            FROM position
            WHERE name LIKE '%Giám đốc khối%'

            UNION ALL

            SELECT p.id, p.name
            FROM position p
            INNER JOIN position_tree pt ON p.parentId = pt.id
          )
          SELECT * FROM position_tree
          WHERE name NOT LIKE '%Giám đốc khối%';
        `),
    };

    return (await handlers[orgUnitType]?.()) ?? [];
  }

  async getTreePositionSearch(getPositionSearchDto: GetPositionSearchDto) {
    const { search } = getPositionSearchDto;

    // Luôn lấy toàn bộ tree
    const fullTree = await this.positionRepo.findTrees();

    if (fullTree.length === 0) return [];

    // Sắp xếp tree theo name đệ quy
    const sortedTree = this.positionHandle.sortTreeByName(fullTree);

    if (!search) return sortedTree;

    // Filter tree theo từ khóa
    return this.positionHandle.filterTreeBySearch(sortedTree, search);
  }

  async restorePosition(id: string, user: UserRequest) {
    const position = await this.positionRepo.findOne({ where: { id }, withDeleted: true });

    if (!position) throw new NotFoundException(`Vị trí không tồn tại`);

    if (!position.deletedAt) throw new BadRequestException('Vị trí chưa bị xóa!');

    // kiểm tra quá 7 ngày không cho khôi phục
    if (
      position.deletedAt &&
      new Date(position.deletedAt).getTime() + 7 * 24 * 60 * 60 * 1000 < Date.now()
    )
      throw new BadRequestException('Vị trí đã bị xóa quá 7 ngày không thể khôi phục!');

    if (position.parentId) {
      const parent = await this.positionRepo.findOne({ where: { id: position.parentId } });
      if (!parent)
        throw new BadRequestException('Không thể khôi phục vì vị trí cha không tồn tại!');
    }

    // function đệ quy để lấy tất cả các đơn vị con withDeleted
    const getDescendants = async (position: Position, allIds: string[]): Promise<string[]> => {
      const descendants = await this.positionRepo.find({
        where: { parentId: position.id },
        withDeleted: true,
      });

      if (descendants.length > 0) {
        const descendantPromises = descendants.map((d) => getDescendants(d, [...allIds, d.id]));
        const descendantResults = await Promise.all(descendantPromises);
        return descendantResults.flat();
      }

      return allIds;
    };

    const allIds = await getDescendants(position, [position.id]);

    return await this.dataSource
      .transaction(async (manager) => {
        if (allIds.length > 0) await manager.restore(Position, { id: In(allIds) });
      })
      .then(async () => {
        // xóa cache
        await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);

        this.kafkaService.emitEvent(KafkaTopics.POSITION_ACTION, {
          key: position.id,
          value: {
            type: KafkaActionType.RESTORE,
            data: { id, name: position.name, restoredBy: user.id, deletedAt: null },
          },
        });

        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListRestorePosition(getListPositionDto: GetListPositionDto) {
    let { page, take, orderBy, order, search } = getListPositionDto;

    const whereItem: FindOptionsWhere<Position> = {};
    whereItem.deletedAt = Not(IsNull());

    let where: FindOptionsWhere<Position>[] = [whereItem];

    // Lấy tất cả records để filter parent nodes
    const allRecords = await this.positionRepo.find({
      withDeleted: true,
      relations: ['deletedBy'],
      where,
      order: { [orderBy]: order },
      select: {
        deletedBy: {
          id: true,
          code: true,
          name: true,
          url: true,
        },
      },
    });

    // Filter ra parent nodes (nodes không có parent hoặc parent không có trong danh sách)
    let parentList = allRecords.filter((position) => {
      if (!position.parentId) return true;
      return !allRecords.some((item) => item.id === position.parentId);
    });

    if (search)
      parentList = parentList.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase()),
      );

    // Áp dụng phân trang cho parentList
    const total = parentList.length;
    const startIndex = (page - 1) * take;
    const endIndex = startIndex + take;
    const paginatedList = parentList.slice(startIndex, endIndex);

    return {
      total,
      list: paginatedList,
    };
  }

  async getTreeRestorePosition(id: string) {
    const position = await this.positionRepo.findOne({ where: { id }, withDeleted: true });

    if (!position) throw new NotFoundException(`Vị trí không tồn tại`);

    if (!position.deletedAt) throw new BadRequestException('Vị trí chưa bị xóa!');

    // function đệ quy để lấy tất cả các đơn vị con withDeleted
    const positionsMap = new Map<string, Position>();

    const processOrgUnit = async (currentOrgUnit: Position) => {
      if (positionsMap.has(currentOrgUnit.id)) return;

      positionsMap.set(currentOrgUnit.id, currentOrgUnit);

      const descendants = await this.positionRepo.find({
        where: { parentId: currentOrgUnit.id },
        withDeleted: true,
      });

      for (const descendant of descendants) {
        await processOrgUnit(descendant);
      }
    };

    await processOrgUnit(position);

    const positions = Array.from(positionsMap.values());

    const tree = this.positionHandle.buildPathTree(positions);

    return tree;
  }

  async deletePosition(id: string, _: UserRequest) {
    const position = await this.positionRepo.findOne({ where: { id }, withDeleted: true });

    if (!position) throw new NotFoundException(`Vị trí không tồn tại`);

    if (!position.deletedAt) throw new BadRequestException('Vị trí chưa bị xóa!');

    return await this.dataSource.manager
      .transaction(async (manager) => {
        await manager.delete(Position, { id });
      })
      .then(async () => {
        // xóa cache
        await this.cacheService.del(CACHE_KEY.POSITION_TREE);
        await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);

        this.kafkaService.emitEvent(KafkaTopics.POSITION_ACTION, {
          key: id,
          value: {
            type: KafkaActionType.DELETE,
            data: { id, ...position, deletedAt: new Date() },
          },
        });
        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async processBulkWordFile(file: Express.Multer.File) {
    try {
      if (!file) throw new BadRequestException('Không có file');

      const htmlResult = await mammoth.convertToHtml({ buffer: file.buffer });
      const textResult = await mammoth.extractRawText({ buffer: file.buffer });

      // Parse records theo số thứ tự
      const records = this.positionHandle.parseByNumbering(htmlResult.value, textResult.value);

      if (records.length === 0) {
        throw new BadRequestException('Không tìm thấy records nào trong file');
      }

      return await this.bulkUpdateByName(records);
    } catch (error) {
      throw new BadRequestException(`Lỗi đọc file: ${error.message}`);
    }
  }

  private async bulkUpdateByName(records: PositionRecord[]) {
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    return await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < records.length; i++) {
        const record = records[i];

        try {
          // Tìm org unit theo tên (case insensitive)
          const existingOrgUnit = await manager.findOne(Position, {
            where: { name: record.name },
          });

          if (!existingOrgUnit) {
            results.push({
              index: i + 1,
              name: record.name,
              status: 'error',
              error: `Không tìm thấy org unit với tên: ${record.name}`,
            });
            errorCount++;
            continue;
          }

          // Chuẩn bị data để update
          const updateData: any = {};
          if (record.description) updateData.description = record.description;
          if (record.task) updateData.task = record.task; // Thay bằng tên field thực tế
          if (record.authority) updateData.authority = record.authority; // Thay bằng tên field thực tế

          await this.dataSource
            .transaction(async (manager) => {
              await manager.update(Position, { id: existingOrgUnit.id }, updateData);
            })
            .then(async () => {
              results.push({
                index: i + 1,
                id: existingOrgUnit.id,
                name: record.name,
                status: 'success',
                updatedFields: Object.keys(updateData),
              });
              successCount++;
            })
            .catch((err) => {
              results.push({
                index: i + 1,
                name: record.name,
                status: 'skipped',
                error: 'Không có dữ liệu để update',
              });
            });
        } catch (error) {
          results.push({
            index: i + 1,
            name: record.name,
            status: 'error',
            error: error.message,
          });
          errorCount++;
        }
      }

      // await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);

      return {
        totalRecords: records.length,
        successCount,
        errorCount,
        results,
        fileName: '',
        message: `Import completed: ${successCount} success, ${errorCount} errors`,
      };
    });
  }

  async processMultipleFile(files: Express.Multer.File[]) {
    try {
      if (!files || files.length === 0) {
        throw new BadRequestException('Không có file nào được tải lên');
      }

      let results = [];
      const errors = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const decodedOriginalName = this.stringService.decodeFileName(file.originalname);

          // Validate file
          if (!decodedOriginalName) throw new Error(`File thứ ${i + 1}: Tên file không hợp lệ`);

          if (!file.buffer || file.buffer.length === 0)
            throw new Error(`File thứ ${i + 1}: File rỗng`);

          // Process file
          const data: {
            totalRecords: number;
            successCount: number;
            errorCount: number;
            results: any[];
            fileName: string;
            message: string;
          } = await this.processWordFile(file);

          results.push(...data.results);
        } catch (fileError) {
          const decodedOriginalName = this.stringService.decodeFileName(file.originalname);
          const errorMessage = `File "${decodedOriginalName || `thứ ${i + 1}`}": ${fileError.message}`;
          errors.push(errorMessage);

          // Log error for debugging
          console.error(
            `Error processing file ${this.stringService.decodeFileName(file.originalname)}:`,
            fileError,
          );
        }
      }

      // Check if all files failed
      if (errors.length === files.length)
        throw new BadRequestException(`Tất cả ${files.length} file đều lỗi:\n${errors.join('\n')}`);

      // Check if some files failed
      if (errors.length > 0) console.warn(`Xử lý hoàn tất với ${errors.length} file lỗi:`, errors);

      await this.cacheService.del(CACHE_KEY.POSITION_TREE);

      return {
        success: true,
        totalFiles: files.length,
        successCount: results.length,
        errorCount: errors.length,
        results,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      // Log full error for debugging
      console.error('Error in processMultipleFile:', error);

      if (error instanceof BadRequestException) throw error;

      throw new BadRequestException(`Lỗi xử lý file: ${error.message}`);
    }
  }

  async processWordFile(file: Express.Multer.File) {
    const htmlResult = await mammoth.convertToHtml({ buffer: file.buffer });
    const textResult = await mammoth.extractRawText({ buffer: file.buffer });

    const parseFieldsFromRecord = this.positionHandle.parseFieldsFromRecord(
      htmlResult.value,
      textResult.value,
    );

    const decodedOriginalName = this.stringService.decodeFileName(file.originalname);

    return await this.bulkUpdateByName([
      {
        description: parseFieldsFromRecord.description,
        task: parseFieldsFromRecord.task,
        authority: parseFieldsFromRecord.authority,
        name: decodedOriginalName,
      },
    ]);
  }
}
