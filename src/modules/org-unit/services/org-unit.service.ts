import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import {
  DataSource,
  Repository,
  Not,
  DeepPartial,
  TreeRepository,
  IsNull,
  FindOptionsWhere,
  In,
  EntityManager,
  Like,
} from 'typeorm';
import { QueryService } from '@/common/services/query.service';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { OrgUnitHandle, OrgUnitRecord } from '../org-unit.handle';
import { OrgUnit } from '../entities/org-unit.entity';
import { CreateOrgUnitDto } from '../dtos/create-org-unit.dto';
import { UpdateOrgUnitDto } from '../dtos/update-org-unit.dto';
import { BOARD_OF_DIRECTORS_UNIQUE, TypeConflictName } from '../org-unit.constant';
import { v4 as uuidv4 } from 'uuid';
import { GetListOrgUnitDto } from '../dtos/get-list-org-unit.dto';
import { OrgUnitStatus, OrgUnitType } from '../org-unit.enum';
import { UserOrgUnitPosition } from '@/modules/user/entities/user-unit-position.entity';
import { AddUserToOrgUnitDto } from '../dtos/add-user-to-org-unit.dto';
import { Position } from '@/modules/position/entities/position.entity';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { GetUsersByOrgUnitsDto } from '../dtos/get-user-by-org-units.dto';
import { GetTreeOrgUnitDto } from '../dtos/get-tree-org-unit.dto';
import { UserMovementType, UserStatus, UserType } from '@/modules/user/user.enum';
import { GetListOrgUnitByProjectTaskDto } from '../dtos/get-list-org-unit-by-project-task.dto';
import { ProjectTaskAssignee } from '@/modules/project-task/entities/project-task-assignee.entity';
import { GetOrgUnitSearchDto } from '../dtos/get-org-unit-search.dto';
import { OrgUnitDivisionDepartment } from '../entities/org-unit-division-department.entity';
import { PositionType } from '@/modules/position/position.enum';
import { ProjectTaskAssigneeType, ProjectTaskType } from '@/modules/project-task/project-task.enum';
import { CACHE_KEY } from '@/common/consts/cache.const';
import { CacheService } from '@/common/services/cache.service';
import { KafkaActionType, KafkaTopics } from '@/modules/kafka/kafka.enum';
import { KafkaService } from '@/modules/kafka/services/kafka.service';
import * as ExcelJS from 'exceljs';
import * as mammoth from 'mammoth';
import { StringService } from '@/common/services/string.service';
import { ProjectTaskHandle } from '@/modules/project-task/project-task.handle';
import { ProjectTask } from '@/modules/project-task/entities/project-task.entity';
import { SubManager } from '@/modules/user/entities/sub-manager.entity';
import { SocketSystemService } from '@/modules/socket/services/socket-system.service';

@Injectable()
export class OrgUnitService implements OnModuleInit {
  private readonly orgUnitRepository: TreeRepository<OrgUnit>;

  constructor(
    private dataSource: DataSource,

    private orgUnitHandle: OrgUnitHandle,

    private queryService: QueryService,

    private cacheService: CacheService,

    private kafkaService: KafkaService,

    private stringService: StringService,

    private projectTaskHandle: ProjectTaskHandle,

    private socketSystemService: SocketSystemService,

    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Position)
    private positionRepository: Repository<Position>,

    @InjectRepository(UserOrgUnitPosition)
    private userOrgUnitPositionRepository: Repository<UserOrgUnitPosition>,

    @InjectRepository(ProjectTaskAssignee)
    private projectTaskAssigneeRepo: Repository<ProjectTaskAssignee>,

