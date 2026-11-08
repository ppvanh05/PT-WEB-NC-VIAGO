import {
  BadRequestException,
  Injectable,
  type PipeTransform,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';

// Business codes follow VIAGO's prefix + uppercase string convention.
export const chatbotId = (prefix: string) =>
  prefix + randomBytes(16).toString('hex').toUpperCase();

@Injectable()
export class ChatbotIdPipe implements PipeTransform<string, string> {
  transform(value: string) {
    // Legacy IDs remain valid after the UUID -> varchar migration.
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(value))
      throw new BadRequestException('Mã dữ liệu chatbot không hợp lệ.');
    return value;
  }
}
