import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { paginate } from '../../../../shared/http/pagination';
import { normalizePhone } from '../../../../shared/phone';
import { money } from '../../../../shared/rental-pricing';
import { vnDayRange } from '../../../../shared/vn-time';
import { CustomerReportQueryDto } from '../reports.dto';
import { PAID_ORDER_STATUSES, groupTotals, sumBy } from '../report-common';

type CustomerRow = {
  id: string;
  type: 'member' | 'guest';
  typeLabel: string;
  name: string;
  phone: string;
  email: string | null;
  registeredAt: string | null;
  tierId: string | null;
  tier: string;
  points: number;
  totalSpent: number;
  orders: number;
  tickets: number;
  lastOrderAt: string | null;
  status: 'HoatDong' | 'DaKhoa';
  statusLabel: string;
};

@Injectable()
export class CustomerReportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Thống kê khách hàng: hội viên (có tài khoản) và khách vãng lai (đặt vé không đăng nhập,
   * gom theo SĐT). Chi tiêu = tổng thanh toán của đơn đã thu tiền trong kỳ.
   */
  async report(q: CustomerReportQueryDto) {
    const range = vnDayRange(q.from, q.to);
    const orderWhere = { trangthaidonhang: { in: PAID_ORDER_STATUSES }, ...(range ? { thoigiandat: range } : {}) };
    const [customers, guestOrders, tiers] = await Promise.all([
      this.prisma.khach_hang.findMany({
        include: {
          bang_hang_thanh_vien: { select: { tenhang: true } },
          don_hang: { where: orderWhere, select: { tongthanhtoan: true, thoigiandat: true, ve_xe: { where: { trangthaive: { not: 'DaHuy' } }, select: { mave: true } } } },
        },
      }),
      this.prisma.don_hang.findMany({
        where: { ...orderWhere, makhachhang: null },
        select: { hotennguoidat: true, sodienthoainguoidat: true, emailnguoidat: true, tongthanhtoan: true, thoigiandat: true, ve_xe: { where: { trangthaive: { not: 'DaHuy' } }, select: { mave: true } } },
      }),
      this.prisma.bang_hang_thanh_vien.findMany({ select: { mahang: true, tenhang: true }, orderBy: { dieukienchitieutoithieu: 'asc' } }),
    ]);

    const members: CustomerRow[] = customers.map((c) => {
      const last = c.don_hang.reduce<Date | null>((m, o) => (!m || o.thoigiandat > m ? o.thoigiandat : m), null);
      const locked = c.trangthai !== 'HoatDong';
      return {
        id: c.makhachhang,
        type: c.mataikhoan ? 'member' : 'guest',
        typeLabel: c.mataikhoan ? 'Hội viên' : 'Khách vãng lai',
        name: c.hotenkhachhang,
        phone: normalizePhone(c.sodienthoai),
        email: c.email,
        registeredAt: c.ngaydangky.toISOString(),
        tierId: c.mahang,
        tier: c.bang_hang_thanh_vien?.tenhang ?? 'Không có',
        points: c.diemtichluy,
        totalSpent: sumBy(c.don_hang, (o) => money(o.tongthanhtoan)),
        orders: c.don_hang.length,
        tickets: sumBy(c.don_hang, (o) => o.ve_xe.length),
        lastOrderAt: last?.toISOString() ?? null,
        status: locked ? 'DaKhoa' : 'HoatDong',
        statusLabel: locked ? 'Đã khóa' : 'Đang hoạt động',
      };
    });
    const guestMap = new Map<string, CustomerRow>();
    for (const o of guestOrders) {
      const phone = normalizePhone(o.sodienthoainguoidat);
      const row = guestMap.get(phone) ?? {
        id: `GUEST-${phone}`,
        type: 'guest' as const,
        typeLabel: 'Khách vãng lai',
        name: o.hotennguoidat,
        phone,
        email: o.emailnguoidat,
        registeredAt: null,
        tierId: null,
        tier: 'Không có',
        points: 0,
        totalSpent: 0,
        orders: 0,
        tickets: 0,
        lastOrderAt: null,
        status: 'HoatDong' as const,
        statusLabel: 'Đang hoạt động',
      };
      row.totalSpent += money(o.tongthanhtoan);
      row.orders++;
      row.tickets += o.ve_xe.length;
      if (!row.lastOrderAt || o.thoigiandat.toISOString() > row.lastOrderAt) row.lastOrderAt = o.thoigiandat.toISOString();
      guestMap.set(phone, row);
    }

    let rows = [...members, ...guestMap.values()];
    const s = q.search?.toLowerCase();
    rows = rows.filter(
      (r) =>
        (!q.type || r.type === q.type) &&
        (!q.tierId || r.tierId === q.tierId) &&
        (!q.status || r.status === q.status) &&
        (!s || [r.id, r.name, r.phone, r.email ?? ''].some((v) => v.toLowerCase().includes(s))),
    );
    rows.sort((a, b) =>
      q.sort === 'tickets' ? b.tickets - a.tickets : q.sort === 'newest' ? (b.registeredAt ?? '').localeCompare(a.registeredAt ?? '') : b.totalSpent - a.totalSpent,
    );
    const newMembers = range
      ? members.filter((m) => m.type === 'member' && m.registeredAt && (!range.gte || new Date(m.registeredAt) >= range.gte) && (!range.lt || new Date(m.registeredAt) < range.lt)).length
      : null;
    const spenders = rows.filter((r) => r.orders > 0);
    return {
      summary: {
        customers: rows.length,
        members: rows.filter((r) => r.type === 'member').length,
        guests: rows.filter((r) => r.type === 'guest').length,
        lockedAccounts: rows.filter((r) => r.status === 'DaKhoa').length,
        newMembers,
        totalSpent: sumBy(rows, (r) => r.totalSpent),
        averageSpentPerBuyer: spenders.length ? Math.round(sumBy(spenders, (r) => r.totalSpent) / spenders.length) : 0,
        ticketsSold: sumBy(rows, (r) => r.tickets),
      },
      byTier: [...tiers.map((t) => ({ tierId: t.mahang, tier: t.tenhang })), { tierId: null, tier: 'Không có' }].map((t) => ({
        ...t,
        customers: rows.filter((r) => r.tierId === t.tierId).length,
        spent: sumBy(rows.filter((r) => r.tierId === t.tierId), (r) => r.totalSpent),
      })),
      byType: groupTotals(rows, (r) => r.typeLabel).map((g) => ({ type: g.key, customers: g.value })),
      topCustomers: [...rows].sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5).map((r) => ({ id: r.id, name: r.name, totalSpent: r.totalSpent, tickets: r.tickets })),
      ...paginate(rows, q.page, q.pageSize),
    };
  }
}
