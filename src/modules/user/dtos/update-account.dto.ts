import { IntersectionType, OmitType } from '@nestjs/swagger';
import { IsStringNotEmpty } from 'src/common/decorators/is-string-not-empty.decorator';
import { CreateUserDto } from './create-user.dto';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class UpdateAccountDto extends IntersectionType(OmitType(CreateUserDto, ['type', 'code'])) {
  @ApiPropertyOptionalCustom()
  @IsStringNotEmpty()
  passwordOld?: string;
}
