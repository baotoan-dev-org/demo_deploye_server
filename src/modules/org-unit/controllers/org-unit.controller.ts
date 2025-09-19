import {
  Body,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { OrgUnitService } from '../services/org-unit.service';
import { Route } from 'src/common/decorators/route.decorator';
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { CreateOrgUnitDto } from '../dtos/create-org-unit.dto';
import { UpdateOrgUnitDto } from '../dtos/update-org-unit.dto';
import { User } from '@/common/decorators/user.decorator';
import { JwtAuthUserTypes } from '@/common/decorators/jwt-auth-user-types.decorator';
import { UserType } from '@/modules/user/user.enum';
import { GetListOrgUnitDto } from '../dtos/get-list-org-unit.dto';
import { AddUserToOrgUnitDto } from '../dtos/add-user-to-org-unit.dto';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { GetUsersByOrgUnitsDto } from '../dtos/get-user-by-org-units.dto';
import { GetTreeOrgUnitDto } from '../dtos/get-tree-org-unit.dto';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { GetListOrgUnitByProjectTaskDto } from '../dtos/get-list-org-unit-by-project-task.dto';
import { GetOrgUnitSearchDto } from '../dtos/get-org-unit-search.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@Route('org-unit')
export class OrgUnitController {
  constructor(private orgUnitService: OrgUnitService) {}

  @ApiOperation({ summary: 'Tạo đơn vị tổ chức' })
  @JwtAuth()
  @Post()
  async createOrgUnit(@Body() createOrgUnitDto: CreateOrgUnitDto, @User() user: UserRequest) {
    return this.orgUnitService.createOrgUnit(createOrgUnitDto, user);
  }

  @ApiOperation({ summary: 'Tạo đơn vị tổ chức' })
  @JwtAuth()
  @Post('add-user-to-org-unit')
  async addUserToOrgUnit(
    @Body() addUserToOrgUnitDto: AddUserToOrgUnitDto,
    @User() user: UserRequest,
  ) {
    return this.orgUnitService.addUserToOrgUnit(addUserToOrgUnitDto, user);
  }

  @Post('import/func-task')
  @JwtAuthUserTypes(UserType.ROOT)
  @ApiOperation({ summary: 'Import org units từ file Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File Excel chứa thông tin Org units',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async importFuncTask(
    @UploadedFile() file: Express.Multer.File,
    @User() user: UserRequest, // Assuming user is attached to request
  ) {
    return await this.orgUnitService.importFuncTask(file.buffer, user);
  }

  @ApiOperation({ summary: 'Upload multiple file' })
  @Post('upload-multiple-file')
  @JwtAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 100))
  async uploadMultipleFile(
    @UploadedFiles() files: Express.Multer.File[],
    @User() user: UserRequest,
  ) {
    return await this.orgUnitService.processMultipleFile(files, user);
  }

  @Post('read-word')
  @ApiOperation({ summary: 'Đọc file Word' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async readWordFile(@UploadedFile() file: Express.Multer.File) {
    return await this.orgUnitService.processWordFile(file);
  }

  @Post('bulk-import-word')
  @ApiOperation({ summary: 'Bulk import org units từ file Word theo tên' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File Word chứa nhiều org units',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: (req, file, cb) => {
        const allowedMimes = [
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/msword',
        ];
        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Chỉ chấp nhận file Word (.doc, .docx)!'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async bulkImportWordFile(@UploadedFile() file: Express.Multer.File) {
    return await this.orgUnitService.processBulkWordFile(file);
  }

  @ApiOperation({ summary: 'Cập nhật đơn vị tổ chức' })
  @JwtAuth()
  @Put(':id')
  async updateOrgUnit(
    @Param('id') id: string,
    @Body() updateOrgUnitDto: UpdateOrgUnitDto,
    @User() user: UserRequest,
  ) {
    return this.orgUnitService.updateOrgUnit(id, updateOrgUnitDto, user);
  }

  @ApiOperation({ summary: 'Khôi phục đơn vị tổ chức' })
  @JwtAuth()
  @Patch(':id/restore')
  async restoreOrgUnit(@Param('id') id: string, @User() user: UserRequest) {
    return await this.orgUnitService.restoreOrgUnit(id, user);
  }

  @ApiOperation({ summary: 'Xóa vào thùng rác đơn vị tổ chức' })
  @JwtAuth()
  @Delete('soft-delete/:id')
  async removeOrgUnit(@Param('id') id: string, @User() user: UserRequest) {
    return this.orgUnitService.removeOrgUnit(id, user);
  }

  @ApiOperation({ summary: 'Xóa đơn vị tổ chức' })
  @JwtAuth()
  @Delete(':id')
  async deleteOrgUnit(@Param('id') id: string, @User() user: UserRequest) {
    return this.orgUnitService.deleteOrgUnit(id, user);
  }

  @ApiOperation({ summary: 'Lấy danh sách đơn vị tổ chức' })
  @Get()
  async getListOrgUnit(@Query() getListOrgUnitDto: GetListOrgUnitDto) {
    return this.orgUnitService.getListOrgUnit(getListOrgUnitDto);
  }

  @ApiOperation({ summary: 'Lấy danh sách khối theo user' })
  @JwtAuth()
  @Get('division-by-user')
  async getDivisionByUser(@User() user: UserRequest) {
    return this.orgUnitService.getDivisionForUser(user);
  }

  @ApiOperation({ summary: 'Lấy cây đơn vị tổ chức sơ đồ' })
  @JwtAuth()
  @Get('tree')
  async getTreeOrgUnit(@User() user: UserRequest) {
    return this.orgUnitService.getTreeOrgUnit(user);
  }

  @ApiOperation({ summary: 'Lấy cây đơn vị tổ chức' })
  @JwtAuth()
  @Get('tree/search')
  async getTreeOrgUnitSearch(@Query() getOrgUnitSearchDto: GetOrgUnitSearchDto) {
    return this.orgUnitService.getTreeOrgUnitSearch(getOrgUnitSearchDto);
  }

  @ApiOperation({ summary: 'Lấy cây đơn vị tổ chức theo node đang đứng' })
  @JwtAuth()
  @Get('tree/org-node')
  async getTreeOrgUnitNode(
    @Query() getListOrgUnitByProjectTaskDto: GetListOrgUnitByProjectTaskDto,
    @User() user: UserRequest,
  ) {
    return this.orgUnitService.getTreeOrgUnitNode(getListOrgUnitByProjectTaskDto, user);
  }

  @ApiOperation({ summary: 'Lấy cây đơn vị tổ chức from đề xuất' })
  @JwtAuth()
  @Get('tree/user-movement')
  async getTreeUserMovement(@Query() dto: GetTreeOrgUnitDto, @User() user: UserRequest) {
    return this.orgUnitService.getTreeUserMovement(dto, user);
  }

  @Get('tree/notify')
  @ApiOperation({ summary: 'Get all teams and user in tree structure' })
  async GetTreeOrgUnitUser(@Query() getListOrgUnitDto: GetListOrgUnitDto) {
    return this.orgUnitService.GetTreeOrgUnitUser(getListOrgUnitDto);
  }

  @ApiOperation({ summary: 'Get tree org unit node' })
  @JwtAuth()
  @Get('tree/org-node/:orgUnitId')
  async getTreeAppointment(@Param('orgUnitId') orgUnitId: string, @User() user: UserRequest) {
    return this.orgUnitService.getTreeAppointment(orgUnitId, user);
  }

  @ApiOperation({ summary: 'Get tree children orgUnit of a orgUnit' })
  @JwtAuth()
  @Get('tree/:id/children')
  async getTreeChildrenOrgUnit(@Param('id') id: string) {
    return this.orgUnitService.getTreeChildrenOrgUnit(id);
  }

  @ApiOperation({ summary: 'Get list children orgUnit of a orgUnit' })
  @JwtAuth()
  @Get(':id/children')
  async getListChildrenOrgUnit(@Param('id') id: string) {
    return this.orgUnitService.getListChildrenOrgUnit(id);
  }

  @ApiOperation({ summary: 'Get list descendants orgUnit of a orgUnit' })
  @JwtAuth()
  @Get(':id/descendants')
  async getDescendantsOrgUnit(@Param('id') id: string) {
    return this.orgUnitService.getDescendantsOrgUnit(id);
  }

  @ApiOperation({ summary: 'Get list detail orgUnit of a orgUnit' })
  @JwtAuth()
  @Get(':id/detail')
  async getListDetailOrgUnit(@Param('id') id: string) {
    return this.orgUnitService.getListDetailOrgUnit(id);
  }

  @ApiOperation({ summary: 'Get manager of a orgUnit' })
  @JwtAuth()
  @Get(':id/manager')
  async getManagerOrgUnit(@Param('id') id: string) {
    return this.orgUnitService.getManagerOrgUnit(id);
  }

  @ApiOperation({ summary: 'Get list user of a orgUnits' })
  @JwtAuth()
  @Post('users')
  async getUsersByOrgUnits(@Body() getUsersByOrgUnitsDto: GetUsersByOrgUnitsDto) {
    return this.orgUnitService.getUsersByOrgUnits(getUsersByOrgUnitsDto);
  }

  @ApiOperation({ summary: 'Get list user by org unit ids' })
  @JwtAuth()
  @Post('users-by-org-units')
  async getListUsersByOrgUnits(@Body() dto: GetUsersByOrgUnitsDto) {
    return this.orgUnitService.getListUsersByOrgUnits(dto);
  }

  @ApiOperation({ summary: 'Get list managed Departments By User' })
  @JwtAuth()
  @Get('manager-department-by-user')
  async getManagedDepartmentsByUser(@User() user: UserRequest) {
    return this.orgUnitService.getManagedDepartmentsByUser(user);
  }

  @ApiOperation({ summary: 'Get all org units as flat array search' })
  @JwtAuth()
  @Get('tree-select')
  async getOrgUnitsFlatArraySearch(@Query() getOrgUnitSearchDto: GetOrgUnitSearchDto) {
    return this.orgUnitService.getOrgUnitsFlatArraySearch(getOrgUnitSearchDto);
  }

  @ApiOperation({ summary: 'Get tree exclude children' })
  @JwtAuth()
  @Get('exclude-children')
  async getExcludeChildren(@Query() dto: GetTreeOrgUnitDto, @User() user: UserRequest) {
    return this.orgUnitService.getExcludeChildren(user, dto);
  }

  @ApiOperation({ summary: 'Get tree org unit except descendants' })
  @JwtAuth()
  @Get('tree-except-descendants')
  async getTreeExceptDescendants(@Query() getOrgUnitSearchDto: GetOrgUnitSearchDto) {
    return this.orgUnitService.getTreeExceptDescendants(getOrgUnitSearchDto);
  }

  @ApiOperation({ summary: 'Get list restore org unit' })
  @JwtAuth()
  @Get('list/restore')
  async getListRestoreOrgUnit(@Query() getListOrgUnitDto: GetListOrgUnitDto) {
    return this.orgUnitService.getListRestoreOrgUnit(getListOrgUnitDto);
  }

  @ApiOperation({ summary: 'Get tree by id restore org unit' })
  @JwtAuth()
  @Get('tree-restore/:id')
  async getTreeRestoreOrgUnit(@Param('id') id: string) {
    return this.orgUnitService.getTreeRestoreOrgUnit(id);
  }

  @ApiOperation({ summary: 'Get org unit by id' })
  @JwtAuth()
  @Get(':id')
  async getOrgUnit(@Param('id') id: string) {
    return this.orgUnitService.getOrgUnit(id);
  }
}
