import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AdminSessionService } from './admin-session.service';

export class ContentApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function contentRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const response = await fetch('/api' + path, {
    method: options.method || 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(25000)])
      : AbortSignal.timeout(25000),
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  if (!/json/i.test(response.headers.get('content-type') || ''))
    throw new ContentApiError(
      response.status,
      'Chưa kết nối được API. Vui lòng kiểm tra backend và khởi động lại frontend.',
    );
  const data = await response.json();
  if (!response.ok)
    throw new ContentApiError(
      response.status,
      Array.isArray(data.message)
        ? data.message.join('. ')
        : typeof data.message === 'string'
          ? data.message
          : 'Không thực hiện được yêu cầu.',
    );
  return data as T;
}
@Injectable({ providedIn: 'root' })
export class AdminContentApi {
  private readonly session = inject(AdminSessionService);
  private readonly router = inject(Router);
  async request<T>(path: string, method = 'GET', body?: unknown, signal?: AbortSignal) {
    try {
      return await contentRequest<T>('/admin/' + path, {
        method,
        body,
        signal,
        headers: this.session.headers(),
      });
    } catch (error) {
      if (error instanceof ContentApiError && error.status === 401) {
        this.session.invalidate();
        void this.router.navigate(['/admin/login'], {
          queryParams: { returnUrl: this.router.url },
        });
      }
      throw error;
    }
  }
}
