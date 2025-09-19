import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export const IsBooleanCustom = () =>
  applyDecorators(
    Transform(({ obj, key }) =>
      obj[key] === 'true' ? true : obj[key] === 'false' ? false : obj[key],
    ),
    IsBoolean(),
  );
