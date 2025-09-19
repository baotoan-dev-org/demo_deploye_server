import { applyDecorators } from '@nestjs/common';
import { IsArray, IsString } from 'class-validator';

export function IsStringArray(): PropertyDecorator {
  return applyDecorators(IsArray(), IsString({ each: true }));
}
