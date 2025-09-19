import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import { Response } from 'express';
import { EXCEL_STYLE } from '../consts/excel-style.const';

@Injectable()
export class LocalFileService {
  constructor() {}

  styleDefaultRowExcel(row: ExcelJS.Row) {
    row.eachCell((cell) => {
      cell.border = EXCEL_STYLE.border;
      cell.font = EXCEL_STYLE.content.fontBlack;
      cell.alignment = EXCEL_STYLE.content.alignment;
    });
  }

  styleDefaultHeaderExcel(row: ExcelJS.Row) {
    row.font = EXCEL_STYLE.header.font;
    row.alignment = EXCEL_STYLE.header.alignment;
    row.eachCell((cell) => {
      cell.border = EXCEL_STYLE.border;
      cell.fill = EXCEL_STYLE.header.fill;
    });
  }

  fitColumnWidthHeightExcel(
    worksheet: ExcelJS.Worksheet,
    fixedHeightRows?: Set<number>, //  Những dòng sẽ style height bằng tay không áp dụng auto fit
    rowHeight?: number,
  ) {
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.isMerged || (cell.master && cell.master.address !== cell.address)) return;
        if (cell.value != null) {
          const length = cell.value.toString().trim().length;
          if (length > maxLength) maxLength = length;
        }
      });

      let width = maxLength + 3;
      column.width = Math.max(width, 7);
    });

    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      if (fixedHeightRows?.has(rowNumber)) return;

      let maxLines = 1;
      row.eachCell({ includeEmpty: true }, (cell) => {
        if (cell.value) {
          const lines = cell.value.toString().split('\n').length;
          if (lines > maxLines) maxLines = lines;
        }
      });
      row.height = maxLines * (rowHeight || 18);
    });
  }

  getFileNamesFromFolder(folderPath: string): string[] {
    const files = fs.readdirSync(folderPath);
    return files.map((file) => path.basename(file));
  }

  sendExcelAtController(res: Response, fileName: string, buffer: Buffer) {
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}.xlsx"`,
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    res.send(buffer);
  }

  async readExcel(filePath: string) {
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];
    const rows: any[] = [];

    worksheet.eachRow((row) => {
      const values = (row.values as any[]).slice(1);
      rows.push(values);
    });

    const [, ...rest] = rows;

    return rest;
  }

  async readLargeExcel(filePath: string) {
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
      entries: 'emit',
      sharedStrings: 'cache',
      styles: 'cache',
      worksheets: 'emit',
    });

    const rows: any[] = [];

    for await (const worksheet of workbookReader) {
      for await (const row of worksheet) {
        const values = (row.values as any[]).slice(1);
        rows.push(values);
      }
    }

    const [, ...rest] = rows;

    return rest;
  }

  async removeColumnsExcelByIndex(
    filePath: string,
    columnIndexesToRemove: number[],
  ): Promise<string> {
    if (!fs.existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const worksheet = workbook.worksheets[0];

    const newWorkbook = new ExcelJS.Workbook();
    const newWorksheet = newWorkbook.addWorksheet('Sheet1');

    worksheet.eachRow((row) => {
      const filtered = (row.values as any[])
        .slice(1) // Bỏ phần tử đầu (ExcelJS bắt đầu từ 1)
        .filter((_, index) => !columnIndexesToRemove.includes(index));

      newWorksheet.addRow(filtered);
    });

    const ext = '.xlsx';
    const fileNameWithoutExt = filePath.replace(ext, '');
    const newFilePath = `${fileNameWithoutExt}_1${ext}`;

    await newWorkbook.xlsx.writeFile(newFilePath);

    return newFilePath;
  }

  async exportArrayStringToExcel(
    array: string[],
    fileName: string,
    columnName: string,
  ): Promise<{
    fileName: string;
    buffer: ExcelJS.Buffer;
  }> {
    if (!array.length) throw new Error('Array is empty');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(columnName);

    const headerRow = worksheet.addRow([columnName]);
    this.styleDefaultHeaderExcel(headerRow);

    array.forEach((e) => {
      const row = worksheet.addRow([e]);
      this.styleDefaultRowExcel(row);
    });

    this.fitColumnWidthHeightExcel(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();

    return { fileName, buffer };
  }

  async exportArrayObjectToExcel<T extends object>(
    array: T[],
    fileName: string,
    columnNameObj: Partial<Record<keyof T, string>>, // chọn field nào và header hiển thị là gì
    sheetName?: string,
  ): Promise<{
    fileName: string;
    buffer: Buffer;
  }> {
    if (!array.length) throw new Error('Array is empty');

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName || 'SHEET');

    // HEADER
    const keys = Object.keys(columnNameObj) as (keyof T)[];
    const headers = keys.map((key) => columnNameObj[key]!);
    const headerRow = worksheet.addRow(headers);
    this.styleDefaultHeaderExcel(headerRow);

    array.forEach((obj) => {
      // ROW
      const dataRow = keys.map((key) => (obj as any)[key]);
      const row = worksheet.addRow(dataRow);
      this.styleDefaultRowExcel(row);
    });

    this.fitColumnWidthHeightExcel(worksheet);

    const buffer = (await workbook.xlsx.writeBuffer()) as unknown as Buffer;

    return { fileName, buffer };
  }
}