    @InjectRepository(ProjectTask)
    private projectTaskRepo: TreeRepository<ProjectTask>,
  ) {
    this.orgUnitRepository = this.dataSource.getTreeRepository(OrgUnit);
  }

  async upsertOrgUnitDivisionDepartment(manager: EntityManager, orgUnit: OrgUnit, parent: OrgUnit) {
    let divisionId: string = null;
    let departmentId: string = null;
    if (orgUnit.type < OrgUnitType.DIVISION) return;
    if (orgUnit.type === OrgUnitType.DIVISION) {
      divisionId = orgUnit.id;
      departmentId = null;
    } else if (orgUnit.type === OrgUnitType.DEPARTMENT) {
      divisionId = parent?.id || null;
      departmentId = orgUnit.id;
    } else {
      const ancestors = await manager.getTreeRepository(OrgUnit).findAncestors(orgUnit);
      for (const ancestor of ancestors) {
        if (!departmentId && ancestor.type === OrgUnitType.DEPARTMENT) {
          departmentId = ancestor.id;
        }
        if (!divisionId && ancestor.type === OrgUnitType.DIVISION) {
          divisionId = ancestor.id;
        }
        if (departmentId && divisionId) break;
      }
    }
    const existingMapping = await manager.findOne(OrgUnitDivisionDepartment, {
      where: { orgUnitId: orgUnit.id },
    });
    if (!existingMapping) {
      await manager.save(OrgUnitDivisionDepartment, {
        orgUnitId: orgUnit.id,
        divisionId,
        departmentId,
      });
    } else {
      existingMapping.divisionId = divisionId;
      existingMapping.departmentId = departmentId;
      await manager.save(OrgUnitDivisionDepartment, existingMapping);
    }
  }

  async onModuleInit() {
    // Tạo OrgUnit type = BOARD_OF_DIRECTORS, name = 'Tổng giám đốc' nếu chưa có
    const type = OrgUnitType.BOARD_OF_DIRECTORS;
    const name = BOARD_OF_DIRECTORS_UNIQUE.ROOT_NAME;
    const exists = await this.orgUnitRepository.findOne({ where: { type, name } });
    if (!exists) {
      const orgUnit = this.orgUnitRepository.create({
        id: uuidv4(),
        type,
        name,
        description: 'Ban giám đốc',
        totalMember: 0,
      });
      await this.orgUnitRepository.save(orgUnit);
    }
  }

  async getTreeOrgUnit(user: UserRequest) {
    const cachedTree = await this.cacheService.get(CACHE_KEY.ORG_UNIT_TREE);

    if (cachedTree) return cachedTree;
    Logger.log(`không có cache ${CACHE_KEY.ORG_UNIT_TREE}`);

    const [treeOrgUnit, ceoExists, positionAssistant] = await Promise.all([
      this.orgUnitRepository.findTrees({
        relations: ['children', 'manager'],
      }),

      this.userOrgUnitPositionRepository.exists({
        relations: ['orgUnit'],
        where: { userId: user.id, orgUnit: { type: OrgUnitType.BOARD_OF_DIRECTORS } },
      }),

      this.positionRepository.exists({
        where: { id: user.positionId, type: PositionType.ASSISTANT },
      }),
    ]);

    // handle role manager assistant
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
    }

    const tree = this.orgUnitHandle.mapTreeToSelectFields(
      treeOrgUnit,
      user,
      ceoExists,
      managerOrgUnitId,
    );

    await this.cacheService.set(CACHE_KEY.ORG_UNIT_TREE, tree);

    return tree;
  }

  async getTreeOrgUnitSearch(getOrgUnitSearchDto: GetOrgUnitSearchDto) {
    const { search } = getOrgUnitSearchDto;

    // Luôn lấy toàn bộ tree
    const fullTree = await this.orgUnitRepository.findTrees();

    if (fullTree.length === 0) return [];

    if (!search) return fullTree[0].children;

    // Filter tree theo từ khóa
    return this.orgUnitHandle.filterTreeBySearch(fullTree[0].children, search);
  }

  async getTreeOrgUnitNodeByProjectTaskId(projectTaskId: string, user: UserRequest) {
    if (!user.orgUnitId || !user.positionId)
      throw new NotFoundException(`Người dùng không có chức vụ trong đơn vị và phòng ban`);

    const projectTaskAssignees = await this.projectTaskAssigneeRepo.find({
      where: { projectTaskId, orgUnit: Not(IsNull()), unassignedAt: IsNull() },
      select: { orgUnitId: true },
    });
    const assignedOrgUnitIds = projectTaskAssignees.map((a) => a.orgUnitId);
    if (!assignedOrgUnitIds.length) return null;

    const orgUnitTrees = await this.orgUnitRepository.findTrees({
      relations: ['manager', 'children'],
    });

    function flattenTree(nodes) {
      let result = [];
      for (const node of nodes) {
        result.push(node);
        if (Array.isArray(node.children) && node.children.length > 0) {
          result = result.concat(flattenTree(node.children));
        }
      }
      return result;
    }
    const allNodes = flattenTree(orgUnitTrees);
    const subtrees = [];
    for (const id of assignedOrgUnitIds) {
      const node = allNodes.find((n) => n.id === id);
      if (node) subtrees.push(node);
    }
    function isDescendant(node, ancestor) {
      if (!ancestor.children) return false;
      for (const child of ancestor.children) {
        if (child.id === node.id || isDescendant(node, child)) return true;
      }
      return false;
    }
    const filteredSubtrees = subtrees.filter((node, idx) => {
      return !subtrees.some((other, otherIdx) => otherIdx !== idx && isDescendant(node, other));
    });
    if (filteredSubtrees.length === 0) return null;
    if (filteredSubtrees.length === 1) return filteredSubtrees[0];
    return filteredSubtrees;
  }

  async getTreeOrgUnitNode(
    getListOrgUnitByProjectTaskDto: GetListOrgUnitByProjectTaskDto,
    user: UserRequest,
  ) {
    const { projectTaskId, search, type } = getListOrgUnitByProjectTaskDto;
    if (!user.orgUnitId || !user.positionId)
      throw new NotFoundException(`Người dùng không có chức vụ trong đơn vị và phòng ban`);

    let orgUnitTree;
    if (projectTaskId)
      orgUnitTree = await this.getTreeOrgUnitNodeByProjectTaskId(projectTaskId, user);
    else if (user.type === UserType.ADMIN || (type && type === ProjectTaskType.PROJECT))
      orgUnitTree = await this.getTreeOrgUnitNodeFull();
    else orgUnitTree = await this.getTreeOrgUnitNodeByOrigin(user);

    return search ? this.orgUnitHandle.filterTreeBySearch(orgUnitTree, search) : orgUnitTree;
  }

  async getTreeOrgUnitNodeByOrigin(user: UserRequest) {
    if (!user.orgUnitId || !user.positionId)
      throw new NotFoundException(`Người dùng không có chức vụ trong đơn vị và phòng ban`);

    // Lấy node cha
    const parent = await this.orgUnitRepository.findOne({
      where: { id: user.orgUnitId },
      relations: ['children', 'children.manager'],
    });
    if (!parent) throw new BadRequestException('Không tìm thấy đơn vị cha!');

    // Lấy toàn bộ cây con (bao gồm cả parent)
    const tree = await this.orgUnitRepository.findDescendantsTree(parent, {
      relations: ['manager', 'children'],
    });
    return [tree];
  }

  async getTreeOrgUnitNodeFull() {
    const treeOrgUnit = await this.orgUnitRepository.findTrees({
      relations: ['children', 'manager'],
    });

    return treeOrgUnit;
  }

  async getTreeAppointment(orgUnitId: string, user: UserRequest) {
    if (!user.orgUnitId) throw new NotFoundException(`Người dùng không có đơn vị gốc`);

    // Lấy node hiện tại
    const current = await this.orgUnitRepository.findOne({ where: { id: orgUnitId } });
    if (!current) throw new NotFoundException('Không tìm thấy đơn vị bắt đầu!');

    // Lấy ancestor tree từ node truyền vào lên đến root (mỗi node chỉ có parent)
    const ancestorsTree = await this.orgUnitRepository.findAncestorsTree(current);

    // Duyệt theo parent, gom các node vào mảng từ node truyền vào lên đến user.orgUnitId
    const branch = [];
    let node = ancestorsTree;
    while (node) {
      branch.unshift(node); // build từ gốc xuống
      if (node.id === user.orgUnitId) break;
      node = node.parent;
    }
    if (!node || node.id !== user.orgUnitId)
      throw new NotFoundException('Không tìm thấy đơn vị gốc trong cây ancestor!');

    // Build lại cây từ mảng branch (từ gốc xuống node truyền vào)
    let tree = null;
    for (let i = branch.length - 1; i >= 0; i--) {
      const n = { ...branch[i], parent: undefined, children: [] };
      if (tree) n.children.push(tree);
      tree = n;
    }
    return tree;
  }

  async createOrgUnit(createOrgUnitDto: CreateOrgUnitDto, user: UserRequest) {
    const { name, parentId, managerId, type } = createOrgUnitDto;

    // Gom validate vào Promise.all
    const [exist, parent, manager, existName] = await Promise.all([
      TypeConflictName.includes(type)
        ? this.orgUnitRepository.findOne({
            where: { name: name, parentId: parentId || IsNull(), type: type },
          })
        : null,

      parentId ? this.orgUnitRepository.findOne({ where: { id: parentId } }) : null,

      managerId ? this.userRepository.exists({ where: { id: managerId } }) : null,

      this.orgUnitRepository.exists({ where: { name }, withDeleted: true }),
    ]);

    this.orgUnitHandle.errorConflictName(exist, name);
    if (parentId) this.orgUnitHandle.errorNotFoundEntityWithId(parent, OrgUnit.name, parentId);
    if (managerId) this.orgUnitHandle.errorNotFoundEntityWithId(manager, User.name, managerId);
    if (existName) throw new BadRequestException('Tên đơn vị đã tồn tại!');

    // Validate type theo cấp cha (dùng handle)
    this.orgUnitHandle.validateOrgUnitTypeByParent(type, parent);

    const orgUnitInsert: DeepPartial<OrgUnit> = {
      id: uuidv4(),
      ...createOrgUnitDto,
      parent: parentId ? parent : null,
      createdById: user.id,
    };

    return await this.dataSource
      .transaction(async (manager) => {
        // Save OrgUnit
        const savedOrgUnit = await manager.save(OrgUnit, orgUnitInsert);

        // Find parent with full chain for mapping
        let parentForMapping = null;
        if (parentId) {
          parentForMapping = await manager.findOne(OrgUnit, {
            where: { id: parentId },
            relations: ['parent'],
          });
        }
        // Upsert mapping
        await this.upsertOrgUnitDivisionDepartment(manager, savedOrgUnit, parentForMapping);

        // xóa cache
        await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);
        await this.cacheService.del(CACHE_KEY.POSITION_TREE);
      })
      .then(() => {
        this.kafkaService.emitEvent(KafkaTopics.ORG_UNIT_ACTION, {
          key: orgUnitInsert.id,
          value: {
            type: KafkaActionType.CREATE,
            data: orgUnitInsert,
          },
        });

        return orgUnitInsert;
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async addUserToOrgUnit(addUserToOrgUnitDto: AddUserToOrgUnitDto, user: UserRequest) {
    const { orgUnitId, userOrgUnits } = addUserToOrgUnitDto;

    // Validate orgUnit, user, position tồn tại
    const uniqueUserIds = [...new Set(userOrgUnits.map((e) => e.userId))];
    const uniquePositionIds = [...new Set(userOrgUnits.map((e) => e.positionId))];

    const [orgUnit, users, positions] = await Promise.all([
      this.orgUnitRepository.exists({ where: { id: orgUnitId } }),
      this.userRepository.find({ where: { id: In(uniqueUserIds) } }),
      this.positionRepository.find({ where: { id: In(uniquePositionIds) } }),
    ]);

    if (!orgUnit) throw new BadRequestException('Tổ chức không tồn tại!');
    if (users.length !== uniqueUserIds.length)
      throw new BadRequestException('Một hoặc nhiều user không tồn tại!');
    if (positions.length !== uniquePositionIds.length)
      throw new BadRequestException('Một hoặc nhiều position không tồn tại!');

    // Lấy tất cả các UserOrgUnitPosition hiện tại của orgUnitId
    const currentRelations = await this.userOrgUnitPositionRepository.find({
      where: { orgUnitId, user: { status: UserStatus.ACTIVE } },
      relations: ['user'],
    });

    const currentKeySet = new Set(currentRelations.map((r) => `${r.userId}-${r.positionId}`));
    const newKeySet = new Set(userOrgUnits.map((r) => `${r.userId}-${r.positionId}`));

    // Xác định các item cần thêm mới và xoá
    const toAdd = userOrgUnits.filter((r) => !currentKeySet.has(`${r.userId}-${r.positionId}`));
    const toDelete = currentRelations.filter((r) => !newKeySet.has(`${r.userId}-${r.positionId}`));

    // Chuẩn bị dữ liệu insert
    const userOrgPositionInserts: DeepPartial<UserOrgUnitPosition[]> = toAdd.map((e) => ({
      userId: e.userId,
      positionId: e.positionId,
      orgUnitId,
      createdById: user.id,
      id: uuidv4(),
    }));

    return await this.dataSource
      .transaction(async (manager) => {
        // 2. Xoá các quan hệ không còn trong danh sách mới
        if (toDelete.length > 0)
          await manager.delete(
            UserOrgUnitPosition,
            toDelete.map((r) => r.id),
          );

        // 3. Thêm mới các quan hệ chưa có
        if (userOrgPositionInserts.length > 0)
          await manager.save(UserOrgUnitPosition, userOrgPositionInserts);

        // xóa cache
        await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);
        await this.cacheService.del(CACHE_KEY.POSITION_TREE);
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

  /**
   * Tăng member count khi user JOIN vào orgUnit
   * Chạy SAU khi đã insert vào DB
   */
  private async increaseOrgUnitMemberCountRecursive(
    manager: EntityManager,
    orgUnitId: string,
    userId: string,
  ): Promise<void> {
    // Tìm orgUnit hiện tại
    const orgUnit = await manager.findOne(OrgUnit, {
      where: { id: orgUnitId },
      relations: ['parent'],
    });

    if (!orgUnit) return;

    // Kiểm tra user đã có trong orgUnit này chưa (sau khi insert)
    const userExistsInCurrentOrg = await manager.exists(UserOrgUnitPosition, {
      where: { userId, orgUnitId },
    });

    // Nếu user mới join vào orgUnit này (không có trước đó)
    if (userExistsInCurrentOrg) {
      await manager.increment(OrgUnit, { id: orgUnitId }, 'totalMember', 1);
    }

    // Xử lý parent recursively
    if (orgUnit.parent) {
      // Kiểm tra user có join trực tiếp vào parent không
      const existsDirectlyInParent = await manager.exists(UserOrgUnitPosition, {
        where: { userId, orgUnitId: orgUnit.parent.id },
      });

      if (!existsDirectlyInParent) {
        // Kiểm tra user có join vào sibling orgUnits khác không
        const siblingOrgUnits = await manager.find(OrgUnit, {
          where: { parent: { id: orgUnit.parent.id } },
          select: ['id'],
        });

        const siblingOrgUnitIds = siblingOrgUnits
          .filter((t) => t.id !== orgUnitId)
          .map((t) => t.id);

        let hasOtherSiblingJoin = false;
        if (siblingOrgUnitIds.length > 0) {
          const otherSiblingJoin = await manager.exists(UserOrgUnitPosition, {
            where: {
              userId,
              orgUnitId: In(siblingOrgUnitIds),
            },
          });
          hasOtherSiblingJoin = otherSiblingJoin;
        }

        // Nếu user chưa join vào parent hoặc sibling khác
        // thì tăng count cho parent
        if (!hasOtherSiblingJoin) {
          await this.increaseOrgUnitMemberCountRecursive(manager, orgUnit.parent.id, userId);
        }
      }
    }
  }

  /**
   * Giảm member count khi user LEAVE khỏi orgUnit
   * Chạy TRƯỚC khi delete khỏi DB
   */
  private async decreaseOrgUnitMemberCountRecursive(
    manager: EntityManager,
    orgUnitId: string,
    userId: string,
  ): Promise<void> {
    // Tìm orgUnit hiện tại
    const orgUnit = await manager.findOne(OrgUnit, {
      where: { id: orgUnitId },
      relations: ['parent'],
    });

    if (!orgUnit) return;

    // Kiểm tra user có trong orgUnit này không (trước khi delete)
    const userExistsInCurrentOrg = await manager.exists(UserOrgUnitPosition, {
      where: { userId, orgUnitId },
    });

    // Nếu user đang có trong orgUnit này
    if (userExistsInCurrentOrg) {
      await manager.decrement(OrgUnit, { id: orgUnitId }, 'totalMember', 1);
    }

    // Xử lý parent recursively
    if (orgUnit.parent) {
      // Kiểm tra user có join trực tiếp vào parent không
      const existsDirectlyInParent = await manager.exists(UserOrgUnitPosition, {
        where: { userId, orgUnitId: orgUnit.parent.id },
      });

      if (!existsDirectlyInParent) {
        // Kiểm tra user có join vào sibling orgUnits khác không
        const siblingOrgUnits = await manager.find(OrgUnit, {
          where: { parent: { id: orgUnit.parent.id } },
          select: ['id'],
        });

        const siblingOrgUnitIds = siblingOrgUnits
          .filter((t) => t.id !== orgUnitId)
          .map((t) => t.id);

        let hasOtherSiblingJoin = false;
        if (siblingOrgUnitIds.length > 0) {
          const otherSiblingJoin = await manager.exists(UserOrgUnitPosition, {
            where: {
              userId,
              orgUnitId: In(siblingOrgUnitIds),
            },
          });
          hasOtherSiblingJoin = otherSiblingJoin;
        }

        // Nếu user không join vào parent hoặc sibling khác
        // thì giảm count cho parent
        if (!hasOtherSiblingJoin) {
          await this.decreaseOrgUnitMemberCountRecursive(manager, orgUnit.parent.id, userId);
        }
      }
    }
  }

  async updateOrgUnit(id: string, updateOrgUnitDto: UpdateOrgUnitDto, user: UserRequest) {
    const { name, parentId, managerId, type } = updateOrgUnitDto;

    const orgUnit = await this.orgUnitRepository.findOne({ where: { id } });
    this.orgUnitHandle.errorNotFoundEntityWithId(orgUnit, OrgUnit.name, id);
    // Gom validate vào Promise.all
    const [exist, conflict, parent, manager, existName] = await Promise.all([
      this.orgUnitRepository.exists({ where: { id } }),
      TypeConflictName.includes(type)
        ? this.orgUnitRepository.findOne({
            where: { name: name, parentId: parentId ?? orgUnit.parentId, id: Not(id) },
          })
        : null,

      parentId ? this.orgUnitRepository.findOne({ where: { id: parentId } }) : null,

      managerId ? this.userRepository.findOne({ where: { id: managerId } }) : null,

      this.orgUnitRepository.exists({ where: { name, id: Not(id) }, withDeleted: true }),
    ]);

    if (name) this.orgUnitHandle.errorConflictName(conflict, name);
    if (existName) throw new BadRequestException('Tên đơn vị đã tồn tại!');
    this.orgUnitHandle.errorNotFoundEntityWithId(exist, OrgUnit.name, id);
    if (parentId) this.orgUnitHandle.errorNotFoundEntityWithId(parent, OrgUnit.name, parentId);
    if (managerId) this.orgUnitHandle.errorNotFoundEntityWithId(manager, User.name, managerId);
    if (parentId) {
      if (parentId === id) throw new BadRequestException('parentId không được là chính nó!');
      // Check vòng lặp: không cho phép chuyển thành con của chính node con của nó
      const descendants = await this.orgUnitRepository.findDescendants(orgUnit);
      if (descendants.some((d) => d.id === parentId))
        throw new BadRequestException('Không thể chuyển thành con của chính node con của nó!');
    }

    // Validate type theo cấp cha (dùng handle)
    this.orgUnitHandle.validateOrgUnitTypeByParent(type, parent);

    const orgUnitUpdate: DeepPartial<OrgUnit> = {
      ...updateOrgUnitDto,
      id,
      parent: parentId ? parent : null,
      updatedById: user.id,
    };

    return await this.dataSource
      .transaction(async (manager) => {
        // Save OrgUnit
        const savedOrgUnit = await manager.save(OrgUnit, orgUnitUpdate);

        // Find parent with full chain for mapping
        let parentForMapping = null;
        if (parentId) {
          parentForMapping = await manager.findOne(OrgUnit, {
            where: { id: parentId },
            relations: ['parent'],
          });
        }
        // Upsert mapping for self
        await this.upsertOrgUnitDivisionDepartment(manager, savedOrgUnit, parentForMapping);

        // Upsert mapping for all descendants
        const descendants = await manager.getTreeRepository(OrgUnit).findDescendants(savedOrgUnit);
        for (const desc of descendants) {
          // Find parent for mapping (desc.parentId)
          let descParent = null;
          if (desc.parentId) {
            descParent = await manager.findOne(OrgUnit, {
              where: { id: desc.parentId },
              relations: ['parent'],
            });
          }
          await this.upsertOrgUnitDivisionDepartment(manager, desc, descParent);
        }

        // xóa cache
        await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);
        await this.cacheService.del(CACHE_KEY.POSITION_TREE);
      })
      .then(() => {
        this.kafkaService.emitEvent(KafkaTopics.ORG_UNIT_ACTION, {
          key: id,
          value: {
            type: KafkaActionType.UPDATE,
            data: {
              ...updateOrgUnitDto,
              id,
              parent: parentId ? parent : null,
              updatedById: user.id,
            },
          },
        });

        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async removeOrgUnit(id: string, user: UserRequest) {
    const orgUnit = await this.orgUnitRepository.findOne({ where: { id } });

    this.orgUnitHandle.errorNotFoundEntityWithId(orgUnit, OrgUnit.name, id);

    if (orgUnit.name === BOARD_OF_DIRECTORS_UNIQUE.ROOT_NAME)
      throw new BadRequestException(`Không được xoá ${BOARD_OF_DIRECTORS_UNIQUE.ROOT_NAME}`);

    return await this.dataSource
      .transaction(async (manager) => {
        // Lấy toàn bộ descendants (bao gồm chính nó)
        const orgUnit = await manager.findOne(OrgUnit, { where: { id } });
        const descendants = orgUnit
          ? await manager.getTreeRepository(OrgUnit).findDescendants(orgUnit)
          : [];
        const allIds = descendants.map((d) => d.id);
        // Xóa mapping của tất cả orgUnitId
        if (allIds.length > 0) {
          await manager.delete(OrgUnitDivisionDepartment, { orgUnitId: In(allIds) });

          await manager.update(OrgUnit, { id: In(allIds) }, { deletedById: user.id });
          await manager.softDelete(OrgUnit, { id: In(allIds) });
          await manager.delete(UserOrgUnitPosition, { orgUnitId: In(allIds) });
          await manager.delete(SubManager, { orgUnitId: In(allIds) });
        }
      })
      .then(async () => {
        // xóa cache
        await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);
        await this.cacheService.del(CACHE_KEY.POSITION_TREE);

        this.kafkaService.emitEvent(KafkaTopics.ORG_UNIT_ACTION, {
          key: id,
          value: {
            type: KafkaActionType.REMOVE,
            data: { id, ...orgUnit, deletedAt: new Date() },
          },
        });

        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async getListOrgUnit(getListOrgUnitDto: GetListOrgUnitDto) {
    let { page, take, orderBy, order, search, name, type, parentId, status, context, withDeleted } =
      getListOrgUnitDto;

    const whereItem: FindOptionsWhere<OrgUnit> = {};

    if (context && context === 'JobTitle') {
      whereItem.type = In([
        OrgUnitType.BOARD_OF_DIRECTORS.toString(),
        OrgUnitType.DIVISION.toString(),
        OrgUnitType.DEPARTMENT.toString(),
      ]);
    } else if (type) whereItem.type = type.toString() as any;
    if (name) whereItem.name = name;
    if (parentId) whereItem.parentId = parentId;
    if (status) whereItem.status = status;

    let where: FindOptionsWhere<OrgUnit>[] = [whereItem];

    if (search)
      where = this.queryService.search({
        arrayPropertyLike: ['name'],
        search,
        whereItem,
      });

    const [list, total] = await this.orgUnitRepository.findAndCount({
      withDeleted,
      relations: ['manager', 'parent', 'deletedBy'],
      where,
      ...this.queryService.getPagination({ page, take }),
      order: { [orderBy]: order },
      select: {
        manager: {
          id: true,
          name: true,
        },
        parent: {
          id: true,
          name: true,
        },
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

  async getOrgUnit(id: string) {
    const orgUnit = await this.orgUnitRepository.findOne({
      where: { id },
      relations: ['parent', 'children'],
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        totalMember: true,
        parentId: true,
        managerId: true,
        description: true,
        parent: {
          id: true,
          name: true,
        },
        children: {
          id: true,
          name: true,
        },
      },
    });

    if (!orgUnit) throw new NotFoundException(`Không tìm thấy đơn vị`);

    const userOrgUnitPositions = await this.userOrgUnitPositionRepository.find({
      relations: ['user', 'position'],
      where: { orgUnitId: orgUnit.id, user: { status: UserStatus.ACTIVE } },
      select: {
        id: true,
        user: {
          id: true,
          name: true,
          status: true,
        },
        position: {
          id: true,
          name: true,
        },
      },
    });

    if (!orgUnit) this.orgUnitHandle.errorNotFoundEntityWithId(orgUnit, OrgUnit.name, id);

    orgUnit.userOrgUnitPositions = userOrgUnitPositions;
    return orgUnit;
  }

  async getListChildrenOrgUnit(parentId: string) {
    // Lấy các đơn vị con trực tiếp của parentId
    const children = await this.orgUnitRepository.find({
      where: { parentId },
      relations: ['manager', 'parent', 'subManagers', 'subManagers.user'],
      order: { name: 'ASC' },
      select: {
        manager: { id: true, name: true },
        parent: { id: true, name: true },
        subManagers: { id: true, user: { id: true, name: true } },
      },
    });
    return children;
  }

  async getTreeChildrenOrgUnit(parentId: string) {
    // Lấy node cha
    const parent = await this.orgUnitRepository.findOne({
      where: { id: parentId },
      relations: ['children', 'children.manager', 'children.parent'],
    });
    if (!parent) throw new BadRequestException('Không tìm thấy đơn vị cha!');

    // Lấy toàn bộ cây con (bao gồm cả parent)
    const tree = await this.orgUnitRepository.findDescendantsTree(parent, {
      relations: ['manager', 'parent', 'children'],
    });
    return tree.children; // chỉ trả về cây con, không bao gồm node cha
  }

  async getDescendantsOrgUnit(orgUnitId: string): Promise<OrgUnit[]> {
    const orgUnit = await this.orgUnitRepository.findOne({
      where: { id: orgUnitId },
      relations: ['children'],
    });
    if (!orgUnit) {
      throw new BadRequestException(`Không tìm thấy đơn vị tổ chức với ID: ${orgUnitId}`);
    }

    // Lấy tất cả descendants của orgUnit
    const descendants = await this.orgUnitRepository.findDescendants(orgUnit);

    return descendants;
  }

  async getListDetailOrgUnit(id: string) {
    const orgUnit = await this.orgUnitRepository.findOne({
      relations: { manager: true },
      where: { id },
      select: {
        manager: {
          id: true,
          name: true,
          url: true,
        },
      },
    });

    if (!orgUnit) this.orgUnitHandle.errorNotFoundEntityWithId(orgUnit, OrgUnit.name, id);

    // Lấy orgUnit hiện tại và tất cả descendants
    const orgUnitWithDescendants = await this.orgUnitRepository.findDescendantsTree(orgUnit);

    const allOrgUnitIds = this.orgUnitHandle.getAllOrgUnitIds(orgUnitWithDescendants);

    // Lấy unique user IDs
    const userIds = await this.userOrgUnitPositionRepository.find({
      where: { orgUnitId: In(allOrgUnitIds) },
    });

    const uniqueUserIds = userIds.map((item) => item.userId);

    // Lấy thông tin chi tiết của users
    const users = uniqueUserIds.length
      ? await this.userRepository
          .createQueryBuilder('user')
          .leftJoinAndSelect('user.userOrgUnitPositions', 'userOrgUnitPositions')
          .leftJoinAndSelect('userOrgUnitPositions.position', 'position')
          .where('user.id IN (:...ids)', { ids: uniqueUserIds })
          .andWhere('user.status = :status', { status: UserStatus.ACTIVE })
          .select([
            'user.id',
            'user.code',
            'user.name',
            'user.gender',
            'user.url',
            'userOrgUnitPositions.id',
            'userOrgUnitPositions.orgUnitId',
            'position.id',
            'position.name',
            'position.level',
          ])
          .orderBy('position.level', 'ASC')
          .addOrderBy('position.name', 'ASC')
          .addOrderBy("SUBSTRING_INDEX(user.name, ' ', -1)", 'ASC')
          .getMany()
      : [];

    return {
      orgUnit: {
        id: orgUnit.id,
        name: orgUnit.name,
        status: orgUnit.status,
        description: orgUnit.description,
        type: orgUnit.type,
        manager: orgUnit.manager,
        totalMember: users.length || 0,
      },
      users,
    };
  }

  async getUsersByOrgUnits(dto: GetUsersByOrgUnitsDto): Promise<User[]> {
    const allOrgUnitIds = new Set<string>();

    // Lấy tất cả orgUnit IDs bao gồm cả descendants
    for (const orgUnitId of dto.orgUnitIds) {
      const orgUnit = await this.orgUnitRepository.findOne({
        where: { id: orgUnitId },
      });

      if (orgUnit) {
        allOrgUnitIds.add(orgUnitId);

        // Lấy tất cả descendants
        const descendants = await this.getDescendantsOrgUnit(orgUnitId);
        descendants.forEach((descendant) => allOrgUnitIds.add(descendant.id));
      }
    }

    // Lấy tất cả users từ các orgUnits
    const userJoinOrgUnits = await this.userOrgUnitPositionRepository.find({
      where: { orgUnitId: In(Array.from(allOrgUnitIds)) },
      relations: ['user'],
    });

    // Lấy unique users
    const uniqueUsers = new Map<string, User>();
    userJoinOrgUnits.forEach((userJoinOrgUnit) => {
      if (userJoinOrgUnit.user) {
        uniqueUsers.set(userJoinOrgUnit.user.id, userJoinOrgUnit.user);
      }
    });

    return Array.from(uniqueUsers.values());
  }

  async getListUsersByOrgUnits(dto: GetUsersByOrgUnitsDto) {
    const allOrgUnitIds = new Set<string>();
    for (const orgUnitId of dto.orgUnitIds) {
      const orgUnit = await this.orgUnitRepository.findOne({ where: { id: orgUnitId } });
      if (orgUnit) {
        allOrgUnitIds.add(orgUnit.id);
        const descendants = await this.orgUnitRepository.findDescendants(orgUnit);
        descendants.forEach((desc) => allOrgUnitIds.add(desc.id));
      }
    }
    const userOrgUnitPositions = await this.userOrgUnitPositionRepository.find({
      where: { orgUnitId: In(Array.from(allOrgUnitIds)) },
      relations: ['orgUnit', 'position', 'user'],
      select: {
        orgUnit: {
          id: true,
          name: true,
          description: true,
        },
        position: {
          id: true,
          name: true,
          level: true,
        },
      },
    });
    const userMap = new Map<string, { user: User; userOrgUnitPositions: UserOrgUnitPosition[] }>();
    userOrgUnitPositions.forEach((item) => {
      if (item.user && item.user.status && item.user.status === UserStatus.ACTIVE) {
        if (!userMap.has(item.user.id)) {
          userMap.set(item.user.id, {
            user: item.user,
            userOrgUnitPositions: [item],
          });
        } else {
          userMap.get(item.user.id).userOrgUnitPositions.push(item);
        }
      }
    });
    return Array.from(userMap.values()).map((entry) => ({
      ...entry.user,
      userOrgUnitPositions: entry.userOrgUnitPositions,
    }));
  }

  async getTreeChildren(parentId: string, search: string) {
    // Lấy node cha
    const parent = await this.orgUnitRepository.findOne({ where: { id: parentId } });

    if (!parent) throw new BadRequestException('Không tìm thấy đơn vị cha!');

    // Lấy toàn bộ cây con (bao gồm cả parent)
    const tree = await this.orgUnitRepository.findDescendantsTree(parent);

    if (search) return this.orgUnitHandle.filterTreeBySearch([tree], search);

    return tree;
  }

  async getTreeFromParentToChildren(user: UserRequest, childrenId: string, search: string) {
    let parent: OrgUnit = [UserType.ADMIN, UserType.ROOT, UserType.C_B].includes(user.type)
      ? await this.orgUnitRepository.findOne({
          where: { parentId: IsNull() },
          relations: ['children'],
        })
      : await this.orgUnitRepository.findOne({
          where: { id: user.orgUnitId },
          relations: ['children'],
        });

    if (!parent) throw new NotFoundException('Không tìm thấy đơn vị cha!');

    // Lấy toàn bộ cây con (bao gồm cả parent)
    const tree = await this.orgUnitRepository.findDescendantsTree(parent, {
      relations: ['children'],
    });
    // Nếu có childrenId, chỉ lấy nhánh đến childrenId
    let resultTree = tree;
    if (childrenId) {
      function findPath(node: OrgUnit): OrgUnit | null {
        if (node.id === childrenId) return { ...node, children: [] };
        for (const child of node.children || []) {
          const found = findPath(child);
          if (found) return { ...node, children: [found] };
        }
        return null;
      }
      resultTree = findPath(resultTree);
    }

    if (search) return this.orgUnitHandle.filterTreeBySearch(resultTree.children, search);

    return [resultTree];
  }

  async getTreeExcludeChildren(user: UserRequest, childrenId: string, search: string) {
    const parent = [UserType.ADMIN, UserType.ROOT, UserType.C_B].includes(user.type)
      ? await this.orgUnitRepository.findOne({
          where: { parentId: IsNull() },
          relations: ['children'],
        })
      : await this.orgUnitRepository.findOne({
          where: { id: user.orgUnitId },
          relations: ['children'],
        });
    if (!parent) throw new NotFoundException('Không tìm thấy đơn vị cha!');
    // Lấy toàn bộ cây con (bao gồm cả parent)
    const tree = await this.orgUnitRepository.findDescendantsTree(parent, {
      relations: ['children'],
    });

    // Đệ quy loại bỏ node có id = childrenId khỏi children của mọi node
    function removeNodeById(node, targetId) {
      if (!node.children) return node;
      node.children = node.children
        .filter((child) => child.id !== targetId)
        .map((child) => removeNodeById(child, targetId));
      return node;
    }
    const newTree = removeNodeById(tree, childrenId);

    if (search) return this.orgUnitHandle.filterTreeBySearch([newTree], search);

    return [newTree];
  }

  async getTreeUserMovement(dto: GetTreeOrgUnitDto, user: UserRequest) {
    // if (!user.orgUnitId) throw new BadRequestException(`Bạn không có trong đơn vị nào`);

    if (dto.type === UserMovementType.APPOINTMENT)
      return await this.getTreeFromParentToChildren(user, dto.childrenId, dto.search);
    else if (dto.type === UserMovementType.TRANSFER)
      return await this.getTreeExcludeChildren(user, dto.childrenId, dto.search);
    else return await this.getTreeChildren(dto.childrenId, dto.search);
  }

  async GetTreeOrgUnitUser(getListOrgUnitDto: GetListOrgUnitDto) {
    const { search } = getListOrgUnitDto;
    const orgUnits = await this.orgUnitRepository.findTrees({
      relations: ['userOrgUnitPositions', 'userOrgUnitPositions.user'],
    });

    const flatOrgUnits = this.flatOrgUnitsByName(orgUnits, search);

    return this.transformOrgUnitsWithUsers(flatOrgUnits);
  }

  /**
   * Lấy mảng phẳng các orgUnit có name liên quan (không lồng children)
   */
  private flatOrgUnitsByName(orgUnits: OrgUnit[], searchTerm: string): OrgUnit[] {
    if (!searchTerm) return orgUnits;
    const lowerSearchTerm = searchTerm.toLowerCase();
    let result: OrgUnit[] = [];
    for (const orgUnit of orgUnits) {
      if (orgUnit.name.toLowerCase().includes(lowerSearchTerm)) result.push(orgUnit);

      if (orgUnit.children && orgUnit.children.length > 0)
        result = result.concat(this.flatOrgUnitsByName(orgUnit.children, searchTerm));
    }
    return result;
  }

  /**
   * Transform orgUnit to include users in children array with type "User"
   */
  private transformOrgUnitsWithUsers(orgUnit: OrgUnit[]): OrgUnit[] {
    return orgUnit.map((orgUnit) => {
      const orgUnitChildren: OrgUnit = {
        id: orgUnit.id,
        name: orgUnit.name,
        type: orgUnit.type,
        parentId: orgUnit.parentId,
        totalMember: orgUnit.totalMember,
        // userOrgUnitPositions: orgUnit.userOrgUnitPositions,
        children: [],
      } as OrgUnit;

      // Add orgUnit children
      if (orgUnit.children && orgUnit.children.length > 0) {
        orgUnitChildren.children = this.transformOrgUnitsWithUsers(orgUnit.children);
      }

      // Add users as children with type "User"
      if (
        orgUnit.userOrgUnitPositions &&
        orgUnit.userOrgUnitPositions.length > 0 &&
        orgUnit.type === OrgUnitType.TEAM
      ) {
        const userChildren = orgUnit.userOrgUnitPositions.map((userOrgUnitPosition) => ({
          id: userOrgUnitPosition.user.id,
          name: userOrgUnitPosition.user.name,
          type: 'user',
          parentId: orgUnit.id,
          children: [],
        }));

        // Combine orgUnit children and user children
        orgUnitChildren.children = [...(orgUnitChildren.children || []), ...userChildren] as any;
      }

      return orgUnitChildren;
    });
  }

  /**
   * Kiểm tra hai orgUnit có cùng cây không (có ancestor chung)
   */
  async isSameOrgUnitTree(orgUnitId1: string, orgUnitId2: string): Promise<boolean> {
    if (orgUnitId1 === orgUnitId2) return true;
    const orgUnit1 = await this.orgUnitRepository.findOne({ where: { id: orgUnitId1 } });
    const orgUnit2 = await this.orgUnitRepository.findOne({ where: { id: orgUnitId2 } });
    if (!orgUnit1 || !orgUnit2) return false;
    const ancestors1 = await this.orgUnitRepository.findAncestors(orgUnit1);
    const ancestors2 = await this.orgUnitRepository.findAncestors(orgUnit2);
    const ids1 = ancestors1.map((a) => a.id);
    const ids2 = ancestors2.map((a) => a.id);
    // Nếu có ancestor chung (không tính root ảo nếu có)
    return ids1.some((id) => ids2.includes(id));
  }

  async getManagedDepartmentsByUser(user: UserRequest) {
    const [generalDirectorPositionId, userPosition, managerOrgUnit] = await Promise.all([
      this.positionRepository.findOne({
        where: { name: 'Tổng giám đốc' },
        select: ['id'],
      }),
      this.positionRepository.findOne({
        where: { id: user.positionId },
        select: ['id', 'type'],
      }),
      this.orgUnitRepository.findOne({
        where: { id: user.orgUnitId },
        select: ['managerId'],
      }),
    ]);

    if (user.positionId === generalDirectorPositionId.id) {
      return await this.orgUnitRepository.find({
        where: {
          type: In([
            OrgUnitType.BOARD_OF_DIRECTORS.toString(),
            OrgUnitType.DIVISION.toString(),
            OrgUnitType.DEPARTMENT.toString(),
          ]),
          status: OrgUnitStatus.ACTIVE,
        },
        order: { type: 'ASC' },
      });
    }

    let managerId = user.id;

    if (userPosition.type === PositionType.ASSISTANT) managerId = managerOrgUnit?.managerId;

    const listOrgUnitManagers = await this.orgUnitRepository.find({
      where: {
        managerId: managerId,
        status: OrgUnitStatus.ACTIVE,
        type: In([
          OrgUnitType.BOARD_OF_DIRECTORS.toString(),
          OrgUnitType.DIVISION.toString(),
          OrgUnitType.DEPARTMENT.toString(),
        ]),
      },
    });

    if (listOrgUnitManagers.length === 0) return [];

    const departmentIds = listOrgUnitManagers.filter(
      (item) => item.type === OrgUnitType.DEPARTMENT,
    );

    const otherTypeIds = listOrgUnitManagers
      .filter((item) => item.type !== OrgUnitType.DEPARTMENT)
      .map((item) => item.id);

    const listManagerDepartment = await this.orgUnitRepository.find({
      where: { parentId: In(otherTypeIds) },
    });

    return [...listManagerDepartment, ...departmentIds];
  }

  async getBranchDepartmentsByUser(user: UserRequest) {
    if (!user.orgUnitId)
      throw new NotFoundException(`Người dùng không có chức vụ trong đơn vị và phòng ban`);

    const orgUnit = await this.orgUnitRepository.findOne({
      where: { id: user.orgUnitId },
      select: ['id', 'type', 'parentId'],
    });

    if (!orgUnit) {
      throw new NotFoundException(`Đơn vị tổ chức không tồn tại`);
    }

    let isBoardDirectors =
      user.type === UserType.ADMIN || user.type === UserType.HR
        ? true
        : await this.orgUnitRepository.exists({
            where: { id: user.orgUnitId, type: OrgUnitType.BOARD_OF_DIRECTORS },
          });

    // Nếu là Ban giám đốc thì trả về Ban giám đốc và các khối
    if (isBoardDirectors || orgUnit.type === OrgUnitType.BOARD_OF_DIRECTORS) {
      const units = await this.orgUnitRepository.find({
        relations: { parent: true },
        where: {
          type: In([
            OrgUnitType.DEPARTMENT.toString(),
            OrgUnitType.DIVISION.toString(),
            OrgUnitType.BOARD_OF_DIRECTORS.toString(),
          ]),
          status: OrgUnitStatus.ACTIVE,
        },
        select: { parent: { id: true, name: true } },
        order: { type: 'ASC' },
      });

      for (const unit of units) {
        if (!unit.parent) {
          unit.parentId = unit.id;
          unit.parent = {
            id: unit.id,
            name: unit.name,
          } as OrgUnit;
          break;
        }
      }

      return units;
    }

    if (orgUnit.type === OrgUnitType.DIVISION) {
      return await this.orgUnitRepository.find({
        relations: { parent: true },
        where: {
          type: In([OrgUnitType.DEPARTMENT.toString()]),
          status: OrgUnitStatus.ACTIVE,
          parentId: orgUnit.id,
        },
        select: { parent: { id: true, name: true } },
        order: { type: 'ASC' },
      });
    } else {
      let currentOrg = orgUnit;

      while (currentOrg.type !== OrgUnitType.DIVISION) {
        if (!currentOrg.parentId) {
          throw new NotFoundException(`Không tìm thấy đơn vị cha của phòng ban hiện tại`);
        }
        currentOrg = await this.orgUnitRepository.findOne({
          where: { id: currentOrg.parentId },
          select: ['id', 'type', 'parentId'],
        });
      }

      return await this.orgUnitRepository.find({
        relations: { parent: true },
        where: {
          type: In([OrgUnitType.DEPARTMENT.toString()]),
          status: OrgUnitStatus.ACTIVE,
          parentId: currentOrg.id,
        },
        select: { parent: { id: true, name: true } },
        order: { type: 'ASC' },
      });
    }
  }

  async getOrgUnitsFlatArraySearch(getOrgUnitSearchDto: GetOrgUnitSearchDto) {
    const { search, orgUnitId, isUpdate } = getOrgUnitSearchDto;

    if (search) {
      const tree = await this.orgUnitRepository.findTrees();

      return this.orgUnitHandle.filterTreeBySearch(tree, search);
    }

    if (orgUnitId) {
      const orgUnit = await this.orgUnitRepository.findOne({ where: { id: orgUnitId } });

      if (!orgUnit) throw new NotFoundException(`Đơn vị tổ chức không tồn tại`);

      if (isUpdate) {
        const ancestors = await this.orgUnitRepository.findAncestors(orgUnit);

        const ancestorsTree = this.orgUnitHandle.buildPathTree(ancestors);

        const descendantsTree = await this.orgUnitRepository.findDescendantsTree(orgUnit);

        return this.orgUnitHandle.mergeDescendantsIntoAncestors(
          ancestorsTree,
          descendantsTree,
          orgUnit.id,
        );
      } else return this.orgUnitRepository.findDescendantsTree(orgUnit);
    }

    const orgUnitRoot = await this.orgUnitRepository.findOne({
      where: { type: OrgUnitType.BOARD_OF_DIRECTORS },
      relations: ['children'],
      select: {
        id: true,
        name: true,
        type: true,
        parentId: true,
        managerId: true,
        children: {
          id: true,
          name: true,
          type: true,
          parentId: true,
          managerId: true,
        },
      },
    });

    return orgUnitRoot;
  }

  async getExcludeChildren(user: UserRequest, dto: GetTreeOrgUnitDto) {
    const tree = await this.getTreeExcludeChildren(user, dto.childrenId, dto.search);

    // chuyển cây thành mảng phẳng
    const flatTree = this.flattenTree(tree);

    return flatTree;
  }

  /**
   * Chuyển cây thành mảng phẳng
   */
  private flattenTree(tree: OrgUnit[]): OrgUnit[] {
    const result: OrgUnit[] = [];

    function traverse(node: OrgUnit) {
      // Thêm node hiện tại vào kết quả
      const flatNode = { ...node };
      delete flatNode.children; // Loại bỏ thuộc tính children để tránh lồng nhau
      result.push(flatNode);

      // Đệ quy qua tất cả children
      if (node.children && node.children.length > 0) {
        node.children.forEach((child) => traverse(child));
      }
    }

    // Duyệt qua tất cả các node trong cây
    tree.forEach((node) => traverse(node));

    return result;
  }

  async getTreeExceptDescendants(getOrgUnitSearchDto: GetOrgUnitSearchDto) {
    const { search, orgUnitId } = getOrgUnitSearchDto;

    const orgUnit = await this.orgUnitRepository.findOne({ where: { id: orgUnitId } });
    if (!orgUnit) throw new NotFoundException(`Đơn vị tổ chức không tồn tại`);

    const descendants = await this.orgUnitRepository.findDescendants(orgUnit);
    const descendantIds = descendants.map((d) => d.id);

    // Lấy tất cả node
    const allNodes = await this.orgUnitRepository.find();

    // Lọc ra các node không nằm trong descendants
    const result = allNodes.filter((node) => !descendantIds.includes(node.id));

    const tree = this.orgUnitHandle.buildPathTree(result);

    if (search) return this.orgUnitHandle.filterTreeBySearch([tree], search);

    return [tree];
  }

  async restoreOrgUnit(id: string, user: UserRequest) {
    const orgUnit = await this.orgUnitRepository.findOne({ where: { id }, withDeleted: true });

    // kiểm tra quá 7 ngày không cho khôi phục
    if (
      orgUnit.deletedAt &&
      new Date(orgUnit.deletedAt).getTime() + 7 * 24 * 60 * 60 * 1000 < Date.now()
    )
      throw new BadRequestException('Đơn vị tổ chức đã bị xóa quá 7 ngày không thể khôi phục!');

    if (!orgUnit) throw new NotFoundException(`Đơn vị tổ chức không tồn tại`);

    if (!orgUnit.deletedAt) throw new BadRequestException('Đơn vị chưa bị xóa!');

    if (orgUnit.parentId) {
      const parent = await this.orgUnitRepository.findOne({ where: { id: orgUnit.parentId } });
      if (!parent)
        throw new BadRequestException('Không thể khôi phục vì đơn vị cha không tồn tại!');
    }

    // function đệ quy để lấy tất cả các đơn vị con withDeleted
    const getDescendants = async (orgUnit: OrgUnit, allIds: string[]): Promise<string[]> => {
      const descendants = await this.orgUnitRepository.find({
        where: { parentId: orgUnit.id },
        withDeleted: true,
      });

      if (descendants.length > 0) {
        const descendantPromises = descendants.map((d) => getDescendants(d, [...allIds, d.id]));
        const descendantResults = await Promise.all(descendantPromises);
        return descendantResults.flat();
      }

      return allIds;
    };

    const allIds = await getDescendants(orgUnit, [orgUnit.id]);

    return await this.dataSource
      .transaction(async (manager) => {
        if (allIds.length > 0) await manager.restore(OrgUnit, { id: In(allIds) });

        await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);
      })
      .then(() => {
        this.kafkaService.emitEvent(KafkaTopics.ORG_UNIT_ACTION, {
          key: orgUnit.id,
          value: {
            type: KafkaActionType.RESTORE,
            data: { id, name: orgUnit.name, restoredBy: user.id, deletedAt: null },
          },
        });

        return { success: true };
      })
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async importFuncTask(
    fileBuffer: Buffer | Uint8Array,
    user: any,
  ): Promise<{
    created: number;
    skipped: number;
    errors: string[];
  }> {
    const result = {
      created: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Đọc tất cả sheet trong file excel
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);

      // Lấy tất cả worksheets
      const worksheets = workbook.worksheets;

      if (worksheets.length === 0) {
        result.errors.push('Không tìm thấy sheet nào trong file Excel');
        return result;
      }

      // Xử lý từng sheet
      for (const worksheet of worksheets) {
        try {
          const sheetName = worksheet.name.trim();

          if (!sheetName) {
            result.skipped++;
            continue;
          }

          // Tìm org unit có tên trùng với sheet name (exact match)
          let orgUnit = await this.orgUnitRepository.findOne({
            where: { name: sheetName },
          });

          // Nếu không tìm thấy exact match, thử tìm fuzzy match
          if (!orgUnit) {
            // Thử loại bỏ số thứ tự đầu (ví dụ: "1. Sơ đồ tổ chức" -> "Sơ đồ tổ chức")
            const cleanedName = sheetName.replace(/^\d+(\.\d+)*\.\s*/, '').trim();
            if (cleanedName !== sheetName) {
              orgUnit = await this.orgUnitRepository.findOne({
                where: { name: cleanedName },
              });
            }

            // Nếu vẫn không tìm thấy, thử tìm partial match
            if (!orgUnit) {
              const allOrgUnits = await this.orgUnitRepository.find({
                select: ['id', 'name'],
              });

              // Tìm org unit có tên chứa một phần của sheet name hoặc ngược lại
              orgUnit = allOrgUnits.find(
                (org) =>
                  org.name.toLowerCase().includes(cleanedName.toLowerCase()) ||
                  cleanedName.toLowerCase().includes(org.name.toLowerCase()),
              );
            }
          }

          if (!orgUnit) {
            result.errors.push(`Không tìm thấy đơn vị có tên: ${sheetName}`);
            result.skipped++;
            continue;
          }

          // Đọc dữ liệu từ sheet và chuyển thành HTML
          const sheetData = this.orgUnitHandle.extractSheetDataAsText(worksheet);

          if (!sheetData || sheetData.trim().length === 0) {
            result.errors.push(`Sheet ${sheetName} không có dữ liệu`);
            result.skipped++;
            continue;
          }

          // Giới hạn độ dài description để tránh lỗi database
          // TEXT type trong MySQL có giới hạn 65,535 characters
          const MAX_DESCRIPTION_LENGTH = 60000; // Để lại buffer
          const finalDescription =
            sheetData.length > MAX_DESCRIPTION_LENGTH
              ? sheetData.substring(0, MAX_DESCRIPTION_LENGTH) +
                '\n\n... (Dữ liệu đã được cắt ngắn do vượt quá giới hạn)'
              : sheetData;

          // Cập nhật description cho org unit
          await this.orgUnitRepository.update(orgUnit.id, {
            description: finalDescription,
            updatedById: user.id,
          });

          result.created++;
        } catch (sheetError) {
          result.errors.push(`Lỗi xử lý sheet ${worksheet.name}: ${sheetError.message}`);
          result.skipped++;
        }
      }
    } catch (error) {
      result.errors.push(`Lỗi đọc file Excel: ${error.message}`);
    }

    await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);

    return result;
  }

  async processMultipleFile(files: Express.Multer.File[], user: UserRequest) {
    try {
      if (!files || files.length === 0)
        throw new BadRequestException('Không có file nào được tải lên');

      const results = [];
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
          await this.processWordFile(file);
          results.push({
            fileName: decodedOriginalName,
            success: true,
            // result,
          });
        } catch (fileError) {
          const decodedOriginalName = this.stringService.decodeFileName(file.originalname);
          const errorMessage = `${fileError.message}`;
          errors.push({
            fileName: decodedOriginalName,
            success: false,
            error: errorMessage,
          });
        }
      }

      // Check if all files failed
      if (errors.length === files.length)
        throw new BadRequestException(`Tất cả ${files.length} file đều lỗi:\n${errors.join('\n')}`);

      // Check if some files failed
      if (errors.length > 0) console.warn(`Xử lý hoàn tất với ${errors.length} file lỗi:`, errors);

      setTimeout(() => {
        console.log('leeping');
      }, 1000);

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

      // Re-throw BadRequestException as is
      if (error instanceof BadRequestException) throw error;

      // Wrap other errors
      throw new BadRequestException(`Lỗi xử lý file: ${error.message}`);
    }
  }

  async processWordFile(file: Express.Multer.File) {
    try {
      if (!file) throw new BadRequestException('Không có file');

      const htmlResult = await mammoth.convertToHtml({ buffer: file.buffer });

      const originalName = this.stringService.decodeFileName(file.originalname);

      const orgUnit = await this.orgUnitRepository.findOne({ where: { name: originalName } });

      if (!orgUnit)
        throw new BadRequestException(`Không tìm thấy đơn vị tổ chức tên: ${originalName}`);

      return await this.dataSource
        .transaction(async (manager) => {
          await manager.update(OrgUnit, { id: orgUnit.id }, { description: htmlResult.value });
        })
        .then(async () => {
          await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);
          return {
            html: htmlResult.value,
            fileName: originalName,
            fileSize: file.size,
          };
        })
        .catch((error) => {
          throw new BadRequestException(`Lỗi đọc file: ${error.message}`);
        });
    } catch (error) {
      throw new BadRequestException(`Lỗi đọc file: ${error.message}`);
    }
  }

  async getListRestoreOrgUnit(getListOrgUnitDto: GetListOrgUnitDto) {
    let { page, take, orderBy, order, search, type, parentId } = getListOrgUnitDto;

    const whereItem: FindOptionsWhere<OrgUnit> = {};
    whereItem.deletedAt = Not(IsNull());

    let where: FindOptionsWhere<OrgUnit>[] = [whereItem];

    // Lấy tất cả records để filter parent nodes
    const allRecords = await this.orgUnitRepository.find({
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
    let parentList = allRecords.filter((orgUnit) => {
      if (!orgUnit.parentId) return true;
      return !allRecords.some((item) => item.id === orgUnit.parentId);
    });

    if (type) parentList = parentList.filter((item) => item.type === type);
    if (parentId) parentList = parentList.filter((item) => item.parentId === parentId);
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

  async getTreeRestoreOrgUnit(id: string) {
    const orgUnit = await this.orgUnitRepository.findOne({ where: { id }, withDeleted: true });

    if (!orgUnit) throw new NotFoundException(`Đơn vị tổ chức không tồn tại`);

    if (!orgUnit.deletedAt) throw new BadRequestException('Đơn vị chưa bị xóa!');

    // function đệ quy để lấy tất cả các đơn vị con withDeleted
    const orgUnitsMap = new Map<string, OrgUnit>();

    const processOrgUnit = async (currentOrgUnit: OrgUnit) => {
      if (orgUnitsMap.has(currentOrgUnit.id)) return;

      orgUnitsMap.set(currentOrgUnit.id, currentOrgUnit);

      const descendants = await this.orgUnitRepository.find({
        where: { parentId: currentOrgUnit.id },
        withDeleted: true,
      });

      for (const descendant of descendants) {
        await processOrgUnit(descendant);
      }
    };

    await processOrgUnit(orgUnit);

    const orgUnits = Array.from(orgUnitsMap.values());

    const tree = this.orgUnitHandle.buildPathTree(orgUnits);

    return tree;
  }

  async deleteOrgUnit(id: string, _: UserRequest) {
    const orgUnit = await this.orgUnitRepository.findOne({ where: { id }, withDeleted: true });

    if (!orgUnit) throw new NotFoundException(`Đơn vị tổ chức không tồn tại`);

    if (!orgUnit.deletedAt) throw new BadRequestException('Đơn vị chưa bị xóa!');

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.delete(OrgUnit, { id });
      })
      .then(async () => {
        // xóa cache
        await this.cacheService.del(CACHE_KEY.ORG_UNIT_TREE);
        await this.cacheService.del(CACHE_KEY.POSITION_TREE);

        this.kafkaService.emitEvent(KafkaTopics.ORG_UNIT_ACTION, {
          key: id,
          value: {
            type: KafkaActionType.DELETE,
            data: { id, ...orgUnit, deletedAt: new Date() },
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
      const records = this.orgUnitHandle.parseByNumbering(htmlResult.value, textResult.value);

      if (records.length === 0)
        throw new BadRequestException('Không tìm thấy records nào trong file');

      return await this.bulkUpdateByName(records);
    } catch (error) {
      throw new BadRequestException(`Lỗi đọc file: ${error.message}`);
    }
  }

  private async bulkUpdateByName(records: OrgUnitRecord[]) {
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    return await this.dataSource.transaction(async (manager) => {
      for (let i = 0; i < records.length; i++) {
        const record = records[i];

        try {
          // Tìm org unit theo tên (case insensitive)
          const existingOrgUnit = await manager.findOne(OrgUnit, {
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
          // if (record.field2) updateData.field2 = record.field2; // Thay bằng tên field thực tế
          // if (record.field3) updateData.field3 = record.field3; // Thay bằng tên field thực tế

          if (Object.keys(updateData).length > 0) {
            await manager.update(OrgUnit, { id: existingOrgUnit.id }, updateData);

            results.push({
              index: i + 1,
              id: existingOrgUnit.id,
              name: record.name,
              status: 'success',
              updatedFields: Object.keys(updateData),
            });
            successCount++;
          } else {
            results.push({
              index: i + 1,
              name: record.name,
              status: 'skipped',
              error: 'Không có dữ liệu để update',
            });
          }
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

  async getDivisionForUser(user: UserRequest) {
    const { orgUnitId } = user;
    if (!orgUnitId) return [];

    const orgUnit = await this.orgUnitRepository.findOne({
      where: { id: orgUnitId },
      select: ['id', 'type', 'parentId', 'name'],
    });
    if (!orgUnit) return [];

    let divisionIds: Set<string> = new Set();
    let divisions: any[] = [];

    if (
      [OrgUnitType.BOARD_OF_DIRECTORS, OrgUnitType.DIVISION].includes(orgUnit.type) ||
      [UserType.ADMIN, UserType.ROOT].includes(user.type)
    ) {
      divisions = await this.orgUnitRepository.find({
        where: { type: OrgUnitType.DIVISION.toString() as any },
        select: ['id', 'name', 'type', 'parentId'],
      });
      divisions.forEach((d) => divisionIds.add(d.id));
    } else {
      let currentId = orgUnit.id;
      let currentType = orgUnit.type;
      let parentId = orgUnit.parentId;
      while (currentType !== OrgUnitType.DIVISION && parentId) {
        const parent = await this.orgUnitRepository.findOne({
          where: { id: parentId },
          select: ['id', 'type', 'parentId', 'name'],
        });
        if (!parent) break;
        currentId = parent.id;
        currentType = parent.type;
        parentId = parent.parentId;
      }
      if (currentType === OrgUnitType.DIVISION) {
        divisions = [{ id: currentId, name: orgUnit.name, type: currentType, parentId }];
        divisionIds.add(currentId);
      }
    }

    let whereItem: FindOptionsWhere<ProjectTask> =
      await this.projectTaskHandle.getAllDescendantIdsByUserIdWithPermission(
        [UserType.ADMIN, UserType.ROOT].includes(user.type),
        user,
        {},
      );
    whereItem = {
      ...whereItem,
      parentId: IsNull(),
    };

    const projectTaskIds = await this.projectTaskRepo
      .find({
        where: whereItem,
        select: ['id'],
      })
      .then((tasks) => tasks.map((t) => t.id));

    let assigneeDivisions: any[] = [];
    if (projectTaskIds.length > 0) {
      assigneeDivisions = await this.projectTaskAssigneeRepo
        .createQueryBuilder('pta')
        .leftJoinAndSelect('pta.orgUnit', 'orgUnit')
        .where('pta.projectTaskId IN (:...ids)', { ids: projectTaskIds })
        .andWhere('pta.type = :type', { type: ProjectTaskAssigneeType.DIVISION.toString() })
        .andWhere('orgUnit.type = :ouType', { ouType: OrgUnitType.DIVISION })
        .select(['orgUnit.id', 'orgUnit.name', 'orgUnit.type', 'orgUnit.parentId'])
        .getMany();
      assigneeDivisions.forEach((a) => {
        if (a.orgUnit && !divisionIds.has(a.orgUnit.id)) {
          divisions.push(a.orgUnit);
          divisionIds.add(a.orgUnit.id);
        }
      });
    }

    return divisions;
  }

  async getManagerOrgUnit(id: string) {
    const orgUnit = await this.orgUnitRepository.findOne({
      where: { id },
      relations: ['manager'],
      select: {
        id: true,
        name: true,
        type: true,
        parentId: true,
        managerId: true,
        manager: {
          id: true,
          code: true,
          name: true,
          url: true,
        },
      },
    });

    if (!orgUnit) throw new NotFoundException(`Đơn vị tổ chức không tồn tại`);

    return orgUnit;
  }
}
