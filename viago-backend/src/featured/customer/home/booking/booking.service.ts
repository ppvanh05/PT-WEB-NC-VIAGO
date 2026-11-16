import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { nextBusinessId } from '../../../../shared/business-id';
import {
  readSepayConfig,
  sepayRecipientMatches,
} from '../payments/sepay.config';
import {
  extractSepayPaymentCode,
  generateSepayPaymentCode,
} from '../payments/sepay-payment-code';
import { PrismaService } from '../../../../prisma/prisma.service';
import { readOrderDetailTrips } from './order-detail-trips';
import {
  HomeHoldDto,
  HomeLegDto,
  HomeOrderDto,
  HomeQuoteDto,
  SepayWebhookDto,
} from '../common/home.dto';
import {
  CustomerHomeService,
  HomeTrip,
  normalizedCity,
  readTrip,
  seatState,
  tripIsOpen,
} from '../catalog/home.service';
import { HomePromotionsService } from '../promotions/promotions.service';
import type { CounterActor, CounterQueryDto } from './counter.controller';
import {
  expiredAssignment,
  inventoryIsOpen,
  inventorySeatState,
  readSeatInventory,
} from './seat-inventory';

type Tx = Prisma.TransactionClient;
type Leg = { dto: HomeLegDto; trip: HomeTrip; subtotal: number };
type Order = Prisma.don_hangGetPayload<object>;
type OrderNote = {
  home: 1;
  requestHash: string;
  leg: HomeLegDto;
  seatPrices: Record<string, number>;
  note?: string;
};
export type AdminBookingContext = {
  actor: CounterActor;
  source: 'TaiQuay' | 'Hotline';
  note?: string;
  expectedTotal: number;
  confirmReceived: boolean;
};
const pending = {
  in: ['ChoThanhToanOnline', 'ChoThanhToanTrucTiep'] as (
    'ChoThanhToanOnline' | 'ChoThanhToanTrucTiep'
  )[],
};
const prefix = (session: string) => 'HOME:' + session + ':';

