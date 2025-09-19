import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { Position } from './entities/position.entity';
import { OrgUnitType } from '../org-unit/org-unit.enum';
import { User } from '../user/entities/user.entity';
import { UserStatus } from '../user/user.enum';
import { OrgUnit } from '../org-unit/entities/org-unit.entity';
import { PositionTreeNode } from './interfaces/position.interface';

export interface PositionRecord {
  name: string;
  description: string;
  task: string;
  authority: string;
}
@Injectable()
export class PositionHandle {
  constructor() {}

  errorNotFoundPosition(idOrCode: string): never {
    throw new BadRequestException(`Không tìm thấy vị trí với ID hoặc mã ${idOrCode}`);
  }

  errorNotFoundEntityWithId<T>(entity: T | null | undefined, entityName: string, id: string): void {
    if (!entity) throw new BadRequestException(`${entityName} với ID ${id} không tìm thấy`);
  }

  errorConflictName(conflict: Position, name: string) {
    if (!conflict) return;
    if (conflict && conflict.name === name) throw new ConflictException('Tên đã được sử dụng!');
  }

  // Helper method để map tree và chỉ lấy fields cần thiết
  mapTreeToSelectFields(nodes: Position[]) {
    return nodes.map((node: Position) => ({
      id: node.id,
      name: node.name,
      status: node.status,
      userOrgUnitPositions: node.userOrgUnitPositions
        ? node.userOrgUnitPositions.map((e) => ({
            id: e.id,
            user: {
              id: e.user.id,
              name: e.user.name,
              url: e.user.url,
            },
          }))
        : null,
      children: node.children ? this.mapTreeToSelectFields(node.children) : [],
    }));
  }

  processPositionTreeReplace(
    positions: Position[],
    orgUnitMap: Map<string, any>,
    orgUnitMapDivision: Map<string, any>,
    parentId: string | null,
    userId: string,
    uniqueOrgUnit: Set<string>,
    parentPermission: boolean = false,
  ): PositionTreeNode[] {
    return positions
      .map((position) => {
        // Kiểm tra nếu position đã được xử lý trước đó (sử dụng prefix để phân biệt với orgUnit)
        const positionKey = `pos_${position.id}`;
        if (uniqueOrgUnit.has(positionKey)) {
          return null; // Bỏ qua node đã được xử lý
        }

        // Đánh dấu position này đã được xử lý
        uniqueOrgUnit.add(positionKey);
        // unit khác ban giám đốc
        const nonBoardOrgUnits =
          position.userOrgUnitPositions?.filter(
            (uoup) => uoup.orgUnit && uoup.orgUnit.type !== OrgUnitType.BOARD_OF_DIRECTORS,
          ) || [];

        if (nonBoardOrgUnits.length > 0 && parentId) {
          // Nếu có ít nhất 1 nonBoardOrgUnits, cấm tất cả orgUnitMapDivision và cả các orgUnit từ orgUnitMap.get(uoup.orgUnit.id) vào parentId
          const divisionOrgUnits = Array.from(orgUnitMapDivision.values());
          const joinedOrgUnits = nonBoardOrgUnits
            .map((uoup) => orgUnitMap.get(uoup.orgUnit.id))
            .filter(Boolean);
          const allOrgUnits = [...divisionOrgUnits, ...joinedOrgUnits].filter(
            (orgUnit, idx, arr) => orgUnit && arr.findIndex((o) => o.id === orgUnit.id) === idx,
          );
          return allOrgUnits
            .map((orgUnit) => {
              const orgUnitKey = `org_${orgUnit.id}`;
              if (uniqueOrgUnit.has(orgUnitKey)) return null;
              uniqueOrgUnit.add(orgUnitKey);
              const orgUnitTree = this.buildOrgUnitTree(
                orgUnit,
                orgUnitMap,
                userId,
                parentPermission,
                uniqueOrgUnit,
              );
              orgUnitTree.parentId = parentId;
              return orgUnitTree;
            })
            .filter(Boolean);
        }

        // Nếu không có orgUnit type !== 1, tiếp tục đệ quy với children position
        const userPosition: User = position.userOrgUnitPositions.length
          ? position.userOrgUnitPositions[0].user
          : null;

        const processedPosition: PositionTreeNode = {
          id: position.id,
          name: position.name,
          status: position.status,
          parentId: parentId,
          manager:
            position.userOrgUnitPositions.length &&
            position.userOrgUnitPositions[0].user.status === UserStatus.ACTIVE
              ? {
                  id: position.userOrgUnitPositions[0].user.id,
                  name: position.userOrgUnitPositions[0].user.name,
                  url: position.userOrgUnitPositions[0].user.url,
                }
              : null,
          permission: userPosition ? userPosition.id === userId : false, // truyền trạng thái permission từ cha
          children: [],
        };

        if (position.children && position.children.length > 0) {
          const children = this.processPositionTreeReplace(
            position.children,
            orgUnitMap,
            orgUnitMapDivision,
            position.id,
            userId,
            uniqueOrgUnit,
            processedPosition.permission,
          );
          processedPosition.children = [].concat(...children.filter(Boolean));
        }

        return processedPosition;
      })
      .filter(Boolean)
      .flat();
  }

