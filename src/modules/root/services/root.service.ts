import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { UserService } from '../../user/services/user.service';
import { CreateRootDto } from '../dtos/create-root.dto';
import { UserStatus, UserType } from '@/modules/user/user.enum';
import { CreateUserDto } from '@/modules/user/dtos/create-user.dto';
import { DataSource, DeepPartial, ILike, In, IsNull, Not, TreeRepository } from 'typeorm';
import { UserRequest } from '@/common/interfaces/user-request.type';
import axios from 'axios';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '@/modules/user/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import * as ExcelJS from 'exceljs';
import { RootHandle } from '../root.handle';
import { OrgUnit } from '@/modules/org-unit/entities/org-unit.entity';
import { UserOrgUnitPosition } from '@/modules/user/entities/user-unit-position.entity';
import { Position } from '@/modules/position/entities/position.entity';
import { OrgUnitType } from '@/modules/org-unit/org-unit.enum';
import { BOARD_OF_DIRECTORS_UNIQUE } from '@/modules/org-unit/org-unit.constant';

export interface OrgPositionInterface {
  director: string;
  division: string;
  department: string;
  part: string;
  team: string;
  position: string;
}

interface ExcelRow {
  division: string;
  department: string;
  part: string;
  team: string;
}
@Injectable()
export class RootService {
  // await manager.insert(Faq, faqsInsert);
  // await manager.insert(EmailTemplate, emailTemplates);

  constructor(
    private dataSource: DataSource,

    private configService: ConfigService,

    private rootHandle: RootHandle,

    private userService: UserService,
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(OrgUnit)
    private orgUnitRepository: TreeRepository<OrgUnit>,

    @InjectRepository(Position)
    private positionRepository: TreeRepository<Position>,

    @InjectRepository(UserOrgUnitPosition)
    private userOrgUnitPositionRepository: Repository<UserOrgUnitPosition>,
  ) {}

  async createRoot(createRootDto: CreateRootDto) {
    return await this.userService.createRoot({
      ...createRootDto,
      type: UserType.ROOT,
      status: UserStatus.ACTIVE,
    } as CreateUserDto);
  }

  async createCeo(createRootDto: CreateRootDto) {
    return await this.userService.createCeo({
      ...createRootDto,
      type: UserType.ADMIN,
      status: UserStatus.ACTIVE,
    } as CreateUserDto);
  }

