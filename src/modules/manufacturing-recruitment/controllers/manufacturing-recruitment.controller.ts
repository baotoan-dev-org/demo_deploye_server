import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { Body, Get, Query, Post, Put, Param } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Route } from 'src/common/decorators/route.decorator';
import { ManufacturingRecruitmentService } from '../services/manufacturing-recruitment.service';
import { CreateManufacturingRecruitmentDto } from '../dtos/create-manufacturing-recruitment.dto';
import { GetListManufacturingRecruitmentDto } from '../dtos/get-manufacturing-recruitment.dto';
import { User } from '@/common/decorators/user.decorator';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { UpdateManufacturingRecruitmentDto } from '../dtos/update-manufacturing-recruitment.dto';

@Route('manufacturing-recruitment')
export class ManufacturingRecruitmentController {
  constructor(private manufactRecruitmentService: ManufacturingRecruitmentService) {}

  @ApiOperation({ summary: 'create manufacturing recruitment' })
  @Post()
  createManufacturingRecruitment(
    @Body() createManufacturingRecruitmentDto: CreateManufacturingRecruitmentDto,
  ) {
    return this.manufactRecruitmentService.createManufacturingRecruitment(createManufacturingRecruitmentDto);
  }

  @ApiOperation({ summary: 'Get list manufacturing recruitment' })
  @JwtAuth()
  @Get()
  getListManufacturingRecruitment(
    @Query() getListManufacturingRecruitmentDto: GetListManufacturingRecruitmentDto,
  ) {
    return this.manufactRecruitmentService.getListManufacturingRecruitment(getListManufacturingRecruitmentDto);
  }

  @ApiOperation({ summary: 'Update manufacturing recruitment' })
  @JwtAuth()
  @Put(':id')
  async updateManufacturingRecruitment(
    @Param('id') id: string,
    @Body() updateManufacturingRecruitmentDto: UpdateManufacturingRecruitmentDto,
    @User() user: UserRequest,
  ) {
    return this.manufactRecruitmentService.updateManufacturingRecruitment(id, updateManufacturingRecruitmentDto, user);
  }
  
}
