import { IsEnum, IsUUID, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserMovementType } from '../../user/user.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class GetListPositionUserMovementQueryDto {
  @ApiProperty({ enum: UserMovementType, description: 'Loại movement' })
  @IsEnum(UserMovementType)
  type: UserMovementType;

  @ApiProperty({ description: 'ID của position', example: 'uuid-string' })
  @IsNotEmpty()
  @IsUUID()
  positionId: string;

  @ApiPropertyOptionalCustom({ description: 'Từ khóa tìm kiếm', example: 'Nhân viên' })
  @IsString()
  search: string;
}
