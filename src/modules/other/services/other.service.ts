import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { CodeConfigType } from '../other.enum';
import { CodeConfig } from '../entities/code-config.entity';

@Injectable()
export class OtherService {
  constructor() {}

  async generateCode(type: CodeConfigType, numberPadStart: number, manager: EntityManager) {
    const row = await manager.findOne(CodeConfig, { where: { type } });

    if (row) await manager.update(CodeConfig, { type }, { currentMax: row.currentMax + 1 });
    else await manager.insert(CodeConfig, { type, currentMax: 1 });

    return type + (row ? row.currentMax + 1 : 1).toString().padStart(numberPadStart, '0');
  }
}
