import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { pagination, PublicFaqQueryDto } from '../about.dto';

const categories: Record<string, string> = {
  booking: 'Đặt vé',
  payment: 'Thanh toán',
  refund: 'Hủy vé & Hoàn tiền',
  info: 'Thông tin chuyến đi',
  member: 'Tài khoản thành viên',
  support: 'Hỗ trợ khách hàng',
};

@Injectable()
export class CustomerFaqService {
  constructor(private readonly prisma: PrismaService) {}

  async categories() {
    const groups = await this.prisma.faq.groupBy({
      by: ['danhmuc'],
      where: { trangthai: 'HoatDong' },
      _count: { _all: true },
    });
    return {
      data: groups
        .map((group) => ({
          id: group.danhmuc,
          name: categories[group.danhmuc] ?? group.danhmuc,
          count: group._count._all,
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    };
  }

  async findAll(query: PublicFaqQueryDto) {
    const where: Prisma.faqWhereInput = {
      trangthai: 'HoatDong',
      ...(query.category && { danhmuc: query.category }),
      ...(query.search && {
        OR: [
          { cauhoi: { contains: query.search, mode: 'insensitive' } },
          { cautraloi: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
    return this.prisma.$transaction(
      async (tx) => {
        const total = await tx.faq.count({ where });
        const rows = await tx.faq.findMany({
          where,
          orderBy: [{ thutuhienthi: 'asc' }, { mafaq: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return {
          data: rows.map((row) => this.response(row)),
          pagination: pagination(query, total),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async findOne(faqId: string) {
    const row = await this.prisma.faq.findFirst({
      where: { mafaq: faqId, trangthai: 'HoatDong' },
    });
    if (!row) throw new NotFoundException('Không tìm thấy câu hỏi.');
    return this.response(row);
  }

  private response(row: {
    mafaq: string;
    cauhoi: string;
    cautraloi: string;
    danhmuc: string;
    thutuhienthi: number;
    thoigiancapnhat: Date;
  }) {
    return {
      id: row.mafaq,
      question: row.cauhoi,
      answer: row.cautraloi,
      categoryId: row.danhmuc,
      categoryName: categories[row.danhmuc] ?? row.danhmuc,
      order: row.thutuhienthi,
      updatedAt: row.thoigiancapnhat.toISOString(),
    };
  }
}
