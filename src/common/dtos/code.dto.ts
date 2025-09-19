import { ApiProperty } from '@nestjs/swagger';
import { IsStringNotEmpty } from '../decorators/is-string-not-empty.decorator';

export class CodeDto {
  @ApiProperty()
  @IsStringNotEmpty()
  code: string;
}
