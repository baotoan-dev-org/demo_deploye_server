import { UserRequest } from '@/common/interfaces/user-request.type';
import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { FileTypeEnum } from '@/modules/file/file.enum';
import * as ExcelJS from 'exceljs';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository, TreeRepository } from 'typeorm';
import { ProjectTask } from '../entities/project-task.entity';
import { User } from '@/modules/user/entities/user.entity';
import { ProjectTaskAssignee } from '../entities/project-task-assignee.entity';
import {
  ProjectTaskType,
  ProjectTaskBudgetStatus,
  ProjectTaskStatus,
  ProjectTaskAssigneeType,
} from '../project-task.enum';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { UserOrgUnitPosition } from '@/modules/user/entities/user-unit-position.entity';
import { ProjectTaskHandle } from '../project-task.handle';
import { FileService } from '@/modules/file/services/file.service';
import { ProjectTaskDependencyService } from './project-task-dependency.service';
import { ProjectTaskImportCache } from '../interfaces/project-task-import.interface';
import { OrgUnitType } from '@/modules/org-unit/org-unit.enum';

@Injectable()
export class ProjectTaskImportService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(OrgUnit)
    private readonly orgUnitRepo: TreeRepository<OrgUnit>,

    @InjectRepository(UserOrgUnitPosition)
    private readonly userOrgUnitPositionRepo: Repository<UserOrgUnitPosition>,

    private readonly projectTaskHandle: ProjectTaskHandle,

    private readonly fileService: FileService,

    private readonly projectTaskDependencyService: ProjectTaskDependencyService,

    private readonly dataSource: DataSource,
  ) {}

  async isMemberInOrgUnit(
    memberCode: string,
    orgUnitNames: string[],
    caches?: ProjectTaskImportCache,
  ) {
    if (!memberCode || !orgUnitNames?.length) return false;
    const cacheKey = `${memberCode}|${[...orgUnitNames].sort().join(',')}`;
    if (caches?.membershipCache?.has(cacheKey)) return caches.membershipCache.get(cacheKey);

    let user = caches?.userByCode?.get(memberCode) ?? null;
    if (user === undefined) {
      user = await this.userRepo.findOne({ where: { code: memberCode } });
      caches?.userByCode?.set(memberCode, user);
    }
    if (!user) {
      caches?.membershipCache?.set(cacheKey, false);
      return false;
    }

    let userOrgIds = caches?.userPositionsByUserId?.get(user.id) ?? null;
    if (!userOrgIds) {
      const positions = await this.userOrgUnitPositionRepo.find({
        where: { userId: user.id },
        select: { orgUnitId: true },
      });
      userOrgIds = new Set(positions.map((p) => p.orgUnitId));
      caches?.userPositionsByUserId?.set(user.id, userOrgIds);
    }

    const missingNames = orgUnitNames.filter((name) => !caches?.orgUnitByName?.has(name));
    if (missingNames.length) {
      const orgUnits = await this.orgUnitRepo.find({
        where: { name: In(missingNames) },
        select: { id: true, name: true },
      });
      orgUnits.forEach((ou) => caches?.orgUnitByName?.set(ou.name, ou));
    }

    const targetDescendants = new Set<string>();
    for (const name of orgUnitNames) {
      const ou = caches?.orgUnitByName?.get(name);
      if (!ou) continue;
      let descendantIds = caches?.descendantsByOrgUnitId?.get(ou.id);
      if (!descendantIds) {
        const descendants = await this.orgUnitRepo.findDescendants(ou);
        descendantIds = new Set(descendants.map((d) => d.id));
        caches?.descendantsByOrgUnitId?.set(ou.id, descendantIds);
      }
      for (const id of descendantIds) targetDescendants.add(id);
    }
    if (targetDescendants.size === 0) {
      caches?.membershipCache?.set(cacheKey, false);
      return false;
    }

    const result = [...userOrgIds].some((id) => targetDescendants.has(id));
    caches?.membershipCache?.set(cacheKey, result);
    return result;
  }

  // Nhập công việc từ file excel và validate
  async importProjectTasksFromExcelAndValidate(
    projectTasks,
    user: UserRequest,
  ): Promise<{ success: boolean; errors?: Array<{ stt: number; error: string }>; count?: number }> {
    const errors: Array<{ stt: number; error: string }> = [];
    const validRows = [];
    const caches = {
      userByCode: new Map<string, User | null>(),
      userPositionsByUserId: new Map<string, Set<string>>(),
      orgUnitByName: new Map<string, OrgUnit | null>(),
      descendantsByOrgUnitId: new Map<string, Set<string>>(),
      membershipCache: new Map<string, boolean>(),
    };

    for (const row of projectTasks) {
      const errorMsg = await this.validateProjectTaskRow(row, caches);
      if (errorMsg) errors.push({ stt: row.stt, error: errorMsg });
      else validRows.push(row);
    }
    this.validateProjectTaskStructure(validRows, errors);
    if (errors.length > 0) return { success: false, errors };
    const { roots } = this.buildProjectTaskTree(validRows);
    this.validateProjectTaskParentChild(roots, errors);

    if (errors.length > 0) return { success: false, errors };
    await this.validateProjectTaskDependencies(validRows, errors);

    if (errors.length > 0) return { success: false, errors };
    await this.insertProjectTasksToDb(roots, user);

    return { success: true, count: validRows.length };
  }

  async validateProjectTaskRow(
    row,
    caches?: {
      userByCode: Map<string, User | null>;
      userPositionsByUserId: Map<string, Set<string>>;
      orgUnitByName: Map<string, OrgUnit | null>;
      descendantsByOrgUnitId: Map<string, Set<string>>;
      membershipCache: Map<string, boolean>;
    },
  ) {
    const errors: string[] = [];
    if (row.startDate && row.estimateDate && row.endDate) {
      const start = new Date(row.startDate);
      const estimate = new Date(row.estimateDate);
      const end = new Date(row.endDate);
      if (!(start < end)) errors.push('Ngày bắt đầu phải nhỏ hơn ngày kết thúc');
      if (!(estimate > start)) errors.push('Ngày hoàn thành sớm nhất phải lớn hơn ngày bắt đầu');
      if (!(end > estimate)) errors.push('Ngày kết thúc phải lớn hơn ngày hoàn thành sớm nhất');
    }

    if (row.budget !== null && Number(row.budget) <= 0) errors.push('Ngân sách phải lớn hơn 0');
    if (row.members && row.orgUnits) {
      const memberChecks = await Promise.all(
        row.members.map((member) => this.isMemberInOrgUnit(member, row.orgUnits, caches)),
      );
      row.members.forEach((member, idx) => {
        if (!memberChecks[idx]) errors.push(`Thành viên ${member} không thuộc tổ chức`);
      });
    }

    return errors.join('; ');
  }

  buildProjectTaskTree(validRows) {
    const taskMap = new Map();
    validRows.forEach((task) => {
      task.children = [];
      taskMap.set(task.name, task);
    });
    const roots = [];
    validRows.forEach((task) => {
      if (task.parentName && taskMap.has(task.parentName))
        taskMap.get(task.parentName).children.push(task);
      else roots.push(task);
    });
    return { roots };
  }

  // Validate duplicates and unknown parents
  validateProjectTaskStructure(validRows, errors: Array<{ stt: number; error: string }>) {
    const nameCounts = new Map<string, number>();
    for (const r of validRows) {
      if (!r.name) {
        errors.push({ stt: r.stt, error: 'Thiếu tên công việc' });
        continue;
      }
      nameCounts.set(r.name, (nameCounts.get(r.name) || 0) + 1);
    }
    for (const r of validRows) {
      if (r.parentName && !nameCounts.has(r.parentName)) {
        errors.push({
          stt: r.stt,
          error: `Không tìm thấy công việc cha "${r.parentName}" trong file`,
        });
      }
    }
  }

  validateProjectTaskParentChild(roots, errors: Array<{ stt; error: string }>) {
    const validateParentChild = (task) => {
      if (task.children?.length && task.budget !== null) {
        const totalChildBudget = task.children.reduce(
          (sum, child) => sum + (Number(child.budget) || 0),
          0,
        );
        if (totalChildBudget > Number(task.budget))
          errors.push({
            stt: task.stt,
            error: `Tổng ngân sách các công việc con vượt quá ngân sách của "${task.name}"`,
          });
      }
      for (const child of task.children || []) {
        if (
          (task.budget === null || Number(task.budget) === 0) &&
          child.budget &&
          Number(child.budget) > 0
        )
          errors.push({
            stt: child.stt,
            error: `Công việc cha "${task.name}" không có ngân sách nhưng công việc con "${child.name}" có ngân sách.`,
          });

        if (
          task.startDate &&
          task.endDate &&
          child.startDate &&
          child.endDate &&
          (new Date(child.startDate) < new Date(task.startDate) ||
            new Date(child.endDate) > new Date(task.endDate))
        )
          errors.push({
            stt: child.stt,
            error: `Thời gian của công việc con "${child.name}" vượt ngoài phạm vi thời gian của cha "${task.name}"`,
          });

        if (
          task.estimateDate &&
          child.estimateDate &&
          new Date(child.estimateDate) > new Date(task.estimateDate)
        )
          errors.push({
            stt: child.stt,
            error: `Ngày hoàn thành sớm nhất của công việc con "${child.name}" phải lớn hơn hoặc bằng công việc cha "${task.name}"`,
          });

        validateParentChild(child);
      }
    };
    roots.forEach(validateParentChild);
  }

  async validateProjectTaskDependencies(validRows, errors: Array<{ stt; error: string }>) {
    const nameToTask = new Map(validRows.map((task) => [task.name, task]));
    for (const task of validRows) {
      const deps = Array.isArray(task.dependencies) ? task.dependencies : [];
      if (!deps.length) continue;
      const taskErrors: string[] = [];
      if (task.parentName && deps.includes(task.parentName)) {
        taskErrors.push(
          `Công việc "${task.name}" không thể phụ thuộc vào công việc cha "${task.parentName}"`,
        );
      }
      const unknowns = deps.filter((n) => !nameToTask.has(n));
      if (unknowns.length) {
        taskErrors.push(
          `Không tìm thấy công việc phụ thuộc: ${unknowns.map((u) => '"' + u + '"').join(', ')}`,
        );
      }
      deps.forEach((depName) => {
        const depTask = nameToTask.get(depName) as any;
        if (depTask?.endDate && task.startDate) {
          if (new Date(task.startDate) <= new Date(depTask.endDate)) {
            taskErrors.push(
              `Công việc "${task.name}" phải bắt đầu sau khi công việc phụ thuộc "${depTask.name}" kết thúc`,
            );
          }
        }
      });
      if (taskErrors.length) errors.push({ stt: task.stt, error: taskErrors.join('; ') });
    }
  }

  async insertProjectTasksToDb(roots, user: UserRequest) {
    const now = new Date();
    await this.dataSource.transaction(async (manager) => {
      const allUserCodes = new Set<string>();
      const allOrgUnitNames = new Set<string>();
      const collectCodesAndNames = (task) => {
        (task.members || []).forEach((c) => allUserCodes.add(c));
        (task.followers || []).forEach((c) => allUserCodes.add(c));
        (task.approvers || []).forEach((c) => allUserCodes.add(c));
        (task.proposalFollowers || []).forEach((c) => allUserCodes.add(c));
        (task.orgUnits || []).forEach((n) => allOrgUnitNames.add(n));
        (task.children || []).forEach(collectCodesAndNames);
      };
      roots.forEach(collectCodesAndNames);
      const allUsers = allUserCodes.size
        ? await this.userRepo.find({
            where: { code: In(Array.from(allUserCodes)) },
            select: { id: true, code: true },
          })
        : [];

      const userCodeToIdCache = new Map<string, string | null>(allUsers.map((u) => [u.code, u.id]));
      const allOrgUnits = allOrgUnitNames.size
        ? await this.orgUnitRepo.find({
            where: { name: In(Array.from(allOrgUnitNames)) },
            select: { id: true, name: true, type: true },
          })
        : [];
      const orgUnitNameToIdCache = new Map<string, string | null>(
        allOrgUnits.map((ou) => [ou.name, ou.id]),
      );
      const orgUnitIdToTypeCache = new Map<string, string>(
        allOrgUnits.map((ou) => [ou.id, ou.type.toString()]),
      );
      const insertedTasks = [];
      const nameToIdMap: Map<string, string> = new Map();
      const getUserIdsFromCodes = (codes: string[]): string[] => {
        if (!codes || !codes.length) return [];
        const result: string[] = [];
        for (const c of codes) {
          const id = userCodeToIdCache.get(c);
          if (id) result.push(id);
        }
        return result;
      };
      const getOrgUnitIdsFromNames = (names: string[]): string[] => {
        if (!names || !names.length) return [];
        const result: string[] = [];
        for (const n of names) {
          const id = orgUnitNameToIdCache.get(n);
          if (id) result.push(id);
        }
        return result;
      };
      const getOrgUnitType = (id: string) => orgUnitIdToTypeCache.get(id) as unknown as OrgUnitType;
      const insertTaskRecursively = async (
        task,
        parentId: string | null = null,
        isRootHasBudget: boolean = false,
      ) => {
        const type = task.type === 'Dự án' ? ProjectTaskType.PROJECT : ProjectTaskType.TASK;
        let weight = Number(task.weight);
        if (!parentId && type === ProjectTaskType.PROJECT) weight = 100;
        let isBudgetConfirmed = true;
        let budgetStatus = null;

        const followersIds = getUserIdsFromCodes(task.followers || []);
        const memberIds = getUserIdsFromCodes(task.members || []);
        const followers = followersIds.map((id: string) => ({ id }));
        const approverIdsForBudget = getUserIdsFromCodes(task.approvers || []);
        const isAllApproversAreUser =
          approverIdsForBudget.length > 0 &&
          approverIdsForBudget.every((id: string) => id === user.id);

        if (!parentId) {
          if (task.budget) {
            isBudgetConfirmed = false;
            budgetStatus = ProjectTaskBudgetStatus.PROJECT_HAVE_BUDGET_PENDING;
          } else {
            isBudgetConfirmed = isAllApproversAreUser ? true : false;
            budgetStatus = isAllApproversAreUser
              ? ProjectTaskBudgetStatus.PROJECT_HAVE_BUDGET_APPROVED
              : ProjectTaskBudgetStatus.PROJECT_NOT_HAVE_BUDGET;
          }
        }
        if (parentId && isRootHasBudget) isBudgetConfirmed = isAllApproversAreUser ? true : false;

        const dataToSave = {
          name: task.name,
          description: task.description,
          startDate: task.startDate,
          estimateDate: task.estimateDate,
          endDate: task.endDate,
          budget: task.budget,
          priority: task.priority,
          parent: parentId ? { id: parentId } : null,
          type,
          status: ProjectTaskStatus.ACTIVE,
          weight,
          remainingWeight: 100,
          isBudgetConfirmed,
          createdById: user.id || null,
          ...(budgetStatus && { budgetStatus }),
          ...(followers.length > 0 && { followers }),
          code: await this.projectTaskHandle.generateCode(type, parentId, manager),
        };

        const newTask = await manager.save(ProjectTask, dataToSave);
        insertedTasks.push({ ...task, id: newTask.id });
        nameToIdMap.set(task.name, newTask.id);

        const orgUnitIds: string[] = getOrgUnitIdsFromNames(task.orgUnits || []);
        if ((memberIds.length > 0 || orgUnitIds.length > 0) && newTask.id) {
          const assignees = [];
          if (memberIds.length > 0) {
            for (const userId of memberIds) {
              assignees.push({
                userId,
                orgUnitId: null,
                projectTaskId: newTask.id,
                type: ProjectTaskAssigneeType.USER,
                assignedAt: now,
              });
            }
          }
          if (orgUnitIds.length > 0) {
            for (const orgUnitId of orgUnitIds) {
              assignees.push({
                userId: null,
                orgUnitId,
                projectTaskId: newTask.id,
                type: getOrgUnitType(orgUnitId),
                assignedAt: now,
              });
            }
          }
          if (assignees.length > 0) await manager.save(ProjectTaskAssignee, assignees);
        }
        if (task.proposalTitle || task.proposalContent) {
          const approverIds = getUserIdsFromCodes(task.approvers || []);
          const followerIds = getUserIdsFromCodes(task.proposalFollowers || []);
          const proposalParams = {
            title: task.proposalTitle || '',
            content: task.proposalContent || '',
            amount: task.budget || 0,
            projectTaskId: newTask.id,
            approverIds,
            followerIds,
            reason: task.proposalReason || '',
          };
          await this.projectTaskHandle.createBudgetProjectTaskProposalAndNotify({
            manager,
            proposalParams,
            approverIds,
            followerIds,
            user,
            proposalPath: `/dashboard/project-task?projectTaskId=${newTask.id}`,
            oldProposals: [],
          });
        }
        for (const child of task.children)
          await insertTaskRecursively(child, newTask.id, isRootHasBudget);
        if (task.children && task.children.length > 0) {
          const totalChildWeight = task.children.reduce(
            (sum, child) => sum + (Number(child.weight) || 0),
            0,
          );
          const updatedRemainingWeight = Math.max(0, 100 - totalChildWeight);
          await manager.save(ProjectTask, {
            id: newTask.id,
            remainingWeight: updatedRemainingWeight,
            childrenCount: task.children.length,
          });
        } else await manager.save(ProjectTask, { id: newTask.id, childrenCount: 0 });
      };
      for (const root of roots) {
        const rootHasBudget = root.budget !== null && Number(root.budget) > 0;
        await insertTaskRecursively(root, null, rootHasBudget);
      }
      for (const task of insertedTasks) {
        if (task.dependencies && Array.isArray(task.dependencies) && task.dependencies.length > 0) {
          const dependsOnTaskIds: string[] = task.dependencies
            .map((depName: string) => nameToIdMap.get(depName))
            .filter(Boolean);
          if (dependsOnTaskIds.length > 0) {
            await this.projectTaskDependencyService.updateProjectTaskDependency(
              task.id,
              dependsOnTaskIds,
              manager,
            );
          }
        }
      }
    });
  }

  async importProjectTasksFromExcel(fileBuffer: Buffer, user: UserRequest) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) return { success: false, message: 'Không tìm thấy worksheet', errorFile: null };

    const rows = [];
    const sttToRow = new Map<string, any>();
    const HEADER_ROWS = 2;
    const arrayFields = [
      'orgUnits',
      'members',
      'followers',
      'dependencies',
      'approvers',
      'proposalFollowers',
    ];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= HEADER_ROWS) return;

      const getCellValue = (cellIndex: number) =>
        this.projectTaskHandle.extractCellValue(row.getCell(cellIndex).value);

      const record = {
        stt: getCellValue(1),
        name: getCellValue(2),
        type: getCellValue(3),
        parentName: getCellValue(4),
        currencyBudget: getCellValue(5),
        currency: getCellValue(6),
        exchangeRate: getCellValue(7),
        weight: (getCellValue(8) || 0) * 100,
        priority: getCellValue(9),
        startDate: getCellValue(10),
        estimateDate: getCellValue(11),
        endDate: getCellValue(12),
        orgUnits: getCellValue(13),
        members: getCellValue(14),
        followers: getCellValue(15),
        dependencies: getCellValue(16),
        description: getCellValue(17),
        proposalTitle: getCellValue(18),
        proposalContent: getCellValue(19),
        approvers: getCellValue(20),
        proposalFollowers: getCellValue(21),
        budget: null,
      };
      if (!record.stt || record.stt === 'STT') return;

      arrayFields.forEach((field) => {
        record[field] = this.projectTaskHandle.splitMulti(record[field]);
      });

      record.budget = (record.currencyBudget || 0) * (record.exchangeRate || 1);

      rows.push(record);
      sttToRow.set(String(record.stt), row);
    });

    const validationResult = await this.importProjectTasksFromExcelAndValidate(rows, user);

    if (!validationResult.success && validationResult.errors?.length > 0) {
      const errorColIdx = worksheet.columnCount;

      for (const { stt, error } of validationResult.errors) {
        const r = sttToRow.get(String(stt));
        if (!r) continue;
        const errorCell = r.getCell(errorColIdx);
        if (errorCell.isMerged) worksheet.unMergeCells(errorCell.address);
        errorCell.border = {
          top: { style: 'thin' as const, color: { argb: 'FF000000' } },
          left: { style: 'thin' as const, color: { argb: 'FF000000' } },
          bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
          right: { style: 'thin' as const, color: { argb: 'FF000000' } },
        };
        errorCell.value = error;
        errorCell.font = { color: { argb: 'FFB71C1C' }, size: 11 };
        errorCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        errorCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC7CE' },
        };
      }

      worksheet.getColumn(errorColIdx).width = 80;
      const buffer = await workbook.xlsx.writeBuffer();
      const errorFileName = `import-error-${Date.now()}.xlsx`;
      const errorFilePath = `office-storage/upload/${errorFileName}`;

      const nodeBuffer: Buffer = Buffer.isBuffer(buffer)
        ? (buffer as Buffer)
        : Buffer.from(buffer as ArrayBuffer);
      await fs.promises.writeFile(errorFilePath, nodeBuffer);

      const multerFile: Express.Multer.File = {
        fieldname: 'file',
        originalname: errorFileName,
        encoding: '7bit',
        mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: nodeBuffer.byteLength,
        destination: 'office-storage/upload',
        filename: errorFileName,
        path: errorFilePath,
        buffer: nodeBuffer,
        stream: fs.createReadStream(errorFilePath),
      };

      const fileInfo = await this.fileService.createFile({
        file: multerFile,
        type: FileTypeEnum.DOCUMENT,
        context: 'import-error',
      });

      return { success: false, errorFile: fileInfo, errors: validationResult.errors };
    }

    return { success: true, count: validationResult.count };
  }
}
