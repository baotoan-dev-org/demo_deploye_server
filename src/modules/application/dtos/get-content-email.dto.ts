import { ApplicationStatus } from '../application.enum';
import { IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class GetContentEmailDto {
  @ApiPropertyOptionalCustom({ description: 'Trạng thái đơn ứng tuyển', enum: ApplicationStatus })
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptionalCustom({ description: 'ID của đơn ứng tuyển' })
  @IsUUID()
  applicationId?: string;
}
