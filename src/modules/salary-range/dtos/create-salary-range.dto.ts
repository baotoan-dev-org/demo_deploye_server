import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsUUID } from 'class-validator';

export class CreateSalaryRangeDto {
  @ApiProperty({ description: 'min salary' })
  @IsNumber()
  minSalary: number;

  @ApiProperty({ description: 'max salary' })
  @IsNumber()
  maxSalary: number;

  @ApiPropertyOptionalCustom({})
  @IsArray()
  @IsUUID('4', { each: true })
  positionIds?: string[] = [];
}
