import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, loai_xe_enum } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import type { Identity } from '../../../shared/accounts/accounts-access';
import { pageMeta } from '../../../shared/http/pagination';
import {
  REVIEW_CRITERIA,
  VEHICLE_TYPE_LABELS,
  initials,
  publicName,
  round1,
} from '../../../shared/review-scoring';
import { vnDate, vnTime } from '../../../shared/vn-time';
import { PublicReviewsQueryDto } from './reviews.dto';

/** Chỉ hiển thị đánh giá đang hiện, thuộc vé không bị hủy. */
const VISIBLE: Prisma.danh_giaWhereInput = {
  trangthai: 'HienThi',
  ve_xe: { trangthaive: { not: 'DaHuy' } },
};

const HAS_COMMENT: Prisma.danh_giaWhereInput = {
  AND: [{ noidung: { not: null } }, { noidung: { not: '' } }],
};
const HAS_MEDIA: Prisma.danh_giaWhereInput = {
  tep_danh_gia: { some: { trangthai: 'HienThi' } },
};

const REVIEW_SELECT = {
  madanhgia: true,
  diemtongquat: true,
  diemantoan: true,
  diemsachse: true,
  diemthaido: true,
  diemdunggio: true,
  diemthongtin: true,
  diemtiennghi: true,
  tieude: true,
  noidung: true,
  thoigiandanhgia: true,
  noidungphanhoi: true,
  thoigianphanhoi: true,
  ve_xe: {
    select: {
      hotenhanhkhach: true,
      don_hang: {
        select: {
          lich_trinh: {
            select: {
              xe: { select: { loaixe: true } },
              tuyen_xe: { select: { matuyenduong: true, tentuyen: true, diemdi: true, diemden: true } },
            },
          },
        },
      },
    },
  },
  tep_danh_gia: {
    where: { trangthai: 'HienThi' as const },
    select: { duongdantep: true, loaitep: true },
    orderBy: { thutuhienthi: 'asc' as const },
    take: 3,
  },
  _count: { select: { luot_huu_ich_danh_gia: true } },
} satisfies Prisma.danh_giaSelect;

type ReviewRow = Prisma.danh_giaGetPayload<{ select: typeof REVIEW_SELECT }>;

