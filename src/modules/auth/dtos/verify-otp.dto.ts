import { ApiProperty } from '@nestjs/swagger';
import { IsStringNotEmpty } from 'src/common/decorators/is-string-not-empty.decorator';

export class VerifyOtpDto {
  @ApiProperty()
  @IsStringNotEmpty()
  phone: string;

  @ApiProperty()
  @IsStringNotEmpty()
  otp: string;
}
