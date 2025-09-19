import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { RoomService } from '../services/room.service';
import { Route } from '@/common/decorators/route.decorator';
import { CreateRoomDto } from '../dtos/create-room.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { Post, Body, Get, Query, Param, Put, Delete } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { User } from '@/common/decorators/user.decorator';
import { GetListRoomDto } from '../dtos/get-list-room.dto';
import { UpdateRoomDto } from '../dtos/update-room.dto';

@Route('room')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  @ApiOperation({ summary: 'Create room' })
  @Post()
  @JwtAuth()
  async createRoom(@Body() body: CreateRoomDto, @User() user: UserRequest) {
    return this.roomService.createRoom(body, user);
  }

  @ApiOperation({ summary: 'Get list rooms ' })
  @Get()
  @JwtAuth()
  async getListRoomGroup(@Query() query: GetListRoomDto, @User() user: UserRequest) {
    return this.roomService.getListRoom(query, user);
  }

  @ApiOperation({ summary: 'Get room' })
  @Get(':id')
  @JwtAuth()
  async getRoom(@Param('id') id: string, @User() user: UserRequest) {
    return this.roomService.getRoom(id, user);
  }

  @ApiOperation({ summary: 'Update room' })
  @Put(':id')
  @JwtAuth()
  async updateRoom(
    @Param('id') id: string,
    @User() user: UserRequest,
    @Body() body: UpdateRoomDto,
  ) {
    return this.roomService.updateRoom(id, user, body);
  }

  @Delete(':id')
  @JwtAuth()
  @ApiOperation({ summary: 'Delete room' })
  async deleteRoom(@Param('id') id: string, @User() user: UserRequest) {
    return this.roomService.deleteRoom(id, user);
  }
}
