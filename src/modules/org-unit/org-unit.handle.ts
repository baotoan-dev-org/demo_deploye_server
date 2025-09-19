import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { OrgUnitType } from './org-unit.enum';
import { OrgUnit } from './entities/org-unit.entity';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { UserType } from '../user/user.enum';
import * as ExcelJS from 'exceljs';

export interface OrgUnitRecord {
  name: string;
  description: string;
}
@Injectable()
export class OrgUnitHandle {
  constructor() {}

  errorNotFoundEntityWithId<T>(entity: T | null | undefined, entityName: string, id: string): void {
    if (!entity) {
      throw new NotFoundException(`${entityName} with id ${id} not found`);
    }
  }

  errorConflictName<T>(entity: T | null | undefined, name: string): void {
    if (entity) {
      throw new BadRequestException(`Tên "${name}" đã tồn tại trong cùng cấp!`);
    }
  }

  validateOrgUnitTypeByParent(type: number, parent: any) {
    switch (parent ? parent.type : null) {
      case null:
        if (type !== OrgUnitType.BOARD_OF_DIRECTORS)
          throw new BadRequestException('Bắt buộc phải có cấp trên');
      case OrgUnitType.BOARD_OF_DIRECTORS:
        if (type !== OrgUnitType.DIVISION)
          throw new BadRequestException('Dưới ban giám đốc chỉ được phép là khối');
        break;
      case OrgUnitType.DIVISION:
        if (type !== OrgUnitType.DEPARTMENT)
          throw new BadRequestException('Dưới khối chỉ được phép là phòng ban');
        break;
      case OrgUnitType.DEPARTMENT:
        if (type !== OrgUnitType.PART)
          throw new BadRequestException('Dưới phòng ban chỉ được phép là bộ phận');
        break;
      case OrgUnitType.PART:
        if (type !== OrgUnitType.TEAM)
          throw new BadRequestException('Dưới bộ phận chỉ được phép là TEAM');
        break;
      case OrgUnitType.TEAM:
        if (type !== OrgUnitType.TEAM)
          throw new BadRequestException('Dưới TEAM chỉ được phép là TEAM');
        break;
      default:
        throw new BadRequestException('Cấp cha không hợp lệ');
    }
  }

  // Helper method để map tree và chỉ lấy fields cần thiết
  mapTreeToSelectFields(
    nodes: OrgUnit[],
    user: UserRequest,
    userExists: boolean,
    managerOrgUnitId: string,
  ) {
    return nodes.map((node: OrgUnit) => {
      const permission = userExists
        ? userExists
        : user.type === UserType.ADMIN || user.type === UserType.ROOT
          ? true
          : node.manager
            ? node.manager.id === user.id || node.manager.id === managerOrgUnitId
            : false;

      return {
        id: node.id,
        name: node.name,
        totalMember: node.totalMember,
        parentId: node.parentId,
        managerId: node.managerId,
        type: node.type,
        description: node.description,
        permission,
        manager: node.manager
          ? {
              id: node.manager.id,
              name: node.manager.name,
              code: node.manager.url,
            }
          : null,
        children: node.children
          ? this.mapTreeToSelectFields(node.children, user, permission, managerOrgUnitId)
          : [],
      };
    });
  }

  // Helper method để lấy tất cả IDs từ tree
  getAllOrgUnitIds(orgUnit: OrgUnit): string[] {
    const ids = [orgUnit.id];

    if (orgUnit.children && orgUnit.children.length > 0) {
      for (const child of orgUnit.children) {
        ids.push(...this.getAllOrgUnitIds(child));
      }
    }

    return ids;
  }

  filterTreeBySearch(orgUnits: OrgUnit[], search: string): OrgUnit[] {
    const filtered: OrgUnit[] = [];
    const searchNoSign = this.removeVietnameseTones(search?.toLowerCase() || '');

    orgUnits.forEach((orgUnit) => {
      const nameNoSign = this.removeVietnameseTones(orgUnit.name.toLowerCase());
      const matchesSearch = nameNoSign.includes(searchNoSign);
      const children = this.filterTreeBySearch(orgUnit.children, search);

      if (matchesSearch || children.length > 0) {
        filtered.push({
          id: orgUnit.id,
          name: orgUnit.name,
          type: orgUnit.type,
          parentId: orgUnit.parentId,
          managerId: orgUnit.managerId,
          children,
        } as OrgUnit);
      }
    });

    return filtered;
  }

  removeVietnameseTones(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  }

