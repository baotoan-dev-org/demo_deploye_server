import { User } from '@/common/decorators/user.decorator';
import { Body, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Route } from 'src/common/decorators/route.decorator';
import { CreateManySocialMediaInteractionDto } from '../dtos/create-social-media-interaction.dto';
import { GetListSocialMediaInteractionDto } from '../dtos/get-list-social-media-interaction.dto';
import { UpdateSocialMediaInteractionDto } from '../dtos/update-social-media-interaction.dto';
import { SocialMediaInteractionService } from '../services/social-media-interaction.service';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { GetEngagementRateDto } from '../dtos/get-engagement-rate.dto';

@Route('social-media-interaction')
export class SocialMediaInteractionController {
  constructor(private socialMediaInteractionService: SocialMediaInteractionService) {}

  @ApiOperation({ summary: 'Create socialMediaInteraction' })
  @JwtAuth()
  @Post()
  async createManySocialMediaInteraction(@Body() createManySocialMediaInteractionDto: CreateManySocialMediaInteractionDto, @User() user: UserRequest) {
    return this.socialMediaInteractionService.createManySocialMediaInteraction(createManySocialMediaInteractionDto, user);
  }

  @ApiOperation({ summary: 'Update socialMediaInteraction' })
  @JwtAuth()
  @Put(':id')
  async updateSocialMediaInteraction(
    @Param('id') id: string,
    @Body() updateSocialMediaInteractionDto: UpdateSocialMediaInteractionDto,
    @User() user: UserRequest,
  ) {
    return this.socialMediaInteractionService.updateSocialMediaInteraction(id, updateSocialMediaInteractionDto, user);
  }

  @ApiOperation({ summary: 'Delete socialMediaInteraction' })
  @JwtAuth()
  @Delete(':id')
  async deleteSocialMediaInteraction(@Param('id') id: string) {
    return this.socialMediaInteractionService.deleteSocialMediaInteraction(id);
  }

  @ApiOperation({ summary: 'Get Engagement rate' })
  @JwtAuth()
  @Get('engagement-rate')
  async getEngagementRate(@Query() getEngagementRateDto: GetEngagementRateDto) {
    return this.socialMediaInteractionService.getEngagementRate(getEngagementRateDto);
  }

  @ApiOperation({ summary: 'Get all socialMediaInteraction' })
  @JwtAuth()
  @Get()
  async getListSocialMediaInteraction(@Query() getListSocialMediaInteractionDto: GetListSocialMediaInteractionDto) {
    return this.socialMediaInteractionService.getListSocialMediaInteraction(getListSocialMediaInteractionDto);
  }

  @ApiOperation({ summary: 'Get socialMediaInteraction by id' })
  @JwtAuth()
  @Get(':id')
  async getSocialMediaInteraction(@Param('id') id: string) {
    return this.socialMediaInteractionService.getSocialMediaInteraction(id);
  }
}
