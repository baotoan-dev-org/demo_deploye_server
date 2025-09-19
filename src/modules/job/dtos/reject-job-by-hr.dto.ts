import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RejectJobByHRDto {
    @ApiProperty({ example: 'Lý do từ chối' })
    @IsString()
    @IsNotEmpty({ message: 'Lý do từ chối không được để trống' })
    hrRejectReason: string;
}
