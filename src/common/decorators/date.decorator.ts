import { applyDecorators, BadRequestException } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsDate } from 'class-validator';
import * as dayjs from 'dayjs';

export const IsDateFuture = () =>
  applyDecorators(
    Transform(({ value }) => {
      const date = dayjs(value);
      const now = dayjs();

      if (!date.isValid()) throw new BadRequestException('Invalid date format');

      if (date.isBefore(now) || date.isSame(now))
        throw new BadRequestException('Date must be in the future');

      return date.toDate();
    }),
    IsDate(),
  );

export const IsDatePast = () =>
  applyDecorators(
    Transform(({ value }) => {
      const date = dayjs(value);
      const now = dayjs();

      if (!date.isValid()) throw new BadRequestException('Invalid date format');

      if (!date.isBefore(now)) throw new BadRequestException('Date must be in the past');

      return date.toDate();
    }),
    IsDate(),
  );

export const IsDateSetStartTime = () =>
  applyDecorators(
    Transform(({ value }) => {
      const date = dayjs(value);

      if (!date.isValid()) throw new BadRequestException('Invalid date format');

      return date.startOf('day').toDate();
    }),
    IsDate(),
  );

export const IsDateSetEndTime = () =>
  applyDecorators(
    Transform(({ value }) => {
      const date = dayjs(value);

      if (!date.isValid()) throw new BadRequestException('Invalid date format');

      return date.endOf('day').toDate();
    }),
    IsDate(),
  );
