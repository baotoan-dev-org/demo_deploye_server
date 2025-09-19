import { Injectable } from '@nestjs/common';
import slugify from 'slugify';

@Injectable()
export class StringService {
  constructor() {}

  extractNumberAtStartString = (string: string) => {
    const match = string.match(/^\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : 0;
  };

  decodeFileName(name: string): string {
    if (!name) return name;
    try {
      const decodedName = Buffer.from(name, 'latin1').toString('utf8');
      return decodedName.replace(/\.[^.]+$/, '');
    } catch (_) {
      return name;
    }
  }

  slug(content: string, id: string) {
    return (
      slugify(content, {
        replacement: '-', // replace spaces with replacement character, defaults to `-`
        remove: undefined, // remove characters that match regex, defaults to `undefined`
        lower: true, // convert to lower case, defaults to `false`
        strict: false, // strip special characters except replacement, defaults to `false`
        locale: 'vi', // language code of the locale to use
        trim: true, // trim leading and trailing replacement chars, defaults to `true`
      }) +
      '-' +
      id
    );
  }
}
