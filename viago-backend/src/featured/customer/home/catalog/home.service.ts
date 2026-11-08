import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../prisma/prisma.service';
import { CustomerNewsService } from '../../news/news.service';
import { PublicNewsQueryDto } from '../../news/news.dto';
import {
  HomePageDto,
  HomeRoutesDto,
  HomeTripsDto,
  HomeWeatherDto,
  pageInfo,
  todayVN,
  VEHICLES,
} from '../common/home.dto';
import { HomePromotionsService } from '../promotions/promotions.service';

export const tripSelect = {
  malichtrinh: true,
  matuyenduong: true,
  thoigiankhoihanh: true,
  thoigiandendukien: true,
  thoigiandongbanve: true,
  songaymobantruoc: true,
  thoigiangiuchophut: true,
  giavecoso: true,
  trangthai: true,
  tuyen_xe: {
    select: {
      matuyenduong: true,
      tentuyen: true,
      diemdi: true,
      diemden: true,
      khoangcach: true,
      thoigiandichuyenphut: true,
      trangthai: true,
      anhtuyen: true,
    },
  },
  xe: {
    select: {
      loaixe: true,
      tiennghi: true,
      anhxe: true,
      trangthai: true,
      masodoghe: true,
    },
  },
  ghe_chuyen: {
    select: {
      maghechuyen: true,
      giaghe: true,
      trangthaighe: true,
      giuchoden: true,
      sessiongiucho: true,
      madonhanggiu: true,
      ghe: {
        select: {
          maghe: true,
          soghe: true,
          tang: true,
          hang: true,
          day: true,
          loaighe: true,
          trangthai: true,
          thutuhienthi: true,
          masodoghe: true,
        },
      },
      _count: {
        select: { ve_xe: { where: { trangthaive: { not: 'DaHuy' } } } },
      },
    },
  },
  lich_trinh_diem: {
    orderBy: { thutu: 'asc' },
    select: {
      madiem: true,
      loaidiemtuyen: true,
      thutu: true,
      thoigiandukien: true,
      diem_don_tra: {
        select: {
          tendiem: true,
          diachi: true,
          loaidiem: true,
          linkbando: true,
          trangthai: true,
        },
      },
    },
  },
} satisfies Prisma.lich_trinhSelect;
export type HomeTrip = Prisma.lich_trinhGetPayload<{
  select: typeof tripSelect;
}>;
export type HomeSeat = HomeTrip['ghe_chuyen'][number];
export const normalizedCity = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/^(?:tphcm|hcm|tphochiminh|thanhphohochiminh)$/, 'hochiminh');
export const readTrip = (tx: Prisma.TransactionClient, id: string) =>
  tx.lich_trinh.findUnique({ where: { malichtrinh: id }, select: tripSelect });
export function tripIsOpen(trip: HomeTrip, now = new Date()) {
  return (
    trip.trangthai === 'DangMoBan' &&
    trip.tuyen_xe.trangthai === 'HoatDong' &&
    trip.xe.trangthai === 'DangHoatDong' &&
    trip.thoigiankhoihanh > now &&
    trip.thoigiandongbanve > now &&
    trip.thoigiankhoihanh.getTime() - trip.songaymobantruoc * 86400000 <=
      now.getTime()
  );
}
export function seatState(
  seat: HomeSeat,
  trip: HomeTrip,
  session?: string,
  now = new Date(),
) {
  if (seat._count.ve_xe || seat.trangthaighe === 'DaBan') return 'sold';
  if (
    seat.ghe.trangthai !== 'HoatDong' ||
    seat.trangthaighe === 'Khoa' ||
    !trip.xe.masodoghe ||
    seat.ghe.masodoghe !== trip.xe.masodoghe
  )
    return 'locked';
  if (
    seat.trangthaighe === 'DangGiu' &&
    (!seat.giuchoden || seat.giuchoden > now)
  )
    return session && seat.sessiongiucho === session ? 'selected' : 'held';
  return 'available';
}

@Injectable()
export class CustomerHomeService {
  private readonly weatherCache = new Map<
    string,
    {
      at: number;
      data: {
        min: number;
        max: number;
        rain: number;
        code: number;
        date: string;
      };
    }
  >();
  constructor(
    private readonly prisma: PrismaService,
    private readonly news: CustomerNewsService,
    private readonly promotions: HomePromotionsService,
  ) {}

