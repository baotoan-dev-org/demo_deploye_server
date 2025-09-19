import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsArray, IsDateString, IsEnum } from 'class-validator';
import { UserExportExcelColumn } from '../user.enum';

export class GetListUserExportExcelDto {
  @ApiPropertyOptionalCustom({
    description: 'Từ ngày',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptionalCustom({
    description: 'Đến ngày',
    type: String,
    format: 'date-time',
  })
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptionalCustom({
    description: 'Danh sách cột',
    type: [String],
    enum: UserExportExcelColumn,
    isArray: true,
  })
  @IsArray()
  @IsEnum(UserExportExcelColumn, { each: true })
  listColumn?: UserExportExcelColumn[];
}
