import { Injectable } from "@nestjs/common";
import axios from "axios";
import * as  https  from "https";
import * as mammoth from "mammoth";
import * as ExcelJS from 'exceljs';


@Injectable()
export class ReadJDService {

  async fetchDocxBufferFromUrl(url: string): Promise<Buffer> {
    const trustedHosts = ['dev.office.sevago.local'];  
    const hostname = new URL(url).hostname;

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // Bỏ kiểm tra chứng chỉ SSL
    });

    const encodedPath  = encodeURI(url);

    if (!trustedHosts.includes(hostname)) {
      throw new Error(`Untrusted source: ${hostname}`);
    }

    const res = await axios.get(encodedPath, {
      responseType: 'arraybuffer',
      httpsAgent, // Bypass SSL
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
        'Accept': '/*/*',
      }

    });

    return Buffer.from(res.data);
  };


  async convertDocxBufferToHtml(buffer: Buffer){
    const result = await mammoth.convertToHtml(
        { buffer },
        {
        styleMap: [
            "b => strong",
            "i => em",
            "u => u",
            "p[style-name='Heading 1'] => h1:fresh",
        ],
        }
    );

    const tableMatch = result.value?.match(/<table[\s\S]*?<\/table>/);
    const table = tableMatch?.[0] ?? '';
    const tdMatches = table.match(/<td[^>]*>[\s\S]*?<\/td>/g);
    
    return {
      requirement: tdMatches?.[2],
      description: tdMatches?.[3],
      welfare: '',
    }
  }

  async parseExcelFromFile(filePath: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath); 

    const ws = workbook.worksheets[0];
    const rows: any[][] = [];

    ws.eachRow((row, rowNumber) => {
    const rowData: any[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (isTopLeftOfMerge(ws, cell)) {
        rowData.push(cell.value);
      }
    });
    rows.push(rowData);
  });

    const description = parseDescription(rows);

    const requirement = parseReq(rows);

    return {
      requirement,
      description,
      welfare: '',
    }
  }

}

function isTopLeftOfMerge(ws: ExcelJS.Worksheet, cell: ExcelJS.Cell) {
  const merges = ws.model.merges as string[];
  for (const range of merges) {
    const [start, end] = range.split(':');
    const startCell = ws.getCell(start);
    const endCell = ws.getCell(end);

    if (
      cell.row >= startCell.row &&
      cell.row <= endCell.row &&
      cell.col >= startCell.col &&
      cell.col <= endCell.col
    ) {
      // nếu chính là ô gốc -> true
      return cell.address === startCell.address;
    }
  }
  return true; // ô thường (không merge) cũng coi như top-left
}

function parseDescription(data: any[][]) {
  const result: string[] = [];
  let currentGroup: string[] = [];
  let inList = false;
  let inDescription = false;

  function flushGroup() {
    if (currentGroup.length) {
      if (inList) {
        currentGroup.push("</ul>");
        inList = false;
      }
      result.push(currentGroup.join(""));
      currentGroup = [];
    }
  }

  let countRow = 1;
  for (const row of data) {
    if (!row.length) continue;
    const [index, text] = row;

    // Bắt đầu từ "III. NHIỆM VỤ"
    if (typeof index === "string" && index.trim().startsWith("III.")) {
      inDescription = true;
      continue;
    }

    // Gặp "IV." thì thoát
    if (typeof index === "string" && /^IV\./.test(index.trim())) {
      inDescription = false;
      break;
    }

    if (!inDescription) continue;

    // ===== Nhiệm vụ chính (số nguyên: 1,2,3) =====
    if (
      (typeof index === "number" && Number.isInteger(index)) ||
      (typeof index === "string" && /^[0-9]+$/.test(index))
    ) {
      flushGroup();
      currentGroup.push(`<p>${countRow}. ${text}</p>`);
      currentGroup.push("<ul>");
      inList = true;
      countRow ++;
    }

    // ===== Sub nhiệm vụ (1.1, 2.3 …) =====
    else if (
      (typeof index === "number" && !Number.isInteger(index)) || // float
      (typeof index === "string" && /^\d+\.\d+$/.test(index))    // string "1.1"
    ) {
      if (!inList) {
        currentGroup.push("<ul>");
        inList = true;
      }
      currentGroup.push(`<li>${text}</li>`);
    }
  }

  // Đóng group cuối
  flushGroup();

  return result.join("");
}


function parseReq(data: any[][]) {
  const result: string[] = [];
  let currentGroup: string[] = [];
  let inList = false;
  let inReq = false;
  let groupIndex = 0;
  let hasItem = false; // check có dữ liệu con hay không

  function flushGroup() {
    if (!hasItem) {
      // nếu group không có item => bỏ luôn
      currentGroup = [];
      inList = false;
      return;
    }
    if (currentGroup.length) {
      if (inList) {
        currentGroup.push("</ul>");
        inList = false;
      }
      result.push(currentGroup.join(""));
      currentGroup = [];
      hasItem = false;
    }
  }

  for (const row of data) {
    if (!row.length) continue;
    const [index, text] = row;

    // Bắt đầu từ "V. CÁC YÊU CẦU …"
    if (typeof index === "string" && index.trim().startsWith("V.")) {
      inReq = true;
      continue;
    }

    // Nếu sang "VI." thì dừng
    if (typeof index === "string" && /^VI\./.test(index.trim())) {
      inReq = false;
      break;
    }

    if (!inReq) continue;

    // ===== Nhóm lớn (A., B., C., D.) =====
    if (typeof text === "string" && /^[A-D]\./.test(text.trim())) {
      flushGroup();
      groupIndex++;
      currentGroup.push(`<p>${groupIndex}. ${text.replace(/^[A-D]\.\s*/, "")}</p>`);
      currentGroup.push("<ul>");
      inList = true;
    }
    // ===== Yêu cầu chi tiết (số 1,2,3...) =====
    else if (
      (typeof index === "number" && Number.isInteger(index)) ||
      (typeof index === "string" && /^[0-9]+$/.test(index))
    ) {
      if (!inList) {
        currentGroup.push("<ul>");
        inList = true;
      }
      currentGroup.push(`<li>${text}</li>`);
      hasItem = true;
    }
  }

  flushGroup();

  return result.join("");
}