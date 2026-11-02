import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import type { Request, Response } from 'express';

@Injectable()
export class AboutSubmissionGuard implements CanActivate {
  private readonly requests = new Map<
    string,
    { count: number; until: number }
  >();
  private cleanupAt = 0;

  canActivate(context: ExecutionContext): boolean {
    const now = Date.now();
    if (now >= this.cleanupAt || this.requests.size >= 10000) {
      for (const [key, entry] of this.requests)
        if (entry.until <= now) this.requests.delete(key);
      this.cleanupAt = now + 60000;
    }
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const key = `${context.getHandler().name}:${request.ip ?? request.socket.remoteAddress ?? 'unknown'}`;
    const entry = this.requests.get(key) ?? {
      count: 0,
      until: now + 10 * 60000,
    };
    if (
      entry.count >= 20 ||
      (!this.requests.has(key) && this.requests.size >= 10000)
    ) {
      http
        .getResponse<Response>()
        .setHeader(
          'Retry-After',
          Math.max(1, Math.ceil((entry.until - now) / 1000)),
        );
      throw new HttpException(
        'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    entry.count++;
    this.requests.set(key, entry);
    return true;
  }
}
