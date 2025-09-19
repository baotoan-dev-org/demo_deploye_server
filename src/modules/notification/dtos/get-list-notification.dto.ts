import { IntersectionType } from '@nestjs/swagger';
import { PageOptionsDto } from 'src/common/dtos/page-options.dto';
import { IsEnum } from 'class-validator';
import { NotificationStatus, NotificationType } from '../notification.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class GetListNotificationDto extends IntersectionType(PageOptionsDto) {
  @ApiPropertyOptionalCustom({ enum: NotificationType })
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiPropertyOptionalCustom({ enum: NotificationStatus })
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;
}
