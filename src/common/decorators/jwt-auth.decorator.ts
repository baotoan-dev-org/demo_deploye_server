import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from 'src/common/guards/jwt.guard';

export const JwtAuth = () => applyDecorators(ApiBearerAuth(), UseGuards(JwtGuard));
