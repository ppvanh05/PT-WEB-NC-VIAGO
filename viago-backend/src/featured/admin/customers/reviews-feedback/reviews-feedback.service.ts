import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { Prisma, muc_do_khan_cap_enum } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AccountsAccess, Identity } from '../../../../shared/accounts/accounts-access';
import { paginate } from '../../../../shared/http/pagination';
import {
  REVIEW_CRITERIA,
  VEHICLE_TYPE_LABELS,
  autoUrgency,
  isLateTrip,
  round1,
} from '../../../../shared/review-scoring';
import { HOUR_MS, startOfVnDay, vnDate, vnTime, DAY_MS } from '../../../../shared/vn-time';
import {
  AdminReviewsQueryDto,
  CAUSE_TAG_LABELS,
  CauseTag,
  ProcessingStatus,
  ReviewReplyDto,
  ReviewVisibilityDto,
  ReviewWorkflowDto,
} from './reviews-feedback.dto';

/** Hạn phản hồi đánh giá: 24 giờ kể từ lúc khách gửi. */
const SLA_HOURS = 24;
const URGENCY_ORDER: Record<muc_do_khan_cap_enum, number> = { Cao: 0, TrungBinh: 1, Thap: 2 };

const REVIEW_INCLUDE = {
  khach_hang: { select: { makhachhang: true, hotenkhachhang: true, sodienthoai: true } },
  nhan_vien: { select: { manhanvien: true, hoten: true } },
  tep_danh_gia: { orderBy: { thutuhienthi: 'asc' as const } },
  ve_xe: {
    select: {
      mave: true,
      hotenhanhkhach: true,
      sodienthoaihanhkhach: true,
      ghe_chuyen: { select: { ghe: { select: { soghe: true } } } },
      don_hang: {
        select: {
          madonhang: true,
          sodienthoainguoidat: true,
          lich_trinh: {
            select: {
              malichtrinh: true,
              thoigiankhoihanh: true,
              thoigiandendukien: true,
              thoigiandenthucte: true,
              mataixechinh: true,
              tuyen_xe: { select: { matuyenduong: true, tentuyen: true, diemdi: true, diemden: true } },
              xe: { select: { biensoxe: true, loaixe: true } },
              tai_xe_phu_xe_lich_trinh_mataixechinhTotai_xe_phu_xe: { select: { manhansu: true, hoten: true } },
            },
          },
        },
      },
    },
  },
} satisfies Prisma.danh_giaInclude;
type ReviewRow = Prisma.danh_giaGetPayload<{ include: typeof REVIEW_INCLUDE }>;

