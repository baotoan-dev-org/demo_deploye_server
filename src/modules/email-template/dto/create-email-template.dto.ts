import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ApplicationStatus } from '@/modules/application/application.enum';
import { IsStringNotEmpty } from '@/common/decorators/is-string-not-empty.decorator';

export class CreateEmailTemplateDto {
  @ApiProperty({
    description: 'Application status that this template corresponds to',
    enum: ApplicationStatus,
  })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @ApiProperty({ example: '<ul><li>Subject ...</li></ul>' })
  @IsStringNotEmpty()
  subject: string;

  @ApiProperty({ example: '<ul><li>Content ...</li></ul>' })
  @IsStringNotEmpty()
  content: string;
}
