import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Industry } from './entities/industry.entity';

@Injectable()
export class IndustryHandle {
  constructor() {}

  errorNotFoundIndustry(idOrCode: string): never {
    throw new BadRequestException(`Không tìm thấy ngành nghề với ID hoặc mã ${idOrCode}`);
  }

  errorNotFoundEntityWithId<T>(entity: T | null | undefined, entityName: string, id: string): void {
    if (!entity) {
      throw new BadRequestException(`${entityName} với ID ${id} không tìm thấy`);
    }
  }

  errorConflictName(conflict: Industry, name: string) {
    if (!conflict) return;
    if (conflict && conflict.name === name) throw new ConflictException('Tên đã được sử dụng!');
  }
}
