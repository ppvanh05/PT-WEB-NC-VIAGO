import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  allowedFrontendOrigin,
  sameProxyOrigin,
} from '../../../../shared/http/frontend-origin';

const COOKIE = 'viago_support';
export type StaffIdentity = { id: string; name: string };
export type SupportRequest = Request & {
  supportOwner?: string;
  supportAgent?: StaffIdentity;
  supportAuthorization?: string;
};
@Injectable()
export class SupportAuthService {
  constructor(private readonly prisma: PrismaService) {}
  async staff(
    authorization?: string,
    permission = process.env.CHATBOT_SUPPORT_PERMISSION || 'CSKH_CHAT',
  ): Promise<StaffIdentity> {
    const token = /^Bearer ([A-Za-z0-9._~-]{32,512})$/.exec(
      authorization ?? '',
    )?.[1];
    if (!token)
      throw new UnauthorizedException('Vui lòng đăng nhập tài khoản CSKH.');
    const session = await this.prisma.phien_dang_nhap.findFirst({
      where: {
        tokenphien: createHash('sha256').update(token).digest('hex'),
        trangthai: 'DangHoatDong',
        thoigianhethan: { gt: new Date() },
        tai_khoan: { trangthai: 'HoatDong', vaitrotaikhoan: 'NhanVien' },
      },
      select: {
        tai_khoan: {
          select: {
            nhan_vien: {
              select: {
                manhanvien: true,
                hoten: true,
                trangthai: true,
                nhan_vien_quyen_han: {
                  where: {
                    maquyen: permission,
                  },
                  select: { maquyen: true },
                },
              },
            },
          },
        },
      },
    });
    if (!session)
      throw new UnauthorizedException('Phiên đăng nhập hỗ trợ đã hết hạn.');
    const employee = session?.tai_khoan.nhan_vien;
    if (
      !employee ||
      employee.trangthai !== 'HoatDong' ||
      !employee.nhan_vien_quyen_han.length
    )
      throw new ForbiddenException('Tài khoản không có quyền tiếp nhận CSKH.');
    return { id: employee.manhanvien, name: employee.hoten };
  }
}
@Injectable()
export class SupportRateGuard implements CanActivate {
  private readonly buckets = new Map<
    string,
    { count: number; until: number }
  >();
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>(),
      res = context.switchToHttp().getResponse<Response>();
    res.setHeader('Cache-Control', 'no-store');
    const origin = req.headers.origin;
    if (
      origin &&
      !allowedFrontendOrigin(origin) &&
      !sameProxyOrigin(origin, req.headers.host)
    )
      throw new ForbiddenException('Nguồn yêu cầu không hợp lệ.');
    const now = Date.now();
    if (this.buckets.size >= 10000)
      for (const [key, bucket] of this.buckets)
        if (bucket.until <= now) this.buckets.delete(key);
    const key = `${req.ip ?? req.socket.remoteAddress}:${req.method === 'GET' ? 'read' : 'write'}`;
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.until <= now)
      bucket = { count: 0, until: now + 60000 };
    if (
      bucket.count >= (req.method === 'GET' ? 120 : 20) ||
      (!this.buckets.has(key) && this.buckets.size >= 10000)
    ) {
      res.setHeader('Retry-After', '60');
      throw new HttpException(
        'Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
        429,
      );
    }
    bucket.count++;
    this.buckets.set(key, bucket);
    return true;
  }
}
@Injectable()
export class SupportCustomerGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<SupportRequest>(),
      res = context.switchToHttp().getResponse<Response>();
    let token = req.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(COOKIE + '='))
      ?.slice(COOKIE.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      token = randomBytes(32).toString('hex');
      res.cookie(COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/customer/chatbot',
        maxAge: 30 * 86400000,
      });
    }
    req.supportOwner = createHash('sha256').update(token).digest('hex');
    return true;
  }
}
@Injectable()
export class SupportStaffGuard implements CanActivate {
  constructor(private readonly auth: SupportAuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<SupportRequest>();
    req.supportAuthorization = req.headers.authorization;
    req.supportAgent = await this.auth.staff(req.supportAuthorization);
    return true;
  }
}

@Injectable()
export class SupportKnowledgeGuard implements CanActivate {
  constructor(private readonly auth: SupportAuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<SupportRequest>();
    req.supportAgent = await this.auth.staff(
      req.headers.authorization,
      process.env.CHATBOT_KNOWLEDGE_PERMISSION || 'CSKH_KIEN_THUC',
    );
    return true;
  }
}
