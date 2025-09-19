import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber } from 'class-validator';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { SocialPlatform } from '../social-media-interaction.enum';

export class GetEngagementRateDto{
  @ApiProperty({
    description: 'Tên nền tảng',
    enum: SocialPlatform,
  })
  @IsEnum(SocialPlatform)
  socialPlatform: SocialPlatform;

  @ApiPropertyOptionalCustom({
    description: 'Năm',
  })
  @IsNumber()
  year?: number;

  @ApiPropertyOptionalCustom({
    description: 'Tháng',
  })
  @IsNumber()
  month?: number;
}