  options() {
    return {
      today: todayVN(),
      maxSeatsPerOrder: 5,
      maxRoundTripSeatsPerLeg: 2,
      maximumHoldMinutes: 10,
      vehicleTypes: Object.entries(VEHICLES).map(([code, label]) => ({
        code,
        label,
      })),
      sorts: [
        { code: 'early', label: 'Giờ đi sớm nhất' },
        { code: 'late', label: 'Giờ đi muộn nhất' },
        { code: 'price', label: 'Giá thấp nhất' },
      ],
      paymentMethods: [
        {
          id: 'vietqr',
          name: 'VietQR / Chuyển khoản',
          configured: !!(
            process.env.VIETQR_BANK_ID &&
            process.env.VIETQR_ACCOUNT_NO &&
            process.env.VIETQR_ACCOUNT_NAME &&
            process.env.SEPAY_BANK_NAME &&
            process.env.SEPAY_WEBHOOK_API_KEY &&
            process.env.SEPAY_WEBHOOK_API_KEY.length >= 32
          ),
        },
      ],
      termsPath: '/customer/dieu-khoan',
      policiesPath: '/customer/chinh-sach',
    };
  }
  async overview() {
    const [cities, routes, promotions, news, reviews] = await Promise.all([
      this.cities(),
      this.routes(Object.assign(new HomeRoutesDto(), { pageSize: 3 })),
      this.promotions.list(Object.assign(new HomePageDto(), { pageSize: 3 })),
      this.latestNews(3),
      this.reviews(Object.assign(new HomePageDto(), { pageSize: 3 })),
    ]);
    return {
      banners: [1, 2, 3].map((index) => ({
        id: String(index),
        image: `/assets/customer/hero_banner_${index}.png`,
        alt: 'Hành trình cùng VIAGO Express',
      })),
      cities: cities.data,
      featuredRoutes: routes.data,
      promotions: promotions.data,
      latestNews: news.data,
      reviews: reviews.data,
      reviewStatistics: reviews.statistics,
      booking: this.options(),
    };
  }
  async cities() {
    const rows = await this.prisma.tuyen_xe.findMany({
      where: { trangthai: 'HoatDong' },
      select: { diemdi: true, diemden: true },
    });
    return {
      data: [...new Set(rows.flatMap((row) => [row.diemdi, row.diemden]))].sort(
        (a, b) => a.localeCompare(b, 'vi'),
      ),
    };
  }
  async routes(query: HomeRoutesDto) {
    const where: Prisma.tuyen_xeWhereInput = {
      trangthai: 'HoatDong',
      ...(query.search && {
        OR: ['tentuyen', 'diemdi', 'diemden'].map((field) => ({
          [field]: { contains: query.search, mode: 'insensitive' },
        })),
      }),
    };
    return this.prisma.$transaction(
      async (tx) => {
        const total = await tx.tuyen_xe.count({ where });
        const rows = await tx.tuyen_xe.findMany({
          where,
          select: {
            matuyenduong: true,
            tentuyen: true,
            diemdi: true,
            diemden: true,
            khoangcach: true,
            thoigiandichuyenphut: true,
            giacoso: true,
            anhtuyen: true,
            _count: {
              select: {
                lich_trinh: {
                  where: {
                    trangthai: 'DangMoBan',
                    thoigiankhoihanh: { gt: new Date() },
                    thoigiandongbanve: { gt: new Date() },
                  },
                },
              },
            },
          },
          orderBy: [{ sochuyenmoingay: 'desc' }, { matuyenduong: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return {
          data: rows.map((row) => ({
            id: row.matuyenduong,
            title: row.tentuyen,
            from: row.diemdi,
            to: row.diemden,
            distance: Number(row.khoangcach),
            durationMinutes: row.thoigiandichuyenphut,
            price: Number(row.giacoso),
            image: row.anhtuyen,
            scheduledTrips: row._count.lich_trinh,
          })),
          pagination: pageInfo(query, total),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  latestNews(limit: number) {
    return this.news.findAll(
      Object.assign(new PublicNewsQueryDto(), { pageSize: limit }),
    );
  }
  async reviews(query: HomePageDto) {
    const where: Prisma.danh_giaWhereInput = {
      trangthai: 'HienThi',
      ve_xe: { trangthaive: { not: 'DaHuy' } },
    };
    return this.prisma.$transaction(
      async (tx) => {
        const stats = await tx.danh_gia.aggregate({
          where,
          _count: true,
          _avg: { diemtongquat: true },
        });
        const rows = await tx.danh_gia.findMany({
          where,
          select: {
            madanhgia: true,
            diemtongquat: true,
            tieude: true,
            noidung: true,
            thoigiandanhgia: true,
            noidungphanhoi: true,
            ve_xe: {
              select: {
                hotenhanhkhach: true,
                don_hang: {
                  select: {
                    lich_trinh: {
                      select: {
                        tuyen_xe: { select: { diemdi: true, diemden: true } },
                      },
                    },
                  },
                },
              },
            },
            tep_danh_gia: {
              where: { trangthai: 'HienThi' },
              select: { duongdantep: true, loaitep: true },
              orderBy: { thutuhienthi: 'asc' },
              take: 5,
            },
          },
          orderBy: [{ thoigiandanhgia: 'desc' }, { madanhgia: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return {
          data: rows.map((row) => {
            const names = row.ve_xe.hotenhanhkhach.trim().split(/\s+/);
            const route = row.ve_xe.don_hang.lich_trinh.tuyen_xe;
            return {
              id: row.madanhgia,
              rating: row.diemtongquat,
              title: row.tieude,
              content: row.noidung,
              author: names
                .map((name, index) =>
                  index === names.length - 1 ? name : name[0] + '.',
                )
                .join(' '),
              createdAt: row.thoigiandanhgia.toISOString(),
              reply: row.noidungphanhoi,
              route: { from: route.diemdi, to: route.diemden },
              media: row.tep_danh_gia.map((item) => ({
                url: item.duongdantep,
                type: item.loaitep,
              })),
            };
          }),
          pagination: pageInfo(query, stats._count),
          statistics: {
            total: stats._count,
            averageRating: stats._avg.diemtongquat,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async search(query: HomeTripsDto, session?: string) {
    if (normalizedCity(query.from) === normalizedCity(query.to))
      throw new BadRequestException('Điểm đi và điểm đến phải khác nhau.');
    if (
      query.date < todayVN() ||
      query.date > todayVN(new Date(Date.now() + 365 * 86400000))
    )
      throw new BadRequestException('Ngày khởi hành phải trong 365 ngày tới.');
    if (
      query.roundTrip &&
      (!query.returnDate ||
        query.returnDate < query.date ||
        query.returnDate > todayVN(new Date(Date.now() + 365 * 86400000)) ||
        query.count > 2)
    )
      throw new BadRequestException(
        'Kiểm tra ngày về và số ghế khứ hồi (tối đa 2 ghế mỗi chiều).',
      );
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    )
      throw new BadRequestException('Khoảng giá không hợp lệ.');
    const routes = await this.prisma.tuyen_xe.findMany({
      where: { trangthai: 'HoatDong' },
      select: { matuyenduong: true, diemdi: true, diemden: true },
    });
    const find = (from: string, to: string, date: string) =>
      this.searchLeg(
        query,
        routes
          .filter(
            (row) =>
              normalizedCity(row.diemdi) === normalizedCity(from) &&
              normalizedCity(row.diemden) === normalizedCity(to),
          )
          .map((row) => row.matuyenduong),
        date,
        session,
      );
    const outbound = await find(query.from, query.to, query.date);
    return {
      outbound,
      ...(query.roundTrip && {
        inbound: await find(query.to, query.from, query.returnDate!),
      }),
      serverTime: new Date().toISOString(),
    };
  }
  private async searchLeg(
    query: HomeTripsDto,
    routeIds: string[],
    date: string,
    session?: string,
  ) {
    if (!routeIds.length) return { data: [], pagination: pageInfo(query, 0) };
    const start = new Date(date + 'T00:00:00+07:00'),
      now = new Date();
    const conditions = [
      Prisma.sql`l.matuyenduong IN (${Prisma.join(routeIds)})`,
      Prisma.sql`l.trangthai='DangMoBan' AND x.trangthai='DangHoatDong' AND l.thoigiankhoihanh > ${now} AND l.thoigiandongbanve > ${now}`,
      Prisma.sql`l.thoigiankhoihanh BETWEEN ${start} AND ${new Date(start.getTime() + 86400000 - 1)}`,
      Prisma.sql`l.thoigiankhoihanh - l.songaymobantruoc * INTERVAL '1 day' <= ${now}`,
    ];
    if (query.type) conditions.push(Prisma.sql`x.loaixe::text=${query.type}`);
    if (query.minPrice !== undefined)
      conditions.push(Prisma.sql`l.giavecoso>=${query.minPrice}`);
    if (query.maxPrice !== undefined)
      conditions.push(Prisma.sql`l.giavecoso<=${query.maxPrice}`);
    if (query.time !== 'all') {
      const range = (
        {
          morning: [6, 12],
          afternoon: [12, 18],
          evening: [18, 24],
          night: [0, 6],
        } as const
      )[query.time as 'morning'];
      conditions.push(
        Prisma.sql`EXTRACT(HOUR FROM l.thoigiankhoihanh AT TIME ZONE 'Asia/Ho_Chi_Minh')>=${range[0]} AND EXTRACT(HOUR FROM l.thoigiankhoihanh AT TIME ZONE 'Asia/Ho_Chi_Minh')<${range[1]}`,
      );
    }
    conditions.push(
      Prisma.sql`(SELECT count(*) FROM ghe_chuyen gc JOIN ghe g ON g.maghe=gc.maghe WHERE gc.malichtrinh=l.malichtrinh AND g.trangthai='HoatDong' AND g.masodoghe=x.masodoghe AND (gc.trangthaighe='Trong' OR (gc.trangthaighe='DangGiu' AND gc.giuchoden<=${now}) OR (gc.trangthaighe='DangGiu' AND gc.sessiongiucho=${session ?? ''} AND gc.giuchoden>${now})) AND NOT EXISTS (SELECT 1 FROM ve_xe v WHERE v.maghechuyen=gc.maghechuyen AND v.trangthaive<>'DaHuy'))>=${query.count}`,
    );
    const where = Prisma.join(conditions, ' AND '),
      order =
        query.sort === 'late'
          ? Prisma.sql`l.thoigiankhoihanh DESC`
          : query.sort === 'price'
            ? Prisma.sql`l.giavecoso ASC, l.thoigiankhoihanh ASC`
            : Prisma.sql`l.thoigiankhoihanh ASC`;
    return this.prisma.$transaction(
      async (tx) => {
        const [count] = await tx.$queryRaw<{ total: bigint }[]>(
          Prisma.sql`SELECT count(*) AS total FROM lich_trinh l JOIN xe x ON x.maxe=l.maxe WHERE ${where}`,
        );
        const ids = await tx.$queryRaw<{ malichtrinh: string }[]>(
          Prisma.sql`SELECT l.malichtrinh FROM lich_trinh l JOIN xe x ON x.maxe=l.maxe WHERE ${where} ORDER BY ${order}, l.malichtrinh ASC LIMIT ${query.pageSize} OFFSET ${(query.page - 1) * query.pageSize}`,
        );
        const rows = await tx.lich_trinh.findMany({
          where: { malichtrinh: { in: ids.map((item) => item.malichtrinh) } },
          select: tripSelect,
        });
        const mapped = new Map(
          rows.map((row) => [row.malichtrinh, this.tripResponse(row, session)]),
        );
        return {
          data: ids.map((item) => mapped.get(item.malichtrinh)!),
          pagination: pageInfo(query, Number(count.total)),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async trip(id: string, session?: string) {
    const row = await readTrip(this.prisma, id);
    if (!row || !tripIsOpen(row))
      throw new NotFoundException('Không tìm thấy chuyến đang mở bán.');
    return this.tripResponse(row, session);
  }
  tripResponse(row: HomeTrip, session?: string) {
    const seats = [...row.ghe_chuyen]
      .sort(
        (a, b) =>
          a.ghe.thutuhienthi - b.ghe.thutuhienthi ||
          a.maghechuyen.localeCompare(b.maghechuyen),
      )
      .map((seat) => ({
        id: seat.maghechuyen,
        label: seat.ghe.soghe,
        floor: seat.ghe.tang,
        row: seat.ghe.hang,
        column: seat.ghe.day,
        type: seat.ghe.loaighe,
        allowDouble: seat.ghe.loaighe === 'CabinDoi',
        price: Number(seat.giaghe),
        status: seatState(seat, row, session),
      }));
    const points = (kind: 'Don' | 'Tra') =>
      row.lich_trinh_diem
        .filter(
          (point) =>
            point.loaidiemtuyen === kind &&
            point.diem_don_tra.trangthai === 'HoatDong',
        )
        .map((point) => ({
          id: point.madiem,
          name: point.diem_don_tra.tendiem,
          address: point.diem_don_tra.diachi,
          at: point.thoigiandukien.toISOString(),
          kind:
            point.diem_don_tra.loaidiem === 'TrungChuyen'
              ? 'shuttle'
              : 'station',
          mapUrl: point.diem_don_tra.linkbando,
        }));
    return {
      id: row.malichtrinh,
      routeId: row.matuyenduong,
      from: row.tuyen_xe.diemdi,
      to: row.tuyen_xe.diemden,
      date: todayVN(row.thoigiankhoihanh),
      departureAt: row.thoigiankhoihanh.toISOString(),
      arrivalAt: row.thoigiandendukien.toISOString(),
      saleClosesAt: row.thoigiandongbanve.toISOString(),
      status: tripIsOpen(row) ? 'open' : 'closed',
      type: VEHICLES[row.xe.loaixe],
      typeCode: row.xe.loaixe,
      price: Number(row.giavecoso),
      distance: Number(row.tuyen_xe.khoangcach),
      image: row.xe.anhxe,
      seats: seats.map((s) => s.id),
      seatDetails: seats,
      availableSeats: seats.filter((s) =>
        ['available', 'selected'].includes(s.status),
      ).length,
      soldSeats: seats.filter((s) => s.status === 'sold').map((s) => s.id),
      pickup: points('Don'),
      dropoff: points('Tra'),
      amenities: row.xe.tiennghi,
      holdMinutes: Math.max(0, Math.min(10, row.thoigiangiuchophut)),
    };
  }
  async weather(query: HomeWeatherDto) {
    const coordinates: Record<string, [number, number]> = {
      hochiminh: [10.8231, 106.6297],
      cantho: [10.0452, 105.7469],
      vungtau: [10.346, 107.0843],
      dalat: [11.9404, 108.4583],
      nhatrang: [12.2388, 109.1967],
      buonmathuot: [12.6667, 108.05],
      rachgia: [10.0125, 105.0809],
      phanthiet: [10.9289, 108.1021],
      danang: [16.0544, 108.2022],
    };
    const coords = coordinates[normalizedCity(query.city)];
    if (
      !coords ||
      query.date < todayVN() ||
      query.date > todayVN(new Date(Date.now() + 15 * 86400000))
    )
      throw new BadRequestException(
        'Dự báo chưa khả dụng cho địa điểm/ngày đến.',
      );
    const key = query.city + '|' + query.date,
      cached = this.weatherCache.get(key);
    if (cached && Date.now() - cached.at < 600000) return cached.data;
    try {
      const params = new URLSearchParams({
        latitude: String(coords[0]),
        longitude: String(coords[1]),
        daily:
          'temperature_2m_min,temperature_2m_max,precipitation_probability_max,weather_code',
        timezone: 'Asia/Ho_Chi_Minh',
        start_date: query.date,
        end_date: query.date,
      });
      const response = await fetch(
        'https://api.open-meteo.com/v1/forecast?' + params,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!response.ok) throw new Error('weather');
      const body = (await response.json()) as {
        daily?: {
          temperature_2m_min?: number[];
          temperature_2m_max?: number[];
          precipitation_probability_max?: number[];
          weather_code?: number[];
          time?: string[];
        };
      };
      const d = body.daily,
        data = {
          min: d?.temperature_2m_min?.[0] as number,
          max: d?.temperature_2m_max?.[0] as number,
          rain: d?.precipitation_probability_max?.[0] as number,
          code: d?.weather_code?.[0] as number,
          date: d?.time?.[0] as string,
        };
      if (
        data.date !== query.date ||
        ![data.min, data.max, data.rain, data.code].every(Number.isFinite)
      )
        throw new Error('weather');
      if (this.weatherCache.size >= 500)
        this.weatherCache.delete(this.weatherCache.keys().next().value!);
      this.weatherCache.set(key, { at: Date.now(), data });
      return data;
    } catch {
      throw new ServiceUnavailableException(
        'Chưa tải được dự báo. Vui lòng thử lại.',
      );
    }
  }
}
