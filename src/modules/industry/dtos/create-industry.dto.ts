import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateIndustryDto {
  @ApiProperty({ description: 'Tên ngành nghề', default: 'Ngành nghề An Ninh' })
  @IsString()
  name: string;
}
