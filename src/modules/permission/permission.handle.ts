import { SKIP_PERMISSION_KEY } from '@/common/decorators/skip-permission.decorator';
import { HttpMethod } from '@/common/enums/http-method.enum';
import { Injectable, RequestMethod } from '@nestjs/common';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { DiscoveryService, Reflector } from '@nestjs/core';

@Injectable()
export class PermissionHandle {
  constructor(
    private discovery: DiscoveryService,
    private readonly reflector: Reflector,
  ) {}

  scanControllers() {
    return this.discovery
      .getControllers()
      .filter((controller) => controller.metatype)
      .map((controller) => {
        const controllerClass = controller.metatype;

        const isControllerSkipped = this.reflector.get<boolean>(
          SKIP_PERMISSION_KEY,
          controllerClass,
        );
        if (isControllerSkipped) return null;

        const basePath = Reflect.getMetadata(PATH_METADATA, controllerClass) ?? '';
        const path = basePath.replace(/\//g, '');
        const routes = this.scanRoutes(controllerClass.prototype, basePath);

        return { path, name: controllerClass.name, actions: routes };
      })
      .filter(Boolean);
  }

  scanRoutes(prototype: any, basePath: string) {
    return Object.getOwnPropertyNames(prototype)
      .map((property) => {
        const httpMethod: RequestMethod = Reflect.getMetadata(METHOD_METADATA, prototype[property]);
        const path: string = Reflect.getMetadata(PATH_METADATA, prototype[property]);
        const apiOperation = Reflect.getMetadata('swagger/apiOperation', prototype[property]);

        const rawHttpMethod = RequestMethod[httpMethod] as string;

        const isMethodSkipped = this.reflector.get<boolean>(
          SKIP_PERMISSION_KEY,
          prototype[property],
        );

        if (
          httpMethod === undefined ||
          path === undefined ||
          isMethodSkipped ||
          !Object.values(HttpMethod).includes(rawHttpMethod as HttpMethod)
        )
          return null;

        return {
          name: apiOperation?.summary || 'Chưa cập nhật',
          path: `/${basePath}/${path}`.replace(/\/+/g, '/').replace(/\/$/, ''),
          httpMethod: rawHttpMethod as HttpMethod,
        };
      })
      .filter(Boolean);
  }
}
