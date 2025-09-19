import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateFileDto } from '../dtos/create-file.dto';
import { CreateManyFilesDto } from '../dtos/create-many-files.dto';
import { File } from '../entities/file.entity';
import { ConfigService } from '@nestjs/config';
import { FileStatus } from '../file.enum';
import { promises as fs } from 'fs';
import { ReadJDService } from '@/modules/job/services/read-jd.service';
import * as mime from "mime-types";


@Injectable()
export class FileService {
  constructor(
    private configService: ConfigService,

    private readJDService: ReadJDService,

    @InjectRepository(File)
    private fileRepo: Repository<File>,
  ) {}

  async createFile(createFileDto: CreateFileDto) {
    const { file, context } = createFileDto;
    let { mimetype, originalname, size } = file;

    originalname = Buffer.from(originalname, 'latin1').toString('utf8');

    const url = `${this.configService.get('SERVE_STATIC_URL')}${encodeURIComponent(originalname)}`;

    const fileRow = await this.fileRepo.insert({
      name: originalname,
      mimetype,
      url,
      size,
      status: FileStatus.USED,
    });

    if (context && context === 'recruitment') {
      const mimeType = mime.lookup(file.path);

      if (
        mimeType === "application/vnd.ms-excel" ||
        mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ){
          const htmlContent = await this.readJDService.parseExcelFromFile(file.path);

          return { id: fileRow.raw[0], url, name: originalname, jd: htmlContent };
      }
      const buffer = await fs.readFile(file.path);

      const htmlContent = await this.readJDService.convertDocxBufferToHtml(buffer);

      return { id: fileRow.raw[0], url, name: originalname, jd: htmlContent };
    }

    return { id: fileRow.raw[0], url, name: originalname };
  }

  async createManyFiles(createManyFilesDto: CreateManyFilesDto & { files: Express.Multer.File[] }) {
    const { files, isOverwrite = false } = createManyFilesDto;
    const results = [];

    for (const file of files) {
      try {
        let { mimetype, originalname, size } = file;

        originalname = Buffer.from(originalname, 'latin1').toString('utf8');

        const url = `${this.configService.get('SERVE_STATIC_URL')}${encodeURIComponent(originalname)}`;

        if (!isOverwrite) {
          const existingFile = await this.fileRepo.findOne({ where: { name: originalname } });
          if (existingFile) {
            results.push({
              id: existingFile.id,
              url: existingFile.url,
              name: originalname,
              success: true,
            });
            continue;
          }
        }

        const fileRow = await this.fileRepo.insert({
          name: originalname,
          mimetype,
          url,
          size,
          status: FileStatus.USED,
        });

        results.push({ id: fileRow.raw[0], url, name: originalname, success: true });
      } catch (error) {
        Logger.log(`Error uploading file ${file.originalname}:`, error);
      }
    }

    return results;
  }

  // async getListFile(getListFileDto: GetListFileDto, user: UserRequest) {
  //   const { page, take, orderBy, order, search, status } = getListFileDto;

  //   const whereItem: FindOptionsWhere<File> = { createdById: user.id };
  //   let where: FindOptionsWhere<File>[] = [whereItem];

  //   if (status) whereItem.status = status;

  //   if (search)
  //     where = this.queryService.search({
  //       arrayPropertyLike: ['name'],
  //       search,
  //       whereItem,
  //     });

  //   const [list, total] = await this.fileRepo.findAndCount({
  //     where,
  //     ...this.queryService.getPagination({ page, take }),
  //     order: { [orderBy]: order },
  //   });

  //   return { total, list };
  // }

  // async getFile(id: string) {
  //   const file = await this.fileRepo.findOne({ where: { id } });

  //   if (!file) throw new NotFoundException('File không tồn tại!');

  //   return file;
  // }

  // async deleteFile(id: string, user: UserRequest) {
  //   const file = await this.fileRepo.findOne({
  //     where: { id, createdById: user.id },
  //     select: ['url'],
  //   });

  //   if (!file) throw new NotFoundException('File không tồn tại!');

  //   return await Promise.all([
  //     this.fileRepo.delete(id),
  //     // this.isDevelopment
  //     //   ? this.cloudinaryService.delete({
  //     //       url: file.url,
  //     //     })
  //     //   : this.s3Service.delete({ url: file.url }),
  //   ]);
  // }
}
