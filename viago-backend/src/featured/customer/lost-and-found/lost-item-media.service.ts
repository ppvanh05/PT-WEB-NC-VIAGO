import { BadRequestException, Injectable, NotFoundException, StreamableFile } from '@nestjs/common';
import { mkdir, open, unlink, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { PrismaService } from '../../../prisma/prisma.service';
import { newId } from '../../../shared/accounts/account-security';
import { reviewFileType } from '../profile/review-media.service';
import type { ReviewUpload } from '../profile/review-media.service';

export type LostItemUpload = ReviewUpload;
const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME_BY_EXT: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const URL_PREFIX = '/api/customer/lost-and-found/media/';
export const MAX_LOST_ITEM_IMAGES = 3;

/**
 * Lưu ảnh đồ thất lạc trên ổ đĩa của backend (thư mục LOST_ITEM_UPLOAD_DIR).
 * Chỉ nhận ảnh JPG/PNG/WebP tối đa 5 MB, kiểm tra theo nội dung file thật.
 */
@Injectable()
export class LostItemMediaService {
  constructor(private readonly prisma: PrismaService) {}

  private root() {
    return resolve(process.env.LOST_ITEM_UPLOAD_DIR || join(process.cwd(), 'uploads', 'lost-items'));
  }

  /** Lưu file, trả về đường dẫn để ghi vào cột hinhanh/hinhanhtimthay. */
  async store(files: LostItemUpload[] = []): Promise<{ urls: string[]; paths: string[] }> {
    if (files.length > MAX_LOST_ITEM_IMAGES) throw new BadRequestException(`Chỉ được đính kèm tối đa ${MAX_LOST_ITEM_IMAGES} ảnh.`);
    const checked = files.map((file) => {
      const mime = reviewFileType(file);
      if (!EXTENSIONS[mime]) throw new BadRequestException('Đồ thất lạc chỉ nhận ảnh JPG, PNG hoặc WebP.');
      return { file, ext: EXTENSIONS[mime] };
    });
    const urls: string[] = [];
    const paths: string[] = [];
    if (!checked.length) return { urls, paths };
    await mkdir(this.root(), { recursive: true, mode: 0o700 });
    try {
      for (const { file, ext } of checked) {
        const name = `${newId('DTLM')}.${ext}`;
        const path = join(this.root(), name);
        await writeFile(path, file.buffer, { flag: 'wx', mode: 0o600 });
        paths.push(path);
        urls.push(URL_PREFIX + name);
      }
      return { urls, paths };
    } catch (error) {
      await this.remove(paths);
      throw error;
    }
  }

  /** Xóa file đã lưu khi ghi DB thất bại. */
  async remove(paths: string[]) {
    await Promise.all(paths.map((p) => unlink(p).catch(() => {})));
  }

  /** Chỉ trả ảnh đang được một hồ sơ đồ thất lạc sử dụng; tên file ngẫu nhiên nên không đoán được. */
  async read(name: string) {
    const match = /^DTLM_[a-f0-9]{32}\.(jpg|png|webp)$/.exec(name);
    if (!match) throw new NotFoundException('Không tìm thấy ảnh.');
    const url = URL_PREFIX + name;
    const used = await this.prisma.do_that_lac.count({ where: { OR: [{ hinhanh: { has: url } }, { hinhanhtimthay: { has: url } }] } });
    if (!used) throw new NotFoundException('Không tìm thấy ảnh.');
    const file = await open(join(this.root(), name), 'r').catch(() => null);
    if (!file) throw new NotFoundException('Không tìm thấy ảnh.');
    const stat = await file.stat();
    return new StreamableFile(file.createReadStream(), {
      type: MIME_BY_EXT[match[1]],
      length: stat.size,
      disposition: `inline; filename="${name}"`,
    });
  }
}
