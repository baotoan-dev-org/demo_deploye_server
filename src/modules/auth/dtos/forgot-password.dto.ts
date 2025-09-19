import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { IsStringNotEmpty } from 'src/common/decorators/is-string-not-empty.decorator';
import { ForgotPasswordType } from '../auth.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class ForgotPasswordDto {
  @ApiPropertyOptionalCustom()
  @IsStringNotEmpty()
  phone?: string;

  @ApiPropertyOptionalCustom()
  @IsStringNotEmpty()
  email?: string;

  @ApiProperty({ enum: ForgotPasswordType })
  @IsEnum(ForgotPasswordType)
  type: ForgotPasswordType;
}
