import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class GetListPercentAndUserImplementTaskDashboardDto {
  @ApiPropertyOptionalCustom({
    type: [String],
    required: false,
    description: 'List of project task IDs to filter tasks',
    example: ['b7e2d7e2-1234-4cde-8a2b-123456789abc'],
  })
  projectTaskIds?: string[];
}
