import { JwtAuthUserTypes } from '@/common/decorators/jwt-auth-user-types.decorator';
import { User } from '@/common/decorators/user.decorator';
import { UserType } from '@/modules/user/user.enum';
import { Body, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Route } from 'src/common/decorators/route.decorator';
import { CreateIndustryDto } from '../dtos/create-industry.dto';
import { GetListIndustryDto } from '../dtos/get-list-industry.dto';
import { UpdateIndustryDto } from '../dtos/update-industry.dto';
import { IndustryService } from '../services/industry.service';
import { UserRequest } from '@/common/interfaces/user-request.type';

@Route('industry')
export class IndustryController {
  constructor(private industryService: IndustryService) {}

  @ApiOperation({ summary: 'Create industry' })
  @JwtAuthUserTypes(UserType.ADMIN)
  @Post()
  async createIndustry(@Body() createIndustryDto: CreateIndustryDto, @User() user: UserRequest) {
    return this.industryService.createIndustry(createIndustryDto, user);
  }

  @ApiOperation({ summary: 'Update industry' })
  @JwtAuthUserTypes(UserType.ADMIN)
  @Put(':id')
  async updateIndustry(
    @Param('id') id: string,
    @Body() updateIndustryDto: UpdateIndustryDto,
    @User() user: UserRequest,
  ) {
    return this.industryService.updateIndustry(id, updateIndustryDto, user);
  }

  @ApiOperation({ summary: 'Delete industry' })
  @JwtAuthUserTypes(UserType.ADMIN)
  @Delete(':id')
  async deleteIndustry(@Param('id') id: string) {
    return this.industryService.deleteIndustry(id);
  }

  @ApiOperation({ summary: 'Get all industry' })
  @Get()
  async getListIndustry(@Query() getListIndustryDto: GetListIndustryDto) {
    return this.industryService.getListIndustry(getListIndustryDto);
  }

  @ApiOperation({ summary: 'Get industry by id or code' })
  @Get(':idOrCode')
  async getIndustry(@Param('idOrCode') idOrCode: string) {
    return this.industryService.getIndustry(idOrCode);
  }
}
