import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsDefined, IsEnum, IsNumber, ValidateIf, ValidateNested } from 'class-validator';
import { SocialPlatform } from '../social-media-interaction.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { Type } from 'class-transformer';

export class CreateSocialMediaInteractionDto {
  @ApiProperty({ description: 'Tên nền tảng'})
  @IsEnum(SocialPlatform)
  socialPlatform: SocialPlatform;

  @ApiProperty({ description: 'Năm'})
  @IsNumber()
  year: number;

  @ApiProperty({ description: 'Tháng'})
  @IsNumber()
  month: number;

  @ApiProperty({ description: 'Số lượng người theo dõi'})
  @IsNumber()
  followerCount: number;

  @ApiPropertyOptionalCustom({ description: 'Số lượng người theo like'})
  @IsNumber()
  likeCount?: number;
}

export class CreateManySocialMediaInteractionDto {
  @ApiProperty({
    type: [CreateSocialMediaInteractionDto],
    description: 'Danh sách nền tảng cần tạo',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateSocialMediaInteractionDto)
  @IsArray()
  data: CreateSocialMediaInteractionDto[];
}

