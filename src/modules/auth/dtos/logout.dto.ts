import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { LogoutType } from '../auth.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class LogoutDto {
  @ApiProperty({ enum: LogoutType })
  @IsEnum(LogoutType)
  type: LogoutType;

  @ApiPropertyOptionalCustom()
  @IsString()
  refreshToken?: string;
}