@Injectable()
export class CustomerReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Điểm trung bình, phân bố số sao và điểm trung bình từng tiêu chí. */
  async summary() {
    const avg = Object.fromEntries(REVIEW_CRITERIA.map((c) => [c.column, true])) as Record<string, true>;
    const [stats, withComment, withMedia, distribution] = await Promise.all([
      this.prisma.danh_gia.aggregate({
        where: VISIBLE,
        _count: true,
        _avg: { diemtongquat: true, ...avg },
      }),
      this.prisma.danh_gia.count({ where: { AND: [VISIBLE, HAS_COMMENT] } }),
      this.prisma.danh_gia.count({ where: { AND: [VISIBLE, HAS_MEDIA] } }),
      this.prisma.danh_gia.groupBy({ by: ['diemtongquat'], where: VISIBLE, _count: true }),
    ]);
    const averages = stats._avg as Record<string, number | null>;
    return {
      averageRating: round1(averages.diemtongquat),
      maxRating: 5,
      total: stats._count,
      withComment,
      withMedia,
      distribution: [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: distribution.find((d) => d.diemtongquat === star)?._count ?? 0,
      })),
      criteria: REVIEW_CRITERIA.map((c) => ({
        key: c.key,
        label: c.label,
        score: round1(averages[c.column]),
        maxScore: 5,
      })),
    };
  }

  /** Danh sách để dựng bộ lọc: loại xe, tuyến đang hoạt động, tiêu chí. */
  async options() {
    const routes = await this.prisma.tuyen_xe.findMany({
      where: { trangthai: 'HoatDong' },
      select: { matuyenduong: true, tentuyen: true },
      orderBy: { matuyenduong: 'asc' },
    });
    return {
      vehicleTypes: (Object.keys(VEHICLE_TYPE_LABELS) as loai_xe_enum[]).map((value) => ({
        value,
        label: VEHICLE_TYPE_LABELS[value],
      })),
      routes: routes.map((r) => ({ value: r.matuyenduong, label: r.tentuyen })),
      criteria: REVIEW_CRITERIA.map((c) => ({ value: c.key, label: c.label })),
    };
  }

  /** visitor: hash cookie khách ẩn danh, dùng để biết khách đã bấm "Hữu ích" chưa. */
  async list(q: PublicReviewsQueryDto, visitor?: string) {
    const and: Prisma.danh_giaWhereInput[] = [VISIBLE];
    if (q.tab === 'has_comment') and.push(HAS_COMMENT);
    if (q.tab === 'has_media') and.push(HAS_MEDIA);
    if (q.rating) and.push({ diemtongquat: q.rating });
    if (q.vehicleType || q.routeId)
      and.push({
        ve_xe: {
          don_hang: {
            lich_trinh: {
              ...(q.vehicleType ? { xe: { loaixe: q.vehicleType } } : {}),
              ...(q.routeId ? { matuyenduong: q.routeId } : {}),
            },
          },
        },
      });
    if (q.criterion) {
      const column = REVIEW_CRITERIA.find((c) => c.key === q.criterion)!.column;
      and.push({ [column]: { gte: 4 } });
    }
    if (q.search)
      and.push({
        OR: [
          { noidung: { contains: q.search, mode: 'insensitive' } },
          { tieude: { contains: q.search, mode: 'insensitive' } },
          { ve_xe: { hotenhanhkhach: { contains: q.search, mode: 'insensitive' } } },
          { ve_xe: { don_hang: { lich_trinh: { tuyen_xe: { tentuyen: { contains: q.search, mode: 'insensitive' } } } } } },
        ],
      });
    const where: Prisma.danh_giaWhereInput = { AND: and };
    const orderBy: Prisma.danh_giaOrderByWithRelationInput[] =
      q.sort === 'oldest'
        ? [{ thoigiandanhgia: 'asc' }]
        : q.sort === 'rating_high'
          ? [{ diemtongquat: 'desc' }, { thoigiandanhgia: 'desc' }]
          : q.sort === 'rating_low'
            ? [{ diemtongquat: 'asc' }, { thoigiandanhgia: 'desc' }]
            : q.sort === 'helpful'
              ? [{ luot_huu_ich_danh_gia: { _count: 'desc' } }, { thoigiandanhgia: 'desc' }]
              : [{ thoigiandanhgia: 'desc' }];
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.danh_gia.count({ where }),
      this.prisma.danh_gia.findMany({
        where,
        select: REVIEW_SELECT,
        orderBy: [...orderBy, { madanhgia: 'asc' }],
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
      }),
    ]);
    const voted = visitor && rows.length
      ? new Set(
          (await this.prisma.luot_huu_ich_danh_gia.findMany({
            where: { nguoibinhchon: visitor, madanhgia: { in: rows.map((r) => r.madanhgia) } },
            select: { madanhgia: true },
          })).map((v) => v.madanhgia),
        )
      : new Set<string>();
    return {
      items: rows.map((row) => ({ ...this.toPublic(row), isHelpful: voted.has(row.madanhgia) })),
      pagination: pageMeta(q.page, q.pageSize, total),
    };
  }

  /** Bấm/bỏ "Hữu ích". Khóa chính (đánh giá, khách) chặn tăng trùng khi bấm nhiều lần. */
  async helpful(id: string, visitor: string | undefined, on: boolean) {
    if (!visitor) throw new BadRequestException('Trình duyệt chưa bật cookie, không ghi nhận được lượt hữu ích.');
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.danh_gia.findFirst({ where: { AND: [{ madanhgia: id }, VISIBLE] }, select: { madanhgia: true } });
      if (!review) throw new NotFoundException('Không tìm thấy đánh giá.');
      if (on) await tx.luot_huu_ich_danh_gia.createMany({ data: { madanhgia: id, nguoibinhchon: visitor }, skipDuplicates: true });
      else await tx.luot_huu_ich_danh_gia.deleteMany({ where: { madanhgia: id, nguoibinhchon: visitor } });
      const helpfulCount = await tx.luot_huu_ich_danh_gia.count({ where: { madanhgia: id } });
      return { id, helpfulCount, isHelpful: on };
    });
  }

  /**
   * Kiểm tra vé có được đánh giá không: đúng chủ tài khoản, chuyến đã hoàn thành
   * và chưa đánh giá. Việc gửi đánh giá dùng API customer/profile/tickets/:id/review.
   */
  async eligibility(identity: Identity, ticketId: string) {
    const ticket = await this.prisma.ve_xe.findFirst({
      where: { mave: ticketId, don_hang: { makhachhang: identity.customerId ?? '__none__' } },
      select: {
        mave: true,
        trangthaive: true,
        loaiphong: true,
        danh_gia: { select: { madanhgia: true, thoigiandanhgia: true } },
        ghe_chuyen: { select: { ghe: { select: { soghe: true } } } },
        don_hang: {
          select: {
            lich_trinh: {
              select: {
                thoigiankhoihanh: true,
                xe: { select: { loaixe: true } },
                tuyen_xe: { select: { tentuyen: true, diemdi: true, diemden: true } },
              },
            },
          },
        },
      },
    });
    if (!ticket) throw new NotFoundException('Không tìm thấy vé thuộc tài khoản của bạn.');
    const trip = ticket.don_hang.lich_trinh;
    const reason = ticket.danh_gia
      ? 'Vé này đã được đánh giá.'
      : ticket.trangthaive !== 'DaHoanThanh'
        ? 'Chỉ được đánh giá sau khi chuyến đi hoàn thành.'
        : null;
    return {
      ticketId: ticket.mave,
      eligible: !reason,
      reason,
      reviewedAt: ticket.danh_gia?.thoigiandanhgia.toISOString() ?? null,
      trip: {
        route: trip.tuyen_xe.tentuyen,
        departureDate: vnDate(trip.thoigiankhoihanh),
        departureTime: vnTime(trip.thoigiankhoihanh),
        vehicleType: VEHICLE_TYPE_LABELS[trip.xe.loaixe],
        seat: ticket.ghe_chuyen.ghe.soghe,
      },
      criteria: REVIEW_CRITERIA.map((c) => ({ key: c.key, label: c.label })),
      maxFiles: 3,
    };
  }

  private toPublic(row: ReviewRow) {
    const trip = row.ve_xe.don_hang.lich_trinh;
    const fullName = row.ve_xe.hotenhanhkhach;
    return {
      id: row.madanhgia,
      authorName: publicName(fullName),
      authorInitials: initials(fullName),
      verifiedTrip: true,
      createdAt: row.thoigiandanhgia.toISOString(),
      rating: row.diemtongquat,
      title: row.tieude,
      content: row.noidung ?? '',
      vehicleType: VEHICLE_TYPE_LABELS[trip.xe.loaixe],
      route: {
        id: trip.tuyen_xe.matuyenduong,
        label: trip.tuyen_xe.tentuyen,
      },
      criteria: REVIEW_CRITERIA.map((c) => ({ key: c.key, label: c.label, score: row[c.column] })),
      media: row.tep_danh_gia.map((file) => ({ url: file.duongdantep, type: file.loaitep })),
      helpfulCount: row._count.luot_huu_ich_danh_gia,
      reply: row.noidungphanhoi
        ? {
            author: 'VIAGO',
            createdAt: row.thoigianphanhoi?.toISOString() ?? null,
            content: row.noidungphanhoi,
          }
        : null,
    };
  }
}
