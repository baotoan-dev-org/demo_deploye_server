import { IsEnum, IsNumber, IsString } from 'class-validator';
import { OrderType } from 'src/common/enums/order-type.enum';
import { ApiPropertyOptionalCustom } from '../decorators/api-property-optional-custom.decorator';
import { IsBooleanCustom } from '../decorators/is-boolean-custom.decorator';

export class PageOptionsDto {
  @ApiPropertyOptionalCustom({ enum: OrderType, default: OrderType.DESC })
  @IsEnum(OrderType)
  order?: OrderType = OrderType.DESC;

  @ApiPropertyOptionalCustom({ default: 'updatedAt' })
  @IsString()
  orderBy?: string = 'updatedAt';

  @ApiPropertyOptionalCustom({ default: 1 })
  @IsNumber()
  page?: number = 1;

  @ApiPropertyOptionalCustom({ default: 10 })
  @IsNumber()
  take?: number = 10;

  @ApiPropertyOptionalCustom()
  @IsString()
  search?: string;

  @ApiPropertyOptionalCustom({ description: 'Nếu true sẽ có join table' })
  @IsBooleanCustom()
  isRelations?: boolean = false;
}
