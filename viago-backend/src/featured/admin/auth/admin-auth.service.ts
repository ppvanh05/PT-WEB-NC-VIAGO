import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountsAccess } from '../../../shared/accounts/accounts-access';
import type { Identity } from '../../../shared/accounts/accounts-access';
import { calendarDate } from '../../../shared/accounts/account-security';
import type { AdminProfileDto } from '../../../shared/accounts/accounts.dto';
import { CustomerAuthService } from '../../customer/auth/customer-auth.service';
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { lockLoginAccount, readActiveAccountSession } from '../../../shared/accounts/account-queries';
import { chatbotId } from '../../customer/chatbot/common/chatbot.id';
import type { AdminLoginDto } from './admin-auth.dto';
const derive = promisify(scrypt);
const tokenHash = (token: string) =>
  createHash('sha256').update(token).digest('hex');
export const adminToken = (authorization?: string) =>
  /^Bearer ([A-Za-z0-9._~-]{32,512})$/.exec(authorization ?? '')?.[1];
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
        const account = await lockLoginAccount(tx, dto.username);
        if (!account) {
          await verifyAdminPassword(dto.password, '');
          return null;
        }
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
      vai_tro: { tenvaitro: string };
      nhan_vien_quyen_han: { quyen_han: { tenquyen: string; maquyen: string } }[];
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
      roleName: staff.vai_tro.tenvaitro,
      permissions: staff.nhan_vien_quyen_han.map((p) => p.quyen_han.tenquyen),
      supportChat: staff.nhan_vien_quyen_han.some(
        (p) => p.quyen_han.maquyen === (process.env.CHATBOT_SUPPORT_PERMISSION || 'CSKH_CHAT'),
      ),
    };
  }
  async current(authorization?: string) {
    const token = adminToken(authorization);
    if (!token) throw new UnauthorizedException('Vui lòng đăng nhập quản trị.');
    const session = await readActiveAccountSession(this.prisma, tokenHash(token));
    const staff = session?.tai_khoan.nhan_vien;
    if (session?.tai_khoan.vaitrotaikhoan !== 'NhanVien' || !staff ||
        staff.trangthai !== 'HoatDong' || staff.vai_tro.trangthai !== 'HoatDong')
      throw new UnauthorizedException('Phiên đăng nhập quản trị đã hết hạn.');
    return {
      account: this.view(session.mataikhoan, staff),
      expiresAt: session.thoigianhethan,
    };
  }
  private staffOf(identity: Identity) {
    if (!identity.staffId)
      throw new UnauthorizedException('Vui lòng đăng nhập quản trị.');
    return identity.staffId;
  }
  async profile(identity: Identity) {
    const staff = await this.prisma.nhan_vien.findUniqueOrThrow({
      where: { manhanvien: this.staffOf(identity) },
      include: { vai_tro: { select: { tenvaitro: true } } },
    });
    return {
      staffId: staff.manhanvien,
      lastName: staff.hodem,
      firstName: staff.ten,
      displayName: staff.hoten,
      phoneNumber: staff.sodienthoai,
      email: staff.email,
      gender: staff.gioitinh,
      birthday: staff.ngaysinh.toISOString().slice(0, 10),
      address: staff.diachi || '',
      notes: staff.ghichu || '',
      avatar: staff.anhdaidien || '',
      roleName: staff.vai_tro.tenvaitro,
      status: staff.trangthai,
    };
  }
  async updateProfile(
    identity: Identity,
    dto: AdminProfileDto,
    req: Request,
  ) {
    const staffId = this.staffOf(identity);
    const birthday = dto.birthday ? calendarDate(dto.birthday) : undefined;
    if (birthday && birthday > new Date())
      throw new BadRequestException('Ngày sinh phải ở quá khứ.');
    const email = dto.email.toLowerCase();
    await this.prisma.$transaction(
      async (tx) => {
        const before = await tx.nhan_vien.findUniqueOrThrow({
          where: { manhanvien: staffId },
          select: { hoten: true, sodienthoai: true, email: true },
        });
        const now = new Date();
        await tx.nhan_vien.update({
          where: { manhanvien: staffId },
          data: {
            hodem: dto.lastName,
            ten: dto.firstName,
            hoten: dto.displayName,
            sodienthoai: dto.phoneNumber,
            email,
            gioitinh: dto.gender,
            ngaysinh: birthday,
            diachi: dto.address === undefined ? undefined : dto.address || null,
            ghichu: dto.notes === undefined ? undefined : dto.notes || null,
            anhdaidien: dto.avatar === undefined ? undefined : dto.avatar || null,
            thoigiancapnhat: now,
          },
        });
        await tx.tai_khoan.update({
          where: { mataikhoan: identity.accountId },
          data: {
            sodienthoai: dto.phoneNumber,
            email,
            thoigiancapnhat: now,
          },
        });
        await this.access.audit(
          tx,
          identity,
          req,
          'UPDATE_PROFILE',
          'nhan_vien',
          staffId,
          'Nhân viên tự cập nhật thông tin cá nhân.',
          {
            name: before.hoten,
            phoneNumber: before.sodienthoai,
            email: before.email,
          },
          {
            name: dto.displayName,
            phoneNumber: dto.phoneNumber,
            email,
          },
        );
      },
      { timeout: 10000 },
    );
    return this.profile(identity);
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
