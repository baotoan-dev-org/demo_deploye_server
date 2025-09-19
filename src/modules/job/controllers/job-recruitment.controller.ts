import { Route } from 'src/common/decorators/route.decorator';
import { ApiOperation } from '@nestjs/swagger';
import { Body, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { User } from '@/common/decorators/user.decorator';
import { CreateManyJobRecruitmentDto } from '../dtos/create-job-recruitment.dto';
import { GetListJobRecruitmentDto } from '../dtos/get-list-job-recruitment.dto';
import { JobRecruitmentService } from '../services/job-recruitment.service';
import { UpdateJobRecruitmentDto } from '../dtos/update-job-recruitment.dto';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { ApproveJobRecruitmentDto, ApproveMultipleGroupRequestDto, ApproveMultipleJobRecruitmentDto } from '../dtos/approve-job-recruitment.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { GetListNeedApproveByUserDto } from '../dtos/get-list-need-approve-by-user.dto';
import { GetListDeleteJobRecruitmentDto } from '../dtos/get-list-delete-job-cruitment.dto';

@Route('job-recruitment')
export class JobRecruitmentController {
  constructor(private jobRecruitmentService: JobRecruitmentService) {}


  @ApiOperation({ summary: 'Create many job recruitment' })
  @Post()
  @JwtAuth()
  createManyJobRecruitment(
    @Body() createManyJobRecruitmentDto: CreateManyJobRecruitmentDto,
    @User() user: UserRequest,
  ) {
    return this.jobRecruitmentService.createManyJobRecruitment(createManyJobRecruitmentDto, user);
  }

  @ApiOperation({ summary: 'Update job recruitment' })
  @JwtAuth()
  @Put(':id')
  updateJobRecruitment(
    @Param('id') id: string,
    @Body() updateJobRecruitmentDto: UpdateJobRecruitmentDto,
    @User() user: UserRequest,
  ) {
    return this.jobRecruitmentService.updateJobRecruitment(id, updateJobRecruitmentDto, user);
  }

  @ApiOperation({ summary: 'Delete job recruitment' })
  @JwtAuth()
  @Delete(':id')
  deleteJobRecruitment(@Param('id') id: string, @User() user: UserRequest) {
    return this.jobRecruitmentService.deleteJobRecruitment(id, user);
  }

  @ApiOperation({ summary: 'Get list job recruitment' })
  @JwtAuth()
  @Post('list')
  getListJobRecruitment(@Body() getListJobRecruitmentDto: GetListJobRecruitmentDto, @User() user: UserRequest) {
    return this.jobRecruitmentService.getListJobRecruitment(getListJobRecruitmentDto, user);
  }

  @ApiOperation({ summary: 'Get list job recruitment need approve by id user' })
  @Get('list-need-approve-by-user')
  @JwtAuth()
  getListNeedApprovalByUser(@Query() getListNeedApproveByUserDto: GetListNeedApproveByUserDto, @User() user: UserRequest) {
    return this.jobRecruitmentService.getListNeedApproveByUser(getListNeedApproveByUserDto, user);
  }

  @ApiOperation({ summary: 'Get list job delete recruitment' })
  @JwtAuth()
  @Get('list-delete')
  getListDeleteJobRecruitment(@Param() getListDeleteJobRecruitmentDto: GetListDeleteJobRecruitmentDto,  @User() user: UserRequest) {
    return this.jobRecruitmentService.getListDeleteJobRecruitment(getListDeleteJobRecruitmentDto, user);
  }

  @ApiOperation({ summary: 'Get detail job recruitment need approve by id user' })
  @JwtAuth()
  @Get('approve/:id')
  getNeedApproveDetail(@Param('id') id: string, @User() user: UserRequest) {
    return this.jobRecruitmentService.getNeedApproveDetail(id, user);
  }

  @ApiOperation({ summary: 'Get job recruitment' })
  @JwtAuth()
  @Get(':id')
  getJobRecruitment(@Param('id') id: string) {
    return this.jobRecruitmentService.getJobRecruitment(id);
  }

  @ApiOperation({ summary: 'restore data delete' })
  @JwtAuth()
  @Patch('restore/:id') // id của job
  async restoreDeletedData(
    @Param('id') id: string,
    @User() user: UserRequest,
  ) {
    return this.jobRecruitmentService.restoreDeletedData(id, user);
  }

  @ApiOperation({summary: 'Approve job recruitment'})
  @JwtAuth()
  @Patch('approve/:id') // id của job recruitment
  async approveJobRecruitment(
    @Param('id') id: string,  
    @Body() dto: ApproveJobRecruitmentDto,
    @User() user: UserRequest,
  ) {
    return this.jobRecruitmentService.approveJobRecruitment(id, dto, user);
  } 
  
  @ApiOperation({ summary: 'Approve multi job recruitments' })
  @JwtAuth()
  @Patch(':id') // id của request group
  // @Post('approve-multiple')
  async approveMultipleJobRecruitments(
    @Param('id') id: string,
    @Body() dto: ApproveMultipleJobRecruitmentDto,
    @User() user: UserRequest,
  ) {
    return this.jobRecruitmentService.approveMultipleJobRecruitments(id, dto, user);
  }

  @ApiOperation({ summary: 'Approve multi group job recruitment' })
  @JwtAuth()
  @Post('approve-multiple-group') 
  async approveMultipleGroupJobRequest(
    @Body() dto: ApproveMultipleGroupRequestDto,
    @User() user: UserRequest,
  ) {
    return this.jobRecruitmentService.approveMultipleGroupJobRequest(dto, user);
  }

}
