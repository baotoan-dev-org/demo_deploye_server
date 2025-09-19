import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsStringNotEmpty } from '@/common/decorators/is-string-not-empty.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsUUID } from 'class-validator';

export class CreateApplicationDto {
  @ApiProperty({
    description: 'ID of the job',
    default: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  jobId: string;

  @ApiProperty({
    description: 'CV must be a string',
    default: 'https://example.com/cv.pdf',
  })
  @IsStringNotEmpty()
  cvUrl: string;

  @ApiPropertyOptionalCustom({
    description: 'Cover letter must be a string',
    default: 'Thư giới thiệu',
  })
  @IsString()
  coverLetter?: string;

  @ApiProperty({
    description: 'Name of the applicant',
    default: 'Nguyen Van A',
  })
  @IsStringNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Email of the applicant',
    default: 'email@gmail.com',
  })
  @IsStringNotEmpty()
  email: string;

  @ApiProperty({
    description: 'Phone number of the applicant',
    default: '0123456789',
  })
  @IsStringNotEmpty()
  phone: string;

  @ApiPropertyOptionalCustom({
    description: 'Mã nhân viên giới thiệu',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsString()
  referralCode?: string;
}
