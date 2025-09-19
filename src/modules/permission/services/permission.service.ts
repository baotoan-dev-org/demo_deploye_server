import { BadRequestException, Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PermissionHandle } from '../permission.handle';
import { Module } from '../entities/module.entity';
import { Action } from '../entities/action.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, Not, Repository } from 'typeorm';
import { Reflector } from '@nestjs/core';
import { v4 as uuidv4 } from 'uuid';
import { ArrayService } from '@/common/services/array.service';
import { error } from 'console';

@Injectable()
export class PermissionService implements OnApplicationBootstrap {
  constructor(
    private dataSource: DataSource,

    private reflector: Reflector,

    private permissionHandle: PermissionHandle,

    private arrayService: ArrayService,

    @InjectRepository(Module)
    private moduleRepo: Repository<Module>,

    @InjectRepository(Action)
    private actionRepo: Repository<Action>,
  ) {}

  async onApplicationBootstrap() {
    const controllers = this.permissionHandle.scanControllers();

    const [modulesDb, actionsDb] = await Promise.all([
      this.moduleRepo.find({ select: { id: true, path: true } }),
      this.actionRepo.find({ select: { id: true, path: true, moduleId: true } }),
    ]);

    const modulesDbObj = this.arrayService.convertArrayToObj(modulesDb, ['path']);
    const actionsDbObj = this.arrayService.convertArrayToObj(actionsDb, [
      'httpMethod',
      'path',
      'moduleId',
    ]);

    const modulesUpSert: Partial<Module>[] = [];
    const actionsUpSert: Partial<Action>[] = [];

    controllers.forEach((controller) => {
      const { path, name, actions } = controller;

      const moduleId = modulesDbObj[path]?.id || uuidv4();
      modulesUpSert.push({ id: moduleId, name, path });

      actions.forEach((action) => {
        const { name, path, httpMethod } = action;

        const actionId = actionsDbObj[httpMethod + path + moduleId]?.id || uuidv4();
        actionsUpSert.push({ id: actionId, name, path, httpMethod, moduleId, primeValue: 0 });
      });
    });

    return await this.dataSource
      .transaction(async (manager) => {
        // await manager.delete(Module, { path: Not(In(modulesUpSert.map((e) => e.id))) });
        // await manager.delete(Action, { path: Not(In(actionsUpSert.map((e) => e.id))) });
        // await manager.save(Module, modulesUpSert);
        // await manager.save(Action, actionsUpSert);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }
}