  /**
   * Build tree từ mảng positions dựa trên parentId
   */
  buildPathTree(ancestors: OrgUnit[]): OrgUnit | null {
    if (!ancestors.length) return null;

    // Tạo map để truy cập nhanh
    const orgUnitMap = new Map<string, OrgUnit>();
    ancestors.forEach((orgUnit) => {
      orgUnitMap.set(orgUnit.id, {
        id: orgUnit.id,
        name: orgUnit.name,
        type: orgUnit.type,
        parentId: orgUnit.parentId,
        managerId: orgUnit.managerId,
        children: [],
      } as OrgUnit);
    });

    let root: OrgUnit | null = null;

    // Tìm root: node có parentId = null hoặc parentId không có trong danh sách ancestors
    for (const orgUnit of ancestors) {
      if (!orgUnit.parentId || !ancestors.some((ancestor) => ancestor.id === orgUnit.parentId)) {
        root = orgUnitMap.get(orgUnit.id);
        break;
      }
    }

    if (!root) return null;

    // Build tree dựa trên parentId
    for (const orgUnit of ancestors) {
      if (orgUnit.parentId && orgUnit.id !== root.id) {
        const parent = orgUnitMap.get(orgUnit.parentId);
        const child = orgUnitMap.get(orgUnit.id);
        if (parent && child) {
          parent.children.push(child);
        }
      }
    }

    return root;
  }

  /**
   * Đệ quy trong ancestorsTree để tìm node cuối cùng và thay thế bằng descendantsTree
   */
  mergeDescendantsIntoAncestors(
    ancestorsTree: OrgUnit,
    descendantsTree: OrgUnit,
    targetOrgUnitId: string,
  ): OrgUnit {
    // Hàm đệ quy để tìm và thay thế node
    const findAndReplaceNode = (node: OrgUnit): OrgUnit => {
      // Nếu node hiện tại là target node, thay thế bằng descendantsTree
      if (node.id === targetOrgUnitId) {
        return {
          ...node,
          isTarget: true,
          children: descendantsTree.children || [],
        } as OrgUnit;
      }

      // Nếu có children, đệ quy qua từng child
      if (node.children && node.children.length > 0) {
        const updatedChildren = node.children.map((child) => findAndReplaceNode(child));
        return {
          ...node,
          children: updatedChildren,
        };
      }

      // Nếu không có children và không phải target node, giữ nguyên
      return node;
    };

    return findAndReplaceNode(ancestorsTree);
  }

