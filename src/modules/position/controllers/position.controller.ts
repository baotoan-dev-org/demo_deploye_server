import { User } from '@/common/decorators/user.decorator';
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
import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { Route } from 'src/common/decorators/route.decorator';
import { CreatePositionDto } from '../dtos/create-position.dto';
import { GetListPositionDto } from '../dtos/get-list-position.dto';
import { UpdatePositionDto } from '../dtos/update-position.dto';
import { PositionService } from '../services/position.service';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { JwtAuth } from '@/common/decorators/jwt-auth.decorator';
import { GetListPositionUserMovementQueryDto } from '../dtos/get-list-position-user-movement.dto';
import { GetPositionSearchDto } from '../dtos/get-position-search.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

@Route('position')
export class PositionController {
  constructor(private positionService: PositionService) {}

  @ApiOperation({ summary: 'Create position' })
  @JwtAuth()
  @Post()
  async createPosition(@Body() createPositionDto: CreatePositionDto, @User() user: UserRequest) {
    return this.positionService.createPosition(createPositionDto, user);
  }

  @ApiOperation({ summary: 'Update position' })
  @JwtAuth()
  @Put(':id')
  async updatePosition(
    @Param('id') id: string,
    @Body() updatePositionDto: UpdatePositionDto,
    @User() user: UserRequest,
  ) {
    return this.positionService.updatePosition(id, updatePositionDto, user);
  }

  @ApiOperation({ summary: 'Khôi phục đơn vị tổ chức' })
  @JwtAuth()
  @Patch(':id/restore')
  async restorePosition(@Param('id') id: string, @User() user: UserRequest) {
    return await this.positionService.restorePosition(id, user);
  }

  @ApiOperation({ summary: 'Xóa vào thùng rác' })
  @JwtAuth()
  @Delete('soft-delete/:id')
  async removePosition(@Param('id') id: string, @User() user: UserRequest) {
    return this.positionService.removePosition(id, user);
  }

  @ApiOperation({ summary: 'Xóa vị trí' })
  @JwtAuth()
  @Delete(':id')
  async deletePosition(@Param('id') id: string, @User() user: UserRequest) {
    return this.positionService.deletePosition(id, user);
  }

  @Post('upload-multiple-file')
  @ApiOperation({ summary: 'Upload multiple file để import vị trí' })
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
  async uploadMultipleFile(@UploadedFiles() files: Express.Multer.File[]) {
    return await this.positionService.processMultipleFile(files);
  }

  @Post('bulk-import-word')
  @ApiOperation({ summary: 'Bulk import vị trí từ file Word theo tên' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File Word chứa nhiều vị trí',
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
    return await this.positionService.processBulkWordFile(file);
  }

  @ApiOperation({ summary: 'Get list positions' })
  @Get()
  async getListPosition(@Query() getListPositionDto: GetListPositionDto) {
    return this.positionService.getListPosition(getListPositionDto);
  }

  @ApiOperation({ summary: 'Get full tree position' })
  @Get('tree')
  async getFullTreePosition(@Query() getPositionSearchDto: GetPositionSearchDto) {
    return this.positionService.getFullTreePosition(getPositionSearchDto);
  }

  @ApiOperation({ summary: 'Get tree position node' })
  @JwtAuth()
  @Get('tree/org-node')
  async getTreePositionNode(
    @Query() getPositionSearchDto: GetPositionSearchDto,
    @User() user: UserRequest,
  ) {
    return this.positionService.getTreePositionNode(getPositionSearchDto, user);
  }

  @ApiOperation({ summary: 'Get full tree user' })
  @JwtAuth()
  @Get('tree/user')
  async getTreePositionUser(@User() user: UserRequest) {
    return this.positionService.getTreePositionUser(user);
  }

  @ApiOperation({ summary: 'Get tree org unit' })
  @JwtAuth()
  @Get('tree/search')
  async getTreePositionSearch(@Query() getPositionSearchDto: GetPositionSearchDto) {
    return this.positionService.getTreePositionSearch(getPositionSearchDto);
  }

  @ApiOperation({ summary: 'Get all positions as flat array' })
  @JwtAuth()
  @Get('flat-array')
  async getPositionFlatArray() {
    return this.positionService.getPositionFlatArray();
  }

  @ApiOperation({ summary: 'Get all positions as flat array parent' })
  @JwtAuth()
  @Get('all-except-descendants/:childrenId')
  async getAllExceptDescendants(@Param('childrenId') childrenId: string) {
    return this.positionService.getAllExceptDescendants(childrenId);
  }

  @ApiOperation({ summary: 'Get list position user movement' })
  @Get('user-movement')
  async getListPositionUserMovement(@Query() query: GetListPositionUserMovementQueryDto) {
    return this.positionService.getListPositionUserMovement(query);
  }

  @ApiOperation({ summary: 'Get list children position of a position' })
  @Get(':id/children')
  async getListChildrenPosition(@Param('id') id: string) {
    return this.positionService.getListChildrenPosition(id);
  }

  @ApiOperation({ summary: 'Get tree children position of a position, include current node' })
  @Get('tree/:id/children')
  async getTreeChildrenPosition(@Param('id') id: string) {
    return this.positionService.getTreeChildrenPosition(id);
  }

  @ApiOperation({ summary: 'get full branch of current node' })
  @Get('branch/:id')
  async getBranch(@Param('id') id: string) {
    return this.positionService.getBranch(id);
  }

  @ApiOperation({ summary: 'Get list restore position' })
  @JwtAuth()
  @Get('list/restore')
  async getListRestorePosition(@Query() getListPositionDto: GetListPositionDto) {
    return this.positionService.getListRestorePosition(getListPositionDto);
  }

  @ApiOperation({ summary: 'Get tree by id restore position' })
  @JwtAuth()
  @Get('tree-restore/:id')
  async getTreeRestorePosition(@Param('id') id: string) {
    return this.positionService.getTreeRestorePosition(id);
  }

  @ApiOperation({ summary: 'Get position by id' })
  @Get(':id')
  async getPosition(@Param('id') id: string) {
    return this.positionService.getPosition(id);
  }

  @ApiOperation({ summary: 'Get flat tree position node' })
  @JwtAuth()
  @Get('tree/flat-org-node')
  async getFlatTreePositionNode(@User() user: UserRequest) {
    return this.positionService.getFlatTreePositionNode(user);
  }
}
