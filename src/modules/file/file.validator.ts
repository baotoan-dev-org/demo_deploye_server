import { FileValidator } from '@nestjs/common';

export class FileMaxSize extends FileValidator<{ maxSize: number }> {
  constructor(options: { maxSize: number }) {
    super(options);
  }
  isValid(file: Express.Multer.File): boolean | Promise<boolean> {
    const sizeMb = file.size / 1000000;
    return sizeMb <= this.validationOptions.maxSize;
  }
  buildErrorMessage(): string {
    return `The image size is too large. The maximum file size is ${this.validationOptions.maxSize} MB.`;
  }
}

export class FileType extends FileValidator<{ types: string[] }> {
  constructor(options: { types: string[] }) {
    super(options);
  }
  isValid(file: Express.Multer.File): boolean | Promise<boolean> {
    const typeName = file.originalname.split('.');
    return this.validationOptions.types.includes(typeName.pop());
  }
  buildErrorMessage(): string {
    const arrayAllow = this.validationOptions.types.reduce((string, element, index) => {
      index < this.validationOptions.types.length - 1
        ? (string += `${element}, `)
        : (string += element);
      return string;
    }, '');
    return `The image format is not supported. Supported formats are: ${arrayAllow}`;
  }
}