  buildOrgUnitTree(
    orgUnit: OrgUnit,
    orgUnitMap: Map<string, any>,
    userId: string,
    parentPermission: boolean = false,
    uniqueOrgUnit: Set<string> = new Set<string>(),
  ): PositionTreeNode {
    if (!orgUnit) return null;

    // Nếu cha đã có permission true, truyền xuống luôn
    let permission = parentPermission;
    if (!parentPermission && orgUnit.manager && orgUnit.manager.id === userId) {
      permission = true;
    }

    const orgUnitTree = {
      id: orgUnit.id,
      name: orgUnit.name,
      description: orgUnit.description,
      type: orgUnit.type,
      status: orgUnit.status,
      parentId: orgUnit.parentId,
      manager: orgUnit.manager
        ? {
            id: orgUnit.manager.id,
            name: orgUnit.manager.name,
            url: orgUnit.manager.url,
            userOrgUnitPositions: orgUnit.manager?.userOrgUnitPositions
              ? orgUnit.manager.userOrgUnitPositions
                  .filter((e) => e.orgUnitId === orgUnit.id)
                  .map((e) => ({
                    id: e.id,
                    positionId: e.positionId,
                    orgUnitId: e.orgUnitId,
                    position: {
                      id: e.position?.id,
                      name: e.position?.name,
                    },
                  }))
              : null,
          }
        : null,
      permission,
      children: [],
    };

    const children = Array.from(orgUnitMap.values()).filter(
      (unit) => unit.parentId === orgUnit.id && !uniqueOrgUnit.has(`org_${unit.id}`),
    );

    // Đánh dấu các children này đã được xử lý
    children.forEach((child) => uniqueOrgUnit.add(`org_${child.id}`));

    orgUnitTree.children = children.map((child) =>
      this.buildOrgUnitTree(child, orgUnitMap, userId, permission, uniqueOrgUnit),
    );

    return orgUnitTree;
  }