  // Keep old method for backward compatibility if needed
  extractSheetDataAsText(worksheet: ExcelJS.Worksheet): string {
    const rows: string[] = [];
    const MAX_CELL_LENGTH = 300; // Giảm thêm
    const MAX_ROW_LENGTH = 1500; // Giảm thêm
    let totalLength = 0;
    const MAX_TOTAL_LENGTH = 20000; // Giảm đáng kể
    const seenContent = new Set<string>(); // Track duplicate content

    worksheet.eachRow((row, rowNumber) => {
      if (totalLength >= MAX_TOTAL_LENGTH) {
        rows.push('... (Dữ liệu đã được cắt ngắn)');
        return;
      }

      const rowData: string[] = [];
      const rowSeenContent = new Set<string>(); // Track duplicates trong row
      let rowLength = 0;

      row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        if (cell.value !== null && cell.value !== undefined && rowLength < MAX_ROW_LENGTH) {
          let cellValue = '';

          try {
            // Xử lý các loại dữ liệu khác nhau
            if (typeof cell.value === 'object' && cell.value !== null) {
              const cellObj = cell.value as any;
              if (cellObj.richText) {
                // Rich text - chỉ lấy text, bỏ formatting
                cellValue = cellObj.richText
                  .map((rt: any) => rt.text || '')
                  .join('')
                  .replace(/\s+/g, ' '); // Gộp multiple spaces thành 1
              } else if (cellObj.result !== undefined) {
                // Formula result
                cellValue = String(cellObj.result);
              } else if (cellObj.text) {
                // Hyperlink or other text objects
                cellValue = String(cellObj.text);
              } else if (cellObj.hyperlink) {
                // Hyperlink
                cellValue = cellObj.hyperlink;
              } else {
                // Other object types - skip phức tạp
                cellValue = '[Complex Object]';
              }
            } else {
              // Plain value (string, number, boolean, date)
              cellValue = String(cell.value).replace(/\s+/g, ' '); // Gộp spaces
            }

            // Clean up cellValue
            cellValue = cellValue.trim();

            // Skip empty hoặc chỉ có whitespace
            if (!cellValue || cellValue.length === 0) {
              return;
            }

            // Giới hạn độ dài mỗi cell
            if (cellValue.length > MAX_CELL_LENGTH) {
              cellValue = cellValue.substring(0, MAX_CELL_LENGTH) + '...';
            }

            // **KIỂM TRA DUPLICATE TRONG ROW**
            // Tạo signature cho content để check duplicate
            const contentSignature = cellValue.length > 50 ? cellValue.substring(0, 50) : cellValue;

            if (rowSeenContent.has(contentSignature)) {
              // Skip duplicate content trong cùng row
              return;
            }
            rowSeenContent.add(contentSignature);

            // Debug cell quá dài
            if (cellValue.length > 200) {
              console.warn(
                `⚠️ Long cell [${rowNumber},${colNumber}]: ${cellValue.length} chars - "${cellValue.substring(0, 50)}..."`,
              );
            }

            rowData.push(cellValue);
            rowLength += cellValue.length;
          } catch (cellError) {
            console.warn(`⚠️ Lỗi xử lý cell [${rowNumber},${colNumber}]:`, cellError.message);
            rowData.push('[Lỗi đọc cell]');
          }
        }
      });

      if (rowData.length > 0) {
        let rowText = rowData.join(' | ');

        // Giới hạn độ dài row
        if (rowText.length > MAX_ROW_LENGTH) {
          rowText = rowText.substring(0, MAX_ROW_LENGTH) + ' [...]';
        }

        // **KIỂM TRA DUPLICATE ROW**
        const rowSignature = rowText.length > 100 ? rowText.substring(0, 100) : rowText;
        if (!seenContent.has(rowSignature)) {
          seenContent.add(rowSignature);
          rows.push(rowText);
          totalLength += rowText.length;

          // Debug row dài
          if (rowText.length > 800) {
            console.warn(`⚠️ Long row ${rowNumber}: ${rowText.length} chars`);
          }
        } else {
          console.log(`🔄 Skipped duplicate row ${rowNumber}`);
        }
      }
    });

    const result = rows.join('\n');

    return result;
  }

  parseByNumbering(html: string, text: string): OrgUnitRecord[] {
    const records: OrgUnitRecord[] = [];

    // Tìm pattern số thứ tự: 1. 2. 3.
    const numberPattern = /^(\d+)\.\s*(.+?)$/gm;
    const matches = [...text.matchAll(numberPattern)];

    if (matches.length === 0)
      throw new BadRequestException('Không tìm thấy format số thứ tự (1. 2. 3.) trong file');

    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const nextMatch = matches[i + 1];

      // Lấy tên từ dòng đầu tiên
      const name = currentMatch[2].trim();

      // Tìm vị trí bắt đầu và kết thúc của record
      const startIndex = text.indexOf(currentMatch[0]);
      const endIndex = nextMatch ? text.indexOf(nextMatch[0]) : text.length;

      // Lấy nội dung record
      const recordContent = text.substring(startIndex, endIndex);

      // Tìm HTML tương ứng
      const htmlContent = this.findCorrespondingHtml(html, recordContent);

      // Parse fields từ record content
      const fields = this.parseFieldsFromRecord(htmlContent, recordContent);

      if (name && fields.description) {
        records.push({
          name,
          description: fields.description,
        });
      }
    }

    return records;
  }

  private findCorrespondingHtml(html: string, textContent: string): string {
    // Lấy 50 ký tự đầu để tìm vị trí trong HTML
    const searchText = textContent.substring(0, 50).replace(/\s+/g, ' ').trim();

    // Remove HTML tags để so sánh
    const cleanHtml = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
    const index = cleanHtml.indexOf(searchText);

    if (index !== -1) {
      // Tìm vị trí tương ứng trong HTML gốc
      let htmlIndex = 0;
      let textIndex = 0;

      while (textIndex < index && htmlIndex < html.length) {
        if (html[htmlIndex] === '<') {
          // Skip HTML tags
          while (htmlIndex < html.length && html[htmlIndex] !== '>') {
            htmlIndex++;
          }
          htmlIndex++;
        } else {
          if (!/\s/.test(html[htmlIndex])) {
            textIndex++;
          }
          htmlIndex++;
        }
      }

      // Tìm điểm kết thúc (record tiếp theo hoặc end)
      const nextRecordPattern = /\d+\.\s/;
      const remainingHtml = html.substring(htmlIndex);
      const nextMatch = remainingHtml.search(nextRecordPattern);

      if (nextMatch !== -1) {
        return html.substring(htmlIndex, htmlIndex + nextMatch);
      } else {
        return html.substring(htmlIndex);
      }
    }

    return textContent; // Fallback
  }

  private parseFieldsFromRecord(
    htmlContent: string,
    textContent: string,
  ): {
    description: string;
  } {
    let description = '';

    // Tìm các separator trong HTML
    const descMatch = htmlContent.match(/===\s*DESCRIPTION\s*===(.*?)(?:===\s*FIELD2\s*===|$)/is);

    if (descMatch) description = descMatch[1].trim();

    // Nếu không tìm thấy separator, fallback về text parsing
    if (!description) {
      const lines = textContent.split('\n').map((line) => line.trim());
      let currentField = 'description';
      let currentContent: string[] = [];
      let startCollecting = false;

      for (const line of lines) {
        // Skip số thứ tự và tên
        if (/^\d+\.\s/.test(line)) {
          startCollecting = true;
          continue;
        }

        if (!startCollecting) continue;

        const lowerLine = line.toLowerCase();

        if (lowerLine.includes('===description===') || lowerLine.includes('mô tả')) {
          if (currentField === 'description' && currentContent.length > 0)
            description = currentContent.join('\n').trim();

          currentField = 'description';
          currentContent = [];
        } else if (line && !line.includes('===')) currentContent.push(line);
      }

      // Lưu field cuối cùng
      if (currentContent.length > 0 && currentField === 'description')
        description = currentContent.join('\n').trim();

      // Nếu vẫn không có gì, lấy tất cả làm description
      if (!description) {
        const contentLines = lines.slice(1); // Skip first line (number + name)
        description = contentLines.join('\n').trim();
      }
    }

    return { description };
  }
}
