import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';

const COOKIE = 'viago_news_visitor';
export function newsVisitor(request: Request) {
  const token = request.headers.cookie
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  return token && /^[a-f0-9]{64}$/.test(token)
    ? createHash('sha256').update(token).digest('hex')
    : undefined;
}

@Injectable()
export class NewsInteractionGuard implements CanActivate {
  private readonly requests = new Map<
    string,
    { count: number; until: number }
  >();
  private cleanupAt = 0;

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const now = Date.now();
    if (now >= this.cleanupAt || this.requests.size >= 10000) {
      for (const [key, value] of this.requests)
        if (value.until <= now) this.requests.delete(key);
      this.cleanupAt = now + 60000;
    }
    const comments = ['createComment', 'createReply'].includes(
      context.getHandler().name,
    );
    const duration = comments ? 600000 : 60000;
    const limit = comments ? 20 : 120;
    const key = `${comments ? 'comments' : 'interactions'}:${request.ip ?? request.socket.remoteAddress ?? 'unknown'}`;
    const entry = this.requests.get(key) ?? { count: 0, until: now + duration };
    if (entry.until <= now) {
      entry.count = 0;
      entry.until = now + duration;
    }
    if (
      entry.count >= limit ||
      (!this.requests.has(key) && this.requests.size >= 10000)
    ) {
      response.setHeader(
        'Retry-After',
        String(Math.max(1, Math.ceil((entry.until - now) / 1000))),
      );
      throw new HttpException(
        'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    entry.count++;
    this.requests.set(key, entry);
    if (!newsVisitor(request)) {
      const token = randomBytes(32).toString('hex');
      response.cookie(COOKIE, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/customer/news',
        maxAge: 365 * 86400000,
      });
      // Make the new token available to this request without trusting a client-supplied ID.
      request.headers.cookie = `${COOKIE}=${token}`;
    }
    return true;
  }
}
