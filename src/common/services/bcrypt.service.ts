import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BcryptService {
  constructor() {}

  async hash(data: string) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(data, salt);
    return hash;
  }

  async compareHash(data: string, hash: string) {
    return await bcrypt.compare(data, hash || '');
  }
}
