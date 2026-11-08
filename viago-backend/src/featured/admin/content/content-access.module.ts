import { CanActivate, ExecutionContext, Injectable, Module } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AdminAuthModule } from '../auth/admin-auth.module';
import { AdminAuthService } from '../auth/admin-auth.service';

@Injectable()
export class ContentAdminGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}
  async canActivate(context: ExecutionContext) {
    const http = context.switchToHttp(), req = http.getRequest<Request>();
    http.getResponse<Response>().setHeader('Cache-Control', 'no-store');
    const { account } = await this.auth.current(req.headers.authorization);
    if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method) && req.body && typeof req.body === 'object' && !Array.isArray(req.body))
      req.body.maNhanVien = account.staffId;
    return true;
  }
}
@Module({ imports: [AdminAuthModule], providers: [ContentAdminGuard], exports: [ContentAdminGuard, AdminAuthModule] })
export class ContentAccessModule {}
