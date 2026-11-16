import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../../../prisma/prisma.service';
import { AccountsAccess, Identity } from '../../../../shared/accounts/accounts-access';
import { paginate } from '../../../../shared/http/pagination';
import { round1 } from '../../../../shared/review-scoring';
import { DAY_MS, HOUR_MS, vnDate, vnDayRange } from '../../../../shared/vn-time';
import { DriverReportQueryDto } from '../reports.dto';
import { groupTotals } from '../report-common';

/** Bằng lái còn dưới số ngày này được xem là sắp hết hạn và được nhắc đổi. */
const EXPIRING_DAYS = 30;
const ROLE_LABELS = { TaiXe: 'Tài xế', PhuXe: 'Phụ xe' } as const;
const STATUS_LABELS = { DangHoatDong: 'Đang hoạt động', NghiPhep: 'Nghỉ phép', DaKhoa: 'Đã khóa' } as const;
const LICENSE_STATE_LABELS = { valid: 'Còn hạn', expiring: 'Sắp hết hạn', expired: 'Đã hết hạn', none: 'Không yêu cầu bằng lái' } as const;

@Injectable()
export class DriverAssistantReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccountsAccess,
  ) {}

  /** Danh sách tài xế/phụ xe, tình trạng bằng lái, số chuyến trong kỳ và số liệu cho 4 biểu đồ. */
  async report(q: DriverReportQueryDto) {
    const range = vnDayRange(q.from, q.to);
    const tripWhere = { trangthai: { not: 'DaHuy' as const }, ...(range ? { thoigiankhoihanh: range } : {}) };
    const people = await this.prisma.tai_xe_phu_xe.findMany({
      include: {
        lich_trinh_lich_trinh_mataixechinhTotai_xe_phu_xe: {
          where: tripWhere,
          select: { trangthai: true, don_hang: { select: { ve_xe: { select: { danh_gia: { select: { diemtongquat: true } } } } } } },
        },
        lich_trinh_lich_trinh_maphuxeTotai_xe_phu_xe: { where: tripWhere, select: { trangthai: true } },
      },
      orderBy: { manhansu: 'asc' },
    });
    const now = Date.now();
    let rows = people.map((p, index) => {
      const daysLeft = p.hangplx ? Math.floor((p.hangplx.getTime() - now) / DAY_MS) : null;
      const licenseState: keyof typeof LICENSE_STATE_LABELS = !p.hanggplx || !p.hangplx ? 'none' : daysLeft! < 0 ? 'expired' : daysLeft! <= EXPIRING_DAYS ? 'expiring' : 'valid';
      const asDriver = p.lich_trinh_lich_trinh_mataixechinhTotai_xe_phu_xe;
      const asAssistant = p.lich_trinh_lich_trinh_maphuxeTotai_xe_phu_xe;
      const ratings = asDriver.flatMap((t) => t.don_hang.flatMap((o) => o.ve_xe.flatMap((v) => (v.danh_gia ? [v.danh_gia.diemtongquat] : []))));
      return {
        no: index + 1,
        id: p.manhansu,
        name: p.hoten,
        birthDate: vnDate(p.ngaysinh),
        phone: p.sodienthoai,
        nationalId: p.cccd,
        role: p.vaitro,
        roleLabel: ROLE_LABELS[p.vaitro],
        licenseClass: p.hanggplx,
        licenseClassLabel: p.hanggplx ? `Hạng ${p.hanggplx}` : 'Không yêu cầu bằng lái',
        licenseExpiry: p.hangplx ? vnDate(p.hangplx) : null,
        licenseDaysLeft: daysLeft,
        licenseState,
        licenseStateLabel: LICENSE_STATE_LABELS[licenseState],
        canSendReminder: p.vaitro === 'TaiXe' && (licenseState === 'expiring' || licenseState === 'expired'),
        status: p.trangthai,
        statusLabel: STATUS_LABELS[p.trangthai],
        reminderCount: p.solannhachangplx,
        lastReminderAt: p.lannhachangannhat?.toISOString() ?? null,
        trips: asDriver.length + asAssistant.length,
        completedTrips: [...asDriver, ...asAssistant].filter((t) => t.trangthai === 'HoanThanh').length,
        averageRating: ratings.length ? round1(ratings.reduce((a, b) => a + b, 0) / ratings.length) : null,
        lowRatings: ratings.filter((r) => r <= 2).length,
      };
    });
    const all = rows;
    const s = q.search?.toLowerCase();
    rows = rows.filter(
      (r) =>
        (!q.role || r.role === q.role) &&
        (!q.status || r.status === q.status) &&
        (!q.licenseClass || (q.licenseClass === 'none' ? !r.licenseClass : r.licenseClass === q.licenseClass)) &&
        (!q.licenseState || r.licenseState === q.licenseState) &&
        (!s || [r.id, r.name, r.phone, r.nationalId].some((v) => v.toLowerCase().includes(s))),
    );
    const drivers = all.filter((r) => r.role === 'TaiXe');
    const forecast = [
      { label: 'Đã hết hạn', test: (d: number) => d < 0 },
      { label: `Trong ${EXPIRING_DAYS} ngày`, test: (d: number) => d >= 0 && d <= EXPIRING_DAYS },
      { label: '31 – 90 ngày', test: (d: number) => d > 30 && d <= 90 },
      { label: '91 – 180 ngày', test: (d: number) => d > 90 && d <= 180 },
      { label: 'Trên 180 ngày', test: (d: number) => d > 180 },
    ];
    return {
      summary: {
        total: all.length,
        drivers: drivers.length,
        assistants: all.length - drivers.length,
        active: all.filter((r) => r.status === 'DangHoatDong').length,
        expiringLicenses: drivers.filter((r) => r.licenseState === 'expiring').length,
        expiredLicenses: drivers.filter((r) => r.licenseState === 'expired').length,
      },
      charts: {
        byRole: groupTotals(all, (r) => r.roleLabel).map((g) => ({ label: g.key, count: g.value })),
        byStatus: groupTotals(all, (r) => r.statusLabel).map((g) => ({ label: g.key, count: g.value })),
        byLicenseClass: groupTotals(all, (r) => r.licenseClassLabel).map((g) => ({ label: g.key, count: g.value })),
        licenseForecast: forecast.map((f) => ({ label: f.label, count: drivers.filter((r) => r.licenseDaysLeft != null && f.test(r.licenseDaysLeft)).length })),
      },
      ...paginate(rows, q.page, q.pageSize),
    };
  }

  /**
   * Ghi nhận lần nhắc đổi bằng lái cho tài xế sắp/đã hết hạn.
   * Hệ thống chưa có cổng gửi SMS tự do, nên chỉ ghi nhận lượt nhắc; tối đa 1 lần mỗi 24 giờ.
   */
  async remind(id: string, identity: Identity, req: Request) {
    const result = await this.prisma.$transaction(async (tx) => {
      const p = await tx.tai_xe_phu_xe.findUnique({ where: { manhansu: id } });
      if (!p) throw new NotFoundException('Không tìm thấy nhân sự.');
      if (p.vaitro !== 'TaiXe' || !p.hangplx) throw new BadRequestException('Chỉ nhắc đổi bằng cho tài xế có bằng lái.');
      const daysLeft = Math.floor((p.hangplx.getTime() - Date.now()) / DAY_MS);
      if (daysLeft > EXPIRING_DAYS) throw new BadRequestException(`Bằng lái còn ${daysLeft} ngày, chưa cần nhắc.`);
      if (p.lannhachangannhat && Date.now() - p.lannhachangannhat.getTime() < 24 * HOUR_MS)
        throw new BadRequestException('Đã nhắc tài xế này trong 24 giờ qua.');
      const now = new Date();
      const updated = await tx.tai_xe_phu_xe.update({
        where: { manhansu: id },
        data: { solannhachangplx: { increment: 1 }, lannhachangannhat: now, thoigiancapnhat: now },
      });
      await this.access.audit(tx, identity, req, 'REMIND_LICENSE_RENEWAL', 'tai_xe_phu_xe', id,
        `Nhắc tài xế ${p.hoten} đổi bằng lái (hạn ${vnDate(p.hangplx)}).`);
      return { reminderCount: updated.solannhachangplx, lastReminderAt: now.toISOString(), daysLeft };
    });
    return {
      id,
      ...result,
      smsDelivered: false,
      message: `Đã ghi nhận lần nhắc thứ ${result.reminderCount}. Chưa cấu hình cổng SMS nên tin nhắn chưa được gửi tự động.`,
    };
  }
}
