import { Route } from '@/common/decorators/route.decorator';
import { Body, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { User } from '@/common/decorators/user.decorator';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { CreateDiscussionDto } from '../dtos/create-discussion.dto';
import { UpdateDiscussionDto } from '../dtos/update-discussion.dto';
import { DiscussionService } from '../services/discussion.service';
import { CreateDiscussionReactionDto } from '../dtos/create-discussion-reaction.dto';
import { GetListDiscussionDto } from '../dtos/get-list-discussion.dto';

@Route('discussion')
export class DiscussionController {
  constructor(private readonly discussionService: DiscussionService) {}

  @ApiOperation({ summary: 'Create discussions for a discussion' })
  @Post()
  @JwtAuth()
  async createDiscussion(
    @Body() createDiscussionDto: CreateDiscussionDto,
    @User() user: UserRequest,
  ) {
    return this.discussionService.createDiscussion(createDiscussionDto, user);
  }

  @ApiOperation({ summary: 'React to a discussion' })
  @Post(':discussionId/reaction')
  @JwtAuth()
  async createReaction(
    @Param('discussionId') discussionId: string,
    @Body() createDiscussionReactionDto: CreateDiscussionReactionDto,
    @User() user: UserRequest,
  ) {
    return this.discussionService.createReaction(discussionId, createDiscussionReactionDto, user);
  }

  @ApiOperation({
    summary: 'Update discussions for a discussion',
  })
  @Put(':discussionId')
  @JwtAuth()
  async updateDiscussion(
    @Param('discussionId') discussionId: string,
    @Body() updateDiscussionDto: UpdateDiscussionDto,
    @User() user: UserRequest,
  ) {
    return this.discussionService.updateDiscussion(discussionId, updateDiscussionDto, user);
  }

  @ApiOperation({
    summary: 'Get detail reaction of a discussion',
  })
  @Get(':discussionId/reaction')
  @JwtAuth()
  async getDetailReactionOfDiscussion(@Param('discussionId') discussionId: string) {
    return this.discussionService.getDetailReactionOfDiscussion(discussionId);
  }

  @ApiOperation({
    summary: 'Get list history of a discussion',
  })
  @Get(':discussionId/history')
  @JwtAuth()
  async getListHistoryOfDiscussion(@Param('discussionId') discussionId: string) {
    return this.discussionService.getListHistoryOfDiscussion(discussionId);
  }

  @ApiOperation({ summary: 'Get replies of a discussion' })
  @Get(':discussionId/replies')
  @JwtAuth()
  async getListRepliesOfDiscussion(
    @Param('discussionId') discussionId: string,
    @User() user: UserRequest,
  ) {
    return this.discussionService.getListRepliesOfDiscussion(discussionId, user);
  }

  @ApiOperation({ summary: 'Get discussions for a discussion' })
  @Get(':discussionId')
  @JwtAuth()
  async getListDiscussionsForEntity(
    @Query() getListDiscussionDto: GetListDiscussionDto,
    @Param('discussionId') discussionId: string,
    @User() user: UserRequest,
  ) {
    return this.discussionService.getListDiscussionsForEntity(
      getListDiscussionDto,
      discussionId,
      user,
    );
  }

  @Delete(':discussionId')
  @ApiOperation({ summary: 'Delete a discussion for a discussion' })
  @JwtAuth()
  async deleteDiscussion(@Param('discussionId') discussionId: string, @User() user: UserRequest) {
    return this.discussionService.deleteDiscussion(discussionId, user);
  }
}
