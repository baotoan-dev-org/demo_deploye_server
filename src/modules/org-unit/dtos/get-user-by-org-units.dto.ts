import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class GetUsersByOrgUnitsDto {
  // wagger array of team ids
  @ApiProperty({
    description: 'Array of team IDs',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  @IsUUID(4, { each: true })
  orgUnitIds: string[];
}
