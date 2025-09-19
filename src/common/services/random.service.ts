import { Injectable } from '@nestjs/common';

@Injectable()
export class RandomService {
  constructor() {}

  string(len: number, an?: string) {
    an = an && an.toLowerCase();
    let str = '',
      i = 0;

    const min = an == 'a' ? 10 : 0,
      max = an == 'n' ? 10 : 62;

    for (; i++ < len; ) {
      let r = (Math.random() * (max - min) + min) << 0;
      str += String.fromCharCode((r += r > 9 ? (r < 36 ? 55 : 61) : 48));
    }

    return str;
  }

  otp() {
    const otp = Math.floor(1000 + Math.random() * 9000);
    return otp.toString();
  }
}
