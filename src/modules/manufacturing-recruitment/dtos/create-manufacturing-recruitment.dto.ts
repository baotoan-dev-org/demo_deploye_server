import { IsStringNotEmpty } from '@/common/decorators/is-string-not-empty.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsString } from 'class-validator';
import { Gender } from '../manufacturing-recruitment.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { Transform } from 'class-transformer';

export class CreateManufacturingRecruitmentDto {
  @ApiProperty({ description: 'Họ tên', example: 'Nguyễn Văn A' })
  @IsStringNotEmpty()
  name: string;

  @ApiProperty({ description: 'Ngày tháng năm sinh'})
  @IsDate()
  birthday: Date;

  @ApiProperty({ description: 'Số điện thoại'})
  @IsStringNotEmpty()
  phone: string;

  @ApiProperty({ description: 'Địa chỉ'})
  @IsStringNotEmpty()
  address: string;

  @ApiProperty({ description: 'Giới tính', enum: Gender, example: Gender.FEMALE })
  @IsEnum(Gender)
  gender: Gender

  @ApiPropertyOptionalCustom({
    description: 'Mã nhân viên giới thiệu',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  referralCode?: string;
}
