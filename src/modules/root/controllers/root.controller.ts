import { ApiBody, ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { RootService } from '../services/root.service';
import { Route } from 'src/common/decorators/route.decorator';
import { Body, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { CreateRootDto } from '../dtos/create-root.dto';
import { JwtAuthUserTypes } from '@/common/decorators/jwt-auth-user-types.decorator';
import { UserType } from '@/modules/user/user.enum';
import { User } from '@/common/decorators/user.decorator';
import { UserRequest } from '@/common/interfaces/user-request.type';
import { FileInterceptor } from '@nestjs/platform-express';

@Route('root')
export class RootController {
  constructor(private rootService: RootService) {}

  @ApiOperation({ summary: 'Create root' })
  @Post()
  createRoot(@Body() createRootDto: CreateRootDto) {
    return this.rootService.createRoot(createRootDto);
  }

  @ApiOperation({ summary: 'Create ceo' })
  @Post('ceo')
  createCeo(@Body() createRootDto: CreateRootDto) {
    return this.rootService.createCeo(createRootDto);
  }

  @ApiOperation({ summary: 'Import data' })
  @JwtAuthUserTypes(UserType.ROOT)
  @Post('import-data')
  importData(@User() user: UserRequest) {
    return this.rootService.importData(user);
  }

  @Post('imports-users')
  @JwtAuthUserTypes(UserType.ROOT)
  @ApiOperation({ summary: 'Import users từ file Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File Excel chứa thông tin Users',
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
  async importUsersFromExcel(@UploadedFile() file: Express.Multer.File, @User() user: UserRequest) {
    return this.rootService.importUsersFromExcel(file.buffer, user);
  }

  @ApiOperation({ summary: 'Import users from base' })
  @JwtAuthUserTypes(UserType.HR)
  @Post('import-users-base')
  importUsersBase() {
    return this.rootService.importUsersBase();
  }

  @Post('import-org-units')
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
  async importOrgUnits(
    @UploadedFile() file: Express.Multer.File,
    @User() user: UserRequest, // Assuming user is attached to request
  ) {
    return await this.rootService.importFromExcel(file.buffer, user);
  }

  @ApiOperation({ summary: 'Restore org unit' })
  @Post('restore-org-unit')
  restoreOrgUnit() {
    return this.rootService.restoreOrgUnit();
  }

  @ApiOperation({ summary: 'Check remove user or org unit' })
  @Post('check-remove-user-or-org-unit')
  checkRemoveUserOrOrgUnit() {
    return this.rootService.checkRemoveUserOrOrgUnit();
  }
}
