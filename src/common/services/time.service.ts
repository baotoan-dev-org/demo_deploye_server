import { Injectable } from '@nestjs/common';
import * as dayjs from 'dayjs';

@Injectable()
export class TimeService {
  constructor() {}

  getExpirationTime(minutes: number): Date {
    return dayjs().add(minutes, 'minute').toDate();
  }

  getMonthsRangeArray(startDate: Date, endDate: Date): string[] {
    const start = dayjs(startDate).startOf('month');
    const end = dayjs(endDate).startOf('month');

    const months = [];
    let current = start;

    while (current.isBefore(end) || current.isSame(end)) {
      months.push(current.format('YYYYMM'));
      current = current.add(1, 'month');
    }

    return months;
  }

  getDateRangeArray(startDate: Date, endDate: Date): string[] {
    const dateArray = [];
    let currentDate = dayjs(startDate);

    while (currentDate.isBefore(dayjs(endDate).add(1, 'day'))) {
      dateArray.push(currentDate.format('YYYYMMDD'));
      currentDate = currentDate.add(1, 'day');
    }

    return dateArray;
  }

  getStartTimeEndTimeOfTwoWeeksBefore(date: Date) {
    const mondayCurrentWeek = dayjs(date).day(1);

    const startOfTwoWeeksAgo = mondayCurrentWeek.subtract(2, 'week');

    return {
      week1: {
        startTime: new Date(
          new Date(dayjs(startOfTwoWeeksAgo).add(0, 'day').format('YYYY-MM-DD')).setHours(
            0,
            0,
            0,
            0,
          ),
        ),
        endTime: new Date(
          new Date(dayjs(startOfTwoWeeksAgo).add(6, 'day').format('YYYY-MM-DD')).setHours(
            23,
            59,
            59,
            999,
          ),
        ),
      },
      week2: {
        startTime: new Date(
          new Date(dayjs(startOfTwoWeeksAgo).add(7, 'day').format('YYYY-MM-DD')).setHours(
            0,
            0,
            0,
            0,
          ),
        ),
        endTime: new Date(
          new Date(dayjs(startOfTwoWeeksAgo).add(13, 'day').format('YYYY-MM-DD')).setHours(
            23,
            59,
            59,
            999,
          ),
        ),
      },
    };
  }

  getRangeForTwoMonthsAgo(startTime: string) {
    const today = dayjs(startTime);
    const currentDay = today.date();

    // Hàm lấy thông tin { startTime, endTime } cho một tháng
    const getMonthRange = (year, month, maxDay) => {
      const daysInMonth = dayjs(new Date(year, month + 1, 0)).date(); // Số ngày trong tháng
      const limit = Math.min(daysInMonth, maxDay); // Ngày cuối tháng không vượt quá maxDay
      return {
        startTime: dayjs(new Date(year, month, 1)).format('YYYYMMDD'),
        endTime: dayjs(new Date(year, month, limit)).format('YYYYMMDD'),
      };
    };

    // Xây dựng dữ liệu cho tháng hiện tại
    const currentMonthKey = today.format('YYYYMM');
    const currentMonthData = getMonthRange(today.year(), today.month(), currentDay);

    // Xây dựng dữ liệu cho tháng trước
    const lastMonth = today.subtract(1, 'month');
    const lastMonthKey = lastMonth.format('YYYYMM');
    const lastMonthData = getMonthRange(lastMonth.year(), lastMonth.month(), currentDay);

    // Xây dựng dữ liệu cho tháng trước nữa
    const twoMonthsAgo = today.subtract(2, 'month');
    const twoMonthsAgoKey = twoMonthsAgo.format('YYYYMM');
    const twoMonthsAgoData = getMonthRange(twoMonthsAgo.year(), twoMonthsAgo.month(), currentDay);

    // Kết quả cuối cùng
    const result = {
      [currentMonthKey]: currentMonthData,
      [lastMonthKey]: lastMonthData,
      [twoMonthsAgoKey]: twoMonthsAgoData,
    };

    return result;
  }

  getDateFromString(val: string | Date) {
    if (!val) return null;
    if (val instanceof Date) return val;
    if (typeof val === 'string') {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return d;
    }
    return null;
  }

  formatDate(date: Date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  add7Hours(date: Date): Date {
    return new Date(date.getTime() + 7 * 60 * 60 * 1000);
  }

  compareDateField(v1, v2): boolean {
    if (!v1 && !v2) return false;
    const getDayString = (val) => {
      if (!val) return '';
      if (val instanceof Date) return val.toISOString().slice(0, 10);
      if (typeof val === 'string') {
        const d = new Date(val);
        return !isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
      }
      return '';
    };
    return getDayString(v1) !== getDayString(v2);
  }
}
