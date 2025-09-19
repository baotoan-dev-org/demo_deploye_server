import { applyDecorators, SetMetadata, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserType } from 'src/modules/user/user.enum';
import { JwtGuard } from 'src/common/guards/jwt.guard';
import { UserTypesGuard } from 'src/common/guards/user-types.guard';

export const USER_TYPES_KEY = 'USER_TYPES_KEY';

export const JwtAuthUserTypes = (...userTypes: UserType[]) =>
  applyDecorators(
    ApiBearerAuth(),
    UseGuards(JwtGuard, UserTypesGuard),
    SetMetadata(USER_TYPES_KEY, userTypes),
  );
