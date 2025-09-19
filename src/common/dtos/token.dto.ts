import { ApiProperty } from '@nestjs/swagger';
import { IsStringNotEmpty } from '../decorators/is-string-not-empty.decorator';

export class TokenDto {
  @ApiProperty()
  @IsStringNotEmpty()
  token: string;
}
