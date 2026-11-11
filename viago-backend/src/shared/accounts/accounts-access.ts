import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Module,
  SetMetadata,
  UnauthorizedException,
  Catch,
  ArgumentsHost,
  ExceptionFilter,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaService } from '../../prisma/prisma.service';
import { digest, newId } from './account-security';
import { readActiveAccountSession } from './account-queries';
export interface Identity {
  accountId: string;
  customerId?: string;
  staffId?: string;
  name: string;
  role: 'customer' | 'admin';
  permissions: string[];
  roleName?: string;
  sessionId: string;
}
export type AccountRequest = Request & { identity: Identity };
export const AccountScope = (scope: string) =>
  SetMetadata('account-scope', scope);
export const Permission = (permission: string) =>
  SetMetadata('account-permission', permission);
@Injectable()
export class AccountsAccess {
  constructor(private readonly prisma: PrismaService) {}
  async authenticate(authorization?: string): Promise<Identity> {
    const token = /^Bearer ([A-Za-z0-9._~-]{32,512})$/.exec(
      authorization || '',
    )?.[1];
    if (!token) throw new UnauthorizedException('Vui lòng đăng nhập.');
    const session = await readActiveAccountSession(this.prisma, digest(token));
    if (!session)
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn.');
    const account = session.tai_khoan,
      staff = account.nhan_vien,
      customer = account.khach_hang;
    if (
      (account.vaitrotaikhoan === 'NhanVien' &&
        (!staff ||
          staff.trangthai !== 'HoatDong' ||
          staff.vai_tro.trangthai !== 'HoatDong')) ||
      (account.vaitrotaikhoan === 'KhachHang' &&
        (!customer || customer.trangthai !== 'HoatDong'))
    )
      throw new UnauthorizedException('Tài khoản đã ngừng hoạt động.');
    if (!['NhanVien', 'KhachHang'].includes(account.vaitrotaikhoan))
      throw new UnauthorizedException();
    const activityThreshold = new Date(Date.now() - 60000);
    if (session.thoigianhoatdongcuoi < activityThreshold)
      await this.prisma.phien_dang_nhap.updateMany({
        where: {
          maphien: session.maphien,
          thoigianhoatdongcuoi: { lt: activityThreshold },
        },
        data: { thoigianhoatdongcuoi: new Date() },
      });
    return {
      accountId: account.mataikhoan,
      customerId: customer?.makhachhang,
      staffId: staff?.manhanvien,
      name: staff?.hoten || customer?.hotenkhachhang || '',
      role: account.vaitrotaikhoan === 'NhanVien' ? 'admin' : 'customer',
      permissions:
        staff?.nhan_vien_quyen_han.map((p) => p.quyen_han.tenquyen) || [],
      roleName: staff?.vai_tro.tenvaitro,
      sessionId: session.maphien,
    };
  }
  async audit(
    tx: Prisma.TransactionClient,
    identity: Pick<Identity, 'accountId' | 'staffId'> | null,
    req: Request,
    action: string,
    table: string,
    id: string,
    details: string,
    before?: Prisma.InputJsonObject,
    after?: Prisma.InputJsonObject,
    success = true,
  ) {
    await tx.nhat_ky_he_thong.create({
      data: {
        manhatky: newId('NK'),
        mataikhoan: identity?.accountId,
        manhanvien: identity?.staffId,
        hanhdong: action,
        banglienquan: table,
        madoituong: id,
        trangthai: success ? 'ThanhCong' : 'ThatBai',
        thoigian: new Date(),
        diachiip: req.ip || req.socket?.remoteAddress || 'unknown',
        trinhduyet: (req.headers['user-agent'] || 'unknown').slice(0, 500),
        chitiet: details,
        ...(before ? { dulieutruoc: before } : {}),
        ...(after ? { dulieusau: after } : {}),
      },
    });
  }
}
@Injectable()
export class AccountsGuard implements CanActivate {
  constructor(
    private readonly access: AccountsAccess,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AccountRequest>();
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader('Cache-Control', 'no-store');
    req.identity = await this.access.authenticate(req.headers.authorization);
    const targets = [context.getHandler(), context.getClass()];
    const scope = this.reflector.getAllAndOverride<string>(
      'account-scope',
      targets,
    );
    if (scope && req.identity.role !== scope)
      throw new ForbiddenException('Không có quyền truy cập.');
    const permission = this.reflector.getAllAndOverride<string>(
      'account-permission',
      targets,
    );
    if (
      permission &&
      !req.identity.permissions.includes(permission) &&
      req.identity.roleName !== 'QuanTriVien'
    )
      throw new ForbiddenException(
        'Tài khoản chưa được cấp quyền thực hiện thao tác này.',
      );
    return true;
  }
}
@Catch(Prisma.PrismaClientKnownRequestError)
export class AccountsDatabaseFilter implements ExceptionFilter {
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const status =
      error.code === 'P2002'
        ? 409
        : error.code === 'P2025'
          ? 404
          : error.code === 'P2003'
            ? 400
            : 503;
    res
      .status(status)
      .json({
        statusCode: status,
        message:
          status === 409
            ? 'Số điện thoại, email hoặc tên đăng nhập đã tồn tại.'
            : status === 404
              ? 'Không tìm thấy dữ liệu.'
              : status === 400
                ? 'Dữ liệu liên kết không hợp lệ.'
                : 'Dịch vụ dữ liệu tạm thời không sẵn sàng.',
      });
  }
}
@Module({
  imports: [PrismaModule],
  providers: [AccountsAccess, AccountsGuard],
  exports: [AccountsAccess, AccountsGuard, PrismaModule],
})
export class AccountsAccessModule {}
