import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtExternalGuard } from '../guards/jwt-external.guard';

export const JwtExternalAuth = () => applyDecorators(ApiBearerAuth(), UseGuards(JwtExternalGuard));
