import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

export function IsValidEnumKeysRecord(enumType: object, validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidEnumKeysRecord',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [enumType], // Lưu enum vào constraints
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'object' || value === null) return false;

          const [enumType] = args.constraints;
          const validKeys = Object.keys(enumType); // Lấy danh sách giá trị enum

          return Object.keys(value).every(
            (key) => validKeys.includes(key) && typeof value[key] === 'number',
          );
        },
        defaultMessage(args: ValidationArguments) {
          const [enumType] = args.constraints;
          const validKeys = Object.values(enumType).join(', ');

          return `${args.property} must be an object where keys are one of: ${validKeys} and values are numbers.`;
        },
      },
    });
  };
}
