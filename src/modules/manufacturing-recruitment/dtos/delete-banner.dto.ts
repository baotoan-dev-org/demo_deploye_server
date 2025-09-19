import { ApiProperty } from "@nestjs/swagger";
import { IsNumber } from "class-validator";

export class DeleteBannerDto{
  @ApiProperty({ description: 'index on attachments' })
  @IsNumber()
  index: number;
}