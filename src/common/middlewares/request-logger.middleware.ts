// src/common/middlewares/request-logger.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl } = req;

    Logger.log(`[Request] ${method} ${originalUrl}`);

    res.locals.requestTime = Date.now();

    next();
  }
}
