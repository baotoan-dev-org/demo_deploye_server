import { ApiProperty } from '@nestjs/swagger';
import { IsStringNotEmpty } from 'src/common/decorators/is-string-not-empty.decorator';

export class RefreshTokenDto {
  @ApiProperty()
  @IsStringNotEmpty()
  refreshToken: string;
}
