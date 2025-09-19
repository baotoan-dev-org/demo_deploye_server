import { Body, Get, Post, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ExternalService } from '../services/external.service';
import { Route } from 'src/common/decorators/route.decorator';
import { JwtExternalAuth } from '@/common/decorators/jwt-external-auth.decorator';
import { UserType } from '@/modules/user/user.enum';
import { JwtAuthUserTypes } from '@/common/decorators/jwt-auth-user-types.decorator';
import { GetListUserOrgUnitDto } from '@/modules/user/dtos/get-list-user-org-unit.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { User } from '@/common/decorators/user.decorator';
import { UserService } from '@/modules/user/services/user.service';
import { GetListOrgUnitDto } from '@/modules/org-unit/dtos/get-list-org-unit.dto';
import { OrgUnitService } from '@/modules/org-unit/services/org-unit.service';
import { PositionService } from '@/modules/position/services/position.service';
import { GetListPositionDto } from '@/modules/position/dtos/get-list-position.dto';
import { GetListUserOrgPositionDto } from '@/modules/user/dtos/get-list-user-org-position.dto';

@Route('external')
export class ExternalController {
  constructor(
    private externalService: ExternalService,

    private userService: UserService,

    private orgUnitService: OrgUnitService,

    private positionService: PositionService,
  ) {}

  @ApiOperation({ summary: 'Generate external token' })
  @JwtAuthUserTypes(UserType.ROOT)
  @Post('generate-external-token')
  generateExternalToken() {
    return this.externalService.generateExternalToken();
  }

  @ApiOperation({ summary: 'IOOO send notification' })
  @JwtExternalAuth()
  @Post('iooo-send-notification')
  ioooSendNotification() {
    return this.externalService.ioooSendNotification();
  }

  @ApiOperation({ summary: 'Lấy danh sách nhân sự và tất cả đơn vị cấp cha (Mes - ERP)' })
  @Post('user/list/relation-ancestor-org-unit')
  @JwtExternalAuth()
  getListUserRelationAncestorOrgUnit(@Body() getListUserOrgUnitDto: GetListUserOrgUnitDto) {
    return this.userService.getListUserRelationAncestorOrgUnit(getListUserOrgUnitDto);
  }

  @ApiOperation({ summary: 'Lấy danh sách đơn vị tổ chức (Mes - ERP)' })
  @JwtExternalAuth()
  @Get('org-unit/list')
  async getListOrgUnit(@Query() getListOrgUnitDto: GetListOrgUnitDto) {
    return this.orgUnitService.getListOrgUnit(getListOrgUnitDto);
  }

  @ApiOperation({ summary: 'Lấy danh sách chức vụ (Mes - ERP)' })
  @JwtExternalAuth()
  @Get('position/list')
  async getListPosition(@Query() getListPositionDto: GetListPositionDto) {
    return this.positionService.getListPosition(getListPositionDto);
  }

  @ApiOperation({ summary: 'Lấy danh sách quan hệ nhân sự - đơn vị - chức vụ (Mes - ERP)' })
  @JwtExternalAuth()
  @Get('user-org-unit-position/list')
  async getListUserOrgPosition(@Query() getListUserOrgPositionDto: GetListUserOrgPositionDto) {
    return this.userService.getListUserOrgPosition(getListUserOrgPositionDto);
  }
}
