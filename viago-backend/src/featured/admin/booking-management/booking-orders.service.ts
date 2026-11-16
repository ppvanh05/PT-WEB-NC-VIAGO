import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { PrismaService } from '../../../prisma/prisma.service';
import { HomeBookingService } from '../../customer/home/booking/booking.service';
import type { CounterActor } from '../../customer/home/booking/counter.controller';
import { CustomerHomeService } from '../../customer/home/catalog/home.service';
import {
  inventoryResponse,
  readSeatInventory,
} from '../../customer/home/booking/seat-inventory';
import { HomeLegDto } from '../../customer/home/common/home.dto';
import {
  AdminCancelOrderDto,
  AdminConfirmPaymentDto,
  AdminCreateOrderDto,
  AdminHoldDto,
  AdminOrdersQueryDto,
  AdminQuoteDto,
} from './booking-orders.dto';

@Injectable()
export class AdminBookingOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly booking: HomeBookingService,
    private readonly home: CustomerHomeService,
  ) {}

  private session(actor: CounterActor, holdId: string) {
    // Scope each draft to its authenticated operator; separate tabs use separate UUIDs.
    return (
      'ADM' +
      createHash('sha256').update(actor.staffId).digest('hex').slice(0, 24) +
      holdId.replaceAll('-', '')
    );
  }
  options() {
    return this.home.options();
  }
  async seats(tripId: string) {
    const snapshot = await readSeatInventory(this.prisma, tripId);
    if (!snapshot) throw new NotFoundException('Không tìm thấy chuyến xe.');
    return inventoryResponse(snapshot);
  }
  async hold(actor: CounterActor, dto: AdminHoldDto) {
    const holdId = dto.holdId ?? randomUUID();
    const result = await this.booking.holdAdmin(
      this.session(actor, holdId),
      dto.tripId,
      dto.seatIds,
      actor,
    );
    return {
      holdId,
      tripId: dto.tripId,
      seatIds: dto.seatIds,
      releasedSeatIds: result.releasedSeatIds,
      expiresAt: result.expiresAt,
      serverTime: result.serverTime,
    };
  }
  release(actor: CounterActor, holdId: string) {
    return this.booking.release(this.session(actor, holdId));
  }

  private async leg(
    session: string,
    dto: AdminQuoteDto,
    key?: string,
  ): Promise<HomeLegDto> {
    // Replays must still work after payment, cancellation, or hold expiry.
    if (key) {
      const old = await this.prisma.don_hang.findUnique({
        where: { khoachonglap: 'HOME:' + session + ':' + key + ':0' },
      });
      if (old) {
        const saved = JSON.parse(old.ghichu ?? '{}') as { leg?: HomeLegDto };
        if (!saved.leg)
          throw new ConflictException('Dữ liệu đơn cần được kiểm tra lại.');
        return {
          tripId: saved.leg.tripId,
          seats: dto.seatIds ? [...dto.seatIds].sort() : saved.leg.seats,
          doubleSeats: dto.doubleSeatIds,
          pickupId: dto.pickupId,
          dropoffId: dto.dropoffId,
        };
      }
    }
    const seats = await this.prisma.ghe_chuyen.findMany({
      where: {
        sessiongiucho: session,
        trangthaighe: 'DangGiu',
        madonhanggiu: null,
        giuchoden: { gt: new Date() },
      },
      orderBy: { maghechuyen: 'asc' },
    });
    if (!seats.length || new Set(seats.map((s) => s.malichtrinh)).size !== 1)
      throw new ConflictException(
        'Không còn lượt giữ ghế hợp lệ. Vui lòng chọn lại ghế.',
      );
    if (
      dto.seatIds &&
      (dto.seatIds.length !== seats.length ||
        seats.some((seat) => !dto.seatIds!.includes(seat.maghechuyen)))
    )
      throw new ConflictException(
        'Lựa chọn ghế chưa được đồng bộ. Vui lòng xác nhận lại ghế.',
      );
    return {
      tripId: seats[0].malichtrinh,
      seats: seats.map((s) => s.maghechuyen),
      doubleSeats: dto.doubleSeatIds,
      pickupId: dto.pickupId,
      dropoffId: dto.dropoffId,
    };
  }
  async quote(actor: CounterActor, dto: AdminQuoteDto) {
    const session = this.session(actor, dto.holdId);
    const result = await this.booking.quote(
      session,
      {
        legs: [await this.leg(session, dto)],
        passenger: dto.customer,
        voucher: dto.voucherCode,
      },
      undefined,
      true,
    );
    return { ...result, insurance: 0 };
  }
  async create(actor: CounterActor, dto: AdminCreateOrderDto) {
    const session = this.session(actor, dto.holdId);
    const order = await this.booking.create(
      session,
      {
        legs: [await this.leg(session, dto, dto.idempotencyKey)],
        passenger: dto.customer,
        voucher: dto.voucherCode,
        method: dto.payment.method === 'VIETQR' ? 'vietqr' : 'counter',
        terms: true,
        key: dto.idempotencyKey,
      },
      undefined,
      {
        actor,
        source: dto.source,
        note: dto.note,
        expectedTotal: dto.expectedTotal,
        confirmReceived: dto.payment.confirmReceived,
      },
    );
    return this.response(order);
  }
  private async orderSession(id: string) {
    const row = await this.prisma.don_hang.findFirst({
      where: {
        madonhang: id,
        khoachonglap: { startsWith: 'HOME:ADM' },
        nguondat: { in: ['TaiQuay', 'Hotline'] },
      },
    });
    if (!row) throw new NotFoundException('Không tìm thấy đơn do admin tạo.');
    return row.khoachonglap.split(':')[1];
  }
  private response(order: Awaited<ReturnType<HomeBookingService['get']>>) {
    return {
      ...order,
      transfer:
        order.status === 'pending' && order.method === 'vietqr'
          ? this.booking.paymentInfo(order)
          : null,
    };
  }
  async get(id: string) {
    return this.response(await this.booking.getAdmin(id));
  }
  async confirm(actor: CounterActor, id: string, dto: AdminConfirmPaymentDto) {
    await this.orderSession(id);
    // The payment row and order lock make repeated confirmation idempotent.
    return this.response(
      await this.booking.confirmCounter(id, actor, dto.receivedAmount),
    );
  }
  async cancel(actor: CounterActor, id: string, dto: AdminCancelOrderDto) {
    const order = await this.booking.cancel(
      await this.orderSession(id),
      id,
      actor,
      dto.reason,
    );
    return this.response(order);
  }
  async list(query: AdminOrdersQueryDto) {
    await this.booking.cleanupExpired();
    const where = {
      khoachonglap: { startsWith: 'HOME:ADM' },
      ...(query.status === 'pending'
        ? {
            trangthaidonhang: {
              in: ['ChoThanhToanOnline', 'ChoThanhToanTrucTiep'] as (
                'ChoThanhToanOnline' | 'ChoThanhToanTrucTiep'
              )[],
            },
          }
        : {}),
      ...(query.search?.trim()
        ? {
            OR: ['madonhang', 'hotennguoidat', 'sodienthoainguoidat'].map(
              (key) => ({
                [key]: {
                  contains: query.search!.trim(),
                  mode: 'insensitive' as const,
                },
              }),
            ),
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.don_hang.count({ where }),
      this.prisma.don_hang.findMany({
        where,
        orderBy: { thoigiantao: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          madonhang: true,
          hotennguoidat: true,
          sodienthoainguoidat: true,
          trangthaidonhang: true,
          tongthanhtoan: true,
          thoigiandat: true,
          thoigianhethangiucho: true,
          nguondat: true,
          lich_trinh: {
            select: {
              thoigiankhoihanh: true,
              tuyen_xe: { select: { tentuyen: true } },
            },
          },
        },
      }),
    ]);
    return {
      data: rows.map((row) => ({
        id: row.madonhang,
        name: row.hotennguoidat,
        phone: row.sodienthoainguoidat,
        status: row.trangthaidonhang,
        total: Number(row.tongthanhtoan),
        createdAt: row.thoigiandat.toISOString(),
        expiresAt: row.thoigianhethangiucho.toISOString(),
        source: row.nguondat,
        route: row.lich_trinh.tuyen_xe.tentuyen,
        departureAt: row.lich_trinh.thoigiankhoihanh.toISOString(),
      })),
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }
}
