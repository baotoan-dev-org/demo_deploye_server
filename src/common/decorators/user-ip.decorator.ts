import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserIp = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest();

  const forwarded = request.headers['x-forwarded-for'];
  let ip = Array.isArray(forwarded) ? forwarded[0] : forwarded || request.socket.remoteAddress;
  if (ip === '::1') ip = '127.0.0.1';
  if (ip?.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  return ip;
});
