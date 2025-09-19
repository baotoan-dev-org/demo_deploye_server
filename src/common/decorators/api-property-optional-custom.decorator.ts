import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export function ApiPropertyOptionalCustom(
  options?: Parameters<typeof ApiPropertyOptional>[0],
): PropertyDecorator {
  return applyDecorators(ApiPropertyOptional(options), IsOptional());
}
