import { Injectable } from '@nestjs/common';
import { BcryptService } from 'src/common/services/bcrypt.service';
import { User } from '../user/entities/user.entity';
import { UserStatus, UserType } from '../user/user.enum';
import { v4 as uuidv4 } from 'uuid';
import { Position } from '../position/entities/position.entity';
import { UserRequest } from '@/common/interfaces/user-request.type';
import * as ExcelJS from 'exceljs';
import { LocalFileService } from '@/common/services/local-file.service';

@Injectable()
export class RootHandle {
  constructor(
    private bcryptService: BcryptService,

    private localFileService: LocalFileService,
  ) {}

  convertCellNAZeroString(value: any, resultWhenNAZeroString: any) {
    if (!value) return resultWhenNAZeroString;

    value = value.toString().trim();

    return value === 'N/A' || value === '0' ? resultWhenNAZeroString : value;
  }

  async readExcelPosition(user: UserRequest) {
    // For MacOS
    // const rows = await this.localFileService.excel('/Users/ducvo/Downloads/office-data/position.xlsx');

    // For Windows
    const rows = await this.localFileService.readExcel(
      `C:\\Users\\ducvo03851\\Downloads\\office-data\\position.xlsx`,
    );

    const positionsInsert: Partial<Position>[] = [];

    rows.forEach((row) => {
      const name = this.convertCellNAZeroString(row[0], null);
      const order = +this.convertCellNAZeroString(row[1], null);

      positionsInsert.push({
        id: uuidv4(),
        name,
        // order,
        createdById: user.id,
      });
    });

    return { positionsInsert };
  }

  async readExcelUser(user: UserRequest) {
    // For MacOS
    // const rows = await this.localFileService.excel('/Users/ducvo/Downloads/office-data/user.xlsx');

    // For Windows
    const rows = await this.localFileService.readExcel(
      `C:\\Users\\ducvo03851\\Downloads\\office-data\\user.xlsx`,
    );

    const usersInsert: Partial<User>[] = [];
    const password = await this.bcryptService.hash('123456');

    rows.forEach((row) => {
      const code = this.convertCellNAZeroString(row[1], null);
      const name = this.convertCellNAZeroString(row[2], null);
      const type = row[3] as UserType;
      const phone = this.convertCellNAZeroString(row[4], null);
      const email = this.convertCellNAZeroString(row[5], null);

      usersInsert.push({
        id: uuidv4(),
        code,
        name,
        type,
        email,
        phone,
        password,
        url: null,
        createdById: user.id,
        status: UserStatus.ACTIVE,
      });
    });

    return { usersInsert };
  }

  parseDate = (dateString: string): Date => {
    if (!dateString) return null;

    // Ép kiểu về string
    const dateStr = dateString.toString();

    // Kiểm tra format DD/MM/YYYY
    const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

    const match = dateStr.match(dateRegex);

    if (match) {
      const [, day, month, year] = match;
      // Tạo date với format YYYY-MM-DD
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }

    // Fallback cho các format khác
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? null : date;
  };

  buildColumnMap(worksheet: ExcelJS.Worksheet, COLUMN_MAPPING): Map<string, number> {
    const headerRow = worksheet.getRow(1);
    const columnMap = new Map<string, number>();

    headerRow.eachCell((cell, colNumber) => {
      const columnName = cell.value?.toString()?.trim();
      if (columnName && COLUMN_MAPPING[columnName as keyof typeof COLUMN_MAPPING]) {
        columnMap.set(columnName, colNumber);
      }
    });

    return columnMap;
  }

  extractRowData(row: ExcelJS.Row, columnMap: Map<string, number>, COLUMN_MAPPING): User {
    const rowData: User = {} as User;

    // Extract data based on column mapping
    columnMap.forEach((colNumber, columnName) => {
      const field = COLUMN_MAPPING[columnName as keyof typeof COLUMN_MAPPING];
      const cell = row.getCell(colNumber);
      const value = cell.value;

      if (value !== null && value !== undefined) {
        (rowData as any)[field] = value;
      }
    });

    return rowData;
  }
}
