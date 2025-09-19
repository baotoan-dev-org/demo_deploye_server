import { ApiProperty } from '@nestjs/swagger';
import { IsStringNotEmpty } from 'src/common/decorators/is-string-not-empty.decorator';
import { ResetPasswordType } from '../auth.enum';
import { IsEnum } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty()
  @IsStringNotEmpty()
  token: string;

  @ApiProperty()
  @IsStringNotEmpty()
  password: string;

  @ApiProperty({ enum: ResetPasswordType })
  @IsEnum(ResetPasswordType)
  type: ResetPasswordType;
}
