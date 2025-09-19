import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { RejectionReason, UserMovementStatus } from '../../user.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class UpdateUserMovementApproveDto {
  @ApiProperty({ description: 'Trạng thái phê duyệt', enum: UserMovementStatus })
  @IsEnum(UserMovementStatus)
  status?: UserMovementStatus;

  @ApiPropertyOptionalCustom({
    description: 'Lý do từ chối khác',
  })
  @IsString()
  reasonReject?: string;

  @ApiPropertyOptionalCustom({
    description: 'Lý do từ chối',
    enum: RejectionReason,
  })
  @IsEnum(RejectionReason)
  rejectionReason?: RejectionReason;
}