@Injectable()
export class AdminReviewsFeedbackService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccountsAccess,
  ) {}

  /**
   * Danh sách đánh giá cho hàng đợi CSKH. Mức khẩn cấp và trạng thái trễ giờ
   * được tính từ dữ liệu chuyến, nên lọc/sắp xếp trên bộ nhớ sau khi lọc sơ bộ ở DB.
   */
  async list(q: AdminReviewsQueryDto) {
    const where: Prisma.danh_giaWhereInput = { AND: this.baseFilters(q) };
    const rows = await this.prisma.danh_gia.findMany({ where, include: REVIEW_INCLUDE });
    const counts = await this.sameTripCounts(rows.map((r) => r.ve_xe.don_hang.lich_trinh.malichtrinh));
    let items = rows.map((row) => this.toItem(row, counts));
    if (q.urgency) items = items.filter((i) => i.urgency === q.urgency);
    if (q.departureTime) items = items.filter((i) => i.trip.departureTime === q.departureTime);
    items.sort((a, b) => {
      if (q.sort === 'oldest') return a.createdAt.localeCompare(b.createdAt);
      if (q.sort === 'newest') return b.createdAt.localeCompare(a.createdAt);
      if (q.sort === 'rating_low') return a.rating - b.rating || b.createdAt.localeCompare(a.createdAt);
      // urgent: chưa xong trước, khẩn cấp cao trước, gần hạn phản hồi trước
      const done = (i: typeof a) => (['da-xong', 'dong'].includes(i.processingStatus) ? 1 : 0);
      return done(a) - done(b) || URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency] || a.slaDeadline.localeCompare(b.slaDeadline);
    });
    return paginate(items, q.page, q.pageSize);
  }

  /** Số liệu đầu trang: tổng, đánh giá thấp, cần phản hồi, quá hạn, điểm từng tiêu chí, chuyến cần cải thiện. */
  async summary() {
    const rows = await this.prisma.danh_gia.findMany({ include: REVIEW_INCLUDE });
    const counts = await this.sameTripCounts(rows.map((r) => r.ve_xe.don_hang.lich_trinh.malichtrinh));
    const items = rows.map((row) => this.toItem(row, counts));
    const avg = (values: (number | null)[]) => {
      const valid = values.filter((v): v is number => v != null && v > 0);
      return valid.length ? round1(valid.reduce((s, v) => s + v, 0) / valid.length) : null;
    };
    const byTrip = new Map<string, { label: string; scores: number[] }>();
    for (const item of items) {
      const key = item.trip.scheduleId;
      const entry = byTrip.get(key) ?? { label: `${item.trip.route} ${item.trip.departureDate} ${item.trip.departureTime}`, scores: [] };
      entry.scores.push(item.rating);
      byTrip.set(key, entry);
    }
    const worst = [...byTrip.entries()]
      .map(([id, v]) => ({ scheduleId: id, label: v.label, average: avg(v.scores)!, count: v.scores.length }))
      .sort((a, b) => a.average - b.average || b.count - a.count)[0];
    const now = new Date().toISOString();
    return {
      total: items.length,
      lowRating: items.filter((i) => i.rating <= 3).length,
      needsReply: items.filter((i) => !i.reply).length,
      overdue: items.filter((i) => !i.reply && !['da-xong', 'dong'].includes(i.processingStatus) && i.slaDeadline < now).length,
      hidden: items.filter((i) => !i.visible).length,
      averageRating: avg(items.map((i) => i.rating)),
      criteria: REVIEW_CRITERIA.map((c) => ({ key: c.key, label: c.label, score: avg(rows.map((r) => r[c.column])) })),
      tripToImprove: worst && worst.average < 4 ? worst : null,
      byCause: [...Object.entries(CAUSE_TAG_LABELS), ['none', 'Chưa gắn nguyên nhân']].map(([value, label]) => ({
        value,
        label,
        count: items.filter((i) => (i.causeTag ?? 'none') === value).length,
      })),
      byProcessingStatus: Object.fromEntries(
        (['moi', 'dang-xu-ly', 'da-xong', 'dong'] as const).map((s) => [s, items.filter((i) => i.processingStatus === s).length]),
      ),
    };
  }

  /** Dữ liệu cho bộ lọc: tuyến và các giờ khởi hành có đánh giá. */
  async options() {
    const rows = await this.prisma.danh_gia.findMany({
      select: { ve_xe: { select: { don_hang: { select: { lich_trinh: { select: { thoigiankhoihanh: true, tuyen_xe: { select: { matuyenduong: true, tentuyen: true } } } } } } } } },
    });
    const routes = new Map<string, string>();
    const times = new Set<string>();
    for (const r of rows) {
      const trip = r.ve_xe.don_hang.lich_trinh;
      routes.set(trip.tuyen_xe.matuyenduong, trip.tuyen_xe.tentuyen);
      times.add(vnTime(trip.thoigiankhoihanh));
    }
    return {
      routes: [...routes].map(([value, label]) => ({ value, label })).sort((a, b) => a.value.localeCompare(b.value)),
      departureTimes: [...times].sort(),
      causeTags: Object.entries(CAUSE_TAG_LABELS).map(([value, label]) => ({ value, label })),
      processingStatuses: [
        { value: 'moi', label: 'Mới' },
        { value: 'dang-xu-ly', label: 'Đang xử lý' },
        { value: 'da-xong', label: 'Đã xong' },
        { value: 'dong', label: 'Đóng' },
      ],
    };
  }

  async detail(id: string) {
    const row = await this.prisma.danh_gia.findUnique({ where: { madanhgia: id }, include: REVIEW_INCLUDE });
    if (!row) throw new NotFoundException('Không tìm thấy đánh giá.');
    const trip = row.ve_xe.don_hang.lich_trinh;
    const counts = await this.sameTripCounts([trip.malichtrinh]);
    // Số đánh giá thấp gần đây về cùng tài xế, để CSKH nhận ra lỗi lặp lại
    const driverLowReviews = await this.prisma.danh_gia.count({
      where: {
        madanhgia: { not: id },
        diemtongquat: { lte: 2 },
        ve_xe: { don_hang: { lich_trinh: { mataixechinh: trip.mataixechinh } } },
      },
    });
    return { ...this.toItem(row, counts), driverLowReviewCount: driverLowReviews };
  }

  /** Gửi/sửa phản hồi công khai cho khách. Đã phản hồi thì chuyển sang "Đã xong" nếu đang mở. */
  async reply(id: string, dto: ReviewReplyDto, identity: Identity, req: Request) {
    return this.update(id, identity, req, 'REPLY_REVIEW', 'Phản hồi đánh giá của khách hàng.', (current) => ({
      noidungphanhoi: dto.content,
      manhanvienphanhoi: identity.staffId ?? null,
      thoigianphanhoi: new Date(),
      ...(['moi', 'dang-xu-ly', null].includes(current.trangthaixuly) ? { trangthaixuly: 'da-xong' } : {}),
    }));
  }

  async removeReply(id: string, identity: Identity, req: Request) {
    return this.update(id, identity, req, 'DELETE_REVIEW_REPLY', 'Xóa phản hồi đánh giá.', (current) => {
      if (!current.noidungphanhoi) throw new BadRequestException('Đánh giá chưa có phản hồi.');
      return {
        noidungphanhoi: null,
        manhanvienphanhoi: null,
        thoigianphanhoi: null,
        ...(current.trangthaixuly === 'da-xong' ? { trangthaixuly: 'dang-xu-ly' } : {}),
      };
    });
  }

  /** Cập nhật quy trình xử lý nội bộ: trạng thái, mức khẩn cấp, ghi chú. */
  async workflow(id: string, dto: ReviewWorkflowDto, identity: Identity, req: Request) {
    if (dto.processingStatus === undefined && dto.urgency === undefined && dto.internalNote === undefined && dto.causeTag === undefined)
      throw new BadRequestException('Không có thay đổi nào.');
    return this.update(id, identity, req, 'UPDATE_REVIEW_WORKFLOW', 'Cập nhật xử lý nội bộ đánh giá.', () => ({
      ...(dto.processingStatus ? { trangthaixuly: dto.processingStatus } : {}),
      ...(dto.urgency ? { mucdokhancap: dto.urgency } : {}),
      ...(dto.internalNote !== undefined ? { ghichunoibo: dto.internalNote || null } : {}),
      ...(dto.causeTag !== undefined ? { tagnguyennhan: dto.causeTag || null } : {}),
    }));
  }

  /**
   * Ẩn/hiện đánh giá. Chỉ ẩn nội dung vi phạm, không xóa; đánh giá tiêu cực
   * vẫn phải được tiếp nhận và phản hồi. Lý do ẩn được ghi vào ghi chú nội bộ và nhật ký.
   */
  async visibility(id: string, dto: ReviewVisibilityDto, identity: Identity, req: Request) {
    if (!dto.visible && !dto.reason) throw new BadRequestException('Cần ghi lý do vi phạm khi ẩn đánh giá.');
    return this.update(
      id,
      identity,
      req,
      dto.visible ? 'SHOW_REVIEW' : 'HIDE_REVIEW',
      dto.visible ? 'Hiển thị lại đánh giá.' : `Ẩn đánh giá vi phạm: ${dto.reason}`,
      (current) => {
        if ((current.trangthai === 'HienThi') === dto.visible)
          throw new BadRequestException(dto.visible ? 'Đánh giá đang hiển thị.' : 'Đánh giá đã bị ẩn.');
        const stamp = `[${vnDate(new Date())}] ${dto.visible ? 'Hiển thị lại' : 'Ẩn vì vi phạm'}${dto.reason ? `: ${dto.reason}` : ''}`;
        return {
          trangthai: dto.visible ? 'HienThi' : 'DaAn',
          ghichunoibo: [current.ghichunoibo, stamp].filter(Boolean).join('\n'),
        };
      },
    );
  }

  private async update(
    id: string,
    identity: Identity,
    req: Request,
    action: string,
    details: string,
    change: (current: { trangthai: string; trangthaixuly: string | null; noidungphanhoi: string | null; ghichunoibo: string | null }) => Prisma.danh_giaUncheckedUpdateInput,
  ) {
    await this.prisma.$transaction(async (tx) => {
      const current = await tx.danh_gia.findUnique({
        where: { madanhgia: id },
        select: { trangthai: true, trangthaixuly: true, noidungphanhoi: true, ghichunoibo: true, mucdokhancap: true },
      });
      if (!current) throw new NotFoundException('Không tìm thấy đánh giá.');
      const data = change(current);
      await tx.danh_gia.update({ where: { madanhgia: id }, data: { ...data, thoigiancapnhat: new Date() } });
      await this.access.audit(tx, identity, req, action, 'danh_gia', id, details,
        { trangthai: current.trangthai, trangthaixuly: current.trangthaixuly, coPhanHoi: !!current.noidungphanhoi },
        JSON.parse(JSON.stringify(data)) as Prisma.InputJsonObject);
    });
    return this.detail(id);
  }

  private baseFilters(q: AdminReviewsQueryDto): Prisma.danh_giaWhereInput[] {
    const and: Prisma.danh_giaWhereInput[] = [];
    if (q.routeId) and.push({ ve_xe: { don_hang: { lich_trinh: { matuyenduong: q.routeId } } } });
    if (q.date) {
      const start = startOfVnDay(q.date);
      and.push({ thoigiandanhgia: { gte: start, lt: new Date(start.getTime() + DAY_MS) } });
    }
    if (q.processing === 'pending') and.push({ OR: [{ trangthaixuly: null }, { trangthaixuly: { in: ['moi', 'dang-xu-ly'] } }] });
    else if (q.processing === 'done') and.push({ trangthaixuly: { in: ['da-xong', 'dong'] } });
    else if (q.processing === 'moi') and.push({ OR: [{ trangthaixuly: null }, { trangthaixuly: 'moi' }] });
    else if (q.processing) and.push({ trangthaixuly: q.processing });
    if (q.stars?.length) and.push({ diemtongquat: { in: q.stars } });
    if (q.queue === 'needs_reply') and.push({ noidungphanhoi: null });
    if (q.queue === 'low_rating') and.push({ diemtongquat: { lte: 3 } });
    if (q.visibility) and.push({ trangthai: q.visibility === 'visible' ? 'HienThi' : 'DaAn' });
    if (q.causeTag) and.push({ tagnguyennhan: q.causeTag === 'none' ? null : q.causeTag });
    if (q.search) {
      const s = { contains: q.search, mode: 'insensitive' as const };
      and.push({
        OR: [
          { madanhgia: s },
          { mave: s },
          { noidung: s },
          { khach_hang: { hotenkhachhang: s } },
          { ve_xe: { hotenhanhkhach: s } },
          { ve_xe: { don_hang: { sodienthoainguoidat: s } } },
          { ve_xe: { don_hang: { malichtrinh: s } } },
          { ve_xe: { don_hang: { lich_trinh: { tuyen_xe: { tentuyen: s } } } } },
        ],
      });
    }
    return and;
  }

  private async sameTripCounts(scheduleIds: string[]) {
    const unique = [...new Set(scheduleIds)];
    if (!unique.length) return new Map<string, number>();
    const rows = await this.prisma.danh_gia.findMany({
      where: { ve_xe: { don_hang: { malichtrinh: { in: unique } } } },
      select: { ve_xe: { select: { don_hang: { select: { malichtrinh: true } } } } },
    });
    const counts = new Map<string, number>();
    for (const r of rows) {
      const id = r.ve_xe.don_hang.malichtrinh;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }

  private toItem(row: ReviewRow, sameTrip: Map<string, number>) {
    const order = row.ve_xe.don_hang;
    const trip = order.lich_trinh;
    const late = isLateTrip(trip.thoigiandendukien, trip.thoigiandenthucte);
    const processingStatus = (row.trangthaixuly ?? (row.noidungphanhoi ? 'da-xong' : 'moi')) as ProcessingStatus;
    return {
      id: row.madanhgia,
      ticketId: row.mave,
      customerId: row.makhachhang,
      customerName: row.khach_hang?.hotenkhachhang ?? row.ve_xe.hotenhanhkhach,
      phone: row.khach_hang?.sodienthoai ?? order.sodienthoainguoidat,
      rating: row.diemtongquat,
      title: row.tieude,
      content: row.noidung ?? '',
      createdAt: row.thoigiandanhgia.toISOString(),
      criteria: Object.fromEntries(REVIEW_CRITERIA.map((c) => [c.key, row[c.column]])),
      media: row.tep_danh_gia.map((f) => ({ id: f.matepdanhgia, url: f.duongdantep, type: f.loaitep, visible: f.trangthai === 'HienThi' })),
      visible: row.trangthai === 'HienThi',
      reply: row.noidungphanhoi
        ? { content: row.noidungphanhoi, createdAt: row.thoigianphanhoi?.toISOString() ?? null, staffName: row.nhan_vien?.hoten ?? null }
        : null,
      processingStatus,
      urgency: row.mucdokhancap ?? autoUrgency(row.diemtongquat, late, row.noidung),
      urgencyIsManual: !!row.mucdokhancap,
      internalNote: row.ghichunoibo,
      causeTag: row.tagnguyennhan as CauseTag | null,
      causeTagLabel: row.tagnguyennhan ? (CAUSE_TAG_LABELS[row.tagnguyennhan as CauseTag] ?? row.tagnguyennhan) : null,
      slaDeadline: new Date(row.thoigiandanhgia.getTime() + SLA_HOURS * HOUR_MS).toISOString(),
      trip: {
        scheduleId: trip.malichtrinh,
        orderId: order.madonhang,
        routeId: trip.tuyen_xe.matuyenduong,
        route: trip.tuyen_xe.tentuyen,
        departureDate: vnDate(trip.thoigiankhoihanh),
        departureTime: vnTime(trip.thoigiankhoihanh),
        plateNumber: trip.xe.biensoxe,
        vehicleType: VEHICLE_TYPE_LABELS[trip.xe.loaixe],
        driverId: trip.tai_xe_phu_xe_lich_trinh_mataixechinhTotai_xe_phu_xe.manhansu,
        driverName: trip.tai_xe_phu_xe_lich_trinh_mataixechinhTotai_xe_phu_xe.hoten,
        seat: row.ve_xe.ghe_chuyen.ghe.soghe,
        late,
        delayMinutes: trip.thoigiandenthucte
          ? Math.max(0, Math.round((trip.thoigiandenthucte.getTime() - trip.thoigiandendukien.getTime()) / 60000))
          : null,
      },
      sameTripReviewCount: sameTrip.get(trip.malichtrinh) ?? 1,
    };
  }
}
