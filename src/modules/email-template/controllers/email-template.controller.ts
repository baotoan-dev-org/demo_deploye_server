import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { CreateEmailTemplateDto } from '../dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from '../dto/update-email-template.dto';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { EmailTemplateService } from '../services/email-template.service';
import { JwtAuthUserTypes } from '@/common/decorators/jwt-auth-user-types.decorator';
import { UserType } from '@/modules/user/user.enum';
import { User } from '@/common/decorators/user.decorator';
import { GetContentEmailTemplateDto } from '../dto/get-content-email-template.dto';
import { GetListEmailTemplateDto } from '../dto/get-list-email-template.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';

@ApiTags('Email Template')
@Controller('email-template')
export class EmailTemplateController {
  constructor(private readonly emailTemplateService: EmailTemplateService) {}

  @ApiOperation({ summary: 'Create a new email template' })
  @JwtAuthUserTypes(UserType.ADMIN, UserType.HR)
  @Post()
  createEmailTemplate(
    @Body() createEmailTemplateDto: CreateEmailTemplateDto,
    @User() user: UserRequest,
  ) {
    return this.emailTemplateService.createEmailTemplate(createEmailTemplateDto, user);
  }

  @ApiOperation({ summary: 'Update an email template' })
  @JwtAuthUserTypes(UserType.ADMIN, UserType.HR)
  @Put(':id')
  updateEmailTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateEmailTemplateDto: UpdateEmailTemplateDto,
    @User() user: UserRequest,
  ) {
    return this.emailTemplateService.updateEmailTemplate(id, updateEmailTemplateDto, user);
  }

  @ApiOperation({ summary: 'Delete an email template' })
  @JwtAuthUserTypes(UserType.ADMIN, UserType.HR)
  @Delete(':id')
  deleteEmailTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return this.emailTemplateService.deleteEmailTemplate(id);
  }

  @ApiOperation({ summary: 'Get all email templates' })
  @Get()
  getListEmailTemplate(@Query() getListEmailTemplateDto: GetListEmailTemplateDto) {
    return this.emailTemplateService.getListEmailTemplate(getListEmailTemplateDto);
  }

  @ApiOperation({ summary: 'Get raw email content based on template name (status/rejectType)' })
  @Get('content-email')
  getContentEmailTemplate(@Query() getContentEmailTemplateDto: GetContentEmailTemplateDto) {
    return this.emailTemplateService.getContentEmailTemplate(getContentEmailTemplateDto);
  }

  @ApiOperation({ summary: 'Get an email template by ID or Status' })
  @ApiParam({
    name: 'idOrStatus',
    description: 'ID (UUID) or Status (e.g., Reviewing)',
    type: 'string',
  })
  @Get(':idOrStatus')
  getEmailTemplate(@Param('idOrStatus') idOrStatus: string) {
    return this.emailTemplateService.getEmailTemplate(idOrStatus);
  }
}
