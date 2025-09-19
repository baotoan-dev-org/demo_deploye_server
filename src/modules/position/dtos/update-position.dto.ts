import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreatePositionDto } from './create-position.dto';
import { PositionStatus } from '../position.enum';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdatePositionDto extends PartialType(CreatePositionDto) {
  @ApiProperty({
    description: 'Trạng thái của vị trí',
    enum: PositionStatus,
    default: PositionStatus.ACTIVE,
    type: String,
  })
  @IsOptional()
  @IsEnum(PositionStatus)
  status: PositionStatus;
}
