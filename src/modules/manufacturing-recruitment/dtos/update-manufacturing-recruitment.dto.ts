import { ApiProperty } from "@nestjs/swagger";
import { ManufacturingRecruitmentStatus } from "../manufacturing-recruitment.enum";
import { IsEnum, IsNotEmpty, IsString, ValidateIf } from "class-validator";
import { ApiPropertyOptionalCustom } from "@/common/decorators/api-property-optional-custom.decorator";

export class UpdateManufacturingRecruitmentDto {
    @ApiProperty({enum: ManufacturingRecruitmentStatus})
    @IsEnum(ManufacturingRecruitmentStatus)
    status: ManufacturingRecruitmentStatus;

    @ApiPropertyOptionalCustom({
      description: 'Nhập lý do trong trường hợp từ chối',
      default: 'Lý do từ chối',
    })
    @IsString()
    @ValidateIf((o) => [ManufacturingRecruitmentStatus.NOT_QUALIFIED, ManufacturingRecruitmentStatus.REJECTED, ManufacturingRecruitmentStatus.THANK_LETTER].includes(o.status))
    @IsNotEmpty({ message: 'Lý do từ chối là bắt buộc khi từ chối' })
    rejectReason?: string;
}