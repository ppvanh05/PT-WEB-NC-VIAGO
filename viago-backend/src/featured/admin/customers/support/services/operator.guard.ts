import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AdminAuthService } from '../../../auth/admin-auth.service';
import type { SupportRequest } from '../../../../customer/chatbot/auth/chatbot.auth';
@Injectable()
export class SupportOperatorGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<SupportRequest>();
    const { account } = await this.auth.current(req.headers.authorization);
    req.supportAgent = { id: account.staffId, name: account.name };
    return true;
  }
}
