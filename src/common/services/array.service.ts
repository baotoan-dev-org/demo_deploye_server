import { Injectable } from '@nestjs/common';
import { OrderType } from '../enums/order-type.enum';

@Injectable()
export class ArrayService {
  constructor() {}

  convertArrayToObj<T extends Record<string, any>>(
    array: T[],
    keys: (keyof T)[],
  ): Record<string, T>;

  convertArrayToObj<T extends Record<string, any>, K extends keyof T>(
    array: T[],
    keys: (keyof T)[],
    value: K,
  ): Record<string, T[K]>;

  convertArrayToObj<T extends Record<string, any>, K extends keyof T>(
    array: T[],
    keys: (keyof T)[],
    value?: K,
  ): Record<string, T | T[K]> {
    return array.reduce((acc, item) => {
      let objectKey = '';

      keys.forEach((key) => {
        objectKey += String(item[key]);
      });

      acc[objectKey] = value ? item[value] : item;

      return acc;
    }, {} as any);
  }

  compareArrayObjByField<T, U>(arr1: T[], arr2: U[], field: keyof T & keyof U): boolean {
    const set1 = new Set(arr1.map((item) => item[field]));
    const set2 = new Set(arr2.map((item) => item[field]));

    if (set1.size !== set2.size) return false;

    for (const value of set1) {
      if (!set2.has(value as any)) return false;
    }

    return true;
  }

  sortVariationOptions<T extends Record<string, any>>(
    options: T[],
    field: keyof T,
    orderType: OrderType = OrderType.ASC,
  ): T[] {
    return [...options].sort((a, b) => {
      const va = a[field] ?? '';
      const vb = b[field] ?? '';

      const isNumA = !isNaN(Number(va));
      const isNumB = !isNaN(Number(vb));

      let result: number;
      if (isNumA && isNumB) {
        result = Number(va) - Number(vb);
      } else if (isNumA) {
        result = -1;
      } else if (isNumB) {
        result = 1;
      } else {
        result = String(va).localeCompare(String(vb));
      }

      return orderType === OrderType.ASC ? result : -result;
    });
  }

  cartesian = (lists: any[][]): any[][] =>
    lists.reduce((acc, curr) => acc.flatMap((a) => curr.map((b) => [...a, b])), [[]]);
}
