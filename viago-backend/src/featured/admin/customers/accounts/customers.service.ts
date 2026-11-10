import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  AccountsAccess,
  Identity,
} from '../../../../shared/accounts/accounts-access';
import {
  calendarDate,
  hashPassword,
  newId,
  verifyPassword,
  supportedPasswordHash,
} from '../../../../shared/accounts/account-security';
import {
  CustomerCreateDto,
  CustomerUpdateDto,
  PageDto,
  StatusDto,
  AdminCustomerPasswordDto,
} from '../../../../shared/accounts/accounts.dto';
const includeCustomer = {
  bang_hang_thanh_vien: { select: { tenhang: true } },
  tai_khoan: {
    select: { trangthai: true, xacthuchailop: true, matkhauhash: true },
  },
  _count: { select: { don_hang: true } },
} satisfies Prisma.khach_hangInclude;
type Customer = Prisma.khach_hangGetPayload<{
  include: typeof includeCustomer;
}>;
function view(c: Customer, tickets = 0) {
  return {
    code: c.makhachhang,
    accountId: c.mataikhoan,
    passwordNeedsReset:
      !!c.tai_khoan && !supportedPasswordHash(c.tai_khoan.matkhauhash) &&
      !(process.env.NODE_ENV === 'development' &&
        process.env.CUSTOMER_ALLOW_LOCAL_SEED_LOGIN === 'true' &&
        /^HASH_MAU_\d{3}$/.test(c.tai_khoan.matkhauhash)),
    name: c.hotenkhachhang,
    phone: c.sodienthoai,
    email: c.email || '',
    gender: c.gioitinh,
    birthDate: c.ngaysinh?.toISOString().slice(0, 10) || '',
    occupation: c.nghenghiep || '',
    memberTier: c.bang_hang_thanh_vien?.tenhang || '',
    points: c.diemtichluy,
    status: c.trangthai,
    accountStatus: c.tai_khoan?.trangthai,
    avatar: c.anhdaidien || '',
    registeredAt: c.ngaydangky,
    orders: c._count.don_hang,
    tickets,
    type: c.mataikhoan ? 'HoiVien' : 'KhachVangLai',
    twoFA: c.tai_khoan?.xacthuchailop || false,
    lockReason: c.lydokhoa,
    lockedAt: c.ngaykhoa,
  };
}
@Injectable()
export class CustomersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccountsAccess,
  ) {}
  async password(
    id: string,
    dto: AdminCustomerPasswordDto,
    actor: Identity,
    req: Request,
  ) {
    const hash = await hashPassword(dto.newPassword);
    const result = await this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT mataikhoan FROM tai_khoan WHERE mataikhoan = ${actor.accountId} FOR UPDATE`;
        const admin = await tx.tai_khoan.findUniqueOrThrow({
          where: { mataikhoan: actor.accountId },
        });
        if (
          admin.vaitrotaikhoan !== 'NhanVien' ||
          admin.trangthai !== 'HoatDong' ||
          (admin.khoatamden && admin.khoatamden > new Date())
        )
          return null;
        if (!(await verifyPassword(dto.adminPassword, admin.matkhauhash))) {
          const attempts = (admin.khoatamden ? 0 : admin.solandangnhapsai) + 1;
          await tx.tai_khoan.update({
            where: { mataikhoan: actor.accountId },
            data: {
              solandangnhapsai: attempts,
              khoatamden: attempts >= 5 ? new Date(Date.now() + 900000) : null,
            },
          });
          await this.access.audit(
            tx,
            actor,
            req,
            'CUSTOMER_PASSWORD_RESET_FAILED',
            'khach_hang',
            id,
            'Xác nhận quản trị không thành công.',
            undefined,
            undefined,
            false,
          );
          return null;
        }
        const customer = await tx.khach_hang.findUniqueOrThrow({
            where: { makhachhang: id },
          }),
          now = new Date();
        const accountId = customer.mataikhoan || newId('TK');
        if (customer.mataikhoan) {
          const account = await tx.tai_khoan.findUniqueOrThrow({
            where: { mataikhoan: accountId },
          });
          if (account.vaitrotaikhoan !== 'KhachHang')
            throw new ConflictException(
              'Hồ sơ không liên kết tài khoản khách hàng hợp lệ.',
            );
          await tx.tai_khoan.update({
            where: { mataikhoan: accountId },
            data: {
              matkhauhash: hash,
              solandangnhapsai: 0,
              khoatamden: null,
              thoigiancapnhat: now,
            },
          });
        } else {
          await tx.tai_khoan.create({
            data: {
              mataikhoan: accountId,
              sodienthoai: customer.sodienthoai,
              email: customer.email,
              matkhauhash: hash,
              vaitrotaikhoan: 'KhachHang',
              trangthai: customer.trangthai,
              thoigiantao: now,
              thoigiancapnhat: now,
            },
          });
          await tx.khach_hang.update({
            where: { makhachhang: id },
            data: { mataikhoan: accountId, thoigiancapnhat: now },
          });
        }
        await tx.phien_dang_nhap.updateMany({
          where: { mataikhoan: accountId },
          data: { trangthai: 'DaDangXuat' },
        });
        await tx.otp.updateMany({
          where: { mataikhoan: accountId, dasudung: false },
          data: { dasudung: true, trangthai: 'Huy' },
        });
        await tx.tai_khoan.update({
          where: { mataikhoan: actor.accountId },
          data: { solandangnhapsai: 0, khoatamden: null },
        });
        await this.access.audit(
          tx,
          actor,
          req,
          'ADMIN_RESET_CUSTOMER_PASSWORD',
          'khach_hang',
          id,
          'Quản trị đặt mật khẩu mới và thu hồi phiên khách hàng.',
        );
        return { success: true, accountId };
      },
      { timeout: 15000 },
    );
    if (!result)
      throw new UnauthorizedException(
        'Mật khẩu quản trị không đúng hoặc tài khoản đang bị khóa tạm.',
      );
    return result;
  }
  async list(query: PageDto) {
    const where: Prisma.khach_hangWhereInput = {
      trangthai: query.status,
      gioitinh: query.gender,
      ...(query.search
        ? {
            OR: ['makhachhang', 'hotenkhachhang', 'sodienthoai', 'email'].map(
              (field) => ({
                [field]: { contains: query.search, mode: 'insensitive' },
              }),
            ),
          }
        : {}),
    };
    const [rows, total, active, locked] = await this.prisma.$transaction([
      this.prisma.khach_hang.findMany({
        where,
        include: includeCustomer,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: [{ ngaydangky: 'desc' }, { makhachhang: 'desc' }],
      }),
      this.prisma.khach_hang.count({ where }),
      this.prisma.khach_hang.count({ where: { trangthai: 'HoatDong' } }),
      this.prisma.khach_hang.count({ where: { trangthai: 'DaKhoa' } }),
    ]);
    const counts = rows.length
      ? await this.prisma.$queryRaw<{ id: string; count: number }[]>(
          Prisma.sql`SELECT d.makhachhang AS id, count(v.mave)::int AS count FROM don_hang d JOIN ve_xe v ON v.madonhang = d.madonhang WHERE d.makhachhang IN (${Prisma.join(rows.map((row) => row.makhachhang))}) GROUP BY d.makhachhang`,
        )
      : [];
    const tickets = new Map(counts.map((row) => [row.id, row.count]));
    return {
      items: rows.map((row) => view(row, tickets.get(row.makhachhang) || 0)),
      total,
      active,
      locked,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
  async options() {
    return {
      memberTiers: await this.prisma.bang_hang_thanh_vien.findMany({
        where: { trangthai: 'HoatDong' },
        select: {
          mahang: true,
          tenhang: true,
          dieukienchitieutoithieu: true,
          dieukiensovetoithieu: true,
        },
      }),
    };
  }
  async detail(id: string) {
    const customer = await this.prisma.khach_hang.findUnique({
      where: { makhachhang: id },
      include: includeCustomer,
    });
    if (!customer) throw new NotFoundException('Không tìm thấy khách hàng.');
    const tickets = await this.prisma.ve_xe.count({
      where: { don_hang: { makhachhang: id } },
    });
    return view(customer, tickets);
  }
  async create(dto: CustomerCreateDto, actor: Identity, req: Request) {
    const id = newId('KH'),
      now = new Date(),
      password = dto.password ? await hashPassword(dto.password) : undefined;
    const birthday = dto.birthday ? calendarDate(dto.birthday) : undefined;
    if (birthday && birthday > now)
      throw new BadRequestException('Ngày sinh không hợp lệ.');
    await this.prisma.$transaction(async (tx) => {
      if (
        dto.memberTierId &&
        !(await tx.bang_hang_thanh_vien.findFirst({
          where: { mahang: dto.memberTierId, trangthai: 'HoatDong' },
        }))
      )
        throw new BadRequestException('Hạng thành viên không hợp lệ.');
      const account = password
        ? await tx.tai_khoan.create({
            data: {
              mataikhoan: newId('TK'),
              sodienthoai: dto.phoneNumber,
              email:
                dto.email === undefined
                  ? undefined
                  : dto.email.toLowerCase() || null,
              matkhauhash: password,
              vaitrotaikhoan: 'KhachHang',
              trangthai: 'HoatDong',
              thoigiantao: now,
              thoigiancapnhat: now,
            },
          })
        : null;
      await tx.khach_hang.create({
        data: {
          makhachhang: id,
          mataikhoan: account?.mataikhoan,
          mahang: dto.memberTierId || null,
          hotenkhachhang: dto.name,
          sodienthoai: dto.phoneNumber,
          email:
            dto.email === undefined
              ? undefined
              : dto.email.toLowerCase() || null,
          gioitinh: dto.gender || 'Khac',
          ngaysinh: dto.birthday === '' ? null : birthday,
          nghenghiep: dto.occupation,
          anhdaidien: dto.avatar,
          trangthai: 'HoatDong',
          ngaydangky: now,
          thoigiantao: now,
          thoigiancapnhat: now,
        },
      });
      await this.access.audit(
        tx,
        actor,
        req,
        'CREATE_CUSTOMER',
        'khach_hang',
        id,
        'Tạo hồ sơ khách hàng.',
      );
    });
    return this.detail(id);
  }
  async update(
    id: string,
    dto: CustomerUpdateDto,
    actor: Identity,
    req: Request,
  ) {
    const birthday = dto.birthday ? calendarDate(dto.birthday) : undefined;
    if (birthday && birthday > new Date())
      throw new BadRequestException('Ngày sinh không hợp lệ.');
    await this.prisma.$transaction(async (tx) => {
      const before = await tx.khach_hang.findUniqueOrThrow({
        where: { makhachhang: id },
      });
      if (
        dto.memberTierId &&
        !(await tx.bang_hang_thanh_vien.findFirst({
          where: { mahang: dto.memberTierId, trangthai: 'HoatDong' },
        }))
      )
        throw new BadRequestException('Hạng thành viên không hợp lệ.');
      const now = new Date();
      await tx.khach_hang.update({
        where: { makhachhang: id },
        data: {
          hotenkhachhang: dto.name,
          sodienthoai: dto.phoneNumber,
          email:
            dto.email === undefined
              ? undefined
              : dto.email.toLowerCase() || null,
          gioitinh: dto.gender,
          ngaysinh: dto.birthday === '' ? null : birthday,
          nghenghiep: dto.occupation,
          anhdaidien: dto.avatar,
          mahang:
            dto.memberTierId === undefined
              ? undefined
              : dto.memberTierId || null,
          thoigiancapnhat: now,
        },
      });
      if (before.mataikhoan) {
        await tx.tai_khoan.update({
          where: { mataikhoan: before.mataikhoan },
          data: {
            sodienthoai: dto.phoneNumber,
            email:
              dto.email === undefined
                ? undefined
                : dto.email.toLowerCase() || null,
            thoigiancapnhat: now,
          },
        });
        if (dto.phoneNumber && dto.phoneNumber !== before.sodienthoai) {
          await tx.phien_dang_nhap.updateMany({
            where: { mataikhoan: before.mataikhoan },
            data: { trangthai: 'DaDangXuat' },
          });
          await tx.otp.updateMany({
            where: { mataikhoan: before.mataikhoan, dasudung: false },
            data: { dasudung: true, trangthai: 'Huy' },
          });
        }
      }
      await this.access.audit(
        tx,
        actor,
        req,
        'UPDATE_CUSTOMER',
        'khach_hang',
        id,
        'Cập nhật hồ sơ khách hàng.',
      );
    });
    return this.detail(id);
  }
  async status(id: string, dto: StatusDto, actor: Identity, req: Request) {
    await this.prisma.$transaction(async (tx) => {
      const customer = await tx.khach_hang.findUniqueOrThrow({
          where: { makhachhang: id },
        }),
        now = new Date();
      await tx.khach_hang.update({
        where: { makhachhang: id },
        data: {
          trangthai: dto.status,
          ngaykhoa: dto.status === 'DaKhoa' ? now : null,
          lydokhoa: dto.status === 'DaKhoa' ? dto.reason : null,
          thoigiancapnhat: now,
        },
      });
      if (customer.mataikhoan) {
        await tx.tai_khoan.update({
          where: { mataikhoan: customer.mataikhoan },
          data: {
            trangthai: dto.status,
            solandangnhapsai: 0,
            khoatamden: null,
            thoigiancapnhat: now,
          },
        });
        await tx.phien_dang_nhap.updateMany({
          where: { mataikhoan: customer.mataikhoan },
          data: { trangthai: 'DaDangXuat' },
        });
      }
      await this.access.audit(
        tx,
        actor,
        req,
        dto.status === 'DaKhoa' ? 'LOCK_CUSTOMER' : 'UNLOCK_CUSTOMER',
        'khach_hang',
        id,
        dto.reason,
        { status: customer.trangthai },
        { status: dto.status },
      );
    });
    return this.detail(id);
  }
}
