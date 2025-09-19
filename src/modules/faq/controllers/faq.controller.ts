import { Route } from 'src/common/decorators/route.decorator';
import { FaqService } from '../services/faq.service';
import { ApiOperation } from '@nestjs/swagger';
import { JwtAuthUserTypes } from '@/common/decorators/jwt-auth-user-types.decorator';
import { UserType } from '@/modules/user/user.enum';
import { Body, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CreateFaqDto } from '../dtos/create-faq.dto';
import { User } from '@/common/decorators/user.decorator';
import { GetListFaqDto } from '../dtos/get-list-faq.dto';
import { UpdateFaqDto } from '../dtos/update-faq.dto';
import { UpdateManyOrderFaqDto } from '../dtos/update-many-order-faq.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';

@Route('faq')
export class FaqController {
  constructor(private faqService: FaqService) {}

  @ApiOperation({ summary: 'Create FAQ' })
  @JwtAuthUserTypes(UserType.ADMIN, UserType.HR)
  @Post()
  async createFaq(@Body() createFaqDto: CreateFaqDto, @User() user: UserRequest) {
    return this.faqService.createFaq(createFaqDto, user);
  }

  @ApiOperation({ summary: 'Update many order FAQ' })
  @JwtAuthUserTypes(UserType.ADMIN, UserType.HR)
  @Post('order')
  async updateManyOrderFaq(
    @Body() updateManyOrderFaqDto: UpdateManyOrderFaqDto,
    @User() user: UserRequest,
  ) {
    return this.faqService.updateManyOrderFaq(updateManyOrderFaqDto, user);
  }

  @ApiOperation({ summary: 'Update FAQ' })
  @JwtAuthUserTypes(UserType.ADMIN, UserType.HR)
  @Put(':id')
  async updateFaq(
    @Param('id') id: string,
    @Body() updateFaqDto: UpdateFaqDto,
    @User() user: UserRequest,
  ) {
    return this.faqService.updateFaq(id, updateFaqDto, user);
  }

  @ApiOperation({ summary: 'Delete FAQ' })
  @JwtAuthUserTypes(UserType.ADMIN, UserType.HR)
  @Delete(':id')
  async deleteFaq(@Param('id') id: string) {
    return this.faqService.deleteFaq(id);
  }

  @ApiOperation({ summary: 'Get all FAQs group by category'})
  @Get('group-by-category')
  async getListFaqGroupByCategory(){
    return this.faqService.getListFaqGroupByCategory();
  }

  @ApiOperation({ summary: 'Get all FAQs' })
  @Get()
  async getListFaq(@Query() getListFaqDto: GetListFaqDto, @User() user: UserRequest) {
    return this.faqService.getListFaq(getListFaqDto, user);
  }

  @ApiOperation({ summary: 'Get FAQ by id' })
  @Get(':id')
  async getFaq(@Param('id') id: string) {
    return this.faqService.getFaq(id);
  }
}
