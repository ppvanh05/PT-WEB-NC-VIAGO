import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AccountsAccess } from '../../../shared/accounts/accounts-access';
import { CustomerAuthService } from '../../customer/auth/customer-auth.service';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { chatbotId } from '../../customer/chatbot/common/chatbot.id';
import type { AdminLoginDto } from './admin-auth.dto';
const derive = promisify(scrypt);
const tokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
export const adminToken = (authorization?: string) =>
  /^Bearer ([A-Za-z0-9._~-]{32,512})$/.exec(authorization ?? '')?.[1];
const employeeSelect = {
  manhanvien: true,
  hoten: true,
  sodienthoai: true,
  email: true,
  anhdaidien: true,
} as const;
export async function verifyAdminPassword(
  password: string,
  stored: string,
  allowLocalSeed = false,
) {
  if (allowLocalSeed && /^HASH_MAU_\d{3}$/.test(stored))
    return timingSafeEqual(
      createHash('sha256').update(password).digest(),
      createHash('sha256').update(stored).digest(),
    );
  const parts = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(stored);
  if (parts)
    return timingSafeEqual(
      (await derive(password, parts[1], 64)) as Buffer,
      Buffer.from(parts[2], 'hex'),
    );
  if (/^[a-f0-9]{64}$/i.test(stored))
    return timingSafeEqual(
      createHash('sha256').update(password).digest(),
      Buffer.from(stored, 'hex'),
    );
  await derive(password, 'viago-invalid-credential', 64);
  return false;
}
@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccountsAccess,
    private readonly customerAuth: CustomerAuthService,
  ) {}
  async login(dto: AdminLoginDto, req: Request) {
    const token = randomBytes(32).toString('hex'),
      now = new Date(),
      expiresAt = new Date(Date.now() + 8 * 3600000);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const [found] = await tx.$queryRaw<{ mataikhoan: string }[]>`
          SELECT mataikhoan FROM tai_khoan
          WHERE email = ${dto.username}
             OR sodienthoai = ${dto.username}
             OR tendangnhap = ${dto.username}
          LIMIT 1 FOR UPDATE
        `;
        if (!found) {
          await verifyAdminPassword(dto.password, '');
          return null;
        }
        const account = await tx.tai_khoan.findUniqueOrThrow({
          where: { mataikhoan: found.mataikhoan },
          include: {
            nhan_vien: {
              select: {
                ...employeeSelect,
                trangthai: true,
                vai_tro: { select: { trangthai: true } },
              },
            },
          },
        });
        if (account.khoatamden && account.khoatamden > now) return null;
        const allowLocalSeed =
          process.env.NODE_ENV === 'development' &&
          process.env.ADMIN_ALLOW_LOCAL_SEED_LOGIN === 'true' &&
          ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(
            req.socket?.remoteAddress ?? '',
          );
        const valid = await verifyAdminPassword(
          dto.password,
          account.matkhauhash,
          allowLocalSeed,
        );
        if (!valid) {
          const attempts =
            (account.khoatamden ? 0 : account.solandangnhapsai) + 1;
          await tx.tai_khoan.update({
            where: { mataikhoan: account.mataikhoan },
            data: {
              solandangnhapsai: attempts,
              khoatamden:
                attempts >= 5 ? new Date(Date.now() + 15 * 60000) : null,
            },
          });
          await this.access.audit(
            tx,
            { accountId: account.mataikhoan },
            req,
            'LOGIN_FAILED',
            'tai_khoan',
            account.mataikhoan,
            'Đăng nhập quản trị không thành công.',
            undefined,
            undefined,
            false,
          );
          return null;
        }
        const staff = account.nhan_vien;
        if (
          account.trangthai !== 'HoatDong' ||
          account.vaitrotaikhoan !== 'NhanVien' ||
          !staff ||
          staff.trangthai !== 'HoatDong' ||
          staff.vai_tro.trangthai !== 'HoatDong'
        )
          return null;
        if (account.xacthuchailop) {
          if (!dto.verificationToken)
            return {
              twoFactor: true,
              phoneNumber: account.sodienthoai,
            } as const;
          await this.customerAuth.consumeProof(
            tx,
            dto.verificationToken,
            account.sodienthoai,
            'XacThucHaiLop',
            account.mataikhoan,
          );
        }
        await tx.tai_khoan.update({
          where: { mataikhoan: account.mataikhoan },
          data: {
            solandangnhapsai: 0,
            khoatamden: null,
            landangnhapcuoi: now,
            thoigiancapnhat: now,
          },
        });
        await tx.phien_dang_nhap.create({
          data: {
            maphien: chatbotId('PDN'),
            mataikhoan: account.mataikhoan,
            tokenphien: tokenHash(token),
            tenthietbi: 'Quản trị VIAGO',
            trinhduyet: (req.headers['user-agent'] || 'unknown').slice(0, 500),
            diachiip: req.ip || req.socket.remoteAddress || 'unknown',
            thoigiandangnhap: now,
            thoigianhoatdongcuoi: now,
            thoigianhethan: expiresAt,
            trangthai: 'DangHoatDong',
          },
        });
        await this.access.audit(
          tx,
          { accountId: account.mataikhoan, staffId: staff.manhanvien },
          req,
          'LOGIN_SUCCESS',
          'tai_khoan',
          account.mataikhoan,
          'Đăng nhập quản trị.',
        );
        return { account: this.view(account.mataikhoan, staff) };
      },
      { timeout: 10000 },
    );
    if (!result)
      throw new UnauthorizedException(
        'Thông tin đăng nhập không đúng hoặc tài khoản đã ngừng hoạt động.',
      );
    if ('twoFactor' in result)
      return { requiresTwoFactor: true, phoneNumber: result.phoneNumber };
    return { token, expiresAt, account: result.account };
  }
  private view(
    id: string,
    staff: {
      manhanvien: string;
      hoten: string;
      sodienthoai: string;
      email: string;
      anhdaidien: string | null;
    },
  ) {
    return {
      id,
      staffId: staff.manhanvien,
      name: staff.hoten,
      phoneNumber: staff.sodienthoai,
      email: staff.email,
      avatar: staff.anhdaidien || '',
      role: 'admin' as const,
    };
  }
  async current(authorization?: string) {
    const token = adminToken(authorization);
    if (!token) throw new UnauthorizedException('Vui lòng đăng nhập quản trị.');
    const session = await this.prisma.phien_dang_nhap.findFirst({
      where: {
        tokenphien: tokenHash(token),
        trangthai: 'DangHoatDong',
        thoigianhethan: { gt: new Date() },
        tai_khoan: {
          trangthai: 'HoatDong',
          vaitrotaikhoan: 'NhanVien',
          nhan_vien: {
            trangthai: 'HoatDong',
            vai_tro: { trangthai: 'HoatDong' },
          },
        },
      },
      select: {
        thoigianhethan: true,
        mataikhoan: true,
        tai_khoan: { select: { nhan_vien: { select: employeeSelect } } },
      },
    });
    if (!session?.tai_khoan.nhan_vien)
      throw new UnauthorizedException('Phiên đăng nhập quản trị đã hết hạn.');
    return {
      account: this.view(session.mataikhoan, session.tai_khoan.nhan_vien),
      expiresAt: session.thoigianhethan,
    };
  }
  async logout(authorization?: string, req?: Request) {
    const token = adminToken(authorization);
    if (token) {
      const session = await this.prisma.phien_dang_nhap.findFirst({
        where: {
          tokenphien: tokenHash(token),
          tai_khoan: { vaitrotaikhoan: 'NhanVien' },
        },
        select: { mataikhoan: true },
      });
      if (session)
        await this.prisma.$transaction(async (tx) => {
          await tx.phien_dang_nhap.updateMany({
            where: { tokenphien: tokenHash(token) },
            data: { trangthai: 'DaDangXuat', thoigianhoatdongcuoi: new Date() },
          });
          if (req)
            await this.access.audit(
              tx,
              { accountId: session.mataikhoan },
              req,
              'LOGOUT',
              'tai_khoan',
              session.mataikhoan,
              'Đăng xuất quản trị.',
            );
        });
    }
    return { success: true };
  }
}
