import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateRootDto {
  @ApiProperty({ default: 'R120' })
  @IsString()
  code: string;

  @ApiProperty({ default: 'Root Office' })
  @IsString()
  name: string;

  @ApiProperty({ default: '0765432109' })
  @IsString()
  phone: string;

  @ApiProperty({ default: 'root@gmail.com' })
  @IsString()
  email: string;

  @ApiProperty({ default: '123456' })
  @IsString()
  password: string;
}
