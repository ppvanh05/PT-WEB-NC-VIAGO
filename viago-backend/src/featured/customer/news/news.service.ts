import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { nextBusinessId } from '../../../shared/business-id';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  NEWS_CATEGORIES,
  NewsPaginationDto,
  newsPagination,
  PublicCommentDto,
  PublicNewsQueryDto,
} from './news.dto';

type Tx = Prisma.TransactionClient;
const publicNews = (): Prisma.tin_tucWhereInput => ({
  trangthai: 'DangHienThi',
  thoigiandang: { lte: new Date() },
});
const visibleComments: Prisma.binh_luan_tin_tucWhereInput = {
  trangthai: 'HienThi',
  OR: [
    { mabinhluancha: null },
    {
      binh_luan_tin_tuc: { is: { trangthai: 'HienThi', mabinhluancha: null } },
    },
  ],
};
const articleSelect = {
  matintuc: true,
  duongdan: true,
  tieude: true,
  danhmuc: true,
  anhbia: true,
  tomtat: true,
  bophandang: true,
  tags: true,
  luotxem: true,
  noibat: true,
  vitrinoibat: true,
  thoigiandang: true,
  thoigiancapnhat: true,
  _count: { select: { binh_luan_tin_tuc: { where: visibleComments } } },
} satisfies Prisma.tin_tucSelect;
type Article = Prisma.tin_tucGetPayload<{ select: typeof articleSelect }>;
const commentSelect = {
  mabinhluan: true,
  mabinhluancha: true,
  tennguoibinhluan: true,
  noidung: true,
  luotthich: true,
  thoigianbinhluan: true,
} satisfies Prisma.binh_luan_tin_tucSelect;
type Comment = Prisma.binh_luan_tin_tucGetPayload<{
  select: typeof commentSelect;
}>;
const newest = [
  { thoigiandang: 'desc' },
  { matintuc: 'asc' },
] satisfies Prisma.tin_tucOrderByWithRelationInput[];
const slots = [
  'main',
  'grid-1',
  'grid-2',
  'grid-3',
  'grid-4',
  'sub-highlight',
  'sub-grid-1',
  'sub-grid-2',
  'sub-grid-3',
];
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
const accents =
  'àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ';
const plain = Array.from(accents, (char) => normalize(char)).join('');

@Injectable()
export class CustomerNewsService {
  constructor(private readonly prisma: PrismaService) {}

  async categories() {
    const groups = await this.prisma.tin_tuc.groupBy({
      by: ['danhmuc'],
      where: publicNews(),
      _count: { _all: true },
    });
    const data = Object.entries(NEWS_CATEGORIES).map(([id, category]) => ({
      id,
      code: category.code,
      label: category.label,
      count:
        groups.find((group) => group.danhmuc === category.code)?._count._all ??
        0,
    }));
    return {
      data: [
        {
          id: 'all',
          code: null,
          label: 'Tin tức tổng hợp',
          count: data.reduce((sum, item) => sum + item.count, 0),
        },
        ...data,
      ],
    };
  }

