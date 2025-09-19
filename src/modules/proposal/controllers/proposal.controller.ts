import { Route } from '@/common/decorators/route.decorator';
import { ProposalService } from '../services/proposal.service';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { Body, Get, Post, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { GetListProposalDto } from '../dtos/get-list-proposal.dto';
import { User } from '@/common/decorators/user.decorator';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { UpdateFollowerDto } from '../dtos/update-follower.dto';

@Route('proposal')
export class ProposalController {
  constructor(private proposalService: ProposalService) {}

  @ApiOperation({ summary: 'Get list proposal' })
  @Get()
  @JwtAuth()
  async getListProposal(@Query() query: GetListProposalDto, @User() user: UserRequest) {
    return this.proposalService.getListProposal(query, user);
  }

  @ApiOperation({ summary: 'Update follower for proposal' })
  @Post('update-follower')
  @JwtAuth()
  async updateFollowerForProposal(@Body() body: UpdateFollowerDto, @User() user: UserRequest) {
    return this.proposalService.updateFollowerForProposal(body, user);
  }
}
