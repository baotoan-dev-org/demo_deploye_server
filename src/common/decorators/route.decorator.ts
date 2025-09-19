import { Controller, applyDecorators } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

export const Route = (path: string) => {
  const tag = path.split('-').reduce((result, string, index) => {
    result += (index !== 0 ? ' ' : '') + string.charAt(0).toUpperCase() + string.slice(1);
    return result;
  }, '');

  return applyDecorators(Controller({ path, version: '1' }), ApiTags(tag));
};
