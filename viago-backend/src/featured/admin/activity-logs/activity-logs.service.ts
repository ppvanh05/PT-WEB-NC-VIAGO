import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { calendarDate } from '../../../shared/accounts/account-security';
import { LogQueryDto } from '../../../shared/accounts/accounts.dto';
const logInclude = {
  tai_khoan: {
    select: {
      tendangnhap: true,
      sodienthoai: true,
      vaitrotaikhoan: true,
      khach_hang: { select: { hotenkhachhang: true } },
    },
  },
  nhan_vien: {
    select: { hoten: true, vai_tro: { select: { tenvaitro: true } } },
  },
} satisfies Prisma.nhat_ky_he_thongInclude;
type Log = Prisma.nhat_ky_he_thongGetPayload<{ include: typeof logInclude }>;
function redact(value: Prisma.JsonValue): Prisma.JsonValue {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        /password|matkhau|token|secret|maxacthuc|otp|authorization/i.test(key)
          ? '[REDACTED]'
          : redact(item ?? null),
      ]),
    );
  return value;
}
function view(log: Log) {
  const before = redact(log.dulieutruoc),
    after = redact(log.dulieusau);
  const previous =
    before && typeof before === 'object' && !Array.isArray(before)
      ? before
      : {};
  const next =
    after && typeof after === 'object' && !Array.isArray(after) ? after : {};
  const changes = [...new Set([...Object.keys(previous), ...Object.keys(next)])]
    .filter(
      (key) => JSON.stringify(previous[key]) !== JSON.stringify(next[key]),
    )
    .map((field) => ({
      field,
      before: JSON.stringify(previous[field] ?? ''),
      after: JSON.stringify(next[field] ?? ''),
    }));
  return {
    id: log.manhatky,
    timestamp: log.thoigian,
    actor: {
      code: log.manhanvien || log.mataikhoan || '',
      name:
        log.nhan_vien?.hoten || log.tai_khoan?.khach_hang?.hotenkhachhang || '',
      username: log.tai_khoan?.tendangnhap || '',
      phone: log.tai_khoan?.sodienthoai || '',
      role:
        log.nhan_vien?.vai_tro.tenvaitro || log.tai_khoan?.vaitrotaikhoan || '',
    },
    action: log.hanhdong,
    status: log.trangthai,
    details: log.chitiet,
    ip: log.diachiip,
    userAgent: log.trinhduyet,
    target: {
      code: log.madoituong,
      name: log.tendoituong || '',
      type: log.loaidoituong || log.banglienquan,
    },
    before,
    after,
    changes,
  };
}
@Injectable()
export class ActivityLogsService {
  constructor(private readonly prisma: PrismaService) {}
  async statistics() {
    const day = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Asia/Ho_Chi_Minh',
    }).format(new Date());
    const start = new Date(calendarDate(day).getTime() - 7 * 3600000),
      end = new Date(start.getTime() + 86400000);
    const [total, success, failed, created] = await this.prisma.$transaction([
      this.prisma.nhat_ky_he_thong.count({
        where: { thoigian: { gte: start, lt: end } },
      }),
      this.prisma.nhat_ky_he_thong.count({
        where: { thoigian: { gte: start, lt: end }, trangthai: 'ThanhCong' },
      }),
      this.prisma.nhat_ky_he_thong.count({
        where: { thoigian: { gte: start, lt: end }, trangthai: 'ThatBai' },
      }),
      this.prisma.nhat_ky_he_thong.count({
        where: {
          thoigian: { gte: start, lt: end },
          trangthai: 'ThanhCong',
          hanhdong: { in: ['REGISTER', 'CREATE_CUSTOMER', 'CREATE_STAFF'] },
        },
      }),
    ]);
    return { date: day, total, success, failed, created };
  }
  async list(
    q: LogQueryDto,
    targetId?: string,
    targetAccountId?: string | null,
  ) {
    const start = q.startDate
        ? new Date(calendarDate(q.startDate).getTime() - 7 * 3600000)
        : undefined,
      end = q.endDate
        ? new Date(calendarDate(q.endDate).getTime() + 17 * 3600000)
        : undefined;
    if (start && end && start >= end)
      throw new BadRequestException('Khoảng ngày không hợp lệ.');
    const where: Prisma.nhat_ky_he_thongWhereInput = {
      mataikhoan: q.accountId,
      madoituong: targetId,
      hanhdong: q.action,
      trangthai: q.result,
      ...(q.roleId ? { nhan_vien: { mavaitro: q.roleId } } : {}),
      thoigian: { gte: start, lt: end },
      ...(q.search
        ? {
            OR: [
              'manhatky',
              'hanhdong',
              'madoituong',
              'tendoituong',
              'chitiet',
              'diachiip',
            ].map((field) => ({
              [field]: { contains: q.search, mode: 'insensitive' },
            })),
          }
        : {}),
    };
    if (targetId && targetAccountId) {
      delete where.madoituong;
      where.AND = [
        {
          OR: [
            { madoituong: targetId },
            { madoituong: targetAccountId },
            { mataikhoan: targetAccountId },
          ],
        },
      ];
    }
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.nhat_ky_he_thong.findMany({
        where,
        include: logInclude,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: [{ thoigian: 'desc' }, { manhatky: 'desc' }],
      }),
      this.prisma.nhat_ky_he_thong.count({ where }),
    ]);
    return { items: rows.map(view), total, page: q.page, pageSize: q.pageSize };
  }
  async detail(id: string) {
    const row = await this.prisma.nhat_ky_he_thong.findUnique({
      where: { manhatky: id },
      include: logInclude,
    });
    if (!row) throw new NotFoundException('Không tìm thấy nhật ký.');
    return view(row);
  }
}
