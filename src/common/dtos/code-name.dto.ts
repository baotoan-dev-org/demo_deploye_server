import { ApiProperty } from '@nestjs/swagger';
import { IsStringNotEmpty } from '../decorators/is-string-not-empty.decorator';

export class CodeNameDto {
  @ApiProperty()
  @IsStringNotEmpty()
  code: string;

  @ApiProperty()
  @IsStringNotEmpty()
  name: string;
}
