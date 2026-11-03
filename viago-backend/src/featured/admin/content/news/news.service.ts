import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma, trang_thai_tin_tuc_enum } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  COMMENT_STATUSES,
  CreateNewsDto,
  ListNewsCommentsDto,
  ListNewsDto,
  NEWS_AUTHORS,
  NEWS_CATEGORIES,
  NEWS_STATUSES,
  UpdateNewsCommentStatusDto,
  UpdateNewsDto,
  UpdateNewsStatusDto,
} from './news.dto';

const newsSelect = {
  matintuc: true,
  duongdan: true,
  tieude: true,
  danhmuc: true,
  anhbia: true,
  tomtat: true,
  manhanviendang: true,
  bophandang: true,
  noibat: true,
  tags: true,
  luotxem: true,
  trangthai: true,
  thoigiandang: true,
  thoigiantao: true,
  thoigiancapnhat: true,
  nhan_vien: { select: { hoten: true } },
  _count: {
    select: { binh_luan_tin_tuc: { where: { trangthai: 'HienThi' } } },
  },
} satisfies Prisma.tin_tucSelect;
const detailSelect = {
  ...newsSelect,
  noidung: true,
} satisfies Prisma.tin_tucSelect;
type Article = Prisma.tin_tucGetPayload<{ select: typeof newsSelect }>;
type Detail = Prisma.tin_tucGetPayload<{ select: typeof detailSelect }>;
type Comment = Prisma.binh_luan_tin_tucGetPayload<object>;
type Tx = Prisma.TransactionClient;
type Actor = { manhanvien: string; mataikhoan: string };
const id = (prefix: string) =>
  prefix + randomUUID().replaceAll('-', '').toUpperCase();
const displayDate = (date: Date) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);

