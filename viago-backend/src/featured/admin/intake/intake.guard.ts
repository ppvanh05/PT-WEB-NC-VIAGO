import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
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
    req.intakeActor = account;
    return true;
  }
}
