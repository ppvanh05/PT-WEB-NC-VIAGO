import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, trang_thai_khuyen_mai_enum } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  AssignedCustomerDto,
  CreatePromotionDto,
  DISCOUNT_TYPES,
  ListPromotionsDto,
  PromotionPaginationDto,
  PromotionStatus,
  PromotionStatusDto,
  ROUTE_SCOPES,
  UpdatePromotionDto,
  WEEKDAYS,
} from './promotions.dto';

const include = {
  khuyen_mai_hang: {
    include: {
      bang_hang_thanh_vien: { select: { mahang: true, tenhang: true } },
    },
  },
  khuyen_mai_tuyen_duong: {
    include: { tuyen_xe: { select: { matuyenduong: true, tentuyen: true } } },
  },
  voucher_khach_hang: {
    where: { trangthai: { not: 'ThuHoi' as const } },
    orderBy: [
      { thoigiancap: 'desc' as const },
      { mavoucherkhachhang: 'asc' as const },
    ],
    take: 2,
    include: {
      khach_hang: {
        select: { makhachhang: true, email: true, sodienthoai: true },
      },
    },
  },
  _count: {
    select: {
      su_dung_khuyen_mai: { where: { trangthai: 'DangGiu' as const } },
      voucher_khach_hang: { where: { trangthai: { not: 'ThuHoi' as const } } },
    },
  },
} satisfies Prisma.khuyen_maiInclude;
type Promotion = Prisma.khuyen_maiGetPayload<{ include: typeof include }>;
type Tx = Prisma.TransactionClient;
type Actor = { manhanvien: string; mataikhoan: string };
type Assignment = {
  customerId: string;
  contact: string;
  reason: string;
  note: string;
};
type Totals = {
  count: number;
  gross: Prisma.Decimal;
  discount: Prisma.Decimal;
};
const id = (prefix: string) =>
  prefix + randomUUID().replaceAll('-', '').toUpperCase();
const dateOnly = (value: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
const normalized = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/^hang\s+/, '')
    .trim();
const dbStatus = (value: string): trang_thai_khuyen_mai_enum =>
  value === 'paused'
    ? 'TamDung'
    : value === 'locked'
      ? 'NgungHoatDong'
      : 'HoatDong';
const zeroTotals = (): Totals => ({
  count: 0,
  gross: new Prisma.Decimal(0),
  discount: new Prisma.Decimal(0),
});

