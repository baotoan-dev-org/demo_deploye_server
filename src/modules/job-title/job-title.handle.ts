import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { JobTitle } from './entities/job-title.entity';

@Injectable()
export class JobTitleHandle {
  constructor() {}

  errorNotFoundJobTitle(id: string): never {
    throw new BadRequestException(`Không tìm thấy chức danh tuyển dụng với ID ${id}`);
  }

  errorNotFoundEntityWithId<T>(entity: T | null | undefined, entityName: string, id: string): void {
    if (!entity) {
      throw new BadRequestException(`${entityName} với ID ${id} không tìm thấy`);
    }
  }

  errorConflictName(conflict: JobTitle, name: string) {
    if (!conflict) return;
    if (conflict && conflict.name === name) throw new ConflictException('Chức danh đã được sử dụng!');
  }
}
