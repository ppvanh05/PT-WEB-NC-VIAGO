import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../../../prisma/prisma.service';
import { HomePageDto, homeId, pageInfo, todayVN } from '../common/home.dto';

const effectivePromotion = () => ({
  trangthai: 'HoatDong' as const,
  phamvidichvu: { in: ['DatVe', 'TatCa'] as ('DatVe' | 'TatCa')[] },
  ngaybatdau: { lte: new Date() },
  ngayketthuc: { gte: new Date() },
});
const publicPromotion = () => ({
  ...effectivePromotion(),
  chidanhchokhachduoccap: false,
});
const promotionInclude = () =>
  ({
    _count: {
      select: {
        su_dung_khuyen_mai: {
          where: {
            trangthai: 'DangGiu' as const,
            thoigianhethangiu: { gt: new Date() },
          },
        },
      },
    },
    khuyen_mai_tuyen_duong: { select: { matuyenduong: true } },
    khuyen_mai_hang: {
      select: {
        mahang: true,
        bang_hang_thanh_vien: { select: { tenhang: true } },
      },
    },
  }) satisfies Prisma.khuyen_maiInclude;
type Promotion = Prisma.khuyen_maiGetPayload<{
  include: ReturnType<typeof promotionInclude>;
}>;
@Injectable()
export class HomePromotionsService {
  constructor(private readonly prisma: PrismaService) {}
  async customer(
    authorization: string | undefined,
    tx: Prisma.TransactionClient = this.prisma,
    required = false,
  ) {
    if (!authorization) {
      if (required) throw new UnauthorizedException('Vui lòng đăng nhập.');
      return null;
    }
    const match = /^Bearer ([A-Za-z0-9._~-]{32,512})$/.exec(authorization);
    if (!match)
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ.');
    const session = await tx.phien_dang_nhap.findFirst({
      where: {
        tokenphien: createHash('sha256').update(match[1]).digest('hex'),
        trangthai: 'DangHoatDong',
        thoigianhethan: { gt: new Date() },
        tai_khoan: { trangthai: 'HoatDong', vaitrotaikhoan: 'KhachHang' },
      },
      select: {
        tai_khoan: {
          select: {
            khach_hang: {
              select: {
                makhachhang: true,
                hotenkhachhang: true,
                sodienthoai: true,
                email: true,
                ngaysinh: true,
                mahang: true,
                trangthai: true,
              },
            },
          },
        },
      },
    });
    const customer = session?.tai_khoan.khach_hang;
    if (!customer || customer.trangthai !== 'HoatDong')
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ.');
    return customer;
  }
  async profile(authorization?: string) {
    const customer = await this.customer(authorization, this.prisma, true);
    return {
      id: customer!.makhachhang,
      name: customer!.hotenkhachhang,
      phone: customer!.sodienthoai,
      email: customer!.email,
    };
  }
  async list(query: HomePageDto) {
    return this.prisma.$transaction(
      async (tx) => {
        const where = {
            ...publicPromotion(),
            OR: [
              { soluongtoida: null },
              { soluongdadung: { lt: tx.khuyen_mai.fields.soluongtoida } },
            ],
          },
          total = await tx.khuyen_mai.count({ where });
        const rows = await tx.khuyen_mai.findMany({
          where,
          include: promotionInclude(),
          orderBy: [{ ngayketthuc: 'asc' }, { makhuyenmai: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return {
          data: rows.map((row) => this.response(row)),
          pagination: pageInfo(query, total),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async wallet(authorization?: string) {
    const customer = await this.customer(authorization, this.prisma, true);
    const rows = await this.prisma.voucher_khach_hang.findMany({
      where: {
        makhachhang: customer!.makhachhang,
        trangthai: 'SanSang',
        thoigianbatdau: { lte: new Date() },
        thoigianhethan: { gte: new Date() },
        khuyen_mai: {
          ...effectivePromotion(),
        },
      },
      select: {
        mavoucherkhachhang: true,
        thoigianhethan: true,
        khuyen_mai: { include: promotionInclude() },
      },
      orderBy: { thoigianhethan: 'asc' },
      take: 100,
    });
    return {
      data: rows.map((row) => ({
        ...this.response(row.khuyen_mai),
        walletId: row.mavoucherkhachhang,
        expiresAt: row.thoigianhethan.toISOString(),
      })),
    };
  }
  async claim(code: string, authorization?: string) {
    code = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{1,50}$/.test(code))
      throw new BadRequestException('Mã voucher không hợp lệ.');
    // Serializable prevents concurrent claims producing duplicate wallet entries.
    return this.prisma
      .$transaction(
        async (tx) => {
          const customer = await this.customer(authorization, tx, true);
          const p = await tx.khuyen_mai.findFirst({
            where: { ...publicPromotion(), magiamgia: code.toUpperCase() },
            include: promotionInclude(),
          });
          if (!p) throw new BadRequestException('Mã không khả dụng để lưu.');
          if (
            p.soluongtoida !== null &&
            p.soluongdadung + p._count.su_dung_khuyen_mai >= p.soluongtoida
          )
            throw new BadRequestException('Mã đã hết lượt sử dụng.');
          await this.validateCustomer(tx, p, customer, customer!.sodienthoai);
          const old = await tx.voucher_khach_hang.findFirst({
            where: {
              makhachhang: customer!.makhachhang,
              makhuyenmai: p.makhuyenmai,
              trangthai: { not: 'ThuHoi' },
            },
          });
          if (old) {
            if (old.trangthai !== 'SanSang' || old.thoigianhethan <= new Date())
              throw new BadRequestException(
                'Bạn đã nhận voucher này và voucher hiện không còn sẵn sàng để sử dụng.',
              );
            return { saved: true, alreadySaved: true, code: p.magiamgia };
          }
          const now = new Date();
          await tx.voucher_khach_hang.create({
            data: {
              mavoucherkhachhang: homeId('VC'),
              makhuyenmai: p.makhuyenmai,
              makhachhang: customer!.makhachhang,
              nguoncap: 'KhachTuLuu',
              thoigiancap: now,
              thoigianbatdau: p.ngaybatdau,
              thoigianhethan: p.ngayketthuc,
              trangthai: 'SanSang',
              thoigiancapnhat: now,
            },
          });
          return { saved: true, code: p.magiamgia };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      )
      .catch((error: unknown) => {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034'
        )
          throw new ConflictException(
            'Yêu cầu lưu voucher đang được xử lý. Vui lòng thử lại.',
          );
        throw error;
      });
  }
  async discount(
    tx: Prisma.TransactionClient,
    code: string | undefined,
    legs: { routeId: string; subtotal: number }[],
    phone: string,
    authorization?: string,
  ) {
    const customer = await this.customer(authorization, tx);
    if (!code?.trim())
      return { discount: 0, promotionId: null, walletId: null, customer };
    code = code.trim().toUpperCase();
    const now = new Date(),
      p = await tx.khuyen_mai.findFirst({
        where: {
          magiamgia: code,
          trangthai: 'HoatDong',
          phamvidichvu: { in: ['DatVe', 'TatCa'] },
          ngaybatdau: { lte: now },
          ngayketthuc: { gte: now },
        },
        include: promotionInclude(),
      });
    if (!p)
      throw new BadRequestException(
        'Mã giảm giá không hợp lệ hoặc đã hết hạn.',
      );
    const subtotal = legs.reduce((sum, leg) => sum + leg.subtotal, 0);
    if (subtotal < Number(p.donhangtoithieu))
      throw new BadRequestException(
        'Đơn chưa đạt giá trị tối thiểu của mã giảm giá.',
      );
    if (p.loaikhuyenmai === 'QuaTang')
      throw new BadRequestException('Mã quà tặng không giảm trực tiếp giá vé.');
    const routes = p.khuyen_mai_tuyen_duong.map((item) => item.matuyenduong);
    if (
      legs.some((leg) =>
        p.phamvituyen === 'ChiTuyenDuocChon'
          ? !routes.includes(leg.routeId)
          : p.phamvituyen === 'LoaiTruTuyenDuocChon' &&
            routes.includes(leg.routeId),
      )
    )
      throw new BadRequestException('Mã không áp dụng cho tuyến đã chọn.');
    await this.validateCustomer(tx, p, customer, phone);
    const reserved = await tx.su_dung_khuyen_mai.count({
      where: {
        makhuyenmai: p.makhuyenmai,
        trangthai: 'DangGiu',
        thoigianhethangiu: { gt: now },
      },
    });
    if (p.soluongtoida !== null && p.soluongdadung + reserved >= p.soluongtoida)
      throw new BadRequestException('Mã đã hết lượt sử dụng.');
    const wallet = customer
      ? await tx.voucher_khach_hang.findFirst({
          where: {
            makhachhang: customer.makhachhang,
            makhuyenmai: p.makhuyenmai,
            trangthai: 'SanSang',
            thoigianbatdau: { lte: now },
            thoigianhethan: { gte: now },
          },
        })
      : null;
    if (p.chidanhchokhachduoccap && !wallet)
      throw new UnauthorizedException(
        'Mã chỉ dành cho khách đã được cấp voucher.',
      );
    if (
      wallet &&
      (await tx.su_dung_khuyen_mai.count({
        where: {
          mavoucherkhachhang: wallet.mavoucherkhachhang,
          trangthai: 'DangGiu',
          thoigianhethangiu: { gt: now },
        },
      }))
    )
      throw new BadRequestException('Voucher đang được giữ cho đơn khác.');
    if (p.gioihanmoikhach !== null) {
      if (p.doituongtinhgioihan === 'KhachHang' && !customer)
        throw new UnauthorizedException('Đăng nhập để dùng mã này.');
      const used = await tx.su_dung_khuyen_mai.count({
        where: {
          makhuyenmai: p.makhuyenmai,
          ...(p.doituongtinhgioihan === 'KhachHang'
            ? { makhachhang: customer!.makhachhang }
            : { sodienthoaiapdung: phone }),
          OR: [
            { trangthai: 'DaSuDung' },
            { trangthai: 'DangGiu', thoigianhethangiu: { gt: now } },
          ],
        },
      });
      if (used >= p.gioihanmoikhach)
        throw new BadRequestException('Bạn đã hết lượt sử dụng mã này.');
    }
    const amount =
      p.loaikhuyenmai === 'PhanTram'
        ? new Prisma.Decimal(subtotal)
            .mul(p.giatrigiam)
            .div(100)
            .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
            .toNumber()
        : p.giatrigiam
            .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
            .toNumber();
    return {
      discount: Math.max(
        0,
        Math.min(
          subtotal,
          amount,
          p.giamtoida === null ? subtotal : Math.floor(Number(p.giamtoida)),
        ),
      ),
      promotionId: p.makhuyenmai,
      walletId: wallet?.mavoucherkhachhang ?? null,
      customer,
    };
  }
  private async validateCustomer(
    tx: Prisma.TransactionClient,
    p: Promotion,
    customer: Awaited<ReturnType<HomePromotionsService['customer']>>,
    phone: string,
  ) {
    const date = todayVN(),
      month = Number(date.slice(5, 7)),
      weekday = ((new Date(date + 'T12:00:00+07:00').getUTCDay() + 6) % 7) + 1;
    if (p.cacthuapdung.length && !p.cacthuapdung.includes(weekday))
      throw new BadRequestException('Mã không áp dụng hôm nay.');
    const tierIds = p.khuyen_mai_hang.map((item) => item.mahang),
      tierLabels = p.khuyen_mai_hang.map(
        (item) => item.bang_hang_thanh_vien.tenhang,
      );
    if (
      (p.chiapdungdondautien ||
        p.chiapdungthangsinhnhat ||
        p.cacthangapdung.length ||
        tierIds.length ||
        p.hangkhachapdung.length) &&
      !customer
    )
      throw new UnauthorizedException(
        'Đăng nhập để kiểm tra điều kiện ưu đãi.',
      );
    if (tierIds.length && !tierIds.includes(customer!.mahang ?? ''))
      throw new BadRequestException(
        'Mã không áp dụng cho hạng thành viên của bạn.',
      );
    if (
      p.hangkhachapdung.length &&
      !p.hangkhachapdung.some(
        (value) => value === customer!.mahang || tierLabels.includes(value),
      )
    ) {
      const tier = customer!.mahang
        ? await tx.bang_hang_thanh_vien.findUnique({
            where: { mahang: customer!.mahang },
            select: { tenhang: true },
          })
        : null;
      if (!tier || !p.hangkhachapdung.includes(tier.tenhang))
        throw new BadRequestException(
          'Mã không áp dụng cho hạng thành viên của bạn.',
        );
    }
    if (p.chiapdungthangsinhnhat || p.cacthangapdung.length) {
      const birthMonth = customer!.ngaysinh?.getUTCMonth();
      if (
        birthMonth === undefined ||
        (p.chiapdungthangsinhnhat && birthMonth + 1 !== month) ||
        (p.cacthangapdung.length && !p.cacthangapdung.includes(birthMonth + 1))
      )
        throw new BadRequestException('Chưa đáp ứng điều kiện tháng sinh.');
    }
    if (
      p.chiapdungdondautien &&
      (await tx.don_hang.count({
        where: {
          OR: [
            { makhachhang: customer!.makhachhang },
            { sodienthoainguoidat: phone },
          ],
          trangthaidonhang: {
            in: [
              'DaThanhToan',
              'HuyMotPhan',
              'ChoThanhToanOnline',
              'ChoThanhToanTrucTiep',
            ],
          },
          NOT: {
            trangthaidonhang: {
              in: ['ChoThanhToanOnline', 'ChoThanhToanTrucTiep'],
            },
            thoigianhethangiucho: { lte: new Date() },
          },
        },
      }))
    )
      throw new BadRequestException('Mã chỉ dành cho đơn đầu tiên.');
    if (p.yeucaugioithieu || p.yeucautheodoiemail)
      throw new BadRequestException(
        'Mã cần xác minh điều kiện giới thiệu/theo dõi email trước khi áp dụng.',
      );
  }
  private response(p: Promotion) {
    return {
      id: p.makhuyenmai,
      code: p.magiamgia,
      title: p.tenkhuyenmai,
      description: p.mota,
      type: p.loaikhuyenmai,
      percent: p.loaikhuyenmai === 'PhanTram' ? Number(p.giatrigiam) : 0,
      amount: p.loaikhuyenmai === 'TruTienThang' ? Number(p.giatrigiam) : 0,
      maximum: p.giamtoida === null ? null : Number(p.giamtoida),
      minimum: Number(p.donhangtoithieu),
      startsAt: p.ngaybatdau.toISOString(),
      endsAt: p.ngayketthuc.toISOString(),
      routeScope: p.phamvituyen,
      routeIds: p.khuyen_mai_tuyen_duong.map((row) => row.matuyenduong),
      remainingUses:
        p.soluongtoida === null
          ? null
          : Math.max(
              0,
              p.soluongtoida - p.soluongdadung - p._count.su_dung_khuyen_mai,
            ),
      weekdays: p.cacthuapdung,
      limitPerCustomer: p.gioihanmoikhach,
      eligibleTiers: p.khuyen_mai_hang.map(
        (item) => item.bang_hang_thanh_vien.tenhang,
      ),
      firstOrderOnly: p.chiapdungdondautien,
      birthdayMonthOnly: p.chiapdungthangsinhnhat,
      requiresLogin:
        p.chiapdungdondautien ||
        p.chiapdungthangsinhnhat ||
        p.chidanhchokhachduoccap ||
        p.cacthangapdung.length > 0 ||
        p.khuyen_mai_hang.length > 0 ||
        p.hangkhachapdung.length > 0 ||
        (p.gioihanmoikhach !== null && p.doituongtinhgioihan === 'KhachHang'),
    };
  }
}
