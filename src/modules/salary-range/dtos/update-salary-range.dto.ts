import { PartialType } from "@nestjs/swagger";
import { CreateSalaryRangeDto } from "./create-salary-range.dto";

export class UpdateSalaryRangeDto extends PartialType(CreateSalaryRangeDto) {}
