import { Body, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { RoomGroupService } from '../services/room-group.service';
import { ApiOperation } from '@nestjs/swagger';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { GetListRoomGroupDto } from '../dtos/get-list-room-group.dto';
import { User } from '@/common/decorators/user.decorator';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { Route } from '@/common/decorators/route.decorator';
import { CreateRoomGroupDto } from '../dtos/create-room-group.dto';
import { UpdateRoomGroupDto } from '../dtos/update-room-group.dto';

@Route('room-group')
export class RoomGroupController {
  constructor(private readonly roomGroupService: RoomGroupService) {}

  @ApiOperation({ summary: 'Create room group' })
  @Post()
  @JwtAuth()
  async createRoomGroup(@Body() body: CreateRoomGroupDto, @User() user: UserRequest) {
    return this.roomGroupService.createRoomGroup(body, user);
  }

  @ApiOperation({ summary: 'Get list room groups' })
  @Get()
  @JwtAuth()
  async getListRoomGroup(@Query() query: GetListRoomGroupDto, @User() user: UserRequest) {
    return this.roomGroupService.getListRoomGroup(query, user);
  }

  @ApiOperation({ summary: 'Get room group' })
  @Get(':id')
  @JwtAuth()
  async getRoomGroup(@Param('id') id: string, @User() user: UserRequest) {
    return this.roomGroupService.getRoomGroup(id, user);
  }

  @ApiOperation({ summary: 'Update room group' })
  @Put(':id')
  @JwtAuth()
  async updateRoomGroup(
    @Param('id') id: string,
    @User() user: UserRequest,
    @Body() body: UpdateRoomGroupDto,
  ) {
    return this.roomGroupService.updateRoomGroup(id, body, user);
  }

  @Delete(':id')
  @JwtAuth()
  @ApiOperation({ summary: 'Delete room group' })
  async deleteRoomGroup(@Param('id') id: string, @User() user: UserRequest) {
    return this.roomGroupService.deleteRoomGroup(id, user);
  }
}
