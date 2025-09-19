import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { UpdateNotificationAction } from '../notification.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class UpdateNotificationDto {
  @ApiProperty({ enum: UpdateNotificationAction })
  @IsEnum(UpdateNotificationAction)
  updateNotificationAction: UpdateNotificationAction;

  @ApiPropertyOptionalCustom()
  @IsUUID()
  id?: string;
}
