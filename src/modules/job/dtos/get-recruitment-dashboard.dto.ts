import { ApiPropertyOptionalCustom } from "@/common/decorators/api-property-optional-custom.decorator";
import { ApiProperty } from "@nestjs/swagger";
import { IsDate, IsNumber, IsUUID } from "class-validator";

export class GetRecruitmentDashboardDto {
  @ApiPropertyOptionalCustom()
  @IsUUID()
  parentId?: string

  @ApiPropertyOptionalCustom()
  @IsUUID()
  orgUnitId?: string;

  @ApiPropertyOptionalCustom()
  @IsUUID()
  jobTitleId?: string;

  @ApiPropertyOptionalCustom()
  @IsNumber()
  year?: number;

  @ApiPropertyOptionalCustom()
  @IsNumber()
  month?: number;

  @ApiPropertyOptionalCustom()
  @IsNumber()
  week?: number;

  @ApiPropertyOptionalCustom()
  @IsDate()
  startDate?: Date;

  @ApiPropertyOptionalCustom()
  @IsDate()
  endDate?: Date;

  // @ApiPropertyOptionalCustom()

}
export class WeekDto {
  @ApiProperty()
  @IsNumber()
  year: number;

  @ApiProperty()
  @IsNumber()
  month: number;
}