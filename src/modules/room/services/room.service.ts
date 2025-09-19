import { UserRequest } from '@/common/interfaces/user-request.type';
import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateRoomDto } from '../dtos/create-room.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Room } from '../entities/room.entity';
import { DataSource, DeepPartial, In, Repository } from 'typeorm';
import { GetListRoomDto } from '../dtos/get-list-room.dto';
import { UpdateRoomDto } from '../dtos/update-room.dto';
import { QueryService } from '@/common/services/query.service';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepo: Repository<Room>,

    private readonly dataSource: DataSource,

    private readonly queryService: QueryService,
  ) {}

  /**
   * Validate room name, roomGroup
   */
  async validateRoom(name: string, roomGroupId: string, excludeId?: string) {
    const [existingName, roomGroup] = await Promise.all([
      name
        ? this.roomRepo.exists({
            where: excludeId ? { name, id: In([excludeId]) } : { name },
          })
        : false,
      this.roomRepo.exists({ where: { id: roomGroupId } }),
    ]);
    if (existingName) throw new BadRequestException('Tên phòng đã tồn tại');
    if (!roomGroup) throw new BadRequestException('Nhóm tài nguyên không hợp lệ');
  }

  /**
   * Build entity cho RoomGroup
   */
  buildRoomEntity(data: any, userId: string, isUpdate = false): DeepPartial<Room> {
    return {
      ...data,
      ...(isUpdate ? { updatedById: userId } : { createdById: userId }),
    };
  }

  /**
   * Tạo mới phòng
   * @param createRoomDto DTO chứa thông tin tạo mới phòng
   * @param user Thông tin người dùng thực hiện
   * @returns Kết quả của việc tạo phòng
   * @throws BadRequestException nếu có lỗi trong quá trình tạo phòng
   */
  async createRoom(body: CreateRoomDto, user: UserRequest) {
    const { roomGroupId, name } = body;
    await this.validateRoom(name, roomGroupId);
    const roomInsert = this.buildRoomEntity(body, user.id);
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(Room, roomInsert);
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
   * Lấy danh sách phòng với phân trang, sắp xếp, tìm kiếm
   * @param query DTO chứa thông tin truy vấn
   * @param user Thông tin người dùng thực hiện
   * @return Danh sách phòng và tổng số phòng
   * @throws BadRequestException nếu có lỗi trong quá trình lấy danh sách
   * */
  async getListRoom(query: GetListRoomDto, user: UserRequest) {
    let { page, take, orderBy, order: orderType, search, status, roomGroupId, isRelations } = query;

    let { where, whereItem, relations, select, order } = this.queryService.makeOptions<Room>({
      order: { [orderBy]: orderType },
    });

    if (status) whereItem.status = status;
    if (roomGroupId) whereItem.roomGroupId = roomGroupId;

    if (isRelations) {
      relations.roomGroup = {
        managers: true,
        approvers: true,
        organizationUnits: true,
      };
      select.roomGroup = {
        id: true,
        name: true,
        managers: { id: true, name: true },
        approvers: { id: true, name: true },
        organizationUnits: { id: true, name: true },
      };
    }

    if (search)
      where = this.queryService.search({ arrayPropertyLike: ['name'], search, whereItem });

    const [list, total] = await this.roomRepo.findAndCount({
      ...this.queryService.getPagination({ page, take }),
      select,
      relations,
      where,
      order,
    });

    return { total, list };
  }

  /**
   * Lấy thông tin chi tiết phòng
   * @param id ID phòng cần lấy
   * @param user Thông tin người dùng thực hiện
   * @return Thông tin chi tiết phòng
   * @throws BadRequestException nếu phòng không tồn tại
   */
  async getRoom(id: string, user: UserRequest) {
    const room = await this.roomRepo.findOne({
      where: { id },
      relations: {
        roomGroup: { managers: true, approvers: true, organizationUnits: true },
      },
      select: {
        roomGroup: {
          id: true,
          name: true,
          managers: { id: true, name: true },
          approvers: { id: true, name: true },
          organizationUnits: { id: true, name: true },
        },
      },
    });
    if (!room) throw new BadRequestException('Phòng không tồn tại');
    return room;
  }

  /**
   * Cập nhật phòng
   * @param id ID phòng cần cập nhật
   * @param user Thông tin người dùng thực hiện
   * @param body DTO chứa thông tin cập nhật phòng
   * @return Kết quả của việc cập nhật phòng
   * @throws BadRequestException nếu có lỗi trong quá trình cập nhật phòng
   */
  async updateRoom(id: string, user: UserRequest, body: UpdateRoomDto) {
    const { roomGroupId, name } = body;
    await this.validateRoom(name, roomGroupId, id);
    const roomUpdate = this.buildRoomEntity(body, user.id, true);
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.update(Room, { id }, roomUpdate);
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
   * Xoá phòng
   * @param id ID phòng cần xoá
   * @param user Thông tin người dùng thực hiện
   * @return Kết quả của việc xoá phòng
   * @throws BadRequestException nếu có lỗi trong quá trình xoá phòng
   */
  async deleteRoom(id: string, user: UserRequest) {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.delete(Room, { id });
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
