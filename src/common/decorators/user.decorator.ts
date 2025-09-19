import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.type';
import { UserRequest } from '../interfaces/user-request.type';

export const User = createParamDecorator((data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest();
  return request['user'] as UserRequest;
});
