import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class CreateUserOrgDto {
  @ApiProperty({ example: '161803cd-3f78-4b83-b41e-5245f2337fe2' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: '161803cd-3f78-4b83-b41e-5245f2337fe2' })
  @IsUUID()
  positionId: string;
}

export class AddUserToOrgUnitDto {
  @ApiPropertyOptionalCustom({ type: [CreateUserOrgDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateUserOrgDto)
  @IsArray()
  userOrgUnits: CreateUserOrgDto[];

  @ApiProperty({ example: '161803cd-3f78-4b83-b41e-5245f2337fe2' })
  @IsUUID()
  orgUnitId: string;
}
