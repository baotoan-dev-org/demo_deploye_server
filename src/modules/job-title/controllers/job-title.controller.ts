import { User } from '@/common/decorators/user.decorator';
import { Body, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Route } from 'src/common/decorators/route.decorator';
import { CreateJobTitleDto } from '../dtos/create-job-title.dto';
import { GetListJobTitleDto } from '../dtos/get-list-job-title.dto';
import { UpdateJobTitleDto } from '../dtos/update-job-title.dto';
import { JobTitleService } from '../services/job-title.service';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';

@Route('job-title')
export class JobTitleController {
  constructor(private jobTitleService: JobTitleService) {}

  @ApiOperation({ summary: 'Create jobTitle' })
  @JwtAuth()
  @Post()
  async createJobTitle(@Body() createJobTitleDto: CreateJobTitleDto, @User() user: UserRequest) {
    return this.jobTitleService.createJobTitle(createJobTitleDto, user);
  }

  @ApiOperation({ summary: 'Update jobTitle' })
  @JwtAuth()
  @Put(':id')
  async updateJobTitle(
    @Param('id') id: string,
    @Body() updateJobTitleDto: UpdateJobTitleDto,
    @User() user: UserRequest,
  ) {
    return this.jobTitleService.updateJobTitle(id, updateJobTitleDto, user);
  }

  @ApiOperation({ summary: 'Delete jobTitle' })
  @JwtAuth()
  @Delete(':id')
  async deleteJobTitle(@Param('id') id: string) {
    return this.jobTitleService.deleteJobTitle(id);
  }

  @ApiOperation({ summary: 'Get Job titles by user orgUnit' })
  @JwtAuth()
  @Get('by-user-org-units')
  async getJobTitlesByUserOrgUnit(@User() user: UserRequest) {
    return this.jobTitleService.getJobTitlesByUserOrgUnit(user);
  }

  @ApiOperation({ summary: 'Get all jobTitle' })
  @Get('list')
  async getListJobTitle(@Query() getListJobTitleDto: GetListJobTitleDto) {
    return this.jobTitleService.getListJobTitle(getListJobTitleDto);
  }

  @ApiOperation({ summary: 'Get jobTitle by id' })
  @Get(':id')
  async getJobTitle(@Param('id') id: string) {
    return this.jobTitleService.getJobTitle(id);
  }
}
