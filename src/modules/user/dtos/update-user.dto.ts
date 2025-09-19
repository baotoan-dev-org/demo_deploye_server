import { ApiProperty, IntersectionType, PartialType } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { UserStatus } from '../user.enum';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(IntersectionType(CreateUserDto)) {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status: UserStatus;
}
