import { Inject, Injectable } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { JwtService } from './jwt.service';
import { Request } from 'express';

@Injectable()
export class GlobalService {
  constructor(
    @Inject(REQUEST) private request: Request,

    private jwtService: JwtService,
  ) {}

  get user() {
    return this.request['user'];
  }

  get token() {
    return this.jwtService.getTokenFromRequest(this.request);
  }
}
