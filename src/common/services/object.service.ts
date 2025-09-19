import { Injectable } from '@nestjs/common';

@Injectable()
export class ObjectService {
  constructor() {}

  getOrCreate(obj: any, key: string, defaultValue: any) {
    if (!obj[key]) obj[key] = defaultValue;
    return obj[key];
  }

  sortObjectByKeyLengthDesc = (obj: Record<string, any>): Record<string, any> => {
    return Object.fromEntries(
      Object.entries(obj).sort(([keyA], [keyB]) => keyB.length - keyA.length),
    );
  };

  sortObjAlpha(obj: Record<string, any>): Record<string, any> {
    return Object.keys(obj)
      .sort() // Sắp xếp theo thứ tự alphabet (A → Z)
      .reduce((sortedObj: Record<string, any>, key) => {
        sortedObj[key] = obj[key];
        return sortedObj;
      }, {});
  }

  // Hàm lấy các trường đã thay đổi giữa hai đối tượng
  hasIdsChanged(oldList, newIds: string[] = []): boolean {
    const oldIds = (oldList ?? []).map((i) => i.id).sort();
    const sortedNewIds = (newIds ?? []).sort();
    if (oldIds.length !== sortedNewIds.length) return true;
    return oldIds.some((id, idx) => id !== sortedNewIds[idx]);
  }
}
