import { Route } from '@/common/decorators/route.decorator';
import { ProjectTaskService } from '../service/project-task.service';
import {
  Body,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { CreateProjectTaskDto } from '../dtos/create-project-task.dto';
import { ApiBody, ApiConsumes, ApiOperation, ApiProperty } from '@nestjs/swagger';
import { User } from '@/common/decorators/user.decorator';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { GetListProjectTaskDto } from '../dtos/get-list-project-task.dto';
import { UpdateProjectTaskDto } from '../dtos/update-project-task.dto';
import { UpdateProjectTaskProgressDto } from '../dtos/update-project-task-progress.dto';
import { GetListProjectTaskChildrenDto } from '../dtos/get-list-project-task-children.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { GetListProjectTaskDelayReasonDto } from '../dtos/get-list-project-task-delay-reason.dto';
import { UpdateProjectTaskDelayReasonDto } from '../dtos/update-project-task-delay-reason.dto';
import { GetListProjectTaskTodoDto } from '../dtos/get-list-project-task-todo.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { GetListProjectTaskAssigneeDto } from '../dtos/get-list-project-task-assignee.dto';
import { ProjectTaskImportService } from '../service/project-task-import.service';
import { GetListProjectTasksByDivisionDto } from '../dtos/get-list-project-task-by-division.dto';
@Route('project-task')
export class ProjectTaskController {
  constructor(
    private readonly projectTaskService: ProjectTaskService,
    private readonly projectTaskImportService: ProjectTaskImportService,
  ) {}

  @Get('fixData')
  @ApiOperation({ summary: 'Fix data project task' })
  async fixData() {
    return this.projectTaskService.fixData();
  }

  @Post('imports-project-task')
  @ApiOperation({ summary: 'Import project tasks từ file Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File Excel chứa thông tin project tasks',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @JwtAuth()
  @UseInterceptors(FileInterceptor('file'))
  async importProjectTasksFromExcel(
    @UploadedFile() file: Express.Multer.File,
    @User() user: UserRequest,
    @Res() res,
  ) {
    const result = await this.projectTaskImportService.importProjectTasksFromExcel(
      file.buffer,
      user,
    );

    return res.json(result);
  }

  @ApiOperation({ summary: 'Create project task' })
  @Post()
  @JwtAuth()
  async createProjectTask(@Body() dto: CreateProjectTaskDto, @User() user: UserRequest) {
    return this.projectTaskService.createProjectTask(dto, user);
  }

  @ApiOperation({ summary: 'Get project task delay reasons' })
  @Get('delay-reasons')
  @JwtAuth()
  async getListDelayReason(@Query() query: GetListProjectTaskDelayReasonDto) {
    return this.projectTaskService.getListDelayReason(query);
  }

  @ApiOperation({ summary: 'Get project tasks overview assigned to current user' })
  @Get('overview')
  @JwtAuth()
  async getListProjectTasksByDivision(
    @Query() query: GetListProjectTasksByDivisionDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskService.getListProjectTasksByDivision(query, user);
  }

  @ApiOperation({ summary: 'Get project tasks assigned to current user' })
  @Get('assigned-to-me')
  @JwtAuth()
  async getListAssignedProjectTasks(
    @Query() query: GetListProjectTaskAssigneeDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskService.getListAssignedProjectTasks(query, user);
  }

  @ApiOperation({ summary: 'Get list to do' })
  @Get('todo')
  @JwtAuth()
  async getListProjectTaskToDo(
    @Query() getListProjectTaskTodoDto: GetListProjectTaskTodoDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskService.getListProjectTaskToDo(getListProjectTaskTodoDto, user);
  }

  @ApiOperation({ summary: 'Update project task progress' })
  @JwtAuth()
  @Put(':id/progress-and-budget')
  async updateProjectTaskProgressAndBudget(
    @Param('id') id: string,
    @Body() updateProjectTaskProgressDto: UpdateProjectTaskProgressDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskService.updateProjectTaskProgressAndBudget(
      id,
      updateProjectTaskProgressDto,
      user,
    );
  }

  @ApiOperation({ summary: 'Update project task' })
  @JwtAuth()
  @Put(':id')
  async updateProjectTask(
    @Param('id') id: string,
    @Body() dto: UpdateProjectTaskDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskService.updateProjectTask(id, dto, user);
  }

  @ApiOperation({
    summary: 'Update project task delay reasons',
  })
  @JwtAuth()
  @Put(':id/delay-reasons')
  async updateProjectTaskDelayReasons(
    @Param('id') id: string,
    @Body() updateProjectTaskDelayReasonDto: UpdateProjectTaskDelayReasonDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskService.updateProjectTaskDelayReasons(
      id,
      updateProjectTaskDelayReasonDto,
      user,
    );
  }

  @ApiOperation({ summary: 'Delete project task by id' })
  @Delete(':id')
  @JwtAuth()
  async deleteProjectTask(@Param('id') id: string, @User() user: UserRequest) {
    return this.projectTaskService.deleteProjectTask(id, user);
  }

  @ApiOperation({ summary: 'Get list project parent' })
  @Get('parent')
  @JwtAuth()
  async getListProjectParent(
    @Query() getListProjectTaskDto: GetListProjectTaskDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskService.getListProjectParent(getListProjectTaskDto, user);
  }

  @ApiOperation({ summary: 'Get list project task' })
  @Post('list')
  @JwtAuth()
  async getListProjectTask(
    @Body() getListProjectTaskDto: GetListProjectTaskDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskService.getListProjectTask(getListProjectTaskDto, user);
  }

  @ApiProperty({
    description: 'Get list project task for Gantt chart',
  })
  @Get('tree')
  @JwtAuth()
  async getListProjectTaskTree(
    @Query() getListProjectTaskDto: GetListProjectTaskDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskService.getListProjectTaskTree(getListProjectTaskDto, user);
  }

  @ApiOperation({ summary: 'Get list project task' })
  @Get('grant-chart')
  @JwtAuth()
  async getListProjectTaskGrantChart(
    @Query() getListProjectTaskDto: GetListProjectTaskDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskService.getListProjectTaskGrantChart(getListProjectTaskDto, user);
  }

  @ApiOperation({ summary: 'Get list project task by parent id' })
  @Get(':id/children/task')
  @JwtAuth()
  async getListTaskById(@Param('id') id: string) {
    return this.projectTaskService.getListTaskById(id);
  }

  @ApiOperation({ summary: 'Get list project task' })
  @Get(':id/status')
  @JwtAuth()
  async getListProjectTaskStatus(@Param('id') id: string) {
    return this.projectTaskService.getListProjectTaskStatus(id);
  }

  @ApiOperation({ summary: 'Get list children project task of a project task' })
  @Get(':id/children')
  @JwtAuth()
  async getListProjectTaskChildren(
    @Param('id') id: string,
    @Query() getListProjectTaskChildrenDto: GetListProjectTaskChildrenDto,
  ) {
    return this.projectTaskService.getListProjectTaskChildren(id, getListProjectTaskChildrenDto);
  }

  @ApiOperation({ summary: 'Get project task history by id or code' })
  @Get(':id/history')
  @JwtAuth()
  async getListProjectTaskHistoryById(@Param('id') id: string) {
    return this.projectTaskService.getListProjectTaskHistoryById(id);
  }

  @ApiOperation({ summary: 'Get list user of project task' })
  @Get(':id/users')
  @JwtAuth()
  async getListUserOfProjectTask(@Param('id') id: string, @User() user: UserRequest) {
    return this.projectTaskService.getListUserOfProjectTask(id, user);
  }

  @ApiOperation({ summary: 'Get project task by id or code' })
  @Get(':id')
  @JwtAuth()
  async getProjectTask(@Param('id') idOrCode: string, @User() user: UserRequest) {
    return this.projectTaskService.getProjectTask(idOrCode, user);
  }
}
