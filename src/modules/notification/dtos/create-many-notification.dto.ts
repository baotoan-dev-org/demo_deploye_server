import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsUUID } from 'class-validator';
import { NotificationType } from '../notification.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsStringArray } from '@/common/decorators/is-string-array.decorator';

export class CreateManyNotificationDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiPropertyOptionalCustom()
  @IsString()
  path?: string;

  @ApiPropertyOptionalCustom()
  @IsUUID()
  createdById?: string;

  @ApiProperty({ type: [String] })
  @IsStringArray()
  userIds: string[];
}
