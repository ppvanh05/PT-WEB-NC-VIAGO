import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable,
  type RawBodyRequest,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import type { Request, Response } from 'express';
import { sepayWebhookSecret } from '../payments/sepay.config';
const COOKIE = 'viago_home';
export function homeSession(request: Request) {
  const token = request.headers.cookie
    ?.split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(COOKIE + '='))
    ?.slice(COOKIE.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token)
    ? createHash('sha256').update(token).digest('hex')
    : undefined;
}
@Injectable()
export class HomeSessionGuard implements CanActivate {
  private readonly limits = new Map<string, { count: number; until: number }>();
  private nextCleanup = 0;
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>(),
      res = context.switchToHttp().getResponse<Response>();
    const now = Date.now();
    res.setHeader('Cache-Control', 'no-store');
    if (now >= this.nextCleanup || this.limits.size >= 10000) {
      for (const [key, entry] of this.limits)
        if (entry.until <= now) this.limits.delete(key);
      this.nextCleanup = now + 60000;
    }
    const key = `${req.method === 'GET' ? 'read' : 'write'}:${req.ip ?? req.socket.remoteAddress ?? 'unknown'}`;
    const entry = this.limits.get(key) ?? { count: 0, until: now + 60000 };
    if (entry.until <= now) {
      entry.count = 0;
      entry.until = now + 60000;
    }
    if (
      entry.count >= (req.method === 'GET' ? 300 : 120) ||
      (!this.limits.has(key) && this.limits.size >= 10000)
    ) {
      res.setHeader(
        'Retry-After',
        String(Math.max(1, Math.ceil((entry.until - now) / 1000))),
      );
      throw new HttpException(
        'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
        429,
      );
    }
    entry.count++;
    this.limits.set(key, entry);
    if (!homeSession(req)) {
      const token = randomBytes(32).toString('hex');
      res.cookie(COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/customer/home',
        maxAge: 30 * 86400000,
      });
      req.headers.cookie = COOKIE + '=' + token;
    }
    return true;
  }
}

@Injectable()
export class SepayWebhookGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const secret = sepayWebhookSecret();
    if (!secret)
      throw new ServiceUnavailableException(
        'Khóa HMAC webhook thanh toán chưa được cấu hình.',
      );
    const request = context
      .switchToHttp()
      .getRequest<RawBodyRequest<Request>>();
    const signature = request.headers['x-sepay-signature'];
    const timestamp = request.headers['x-sepay-timestamp'];
    if (
      typeof signature !== 'string' ||
      !/^sha256=[a-fA-F0-9]{64}$/.test(signature) ||
      typeof timestamp !== 'string' ||
      !/^[1-9]\d{0,11}$/.test(timestamp) ||
      Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) > 300 ||
      !Buffer.isBuffer(request.rawBody)
    )
      throw new UnauthorizedException('Webhook không hợp lệ.');
    // Verify the original bytes. Re-serializing parsed JSON changes the signature.
    const actual = Buffer.from(signature.slice(7), 'hex');
    const expected = createHmac('sha256', secret)
      .update(timestamp + '.', 'utf8')
      .update(request.rawBody)
      .digest();
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new UnauthorizedException('Webhook không hợp lệ.');
    return true;
  }
}