@Injectable()
export class AdminNewsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdminNewsService.name);
  private timer?: ReturnType<typeof setInterval>;
  private publishing?: Promise<number>;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (process.env.NEWS_SCHEDULER_ENABLED === 'false') return;
    this.timer = setInterval(() => {
      void this.publishDue().catch(() =>
        this.logger.error(
          'Không thể xuất bản tin đến hạn; sẽ thử lại ở lần kiểm tra tiếp theo.',
        ),
      );
    }, 30000);
    this.timer.unref();
  }

  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.publishing?.catch(() => undefined);
  }

  async findAll(query: ListNewsDto) {
    const conditions: Prisma.tin_tucWhereInput[] = [];
    if (query.search)
      conditions.push({
        OR: [
          { matintuc: { contains: query.search, mode: 'insensitive' } },
          { tieude: { contains: query.search, mode: 'insensitive' } },
          { tomtat: { contains: query.search, mode: 'insensitive' } },
          { noidung: { contains: query.search, mode: 'insensitive' } },
        ],
      });
    if (query.thang) {
      const [year, month] = query.thang.split('-').map(Number);
      const range = {
        gte: new Date(Date.UTC(year, month - 1, 1) - 7 * 3600000),
        lt: new Date(Date.UTC(year, month, 1) - 7 * 3600000),
      };
      conditions.push({
        OR: [
          { thoigiandang: range },
          { thoigiandang: null, thoigiantao: range },
        ],
      });
    }
    const where: Prisma.tin_tucWhereInput = {
      ...(query.loai && { danhmuc: query.loai }),
      ...(query.trangThai && { trangthai: query.trangThai }),
      ...(query.noiBat !== undefined && { noibat: query.noiBat }),
      ...(conditions.length && { AND: conditions }),
    };
    const orderBy: Prisma.tin_tucOrderByWithRelationInput =
      query.sort === 'title-az'
        ? { tieude: 'asc' }
        : query.sort === 'title-za'
          ? { tieude: 'desc' }
          : { thoigiantao: query.sort === 'oldest' ? 'asc' : 'desc' };
    return this.prisma.$transaction(
      async (tx) => {
        const total = await tx.tin_tuc.count({ where });
        const articles = await tx.tin_tuc.findMany({
          where,
          select: newsSelect,
          orderBy: [orderBy, { matintuc: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return {
          data: articles.map((article) => this.response(article)),
          pagination: this.pagination(query, total),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async statistics() {
    return this.prisma.$transaction(
      async (tx) => {
        const groups = await tx.tin_tuc.groupBy({
          by: ['danhmuc', 'trangthai'],
          _count: { _all: true },
        });
        const count = (status?: string) =>
          groups
            .filter((group) => !status || group.trangthai === status)
            .reduce((sum, group) => sum + group._count._all, 0);
        return {
          total: count(),
          visible: count('DangHienThi'),
          scheduled: count('LichHenDang'),
          draft: count('BanNhap'),
          hidden: count('DaAn'),
          featured: await tx.tin_tuc.count({ where: { noibat: true } }),
          byType: Object.entries(NEWS_CATEGORIES).map(([code, label]) => ({
            code,
            label,
            total: groups
              .filter((group) => group.danhmuc === code)
              .reduce((sum, group) => sum + group._count._all, 0),
          })),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async findOne(articleId: string) {
    return this.response(await this.article(this.prisma, articleId));
  }

  async create(dto: CreateNewsDto) {
    this.validateContent(dto.noiDung);
    return this.write(async (tx) => {
      const actor = await this.actor(tx, dto.maNhanVien);
      const now = new Date();
      const articleId = id('TT');
      const status = dto.trangThai ?? 'BanNhap';
      const publishedAt = this.publication(
        status,
        dto.henDangLuc,
        undefined,
        now,
      );
      const article = await tx.tin_tuc.create({
        data: {
          matintuc: articleId,
          duongdan: dto.duongDan ?? this.slug(dto.tieuDe, articleId),
          tieude: dto.tieuDe,
          danhmuc: dto.loai,
          anhbia: dto.image,
          tomtat: dto.moTa,
          noidung: dto.noiDung,
          manhanviendang: actor.manhanvien,
          bophandang: dto.nguoiDang ?? NEWS_AUTHORS[dto.loai],
          noibat: dto.noiBat ?? false,
          tags: this.tags(dto.tags ?? []),
          trangthai: status,
          thoigiandang: publishedAt,
          thoigiantao: now,
          thoigiancapnhat: now,
        },
        select: detailSelect,
      });
      await this.audit(tx, actor, article, 'TaoTinTuc', now);
      return this.response(article);
    });
  }

  update(articleId: string, dto: UpdateNewsDto) {
    return this.saveUpdate(articleId, dto, false);
  }

  updateStatus(articleId: string, dto: UpdateNewsStatusDto) {
    return this.saveUpdate(articleId, dto, true);
  }

  private async saveUpdate(
    articleId: string,
    dto: UpdateNewsDto,
    idempotent: boolean,
  ) {
    const { maNhanVien, ...changes } = dto;
    if (!Object.values(changes).some((value) => value !== undefined)) {
      throw new BadRequestException(
        'Vui lòng gửi ít nhất một trường cần cập nhật.',
      );
    }
    if (dto.noiDung !== undefined) this.validateContent(dto.noiDung);
    return this.write(async (tx) => {
      const current = await this.article(tx, articleId);
      const actor = await this.actor(tx, maNhanVien);
      const now = new Date();
      const status = dto.trangThai ?? current.trangthai;
      const data = {
        tieude: dto.tieuDe ?? current.tieude,
        danhmuc: dto.loai ?? current.danhmuc,
        anhbia: dto.image ?? current.anhbia,
        tomtat: dto.moTa ?? current.tomtat,
        noidung: dto.noiDung ?? current.noidung,
        duongdan: dto.duongDan ?? current.duongdan,
        bophandang: dto.nguoiDang ?? current.bophandang,
        noibat: dto.noiBat ?? current.noibat,
        tags: dto.tags ? this.tags(dto.tags) : current.tags,
        trangthai: status,
        thoigiandang: this.publication(status, dto.henDangLuc, current, now),
      };
      const changed = Object.entries(data).some(
        ([key, value]) =>
          JSON.stringify(value) !==
          JSON.stringify(current[key as keyof Detail]),
      );
      if (!changed) {
        if (idempotent) return this.response(current);
        throw new BadRequestException('Không có dữ liệu nào thay đổi.');
      }
      const article = await tx.tin_tuc.update({
        where: { matintuc: articleId },
        data: { ...data, thoigiancapnhat: now },
        select: detailSelect,
      });
      await this.audit(
        tx,
        actor,
        article,
        idempotent ? 'DoiTrangThaiTinTuc' : 'CapNhatTinTuc',
        now,
      );
      return this.response(article);
    });
  }

  async comments(articleId: string, query: ListNewsCommentsDto) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.article(tx, articleId);
        const where = { matintuc: articleId, trangthai: query.trangThai };
        const total = await tx.binh_luan_tin_tuc.count({ where });
        const comments = await tx.binh_luan_tin_tuc.findMany({
          where,
          orderBy: [{ thoigianbinhluan: 'desc' }, { mabinhluan: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return {
          data: comments.map((comment) => this.commentResponse(comment)),
          pagination: this.pagination(query, total),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async updateCommentStatus(
    articleId: string,
    commentId: string,
    dto: UpdateNewsCommentStatusDto,
  ) {
    return this.write(async (tx) => {
      const article = await this.article(tx, articleId);
      const actor = await this.actor(tx, dto.maNhanVien);
      const comment = await tx.binh_luan_tin_tuc.findFirst({
        where: { mabinhluan: commentId, matintuc: articleId },
      });
      if (!comment)
        throw new NotFoundException(
          'Không tìm thấy bình luận thuộc bài viết này.',
        );
      if (comment.trangthai === dto.trangThai)
        return this.commentResponse(comment);
      const updated = await tx.binh_luan_tin_tuc.update({
        where: { mabinhluan: commentId },
        data: { trangthai: dto.trangThai },
      });
      await this.audit(
        tx,
        actor,
        article,
        dto.trangThai === 'DaAn' ? 'AnBinhLuanTinTuc' : 'HienBinhLuanTinTuc',
        new Date(),
        commentId,
      );
      return this.commentResponse(updated);
    });
  }

  // The conditional update and transaction make this safe across multiple app instances.
  async publishDue(): Promise<number> {
    if (this.publishing) return this.publishing;
    const task = this.write(async (tx) => {
      const now = new Date();
      const due = await tx.tin_tuc.findMany({
        where: { trangthai: 'LichHenDang', thoigiandang: { lte: now } },
        orderBy: [{ thoigiandang: 'asc' }, { matintuc: 'asc' }],
        take: 25,
        select: { matintuc: true, tieude: true },
      });
      let count = 0;
      for (const article of due) {
        const result = await tx.tin_tuc.updateMany({
          where: {
            matintuc: article.matintuc,
            trangthai: 'LichHenDang',
            thoigiandang: { lte: now },
          },
          data: { trangthai: 'DangHienThi', thoigiancapnhat: now },
        });
        if (result.count) {
          await this.audit(tx, null, article, 'TuDongDangTinTuc', now);
          count++;
        }
      }
      return count;
    });
    this.publishing = task;
    try {
      return await task;
    } finally {
      if (this.publishing === task) this.publishing = undefined;
    }
  }

  private publication(
    status: trang_thai_tin_tuc_enum,
    input: string | undefined,
    current: Detail | undefined,
    now: Date,
  ): Date | null {
    if (status === 'LichHenDang') {
      if (
        !input &&
        current?.trangthai === 'LichHenDang' &&
        current.thoigiandang
      )
        return current.thoigiandang;
      const scheduled = input ? new Date(input) : null;
      if (
        !scheduled ||
        !Number.isFinite(scheduled.getTime()) ||
        scheduled <= now
      ) {
        throw new BadRequestException(
          'Hẹn đăng cần henDangLuc hợp lệ, có múi giờ và ở tương lai.',
        );
      }
      return scheduled;
    }
    if (input !== undefined)
      throw new BadRequestException(
        'henDangLuc chỉ dùng khi trạng thái là Lịch hẹn đăng.',
      );
    const previousPublication =
      current &&
      ['DangHienThi', 'DaAn'].includes(current.trangthai) &&
      current.thoigiandang &&
      current.thoigiandang <= now
        ? current.thoigiandang
        : null;
    if (status === 'DangHienThi') return previousPublication ?? now;
    return status === 'DaAn' ? previousPublication : null;
  }

  private async article(tx: Tx, articleId: string) {
    const article = await tx.tin_tuc.findUnique({
      where: { matintuc: articleId },
      select: detailSelect,
    });
    if (!article) throw new NotFoundException('Không tìm thấy bài viết.');
    return article;
  }

  private async actor(tx: Tx, employeeId: string) {
    const actor = await tx.nhan_vien.findUnique({
      where: { manhanvien: employeeId },
      select: { manhanvien: true, mataikhoan: true, trangthai: true },
    });
    if (!actor || actor.trangthai !== 'HoatDong')
      throw new BadRequestException(
        'Mã nhân viên không tồn tại hoặc đã bị khóa.',
      );
    return actor;
  }

  private validateContent(content: string) {
    if (
      !content
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;|&#160;|&#x[aA]0;/g, ' ')
        .trim()
    ) {
      throw new BadRequestException('Nội dung bài viết không được để trống.');
    }
  }

  private tags(input: string[]) {
    const seen = new Set<string>();
    return input.filter((tag) => {
      const key = tag.toLocaleLowerCase('vi');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private slug(title: string, articleId: string) {
    const titleSlug =
      title
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .replace(/[đĐ]/g, 'd')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .slice(0, 140)
        .replace(/^-|-$/g, '') || 'tin-tuc';
    return `${titleSlug}-${articleId.slice(2).toLowerCase()}`;
  }

  private pagination(query: { page: number; pageSize: number }, total: number) {
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  private response(article: Article & { noidung?: string }) {
    return {
      id: article.matintuc,
      duongDan: article.duongdan,
      tieuDe: article.tieude,
      moTa: article.tomtat,
      loai: NEWS_CATEGORIES[article.danhmuc],
      loaiCode: article.danhmuc,
      nguoiDang: article.bophandang ?? article.nhan_vien.hoten,
      maNhanVienDang: article.manhanviendang,
      tenNhanVienDang: article.nhan_vien.hoten,
      ngayDang: displayDate(article.thoigiandang ?? article.thoigiantao),
      thoiGianDang: article.thoigiandang?.toISOString() ?? null,
      henDangLuc:
        article.trangthai === 'LichHenDang'
          ? (article.thoigiandang?.toISOString() ?? null)
          : null,
      trangThai: NEWS_STATUSES[article.trangthai],
      trangThaiCode: article.trangthai,
      image: article.anhbia,
      noiBat: article.noibat,
      tags: article.tags,
      luotXem: article.luotxem,
      soBinhLuan: article._count.binh_luan_tin_tuc,
      ngayTao: article.thoigiantao.toISOString(),
      capNhatCuoi: article.thoigiancapnhat.toISOString(),
      ...(article.noidung !== undefined && { noiDung: article.noidung }),
    };
  }

  private commentResponse(comment: Comment) {
    return {
      id: comment.mabinhluan,
      parentId: comment.mabinhluancha,
      author: comment.tennguoibinhluan,
      date: displayDate(comment.thoigianbinhluan),
      content: comment.noidung,
      thoiGianBinhLuan: comment.thoigianbinhluan.toISOString(),
      luotThich: comment.luotthich,
      trangThai: COMMENT_STATUSES[comment.trangthai],
      trangThaiCode: comment.trangthai,
    };
  }

  private audit(
    tx: Tx,
    actor: Actor | null,
    article: { matintuc: string; tieude: string },
    action: string,
    now: Date,
    commentId?: string,
  ) {
    return tx.nhat_ky_he_thong.create({
      data: {
        manhatky: id('NK'),
        mataikhoan: actor?.mataikhoan,
        manhanvien: actor?.manhanvien,
        hanhdong: action,
        banglienquan: commentId ? 'binh_luan_tin_tuc' : 'tin_tuc',
        madoituong: commentId ?? article.matintuc,
        tendoituong: article.tieude,
        loaidoituong: commentId ? 'BinhLuanTinTuc' : 'TinTuc',
        trangthai: 'ThanhCong',
        thoigian: now,
        chitiet: `${action}: ${article.matintuc}${commentId ? ` / ${commentId}` : ''} - ${article.tieude}`,
      },
    });
  }

  private async write<T>(operation: (tx: Tx) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 30000,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034' && attempt < 2) continue;
          if (error.code === 'P2002')
            throw new ConflictException(
              'Đường dẫn bài viết đã tồn tại. Vui lòng dùng đường dẫn khác.',
            );
          if (error.code === 'P2034')
            throw new ConflictException(
              'Dữ liệu vừa thay đổi. Vui lòng tải lại và thử lại.',
            );
          if (error.code === 'P2025')
            throw new NotFoundException(
              'Không tìm thấy bài viết hoặc bình luận.',
            );
          if (error.code === 'P2003')
            throw new BadRequestException('Dữ liệu tham chiếu không hợp lệ.');
        }
        throw error;
      }
    }
    throw new ConflictException(
      'Không thể cập nhật tin tức. Vui lòng thử lại.',
    );
  }
}
