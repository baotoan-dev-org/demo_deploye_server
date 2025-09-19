import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderType } from 'src/common/enums/order-type.enum';
import {
  FindOptionsOrder,
  FindOptionsRelations,
  FindOptionsSelect,
  FindOptionsWhere,
  ILike,
} from 'typeorm';

interface QueryOptions<T> {
  whereItem?: FindOptionsWhere<T>;
  relations?: FindOptionsRelations<T>;
  select?: FindOptionsSelect<T>;
  order?: FindOptionsOrder<T>;
}
@Injectable()
export class QueryService {
  constructor() {}

  makeOptions<T>(opts: QueryOptions<T> = {}): {
    whereItem: FindOptionsWhere<T>;
    relations: FindOptionsRelations<T>;
    select: FindOptionsSelect<T>;
    order: FindOptionsOrder<T>;
    where: FindOptionsWhere<T>[];
  } {
    const whereItem = opts.whereItem ?? ({} as FindOptionsWhere<T>);
    return {
      where: [whereItem],
      whereItem,
      relations: opts.relations ?? ({} as FindOptionsRelations<T>),
      select: opts.select ?? ({} as FindOptionsSelect<T>),
      order: opts.order ?? ({} as FindOptionsOrder<T>),
    };
  }

  getPagination(params: { page: number; take: number }) {
    const { page, take } = params;
    return page && take ? { skip: (page - 1) * take, take } : {};
  }

  paginationManual(params: {
    list: any[];
    page: number;
    take: number;
    orderBy: string;
    order: OrderType;
    searchFields?: string[];
    search?: string;
  }) {
    const { page, take, orderBy, order, searchFields, search } = params;
    let list = params.list;

    if (!list.length) return { total: 0, list };

    // Validate
    if (!list[0][orderBy]) throw new BadRequestException('Property sort not exists in list!');

    if (search && searchFields && searchFields.length) {
      searchFields.forEach((searchField) => {
        if (!list[0][searchField])
          throw new BadRequestException('Property search not exists in list!');
      });

      list = list.filter((item) => {
        for (const searchField of searchFields) {
          if (item[searchField].toString().includes(search)) return item;
        }
      });

      if (!list.length) return { total: 0, list };
    }

    const typeOfPropertyOrderBy = typeof list[0][orderBy];

    list.sort((a, b) => {
      if (typeOfPropertyOrderBy === 'number') {
        return order === OrderType.ASC ? a[orderBy] - b[orderBy] : b[orderBy] - a[orderBy];
      }
      if (typeOfPropertyOrderBy === 'string') {
        return order === OrderType.ASC ? 1 : -1;
      }
    });
    // 1-10, 2-10, 3-20

    const startSlice = (page - 1) * take; // 0, 10, 40
    const endSlice = page * take; // 10, 20, 60

    return { total: list.length, list: list.slice(startSlice, endSlice) };
  }

  search<T>(params: {
    arrayPropertyLike: (keyof T)[];
    whereItem: FindOptionsWhere<T>;
    search: string;
  }): FindOptionsWhere<T>[] {
    const where: FindOptionsWhere<T>[] = [];
    const { arrayPropertyLike, whereItem, search } = params;

    arrayPropertyLike.forEach((property) => {
      where.push({ ...whereItem, [property]: ILike(`%${search}%`) } as FindOptionsWhere<T>);
    });

    return where;
  }
}
