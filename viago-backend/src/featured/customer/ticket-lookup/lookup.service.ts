import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { AccountsAccess } from '../../../shared/accounts/accounts-access';
import { digest, newId } from '../../../shared/accounts/account-security';
import { CustomerAuthService } from '../auth/customer-auth.service';
import type { LookupEditDto } from './lookup.controller';
import { cancelPaidTicket } from '../../../shared/ticket-cancellation';
const cookie = 'viago_lookup';
const include = {
  ghe_chuyen: { select: { ghe: { select: { soghe: true } } } },
  don_hang: {
    select: { thanh_toan: { orderBy: { thoigiantao: 'asc' as const } } },
  },
  lich_trinh: {
    include: {
      tuyen_xe: true,
      xe: true,
      lich_trinh_diem: {
        include: { diem_don_tra: true },
        orderBy: { thutu: 'asc' as const },
      },
    },
  },
  ve_xe: {
    include: {
      ghe_chuyen: { include: { ghe: true } },
      danh_gia: { select: { madanhgia: true } },
    },
  },
  thanh_toan: { orderBy: { thoigiantao: 'asc' as const } },
} satisfies Prisma.don_hangInclude;
type Row = Prisma.don_hangGetPayload<{ include: typeof include }>;
@Injectable()
export class LookupService {
  constructor(
    private readonly db: PrismaService,
    private readonly access: AccountsAccess,
    private readonly auth: CustomerAuthService,
  ) {}
  private token(req: Request) {
    return (
      req.headers.cookie
        ?.split(';')
        .map((x) => x.trim())
        .find((x) => x.startsWith(cookie + '='))
        ?.slice(cookie.length + 1) ?? ''
    );
  }
  async session(
    dto: { phoneNumber: string; verificationToken: string },
    res: Response,
  ) {
    const token = randomBytes(32).toString('hex');
    await this.db.$transaction(async (tx) => {
      await this.auth.consumeProof(
        tx,
        dto.verificationToken,
        dto.phoneNumber,
        'TraCuuVe',
      );
      await tx.$executeRaw`DELETE FROM phien_tra_cuu_ve WHERE thoigianhethan <= NOW()`;
      await tx.$executeRaw`INSERT INTO phien_tra_cuu_ve(tokenhash,sodienthoai,thoigianhethan) VALUES (${digest(token)},${dto.phoneNumber}, NOW()+INTERVAL '30 minutes')`;
    });
    res.cookie(cookie, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/customer',
      maxAge: 1800000,
    });
    return { expiresIn: 1800 };
  }
  async logout(req: Request, res: Response) {
    await this.db
      .$executeRaw`DELETE FROM phien_tra_cuu_ve WHERE tokenhash=${digest(this.token(req))}`;
    res.clearCookie(cookie, { path: '/api/customer' });
    return { success: true };
  }
  private async scope(req: Request): Promise<Prisma.don_hangWhereInput> {
    if (req.headers.authorization) {
      const identity = await this.access.authenticate(
        req.headers.authorization,
      );
      if (identity.role !== 'customer') throw new ForbiddenException();
      const person = await this.db.khach_hang.findUniqueOrThrow({
        where: { makhachhang: identity.customerId! },
        select: { sodienthoai: true },
      });
      return {
        OR: [
          { makhachhang: identity.customerId },
          { sodienthoainguoidat: person.sodienthoai },
        ],
      };
    }
    const [session] = await this.db.$queryRaw<
      { sodienthoai: string }[]
    >`SELECT sodienthoai FROM phien_tra_cuu_ve WHERE tokenhash=${digest(this.token(req))} AND thoigianhethan>NOW()`;
    if (!session)
      throw new UnauthorizedException('Vui lòng đăng nhập hoặc xác thực OTP.');
    return { sodienthoainguoidat: session.sodienthoai };
  }
  private async row(
    tx: Prisma.TransactionClient,
    scope: Prisma.don_hangWhereInput,
    id: string,
  ) {
    const row = await tx.don_hang.findFirst({
      where: { AND: [scope, { madonhang: id }] },
      include,
    });
    if (!row) throw new NotFoundException('Không tìm thấy đơn đặt vé.');
    return row;
  }
  private view(row: Row) {
    const trip = row.lich_trinh,
      now = Date.now();
    const state = (cancelled: boolean, completed: boolean, paid: boolean) =>
      cancelled
        ? 'cancelled'
        : completed
          ? 'completed'
          : paid
            ? 'upcoming'
            : 'pending';
    const paid = ['DaThanhToan', 'HuyMotPhan'].includes(row.trangthaidonhang);
    const cancelled =
      ['DaHuy', 'HetHanThanhToan'].includes(row.trangthaidonhang) ||
      (!paid && row.thoigianhethangiucho.getTime() <= now);
    const canEdit =
      !cancelled &&
      trip.thoigiankhoihanh.getTime() - now >= 7200000 &&
      row.solanchinhsua < row.gioihanchinhsua &&
      ['ChoThanhToanOnline', 'ChoThanhToanTrucTiep', 'DaThanhToan'].includes(
        row.trangthaidonhang,
      ) &&
      !row.ve_xe.some((v) => v.trangthaive === 'DaHoanThanh');
    const points = trip.lich_trinh_diem
      .filter((p) => p.diem_don_tra.trangthai === 'HoatDong')
      .map((p) => ({
        id: p.madiem,
        name: p.diem_don_tra.tendiem,
        kind: p.loaidiemtuyen,
        at: p.thoigiandukien.toISOString(),
      }));
    return {
      id: row.madonhang,
      customerId: row.makhachhang,
      bookerName: row.hotennguoidat,
      phone: row.sodienthoainguoidat,
      email: row.emailnguoidat,
      bookedAt: row.thoigiandat.toISOString(),
      route: trip.tuyen_xe.tentuyen,
      scheduleId: trip.malichtrinh,
      departureAt: trip.thoigiankhoihanh.toISOString(),
      arrivalAt: trip.thoigiandendukien.toISOString(),
      presenceMinutes: row.thoigiancomattruocphut,
      pickupId: row.madiemdon,
      pickup: points.find((p) => p.id === row.madiemdon)?.name ?? '',
      dropoffId: row.madiemtra,
      dropoff: points.find((p) => p.id === row.madiemtra)?.name ?? '',
      plate: trip.xe.biensoxe,
      total: Number(row.tongthanhtoan),
      paymentMethod:
        (row.thanh_toan[0] ?? row.don_hang?.thanh_toan[0])
          ?.phuongthucthanhtoan ?? '',
      editCount: row.solanchinhsua,
      editLimit: row.gioihanchinhsua,
      seats: row.ve_xe.length
        ? row.ve_xe.map((v) => v.ghe_chuyen.ghe.soghe)
        : row.ghe_chuyen.map((s) => s.ghe.soghe),
      status: cancelled
        ? 'cancelled'
        : !paid
          ? 'pending'
          : !row.ve_xe.some((v) => v.trangthaive !== 'DaHuy')
            ? 'cancelled'
            : row.ve_xe
                  .filter((v) => v.trangthaive !== 'DaHuy')
                  .every((v) => v.trangthaive === 'DaHoanThanh' && !!v.danh_gia)
              ? 'reviewed'
              : state(
                  false,
                  row.ve_xe
                    .filter((v) => v.trangthaive !== 'DaHuy')
                    .every((v) => v.trangthaive === 'DaHoanThanh'),
                  paid,
                ),
      version: row.thoigiancapnhat.toISOString(),
      canEdit,
      points,
      tickets: row.ve_xe.map((v) => ({
        id: v.mave,
        seat: v.ghe_chuyen.ghe.soghe,
        passenger: v.hotenhanhkhach,
        price: Number(v.giave),
        qr: v.maqrve,
        status:
          !cancelled && v.trangthaive === 'DaHoanThanh' && v.danh_gia
            ? 'reviewed'
            : state(
                v.trangthaive === 'DaHuy' || cancelled,
                v.trangthaive === 'DaHoanThanh',
                paid,
              ),
      })),
    };
  }
  async list(req: Request) {
    const scope = await this.scope(req);
    const page = Math.max(
      1,
      Math.min(10000, Math.floor(Number(req.query?.page) || 1)),
    );
    const rows = await this.db.don_hang.findMany({
      where: scope,
      include,
      orderBy: { thoigiantao: 'desc' },
      take: 50,
      skip: (page - 1) * 50,
    });
    const total = await this.db.don_hang.count({ where: scope });
    return {
      items: rows.map((row) => this.view(row)),
      pagination: { page, total, totalPages: Math.ceil(total / 50) },
    };
  }
  async detail(req: Request, id: string) {
    return this.view(await this.row(this.db, await this.scope(req), id));
  }
  async edit(req: Request, id: string, dto: LookupEditDto) {
    const scope = await this.scope(req);
    return this.db.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT madonhang FROM don_hang WHERE madonhang=${id} FOR UPDATE`;
        const row = await this.row(tx, scope, id),
          view = this.view(row);
        if (!view.canEdit)
          throw new ConflictException(
            'Chỉ được sửa trước giờ khởi hành ít nhất 2 tiếng, trong giới hạn lượt sửa và khi đơn còn hiệu lực.',
          );
        if (view.version !== dto.version)
          throw new ConflictException(
            'Thông tin vừa thay đổi. Vui lòng tải lại đơn.',
          );
        const pickup = dto.pickupId ?? row.madiemdon,
          dropoff = dto.dropoffId ?? row.madiemtra;
        const a = row.lich_trinh.lich_trinh_diem.find(
          (p) =>
            p.madiem === pickup &&
            p.loaidiemtuyen === 'Don' &&
            p.diem_don_tra.trangthai === 'HoatDong',
        );
        const b = row.lich_trinh.lich_trinh_diem.find(
          (p) =>
            p.madiem === dropoff &&
            p.loaidiemtuyen === 'Tra' &&
            p.diem_don_tra.trangthai === 'HoatDong',
        );
        if (!a || !b || a.thutu >= b.thutu)
          throw new ConflictException('Điểm đón/trả không hợp lệ của chuyến.');
        const email =
          dto.email === '' ? null : (dto.email ?? row.emailnguoidat);
        if (
          email === row.emailnguoidat &&
          pickup === row.madiemdon &&
          dropoff === row.madiemtra
        )
          return view;
        let note = row.ghichu;
        try {
          const parsed = JSON.parse(note ?? '');
          if (parsed.home === 1) {
            parsed.leg.pickupId = pickup;
            parsed.leg.dropoffId = dropoff;
            note = JSON.stringify(parsed);
          }
        } catch {}
        await tx.don_hang.update({
          where: { madonhang: id },
          data: {
            emailnguoidat: email,
            madiemdon: pickup,
            madiemtra: dropoff,
            ghichu: note,
            solanchinhsua: { increment: 1 },
            thoigiancapnhat: new Date(),
          },
        });
        await tx.ve_xe.updateMany({
          where: { madonhang: id, trangthaive: { not: 'DaHuy' } },
          data: {
            madiemdon: pickup,
            madiemtra: dropoff,
            thoigiancapnhat: new Date(),
          },
        });
        await tx.nhat_ky_he_thong.create({
          data: {
            manhatky: newId('NK'),
            hanhdong: 'CUSTOMER_EDIT_BOOKING',
            banglienquan: 'don_hang',
            madoituong: id,
            trangthai: 'ThanhCong',
            thoigian: new Date(),
            chitiet: 'Customer updated contact email or trip stops.',
            dulieutruoc: {
              email: row.emailnguoidat,
              pickupId: row.madiemdon,
              dropoffId: row.madiemtra,
            },
            dulieusau: { email, pickupId: pickup, dropoffId: dropoff },
          },
        });
        return this.view(await this.row(tx, scope, id));
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 20000,
      },
    );
  }
  async print(req: Request, id: string, ticketId: string) {
    const scope = await this.scope(req);
    return this.db.$transaction(
      async (tx) => {
        const row = await this.row(tx, scope, id),
          ticket = row.ve_xe.find(
            (v) => v.mave === ticketId && v.trangthaive !== 'DaHuy',
          );
        if (
          !ticket ||
          !['DaThanhToan', 'HuyMotPhan'].includes(row.trangthaidonhang)
        )
          throw new ConflictException(
            'Chỉ được in vé đã thanh toán và còn hợp lệ.',
          );
        await tx.ve_xe.updateMany({
          where: {
            mave: ticketId,
            trangthaive: { not: 'DaHuy' },
            solaninve: { lt: 32767 },
          },
          data: { solaninve: { increment: 1 }, laningannhat: new Date() },
        });
        return this.view(row);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
  async cancelTicket(req: Request, id: string, ticketId: string, reason: string) {
    const scope = await this.scope(req);
    let accountId: string | null = null;
    if (req.headers.authorization)
      accountId = (await this.access.authenticate(req.headers.authorization)).accountId ?? null;
    return this.db.$transaction(
      async (tx) => {
        const row = await this.row(tx, scope, id);
        if (!row.ve_xe.some((v) => v.mave === ticketId))
          throw new NotFoundException('Vé không thuộc đơn đặt vé này.');
        const result = await cancelPaidTicket(tx, {
          ticketId,
          source: 'KhachHang',
          reason: reason.trim(),
          accountId,
        });
        return { ...this.view(await this.row(tx, scope, id)), cancellation: result };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 },
    );
  }
}
