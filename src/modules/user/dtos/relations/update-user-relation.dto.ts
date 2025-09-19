import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { IsArray, IsEnum, ValidateNested } from 'class-validator';
import { UserStatus } from '../../user.enum';
import { CreateUserOrgUnitPositionDto, CreateUserRelationDto } from './create-user-relation.dto';
import { Type } from 'class-transformer';

export class UpdateUserRelationDto extends PartialType(
  OmitType(IntersectionType(CreateUserRelationDto), ['userOrgUnitPositions'] as const),
) {
  @ApiProperty({ enum: UserStatus })
  @IsEnum(UserStatus)
  status: UserStatus;

  @ApiPropertyOptional({ type: [CreateUserOrgUnitPositionDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateUserOrgUnitPositionDto)
  @IsArray()
  userOrgUnitPositions: CreateUserOrgUnitPositionDto[];
}
