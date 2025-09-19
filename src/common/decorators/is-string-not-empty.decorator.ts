import { applyDecorators } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';

export function IsStringNotEmpty() {
  return applyDecorators(IsString(), IsNotEmpty());
}
