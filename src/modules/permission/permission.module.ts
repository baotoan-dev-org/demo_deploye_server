import { forwardRef, Module } from '@nestjs/common';
import { PermissionController } from './controllers/permission.controller';
import { PermissionService } from './services/permission.service';
import { PermissionHandle } from './permission.handle';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Action } from './entities/action.entity';
import { Module as ModuleEntity } from './entities/module.entity';
import { DiscoveryModule } from '@nestjs/core';
import { AccessControlService } from './services/access-control.service';
import { OrgUnitModule } from '../org-unit/org-unit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ModuleEntity, Action]),
    DiscoveryModule,
    forwardRef(() => OrgUnitModule),
  ],
  controllers: [PermissionController],
  providers: [PermissionService, PermissionHandle, AccessControlService],
  exports: [PermissionService, PermissionHandle, AccessControlService],
})
export class PermissionModule {}
