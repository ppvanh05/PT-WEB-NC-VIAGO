import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AccountsAccess,
  Identity,
} from '../../../shared/accounts/accounts-access';
import {
  calendarDate,
  hashPassword,
  verifyPassword,
} from '../../../shared/accounts/account-security';
import {
  PageDto,
  PasswordDto,
  ProfileDto,
  TwoFactorDto,
  ReviewDto,
} from '../../../shared/accounts/accounts.dto';
import { TicketQueryDto } from '../../../shared/accounts/accounts.dto';
import { Prisma } from '@prisma/client';
import { writeTicketReview } from '../reviews/review-writer';
import { CustomerAuthService } from '../auth/customer-auth.service';
import { ReviewMediaService } from './review-media.service';
import type { ReviewUpload } from './review-media.service';
@Injectable()
export class CustomerProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccountsAccess,
    private readonly auth: CustomerAuthService,
    private readonly media: ReviewMediaService = new ReviewMediaService(prisma),
  ) {}
  /** Đánh giá vé đã hoàn thành của chính tài khoản (logic ghi dùng chung với trang Tra cứu vé). */
  async review(
    identity: Identity,
    ticketId: string,
    dto: ReviewDto,
    req: Request,
    files: ReviewUpload[] = [],
  ) {
    return writeTicketReview(this.prisma, this.access, this.media, {
      where: { mave: ticketId, don_hang: { makhachhang: identity.customerId! } },
      identity,
      dto,
      req,
      files,
    });
  }
  async current(identity: Identity) {
    const customer = await this.prisma.khach_hang.findUniqueOrThrow({
      where: { makhachhang: identity.customerId! },
      include: {
        bang_hang_thanh_vien: true,
        tai_khoan: { select: { xacthuchailop: true } },
      },
    });
    const [spent, tickets, tiers] = await Promise.all([
      this.prisma.don_hang.aggregate({
        where: {
          makhachhang: customer.makhachhang,
          trangthaidonhang: 'DaThanhToan',
        },
        _sum: { tongthanhtoan: true },
      }),
      this.prisma.ve_xe.count({
        where: {
          don_hang: { makhachhang: customer.makhachhang },
          trangthaive: { not: 'DaHuy' },
        },
      }),
      this.prisma.bang_hang_thanh_vien.findMany({
        where: { trangthai: 'HoatDong' },
        orderBy: [
          { dieukienchitieutoithieu: 'asc' },
          { dieukiensovetoithieu: 'asc' },
          { mahang: 'asc' },
        ],
        include: {
          dac_quyen_hang_thanh_vien: {
            where: { trangthai: 'HoatDong' },
            orderBy: [{ thutuhienthi: 'asc' }, { madacquyen: 'asc' }],
          },
        },
      }),
    ]);
    return {
      id: customer.makhachhang,
      accountId: identity.accountId,
      name: customer.hotenkhachhang,
      phoneNumber: customer.sodienthoai,
      email: customer.email,
      gender: customer.gioitinh,
      birthday: customer.ngaysinh?.toISOString().slice(0, 10) || '',
      occupation: customer.nghenghiep || '',
      avatar: customer.anhdaidien || '',
      rank: customer.bang_hang_thanh_vien?.tenhang || '',
      points: customer.diemtichluy,
      membershipTiers: tiers.map((tier) => ({
        id: tier.mahang,
        name: tier.tenhang,
        minTickets: tier.dieukiensovetoithieu,
        minSpent: Number(tier.dieukienchitieutoithieu),
        benefits: tier.dac_quyen_hang_thanh_vien.map((benefit) => ({
          title: benefit.tendacquyen,
          desc: benefit.motadacquyen,
        })),
      })),
      spent: Number(spent._sum.tongthanhtoan || 0),
      tickets,
      twoFA: customer.tai_khoan?.xacthuchailop || false,
      registeredAt: customer.ngaydangky,
      role: 'customer',
    };
  }
  async update(identity: Identity, dto: ProfileDto, req: Request) {
    const birthday = dto.birthday ? calendarDate(dto.birthday) : undefined;
    if (birthday && birthday > new Date())
      throw new BadRequestException('Ngày sinh phải ở quá khứ.');
    await this.prisma.$transaction(async (tx) => {
      await tx.khach_hang.update({
        where: { makhachhang: identity.customerId! },
        data: {
          hotenkhachhang: dto.name,
          email:
            dto.email === undefined
              ? undefined
              : dto.email.toLowerCase() || null,
          gioitinh: dto.gender,
          ngaysinh: dto.birthday === '' ? null : birthday,
          nghenghiep: dto.occupation,
          anhdaidien: dto.avatar,
          thoigiancapnhat: new Date(),
        },
      });
      if (dto.email !== undefined)
        await tx.tai_khoan.update({
          where: { mataikhoan: identity.accountId },
          data: {
            email: dto.email.toLowerCase() || null,
            thoigiancapnhat: new Date(),
          },
        });
      await this.access.audit(
        tx,
        identity,
        req,
        'UPDATE_PROFILE',
        'khach_hang',
        identity.customerId!,
        'Cập nhật hồ sơ cá nhân.',
      );
    });
    return this.current(identity);
  }
  async password(identity: Identity, dto: PasswordDto, req: Request) {
    const password = await hashPassword(dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT mataikhoan FROM tai_khoan WHERE mataikhoan = ${identity.accountId} FOR UPDATE`;
      const account = await tx.tai_khoan.findUniqueOrThrow({
        where: { mataikhoan: identity.accountId },
      });
      if (!(await verifyPassword(dto.currentPassword, account.matkhauhash)))
        throw new UnauthorizedException('Mật khẩu hiện tại không đúng.');
      await tx.tai_khoan.update({
        where: { mataikhoan: identity.accountId },
        data: { matkhauhash: password, thoigiancapnhat: new Date() },
      });
      await tx.phien_dang_nhap.updateMany({
        where: { mataikhoan: identity.accountId },
        data: { trangthai: 'DaDangXuat' },
      });
      await this.access.audit(
        tx,
        identity,
        req,
        'PASSWORD_RESET',
        'tai_khoan',
        identity.accountId,
        'Đổi mật khẩu, thu hồi tất cả phiên.',
      );
    });
    return { success: true, requiresLogin: true };
  }
  async sessions(identity: Identity) {
    const rows = await this.prisma.phien_dang_nhap.findMany({
      where: {
        mataikhoan: identity.accountId,
        trangthai: 'DangHoatDong',
        thoigianhethan: { gt: new Date() },
      },
      orderBy: { thoigianhoatdongcuoi: 'desc' },
      select: {
        maphien: true,
        tenthietbi: true,
        trinhduyet: true,
        diachiip: true,
        thoigiandangnhap: true,
        thoigianhoatdongcuoi: true,
        thoigianhethan: true,
      },
    });
    return rows.map((row) => ({
      id: row.maphien,
      name: row.tenthietbi,
      userAgent: row.trinhduyet,
      ip: row.diachiip,
      loginAt: row.thoigiandangnhap,
      lastActiveAt: row.thoigianhoatdongcuoi,
      expiresAt: row.thoigianhethan,
      isCurrent: row.maphien === identity.sessionId,
    }));
  }
  async revoke(identity: Identity, id: string | undefined, req: Request) {
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.phien_dang_nhap.updateMany({
        where: {
          mataikhoan: identity.accountId,
          ...(id ? { maphien: id } : {}),
          trangthai: 'DangHoatDong',
        },
        data: { trangthai: 'DaDangXuat' },
      });
      if (id && !changed.count)
        throw new NotFoundException('Không tìm thấy phiên của bạn.');
      await this.access.audit(
        tx,
        identity,
        req,
        'REVOKE_SESSION',
        'phien_dang_nhap',
        id || identity.accountId,
        id ? 'Thu hồi phiên đăng nhập.' : 'Đăng xuất tất cả thiết bị.',
      );
    });
    return { success: true };
  }
  async lock(identity: Identity, password: string, req: Request) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT mataikhoan FROM tai_khoan WHERE mataikhoan = ${identity.accountId} FOR UPDATE`;
      const account = await tx.tai_khoan.findUniqueOrThrow({
        where: { mataikhoan: identity.accountId },
      });
      if (!(await verifyPassword(password, account.matkhauhash)))
        throw new UnauthorizedException('Mật khẩu không đúng.');
      const now = new Date();
      await tx.tai_khoan.update({
        where: { mataikhoan: identity.accountId },
        data: { trangthai: 'DaKhoa', thoigiancapnhat: now },
      });
      await tx.khach_hang.update({
        where: { makhachhang: identity.customerId! },
        data: {
          trangthai: 'DaKhoa',
          ngaykhoa: now,
          lydokhoa: 'Khách hàng tự khóa tài khoản',
          thoigiancapnhat: now,
        },
      });
      await tx.phien_dang_nhap.updateMany({
        where: { mataikhoan: identity.accountId },
        data: { trangthai: 'DaDangXuat' },
      });
      await this.access.audit(
        tx,
        identity,
        req,
        'LOCK_CUSTOMER',
        'khach_hang',
        identity.customerId!,
        'Khách hàng tự khóa tài khoản.',
      );
    });
    return { success: true };
  }
  async twoFactor(identity: Identity, dto: TwoFactorDto, req: Request) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT mataikhoan FROM tai_khoan WHERE mataikhoan = ${identity.accountId} FOR UPDATE`;
      const account = await tx.tai_khoan.findUniqueOrThrow({
        where: { mataikhoan: identity.accountId },
      });
      if (!(await verifyPassword(dto.password, account.matkhauhash)))
        throw new UnauthorizedException('Mật khẩu không đúng.');
      await this.auth.consumeProof(
        tx,
        dto.verificationToken,
        account.sodienthoai,
        'XacThucHaiLop',
        identity.accountId,
      );
      await tx.tai_khoan.update({
        where: { mataikhoan: identity.accountId },
        data: { xacthuchailop: dto.enabled, thoigiancapnhat: new Date() },
      });
      await this.access.audit(
        tx,
        identity,
        req,
        'UPDATE_2FA',
        'tai_khoan',
        identity.accountId,
        dto.enabled ? 'Bật xác thực SMS hai lớp.' : 'Tắt xác thực hai lớp.',
      );
    });
    return { success: true };
  }
  async tickets(customerId: string, query: TicketQueryDto) {
    const where: Prisma.ve_xeWhereInput = {
      don_hang: { makhachhang: customerId },
      ...(query.search
        ? {
            OR: [
              {
                mave: { contains: query.search, mode: 'insensitive' as const },
              },
              {
                madonhang: {
                  contains: query.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    };
    const pending: Prisma.don_hangWhereInput = {
      trangthaidonhang: { in: ['ChoThanhToanOnline', 'ChoThanhToanTrucTiep'] },
    };
    const cancelled: Prisma.ve_xeWhereInput = {
      OR: [
        { trangthaive: 'DaHuy' },
        {
          don_hang: { trangthaidonhang: { in: ['DaHuy', 'HetHanThanhToan'] } },
        },
      ],
    };
    const states: Record<string, Prisma.ve_xeWhereInput> = {
      cancelled,
      pending: { trangthaive: { not: 'DaHuy' }, don_hang: pending },
      upcoming: {
        trangthaive: 'ChoKhoiHanh',
        don_hang: { trangthaidonhang: { in: ['DaThanhToan', 'HuyMotPhan'] } },
      },
      completed: { trangthaive: 'DaHoanThanh', danh_gia: null },
      reviewed: { trangthaive: { not: 'DaHuy' }, danh_gia: { isNot: null } },
    };
    if (query.ticketStatus) where.AND = [states[query.ticketStatus]];
    if (query.routeId || query.date)
      where.ghe_chuyen = {
        lich_trinh: {
          matuyenduong: query.routeId,
          ...(query.date ? { ngaykhoihanh: calendarDate(query.date) } : {}),
        },
      };
    const orderBy: Prisma.ve_xeOrderByWithRelationInput[] =
      query.sort === 'priceAsc'
        ? [{ giave: 'asc' }, { mave: 'asc' }]
        : query.sort === 'priceDesc'
          ? [{ giave: 'desc' }, { mave: 'desc' }]
          : [
              { thoigiantao: query.sort === 'oldest' ? 'asc' : 'desc' },
              { mave: 'desc' },
            ];
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.ve_xe.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy,
        select: {
          mave: true,
          madonhang: true,
          giave: true,
          trangthaive: true,
          thoigiantao: true,
          danh_gia: { select: { madanhgia: true } },
          ghe_chuyen: {
            select: {
              ghe: { select: { soghe: true } },
              lich_trinh: {
                select: {
                  thoigiankhoihanh: true,
                  thoigiandendukien: true,
                  xe: { select: { loaixe: true } },
                  tuyen_xe: {
                    select: { tentuyen: true, diemdi: true, diemden: true },
                  },
                },
              },
            },
          },
          don_hang: { select: { trangthaidonhang: true } },
        },
      }),
      this.prisma.ve_xe.count({ where }),
    ]);
    const date = (d: Date) =>
      new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' }).format(
        d,
      );
    const clock = (d: Date) =>
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    return {
      items: rows.map((t) => {
        const trip = t.ghe_chuyen.lich_trinh,
          day = date(trip.thoigiankhoihanh),
          minutes = Math.max(
            0,
            Math.round(
              (trip.thoigiandendukien.getTime() -
                trip.thoigiankhoihanh.getTime()) /
                60000,
            ),
          );
        return {
          id: t.mave,
          orderId: t.madonhang,
          status:
            t.trangthaive === 'DaHuy' ||
            ['DaHuy', 'HetHanThanhToan'].includes(t.don_hang.trangthaidonhang)
              ? 'ĐÃ HỦY'
              : ['ChoThanhToanOnline', 'ChoThanhToanTrucTiep'].includes(
                    t.don_hang.trangthaidonhang,
                  )
                ? 'CHỜ THANH TOÁN'
                : t.danh_gia
                  ? 'ĐÃ ĐÁNH GIÁ'
                  : t.trangthaive === 'DaHoanThanh'
                    ? 'ĐÃ HOÀN THÀNH'
                    : 'CHỜ KHỞI HÀNH',
          date: day,
          dateLabel: day.split('-').reverse().join('/'),
          bookedAt: date(t.thoigiantao).split('-').reverse().join('/'),
          departureAt: trip.thoigiankhoihanh,
          arrivalAt: trip.thoigiandendukien,
          depTime: clock(trip.thoigiankhoihanh),
          arrTime: clock(trip.thoigiandendukien),
          depLoc: trip.tuyen_xe.diemdi,
          arrLoc: trip.tuyen_xe.diemden,
          duration: `${Math.floor(minutes / 60)}h ${minutes % 60}m`,
          type: trip.xe.loaixe,
          route: trip.tuyen_xe.tentuyen,
          seat: t.ghe_chuyen.ghe.soghe,
          price: Number(t.giave),
          priceLabel: Number(t.giave).toLocaleString('vi-VN') + ' đ',
        };
      }),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
  async vouchers(customerId: string, query: PageDto) {
    const where = { makhachhang: customerId };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.voucher_khach_hang.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: { thoigiancap: 'desc' },
        include: {
          khuyen_mai: {
            select: {
              magiamgia: true,
              tenkhuyenmai: true,
              mota: true,
              loaikhuyenmai: true,
              giatrigiam: true,
            },
          },
        },
      }),
      this.prisma.voucher_khach_hang.count({ where }),
    ]);
    return {
      items: rows.map((v) => ({
        id: v.mavoucherkhachhang,
        code: v.khuyen_mai.magiamgia,
        title: v.khuyen_mai.tenkhuyenmai,
        description: v.khuyen_mai.mota,
        type: v.khuyen_mai.loaikhuyenmai,
        value: Number(v.khuyen_mai.giatrigiam),
        status: v.trangthai,
        startsAt: v.thoigianbatdau,
        expiresAt: v.thoigianhethan,
      })),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
}
