import { Route } from 'src/common/decorators/route.decorator';
import { JobService } from '../services/job.service';
import { ApiOperation } from '@nestjs/swagger';
import { Body, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { User } from '@/common/decorators/user.decorator';
import { GetListJobDto } from '../dtos/get-list-job.dto';
import { UpdateJobDto } from '../dtos/update-job.dto';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { CreateJobDto } from '../dtos/create-job.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { RejectJobByHRDto } from '../dtos/reject-job-by-hr.dto';

@Route('job')
export class JobController {
  constructor(private jobService: JobService) {}

  @ApiOperation({
    summary: 'Create job',
    description: 'Update job từ recruitment lên thành job tuyển người',
  })
  @JwtAuth()
  @Put(':id')
  createJob(
    @Param('id') id: string,
    @Body() createJobDto: CreateJobDto,
    @User() user: UserRequest,
  ) {
    return this.jobService.createJob(id, createJobDto, user);
  }

  @ApiOperation({ summary: 'Update job' })
  @JwtAuth()
  @Patch(':id')
  updateJob(
    @Param('id') id: string,
    @Body() updateJobDto: UpdateJobDto,
    @User() user: UserRequest,
  ) {
    return this.jobService.updateJob(id, updateJobDto, user);
  }

  @ApiOperation({ summary: 'Delete job' })
  @JwtAuth()
  @Delete(':id')
  deleteJob(@Param('id') id: string) {
    return this.jobService.deleteJob(id);
  }

  @ApiOperation({ summary: 'Get list job' })
  @Post('list')
  getListJob(@Body() getListJobNoteDto: GetListJobDto) {
    return this.jobService.getListJob(getListJobNoteDto);
  }

  @ApiOperation({ summary: 'Get log job' })
  @Get('log/:id')
  @JwtAuth()
  async getJobLog(@Param('id') id: string) {
    return this.jobService.getJobLog(id);
  }

  @ApiOperation({ summary: 'update slug for job'})
  @JwtAuth()
  @Get('update-slug')
  updateSlug(){
    return this.jobService.updateSlug();
  }

  @ApiOperation({ summary: 'Get job' })
  @Get('public/:jobUrl')
  getPublicJobDetail( @Param('jobUrl') jobUrl: string) {
    return this.jobService.getPublicJobDetail(jobUrl);
  }

  @ApiOperation({ summary: 'Get job' })
  @JwtAuth()
  @Get(':id')
  getJob(@Param('id') id: string, @User() user: UserRequest) {
    return this.jobService.getJob(id, user);
  }

  @ApiOperation({ summary: 'HR reject' })
  @JwtAuth()
  @Patch('reject-by-hr/:id')
  rejectJobByHR(
    @Param('id') id: string,
    @Body() rejectJobByHRDto: RejectJobByHRDto,
    @User() user: UserRequest,
  ) {
    return this.jobService.rejectJobByHR(id, rejectJobByHRDto, user);
  }
}
