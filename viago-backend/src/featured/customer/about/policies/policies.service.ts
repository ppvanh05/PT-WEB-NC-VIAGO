import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { loai_chinh_sach_enum, Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  LEGAL_TYPES,
  pagination,
  PublicPoliciesQueryDto,
  vietnamDate,
} from '../about.dto';

export const TERM_TYPES: loai_chinh_sach_enum[] = [
  'DatVe',
  'ChinhSuaVe',
  'HoanHuy',
  'DieuKhoanDichVu',
];
const select = {
  machinhsach: true,
  tieude: true,
  loaichinhsach: true,
  noidung: true,
  ngayapdung: true,
  thoigiancapnhat: true,
} satisfies Prisma.chinh_sachSelect;
type Document = Prisma.chinh_sachGetPayload<{ select: typeof select }>;
const versionSelect = {
  manhomchinhsach: true,
  phienban: true,
  chi_tiet_chinh_sach_huy: {
    orderBy: { sogiotoithieu: 'desc' as const },
    select: {
      sogiotoithieu: true,
      sogiotoida: true,
      chophephuy: true,
      tylehoan: true,
      tylephihuy: true,
    },
  },
} satisfies Prisma.chinh_sach_huySelect;
type Version = Prisma.chinh_sach_huyGetPayload<{
  select: typeof versionSelect;
}>;

@Injectable()
export class CustomerPoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  types(allowed = Object.values(loai_chinh_sach_enum)) {
    return {
      data: allowed.map((code) => ({ code, label: LEGAL_TYPES[code] })),
    };
  }

  async findAll(
    query: PublicPoliciesQueryDto,
    defaults: loai_chinh_sach_enum[] = ['BaoMat'],
    allowed?: loai_chinh_sach_enum[],
  ) {
    if (query.type && allowed && !allowed.includes(query.type))
      throw new BadRequestException(
        'Loại chính sách không thuộc nhóm điều khoản.',
      );
    const now = new Date();
    const where: Prisma.chinh_sachWhereInput = {
      trangthai: 'DangApDung',
      ngayapdung: { lte: now },
      loaichinhsach: { in: query.type ? [query.type] : defaults },
      ...(query.search && {
        OR: [
          { tieude: { contains: query.search, mode: 'insensitive' } },
          { noidung: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
    return this.prisma.$transaction(
      async (tx) => {
        const total = await tx.chinh_sach.count({ where });
        const rows = await tx.chinh_sach.findMany({
          where,
          select,
          orderBy: [{ ngayapdung: 'desc' }, { machinhsach: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        const versions = await this.versions(tx, rows, now);
        return {
          data: rows.map((row) =>
            this.response(row, versions.get(row.machinhsach)),
          ),
          pagination: pagination(query, total),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async findOne(documentId: string, allowed?: loai_chinh_sach_enum[]) {
    const now = new Date();
    return this.prisma.$transaction(
      async (tx) => {
        const row = await tx.chinh_sach.findFirst({
          where: {
            machinhsach: documentId,
            trangthai: 'DangApDung',
            ngayapdung: { lte: now },
            ...(allowed && { loaichinhsach: { in: allowed } }),
          },
          select,
        });
        if (!row)
          throw new NotFoundException('Không tìm thấy nội dung đang áp dụng.');
        return this.response(
          row,
          (await this.versions(tx, [row], now)).get(row.machinhsach),
        );
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  private async versions(
    tx: Prisma.TransactionClient,
    rows: Document[],
    now: Date,
  ) {
    const ids = rows
      .filter((row) => row.loaichinhsach === 'HoanHuy')
      .map((row) => row.machinhsach);
    const result = new Map<string, Version>();
    if (!ids.length) return result;
    const versions = await tx.chinh_sach_huy.findMany({
      where: {
        manhomchinhsach: { in: ids },
        trangthai: 'HoatDong',
        ngayapdung: { lte: now },
        OR: [{ ngayngungapdung: null }, { ngayngungapdung: { gt: now } }],
      },
      select: versionSelect,
      orderBy: [{ phienban: 'desc' }, { machinhsach: 'asc' }],
    });
    for (const version of versions)
      if (!result.has(version.manhomchinhsach))
        result.set(version.manhomchinhsach, version);
    return result;
  }

  private response(row: Document, version?: Version) {
    return {
      id: row.machinhsach,
      title: row.tieude,
      type: row.loaichinhsach,
      typeLabel: LEGAL_TYPES[row.loaichinhsach],
      content: row.noidung,
      effectiveDate: vietnamDate(row.ngayapdung),
      updatedAt: row.thoigiancapnhat.toISOString(),
      cancellationVersion: version?.phienban ?? null,
      cancellationRules:
        version?.chi_tiet_chinh_sach_huy.map((rule) => ({
          minHours: rule.sogiotoithieu,
          maxHours: rule.sogiotoida,
          cancellationAllowed: rule.chophephuy,
          refundPercent: Number(rule.tylehoan),
          feePercent: Number(rule.tylephihuy),
        })) ?? [],
    };
  }
}
