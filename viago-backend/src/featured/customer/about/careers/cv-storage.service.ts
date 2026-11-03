import {
  BadRequestException,
  FileTypeValidator,
  Injectable,
} from '@nestjs/common';
import { mkdir, open, unlink } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { UploadedCv } from '../about.dto';
import { CV_MAX_SIZE } from '../about.dto';

export type StoredCv = { reference: string; path: string };
const mimeTypes: Record<string, RegExp> = {
  '.pdf': /^application\/pdf$/,
  '.docx':
    /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/,
  '.doc': /^application\/(?:msword|x-cfb)$/,
};

@Injectable()
export class CvStorageService {
  async save(file?: UploadedCv): Promise<StoredCv> {
    if (!file || !Buffer.isBuffer(file.buffer) || !file.buffer.length)
      throw new BadRequestException('Vui lòng tải lên CV.');
    if (file.buffer.length > CV_MAX_SIZE)
      throw new BadRequestException('CV không được vượt quá 5 MB.');
    const extension = extname(file.originalname).toLowerCase();
    const validator = mimeTypes[extension]
      ? new FileTypeValidator({
          fileType: mimeTypes[extension],
          overrideMimeType: true,
        })
      : undefined;
    if (
      !validator ||
      !(await validator.isValid(file)) ||
      (extension === '.doc' &&
        !file.buffer.includes(Buffer.from('WordDocument', 'utf16le')))
    ) {
      throw new BadRequestException(
        'CV phải là file PDF, DOC hoặc DOCX có nội dung đúng định dạng.',
      );
    }
    const reference = `${randomUUID()}${extension}`;
    const root = resolve(
      process.env.CV_UPLOAD_DIR ??
        join(process.cwd(), 'uploads', 'private', 'cv'),
    );
    await mkdir(root, { recursive: true });
    const path = join(root, reference);
    const handle = await open(path, 'wx', 0o600);
    try {
      await handle.writeFile(file.buffer);
    } catch (error) {
      await handle.close();
      await unlink(path);
      throw error;
    }
    await handle.close();
    return { reference, path };
  }

  async remove(file: StoredCv) {
    try {
      await unlink(file.path);
    } catch (error) {
      if (!(
        error instanceof Error &&
        'code' in error &&
        error.code === 'ENOENT'
      ))
        throw error;
    }
  }
}