@Injectable()
export class AdminPromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListPromotionsDto) {
    const now = new Date();
    return this.prisma.$transaction(
      async (tx) => {
        const conditions: Prisma.khuyen_maiWhereInput[] = [];
        if (query.search)
          conditions.push({
            OR: [
              { magiamgia: { contains: query.search, mode: 'insensitive' } },
              { tenkhuyenmai: { contains: query.search, mode: 'insensitive' } },
              { mota: { contains: query.search, mode: 'insensitive' } },
            ],
          });
        if (query.tier && !['all', 'Tất cả'].includes(query.tier)) {
          const [tier] = await this.tiers(tx, [query.tier], false);
          conditions.push({
            OR: [
              {
                hangkhachapdung: { isEmpty: true },
                khuyen_mai_hang: { none: {} },
              },
              { hangkhachapdung: { has: tier } },
              { khuyen_mai_hang: { some: { mahang: tier } } },
            ],
          });
        }
        const where: Prisma.khuyen_maiWhereInput = {
          ...this.statusWhere(query.status, now),
          ...(query.discountType && {
            loaikhuyenmai: DISCOUNT_TYPES[query.discountType],
          }),
          ...(conditions.length && { AND: conditions }),
        };
        const total = await tx.khuyen_mai.count({ where });
        const orderBy: Prisma.khuyen_maiOrderByWithRelationInput =
          query.sort === 'code'
            ? { magiamgia: 'asc' }
            : { thoigiantao: query.sort === 'oldest' ? 'asc' : 'desc' };
        const rows = await tx.khuyen_mai.findMany({
          where,
          include,
          orderBy: [orderBy, { makhuyenmai: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        const totals = await this.usageTotals(
          tx,
          rows.map((row) => row.makhuyenmai),
        );
        return {
          data: rows.map((row) =>
            this.response(row, totals.get(row.makhuyenmai), now),
          ),
          pagination: this.pagination(query, total),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async findOne(promotionId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const promotion = await this.promotion(tx, promotionId);
        const totals = await this.usageTotals(tx, [promotionId]);
        return this.response(promotion, totals.get(promotionId));
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async statistics() {
    return this.prisma.$transaction(
      async (tx) => {
        const rows = await tx.khuyen_mai.findMany({
          select: {
            makhuyenmai: true,
            magiamgia: true,
            trangthai: true,
            ngaybatdau: true,
            ngayketthuc: true,
            soluongdadung: true,
          },
        });
        const now = new Date();
        const count = (state: PromotionStatus) =>
          rows.filter((row) => this.status(row, now) === state).length;
        const totals = await this.usageTotals(tx);
        const gross = [...totals.values()].reduce(
          (sum, item) => sum.plus(item.gross),
          new Prisma.Decimal(0),
        );
        const discount = [...totals.values()].reduce(
          (sum, item) => sum.plus(item.discount),
          new Prisma.Decimal(0),
        );
        const mostUsed = [...rows].sort(
          (a, b) =>
            b.soluongdadung - a.soluongdadung ||
            a.magiamgia.localeCompare(b.magiamgia),
        )[0];
        return {
          total: rows.length,
          running: count('running'),
          upcoming: count('upcoming'),
          paused: count('paused'),
          expired: count('expired'),
          locked: count('locked'),
          totalVoucherUsages: rows.reduce(
            (sum, row) => sum + row.soluongdadung,
            0,
          ),
          confirmedUsageCount: [...totals.values()].reduce(
            (sum, item) => sum + item.count,
            0,
          ),
          mostUsedVoucher:
            mostUsed && mostUsed.soluongdadung > 0
              ? `${mostUsed.magiamgia} (${mostUsed.soluongdadung} lượt)`
              : null,
          revenueGenerated: gross.toString(),
          totalDiscount: discount.toString(),
          netRevenue: gross.minus(discount).toString(),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async options() {
    const [tiers, routes] = await Promise.all([
      this.prisma.bang_hang_thanh_vien.findMany({
        where: { trangthai: 'HoatDong' },
        orderBy: { dieukienchitieutoithieu: 'asc' },
        include: {
          dac_quyen_hang_thanh_vien: {
            where: { trangthai: 'HoatDong' },
            orderBy: { thutuhienthi: 'asc' },
          },
        },
      }),
      this.prisma.tuyen_xe.findMany({
        where: { trangthai: 'HoatDong' },
        orderBy: { tentuyen: 'asc' },
        select: {
          matuyenduong: true,
          tentuyen: true,
          diemdi: true,
          diemden: true,
        },
      }),
    ]);
    return {
      memberTiers: tiers.map((tier) => ({
        id: tier.mahang,
        label: tier.tenhang,
        minSpend: tier.dieukienchitieutoithieu.toString(),
        minTickets: tier.dieukiensovetoithieu,
        pointsRate: tier.tyletichdiem.toString(),
        privileges: tier.dac_quyen_hang_thanh_vien.map((item) => ({
          title: item.tendacquyen,
          description: item.motadacquyen,
          icon: item.icon,
        })),
      })),
      routes: routes.map((route) => ({
        id: route.matuyenduong,
        label: route.tentuyen,
        from: route.diemdi,
        to: route.diemden,
      })),
      discountTypes: Object.keys(DISCOUNT_TYPES),
      daysOfWeek: WEEKDAYS,
    };
  }

  async promotionStatistics(promotionId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const promotion = await this.promotion(tx, promotionId);
        const totals =
          (await this.usageTotals(tx, [promotionId])).get(promotionId) ??
          zeroTotals();
        return {
          id: promotionId,
          code: promotion.magiamgia,
          usageCount: promotion.soluongdadung,
          confirmedUsageCount: totals.count,
          heldCount: promotion._count.su_dung_khuyen_mai,
          maxUsage: promotion.soluongtoida,
          revenueGenerated: totals.gross.toString(),
          totalDiscount: totals.discount.toString(),
          netRevenue: totals.gross.minus(totals.discount).toString(),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async usages(promotionId: string, query: PromotionPaginationDto) {
    return this.prisma.$transaction(
      async (tx) => {
        await this.promotion(tx, promotionId);
        const where = {
          makhuyenmai: promotionId,
          trangthai: 'DaSuDung' as const,
        };
        const total = await tx.su_dung_khuyen_mai.count({ where });
        const rows = await tx.su_dung_khuyen_mai.findMany({
          where,
          orderBy: [
            { thoigiansudung: { sort: 'desc', nulls: 'last' } },
            { masudungkhuyenmai: 'asc' },
          ],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
          include: {
            khach_hang: { select: { hotenkhachhang: true, email: true } },
            don_hang: { select: { _count: { select: { ve_xe: true } } } },
          },
        });
        return {
          data: rows.map((row) => ({
            id: row.masudungkhuyenmai,
            emailOrPhone: row.khach_hang?.email ?? row.sodienthoaiapdung,
            name: row.khach_hang?.hotenkhachhang ?? 'Khách lẻ',
            time: row.thoigiansudung?.toISOString() ?? null,
            tickets: row.don_hang?._count.ve_xe ?? 0,
            orderVal: row.giatritruocgiam.toString(),
            savedVal: row.sotiengiam.toString(),
            orderId: row.madonhang,
            rentalQuoteId: row.mabaogia,
          })),
          pagination: this.pagination(query, total),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async create(dto: CreatePromotionDto) {
    if (dto.startDate < dateOnly(new Date()))
      throw new BadRequestException(
        'Không thể tạo khuyến mãi bắt đầu trong quá khứ.',
      );
    return this.write(async (tx) => {
      const actor = await this.actor(tx, dto.maNhanVien);
      await this.uniqueCode(tx, dto.code);
      const config = await this.configuration(tx, dto);
      const now = new Date();
      const promotion = await tx.khuyen_mai.create({
        data: {
          ...config.data,
          makhuyenmai: id('KM'),
          nguoitao: actor.mataikhoan,
          thoigiantao: now,
          thoigiancapnhat: now,
        },
        include,
      });
      await this.links(
        tx,
        promotion.makhuyenmai,
        config.tierIds,
        config.routeIds,
      );
      await this.wallet(tx, undefined, promotion, config.assigned, actor, now);
      await this.audit(tx, actor, promotion, 'TaoKhuyenMai', now);
      return this.response(await this.promotion(tx, promotion.makhuyenmai));
    });
  }

  async update(promotionId: string, dto: UpdatePromotionDto) {
    const { maNhanVien, ...changes } = dto;
    if (!Object.values(changes).some((value) => value !== undefined))
      throw new BadRequestException(
        'Vui lòng gửi ít nhất một trường cần cập nhật.',
      );
    return this.write(async (tx) => {
      const current = await this.promotion(tx, promotionId);
      const actor = await this.actor(tx, maNhanVien);
      if (dto.code && dto.code !== current.magiamgia) {
        if (
          current.soluongdadung ||
          current._count.voucher_khach_hang ||
          (await tx.su_dung_khuyen_mai.count({
            where: { makhuyenmai: promotionId },
          }))
        ) {
          throw new ConflictException(
            'Không thể đổi mã voucher đã được cấp hoặc đã phát sinh sử dụng.',
          );
        }
        await this.uniqueCode(tx, dto.code, promotionId);
      }
      const config = await this.configuration(tx, dto, current);
      await this.validateLimits(tx, dto, current, config.data);
      const now = new Date();
      const promotion = await tx.khuyen_mai.update({
        where: { makhuyenmai: promotionId },
        data: {
          ...config.data,
          nguoicapnhat: actor.mataikhoan,
          thoigiancapnhat: now,
        },
        include,
      });
      await this.links(tx, promotionId, config.tierIds, config.routeIds);
      await this.wallet(tx, current, promotion, config.assigned, actor, now);
      await this.audit(tx, actor, promotion, 'CapNhatKhuyenMai', now);
      const totals = await this.usageTotals(tx, [promotionId]);
      return this.response(
        await this.promotion(tx, promotionId),
        totals.get(promotionId),
      );
    });
  }

  async updateStatus(promotionId: string, dto: PromotionStatusDto) {
    return this.write(async (tx) => {
      const current = await this.promotion(tx, promotionId);
      const actor = await this.actor(tx, dto.maNhanVien);
      const status = dbStatus(dto.status);
      let promotion = current;
      if (current.trangthai !== status) {
        const now = new Date();
        promotion = await tx.khuyen_mai.update({
          where: { makhuyenmai: promotionId },
          data: {
            trangthai: status,
            nguoicapnhat: actor.mataikhoan,
            thoigiancapnhat: now,
          },
          include,
        });
        await this.audit(tx, actor, promotion, 'DoiTrangThaiKhuyenMai', now);
      }
      const totals = await this.usageTotals(tx, [promotionId]);
      return this.response(promotion, totals.get(promotionId));
    });
  }

  private async configuration(
    tx: Tx,
    dto: CreatePromotionDto | UpdatePromotionDto,
    current?: Promotion,
  ) {
    const type = dto.discountType
      ? DISCOUNT_TYPES[dto.discountType]
      : current!.loaikhuyenmai;
    const value = dto.discountValue ?? Number(current?.giatrigiam ?? 0);
    if (type === 'PhanTram' && (value < 1 || value > 100))
      throw new BadRequestException('Giảm phần trăm phải từ 1 đến 100.');
    if (type === 'TruTienThang' && value <= 0)
      throw new BadRequestException('Giảm tiền cố định phải lớn hơn 0.');
    if (type === 'QuaTang' && value !== 0)
      throw new BadRequestException(
        'Quà tặng dùng discountValue bằng 0; mô tả quyền lợi trong description/benefitConfig.',
      );
    if (type !== 'PhanTram' && dto.maxDiscount != null)
      throw new BadRequestException('maxDiscount chỉ dùng cho giảm phần trăm.');
    const start = dto.startDate
      ? new Date(`${dto.startDate}T00:00:00+07:00`)
      : current!.ngaybatdau;
    const end = dto.endDate
      ? new Date(`${dto.endDate}T23:59:59.999+07:00`)
      : current!.ngayketthuc;
    if (end < start)
      throw new BadRequestException(
        'Ngày kết thúc phải từ ngày bắt đầu trở đi.',
      );
    const tierIds = await this.tiers(
      tx,
      dto.memberTiers ?? current?.hangkhachapdung ?? ['Tất cả'],
      dto.memberTiers !== undefined || !current,
    );
    const scope = dto.routesType
      ? ROUTE_SCOPES[dto.routesType]
      : (current?.phamvituyen ?? 'TatCa');
    const routeInput =
      dto.selectedRoutes ??
      (dto.routesType === 'all'
        ? []
        : (current?.khuyen_mai_tuyen_duong.map((link) => link.matuyenduong) ??
          []));
    if (scope === 'TatCa' && routeInput.length)
      throw new BadRequestException(
        'routesType=all không nhận danh sách tuyến riêng.',
      );
    if (scope !== 'TatCa' && !routeInput.length)
      throw new BadRequestException(
        'Phải chọn tuyến cho phạm vi specific/exclude.',
      );
    const routeIds =
      scope === 'TatCa'
        ? []
        : await this.routes(
            tx,
            routeInput,
            dto.selectedRoutes !== undefined || !current,
          );
    const first = dto.firstOrderOnly ?? current?.chiapdungdondautien ?? false;
    const birthday =
      dto.birthdayMonthOnly ?? current?.chiapdungthangsinhnhat ?? false;
    if (!birthday && dto.birthdayMonths?.length)
      throw new BadRequestException(
        'birthdayMonths chỉ dùng khi birthdayMonthOnly=true.',
      );
    const assigned =
      dto.assignedCustomer === null
        ? undefined
        : dto.assignedCustomer
          ? await this.assignment(tx, dto.assignedCustomer)
          : this.currentAssignment(current);
    if (
      Number(first) +
        Number(birthday) +
        Number(tierIds.length > 0) +
        Number(!!assigned) >
      1
    ) {
      throw new BadRequestException(
        'Chỉ chọn một nhóm mục tiêu: hạng, sinh nhật, lần đầu hoặc khách được cấp riêng.',
      );
    }
    if (dto.benefitConfig && JSON.stringify(dto.benefitConfig).length > 20000)
      throw new BadRequestException('benefitConfig quá lớn.');
    const benefit =
      dto.benefitConfig === undefined
        ? (current?.cauhinhquyenloi ?? null)
        : dto.benefitConfig;
    const data = {
      magiamgia: dto.code ?? current!.magiamgia,
      tenkhuyenmai: dto.name ?? current!.tenkhuyenmai,
      mota: dto.description ?? current?.mota ?? '',
      loaikhuyenmai: type,
      giatrigiam: new Prisma.Decimal(value),
      giamtoida:
        type === 'PhanTram'
          ? dto.maxDiscount === undefined
            ? (current?.giamtoida ?? null)
            : dto.maxDiscount
          : null,
      donhangtoithieu: new Prisma.Decimal(
        dto.minOrderValue ?? current?.donhangtoithieu ?? 0,
      ),
      phamvidichvu: dto.serviceScope ?? current?.phamvidichvu ?? 'DatVe',
      phamvituyen: scope,
      hangkhachapdung: tierIds,
      cacthangapdung: birthday
        ? (dto.birthdayMonths?.map(Number) ?? current?.cacthangapdung ?? [])
        : [],
      cacthuapdung: dto.daysOfWeek
        ? dto.daysOfWeek.map((day) => WEEKDAYS.indexOf(day) + 1)
        : (current?.cacthuapdung ?? []),
      ngaybatdau: start,
      ngayketthuc: end,
      soluongtoida:
        dto.maxUsage === undefined
          ? (current?.soluongtoida ?? null)
          : dto.maxUsage,
      gioihanmoikhach:
        dto.limitPerUser === undefined
          ? current
            ? current.gioihanmoikhach
            : 1
          : dto.limitPerUser,
      doituongtinhgioihan:
        dto.limitSubject ?? current?.doituongtinhgioihan ?? 'KhachHang',
      chiapdungdondautien: first,
      chiapdungthangsinhnhat: birthday,
      chidanhchokhachduoccap: !!assigned,
      yeucaugioithieu:
        dto.referralRequired ?? current?.yeucaugioithieu ?? false,
      yeucautheodoiemail:
        dto.emailFollowRequired ?? current?.yeucautheodoiemail ?? false,
      uutien: dto.priority
        ? dto.priority === 'high'
          ? ('Cao' as const)
          : ('BinhThuong' as const)
        : (current?.uutien ?? 'BinhThuong'),
      cauhinhquyenloi:
        benefit === null ? Prisma.DbNull : (benefit as Prisma.InputJsonObject),
      trangthai: dto.status
        ? dbStatus(dto.status)
        : (current?.trangthai ?? 'HoatDong'),
    };
    return { data, tierIds, routeIds, assigned };
  }

  private async tiers(tx: Tx, values: string[], active: boolean) {
    if (!values.length) return [];
    const all = values.filter((value) =>
      ['tat ca', 'all'].includes(normalized(value)),
    );
    if (all.length) {
      if (values.length !== 1)
        throw new BadRequestException(
          'Tất cả không được chọn cùng hạng cụ thể.',
        );
      return [];
    }
    const tiers = await tx.bang_hang_thanh_vien.findMany({
      where: active ? { trangthai: 'HoatDong' } : {},
      select: { mahang: true, tenhang: true },
    });
    return [
      ...new Set(
        values.map((value) => {
          const tier = tiers.find(
            (item) =>
              normalized(item.mahang) === normalized(value) ||
              normalized(item.tenhang) === normalized(value),
          );
          if (!tier)
            throw new BadRequestException(
              `Hạng thành viên không hợp lệ: ${value}.`,
            );
          return tier.mahang;
        }),
      ),
    ];
  }

  private async routes(tx: Tx, values: string[], active: boolean) {
    const routes = await tx.tuyen_xe.findMany({
      where: {
        ...(active && { trangthai: 'HoatDong' }),
        OR: [{ matuyenduong: { in: values } }, { tentuyen: { in: values } }],
      },
      select: { matuyenduong: true, tentuyen: true },
    });
    return [
      ...new Set(
        values.map((value) => {
          const matches = routes.filter(
            (item) => item.matuyenduong === value || item.tentuyen === value,
          );
          if (matches.length !== 1)
            throw new BadRequestException(
              `Tuyến không hợp lệ hoặc tên không duy nhất; hãy dùng mã tuyến: ${value}.`,
            );
          return matches[0].matuyenduong;
        }),
      ),
    ];
  }

  private async assignment(
    tx: Tx,
    dto: AssignedCustomerDto,
  ): Promise<Assignment> {
    const customers = await tx.khach_hang.findMany({
      where: {
        trangthai: 'HoatDong',
        OR: [
          { makhachhang: dto.emailOrPhone },
          { sodienthoai: dto.emailOrPhone },
          { email: { equals: dto.emailOrPhone, mode: 'insensitive' } },
        ],
      },
      take: 2,
      select: { makhachhang: true, sodienthoai: true, email: true },
    });
    if (customers.length !== 1)
      throw new BadRequestException(
        'Không tìm thấy khách đang hoạt động hoặc email không duy nhất; hãy dùng mã khách/số điện thoại.',
      );
    return {
      customerId: customers[0].makhachhang,
      contact: customers[0].email ?? customers[0].sodienthoai,
      reason: dto.reason,
      note: dto.note ?? '',
    };
  }

  private currentAssignment(current?: Promotion): Assignment | undefined {
    if (!current?.chidanhchokhachduoccap) return undefined;
    if (current.voucher_khach_hang.length !== 1)
      throw new ConflictException(
        'Chương trình cấp riêng cần đúng một voucher chưa thu hồi; hãy kiểm tra dữ liệu cấp voucher.',
      );
    const wallet = current.voucher_khach_hang[0];
    return {
      customerId: wallet.makhachhang,
      contact: wallet.khach_hang.email ?? wallet.khach_hang.sodienthoai,
      reason: wallet.lydocap ?? 'custom_compensation',
      note: wallet.ghichu ?? '',
    };
  }

  private async links(
    tx: Tx,
    promotionId: string,
    tierIds: string[],
    routeIds: string[],
  ) {
    await tx.khuyen_mai_hang.deleteMany({
      where: { makhuyenmai: promotionId },
    });
    await tx.khuyen_mai_tuyen_duong.deleteMany({
      where: { makhuyenmai: promotionId },
    });
    if (tierIds.length)
      await tx.khuyen_mai_hang.createMany({
        data: tierIds.map((mahang) => ({ makhuyenmai: promotionId, mahang })),
      });
    if (routeIds.length)
      await tx.khuyen_mai_tuyen_duong.createMany({
        data: routeIds.map((matuyenduong) => ({
          makhuyenmai: promotionId,
          matuyenduong,
        })),
      });
  }

  private async wallet(
    tx: Tx,
    current: Promotion | undefined,
    promotion: Promotion,
    assigned: Assignment | undefined,
    actor: Actor,
    now: Date,
  ) {
    const existing = current?.chidanhchokhachduoccap
      ? current.voucher_khach_hang
      : [];
    if (existing.length > 1)
      throw new ConflictException(
        'Không thể thay đổi chương trình đang cấp cho nhiều khách bằng form cấp riêng một khách.',
      );
    if (
      assigned &&
      current &&
      !current.chidanhchokhachduoccap &&
      current._count.voucher_khach_hang
    ) {
      throw new ConflictException(
        'Chương trình đã được khách lưu; hãy tạo chương trình riêng để cấp bù.',
      );
    }
    const old = existing[0];
    const changedTarget = old && old.makhachhang !== assigned?.customerId;
    if (changedTarget) {
      const used = await tx.su_dung_khuyen_mai.count({
        where: {
          mavoucherkhachhang: old.mavoucherkhachhang,
          trangthai: { in: ['DangGiu', 'DaSuDung'] },
        },
      });
      if (used || ['DangGiu', 'DaDung'].includes(old.trangthai))
        throw new ConflictException(
          'Không thể đổi/thu hồi khách được cấp khi voucher đang giữ hoặc đã dùng.',
        );
      await tx.voucher_khach_hang.update({
        where: { mavoucherkhachhang: old.mavoucherkhachhang },
        data: { trangthai: 'ThuHoi', thoigiancapnhat: now },
      });
    }
    if (!assigned) return;
    if (old?.makhachhang === assigned.customerId) {
      if (old.trangthai !== 'SanSang') {
        if (
          old.lydocap !== assigned.reason ||
          (old.ghichu ?? '') !== assigned.note
        )
          throw new ConflictException(
            'Không thể sửa nội dung cấp bù của voucher đang giữ hoặc đã dùng.',
          );
        return;
      }
      await tx.voucher_khach_hang.update({
        where: { mavoucherkhachhang: old.mavoucherkhachhang },
        data: {
          lydocap: assigned.reason,
          ghichu: assigned.note,
          thoigianbatdau: promotion.ngaybatdau,
          thoigianhethan: promotion.ngayketthuc,
          thoigiancapnhat: now,
        },
      });
      return;
    }
    await tx.voucher_khach_hang.create({
      data: {
        mavoucherkhachhang: id('VKH'),
        makhuyenmai: promotion.makhuyenmai,
        makhachhang: assigned.customerId,
        nguoncap: 'CapBu',
        lydocap: assigned.reason,
        ghichu: assigned.note,
        nguoicap: actor.mataikhoan,
        thoigiancap: now,
        thoigianbatdau: promotion.ngaybatdau,
        thoigianhethan: promotion.ngayketthuc,
        trangthai: 'SanSang',
        thoigiancapnhat: now,
      },
    });
  }

  private async validateLimits(
    tx: Tx,
    dto: UpdatePromotionDto,
    current: Promotion,
    data: {
      soluongtoida: number | null;
      gioihanmoikhach: number | null;
      doituongtinhgioihan: string;
    },
  ) {
    if (dto.maxUsage != null) {
      const used = await tx.su_dung_khuyen_mai.count({
        where: { makhuyenmai: current.makhuyenmai, trangthai: 'DaSuDung' },
      });
      const committed =
        Math.max(used, current.soluongdadung) +
        current._count.su_dung_khuyen_mai;
      if (dto.maxUsage < committed)
        throw new ConflictException(
          'Giới hạn tổng không được thấp hơn số đã dùng và đang giữ.',
        );
    }
    if (
      (dto.limitPerUser !== undefined || dto.limitSubject !== undefined) &&
      data.gioihanmoikhach !== null
    ) {
      const by =
        data.doituongtinhgioihan === 'KhachHang'
          ? 'makhachhang'
          : 'sodienthoaiapdung';
      const groups = await tx.su_dung_khuyen_mai.groupBy({
        by: [by],
        where: {
          makhuyenmai: current.makhuyenmai,
          trangthai: { in: ['DaSuDung', 'DangGiu'] },
          ...(by === 'makhachhang' && { makhachhang: { not: null } }),
        },
        _count: { _all: true },
      });
      if (groups.some((group) => group._count._all > data.gioihanmoikhach!))
        throw new ConflictException(
          'Giới hạn mỗi khách thấp hơn số đã dùng/đang giữ.',
        );
    }
  }

  private async uniqueCode(tx: Tx, code: string, except?: string) {
    const exists = await tx.khuyen_mai.findFirst({
      where: {
        magiamgia: { equals: code, mode: 'insensitive' },
        ...(except && { makhuyenmai: { not: except } }),
      },
      select: { makhuyenmai: true },
    });
    if (exists) throw new ConflictException('Mã voucher đã tồn tại.');
  }

  private async promotion(tx: Tx, promotionId: string) {
    const promotion = await tx.khuyen_mai.findUnique({
      where: { makhuyenmai: promotionId },
      include,
    });
    if (!promotion)
      throw new NotFoundException('Không tìm thấy chương trình khuyến mãi.');
    return promotion;
  }

  private async actor(tx: Tx, employeeId: string) {
    const actor = await tx.nhan_vien.findUnique({
      where: { manhanvien: employeeId },
      select: { manhanvien: true, mataikhoan: true, trangthai: true },
    });
    if (!actor || actor.trangthai !== 'HoatDong')
      throw new BadRequestException(
        'Mã nhân viên không tồn tại hoặc đã bị khóa.',
      );
    return actor;
  }

  private async usageTotals(tx: Tx, ids?: string[]) {
    const totals = new Map<string, Totals>();
    if (ids && !ids.length) return totals;
    const groups = await tx.su_dung_khuyen_mai.groupBy({
      by: ['makhuyenmai'],
      where: {
        trangthai: 'DaSuDung',
        ...(ids && { makhuyenmai: { in: ids } }),
      },
      _count: { _all: true },
      _sum: { giatritruocgiam: true, sotiengiam: true },
    });
    for (const group of groups)
      totals.set(group.makhuyenmai, {
        count: group._count._all,
        gross: group._sum.giatritruocgiam ?? new Prisma.Decimal(0),
        discount: group._sum.sotiengiam ?? new Prisma.Decimal(0),
      });
    return totals;
  }

  private status(
    row: {
      trangthai: trang_thai_khuyen_mai_enum;
      ngaybatdau: Date;
      ngayketthuc: Date;
    },
    now: Date,
  ): PromotionStatus {
    if (row.trangthai === 'NgungHoatDong') return 'locked';
    if (row.trangthai === 'TamDung') return 'paused';
    return now < row.ngaybatdau
      ? 'upcoming'
      : now > row.ngayketthuc
        ? 'expired'
        : 'running';
  }

  private statusWhere(
    status: string | undefined,
    now: Date,
  ): Prisma.khuyen_maiWhereInput {
    if (status === 'locked') return { trangthai: 'NgungHoatDong' };
    if (status === 'paused') return { trangthai: 'TamDung' };
    if (status === 'running')
      return {
        trangthai: 'HoatDong',
        ngaybatdau: { lte: now },
        ngayketthuc: { gte: now },
      };
    if (status === 'upcoming')
      return { trangthai: 'HoatDong', ngaybatdau: { gt: now } };
    if (status === 'expired')
      return { trangthai: 'HoatDong', ngayketthuc: { lt: now } };
    return { trangthai: { not: 'NgungHoatDong' } };
  }

  private response(row: Promotion, totals = zeroTotals(), now = new Date()) {
    const wallet = row.chidanhchokhachduoccap
      ? row.voucher_khach_hang[0]
      : undefined;
    return {
      id: row.makhuyenmai,
      code: row.magiamgia,
      name: row.tenkhuyenmai,
      description: row.mota ?? '',
      discountType: Object.keys(DISCOUNT_TYPES).find(
        (key) =>
          DISCOUNT_TYPES[key as keyof typeof DISCOUNT_TYPES] ===
          row.loaikhuyenmai,
      ),
      discountValue: Number(row.giatrigiam),
      maxDiscount: row.giamtoida === null ? null : Number(row.giamtoida),
      minOrderValue: Number(row.donhangtoithieu),
      serviceScope: row.phamvidichvu,
      memberTierIds: row.hangkhachapdung,
      memberTiers: row.khuyen_mai_hang.length
        ? row.khuyen_mai_hang.map((link) => link.bang_hang_thanh_vien.tenhang)
        : row.hangkhachapdung.length
          ? row.hangkhachapdung
          : ['Tất cả'],
      firstOrderOnly: row.chiapdungdondautien,
      birthdayMonthOnly: row.chiapdungthangsinhnhat,
      birthdayMonths: row.cacthangapdung.map((month) =>
        String(month).padStart(2, '0'),
      ),
      assignedCustomer: wallet
        ? {
            customerId: wallet.makhachhang,
            emailOrPhone:
              wallet.khach_hang.email ?? wallet.khach_hang.sodienthoai,
            reason: wallet.lydocap,
            note: wallet.ghichu ?? '',
            used: wallet.trangthai === 'DaDung',
            walletId: wallet.mavoucherkhachhang,
          }
        : null,
      issuedVoucherCount: row._count.voucher_khach_hang,
      routesType: Object.keys(ROUTE_SCOPES).find(
        (key) =>
          ROUTE_SCOPES[key as keyof typeof ROUTE_SCOPES] === row.phamvituyen,
      ),
      selectedRoutes: row.khuyen_mai_tuyen_duong.map(
        (link) => link.matuyenduong,
      ),
      routeLabels: row.khuyen_mai_tuyen_duong.map(
        (link) => link.tuyen_xe.tentuyen,
      ),
      startDate: dateOnly(row.ngaybatdau),
      endDate: dateOnly(row.ngayketthuc),
      daysOfWeek: row.cacthuapdung.map((day) => WEEKDAYS[day - 1]),
      referralRequired: row.yeucaugioithieu,
      emailFollowRequired: row.yeucautheodoiemail,
      priority: row.uutien === 'Cao' ? 'high' : 'normal',
      status: this.status(row, now),
      statusCode: row.trangthai,
      usageCount: row.soluongdadung,
      confirmedUsageCount: totals.count,
      heldCount: row._count.su_dung_khuyen_mai,
      maxUsage: row.soluongtoida,
      limitPerUser: row.gioihanmoikhach,
      limitSubject: row.doituongtinhgioihan,
      revenueGenerated: totals.gross.toString(),
      totalDiscount: totals.discount.toString(),
      benefitConfig: row.cauhinhquyenloi,
      createdAt: row.thoigiantao.toISOString(),
      updatedAt: row.thoigiancapnhat.toISOString(),
    };
  }

  private pagination(query: PromotionPaginationDto, total: number) {
    return {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  private audit(
    tx: Tx,
    actor: Actor,
    promotion: Promotion,
    action: string,
    now: Date,
  ) {
    return tx.nhat_ky_he_thong.create({
      data: {
        manhatky: id('NK'),
        mataikhoan: actor.mataikhoan,
        manhanvien: actor.manhanvien,
        hanhdong: action,
        banglienquan: 'khuyen_mai',
        madoituong: promotion.makhuyenmai,
        tendoituong: promotion.tenkhuyenmai,
        loaidoituong: 'KhuyenMai',
        trangthai: 'ThanhCong',
        thoigian: now,
        chitiet: `${action}: ${promotion.magiamgia} - ${promotion.tenkhuyenmai}`,
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
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034' && attempt < 2) continue;
          if (error.code === 'P2002')
            throw new ConflictException(
              'Mã voucher hoặc bản ghi cấp đã tồn tại.',
            );
          if (error.code === 'P2034')
            throw new ConflictException(
              'Dữ liệu vừa thay đổi. Vui lòng tải lại và thử lại.',
            );
          if (error.code === 'P2025')
            throw new NotFoundException(
              'Không tìm thấy khuyến mãi hoặc voucher.',
            );
          if (error.code === 'P2003')
            throw new BadRequestException(
              'Dữ liệu hạng, tuyến hoặc khách hàng tham chiếu không hợp lệ.',
            );
        }
        throw error;
      }
    }
    throw new ConflictException(
      'Không thể cập nhật khuyến mãi. Vui lòng thử lại.',
    );
  }
}
