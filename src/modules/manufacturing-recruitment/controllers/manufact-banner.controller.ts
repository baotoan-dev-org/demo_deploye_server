import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { Body, Get, Query, Post, Param, Delete, Put } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Route } from 'src/common/decorators/route.decorator';
import { ManufactBannerService } from '../services/manufact-banner.service';
import { CreateManufactBannerDto } from '../dtos/create-manufact-banner.dto';
import { GetListManufactBannerDto } from '../dtos/get-manufact-banner.dto';
import { UpdateManufactBannerDto } from '../dtos/update-manufact-banner.dto';
import { User } from '@/common/decorators/user.decorator';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { UpdateStatusBannerDto } from '../dtos/update-status-banner.dto';
import { DeleteBannerDto } from '../dtos/delete-banner.dto';

@Route('manufact-banner')
export class ManufactBannerController {
  constructor(private manufactBannerService: ManufactBannerService) {}

  @ApiOperation({ summary: 'create manufact banner' })
  @Post()
  @JwtAuth()
  createManufactBanner(
    @Body() createManufactBannerDto: CreateManufactBannerDto,
  ) {
    return this.manufactBannerService.createManufactBanner(createManufactBannerDto);
  }

  @ApiOperation({ summary: 'Get list manufact banner' })
  @Get()
  getListManufactBanner(
    @Query() getListManufactBannerDto: GetListManufactBannerDto,
  ) {
    return this.manufactBannerService.getListManufactBanner(getListManufactBannerDto);
  }

  @ApiOperation({summary: 'update status for banner'})
  @Put(':id/status-banner')
  updateStatusBanner(@Param('id') id: string, @Body() updateStatusBannerDto: UpdateStatusBannerDto, @User() user: UserRequest){
    return this.manufactBannerService.updateStatusBanner(id, updateStatusBannerDto, user);
  }

  @ApiOperation({ summary: 'Update manufact banner' })
  @JwtAuth()
  @Post(':id')
  async updateManufactBanner(
    @Param('id') id: string,
    @Body() updateManufactBannerDto: UpdateManufactBannerDto,
    @User() user: UserRequest,
  ) {
    return this.manufactBannerService.updateManufactBanner(id, updateManufactBannerDto, user);
  }

  @ApiOperation({summary: 'delete banner'})
  @Delete(':id/delete-banner')
  deleteBanner(@Param('id') id: string, @Body() deleteBannerDto: DeleteBannerDto ){
    return this.manufactBannerService.deleteBanner(id, deleteBannerDto);
  }

  @ApiOperation({ summary: 'Delete manufact banner' })
  @JwtAuth()
  @Delete(':id')
  async deleteManufactBanner(@Param('id') id: string) {
    return this.manufactBannerService.deleteManufactBanner(id);
  }

  @ApiOperation({ summary: 'Get banner for current campaign'})
  @Get('current-banner')
  getCurrentCampaignBanner(){
    return this.manufactBannerService.getCurrentCampaignBanner();
  }
  
  @ApiOperation({ summary: 'Get manufact banner by id' })
  @Get(':id')
  async getIndustry(@Param('id') id: string) {
    return this.manufactBannerService.getManufactBanner(id);
  }
}
