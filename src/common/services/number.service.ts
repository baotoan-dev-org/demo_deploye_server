import { Injectable } from '@nestjs/common';

@Injectable()
export class NumberService {
  constructor() {}

  round(number: number, decimalPlaces: number = 1): number {
    return +number.toFixed(decimalPlaces);
  }
}
