import { ApiProperty } from '@nestjs/swagger';
import { IsDate, IsEnum, IsNumber, IsString, IsUUID } from 'class-validator';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { JobTag, WorkArea } from '../job.enum';

// Cái này thực chất là đẩy từ job recruitment lên job tuyển dụng khi được duyệt tất cả
export class CreateJobDto {
  @ApiProperty({ example: 'Nhân viên kinh doanh' })
  @IsString()
  name: string;

  @ApiProperty({ enum: JobTag, example: JobTag.NEW })
  @IsEnum(JobTag)
  tag: JobTag;

  @ApiProperty({ enum: WorkArea, example: WorkArea.OFFICE })
  @IsEnum(WorkArea)
  address: WorkArea;

  @ApiProperty({ example: new Date() })
  @IsDate()
  expiredDate?: Date;

  @ApiProperty({ example: '<p>Mô tả công việc...</p>' })
  @IsString()
  description: string;

  @ApiProperty({ example: '<ul><li>Yêu cầu 1</li></ul>' })
  @IsString()
  requirement: string;

  @ApiProperty({ example: '<ul><li>Phúc lợi 1</li></ul>' })
  @IsString()
  welfare: string;

  @ApiPropertyOptionalCustom({ example: 10000000, description: 'Minimum wage in VND' })
  @IsNumber()
  minSalary?: number;

  @ApiPropertyOptionalCustom({ example: 20000000, description: 'Maximum wage in VND' })
  @IsNumber()
  maxSalary?: number;

  @ApiProperty()
  @IsUUID()
  ownerId: string;

  @ApiPropertyOptionalCustom()
  @IsString()
  note?: string;

  @ApiPropertyOptionalCustom()
  @IsUUID()
  industryId?: string;

  @ApiPropertyOptionalCustom()
  @IsNumber()
  budget?: number;
}
