import { Route } from '@/common/decorators/route.decorator';
import { Body, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { User } from '@/common/decorators/user.decorator';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { ProjectTaskProposalService } from '../service/project-task-proposal.service';
import { CreateProjectTaskProposalDto } from '../dtos/create-project-task-proposal.dto';
import { AttachFollowerDto } from '../dtos/attach-follower.dto';
import { UpdateProjectTaskProposalDto } from '../dtos/update-project-task-proposal.dto';
import { UpdateProjectTaskProposalStatusDto } from '../dtos/update-project-task-proposal-status.dto';
import { GetListProjectTaskProposalDto } from '../dtos/get-list-project-task-proposal.dto';

@Route('project-task-proposal')
export class ProjectTaskProposalController {
  constructor(private projectTaskProposalService: ProjectTaskProposalService) {}

  @Get('fixData')
  @ApiOperation({ summary: 'Fix data' })
  async fixData() {
    return this.projectTaskProposalService.fixData();
  }

  @Post()
  @ApiOperation({ summary: 'Create project task proposal' })
  @JwtAuth()
  async createProjectTaskProposal(
    @Body() dto: CreateProjectTaskProposalDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskProposalService.createProjectTaskProposal(dto, user);
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Update project task proposal status' })
  @JwtAuth()
  async updateProjectTaskProposalStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProjectTaskProposalStatusDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskProposalService.updateProjectTaskProposalStatus(id, dto, user);
  }

  @Put(':id/update-follower')
  @ApiOperation({ summary: 'Update project task follower for proposal' })
  @JwtAuth()
  async updateProjectTaskProposalFollower(
    @Param('id') id: string,
    @Body() dto: AttachFollowerDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskProposalService.updateProjectTaskProposalFollower(id, dto, user);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update proposal' })
  @JwtAuth()
  async updateProjectTaskProposal(
    @Param('id') id: string,
    @Body() dto: UpdateProjectTaskProposalDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskProposalService.updateProjectTaskProposal(id, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get list project task proposal' })
  @JwtAuth()
  async getListProjectTaskProposal(
    @Query() dto: GetListProjectTaskProposalDto,
    @User() user: UserRequest,
  ) {
    return this.projectTaskProposalService.getListProjectTaskProposal(dto, user);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Get users of project task proposal' })
  @JwtAuth()
  async getListUserOfProposal(@Param('id') id: string, @User() user: UserRequest) {
    return this.projectTaskProposalService.getListUserOfProposal(id, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get project task proposal' })
  @JwtAuth()
  async getProjectTaskProposal(@Param('id') id: string, @User() user: UserRequest) {
    return this.projectTaskProposalService.getProjectTaskProposal(id, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete project task proposal' })
  @JwtAuth()
  async deleteProjectTaskProposal(@Param('id') id: string, @User() user: UserRequest) {
    return this.projectTaskProposalService.deleteProjectTaskProposal(id, user);
  }
}
