import { BadRequestException, Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';

@Injectable()
export class ValidationService {
  constructor() {}

  startDateEndDate(startDate: Date, endDate: Date) {
    if (dayjs(startDate).diff(endDate, 'day', true) >= 0)
      throw new BadRequestException('Ngày kết thúc không thể nhỏ hơn hoặc bằng ngày bắt đầu!');
  }
}
