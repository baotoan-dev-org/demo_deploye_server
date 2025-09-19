import { Route } from 'src/common/decorators/route.decorator';
import { Body, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { UserType } from '../user.enum';
import { ApiOperation } from '@nestjs/swagger';
import { User } from 'src/common/decorators/user.decorator';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { CreateUserMovementDto } from '../dtos/movements/create-user-movement';
import { UserMovementService } from '../services/user-movement.service';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { GetListUserMovementDto } from '../dtos/get-list-user-movement.dto';
import { UpdateUserMovementApproveDto } from '../dtos/movements/update-user-movement-approve.dto';
import { CreateUserMovementNotifyDto } from '../dtos/create-user-movement-notify.dto';
import { GetListApproverDto } from '../dtos/get-list-approver.dto';
import { AddUserFollowersDto } from '../dtos/movements/add-user-followers.dto';
import { DeleteUserFollowersDto } from '../dtos/movements/delete-user-followers.dto';
import { UpdateUserMovementDto } from '../dtos/movements/update-user-movement.dto';

@Route('user-movement')
export class UserMovementController {
  constructor(private userMovementService: UserMovementService) {}

  @ApiOperation({ summary: 'Create user movement' })
  @JwtAuth()
  @Post()
  createUserMovement(
    @Body() createUserMovementDto: CreateUserMovementDto,
    @User() user: UserRequest,
  ) {
    return this.userMovementService.createUserMovement(createUserMovementDto, user);
  }

  @ApiOperation({ summary: 'Tạo notify cho user movement' })
  @Post('notify')
  @JwtAuth()
  createUserMovementNotify(@Body() dto: CreateUserMovementNotifyDto) {
    return this.userMovementService.createUserMovementNotify(dto);
  }

  @ApiOperation({ summary: 'Update user movement approve' })
  @JwtAuth()
  @Put('approve/:approveId')
  updateUserMovementApprove(
    @Param('approveId') approveId: string,
    @Body() updateUserMovementApproveDto: UpdateUserMovementApproveDto,
    @User() user: UserRequest,
  ) {
    return this.userMovementService.updateUserMovementApprove(
      approveId,
      updateUserMovementApproveDto,
      user,
    );
  }

  @ApiOperation({ summary: 'Update user movement' })
  @JwtAuth()
  @Put(':id')
  updateUserMovement(
    @Param('id') id: string,
    @Body() updateUserMovementDto: UpdateUserMovementDto,
    @User() user: UserRequest,
  ) {
    return this.userMovementService.updateUserMovement(id, updateUserMovementDto, user);
  }

  @ApiOperation({ summary: 'add user movement approve' })
  @JwtAuth()
  @Post('add-user-followers')
  addUserFollowers(@Body() addUserFollowersDto: AddUserFollowersDto, @User() user: UserRequest) {
    return this.userMovementService.addUserFollowers(addUserFollowersDto, user);
  }

  @ApiOperation({ summary: 'delete user followers' })
  @JwtAuth()
  @Post('delete-user-follower')
  deleteUserFollowers(
    @Body() deleteUserFollowersDto: DeleteUserFollowersDto,
    @User() user: UserRequest,
  ) {
    return this.userMovementService.deleteUserFollowers(deleteUserFollowersDto, user);
  }

  @ApiOperation({ summary: 'Get user movement manager' })
  @Post('manager')
  @JwtAuth()
  getListUserMovementByManager(
    @Body() getListUserMovementDto: GetListUserMovementDto,
    @User() user: UserRequest,
  ) {
    return this.userMovementService.getListUserMovementByManager(getListUserMovementDto, user);
  }

  @ApiOperation({ summary: 'Get list approver' })
  @Get('approvers')
  @JwtAuth()
  getListApprovers(@Query() getListApproverDto: GetListApproverDto, @User() user: UserRequest) {
    return this.userMovementService.getListApprovers(getListApproverDto, user);
  }

  @ApiOperation({ summary: 'Get list approver pending count' })
  @Get('approver-pending-count')
  @JwtAuth()
  getListApproverPendingCount(@User() user: UserRequest) {
    return this.userMovementService.getListApproverPendingCount(user);
  }

  @ApiOperation({ summary: 'Get user movement history' })
  @Get('approve-history/:id')
  @JwtAuth()
  getUserMovementHistory(@Param('id') id: string, @User() user: UserRequest) {
    return this.userMovementService.getUserMovementHistory(id, user);
  }

  @ApiOperation({ summary: 'Get user movement detail' })
  @Get(':id/approve/:approveId')
  @JwtAuth()
  getApproveDetail(
    @Param('id') id: string,
    @Param('approveId') approveId: string,
    @User() user: UserRequest,
  ) {
    return this.userMovementService.getApproveDetail(id, approveId, user);
  }

  @ApiOperation({ summary: 'Get user movement detail' })
  @Get(':userId/detail')
  @JwtAuth()
  getUserDetail(@Param('userId') id: string, @User() user: UserRequest) {
    return this.userMovementService.getUserDetail(id, user);
  }

  @ApiOperation({ summary: 'Get list user by user movement id' })
  @Get(':id/users')
  @JwtAuth()
  getListUserByUserMovementId(@Param('id') id: string, @User() user: UserRequest) {
    return this.userMovementService.getListUserByUserMovementId(id, user);
  }

  @ApiOperation({ summary: 'Delete user movement' })
  @Delete(':id')
  @JwtAuth()
  deleteUserMovement(@Param('id') id: string, @User() user: UserRequest) {
    return this.userMovementService.deleteUserMovement(id, user);
  }
}
