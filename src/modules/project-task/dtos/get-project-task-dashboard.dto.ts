import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class GetProjectTaskDashboardDto {
  @ApiPropertyOptionalCustom({
    type: String,
    required: false,
    description: 'From date to filter tasks (ISO format: yyyy-MM-dd)',
    example: '2023-01-01',
  })
  fromDate?: string;

  @ApiPropertyOptionalCustom({
    type: String,
    required: false,
    description: 'To date to filter tasks (ISO format: yyyy-MM-dd)',
    example: '2025-12-31',
  })
  toDate?: string;

  @ApiPropertyOptionalCustom({
    type: String,
    required: false,
    description: 'Division ID to filter tasks',
    example: '2134f5e-1234-4cde-8a2b-123456789abc',
  })
  divisionId?: string;

  @ApiPropertyOptionalCustom({
    type: String,
    required: false,
    description: 'Project task ID to filter tasks',
    example: 'b7e2d7e2-1234-4cde-8a2b-123456789abc',
  })
  projectTaskId?: string;
}
