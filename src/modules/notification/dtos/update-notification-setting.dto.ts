import { ApiProperty } from '@nestjs/swagger';
import { IsBooleanCustom } from '@/common/decorators/is-boolean-custom.decorator';

export class UpdateNotificationSettingDto {
  @ApiProperty()
  @IsBooleanCustom()
  isReceive: boolean;
}
