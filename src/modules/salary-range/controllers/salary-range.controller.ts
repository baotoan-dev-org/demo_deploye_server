import { JwtAuthUserTypes } from '@/common/decorators/jwt-auth-user-types.decorator';
import { User } from '@/common/decorators/user.decorator';
import { UserType } from '@/modules/user/user.enum';
import { Body, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { Route } from 'src/common/decorators/route.decorator';
import { CreateSalaryRangeDto } from '../dtos/create-salary-range.dto';
import { GetListSalaryRangeDto } from '../dtos/get-list-salary-range.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { SalaryRangeService } from '../services/salary-range.service';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { UpdateSalaryRangeDto } from '../dtos/update-salary-range.dto';

@Route('salary-range')
export class SalaryRangeController {
  constructor(private salaryRangeService: SalaryRangeService) {}

  @ApiOperation({ summary: 'Create salary range' })
  @JwtAuthUserTypes(UserType.ADMIN)
  @Post()
  async createSalaryRangePositon(@Body() createSalaryRangeDto: CreateSalaryRangeDto, @User() user: UserRequest) {
    return this.salaryRangeService.createSalaryRangePosition(createSalaryRangeDto, user);
  }

  @ApiOperation({ summary: 'Update salary range' })
  @JwtAuth()
  @Put(':id')
  async updateSalaryRange(
    @Param('id') id: string,
    @Body() updateSalaryRangeDto: UpdateSalaryRangeDto,
    @User() user: UserRequest,
  ) {
    return this.salaryRangeService.updateSalaryRange(id, updateSalaryRangeDto, user);
  }

  @ApiOperation({ summary: 'Delete salary range ' })
  @JwtAuth()
  @Delete(':id')
  async deleteSalaryRange(@Param('id') id: string, @User() user: UserRequest) {
    return this.salaryRangeService.deleteSalaryRange(id, user);
  }

  @ApiOperation({ summary: 'Get all salary range' })
  @JwtAuth()
  @Get()
  async getListSalaryRangePositon(@Query() getListSalaryRangeDto: GetListSalaryRangeDto, @User() user: UserRequest) {
    return this.salaryRangeService.getListSalaryRangePosition(getListSalaryRangeDto, user);
  }

  @ApiOperation({ summary: 'Get salary range by id' })
  @JwtAuth()
  @Get(':id')
  async getSalaryRangePositon(@Param('id') id: string, @User() user: UserRequest) {
    return this.salaryRangeService.getSalaryRange(id, user);
  }
}
