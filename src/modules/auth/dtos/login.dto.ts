import { ApiProperty } from '@nestjs/swagger';
import { IsStringNotEmpty } from 'src/common/decorators/is-string-not-empty.decorator';

export class LoginDto {
  @ApiProperty()
  @IsStringNotEmpty()
  emailOrPhone: string;

  @ApiProperty()
  @IsStringNotEmpty()
  password: string;
}
