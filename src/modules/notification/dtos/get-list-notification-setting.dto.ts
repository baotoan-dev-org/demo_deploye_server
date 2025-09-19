import { IntersectionType } from '@nestjs/swagger';
import { PageOptionsDto } from 'src/common/dtos/page-options.dto';
import { IsEnum } from 'class-validator';
import { NotificationType } from '../notification.enum';
import { IsBooleanCustom } from '@/common/decorators/is-boolean-custom.decorator';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class GetListNotificationSettingDto extends IntersectionType(PageOptionsDto) {
  @ApiPropertyOptionalCustom({ enum: NotificationType })
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptionalCustom()
  @IsBooleanCustom()
  isReceive?: boolean;
}