@Injectable()
export class HomeBookingService implements OnModuleInit, OnModuleDestroy {
  private expiryTimer?: ReturnType<typeof setInterval>;
  private sweeping = false;
  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    this.expiryTimer = setInterval(() => {
      if (this.sweeping) return;
      this.sweeping = true;
      void this.cleanupExpired()
        .catch(() =>
          new Logger(HomeBookingService.name).warn(
            'Chưa dọn được đơn hết hạn; sẽ thử lại.',
          ),
        )
        .finally(() => {
          this.sweeping = false;
        });
    }, 30000);
    this.expiryTimer.unref();
  }
  onModuleDestroy() {
    if (this.expiryTimer) clearInterval(this.expiryTimer);
  }
  cleanupExpired() {
    return this.write((tx) => this.expire(tx));
  }
  constructor(
    private readonly prisma: PrismaService,
    private readonly home: CustomerHomeService,
    private readonly promotions: HomePromotionsService,
  ) {}

  async hold(session: string, dto: HomeHoldDto, actor?: CounterActor) {
    return this.write(async (tx) => {
      await this.expire(tx);
      if (
        await tx.don_hang.count({
          where: {
            khoachonglap: { startsWith: prefix(session) },
            trangthaidonhang: pending,
            thoigianhethangiucho: { gt: new Date() },
          },
        })
      )
        throw new ConflictException(
          'Hãy hủy đơn đang chờ thanh toán trước khi đổi ghế.',
        );
      const legs = await this.validateLegs(tx, dto.legs, session, false),
        now = new Date();
      const old = await tx.ghe_chuyen.findMany({
        where: {
          sessiongiucho: session,
          trangthaighe: 'DangGiu',
          giuchoden: { gt: now },
        },
        select: { giuchoden: true },
      });
      const expires = new Date(
        Math.min(
          now.getTime() + 600000,
          ...old.map((row) => row.giuchoden!.getTime()),
          ...legs.map((leg) =>
            Math.min(
              leg.trip.thoigiandongbanve.getTime(),
              now.getTime() + Math.max(0, leg.trip.thoigiangiuchophut) * 60000,
            ),
          ),
        ),
      );
      if (expires <= now)
        throw new ConflictException('Chuyến không còn nhận giữ ghế.');
      const ids = legs.flatMap((leg) => leg.dto.seats);
      await tx.ghe_chuyen.updateMany({
        where: {
          sessiongiucho: session,
          trangthaighe: 'DangGiu',
          madonhanggiu: null,
        },
        data: {
          trangthaighe: 'Trong',
          sessiongiucho: null,
          nguoigiughe: null,
          giuchoden: null,
          thoigiancapnhat: now,
        },
      });
      const updated = await tx.ghe_chuyen.updateMany({
        where: {
          maghechuyen: { in: ids },
          OR: [
            { trangthaighe: 'Trong' },
            { trangthaighe: 'DangGiu', sessiongiucho: session },
          ],
        },
        data: {
          trangthaighe: 'DangGiu',
          sessiongiucho: session,
          nguoigiughe: actor?.staffId,
          giuchoden: expires,
          thoigiancapnhat: now,
        },
      });
      if (updated.count !== ids.length)
        throw new ConflictException(
          'Ghế vừa được người khác giữ. Vui lòng chọn lại.',
        );
      return {
        legs: dto.legs,
        expiresAt: expires.toISOString(),
        serverTime: now.toISOString(),
      };
    });
  }
  async holdAdmin(
    session: string,
    tripId: string,
    seatIds: string[],
    actor: CounterActor,
  ) {
    if (
      !seatIds.length ||
      seatIds.length > 5 ||
      new Set(seatIds).size !== seatIds.length
    )
      throw new BadRequestException('Chọn tối đa 5 ghế duy nhất cho mỗi đơn.');
    return this.write(async (tx) => {
      const now = new Date();
      const snapshot = await readSeatInventory(tx, tripId, {
        seatIds,
        session,
      });
      if (!snapshot || !inventoryIsOpen(snapshot.trip, now))
        throw new ConflictException('Chuyến đã ngừng bán vé.');
      const requested = seatIds.map((id) =>
        snapshot.seats.find(
          (row) => row.seatId === id && row.seatTripId === tripId,
        ),
      );
      if (requested.some((row) => !row))
        throw new BadRequestException('Ghế không thuộc chuyến đã chọn.');
      const rows = requested.map((row) => row!);
      if (
        rows.some(
          (row) =>
            !Number.isSafeInteger(Number(row.price)) || Number(row.price) <= 0,
        )
      )
        throw new ConflictException('Giá ghế chưa hợp lệ.');
      const conflicts = rows.filter(
        (row) =>
          !['available', 'selected'].includes(
            inventorySeatState(row, snapshot.trip, session, now),
          ) ||
          (row.orderId &&
            !expiredAssignment(row, now) &&
            !['DaHuy', 'HetHanThanhToan'].includes(row.orderStatus ?? '')),
      );
      if (conflicts.length)
        throw new ConflictException({
          code: 'SEAT_UNAVAILABLE',
          message: 'Ghế vừa được người khác giữ. Vui lòng chọn lại.',
          seatIds: conflicts.map((row) => row.seatId),
        });
      if (
        await tx.don_hang.findFirst({
          where: {
            khoachonglap: { startsWith: prefix(session) },
            trangthaidonhang: pending,
            thoigianhethangiucho: { gt: now },
          },
          select: { madonhang: true },
        })
      )
        throw new ConflictException(
          'Hãy hủy đơn đang chờ thanh toán trước khi đổi ghế.',
        );
      const expiredOrders = [
        ...new Set(
          rows
            .filter((row) => expiredAssignment(row, now))
            .map((row) => row.orderId!),
        ),
      ];
      if (expiredOrders.length) await this.expire(tx, expiredOrders);
      const previous = snapshot.seats.filter(
        (row) =>
          row.heldBySession === session &&
          row.seatStatus === 'DangGiu' &&
          !row.orderId,
      );
      const expires = new Date(
        Math.min(
          now.getTime() +
            Math.min(10, Math.max(0, snapshot.trip.holdMinutes)) * 60000,
          snapshot.trip.saleClosesAt.getTime(),
          ...previous
            .filter((row) => row.heldUntil && row.heldUntil > now)
            .map((row) => row.heldUntil!.getTime()),
        ),
      );
      if (expires <= now)
        throw new ConflictException('Chuyến không còn nhận giữ ghế.');
      const removed = previous
        .filter((row) => !seatIds.includes(row.seatId!))
        .map((row) => row.seatId!);
      if (removed.length)
        await tx.ghe_chuyen.updateMany({
          where: {
            maghechuyen: { in: removed },
            sessiongiucho: session,
            trangthaighe: 'DangGiu',
            madonhanggiu: null,
          },
          data: {
            trangthaighe: 'Trong',
            sessiongiucho: null,
            nguoigiughe: null,
            giuchoden: null,
            thoigiancapnhat: now,
          },
        });
      const changed = rows
        .filter(
          (row) =>
            row.heldBySession !== session ||
            row.seatStatus !== 'DangGiu' ||
            row.orderId ||
            row.heldUntil?.getTime() !== expires.getTime(),
        )
        .map((row) => row.seatId!);
      if (changed.length) {
        const updated = await tx.ghe_chuyen.updateMany({
          where: {
            maghechuyen: { in: changed },
            OR: [
              { trangthaighe: 'Trong' },
              {
                trangthaighe: 'DangGiu',
                madonhanggiu: null,
                OR: [{ sessiongiucho: session }, { giuchoden: { lte: now } }],
              },
              {
                trangthaighe: 'DangGiu',
                don_hang: {
                  is: {
                    trangthaidonhang: { in: ['DaHuy', 'HetHanThanhToan'] },
                  },
                },
              },
            ],
          },
          data: {
            trangthaighe: 'DangGiu',
            sessiongiucho: session,
            nguoigiughe: actor.staffId,
            giuchoden: expires,
            madonhanggiu: null,
            thoigiancapnhat: now,
          },
        });
        if (updated.count !== changed.length)
          throw new ConflictException(
            'Ghế vừa được người khác giữ. Vui lòng chọn lại.',
          );
      }
      return {
        seatIds,
        releasedSeatIds: removed,
        expiresAt: expires.toISOString(),
        serverTime: now.toISOString(),
      };
    });
  }
  async holds(session: string) {
    return this.write(async (tx) => {
      await this.expire(tx);
      const rows = await tx.ghe_chuyen.findMany({
        where: {
          sessiongiucho: session,
          trangthaighe: 'DangGiu',
          giuchoden: { gt: new Date() },
        },
        select: {
          maghechuyen: true,
          malichtrinh: true,
          giuchoden: true,
          madonhanggiu: true,
        },
        orderBy: [{ malichtrinh: 'asc' }, { maghechuyen: 'asc' }],
      });
      return {
        data: rows.map((row) => ({
          tripId: row.malichtrinh,
          seatId: row.maghechuyen,
          expiresAt: row.giuchoden!.toISOString(),
          orderId: row.madonhanggiu,
        })),
        serverTime: new Date().toISOString(),
      };
    });
  }
  async release(session: string) {
    return this.write(async (tx) => {
      await this.expire(tx);
      if (
        await tx.don_hang.count({
          where: {
            khoachonglap: { startsWith: prefix(session) },
            trangthaidonhang: pending,
          },
        })
      )
        throw new ConflictException('Hủy đơn đang chờ thanh toán để trả ghế.');
      await tx.ghe_chuyen.updateMany({
        where: {
          sessiongiucho: session,
          trangthaighe: 'DangGiu',
          madonhanggiu: null,
        },
        data: {
          trangthaighe: 'Trong',
          sessiongiucho: null,
          giuchoden: null,
          nguoigiughe: null,
          thoigiancapnhat: new Date(),
        },
      });
      return { released: true };
    });
  }
  async quote(
    session: string,
    dto: HomeQuoteDto,
    authorization?: string,
    operator = false,
  ) {
    return this.write(async (tx) => {
      await this.expire(tx);
      const legs = await this.validateLegs(tx, dto.legs, session, true);
      const p = await this.promotions.discount(
        tx,
        dto.voucher,
        legs.map((leg) => ({
          routeId: leg.trip.matuyenduong,
          subtotal: leg.subtotal,
        })),
        dto.passenger.phone,
        authorization,
        operator,
      );
      const subtotal = legs.reduce((sum, leg) => sum + leg.subtotal, 0);
      return {
        subtotal,
        discount: p.discount,
        total: subtotal - p.discount,
        currency: 'VND',
        legs: legs.map((leg) => ({
          tripId: leg.trip.malichtrinh,
          subtotal: leg.subtotal,
        })),
      };
    });
  }
  async create(
    session: string,
    dto: HomeOrderDto,
    authorization?: string,
    admin?: AdminBookingContext,
  ) {
    return this.write(async (tx) => {
      await this.expire(tx);
      const requestHash = createHash('sha256')
        .update(JSON.stringify(admin ? { dto, admin } : dto))
        .digest('hex');
      const existing = await tx.don_hang.findUnique({
        where: { khoachonglap: prefix(session) + dto.key + ':0' },
      });
      if (existing) {
        if (this.note(existing).requestHash !== requestHash)
          throw new ConflictException(
            'Mã yêu cầu đã được dùng cho nội dung khác.',
          );
        return this.orderResponse(tx, existing, session);
      }
      if (
        await tx.don_hang.count({
          where: {
            khoachonglap: { startsWith: prefix(session) },
            trangthaidonhang: pending,
            thoigianhethangiucho: { gt: new Date() },
          },
        })
      )
        throw new ConflictException('Bạn đang có đơn chờ thanh toán.');
      const legs = await this.validateLegs(tx, dto.legs, session, true),
        now = new Date();
      const p = await this.promotions.discount(
        tx,
        dto.voucher,
        legs.map((leg) => ({
          routeId: leg.trip.matuyenduong,
          subtotal: leg.subtotal,
        })),
        dto.passenger.phone,
        authorization,
        !!admin,
      );
      const subtotal = legs.reduce((sum, leg) => sum + leg.subtotal, 0);
      if (!Number.isSafeInteger(subtotal) || subtotal <= 0)
        throw new BadRequestException('Giá vé không hợp lệ.');
      if (admin && subtotal - p.discount !== admin.expectedTotal)
        throw new ConflictException({
          code: 'PRICE_CHANGED',
          message:
            'Giá hoặc khuyến mãi đã thay đổi. Vui lòng kiểm tra lại tổng tiền.',
          total: subtotal - p.discount,
        });
      if (
        admin?.confirmReceived &&
        (dto.method !== 'counter' || admin.source !== 'TaiQuay')
      )
        throw new BadRequestException(
          'Chỉ xác nhận đã thu tiền mặt khi bán tại quầy.',
        );
      const held = await tx.ghe_chuyen.findMany({
        where: { maghechuyen: { in: legs.flatMap((leg) => leg.dto.seats) } },
        select: { giuchoden: true },
      });
      const expires = new Date(
        Math.min(
          ...held.map((row) => row.giuchoden!.getTime()),
          ...legs.map((leg) => leg.trip.thoigiandongbanve.getTime()),
        ),
      );
      let allocated = 0;
      const orders: Order[] = [];
      for (let index = 0; index < legs.length; index++) {
        const leg = legs[index],
          discount =
            index === legs.length - 1
              ? p.discount - allocated
              : Math.floor((p.discount * leg.subtotal) / subtotal);
        allocated += discount;
        const note: OrderNote = {
          home: 1,
          requestHash,
          leg: leg.dto,
          seatPrices: Object.fromEntries(
            leg.trip.ghe_chuyen
              .filter((seat) => leg.dto.seats.includes(seat.maghechuyen))
              .map((seat) => [
                seat.maghechuyen,
                Number(seat.giaghe) *
                  (leg.dto.doubleSeats.includes(seat.maghechuyen) ? 2 : 1),
              ]),
          ),
          ...(admin ? { note: admin.note } : {}),
        };
        const row = await tx.don_hang.create({
          data: {
            madonhang: await nextBusinessId(tx, 'DH'),
            khoachonglap: prefix(session) + dto.key + ':' + index,
            makhachhang: p.customer?.makhachhang,
            malichtrinh: leg.trip.malichtrinh,
            makhuyenmai: p.promotionId,
            madonhangkhuhoi: index === 1 ? orders[0].madonhang : null,
            loaichuyen:
              legs.length === 1
                ? 'MotChieu'
                : index === 0
                  ? 'KhuHoiChieuDi'
                  : 'KhuHoiChieuVe',
            hotennguoidat: dto.passenger.name,
            sodienthoainguoidat: dto.passenger.phone,
            emailnguoidat: dto.passenger.email,
            madiemdon: leg.dto.pickupId!,
            madiemtra: leg.dto.dropoffId!,
            thoigiancomattruocphut: 15,
            thoigiandat: now,
            thoigianhethangiucho: expires,
            nguondat: admin?.source ?? 'Online',
            manhanvien: admin?.actor.staffId,
            tonggiave: leg.subtotal,
            tienbaohiem: 0,
            sotiengiam: discount,
            tongthanhtoan: leg.subtotal - discount,
            trangthaidonhang:
              dto.method === 'vietqr'
                ? 'ChoThanhToanOnline'
                : 'ChoThanhToanTrucTiep',
            ghichu: JSON.stringify(note),
            thoigiantao: now,
            thoigiancapnhat: now,
          },
        });
        const updated = await tx.ghe_chuyen.updateMany({
          where: {
            maghechuyen: { in: leg.dto.seats },
            sessiongiucho: session,
            trangthaighe: 'DangGiu',
            giuchoden: { gt: now },
            madonhanggiu: null,
          },
          data: {
            madonhanggiu: row.madonhang,
            giuchoden: expires,
            thoigiancapnhat: now,
          },
        });
        if (updated.count !== leg.dto.seats.length)
          throw new ConflictException('Thời gian giữ ghế đã hết.');
        orders.push(row);
      }
      if (orders.length === 2)
        orders[0] = await tx.don_hang.update({
          where: { madonhang: orders[0].madonhang },
          data: { madonhangkhuhoi: orders[1].madonhang },
        });
      await tx.ghe_chuyen.updateMany({
        where: {
          sessiongiucho: session,
          trangthaighe: 'DangGiu',
          madonhanggiu: null,
        },
        data: {
          trangthaighe: 'Trong',
          sessiongiucho: null,
          giuchoden: null,
          thoigiancapnhat: now,
        },
      });
      if (p.promotionId) {
        await tx.su_dung_khuyen_mai.create({
          data: {
            masudungkhuyenmai: await nextBusinessId(tx, 'SD'),
            makhuyenmai: p.promotionId,
            mavoucherkhachhang: p.walletId,
            makhachhang: p.customer?.makhachhang,
            sodienthoaiapdung: dto.passenger.phone,
            madonhang: orders[0].madonhang,
            giatritruocgiam: subtotal,
            sotiengiam: p.discount,
            trangthai: 'DangGiu',
            thoigiantao: now,
            thoigianhethangiu: expires,
            thoigiancapnhat: now,
          },
        });
        if (p.walletId)
          await tx.voucher_khach_hang.update({
            where: { mavoucherkhachhang: p.walletId },
            data: { trangthai: 'DangGiu', thoigiancapnhat: now },
          });
      }
      if (
        dto.method === 'vietqr' &&
        subtotal > p.discount &&
        !this.home
          .options()
          .paymentMethods.some((m) => m.id === 'vietqr' && m.configured)
      )
        throw new ServiceUnavailableException(
          'Thanh toán chuyển khoản chưa sẵn sàng. Vui lòng chọn thanh toán tại quầy.',
        );
      const payment = await tx.thanh_toan.create({
        data: {
          mathanhtoan: await nextBusinessId(tx, 'TT'),
          madonhang: orders[0].madonhang,
          khoachonglap: 'HOMEPAY:' + orders[0].madonhang,
          phuongthucthanhtoan: dto.method === 'vietqr' ? 'VIETQR' : 'TIEN_MAT',
          kenhthanhtoan: dto.method === 'vietqr' ? 'SePay' : 'TaiQuay',
          sotienthanhtoan: subtotal - p.discount,
          trangthaithanhtoan: 'ChoThanhToan',
          mathamchieuyeucau:
            dto.method === 'vietqr'
              ? await generateSepayPaymentCode(tx)
              : orders[0].madonhang,
          thoigiantao: now,
          thoigianhethan: expires,
          thoigiancapnhat: now,
        },
      });
      if (subtotal === p.discount || admin?.confirmReceived)
        await this.confirm(
          tx,
          orders,
          payment.mathanhtoan,
          session,
          now,
          subtotal === p.discount
            ? 'FREE:' + orders[0].madonhang
            : 'COUNTER:' + orders[0].madonhang,
          admin?.actor,
        );
      if (admin)
        await tx.nhat_ky_he_thong.create({
          data: {
            manhatky: await nextBusinessId(tx, 'NK'),
            mataikhoan: admin.actor.id,
            manhanvien: admin.actor.staffId,
            hanhdong: 'TaoDonDatVeAdmin',
            banglienquan: 'don_hang',
            madoituong: orders[0].madonhang,
            tendoituong: orders[0].madonhang,
            loaidoituong: 'DonHang',
            trangthai: 'ThanhCong',
            thoigian: now,
            chitiet: admin.source,
          },
        });
      return this.orderResponse(
        tx,
        await tx.don_hang.findUniqueOrThrow({
          where: { madonhang: orders[0].madonhang },
        }),
        session,
      );
    });
  }
  async get(session: string, id: string) {
    return this.write(async (tx) => {
      await this.expire(tx);
      return this.orderResponse(
        tx,
        await this.ownedOrder(tx, session, id),
        session,
      );
    });
  }
  async getAdmin(id: string) {
    return this.write(async (tx) => {
      let root = await tx.don_hang.findFirst({
        where: {
          madonhang: id,
          khoachonglap: { startsWith: 'HOME:ADM' },
          nguondat: { in: ['TaiQuay', 'Hotline'] },
        },
      });
      if (!root)
        throw new NotFoundException('Không tìm thấy đơn do admin tạo.');
      const session = root.khoachonglap.split(':')[1];
      if (root.loaichuyen === 'KhuHoiChieuVe')
        root = await this.ownedOrder(tx, session, id);
      let orders = await this.group(tx, root);
      if (
        orders.some(
          (row) =>
            pending.in.includes(
              row.trangthaidonhang as (typeof pending.in)[number],
            ) && row.thoigianhethangiucho <= new Date(),
        )
      ) {
        const ids = orders.map((row) => row.madonhang);
        await this.expire(tx, ids);
        const refreshed = await tx.don_hang.findMany({
          where: { madonhang: { in: ids } },
        });
        orders = orders.map((row) =>
          refreshed.find((value) => value.madonhang === row.madonhang)!,
        );
        root = orders[0];
      }
      return this.orderResponse(tx, root, session, orders);
    });
  }
  async pending(session: string) {
    return this.write(async (tx) => {
      await this.expire(tx);
      const row = await tx.don_hang.findFirst({
        where: {
          khoachonglap: { startsWith: prefix(session) },
          loaichuyen: { not: 'KhuHoiChieuVe' },
          trangthaidonhang: pending,
          thoigianhethangiucho: { gt: new Date() },
        },
        orderBy: { thoigiantao: 'desc' },
      });
      return { order: row ? await this.orderResponse(tx, row, session) : null };
    });
  }
  async cancel(
    session: string,
    id: string,
    actor?: CounterActor,
    reason?: string,
  ) {
    return this.write(async (tx) => {
      await this.expire(tx);
      const root = await this.ownedOrder(tx, session, id),
        orders = await this.group(tx, root);
      if (
        orders.some((row) =>
          ['DaThanhToan', 'HuyMotPhan'].includes(row.trangthaidonhang),
        )
      )
        throw new ConflictException(
          'Đơn đã thanh toán cần dùng quy trình hủy vé/hoàn tiền.',
        );
      const ids = orders.map((row) => row.madonhang),
        now = new Date();
      const cancelled = await tx.don_hang.updateMany({
        where: { madonhang: { in: ids }, trangthaidonhang: pending },
        data: { trangthaidonhang: 'DaHuy', thoigiancapnhat: now },
      });
      await this.releaseOrders(tx, ids, 'DaHuy');
      if (actor && cancelled.count)
        await tx.nhat_ky_he_thong.create({
          data: {
            manhatky: await nextBusinessId(tx, 'NK'),
            mataikhoan: actor.id,
            manhanvien: actor.staffId,
            hanhdong: 'HuyDonDatVeAdmin',
            banglienquan: 'don_hang',
            madoituong: id,
            tendoituong: id,
            loaidoituong: 'DonHang',
            trangthai: 'ThanhCong',
            thoigian: now,
            chitiet: reason ?? 'Hủy đơn giữ chỗ',
          },
        });
      return this.orderResponse(
        tx,
        await tx.don_hang.findUniqueOrThrow({
          where: { madonhang: root.madonhang },
        }),
        session,
      );
    });
  }
  async payment(session: string, id: string) {
    const order = await this.get(session, id);
    return this.paymentInfo(order);
  }
  paymentInfo(order: Awaited<ReturnType<HomeBookingService['get']>>) {
    if (order.status !== 'pending')
      throw new ConflictException('Đơn không còn chờ thanh toán.');
    if (order.method !== 'vietqr')
      throw new ConflictException('Đơn không thanh toán bằng chuyển khoản QR.');
    const { config } = readSepayConfig();
    if (!config)
      throw new ServiceUnavailableException(
        'Cấu hình ngân hàng hoặc webhook VietQR chưa hợp lệ.',
      );
    const params = new URLSearchParams({
      amount: String(order.total),
      addInfo: order.paymentCode!,
      accountName: config.accountName,
    });
    return {
      method: 'vietqr',
      environment: config.environment,
      bankId: config.bankId,
      accountNumber: config.qrAccountNumber,
      accountName: config.accountName,
      accountType: config.accountType,
      amount: order.total,
      currency: 'VND',
      content: order.paymentCode,
      qrUrl: `https://img.vietqr.io/image/${config.bankId}-${config.qrAccountNumber}-compact2.png?${params}`,
      expiresAt: order.expiresAt,
      status: 'pending',
    };
  }
  async webhook(dto: SepayWebhookDto) {
    if (dto.transferType !== 'in') return { success: true, processed: false };
    const { config } = readSepayConfig();
    if (!config)
      throw new ServiceUnavailableException(
        'Chưa cấu hình tài khoản nhận tiền.',
      );
    if (!sepayRecipientMatches(config, dto))
      throw new BadRequestException('Tài khoản nhận tiền không khớp.');
    const code = extractSepayPaymentCode(dto.content);
    if (!code) return { success: true, processed: false };
    return this.write(async (tx) => {
      const eventKey = 'SEPAY:' + dto.id,
        duplicate = await tx.thanh_toan.findUnique({
          where: { khoachonglap: eventKey },
        });
      if (duplicate) {
        if (
          duplicate.mathamchieuyeucau !== code ||
          Number(duplicate.sotienthanhtoan) !== dto.transferAmount
        )
          throw new ConflictException(
            'Mã giao dịch đã được ghi nhận với nội dung khác.',
          );
        return {
          success: true,
          processed: duplicate.trangthaithanhtoan === 'ThanhCong',
          duplicate: true,
        };
      }
      await this.expire(tx);
      const intent = await tx.thanh_toan.findFirst({
        where: {
          mathamchieuyeucau: code,
          kenhthanhtoan: 'SePay',
          khoachonglap: { startsWith: 'HOMEPAY:' },
        },
      });
      // A second transfer for an already paid order is retained for manual reconciliation.
      const known =
        intent ??
        (await tx.thanh_toan.findFirst({
          where: { mathamchieuyeucau: code, kenhthanhtoan: 'SePay' },
        }));
      if (!known) return { success: true, processed: false };
      const root = await tx.don_hang.findUniqueOrThrow({
          where: { madonhang: known.madonhang },
        }),
        orders = await this.group(tx, root),
        now = new Date(),
        receivedAt = new Date(dto.transactionDate);
      const total = orders.reduce(
          (sum, row) => sum + Number(row.tongthanhtoan),
          0,
        ),
        session = root.khoachonglap.split(':')[1];
      let reason =
        !intent ||
        orders.some((row) => row.trangthaidonhang !== 'ChoThanhToanOnline')
          ? 'ORDER_NOT_PENDING'
          : dto.transferAmount !== total
            ? 'AMOUNT_MISMATCH'
            : orders.some((row) => row.thoigianhethangiucho <= now) ||
                receivedAt > now ||
                receivedAt < new Date(root.thoigiantao.getTime() - 60000)
              ? 'PAYMENT_LATE_OR_INVALID_TIME'
              : null;
      if (!reason) {
        for (const row of orders) {
          const trip = await readTrip(tx, row.malichtrinh);
          const note = this.note(row);
          if (
            !trip ||
            !tripIsOpen(trip) ||
            note.leg.seats.some(
              (id) =>
                !trip.ghe_chuyen.some(
                  (seat) =>
                    seat.maghechuyen === id &&
                    seat.trangthaighe === 'DangGiu' &&
                    seat.sessiongiucho === session &&
                    seat.madonhanggiu === row.madonhang &&
                    seat.giuchoden! > now &&
                    !seat._count.ve_xe,
                ),
            )
          ) {
            reason = 'SEAT_OR_TRIP_UNAVAILABLE';
            break;
          }
        }
      }
      if (reason) {
        await tx.thanh_toan.create({
          data: {
            mathanhtoan: await nextBusinessId(tx, 'TT'),
            madonhang: root.madonhang,
            khoachonglap: eventKey,
            phuongthucthanhtoan: 'VIETQR',
            kenhthanhtoan: 'SePay',
            dinhdanhtaikhoandoitac: config.qrAccountNumber,
            sotienthanhtoan: dto.transferAmount,
            trangthaithanhtoan: 'DangXuLy',
            mathamchieuyeucau: code,
            magiaodichdoitac: dto.referenceCode ?? String(dto.id),
            maloi: reason,
            motaloi: 'Đã nhận thông báo tiền vào, cần đối soát thủ công.',
            thoigiantao: now,
            thoigianthanhtoan: receivedAt,
            thoigiancapnhat: now,
          },
        });
        return { success: true, processed: false, requiresReview: true };
      }
      await tx.thanh_toan.update({
        where: { mathanhtoan: intent!.mathanhtoan },
        data: {
          khoachonglap: eventKey,
          dinhdanhtaikhoandoitac: config.qrAccountNumber,
          magiaodichdoitac: dto.referenceCode ?? String(dto.id),
          thoigianthanhtoan: receivedAt,
          thoigiancapnhat: now,
        },
      });
      await this.confirm(
        tx,
        orders,
        intent!.mathanhtoan,
        session,
        receivedAt,
        eventKey,
      );
      return { success: true, processed: true };
    });
  }
  async counterOrders(q: CounterQueryDto) {
    return this.write(async (tx) => {
      await this.expire(tx);
      const where: Prisma.don_hangWhereInput = {
        khoachonglap: { startsWith: 'HOME:' },
        loaichuyen: { not: 'KhuHoiChieuVe' },
        AND: [
          {
            OR: [
              {
                thanh_toan: {
                  some: {
                    phuongthucthanhtoan: 'TIEN_MAT',
                    kenhthanhtoan: 'TaiQuay',
                  },
                },
              },
              { khoachonglap: { startsWith: 'HOME:ADM' } },
            ],
          },
        ],
        ...(q.status === 'pending' && {
          trangthaidonhang: 'ChoThanhToanTrucTiep',
        }),
        ...(q.search?.trim() && {
          OR: ['madonhang', 'hotennguoidat', 'sodienthoainguoidat'].map(
            (k) => ({
              [k]: { contains: q.search!.trim(), mode: 'insensitive' },
            }),
          ),
        }),
      };
      const total = await tx.don_hang.count({ where });
      const rows = await tx.don_hang.findMany({
        where,
        orderBy: { thoigiantao: 'desc' },
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        include: {
          lich_trinh: {
            select: {
              thoigiankhoihanh: true,
              tuyen_xe: { select: { diemdi: true, diemden: true } },
            },
          },
        },
      });
      const linked = await tx.don_hang.findMany({
        where: {
          madonhang: {
            in: rows.flatMap((r) =>
              r.madonhangkhuhoi ? [r.madonhangkhuhoi] : [],
            ),
          },
        },
      });
      return {
        data: rows.map((r) => ({
          id: r.madonhang,
          source: r.nguondat,
          adminCreated: r.khoachonglap.startsWith('HOME:ADM'),
          name: r.hotennguoidat,
          phone: r.sodienthoainguoidat,
          from: r.lich_trinh.tuyen_xe.diemdi,
          to: r.lich_trinh.tuyen_xe.diemden,
          departureAt: r.lich_trinh.thoigiankhoihanh,
          createdAt: r.thoigiantao,
          expiresAt: r.thoigianhethangiucho,
          status: r.trangthaidonhang,
          seatCount:
            this.note(r).leg.seats.length +
            (r.madonhangkhuhoi
              ? this.note(
                  linked.find((l) => l.madonhang === r.madonhangkhuhoi)!,
                ).leg.seats.length
              : 0),
          total:
            Number(r.tongthanhtoan) +
            Number(
              linked.find((l) => l.madonhang === r.madonhangkhuhoi)
                ?.tongthanhtoan ?? 0,
            ),
        })),
        pagination: {
          page: q.page,
          total,
          totalPages: Math.ceil(total / q.pageSize),
        },
      };
    });
  }
  async confirmCounter(
    id: string,
    actor: CounterActor,
    receivedAmount?: number,
  ) {
    return this.write(async (tx) => {
      await tx.$queryRaw`SELECT madonhang FROM public.don_hang WHERE madonhang=${id} FOR UPDATE`;
      await this.expire(tx);
      const root = await tx.don_hang.findFirst({
        where: {
          madonhang: id,
          khoachonglap: { startsWith: 'HOME:' },
          loaichuyen: { not: 'KhuHoiChieuVe' },
        },
      });
      if (!root) throw new NotFoundException('Không tìm thấy đơn khách đặt.');
      const orders = await this.group(tx, root),
        session = root.khoachonglap.split(':')[1];
      if (
        receivedAmount !== undefined &&
        receivedAmount !==
          orders.reduce((sum, order) => sum + Number(order.tongthanhtoan), 0)
      )
        throw new BadRequestException(
          'Số tiền xác nhận phải bằng tổng tiền của đơn.',
        );
      const payment = await tx.thanh_toan.findFirst({
        where: {
          madonhang: id,
          phuongthucthanhtoan: 'TIEN_MAT',
          kenhthanhtoan: 'TaiQuay',
          maloi: null,
        },
      });
      if (!payment)
        throw new ConflictException('Đơn không thanh toán tại quầy.');
      if (
        payment.trangthaithanhtoan === 'ThanhCong' &&
        orders.every((o) => o.trangthaidonhang === 'DaThanhToan')
      )
        return this.orderResponse(tx, root, session);
      if (
        payment.trangthaithanhtoan !== 'ChoThanhToan' ||
        orders.some(
          (o) =>
            o.trangthaidonhang !== 'ChoThanhToanTrucTiep' ||
            o.thoigianhethangiucho <= new Date(),
        )
      )
        throw new ConflictException(
          'Đơn đã hết hạn, bị hủy hoặc không còn chờ thu tiền.',
        );
      for (const order of orders) {
        const trip = await readTrip(tx, order.malichtrinh);
        if (
          !trip ||
          !tripIsOpen(trip) ||
          this.note(order).leg.seats.some(
            (id) =>
              !trip.ghe_chuyen.some(
                (s) =>
                  s.maghechuyen === id &&
                  s.madonhanggiu === order.madonhang &&
                  seatState(s, trip, session) === 'selected',
              ),
          )
        )
          throw new ConflictException(
            'Chuyến hoặc ghế không còn hợp lệ để thu tiền.',
          );
      }
      await this.confirm(
        tx,
        orders,
        payment.mathanhtoan,
        session,
        new Date(),
        'COUNTER:' + id,
        actor,
      );
      return this.orderResponse(
        tx,
        await tx.don_hang.findUniqueOrThrow({ where: { madonhang: id } }),
        session,
      );
    });
  }
  async ticket(token: string) {
    if (!/^[a-f0-9]{64}$/.test(token))
      throw new NotFoundException('Không tìm thấy vé.');
    const row = await this.prisma.ve_xe.findFirst({
      where: {
        tokentracuu: token,
        trangthaive: { not: 'DaHuy' },
        don_hang: { trangthaidonhang: { in: ['DaThanhToan', 'HuyMotPhan'] } },
      },
      select: {
        mave: true,
        hotenhanhkhach: true,
        loaiphong: true,
        giave: true,
        maqrve: true,
        thoigianxuatve: true,
        madiemdon: true,
        madiemtra: true,
        ghe_chuyen: {
          select: { maghechuyen: true, ghe: { select: { soghe: true } } },
        },
        don_hang: {
          select: { malichtrinh: true, thoigiancomattruocphut: true },
        },
      },
    });
    if (!row) throw new NotFoundException('Không tìm thấy vé.');
    const trip = await readTrip(this.prisma, row.don_hang.malichtrinh);
    if (!trip) throw new NotFoundException('Không tìm thấy chuyến.');
    const view = this.home.tripResponse(trip);
    return {
      id: row.mave,
      trip: view,
      passengerName: row.hotenhanhkhach,
      seat: row.ghe_chuyen.ghe.soghe,
      roomType: row.loaiphong,
      fare: Number(row.giave),
      issuedAt: row.thoigianxuatve?.toISOString(),
      from: view.from,
      to: view.to,
      departureAt: view.departureAt,
      arrivalAt: view.arrivalAt,
      pickup: view.pickup.find((p) => p.id === row.madiemdon),
      dropoff: view.dropoff.find((p) => p.id === row.madiemtra),
      arriveBeforeMinutes: row.don_hang.thoigiancomattruocphut,
    };
  }
  async printTicket(token: string) {
    const ticket = await this.ticket(token);
    await this.prisma.ve_xe.updateMany({
      where: {
        mave: ticket.id,
        trangthaive: { not: 'DaHuy' },
        solaninve: { lt: 32767 },
      },
      data: {
        solaninve: { increment: 1 },
        laningannhat: new Date(),
        thoigiancapnhat: new Date(),
      },
    });
    return { recorded: true };
  }
  async print(session: string, id: string) {
    return this.write(async (tx) => {
      const root = await this.ownedOrder(tx, session, id),
        orders = await this.group(tx, root);
      if (
        orders.some(
          (row) =>
            !['DaThanhToan', 'HuyMotPhan'].includes(row.trangthaidonhang),
        )
      )
        throw new ConflictException('Đơn chưa thanh toán.');
      await tx.ve_xe.updateMany({
        where: {
          madonhang: { in: orders.map((row) => row.madonhang) },
          trangthaive: { not: 'DaHuy' },
          solaninve: { lt: 32767 },
        },
        data: {
          solaninve: { increment: 1 },
          laningannhat: new Date(),
          thoigiancapnhat: new Date(),
        },
      });
      return { recorded: true };
    });
  }

  private async validateLegs(
    tx: Tx,
    dtos: HomeLegDto[],
    session: string,
    requireHold: boolean,
  ): Promise<Leg[]> {
    const count = dtos.reduce((sum, leg) => sum + leg.seats.length, 0);
    if (
      count < 1 ||
      count > 5 ||
      new Set(dtos.map((leg) => leg.tripId)).size !== dtos.length ||
      new Set(dtos.flatMap((leg) => leg.seats)).size !== count
    )
      throw new BadRequestException('Chọn tối đa 5 ghế duy nhất cho mỗi đơn.');
    if (
      requireHold &&
      dtos.length === 2 &&
      dtos[0].seats.length !== dtos[1].seats.length
    )
      throw new BadRequestException('Số ghế hai chiều phải bằng nhau.');
    const result: Leg[] = [];
    for (const dto of dtos) {
      const trip = await readTrip(tx, dto.tripId);
      if (!trip || !tripIsOpen(trip))
        throw new ConflictException('Chuyến đã ngừng bán vé.');
      if (dto.doubleSeats.some((id) => !dto.seats.includes(id)))
        throw new BadRequestException('Phòng đôi phải thuộc ghế đã chọn.');
      let subtotal = 0;
      for (const id of dto.seats) {
        const seat = trip.ghe_chuyen.find((s) => s.maghechuyen === id);
        if (!seat)
          throw new BadRequestException('Ghế không thuộc chuyến đã chọn.');
        const state = seatState(seat, trip, session);
        if (!['available', 'selected'].includes(state))
          throw new ConflictException('Ghế không còn trống.');
        if (requireHold && (state !== 'selected' || seat.madonhanggiu))
          throw new ConflictException(
            'Bạn chưa giữ ghế hoặc thời gian giữ đã hết.',
          );
        if (dto.doubleSeats.includes(id) && seat.ghe.loaighe !== 'CabinDoi')
          throw new BadRequestException('Ghế không hỗ trợ phòng đôi.');
        const price = Number(seat.giaghe);
        if (!Number.isSafeInteger(price) || price <= 0)
          throw new ConflictException('Giá ghế chưa hợp lệ.');
        subtotal += price * (dto.doubleSeats.includes(id) ? 2 : 1);
      }
      if (requireHold) {
        const pickup = trip.lich_trinh_diem.find(
          (point) =>
            point.madiem === dto.pickupId &&
            point.loaidiemtuyen === 'Don' &&
            point.diem_don_tra.trangthai === 'HoatDong',
        );
        const dropoff = trip.lich_trinh_diem.find(
          (point) =>
            point.madiem === dto.dropoffId &&
            point.loaidiemtuyen === 'Tra' &&
            point.diem_don_tra.trangthai === 'HoatDong',
        );
        if (
          !pickup ||
          !dropoff ||
          pickup.thutu >= dropoff.thutu ||
          pickup.thoigiandukien <= new Date() ||
          pickup.thoigiandukien >= dropoff.thoigiandukien
        )
          throw new BadRequestException(
            'Điểm đón/trả không hợp lệ hoặc đã qua giờ đón.',
          );
      }
      result.push({ dto, trip, subtotal });
    }
    if (result.length === 2) {
      const [a, b] = result;
      if (
        normalizedCity(a.trip.tuyen_xe.diemdi) !==
          normalizedCity(b.trip.tuyen_xe.diemden) ||
        normalizedCity(a.trip.tuyen_xe.diemden) !==
          normalizedCity(b.trip.tuyen_xe.diemdi) ||
        b.trip.thoigiankhoihanh <= a.trip.thoigiandendukien
      )
        throw new BadRequestException(
          'Chuyến về phải đúng chiều ngược lại và sau giờ đến của chuyến đi.',
        );
    }
    return result;
  }
  private async expire(tx: Tx, orderIds?: string[]) {
    const now = new Date();
    const expired = await tx.don_hang.findMany({
      where: {
        khoachonglap: { startsWith: 'HOME:' },
        trangthaidonhang: pending,
        thoigianhethangiucho: { lte: now },
        ...(orderIds ? { madonhang: { in: orderIds } } : {}),
      },
      select: { madonhang: true },
    });
    const ids = expired.map((row) => row.madonhang);
    if (ids.length) {
      await tx.don_hang.updateMany({
        where: { madonhang: { in: ids }, trangthaidonhang: pending },
        data: { trangthaidonhang: 'HetHanThanhToan', thoigiancapnhat: now },
      });
      await this.releaseOrders(tx, ids, 'HetHan');
    }
    if (orderIds) return;
    await tx.ghe_chuyen.updateMany({
      where: {
        trangthaighe: 'DangGiu',
        madonhanggiu: null,
        giuchoden: { lte: now },
      },
      data: {
        trangthaighe: 'Trong',
        sessiongiucho: null,
        nguoigiughe: null,
        giuchoden: null,
        thoigiancapnhat: now,
      },
    });
  }
  private async releaseOrders(
    tx: Tx,
    ids: string[],
    paymentState: 'DaHuy' | 'HetHan',
  ) {
    const now = new Date();
    await tx.ghe_chuyen.updateMany({
      where: { madonhanggiu: { in: ids }, trangthaighe: 'DangGiu' },
      data: {
        trangthaighe: 'Trong',
        madonhanggiu: null,
        sessiongiucho: null,
        giuchoden: null,
        nguoigiughe: null,
        thoigiancapnhat: now,
      },
    });
    const uses = await tx.su_dung_khuyen_mai.findMany({
      where: { madonhang: { in: ids }, trangthai: 'DangGiu' },
      select: { mavoucherkhachhang: true },
    });
    await tx.su_dung_khuyen_mai.updateMany({
      where: { madonhang: { in: ids }, trangthai: 'DangGiu' },
      data: {
        trangthai: 'DaGiaiPhong',
        thoigiangiaiphong: now,
        thoigiancapnhat: now,
      },
    });
    const wallets = uses.flatMap((row) =>
      row.mavoucherkhachhang ? [row.mavoucherkhachhang] : [],
    );
    if (wallets.length)
      await tx.voucher_khach_hang.updateMany({
        where: { mavoucherkhachhang: { in: wallets }, trangthai: 'DangGiu' },
        data: { trangthai: 'SanSang', thoigiancapnhat: now },
      });
    await tx.thanh_toan.updateMany({
      where: {
        madonhang: { in: ids },
        trangthaithanhtoan: { in: ['ChoThanhToan', 'DangXuLy'] },
        maloi: null,
      },
      data: { trangthaithanhtoan: paymentState, thoigiancapnhat: now },
    });
  }
  private note(order: Order): OrderNote {
    try {
      const note = JSON.parse(order.ghichu ?? '') as OrderNote;
      if (
        note.home !== 1 ||
        !note.leg?.seats?.length ||
        !note.requestHash ||
        !note.seatPrices ||
        note.leg.seats.some(
          (id) =>
            !Number.isSafeInteger(note.seatPrices[id]) ||
            note.seatPrices[id] <= 0,
        ) ||
        note.leg.seats.reduce((sum, id) => sum + note.seatPrices[id], 0) !==
          Number(order.tonggiave)
      )
        throw new Error('note');
      return note;
    } catch {
      throw new ConflictException('Dữ liệu đơn cần được kiểm tra lại.');
    }
  }
  private async ownedOrder(tx: Tx, session: string, id: string) {
    const row = await tx.don_hang.findFirst({
      where: { madonhang: id, khoachonglap: { startsWith: prefix(session) } },
    });
    if (!row) throw new NotFoundException('Không tìm thấy đơn đặt vé.');
    if (row.loaichuyen === 'KhuHoiChieuVe' && row.madonhangkhuhoi) {
      const root = await tx.don_hang.findFirst({
        where: {
          madonhang: row.madonhangkhuhoi,
          khoachonglap: { startsWith: prefix(session) },
        },
      });
      if (!root) throw new NotFoundException('Không tìm thấy đơn đặt vé.');
      return root;
    }
    return row;
  }
  private async group(tx: Tx, root: Order) {
    const rows = [root];
    if (root.madonhangkhuhoi) {
      const other = await tx.don_hang.findUnique({
        where: { madonhang: root.madonhangkhuhoi },
      });
      if (
        !other ||
        other.khoachonglap.split(':')[1] !== root.khoachonglap.split(':')[1]
      )
        throw new ConflictException('Đơn khứ hồi không đồng nhất.');
      rows.push(other);
    }
    return rows;
  }
  private async orderResponse(
    tx: Tx,
    root: Order,
    session: string,
    detailOrders?: Order[],
  ) {
    const orders = detailOrders ?? (await this.group(tx, root)),
      ids = orders.map((row) => row.madonhang);
    const tickets = await tx.ve_xe.findMany({
      where: { madonhang: { in: ids }, trangthaive: { not: 'DaHuy' } },
      select: {
        mave: true,
        madonhang: true,
        maghechuyen: true,
        tokentracuu: true,
        loaiphong: true,
        giave: true,
        thoigianxuatve: true,
        phan_bo_thanh_toan_ve: { select: { sotienphanbo: true } },
        ghe_chuyen: { select: { ghe: { select: { soghe: true } } } },
      },
      orderBy: { mave: 'asc' },
    });
    const payment = await tx.thanh_toan.findFirst({
      where: { madonhang: root.madonhang, maloi: null },
      select: {
        mathamchieuyeucau: true,
        trangthaithanhtoan: true,
        phuongthucthanhtoan: true,
        mathanhtoan: true,
        thoigianthanhtoan: true,
        manhanvienthu: true,
      },
      orderBy: { thoigiantao: 'asc' },
    });
    const legs = [];
    const detailTrips = detailOrders
      ? await readOrderDetailTrips(
          tx,
          orders.map((row) => row.malichtrinh),
        )
      : null;
    for (const row of orders) {
      const trip = detailTrips
        ? (detailTrips.get(row.malichtrinh) ?? null)
        : await readTrip(tx, row.malichtrinh);
      const leg = this.note(row).leg;
      legs.push({
        tripId: leg.tripId,
        seats: leg.seats,
        doubleSeats: leg.doubleSeats,
        pickupId: leg.pickupId,
        dropoffId: leg.dropoffId,
        orderId: row.madonhang,
        trip: trip ? this.home.tripResponse(trip, session) : null,
        subtotal: Number(row.tonggiave),
        discount: Number(row.sotiengiam),
        total: Number(row.tongthanhtoan),
        seatPrices: this.note(row).seatPrices,
      });
    }
    return {
      id: root.madonhang,
      orderStatus: root.trangthaidonhang,
      source: root.nguondat,
      staffId: root.manhanvien,
      customerId: root.makhachhang,
      note: this.note(root).note ?? '',
      status:
        orders.some((row) => row.trangthaidonhang === 'HuyMotPhan') ||
        (orders.some((row) => row.trangthaidonhang === 'DaThanhToan') &&
          orders.some((row) => row.trangthaidonhang !== 'DaThanhToan'))
          ? 'partially_cancelled'
          : orders.every((row) => row.trangthaidonhang === 'DaThanhToan')
            ? 'paid'
            : orders.some((row) => row.trangthaidonhang === 'HetHanThanhToan')
              ? 'expired'
              : orders.some((row) => row.trangthaidonhang === 'DaHuy')
                ? 'cancelled'
                : 'pending',
      createdAt: root.thoigiantao.toISOString(),
      expiresAt: root.thoigianhethangiucho.toISOString(),
      serverTime: new Date().toISOString(),
      passenger: {
        name: root.hotennguoidat,
        phone: root.sodienthoainguoidat,
        email: root.emailnguoidat,
      },
      legs,
      subtotal: orders.reduce((sum, row) => sum + Number(row.tonggiave), 0),
      discount: orders.reduce((sum, row) => sum + Number(row.sotiengiam), 0),
      total: orders.reduce((sum, row) => sum + Number(row.tongthanhtoan), 0),
      method: payment?.phuongthucthanhtoan === 'VIETQR' ? 'vietqr' : 'counter',
      paymentCode: payment?.mathamchieuyeucau,
      paymentStatus: payment?.trangthaithanhtoan,
      paymentId: payment?.mathanhtoan,
      paidAt: payment?.thoigianthanhtoan?.toISOString() ?? null,
      collectedBy: payment?.manhanvienthu ?? null,
      requiresReview: !!(await tx.thanh_toan.count({
        where: {
          madonhang: { in: ids },
          trangthaithanhtoan: 'DangXuLy',
          maloi: { not: null },
        },
      })),
      tickets: tickets.map((row) => ({
        id: row.mave,
        orderId: row.madonhang,
        seatId: row.maghechuyen,
        seat: row.ghe_chuyen.ghe.soghe,
        roomType: row.loaiphong,
        token: row.tokentracuu,
        qrValue: row.tokentracuu,
        price: Number(row.giave),
        paidAmount: row.phan_bo_thanh_toan_ve.reduce(
          (sum, allocation) => sum + Number(allocation.sotienphanbo),
          0,
        ),
        issuedAt: row.thoigianxuatve?.toISOString() ?? null,
      })),
    };
  }
  private async confirm(
    tx: Tx,
    orders: Order[],
    paymentId: string,
    session: string,
    receivedAt: Date,
    eventKey: string,
    actor?: { id: string; staffId: string },
  ) {
    const now = new Date(),
      total = orders.reduce((sum, row) => sum + Number(row.tongthanhtoan), 0);
    for (const order of orders) {
      const note = this.note(order),
        seats = await tx.ghe_chuyen.findMany({
          where: {
            maghechuyen: { in: note.leg.seats },
            madonhanggiu: order.madonhang,
            sessiongiucho: session,
            trangthaighe: 'DangGiu',
            giuchoden: { gt: now },
          },
        });
      if (seats.length !== note.leg.seats.length)
        throw new ConflictException('Ghế không còn được giữ cho đơn.');
      let allocatedDiscount = 0;
      for (let index = 0; index < seats.length; index++) {
        const seat = seats[index],
          isDouble = note.leg.doubleSeats.includes(seat.maghechuyen),
          fare = note.seatPrices[seat.maghechuyen],
          discount =
            index === seats.length - 1
              ? Number(order.sotiengiam) - allocatedDiscount
              : Math.floor(
                  (Number(order.sotiengiam) * fare) / Number(order.tonggiave),
                );
        allocatedDiscount += discount;
        const token = randomBytes(32).toString('hex');
        const ticket = await tx.ve_xe.create({
          data: {
            mave: await nextBusinessId(tx, 'VE'),
            madonhang: order.madonhang,
            maghechuyen: seat.maghechuyen,
            hotenhanhkhach: order.hotennguoidat,
            sodienthoaihanhkhach: order.sodienthoainguoidat,
            loaiphong: isDouble
              ? 'PhongDoi'
              : (
                    await tx.ghe.findUniqueOrThrow({
                      where: { maghe: seat.maghe },
                      select: { loaighe: true },
                    })
                  ).loaighe.startsWith('Cabin')
                ? 'PhongDon'
                : 'KhongApDung',
            giave: fare,
            tienbaohiem: 0,
            maqrve: token,
            tokentracuu: token,
            madiemdon: order.madiemdon,
            madiemtra: order.madiemtra,
            thoigianxuatve: now,
            trangthaive: 'ChoKhoiHanh',
            thoigiantao: now,
            thoigiancapnhat: now,
          },
        });
        await tx.phan_bo_thanh_toan_ve.create({
          data: {
            mathanhtoan: paymentId,
            mave: ticket.mave,
            sotienphanbo: fare - discount,
            thoigiantao: now,
          },
        });
      }
      await tx.ghe_chuyen.updateMany({
        where: {
          maghechuyen: { in: note.leg.seats },
          madonhanggiu: order.madonhang,
          sessiongiucho: session,
          trangthaighe: 'DangGiu',
        },
        data: {
          trangthaighe: 'DaBan',
          sessiongiucho: null,
          nguoigiughe: null,
          giuchoden: null,
          thoigiancapnhat: now,
        },
      });
      await tx.don_hang.update({
        where: { madonhang: order.madonhang },
        data: { trangthaidonhang: 'DaThanhToan', thoigiancapnhat: now },
      });
    }
    const usage = await tx.su_dung_khuyen_mai.findMany({
      where: {
        madonhang: { in: orders.map((row) => row.madonhang) },
        trangthai: 'DangGiu',
      },
    });
    for (const row of usage) {
      await tx.su_dung_khuyen_mai.update({
        where: { masudungkhuyenmai: row.masudungkhuyenmai },
        data: {
          trangthai: 'DaSuDung',
          thoigiansudung: now,
          thoigiancapnhat: now,
        },
      });
      await tx.khuyen_mai.update({
        where: { makhuyenmai: row.makhuyenmai },
        data: { soluongdadung: { increment: 1 }, thoigiancapnhat: now },
      });
      if (row.mavoucherkhachhang)
        await tx.voucher_khach_hang.update({
          where: { mavoucherkhachhang: row.mavoucherkhachhang },
          data: { trangthai: 'DaDung', thoigiancapnhat: now },
        });
    }
    await tx.thanh_toan.update({
      where: { mathanhtoan: paymentId },
      data: {
        trangthaithanhtoan: 'ThanhCong',
        manhanvienthu: actor?.staffId,
        sotienthanhtoan: total,
        thoigianthanhtoan: receivedAt,
        thoigiancapnhat: now,
      },
    });
    await tx.nhat_ky_he_thong.create({
      data: {
        manhatky: await nextBusinessId(tx, 'NK'),
        hanhdong: actor
          ? 'XacNhanThuTienTaiQuay'
          : eventKey.startsWith('SEPAY:')
            ? 'XacNhanThanhToanOnline'
            : 'XacNhanDonMienPhi',
        mataikhoan: actor?.id,
        manhanvien: actor?.staffId,
        banglienquan: 'don_hang',
        madoituong: orders[0].madonhang,
        tendoituong: orders[0].madonhang,
        loaidoituong: 'DonHang',
        trangthai: 'ThanhCong',
        thoigian: now,
        chitiet: eventKey + ' / ' + total + ' VND',
      },
    });
  }
  private async write<T>(operation: (tx: Tx) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 30000,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ['P2034', 'P2002'].includes(error.code)
        ) {
          if (attempt < 2) continue;
          throw new ConflictException(
            'Yêu cầu đang được xử lý. Vui lòng thử lại.',
          );
        }
        throw error;
      }
    }
    throw new ConflictException('Vui lòng thử lại.');
  }
}
