import { Route } from '@/common/decorators/route.decorator';
import { Body, Get, Post, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { GetProjectTaskDashboardDto } from '../dtos/get-project-task-dashboard.dto';
import { ProjectTaskDashboardService } from '../service/project-task-dashboard.service';
import { User } from '@/common/decorators/user.decorator';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { GetListPercentAndUserImplementTaskDashboardDto } from '../dtos/get-list-percent-task-dashboard.dto';
import { GetListProjectByDivisionDto } from '../dtos/get-list-project-by-division.dto';
import { GetListTaskDetailOfProjectDashboardDto } from '../dtos/get-list-task-detail-dashboard.dto';
import { GetListTopUserAndDepartmentDashboardDto } from '../dtos/get-list-top-dashboard.dto';

@Route('project-task-dashboard')
export class ProjectTaskDashboardController {
  constructor(private readonly projectTaskDashboardService: ProjectTaskDashboardService) {}

  @ApiOperation({ summary: 'Get top users and departments with best task performance' })
  @Post('top-users-departments')
  @JwtAuth()
  async getListTopUsersAndDepartments(
    @Body() getListTopUserAndDepartmentDashboardDto: GetListTopUserAndDepartmentDashboardDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskDashboardService.getListTopUsersAndDepartments(
      getListTopUserAndDepartmentDashboardDto,
      user,
    );
  }

  @ApiOperation({ summary: 'Get project task dashboard' })
  @Post()
  @JwtAuth()
  async getProjectTaskDashboard(
    @Body() getProjectTaskDashboardDto: GetProjectTaskDashboardDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskDashboardService.getProjectTaskDashboard(
      getProjectTaskDashboardDto,
      user,
    );
  }

  @ApiOperation({ summary: 'Get project task dashboard' })
  @Post('summary')
  @JwtAuth()
  async getProjectTaskDashboardSummary(
    @Body() getProjectTaskDashboardDto: GetProjectTaskDashboardDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskDashboardService.getProjectTaskDashboardSummary(
      getProjectTaskDashboardDto,
      user,
    );
  }

  @ApiOperation({ summary: 'Get project task dashboard by division' })
  @Get('project')
  @JwtAuth()
  async getListProjectTaskDashboardByDivision(
    @Query() getListProjectByDivisionDto: GetListProjectByDivisionDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskDashboardService.getListProjectTaskDashboardByDivision(
      getListProjectByDivisionDto,
      user,
    );
  }

  @ApiOperation({ summary: 'Get project task dashboard by division' })
  @Post('task-percent-and-user-implement')
  @JwtAuth()
  async getListTaskPercentAndUserImplementProjectTaskDashboard(
    @Body()
    getListPercentAndUserImplementTaskDashboardDto: GetListPercentAndUserImplementTaskDashboardDto,
  ) {
    return this.projectTaskDashboardService.getListTaskPercentAndUserImplementProjectTaskDashboard(
      getListPercentAndUserImplementTaskDashboardDto,
    );
  }

  @ApiOperation({ summary: 'Get detail task of project' })
  @Post('task-detail')
  @JwtAuth()
  async getListTaskDetailOfProject(
    @Body() getListTaskDetailOfProjectDashboardDto: GetListTaskDetailOfProjectDashboardDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskDashboardService.getListTaskDetailOfProject(
      getListTaskDetailOfProjectDashboardDto,
      user,
    );
  }
}
