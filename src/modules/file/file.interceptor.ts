import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import {
  FILE_IMAGE_TYPE_WHITELIST,
  FILE_DOCUMENT_TYPE_WHITELIST,
  FILE_MEDIA_TYPE_WHITELIST,
} from './file.constant';
import { FileTypeEnum } from './file.enum';

@Injectable()
export class FileValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const file = request.file; // Single file
    const files = request.files; // Multiple files
    const type = request.body.type;

    // Check if we have either single file or multiple files
    const filesToValidate = files || (file ? [file] : []);

    if (!filesToValidate || filesToValidate.length === 0) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedTypes =
      type === FileTypeEnum.IMAGE
        ? FILE_IMAGE_TYPE_WHITELIST
        : type === FileTypeEnum.DOCUMENT
          ? FILE_DOCUMENT_TYPE_WHITELIST
          : [
              ...FILE_IMAGE_TYPE_WHITELIST,
              ...FILE_DOCUMENT_TYPE_WHITELIST,
              ...FILE_MEDIA_TYPE_WHITELIST,
            ];

    const maxSize = 50 * 1024 * 1024; // 10 MB
    const maxTotalSize = 250 * 1024 * 1024; // 50MB total for all files combined

    // Calculate total size of all files
    const totalSize = filesToValidate.reduce((sum, file) => sum + file.size, 0);

    // Check total size limit
    if (totalSize > maxTotalSize)
      throw new BadRequestException(
        `Total file size (${(totalSize / 1024 / 1024).toFixed(2)}MB) exceeds the maximum allowed total size of ${maxTotalSize / 1024 / 1024}MB`,
      );

    // Validate each file
    for (const fileToValidate of filesToValidate) {
      const extension = fileToValidate.originalname.split('.').pop()?.toLowerCase();
      if (!extension)
        throw new BadRequestException(`Invalid file extension for ${fileToValidate.originalname}`);

      if (!allowedTypes.includes(extension))
        throw new BadRequestException(
          `File ${fileToValidate.originalname}: Chỉ cho phép cập nhật với đuôi: ${allowedTypes.join(', ')}`,
        );

      if (fileToValidate.size > maxSize)
        throw new BadRequestException(
          `File ${fileToValidate.originalname} (${(fileToValidate.size / 1024 / 1024).toFixed(2)}MB): The file size is too large. The maximum file size is ${maxSize / 1024 / 1024}MB.`,
        );
    }

    return next.handle();
  }
}
