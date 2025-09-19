import { PageOptionsDto } from '@/common/dtos/page-options.dto';
import { IntersectionType } from '@nestjs/swagger';
import { JobApproverStatus } from '../job.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';
import { IsEnum, IsUUID } from 'class-validator';

export class GetListNeedApproveByUserDto extends IntersectionType(PageOptionsDto) {
    @ApiPropertyOptionalCustom({ enum: JobApproverStatus })
    @IsEnum(JobApproverStatus)
    status?: JobApproverStatus;

    @ApiPropertyOptionalCustom()
    @IsUUID()
    orgUnitId?: string;

    @ApiPropertyOptionalCustom()
    @IsUUID()
    positionId?: string;
}