  filterTreeBySearch(positions: Position[], search: string): Position[] {
    const filtered: Position[] = [];
    const searchNoSign = this.removeVietnameseTones(search?.toLowerCase() || '');

    positions.forEach((position) => {
      const nameNoSign = this.removeVietnameseTones(position.name.toLowerCase());
      const matchesSearch = nameNoSign.includes(searchNoSign);
      const children = this.filterTreeBySearch(position.children, search);

      if (matchesSearch || children.length > 0) {
        filtered.push({
          ...position,
          children,
        });
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
  buildPathTree(ancestors: Position[]): Position | null {
    if (!ancestors.length) return null;

    // Tạo map để truy cập nhanh
    const positionMap = new Map<string, Position>();
    ancestors.forEach((pos) => {
      positionMap.set(pos.id, { ...pos, children: [] });
    });

    let root: Position | null = null;

    // Tìm root: node có parentId = null hoặc parentId không có trong danh sách ancestors
    for (const pos of ancestors) {
      if (!pos.parentId || !ancestors.some((ancestor) => ancestor.id === pos.parentId)) {
        root = positionMap.get(pos.id);
        break;
      }
    }

    if (!root) return null;

    // Build tree dựa trên parentId
    for (const pos of ancestors) {
      if (pos.parentId && pos.id !== root.id) {
        const parent = positionMap.get(pos.parentId);
        const child = positionMap.get(pos.id);
        if (parent && child) {
          parent.children.push(child);
        }
      }
    }

    return root;
  }

  buildPathTreeManyRoots(ancestors: Position[]): Position[] {
    if (!ancestors.length) return [];

    // Tạo map để truy cập nhanh
    const positionMap = new Map<string, Position>();
    ancestors.forEach((pos) => {
      positionMap.set(pos.id, { ...pos, children: [] });
    });

    const roots: Position[] = [];

    // Tìm tất cả root nodes: các node có parentId = null hoặc parentId không có trong danh sách ancestors
    for (const pos of ancestors) {
      if (!pos.parentId || !ancestors.some((ancestor) => ancestor.id === pos.parentId)) {
        const rootNode = positionMap.get(pos.id);
        if (rootNode) {
          roots.push(rootNode);
        }
      }
    }

    // Build tree dựa trên parentId
    for (const pos of ancestors) {
      if (pos.parentId) {
        const parent = positionMap.get(pos.parentId);
        const child = positionMap.get(pos.id);
        if (parent && child) {
          parent.children.push(child);
        }
      }
    }

    return roots;
  }

  /**
   * Đệ quy sắp xếp tree theo name
   * @param tree Array của Position objects với children
   * @returns Tree đã được sắp xếp theo name
   */
  sortTreeByName(tree: Position[]): Position[] {
    // Sắp xếp root level theo name
    const sortedTree = tree.sort((a, b) => a.name.localeCompare(b.name, 'vi'));

    // Đệ quy sắp xếp children của từng node
    sortedTree.forEach((node) => {
      if (node.children && node.children.length > 0) {
        node.children = this.sortTreeByName(node.children);
      }
    });

    return sortedTree;
  }

  parseByNumbering(html: string, text: string): PositionRecord[] {
    const records: PositionRecord[] = [];

    // Tìm pattern số thứ tự: 1. 2. 3.
    const numberPattern = /^(\d+)\.\s*(.+?)$/gm;
    const matches = [...text.matchAll(numberPattern)];

    if (matches.length === 0) {
      throw new BadRequestException('Không tìm thấy format số thứ tự (1. 2. 3.) trong file');
    }

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

      if (name && (fields.description || fields.task || fields.authority)) {
        records.push({
          name,
          description: fields.description,
          task: fields.task,
          authority: fields.authority,
        });
      }
    }

    return records;
  }

  findCorrespondingHtml(html: string, textContent: string): string {
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

  parseFieldsFromRecord(
    htmlContent: string,
    textContent: string,
  ): {
    description: string;
    task: string;
    authority: string;
  } {
    let description = '';
    let task = '';
    let authority = '';

    // Tìm các separator trong HTML
    const descMatch = htmlContent.match(/===\s*DESCRIPTION\s*===(.*?)(?:===\s*TASK\s*===|$)/is);
    const taskMatch = htmlContent.match(/===\s*TASK\s*===(.*?)(?:===\s*AUTHORITY\s*===|$)/is);
    const authorityMatch = htmlContent.match(/===\s*AUTHORITY\s*===(.*?)$/is);

    if (descMatch) description = descMatch[1].trim();
    if (taskMatch) task = taskMatch[1].trim();
    if (authorityMatch) authority = authorityMatch[1].trim();

    // Nếu không tìm thấy separator, fallback về text parsing
    if (!description && !task && !authority) {
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
          if (currentField === 'description' && currentContent.length > 0) {
            description = currentContent.join('\n').trim();
          }
          currentField = 'description';
          currentContent = [];
        } else if (lowerLine.includes('===task===') || lowerLine.includes('nhiệm vụ')) {
          if (currentField === 'description') description = currentContent.join('\n').trim();
          currentField = 'task';
          currentContent = [];
        } else if (lowerLine.includes('===authority===') || lowerLine.includes('yêu cầu')) {
          if (currentField === 'task') task = currentContent.join('\n').trim();
          currentField = 'authority';
          currentContent = [];
        } else if (line && !line.includes('===')) {
          currentContent.push(line);
        }
      }

      // Lưu field cuối cùng
      if (currentContent.length > 0) {
        if (currentField === 'description') description = currentContent.join('\n').trim();
        else if (currentField === 'task') task = currentContent.join('\n').trim();
        else if (currentField === 'authority') authority = currentContent.join('\n').trim();
      }

      // Nếu vẫn không có gì, lấy tất cả làm description
      if (!description && !task && !authority) {
        const contentLines = lines.slice(1); // Skip first line (number + name)
        description = contentLines.join('\n').trim();
      }
    }

    return { description, task, authority };
  }
}
