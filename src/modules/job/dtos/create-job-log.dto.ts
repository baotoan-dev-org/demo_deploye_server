import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { JobLogAction, JobLogType } from '../job.enum';

export class CreateJobLogDto {
  @ApiProperty({ type: Object, description: 'Dữ liệu cũ trước khi cập nhật' })
  oldData: Object;

  @ApiProperty({ type: Object, description: 'Dữ liệu mới sau khi cập nhật' })
  newData: Object;

  @ApiProperty({ enum: JobLogType })
  @IsEnum(JobLogType)
  type: JobLogType;

  @ApiProperty({ enum: JobLogAction })
  @IsEnum(JobLogAction)
  action: JobLogAction;

  @ApiProperty({
    description: 'ID job',
  })
  @IsUUID()
  jobId: string;
}
