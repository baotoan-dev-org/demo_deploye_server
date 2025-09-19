import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, IsArray, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { RoomGroupApprovalProcess, RoomGroupStatus } from '../room.enum';
import { ApiPropertyOptionalCustom } from '@/common/decorators/api-property-optional-custom.decorator';

export class CreateRoomGroupDto {
  @ApiProperty({ example: 'Nhóm tài nguyên A', description: 'Tên nhóm tài nguyên' })
  @IsString()
  @Length(1, 255, { message: 'Tên nhóm tài nguyên phải chứa ít nhất 1 ký tự' })
  name: string;

  @ApiProperty({ type: [String], description: 'Danh sách ID người quản lý' })
  @IsArray()
  @IsOptional()
  managers?: string[];

  @ApiProperty({ type: [String], description: 'Danh sách ID người duyệt' })
  @IsArray()
  @IsOptional()
  approvers?: string[];

  @ApiPropertyOptionalCustom({
    example: 'Mô tả nhóm tài nguyên',
    description: 'Mô tả nhóm tài nguyên',
    type: String,
  })
  description?: string;

  @ApiProperty({
    example: RoomGroupStatus.ACTIVE,
    description: 'Trạng thái nhóm tài nguyên',
    enum: RoomGroupStatus,
  })
  @IsEnum(RoomGroupStatus)
  status: RoomGroupStatus;

  @ApiProperty({ example: 3.5, description: 'Số giờ tối đa của một lịch họp (hh)' })
  @IsNumber()
  maxMeetingDurationHours: number;

  @ApiProperty({ example: 30, description: 'Thời gian hệ thống gửi nhắc nhở tham gia họp (phút)' })
  @IsNumber()
  systemReminderMinutes: number;

  @ApiProperty({
    example: RoomGroupApprovalProcess.ALL_APPROVERS,
    description: 'Quy trình duyệt',
    enum: RoomGroupApprovalProcess,
  })
  @IsEnum(RoomGroupApprovalProcess)
  approvalProcess: RoomGroupApprovalProcess;

  @ApiProperty({ type: [String], description: 'Danh sách ID đơn vị sử dụng nhóm phòng họp' })
  @IsArray()
  @IsOptional()
  organizationUnits?: string[];
}
