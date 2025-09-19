import { GetListRoomGroupDto } from '../dtos/get-list-room-group.dto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RoomGroup } from '../entities/room-group.entity';
import { DataSource, DeepPartial, In, Repository } from 'typeorm';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { QueryService } from '@/common/services/query.service';
import { CreateRoomGroupDto } from '../dtos/create-room-group.dto';
import { UpdateRoomGroupDto } from '../dtos/update-room-group.dto';
import { User } from '@/modules/user/entities/user.entity';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';

@Injectable()
export class RoomGroupService {
  constructor(
    @InjectRepository(RoomGroup)
    private readonly roomGroupRepo: Repository<RoomGroup>,

    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(OrgUnit)
    private readonly orgUnitRepo: Repository<OrgUnit>,

    private readonly queryService: QueryService,

    private readonly dataSource: DataSource,
  ) {}

  /**
   * Validate managers, approvers, organizationUnits, name
   */
  async validateRoomGroup(
    managers: string[],
    approvers: string[],
    organizationUnits: string[],
    name: string,
    excludeId?: string,
  ) {
    const allUserIds = [...new Set([...managers, ...approvers])];
    const allOrgUnitIds = [...new Set([...organizationUnits])];
    const [allUsersCount, organizationUnitsCount, existingName] = await Promise.all([
      allUserIds.length > 0 ? this.userRepo.count({ where: { id: In(allUserIds) } }) : 0,
      allOrgUnitIds.length > 0 ? this.orgUnitRepo.count({ where: { id: In(allOrgUnitIds) } }) : 0,
      name
        ? this.roomGroupRepo.exists({ where: excludeId ? { name, id: In([excludeId]) } : { name } })
        : false,
    ]);
    if (existingName) throw new BadRequestException('Tên nhóm tài nguyên đã tồn tại');
    if (allUserIds.length > 0 && allUsersCount !== allUserIds.length)
      throw new BadRequestException('Một hoặc nhiều người dùng trong danh sách không hợp lệ');
    if (organizationUnits.length > 0 && organizationUnitsCount !== organizationUnits.length)
      throw new BadRequestException('Danh sách đơn vị sử dụng không hợp lệ');
  }

  /**
   * Build entity cho RoomGroup
   */
  buildRoomGroupEntity(
    data: CreateRoomGroupDto,
    userId: string,
    isUpdate = false,
  ): DeepPartial<RoomGroup> {
    return {
      ...data,
      managers: data.managers?.length > 0 ? data.managers.map((id: string) => ({ id })) : [],
      approvers: data.approvers?.length > 0 ? data.approvers.map((id: string) => ({ id })) : [],
      organizationUnits:
        data.organizationUnits?.length > 0
          ? data.organizationUnits.map((id: string) => ({ id }))
          : [],
      ...(isUpdate ? { updatedById: userId } : { createdById: userId }),
    };
  }

  /**
   * Tạo mới room group với validation đầy đủ
   * @param createRoomGroupDto DTO chứa thông tin tạo mới room group
   * @param user Thông tin user thực hiện hành
   * @return Kết quả tạo mới room group
   * @throws BadRequestException nếu có lỗi trong quá trình tạo
   */
  async createRoomGroup(createRoomGroupDto: CreateRoomGroupDto, user: UserRequest) {
    const { managers = [], approvers = [], organizationUnits = [], name } = createRoomGroupDto;
    await this.validateRoomGroup(managers, approvers, organizationUnits, name);
    const roomGroupInsert = this.buildRoomGroupEntity(createRoomGroupDto, user.id);
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(RoomGroup, roomGroupInsert);
      });
      return { success: true };
    } catch (err) {
      throw new BadRequestException({
        message: err.message,
        code: err.code,
        success: false,
      });
    }
  }

  /**
   * Lấy danh sách room group với phân trang, filter, search
   * @param getListRoomGroupDto DTO chứa các tham số phân trang, filter, search
   * @param user Thông tin user thực hiện hành
   * @return Danh sách room group thỏa mã
   */
  async getListRoomGroup(getListRoomGroupDto: GetListRoomGroupDto, user: UserRequest) {
    let {
      page,
      take,
      orderBy,
      order: orderType,
      search,
      status,
      isRelations,
    } = getListRoomGroupDto;

    let { where, whereItem, relations, select, order } = this.queryService.makeOptions<RoomGroup>({
      order: { [orderBy]: orderType },
    });

    if (status) whereItem.status = status;

    if (isRelations) {
      relations.managers = true;
      relations.approvers = true;
      relations.organizationUnits = true;
      select.managers = {
        id: true,
        name: true,
        url: true,
      };
      select.approvers = {
        id: true,
        name: true,
        url: true,
      };
      select.organizationUnits = {
        id: true,
        name: true,
      };
    }

    if (search)
      where = this.queryService.search({ arrayPropertyLike: ['name'], search, whereItem });

    const [list, total] = await this.roomGroupRepo.findAndCount({
      ...this.queryService.getPagination({ page, take }),
      select,
      relations,
      where,
      order,
    });

    return { total, list };
  }

  /**
   * Lấy chi tiết room group theo ID
   * @param id ID của room group
   * @param user Thông tin user thực hiện hành
   * @returns Chi tiết room group hoặc lỗi nếu không tìm thấy
   */
  async getRoomGroup(id: string, user: UserRequest) {
    const roomGroup = await this.roomGroupRepo.findOne({
      where: { id },
      relations: {
        managers: true,
        approvers: true,
        organizationUnits: true,
      },
      select: {
        managers: {
          id: true,
          name: true,
          url: true,
        },
        approvers: {
          id: true,
          name: true,
          url: true,
        },
        organizationUnits: {
          id: true,
          name: true,
        },
      },
    });
    if (!roomGroup) throw new BadRequestException('Nhóm tài nguyên không tồn tại');

    return roomGroup;
  }

  /**
   * Cập nhật room group với validation đầy đủ
   * @param id ID của room group cần cập nhật
   * @param body DTO chứa thông tin cập nhật
   * @param user Thông tin user thực hiện hành
   * @return Kết quả cập nhật room group
   * @throws BadRequestException nếu có lỗi trong quá trình cập nhật
   */
  async updateRoomGroup(id: string, body: UpdateRoomGroupDto, user: UserRequest) {
    const { managers = [], approvers = [], organizationUnits = [], name } = body;
    const roomGroup = await this.roomGroupRepo.findOne({ where: { id } });
    if (!roomGroup) throw new BadRequestException('Nhóm tài nguyên không tồn tại');
    await this.validateRoomGroup(managers, approvers, organizationUnits, name, id);
    const roomGroupUpdate = this.buildRoomGroupEntity(body as CreateRoomGroupDto, user.id, true);
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(RoomGroup, id, roomGroupUpdate);
      });
      return { success: true };
    } catch (err) {
      throw new BadRequestException({
        message: err.message,
        code: err.code,
        success: false,
      });
    }
  }

  /**
   * Xóa room group theo ID
   * @param id ID của room group cần xóa
   * @param user Thông tin user thực hiện hành
   * @return Kết quả xóa room group
   * @throws BadRequestException nếu có lỗi trong quá trình xóa
   * */
  async deleteRoomGroup(id: string, user: UserRequest) {
    const roomGroup = await this.roomGroupRepo.findOne({ where: { id } });
    if (!roomGroup) throw new BadRequestException('Nhóm tài nguyên không tồn tại');

    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.delete(RoomGroup, id);
      });
      return { success: true };
    } catch (err) {
      throw new BadRequestException({
        message: err.message,
        code: err.code,
        success: false,
      });
    }
  }
}
