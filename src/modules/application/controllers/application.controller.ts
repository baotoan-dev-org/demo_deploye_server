import { Route } from 'src/common/decorators/route.decorator';
import { ApplicationService } from '../services/application.service';
import { Body, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { User } from '@/common/decorators/user.decorator';
import { ApiOperation } from '@nestjs/swagger';
import { CreateApplicationDto } from '../dtos/create-application.dto';
import { GetListApplicationDto } from '../dtos/get-list-application.dto';
import { UpdateApplicationDto } from '../dtos/update-application.dto';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { UserRequest } from '@/common/interfaces/user-request.type';

@Route('application')
export class ApplicationController {
  constructor(private applicationService: ApplicationService) {}

  @ApiOperation({ summary: 'Create application' })
  @Post()
  async createApplication(@Body() createApplicationDto: CreateApplicationDto) {
    return this.applicationService.createApplication(createApplicationDto);
  }

  @ApiOperation({ summary: 'Update application' })
  @JwtAuth()
  @Put(':id')
  async updateApplication(
    @Param('id') id: string,
    @Body() updateApplicationDto: UpdateApplicationDto,
    @User() user: UserRequest,
  ) {
    return this.applicationService.updateApplication(id, updateApplicationDto, user);
  }

  @ApiOperation({ summary: 'Delete application' })
  @JwtAuth()  
  @Delete(':id')
  async deleteApplication(@Param('id') id: string, @User() user: UserRequest) {
    return this.applicationService.deleteApplication(id, user);
  }

  @ApiOperation({ summary: 'Get application history' })
  @JwtAuth()
  @Get(':id/history')
  async getApplicationHistory(@Param('id') id: string) {
    return this.applicationService.getApplicationHistory(id);
  }

  @ApiOperation({ summary: 'Get list application' })
  @JwtAuth()
  @Get()
  async getListApplication(@Query() getListApplicationDto: GetListApplicationDto, @User() user: UserRequest) {
    return this.applicationService.getListApplication(getListApplicationDto, user);
  }

  @ApiOperation({ summary: 'Get application by id' })
  @JwtAuth()
  @Get(':id')
  async getApplication(@Param('id') id: string) {
    return this.applicationService.getApplication(id);
  }
}
