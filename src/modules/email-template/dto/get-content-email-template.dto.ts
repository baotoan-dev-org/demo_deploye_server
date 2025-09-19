import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApplicationStatus } from '@/modules/application/application.enum';

export class GetContentEmailTemplateDto {
  @ApiProperty({ description: 'Application status', enum: ApplicationStatus })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}
