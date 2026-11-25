import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AdminAuthService } from '../auth/admin-auth.service';
export type IntakeActor = { id: string; staffId: string; name: string };
export type IntakeRequest = Request & { intakeActor: IntakeActor };
@Injectable()
export class IntakeGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<IntakeRequest>();
    context
      .switchToHttp()
      .getResponse<Response>()
      .setHeader('Cache-Control', 'no-store');
    const { account } = await this.auth.current(req.headers.authorization);
    if (account.roleName === 'NhanVienBanVe')
      throw new ForbiddenException('Tài khoản bán vé không có quyền truy cập mục này.');
    req.intakeActor = account;
    return true;
  }
}
