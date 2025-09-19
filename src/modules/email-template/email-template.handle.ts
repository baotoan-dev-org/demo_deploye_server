import { ConflictException, Injectable } from '@nestjs/common';

@Injectable()
export class EmailTemplateHandle {
  constructor() {}

  errorConflictEmail(existsEmail: boolean) {
    if (existsEmail) throw new ConflictException(`Email với trạng thái này đã tồn tại`);
  }
}
