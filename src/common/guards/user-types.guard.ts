import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { USER_TYPES_KEY } from 'src/common/decorators/jwt-auth-user-types.decorator';
import { UserType } from 'src/modules/user/user.enum';
import { UserRequest } from '../interfaces/user-request.type';

@Injectable()
export class UserTypesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredUserTypes = this.reflector.get<string[]>(USER_TYPES_KEY, context.getHandler());

    const request = context.switchToHttp().getRequest();

    const user: UserRequest = request.user;

    if (!user) throw new UnauthorizedException('Bạn chưa xác thực!');

    if (!requiredUserTypes.includes(user.type) && user.type !== UserType.ROOT)
      throw new ForbiddenException('You do not have permission to perform this action!');

    return true;
  }
}
