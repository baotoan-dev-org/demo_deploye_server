import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { FileService } from '../services/file.service';
import { CreateFileDto } from '../dtos/create-file.dto';
import { CreateManyFilesDto } from '../dtos/create-many-files.dto';
import { FileValidationInterceptor } from '../file.interceptor';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @ApiOperation({ summary: 'Create file' })
  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './office-storage/upload',
        filename: (req, file, callback) => {
          const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
          callback(null, originalname);
        },
      }),
    }),
    FileValidationInterceptor,
  )
  createFile(@Body() createFileDto: CreateFileDto, @UploadedFile() file: Express.Multer.File) {
    return this.fileService.createFile({ ...createFileDto, file });
  }

  @ApiOperation({
    summary: 'Upload multiple files',
    description: 'Upload up to 10 files at once. Returns detailed results for each file.',
  })
  @Post('upload-many')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: diskStorage({
        destination: './office-storage/upload',
        filename: (req, file, callback) => {
          const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
          callback(null, originalname);
        },
      }),
      fileFilter: (req, file, callback) => {
        // Additional file filtering can be done here
        callback(null, true);
      },
    }),
    FileValidationInterceptor,
  )
  async uploadManyFiles(
    @Body() createManyFilesDto: CreateManyFilesDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      return [];
    }

    return this.fileService.createManyFiles({ ...createManyFilesDto, files });
  }
}
