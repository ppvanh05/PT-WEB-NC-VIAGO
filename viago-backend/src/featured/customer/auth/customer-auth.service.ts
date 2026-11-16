import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, loai_otp_enum } from '@prisma/client';
import { randomBytes, randomInt } from 'node:crypto';
import type { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AccountsAccess,
  Identity,
} from '../../../shared/accounts/accounts-access';
import {
  calendarDate,
  digest,
  hashPassword,
  newId,
  verifyPassword,
} from '../../../shared/accounts/account-security';
import {
  LoginDto,
  OtpRequestDto,
  OtpVerifyDto,
  RegisterDto,
  ResetPasswordDto,
} from '../../../shared/accounts/accounts.dto';
@Injectable()
export class CustomerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccountsAccess,
  ) {}
  async sendOtp(
    dto: OtpRequestDto,
    req: Request,
    scope: 'customer' | 'admin' = 'customer',
  ) {
    const endpoint = process.env.ACCOUNT_SMS_WEBHOOK_URL,
      secret = process.env.ACCOUNT_SMS_WEBHOOK_TOKEN;
    if (!endpoint || !secret || !endpoint.startsWith('https://'))
      throw new ServiceUnavailableException(
        'Chưa cấu hình dịch vụ gửi SMS OTP.',
      );
    const challengeId = newId('OTP'),
      code = String(randomInt(100000, 1000000)),
      now = new Date(),
      expiresAt = new Date(Date.now() + 180000);
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`otp:${dto.phoneNumber}`}))`;
      const recent = await tx.otp.findMany({
        where: {
          sodienthoai: dto.phoneNumber,
          thoigiantao: { gt: new Date(Date.now() - 3600000) },
        },
        orderBy: { thoigiantao: 'desc' },
      });
      if (
        recent.length >= 5 ||
        (recent[0] && now.getTime() - recent[0].thoigiantao.getTime() < 60000)
      )
        throw new BadRequestException(
          'Vui lòng chờ trước khi gửi lại OTP (tối đa 5 lần/giờ).',
        );
      const account = await tx.tai_khoan.findUnique({
        where: { sodienthoai: dto.phoneNumber },
        select: { mataikhoan: true, vaitrotaikhoan: true, trangthai: true },
      });
      // Do not reveal whether a phone number is registered.
      if (scope === 'admin' && dto.purpose !== 'XacThucHaiLop')
        throw new BadRequestException('Mục đích OTP không hợp lệ.');
      if (
        dto.purpose === 'DangKy'
          ? !!account
          : !account ||
            account.vaitrotaikhoan !==
              (scope === 'admin' ? 'NhanVien' : 'KhachHang') ||
            account.trangthai !== 'HoatDong'
      )
        return;
      await tx.otp.updateMany({
        where: {
          sodienthoai: dto.phoneNumber,
          loaiotp: dto.purpose,
          dasudung: false,
        },
        data: { dasudung: true, trangthai: 'Huy' },
      });
      await tx.otp.create({
        data: {
          maotp: challengeId,
          mataikhoan: account?.mataikhoan,
          sodienthoai: dto.phoneNumber,
          maxacthuc: digest(`${challengeId}:${code}:${secret}`),
          loaiotp: dto.purpose,
          thoigiantao: now,
          thoigianhethan: expiresAt,
          trangthai: 'KhaDung',
        },
      });
      await this.access.audit(
        tx,
        account ? { accountId: account.mataikhoan } : null,
        req,
        'OTP_SENT',
        'otp',
        challengeId,
        'Yêu cầu mã xác thực SMS.',
      );
    });
    const exists = await this.prisma.otp.findUnique({
      where: { maotp: challengeId },
      select: { maotp: true },
    });
    if (exists) {
      try {
        const result = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secret}`,
          },
          body: JSON.stringify({
            phoneNumber: dto.phoneNumber,
            code,
            purpose: dto.purpose,
            expiresAt,
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (!result.ok) throw new Error();
      } catch {
        await this.prisma.otp.update({
          where: { maotp: challengeId },
          data: { dasudung: true, trangthai: 'Huy' },
        });
        throw new ServiceUnavailableException(
          'Không gửi được SMS. Vui lòng thử lại sau.',
        );
      }
    }
    return {
      challengeId,
      expiresAt,
      message: 'Nếu số điện thoại hợp lệ, mã xác thực sẽ được gửi qua SMS.',
    };
  }
  async verifyOtp(dto: OtpVerifyDto, req: Request) {
    const proof = randomBytes(32).toString('hex');
    const valid = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT maotp FROM otp WHERE maotp = ${dto.challengeId} FOR UPDATE`;
      const row = await tx.otp.findUnique({
        where: { maotp: dto.challengeId },
      });
      if (
        !row ||
        row.dasudung ||
        row.trangthai !== 'KhaDung' ||
        row.solanthu >= 5 ||
        row.thoigianhethan <= new Date()
      )
        return false;
      const ok =
        digest(
          `${row.maotp}:${dto.code}:${process.env.ACCOUNT_SMS_WEBHOOK_TOKEN || ''}`,
        ) === row.maxacthuc;
      await tx.otp.update({
        where: { maotp: row.maotp },
        data: ok
          ? {
              maxacthuc: digest(proof),
              trangthai: 'DaXacThuc',
              thoigianhethan: new Date(Date.now() + 300000),
            }
          : {
              solanthu: { increment: 1 },
              ...(row.solanthu >= 4
                ? { dasudung: true, trangthai: 'Huy' }
                : {}),
            },
      });
      await this.access.audit(
        tx,
        row.mataikhoan ? { accountId: row.mataikhoan } : null,
        req,
        ok ? 'OTP_VERIFIED' : 'OTP_FAILED',
        'otp',
        row.maotp,
        'Kiểm tra mã xác thực.',
        undefined,
        undefined,
        ok,
      );
      return ok;
    });
    if (!valid)
      throw new UnauthorizedException('OTP không hợp lệ hoặc đã hết hạn.');
    return { verificationToken: `${dto.challengeId}.${proof}`, expiresIn: 300 };
  }
  async consumeProof(
    tx: Prisma.TransactionClient,
    token: string,
    phone: string,
    purpose: loai_otp_enum,
    accountId?: string,
  ) {
    const match = /^(OTP_[a-f0-9]{32})\.([a-f0-9]{64})$/.exec(token);
    if (!match) throw new UnauthorizedException('Cần xác thực OTP.');
    const used = await tx.otp.updateMany({
      where: {
        maotp: match[1],
        maxacthuc: digest(match[2]),
        sodienthoai: phone,
        loaiotp: purpose,
        trangthai: 'DaXacThuc',
        dasudung: false,
        thoigianhethan: { gt: new Date() },
        ...(accountId ? { mataikhoan: accountId } : {}),
      },
      data: { dasudung: true },
    });
    if (used.count !== 1)
      throw new UnauthorizedException(
        'Xác thực đã hết hạn hoặc đã được sử dụng.',
      );
  }
  async register(dto: RegisterDto, req: Request) {
    const password = await hashPassword(dto.password),
      now = new Date();
    return this.prisma.$transaction(
      async (tx) => {
        await this.consumeProof(
          tx,
          dto.verificationToken,
          dto.phoneNumber,
          'DangKy',
        );
        const guest = await tx.khach_hang.findUnique({
          where: { sodienthoai: dto.phoneNumber },
        });
        if (guest?.mataikhoan || guest?.trangthai === 'DaKhoa')
          throw new ConflictException('Không thể đăng ký tài khoản này.');
        const account = await tx.tai_khoan.create({
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
        });
        const birthday = dto.birthday ? calendarDate(dto.birthday) : undefined;
        if (birthday && birthday > now)
          throw new BadRequestException('Ngày sinh phải ở quá khứ.');
        const profile = {
          mataikhoan: account.mataikhoan,
          hotenkhachhang: dto.name || guest?.hotenkhachhang || dto.phoneNumber,
          email:
            dto.email === undefined
              ? undefined
              : dto.email.toLowerCase() || null,
          gioitinh: dto.gender || guest?.gioitinh || ('Khac' as const),
          ngaysinh: birthday,
          nghenghiep: dto.occupation,
          anhdaidien: dto.avatar,
          thoigiancapnhat: now,
        };
        const customer = guest
          ? await tx.khach_hang.update({
              where: { makhachhang: guest.makhachhang },
              data: profile,
            })
          : await tx.khach_hang.create({
              data: {
                ...profile,
                makhachhang: newId('KH'),
                sodienthoai: dto.phoneNumber,
                ngaydangky: now,
                trangthai: 'HoatDong',
                thoigiantao: now,
              },
            });
        await this.access.audit(
          tx,
          { accountId: account.mataikhoan },
          req,
          'REGISTER',
          'khach_hang',
          customer.makhachhang,
          'Đăng ký tài khoản khách hàng.',
        );
        return { success: true, customerId: customer.makhachhang };
      },
      { timeout: 15000 },
    );
  }
  async login(dto: LoginDto, req: Request) {
    const token = randomBytes(32).toString('hex'),
      expiresAt = new Date(Date.now() + 30 * 60000);
    const result = await this.prisma.$transaction(
      async (tx) => {
        const found = await tx.tai_khoan.findFirst({
          where: {
            vaitrotaikhoan: 'KhachHang',
            OR: [
              { sodienthoai: dto.username },
              { email: dto.username.toLowerCase() },
              { tendangnhap: dto.username },
            ],
          },
          select: { mataikhoan: true },
        });
        if (!found) {
          await verifyPassword(dto.password, '');
          return null;
        }
        await tx.$queryRaw`SELECT mataikhoan FROM tai_khoan WHERE mataikhoan = ${found.mataikhoan} FOR UPDATE`;
        const account = await tx.tai_khoan.findUniqueOrThrow({
          where: { mataikhoan: found.mataikhoan },
          include: { khach_hang: true },
        });
        if (account.khoatamden && account.khoatamden > new Date()) return null;
        const localSeed =
          process.env.NODE_ENV === 'development' &&
          process.env.CUSTOMER_ALLOW_LOCAL_SEED_LOGIN === 'true' &&
          ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket?.remoteAddress ?? '') &&
          /^HASH_MAU_\d{3}$/.test(account.matkhauhash);
        if (!(await verifyPassword(dto.password, account.matkhauhash, localSeed))) {
          const attempts =
            (account.khoatamden ? 0 : account.solandangnhapsai) + 1;
          await tx.tai_khoan.update({
            where: { mataikhoan: account.mataikhoan },
            data: {
              solandangnhapsai: attempts,
              khoatamden: attempts >= 5 ? new Date(Date.now() + 900000) : null,
            },
          });
          await this.access.audit(
            tx,
            { accountId: account.mataikhoan },
            req,
            'LOGIN_FAILED',
            'tai_khoan',
            account.mataikhoan,
            'Đăng nhập không thành công.',
            undefined,
            undefined,
            false,
          );
          return null;
        }
        if (
          account.trangthai !== 'HoatDong' ||
          account.khach_hang?.trangthai !== 'HoatDong'
        )
          return null;
        if (account.xacthuchailop) {
          if (!dto.verificationToken)
            return {
              requiresTwoFactor: true,
              phoneNumber: account.sodienthoai,
            };
          await this.consumeProof(
            tx,
            dto.verificationToken,
            account.sodienthoai,
            'XacThucHaiLop',
            account.mataikhoan,
          );
        }
        const now = new Date();
        await tx.tai_khoan.update({
          where: { mataikhoan: account.mataikhoan },
          data: {
            ...(!localSeed ? { matkhauhash: await hashPassword(dto.password) } : {}),
            solandangnhapsai: 0,
            khoatamden: null,
            landangnhapcuoi: now,
            thoigiancapnhat: now,
          },
        });
        await tx.phien_dang_nhap.create({
          data: {
            maphien: newId('PDN'),
            mataikhoan: account.mataikhoan,
            tokenphien: digest(token),
            tenthietbi: 'VIAGO Customer',
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
          { accountId: account.mataikhoan },
          req,
          'LOGIN_SUCCESS',
          'tai_khoan',
          account.mataikhoan,
          'Đăng nhập khách hàng.',
        );
        return {
          token,
          expiresAt,
          account: {
            id: account.mataikhoan,
            customerId: account.khach_hang!.makhachhang,
            name: account.khach_hang!.hotenkhachhang,
            role: 'customer',
          },
        };
      },
      { timeout: 15000 },
    );
    if (!result)
      throw new UnauthorizedException(
        'Thông tin đăng nhập không đúng hoặc tài khoản đã bị khóa.',
      );
    return result;
  }
  async resetPassword(dto: ResetPasswordDto, req: Request) {
    const password = await hashPassword(dto.newPassword);
    await this.prisma.$transaction(async (tx) => {
      const account = await tx.tai_khoan.findUnique({
        where: { sodienthoai: dto.phoneNumber },
      });
      if (
        !account ||
        account.vaitrotaikhoan !== 'KhachHang' ||
        account.trangthai !== 'HoatDong'
      )
        throw new UnauthorizedException('Xác thực không hợp lệ.');
      await this.consumeProof(
        tx,
        dto.verificationToken,
        dto.phoneNumber,
        'QuenMatKhau',
        account.mataikhoan,
      );
      await tx.tai_khoan.update({
        where: { mataikhoan: account.mataikhoan },
        data: {
          matkhauhash: password,
          solandangnhapsai: 0,
          khoatamden: null,
          thoigiancapnhat: new Date(),
        },
      });
      await tx.phien_dang_nhap.updateMany({
        where: { mataikhoan: account.mataikhoan },
        data: { trangthai: 'DaDangXuat' },
      });
      await this.access.audit(
        tx,
        { accountId: account.mataikhoan },
        req,
        'PASSWORD_RESET',
        'tai_khoan',
        account.mataikhoan,
        'Đặt lại mật khẩu, thu hồi tất cả phiên.',
      );
    });
    return { success: true };
  }
  async logout(identity: Identity, req: Request) {
    await this.prisma.$transaction(async (tx) => {
      await tx.phien_dang_nhap.updateMany({
        where: { maphien: identity.sessionId, mataikhoan: identity.accountId },
        data: { trangthai: 'DaDangXuat' },
      });
      await this.access.audit(
        tx,
        identity,
        req,
        'LOGOUT',
        'tai_khoan',
        identity.accountId,
        'Đăng xuất.',
      );
    });
    return { success: true };
  }
}