  async importData(user: UserRequest) {
    // const { usersInsert } = await this.rootHandle.readExcelUser(user);

    return await this.dataSource
      .transaction(async (manager) => {
        // await manager.insert(User, usersInsert);
        // await manager.insert(Position, positionsInsert);
        // await manager.insert(Faq, faqsInsert);
        // await manager.insert(EmailTemplate, emailTemplates);
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async importUsersFromExcel(fileBuffer: Buffer | Uint8Array, user: UserRequest) {
    // Check permission
    if (user.type !== UserType.ROOT) {
      throw new BadRequestException({
        message: 'Bạn không có quyền thực hiện hành động này',
        code: 'UNAUTHORIZED',
      });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('No worksheet found');
    }

    const COLUMN_MAPPING = {
      MSNV: 'code',
      'Tên nhân viên': 'name',
      Email: 'email',
      'Số điện thoại': 'phone',
      'Ngày sinh': 'birthday',
      'Ngày làm việc': 'dateOnboard',
      'Địa chỉ': 'address',
      'Giới tính': 'gender',
      'Ban giám đốc': 'director',
      Khối: 'division',
      'Phòng ban': 'department',
      'Bộ phận': 'part',
      Team: 'team',
      'Chức vụ mới': 'position',
    } as const;

    const data: User[] = [];
    const dataDeleted: User[] = [];
    const dataUpdate: User[] = [];
    const dataOrgPosition: DeepPartial<UserOrgUnitPosition>[] = [];
    const promises: Promise<void>[] = [];
    const columnMap = this.rootHandle.buildColumnMap(worksheet, COLUMN_MAPPING);

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const rowData: any = this.rootHandle.extractRowData(row, columnMap, COLUMN_MAPPING);

      // Tạo promise cho mỗi row
      const processRow = async () => {
        // Skip empty rows
        if (this.hasData(rowData)) {
          // Xử lý email trước khi tạo user
          const processedData = {
            ...rowData,
            email: typeof rowData.email === 'object' ? rowData.email?.text : rowData.email,
            birthday: this.rootHandle.parseDate(rowData.birthday),
            dateOnboard: this.rootHandle.parseDate(rowData.dateOnboard),
          };

          const orgPositions: OrgPositionInterface = {
            director: processedData?.director,
            division: processedData?.division,
            department: processedData?.department,
            part: processedData?.part,
            team: processedData?.team,
            position: processedData?.position,
          };

          // delete key org position
          ['director', 'division', 'department', 'part', 'team', 'position'].forEach(
            (key) => delete processedData[key],
          );

          const userExist = await this.userRepository.findOne({
            where: {
              code:
                typeof processedData.code === 'number'
                  ? `${processedData.code}`
                  : processedData.code,
            },
            withDeleted: true,
          });

          if (!userExist) {
            const userInsert = {
              id: uuidv4(),
              ...processedData,
              createdById: user.id,
              password: '$2b$10$ZJIG/wzGIxscMCMb0GwqNu3FuXYs2LMc1U7LBd8ASNh5FO5iL4hU2',
              type: UserType.USER,
            };

            data.push(userInsert);

            const orgPositionInsert = (await this.importOrgUnitFromExcel(
              orgPositions,
              userInsert.id,
            )) as DeepPartial<UserOrgUnitPosition>;

            if (orgPositionInsert) dataOrgPosition.push(orgPositionInsert);
          }

          if (userExist && !userExist.deletedAt) {
            dataUpdate.push({
              id: userExist.id,
              ...processedData,
            });

            const orgPositionInsert = (await this.importOrgUnitFromExcel(
              orgPositions,
              userExist.id,
            )) as DeepPartial<UserOrgUnitPosition>;

            if (orgPositionInsert) dataOrgPosition.push(orgPositionInsert);
          }

          if (userExist && userExist.deletedAt != null) {
            dataDeleted.push({
              id: userExist.id,
              ...processedData,
            });

            const orgPositionInsert = (await this.importOrgUnitFromExcel(
              orgPositions,
              userExist.id,
            )) as DeepPartial<UserOrgUnitPosition>;

            if (orgPositionInsert) dataOrgPosition.push(orgPositionInsert);
          }
        }
      };

      promises.push(processRow());
    });

    // Chờ tất cả promises hoàn thành
    await Promise.all(promises);

    return await this.dataSource
      .transaction(async (manager) => {
        await manager.save(User, data as DeepPartial<User>[]);

        if (dataUpdate.length > 0) {
          for (const item of dataUpdate) {
            await manager.update(User, { id: item.id }, { ...item });
          }
        }

        if (dataDeleted.length > 0) {
          for (const item of dataDeleted) {
            await manager.update(User, { id: item.id }, { ...item, deletedAt: null } as User);
          }
        }

        await manager.save(UserOrgUnitPosition, dataOrgPosition);
      })
      .then(() => ({ success: true, count: data.length }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  async handleOrgPosition(
    orgName: string,
    positionName: string,
    userId: string,
  ): Promise<DeepPartial<UserOrgUnitPosition>> {
    const [orgUnit, position] = await Promise.all([
      this.orgUnitRepository.findOne({ where: { name: orgName } }),

      this.positionRepository.findOne({ where: { name: positionName } }),
    ]);

    if (!orgUnit || !position) {
      Logger.log(`không tìm thấy ${orgUnit?.name}-${position?.name}`, orgName, '->', positionName);

      return null;
    }

    const where = { orgUnitId: orgUnit.id, positionId: position.id, userId };

    const existsUserOrg = await this.userOrgUnitPositionRepository.exists({ where });

    if (!existsUserOrg) return { id: uuidv4(), ...where };
    else return null;
  }

  private async importOrgUnitFromExcel(
    orgPosition: OrgPositionInterface,
    userId: string,
  ): Promise<DeepPartial<UserOrgUnitPosition> | null> {
    // Định nghĩa thứ tự ưu tiên từ cao xuống thấp
    const hierarchy = [
      { key: 'team', type: OrgUnitType.TEAM },
      { key: 'part', type: OrgUnitType.PART },
      { key: 'department', type: OrgUnitType.DEPARTMENT },
      { key: 'division', type: OrgUnitType.DIVISION },
      { key: 'director', type: OrgUnitType.BOARD_OF_DIRECTORS },
    ];

    // Tìm đơn vị đầu tiên có dữ liệu
    for (const level of hierarchy) {
      const orgName = orgPosition[level.key];
      if (!orgName) continue;

      // Thử tìm đơn vị hiện có
      let result = await this.handleOrgPosition(orgName, orgPosition.position, userId);

      if (result) return result;
      else return null;
    }

    return null;
  }

  private hasData(rowData: User): boolean {
    return Object.values(rowData).some(
      (value) => value !== undefined && value !== null && value !== '',
    );
  }

  async importUsersBase() {
    interface UserBase {
      id: string;
      name: string;
      email: string;
      image: string;
      first_name: string;
      last_name: string;
      phone: string;
      username: string;
    }

    const accessToken = this.configService.get('BASE_ACCESS_TOKEN');

    Logger.log('Making API request to account.base.vn...');

    // Create FormData for the request
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('access_token', accessToken);

    const { data }: any = await axios.post(
      `${this.configService.get('BASE_URL')}/extapi/v1/users`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
      },
    );

    const users = data.users.filter(
      (user: UserBase) =>
        this.extractCodeFromUsername(user.username) &&
        this.extractCodeFromUsername(user.username) !== '',
    );

    try {
      // Handle save image with name is code
      // await this.downloadUserImages(users);

      // kiểm tra code trùng lặp
      const codes = users.map((user: UserBase) => this.extractCodeFromUsername(user.username));
      const codesDuplicate = codes.filter((code, index, self) => self.indexOf(code) !== index);
      if (codesDuplicate.length > 0) {
        throw new BadRequestException({ message: 'Code trùng lặp', code: 'CODE_DUPLICATE' });
      }

      const usersInsert: DeepPartial<User>[] = [];

      for (const user of users) {
        const code = this.extractCodeFromUsername(user.username);

        const userExist = await this.userRepository.findOne({ where: { code }, withDeleted: true });

        if (userExist) {
          // Get file extension from image URL
          // const extension = user.image
          //   ? path.extname(new URL(user.image).pathname) || '.jpg'
          //   : '.jpg';

          usersInsert.push({
            id: userExist.id,
            url: user.image,
          } as DeepPartial<User>);
        }
      }

      return await this.dataSource
        .transaction(async (manager) => {
          await manager.save(User, usersInsert as DeepPartial<User>[]);
        })
        .then(() => ({ success: true, count: usersInsert.length }))
        .catch((err) => {
          throw new BadRequestException({ message: err.message, code: err.code, success: false });
        });
    } catch (error) {
      Logger.log(error);
    }

    return { total: users.length, users };
  }

  /**
   * Extract numeric code from username
   * Example: minhhuynh04198 -> 04198
   */
  private extractCodeFromUsername(username: string): string {
    const match = username.match(/\d+$/);
    return match ? match[0] : '';
  }

  async restoreOrgUnit() {
    const orgUnits = await this.orgUnitRepository.find({
      where: { deletedAt: Not(IsNull()) },
      withDeleted: true,
    });

    return await this.dataSource
      .transaction(async (manager) => {
        for (const orgUnit of orgUnits) {
          await manager.restore(OrgUnit, orgUnit.id);
        }
      })
      .then(() => ({ success: true }))
      .catch((err) => {
        throw new BadRequestException({ message: err.message, code: err.code, success: false });
      });
  }

  // check remove user or org unit, 1 user 1 org unit
  async checkRemoveUserOrOrgUnit() {
    // tim user co 2 org unit tro len
    const users = await this.userRepository.find({
      relations: ['userOrgUnitPositions', 'userOrgUnitPositions.orgUnit'],
      select: {
        id: true,
        userOrgUnitPositions: {
          id: true,
          orgUnit: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    const usersWithMultipleOrgUnits = users.filter((user) => user.userOrgUnitPositions.length > 1);

    // chi du org unit co type lon nhat, xoa tat ca org unit con lai trong userOrgUnitPositions
    for (const user of usersWithMultipleOrgUnits) {
      const orgUnits = user.userOrgUnitPositions.map((orgUnit) => orgUnit.orgUnit);
      const maxType = Math.max(...orgUnits.map((orgUnit) => orgUnit.type));
      const orgUnitsToDelete = orgUnits.filter((orgUnit) => orgUnit.type !== maxType);
      await this.userOrgUnitPositionRepository.delete({
        orgUnitId: In(orgUnitsToDelete.map((orgUnit) => orgUnit.id)),
        userId: user.id,
      });

      // clear cache orgUnitPositions
    }

    return { success: true, count: usersWithMultipleOrgUnits.length };
  }

  // -----------------------------------------------------
  async importFromExcel(
    fileBuffer: Buffer | Uint8Array,
    user: any, // User entity with type property
  ): Promise<{
    created: number;
    skipped: number;
    errors: string[];
  }> {
    // Check permission
    // if (user.type !== UserType.ROOT) {
    //   throw new BadRequestException({
    //     message: 'Bạn không có quyền thực hiện hành động này',
    //     code: 'UNAUTHORIZED',
    //   });
    // }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as unknown as ArrayBuffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) throw new Error('No worksheet found');

    const COLUMN_MAPPING = {
      Khối: 'division',
      'Phòng ban': 'department',
      'Bộ phận': 'part',
      Team: 'team',
    };

    const result = {
      created: 0,
      skipped: 0,
      errors: [],
    };

    // Lấy BOARD_OF_DIRECTORS (chỉ có 1 duy nhất)
    const boardOfDirectors = await this.orgUnitRepository.findOne({
      where: { type: OrgUnitType.BOARD_OF_DIRECTORS },
    });

    if (!boardOfDirectors)
      throw new BadRequestException('Không tìm thấy Ban Giám đốc trong hệ thống');

    // Cache để tránh query trùng lặp
    const orgUnitCache = new Map<string, OrgUnit>();

    // Build column mapping
    const columnMap = this.buildColumnMap(worksheet, COLUMN_MAPPING);

    // Wait for all async operations to complete
    await this.processAllRows(
      worksheet,
      columnMap,
      COLUMN_MAPPING,
      boardOfDirectors,
      orgUnitCache,
      result,
    );

    return result;
  }

  private buildColumnMap(worksheet: ExcelJS.Worksheet, COLUMN_MAPPING: any): Map<string, number> {
    const columnMap = new Map<string, number>();
    const headerRow = worksheet.getRow(1);

    headerRow.eachCell((cell, colNumber) => {
      const columnName = cell.value?.toString().trim();
      if (columnName && Object.keys(COLUMN_MAPPING).includes(columnName)) {
        columnMap.set(columnName, colNumber);
      }
    });

    return columnMap;
  }

  private extractRowData(
    row: ExcelJS.Row,
    columnMap: Map<string, number>,
    COLUMN_MAPPING: any,
  ): ExcelRow {
    const rowData: any = {};

    // Extract data based on column mapping
    columnMap.forEach((colNumber, columnName) => {
      const field = COLUMN_MAPPING[columnName as keyof typeof COLUMN_MAPPING];
      const cell = row.getCell(colNumber);
      const value = cell.value;

      if (value !== null && value !== undefined) {
        rowData[field] = value.toString().trim();
      }
    });

    return rowData as ExcelRow;
  }

  private async processAllRows(
    worksheet: ExcelJS.Worksheet,
    columnMap: Map<string, number>,
    COLUMN_MAPPING: any,
    boardOfDirectors: OrgUnit,
    cache: Map<string, OrgUnit>,
    result: any,
  ): Promise<void> {
    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) rows.push({ row, rowNumber });
    });

    // Xử lý tuần tự
    for (const { row, rowNumber } of rows) {
      try {
        const rowData = this.extractRowData(row, columnMap, COLUMN_MAPPING);
        await this.processRow(rowData, boardOfDirectors, cache, result, rowNumber);
      } catch (error) {
        result.errors.push(`Dòng ${rowNumber}: ${error.message}`);
      }
    }
  }

  private async processRow(
    row: ExcelRow,
    boardOfDirectors: OrgUnit,
    cache: Map<string, OrgUnit>,
    result: any,
    rowNumber: number,
  ): Promise<void> {
    let currentParent = boardOfDirectors;

    // Xử lý Division
    if (row.division && row.division.trim()) {
      currentParent = await this.findOrCreateOrgUnit(
        row.division.trim(),
        OrgUnitType.DIVISION,
        boardOfDirectors,
        cache,
        result,
      );
    }

    // Xử lý Department
    if (row.department && row.department.trim()) {
      if (!currentParent || currentParent.type !== OrgUnitType.DIVISION)
        throw new Error('submit để lưu phòng ban thuộc về một khối');

      currentParent = await this.findOrCreateOrgUnit(
        row.department.trim(),
        OrgUnitType.DEPARTMENT,
        currentParent,
        cache,
        result,
      );
    }

    // Xử lý Part
    if (row.part && row.part.trim()) {
      if (!currentParent || currentParent.type !== OrgUnitType.DEPARTMENT)
        throw new Error('submit để lưu bộ phận thuộc về một phòng ban');

      currentParent = await this.findOrCreateOrgUnit(
        row.part.trim(),
        OrgUnitType.PART,
        currentParent,
        cache,
        result,
      );
    }

    // Xử lý Team
    if (row.team && row.team.trim()) {
      if (!currentParent || currentParent.type !== OrgUnitType.PART)
        throw new Error('submit để lưu team thuộc về một bộ phận');

      await this.findOrCreateOrgUnit(
        row.team.trim(),
        OrgUnitType.TEAM,
        currentParent,
        cache,
        result,
      );
    }
  }

  private async findOrCreateOrgUnit(
    name: string,
    type: OrgUnitType,
    parent: OrgUnit,
    cache: Map<string, OrgUnit>,
    result: any,
  ): Promise<OrgUnit> {
    // Tạo unique key cho cache
    const cacheKey = `${name}_${type}_${parent.id}`;

    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    let existingOrgUnit = await this.orgUnitRepository.findOne({
      where: {
        name,
        type: type.toString() as unknown as OrgUnitType,
        parentId: parent.id,
      },
    });

    if (name === BOARD_OF_DIRECTORS_UNIQUE.ROOT_NAME && type == OrgUnitType.DIVISION) {
      existingOrgUnit = await this.orgUnitRepository.findOne({
        where: { name: BOARD_OF_DIRECTORS_UNIQUE.ROOT_NAME },
      });
    }

    if (existingOrgUnit) {
      cache.set(cacheKey, existingOrgUnit);
      result.skipped++;
      return existingOrgUnit;
    }

    // Tạo mới
    const newOrgUnit: DeepPartial<OrgUnit> = {
      id: uuidv4(),
      name,
      type: type.toString() as unknown as OrgUnitType,
      parentId: parent.id,
      parent,
    };

    await this.dataSource
      .transaction(async (manager) => {
        await manager.save(OrgUnit, newOrgUnit);
      })
      .catch((err) => {
        Logger.log(err);
      });

    cache.set(cacheKey, newOrgUnit as OrgUnit);
    result.created++;
    return this.orgUnitRepository.findOne({
      where: {
        id: newOrgUnit.id,
      },
    });
  }
}
