import {
  BadRequestException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { mkdir, writeFile, unlink, open } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PrismaService } from '../../../prisma/prisma.service';
import { newId } from '../../../shared/accounts/account-security';
export interface ReviewUpload {
  buffer: Buffer;
  mimetype: string;
  size: number;
}
export interface StoredReviewMedia {
  id: string;
  path: string;
  url: string;
  mime: string;
  size: number;
  kind: 'Anh' | 'Video';
}
const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};
export function reviewFileType(file: ReviewUpload) {
  const b = file.buffer;
  const mime = b.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
    ? 'image/jpeg'
    : b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      ? 'image/png'
      : b.toString('ascii', 0, 4) === 'RIFF' &&
          b.toString('ascii', 8, 12) === 'WEBP'
        ? 'image/webp'
        : b.length >= 12 &&
            b.toString('ascii', 4, 8) === 'ftyp' &&
            ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'M4V '].includes(
              b.toString('ascii', 8, 12),
            )
          ? 'video/mp4'
          : b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
            ? 'video/webm'
            : '';
  if (
    !mime ||
    file.mimetype !== mime ||
    file.size !== b.length ||
    !file.size ||
    file.size > (mime.startsWith('image/') ? 5 : 20) * 1024 * 1024
  )
    throw new BadRequestException(
      'Chỉ nhận JPG, PNG, WebP tối đa 5 MB hoặc MP4, WebM tối đa 20 MB; nội dung phải đúng định dạng.',
    );
  return mime;
}
@Injectable()
export class ReviewMediaService {
  constructor(private readonly prisma: PrismaService) {}
  private root() {
    return resolve(
      process.env.REVIEW_UPLOAD_DIR ||
        join(process.cwd(), 'uploads', 'private', 'reviews'),
    );
  }
  async store(files: ReviewUpload[]): Promise<StoredReviewMedia[]> {
    if (files.length > 3)
      throw new BadRequestException('Chỉ được đính kèm tối đa 3 tệp.');
    const checked = files.map((file) => ({ file, mime: reviewFileType(file) }));
    const stored: StoredReviewMedia[] = [];
    if (!checked.length) return stored;
    await mkdir(this.root(), { recursive: true, mode: 0o700 });
    try {
      for (const { file, mime } of checked) {
        const id = newId('TDG'),
          path = join(this.root(), `${id}.${extensions[mime]}`);
        await writeFile(path, file.buffer, { flag: 'wx', mode: 0o600 });
        stored.push({
          id,
          path,
          mime,
          size: file.size,
          kind: mime.startsWith('image/') ? 'Anh' : 'Video',
          url: `/api/customer/review-media/${id}`,
        });
      }
      return stored;
    } catch (error) {
      await this.remove(stored);
      throw error;
    }
  }
  async remove(files: StoredReviewMedia[]) {
    await Promise.all(files.map((file) => unlink(file.path).catch(() => {})));
  }
  async rollback(files: StoredReviewMedia[]) {
    if (!files.length) return;
    // A lost COMMIT response must never cause deletion of an already committed upload.
    try {
      if (
        await this.prisma.tep_danh_gia.count({
          where: { matepdanhgia: { in: files.map((file) => file.id) } },
        })
      )
        return;
    } catch {
      return;
    }
    await this.remove(files);
  }
  async read(id: string) {
    if (!/^TDG_[a-f0-9]{32}$/.test(id))
      throw new NotFoundException('Không tìm thấy tệp.');
    const record = await this.prisma.tep_danh_gia.findFirst({
      where: {
        matepdanhgia: id,
        trangthai: 'HienThi',
        danh_gia: { trangthai: 'HienThi' },
      },
      select: { dinhdangtep: true, dungluong: true },
    });
    if (!record || !extensions[record.dinhdangtep])
      throw new NotFoundException('Không tìm thấy tệp.');
    const file = await open(
      join(this.root(), `${id}.${extensions[record.dinhdangtep]}`),
      'r',
    ).catch(() => null);
    if (!file) throw new NotFoundException('Không tìm thấy tệp.');
    const stat = await file.stat();
    if (!stat.isFile() || BigInt(stat.size) !== record.dungluong) {
      await file.close();
      throw new NotFoundException('Không tìm thấy tệp.');
    }
    return new StreamableFile(file.createReadStream(), {
      type: record.dinhdangtep,
      length: stat.size,
      disposition: `inline; filename="${id}.${extensions[record.dinhdangtep]}"`,
    });
  }
}