  async findAll(query: PublicNewsQueryDto) {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`trangthai = 'DangHienThi' AND thoigiandang <= ${new Date()}`,
    ];
    if (query.category !== 'all')
      conditions.push(
        Prisma.sql`danhmuc::text = ${NEWS_CATEGORIES[query.category].code}`,
      );
    if (query.search) {
      const pattern =
        '%' + normalize(query.search).replace(/[\\%_]/g, '\\$&') + '%';
      conditions.push(
        Prisma.sql`translate(lower(normalize(tieude, NFC)), ${accents}, ${plain}) LIKE ${pattern} ESCAPE '\'`,
      );
    }
    if (query.tag) conditions.push(Prisma.sql`${query.tag} = ANY(tags)`);
    if (query.time !== 'all') {
      const today = new Date(
        new Intl.DateTimeFormat('en-CA', {
          timeZone: 'Asia/Ho_Chi_Minh',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).format(new Date()) + 'T00:00:00+07:00',
      );
      const start =
        query.time === 'today'
          ? today
          : new Date(
              Date.now() -
                ({ week: 7, month: 30, year: 365 }[query.time] ?? 0) * 86400000,
            );
      conditions.push(Prisma.sql`thoigiandang >= ${start}`);
    }
    const where = Prisma.join(conditions, ' AND ');
    const order =
      query.sort === 'popular'
        ? Prisma.sql`luotxem DESC, thoigiandang DESC, matintuc ASC`
        : query.sort === 'oldest'
          ? Prisma.sql`thoigiandang ASC, matintuc ASC`
          : Prisma.sql`thoigiandang DESC, matintuc ASC`;
    return this.prisma.$transaction(
      async (tx) => {
        const [count] = await tx.$queryRaw<{ total: bigint }[]>(
          Prisma.sql`SELECT count(*) AS total FROM tin_tuc WHERE ${where}`,
        );
        const ids = await tx.$queryRaw<{ matintuc: string }[]>(
          Prisma.sql`SELECT matintuc FROM tin_tuc WHERE ${where} ORDER BY ${order} LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`,
        );
        const rows = await tx.tin_tuc.findMany({
          where: { matintuc: { in: ids.map((item) => item.matintuc) } },
          select: articleSelect,
        });
        const byId = new Map(rows.map((row) => [row.matintuc, row]));
        return {
          data: ids.map((item) =>
            this.articleResponse(byId.get(item.matintuc)!),
          ),
          pagination: newsPagination(query, Number(count.total)),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async featured(category: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const where = {
          ...publicNews(),
          ...(category !== 'all' && {
            danhmuc: NEWS_CATEGORIES[category].code,
          }),
        };
        const selected = new Map<string, Article>();
        for (const slot of slots) {
          const row = await tx.tin_tuc.findFirst({
            where: { ...where, noibat: true, vitrinoibat: slot },
            select: articleSelect,
            orderBy: newest,
          });
          if (row) selected.set(slot, row);
        }
        const used = new Set([...selected.values()].map((row) => row.matintuc));
        const fallback = await tx.tin_tuc.findMany({
          where: { ...where, matintuc: { notIn: [...used] } },
          select: articleSelect,
          orderBy: [{ noibat: 'desc' }, ...newest],
          take: slots.length - used.size,
        });
        for (const slot of slots)
          if (!selected.has(slot)) {
            const row = fallback.shift();
            if (row) selected.set(slot, row);
          }
        const one = (slot: string) => {
          const row = selected.get(slot);
          return row ? this.articleResponse(row) : null;
        };
        return {
          main: one('main'),
          grid: slots.slice(1, 5).flatMap((slot) => {
            const row = one(slot);
            return row ? [row] : [];
          }),
          subHighlight: one('sub-highlight'),
          subGrid: slots.slice(6).flatMap((slot) => {
            const row = one(slot);
            return row ? [row] : [];
          }),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async findOne(key: string) {
    const row = await this.prisma.tin_tuc.findFirst({
      where: this.articleWhere(key),
      select: { ...articleSelect, noidung: true },
    });
    if (!row) throw this.missingArticle();
    return { ...this.articleResponse(row), content: row.noidung };
  }

  async related(key: string, limit: number) {
    return this.prisma.$transaction(
      async (tx) => {
        const article = await this.requireArticle(tx, key);
        const rows = await tx.tin_tuc.findMany({
          where: {
            ...publicNews(),
            danhmuc: article.danhmuc,
            matintuc: { not: article.matintuc },
          },
          select: articleSelect,
          orderBy: newest,
          take: limit,
        });
        return { data: rows.map((row) => this.articleResponse(row)) };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async view(key: string) {
    return this.write(async (tx) => {
      const article = await this.requireArticle(tx, key);
      const row = await tx.tin_tuc.update({
        where: { matintuc: article.matintuc },
        data: { luotxem: { increment: 1 } },
        select: { luotxem: true },
      });
      return { viewCount: row.luotxem };
    });
  }

  async comments(
    key: string,
    query: NewsPaginationDto,
    visitor?: string,
    parentId?: string,
  ) {
    return this.prisma.$transaction(
      async (tx) => {
        const article = await this.requireArticle(tx, key);
        if (parentId)
          await this.requireComment(tx, article.matintuc, parentId, true);
        const where: Prisma.binh_luan_tin_tucWhereInput = {
          matintuc: article.matintuc,
          trangthai: 'HienThi',
          mabinhluancha: parentId ?? null,
        };
        const total = await tx.binh_luan_tin_tuc.count({ where });
        const rows = await tx.binh_luan_tin_tuc.findMany({
          where,
          select: {
            ...commentSelect,
            other_binh_luan_tin_tuc: {
              where: { matintuc: article.matintuc, trangthai: 'HienThi' },
              select: commentSelect,
              orderBy: [{ thoigianbinhluan: 'asc' }, { mabinhluan: 'asc' }],
              take: parentId ? 0 : 3,
            },
            _count: {
              select: {
                other_binh_luan_tin_tuc: {
                  where: { matintuc: article.matintuc, trangthai: 'HienThi' },
                },
              },
            },
          },
          orderBy: [
            { thoigianbinhluan: parentId ? 'asc' : 'desc' },
            { mabinhluan: 'asc' },
          ],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        const ids = rows.flatMap((row) => [
          row.mabinhluan,
          ...row.other_binh_luan_tin_tuc.map((reply) => reply.mabinhluan),
        ]);
        const liked =
          visitor && ids.length
            ? await tx.luot_thich_binh_luan.findMany({
                where: { nguoithich: visitor, mabinhluan: { in: ids } },
                select: { mabinhluan: true },
              })
            : [];
        const likedIds = new Set(liked.map((item) => item.mabinhluan));
        return {
          data: rows.map((row) => ({
            ...this.commentResponse(row, likedIds),
            replyCount: row._count.other_binh_luan_tin_tuc,
            replies: row.other_binh_luan_tin_tuc.map((reply) =>
              this.commentResponse(reply, likedIds),
            ),
          })),
          pagination: newsPagination(query, total),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async createComment(key: string, dto: PublicCommentDto, parentId?: string) {
    return this.write(async (tx) => {
      const article = await this.requireArticle(tx, key);
      if (parentId)
        await this.requireComment(tx, article.matintuc, parentId, true);
      const row = await tx.binh_luan_tin_tuc.create({
        data: {
          mabinhluan: await nextBusinessId(tx, 'BL'),
          matintuc: article.matintuc,
          mabinhluancha: parentId,
          tennguoibinhluan: dto.authorName || 'Hành khách Viago',
          noidung: dto.content,
          luotthich: 0,
          thoigianbinhluan: new Date(),
          trangthai: 'HienThi',
        },
        select: commentSelect,
      });
      return { ...this.commentResponse(row), replies: [], replyCount: 0 };
    });
  }

  async like(key: string, commentId: string, visitor: string, liked: boolean) {
    return this.write(async (tx) => {
      const article = await this.requireArticle(tx, key);
      await this.requireComment(tx, article.matintuc, commentId);
      if (liked) {
        const created = await tx.luot_thich_binh_luan.createMany({
          data: { mabinhluan: commentId, nguoithich: visitor },
          skipDuplicates: true,
        });
        if (created.count)
          await tx.binh_luan_tin_tuc.update({
            where: { mabinhluan: commentId },
            data: { luotthich: { increment: 1 } },
          });
      } else {
        const removed = await tx.luot_thich_binh_luan.deleteMany({
          where: { mabinhluan: commentId, nguoithich: visitor },
        });
        if (removed.count)
          await tx.binh_luan_tin_tuc.updateMany({
            where: { mabinhluan: commentId, luotthich: { gt: 0 } },
            data: { luotthich: { decrement: 1 } },
          });
      }
      const row = await tx.binh_luan_tin_tuc.findUniqueOrThrow({
        where: { mabinhluan: commentId },
        select: { luotthich: true },
      });
      return { id: commentId, likes: row.luotthich, isLiked: liked };
    });
  }

  private articleWhere(key: string): Prisma.tin_tucWhereInput {
    return { ...publicNews(), OR: [{ matintuc: key }, { duongdan: key }] };
  }
  private missingArticle() {
    return new NotFoundException('Không tìm thấy bài viết đang hiển thị.');
  }
  private async requireArticle(tx: Tx, key: string) {
    const article = await tx.tin_tuc.findFirst({
      where: this.articleWhere(key),
      select: { matintuc: true, danhmuc: true },
    });
    if (!article) throw this.missingArticle();
    return article;
  }
  private async requireComment(
    tx: Tx,
    articleId: string,
    id: string,
    root = false,
  ) {
    const row = await tx.binh_luan_tin_tuc.findFirst({
      where: {
        ...visibleComments,
        matintuc: articleId,
        mabinhluan: id,
        ...(root && { mabinhluancha: null }),
      },
      select: { mabinhluan: true, mabinhluancha: true },
    });
    if (!row)
      throw new NotFoundException(
        'Không tìm thấy bình luận đang hiển thị trong bài viết.',
      );
    if (row.mabinhluancha) {
      const parent = await tx.binh_luan_tin_tuc.findFirst({
        where: {
          mabinhluan: row.mabinhluancha,
          matintuc: articleId,
          trangthai: 'HienThi',
          mabinhluancha: null,
        },
        select: { mabinhluan: true },
      });
      if (!parent) throw new NotFoundException('Không tìm thấy bình luận.');
    }
    return row;
  }
  private articleResponse(row: Article) {
    const [category, info] = Object.entries(NEWS_CATEGORIES).find(
      ([, item]) => item.code === row.danhmuc,
    )!;
    return {
      id: row.matintuc,
      slug: row.duongdan,
      title: row.tieude,
      category,
      categoryLabel: info.label,
      image: row.anhbia ?? '/assets/customer/logo.png',
      summary: row.tomtat ?? '',
      author: row.bophandang || info.author,
      tags: row.tags,
      viewCount: row.luotxem,
      commentCount: row._count.binh_luan_tin_tuc,
      isFeatured: row.noibat,
      featuredPosition: row.vitrinoibat,
      date: new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(row.thoigiandang!),
      publishedAt: row.thoigiandang!.toISOString(),
      updatedAt: row.thoigiancapnhat.toISOString(),
      path: `/customer/tin-tuc/${row.duongdan}`,
    };
  }
  private commentResponse(row: Comment, liked = new Set<string>()) {
    return {
      id: row.mabinhluan,
      parentId: row.mabinhluancha,
      authorName: row.tennguoibinhluan,
      content: row.noidung,
      createdAt: row.thoigianbinhluan.toISOString(),
      likes: row.luotthich,
      isLiked: liked.has(row.mabinhluan),
    };
  }
  private async write<T>(operation: (tx: Tx) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 15000,
          maxWait: 5000,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034'
        ) {
          if (attempt < 2) continue;
          throw new ConflictException(
            'Yêu cầu đang được xử lý. Vui lòng thử lại sau.',
          );
        }
        throw error;
      }
    }
    throw new ConflictException('Vui lòng thử lại sau.');
  }
}
