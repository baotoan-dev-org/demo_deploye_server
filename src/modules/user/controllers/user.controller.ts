import { UserService } from '../services/user.service';
import { Route } from 'src/common/decorators/route.decorator';
import { Body, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { UserType } from '../user.enum';
import { ApiHeader, ApiOperation } from '@nestjs/swagger';
import { JwtAuthUserTypes } from 'src/common/decorators/jwt-auth-user-types.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { JwtAuth } from 'src/common/decorators/jwt-auth.decorator';
import { GetListUserDto } from '../dtos/get-list-user.dto';
import { UpdateAccountDto } from '../dtos/update-account.dto';
import { SkipPermission } from '@/common/decorators/skip-permission.decorator';
import { CreateUserRelationDto } from '../dtos/relations/create-user-relation.dto';
import { UpdateUserRelationDto } from '../dtos/relations/update-user-relation.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { GetListUserByUnitsDto } from '../dtos/get-list-user-by-units.dto';
import { Response } from 'express';
import { Res } from '@nestjs/common';
import { GetListUserExportExcelDto } from '../dtos/get-list-user-export-excel.dto';
import { GetListUserOrgUnitDto } from '../dtos/get-list-user-org-unit.dto';
import { JwtExternalAuth } from '@/common/decorators/jwt-external-auth.decorator';
@Route('user')
export class UserController {
  constructor(private userService: UserService) {}

  @ApiOperation({ summary: 'Thêm mới nhân sự' })
  @JwtAuth()
  @Post()
  createUserRelation(
    @Body() createUserRelationDto: CreateUserRelationDto,
    @User() user: UserRequest,
  ) {
    return this.userService.createUserRelation(createUserRelationDto, user);
  }

  @ApiOperation({ summary: 'Xuất file excel' })
  @JwtAuth()
  @Post('export')
  async exportUser(
    @Body() getListUserExportExcelDto: GetListUserExportExcelDto,
    @User() user: UserRequest,
    @Res() res: Response,
  ) {
    const buffer = await this.userService.exportUser(getListUserExportExcelDto, user);

    // Set headers để browser hiểu đây là file download
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="users-${new Date().toISOString()}.xlsx"`,
      'Content-Length': buffer.byteLength,
    });

    res.send(buffer);
  }

  @ApiOperation({ summary: 'Cập nhật nhân sự' })
  @JwtAuth()
  @Put(':id')
  updateUserRelation(
    @Param('id') id: string,
    @Body() updateUserRelationDto: UpdateUserRelationDto,
    @User() user: UserRequest,
  ) {
    return this.userService.updateUserRelation(id, updateUserRelationDto, user);
  }

  @ApiOperation({ summary: 'Khôi phục đơn vị tổ chức' })
  @JwtAuth()
  @Patch(':id/restore')
  async restoreUser(@Param('id') id: string, @User() user: UserRequest) {
    return await this.userService.restoreUser(id, user);
  }

  @ApiOperation({ summary: 'Cập nhật tài khoản' })
  @JwtAuth()
  @Patch()
  updateAccount(@Body() updateAccountDto: UpdateAccountDto, @User() user: UserRequest) {
    return this.userService.updateAccount(updateAccountDto, user);
  }

  @ApiOperation({ summary: 'Xóa vào thùng rác nhân sự' })
  @JwtAuth()
  @Delete('soft-delete/:id')
  removeUser(@Param('id') id: string, @User() user: UserRequest) {
    return this.userService.removeUser(id, user);
  }

  @ApiOperation({ summary: 'Xóa nhân sự' })
  @JwtAuth()
  @Delete(':id')
  deleteUser(@Param('id') id: string, @User() user: UserRequest) {
    return this.userService.deleteUser(id, user);
  }

  @ApiOperation({ summary: 'Lấy danh sách nhân sự' })
  @Post('list')
  @JwtAuth()
  getListUser(@Body() getListUserDto: GetListUserDto, @User() user: UserRequest) {
    return this.userService.getListUser(getListUserDto, user);
  }

  @ApiOperation({ summary: 'Lấy danh sách nhân sự mối quan hệ' })
  @Post('list/relations')
  @JwtAuth()
  getListUserRelations(@Body() getListUserDto: GetListUserDto, @User() user: UserRequest) {
    return this.userService.getListUserRelations(getListUserDto, user);
  }

  @ApiOperation({ summary: 'Lấy danh sách nhân sự đã xóa' })
  @Get('list/restore')
  @JwtAuth()
  getListUserRestore(@Query() getListUserDto: GetListUserDto, @User() user: UserRequest) {
    return this.userService.getListUserRestore(getListUserDto, user);
  }

  @ApiOperation({ summary: 'Lấy danh sách nhân sự đã xóa' })
  @Get('restore/detail/:id')
  @JwtAuth()
  getListUserRestoreDetail(@Param('id') id: string) {
    return this.userService.getListUserRestoreDetail(id);
  }

  @ApiOperation({ summary: 'Lấy danh sách nhân sự và tất cả đơn vị cấp cha (Mes - ERP)' })
  @Post('list/relation-ancestor-org-unit')
  @JwtExternalAuth()
  getListUserRelationAncestorOrgUnit(
    @Body() getListUserOrgUnitDto: GetListUserOrgUnitDto,
    @User() user: UserRequest,
  ) {
    return this.userService.getListUserRelationAncestorOrgUnit(getListUserOrgUnitDto);
  }

  @ApiOperation({ summary: 'Lấy danh sách nhân sự theo đơn vị và vị trí' })
  @Get('user-org-unit-position/:userId')
  @JwtAuth()
  getListUserUnitPosition(@Param('userId') userId: string) {
    return this.userService.getListUserUnitPosition(userId);
  }

  @ApiOperation({ summary: 'Lấy danh sách nhân sự theo đơn vị' })
  @Post('by-unit')
  @JwtAuth()
  getListUserByUnit(
    @Body() getListUserByUnitsDto: GetListUserByUnitsDto,
    @User() user: UserRequest,
  ) {
    return this.userService.getListUserByUnit(getListUserByUnitsDto, user);
  }

  // api use for recruitment
  @ApiOperation({ summary: 'Get user hr' })
  @Get('assignedHrForUser')
  @ApiHeader({
    name: 'x-user-unit-position-id',
    required: true,
    schema: { type: 'string' },
  })
  @JwtAuth()
  getAssignedHrForUser(@User() user: UserRequest) {
    return this.userService.getAssignedHrForUser(user);
  }

  @ApiOperation({ summary: 'Lấy lịch sử nhân sự' })
  @Get('user-history/:id')
  @JwtAuth()
  getUserHistory(@Param('id') id: string, @User() user: UserRequest) {
    return this.userService.getUserHistory(id, user);
  }

  @ApiOperation({ summary: 'Lấy lịch sử đề xuất nhân sự' })
  @Get(':userId/history')
  @JwtAuth()
  getUserMovementHistory(@Param('userId') id: string, @User() user: UserRequest) {
    return this.userService.getUserMovementHistory(id, user);
  }

  @ApiOperation({ summary: 'Lấy danh sách quản lý gần nhất' })
  @Get('nearest-managers/current')
  @JwtAuth()
  getNearestManagersByCurrentUser(@User() user: UserRequest) {
    return this.userService.getNearestManagersByUserRequest(user);
  }

  @ApiOperation({ summary: 'Tạo mã nhân sự tiếp theo' })
  @Get('generate-next-user-code')
  @JwtAuth()
  generateNextUserCode() {
    return this.userService.generateNextUserCode();
  }

  @ApiOperation({ summary: 'Lấy ngày onboard cũ nhất' })
  @Get('oldest-onboard-date')
  @JwtAuth()
  getOldestOnboardDate() {
    return this.userService.getOldestOnboardDate();
  }

  /// API dùng cho tuyển dụng
  @ApiOperation({ summary: 'check mã số nhân viên' })
  @Get('check-user-code/:code')
  checkUserCode(@Param('code') code: string) {
    return this.userService.checkUserCode(code);
  }

  @ApiOperation({ summary: 'Lấy thông tin nhân sự' })
  @ApiHeader({
    name: 'x-api-key',
    description: 'Optional API Key for extra validation',
    required: false,
  })
  @Get(':idOrCode')
  @JwtAuth()
  @SkipPermission()
  getUser(@Param('idOrCode') idOrCode: string) {
    return this.userService.getUser(idOrCode);
  }
}
