import { ApiProperty } from '@nestjs/swagger';
import { IsStringNotEmpty } from 'src/common/decorators/is-string-not-empty.decorator';

export class GenerateTokenVerifyEmailDto {
  @ApiProperty()
  @IsStringNotEmpty()
  email: string;

  @ApiProperty()
  @IsStringNotEmpty()
  password: string;
}
