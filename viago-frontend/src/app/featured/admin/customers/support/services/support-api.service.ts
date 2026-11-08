import { inject, Injectable } from '@angular/core';
import { AdminSessionService } from '../../../../../core/services/admin-session.service';
import { Router } from '@angular/router';
import type {
  ConversationDetail,
  InboxLane,
  InboxResponse,
  SupportAgent,
} from '../models/support.models';

export class SupportApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
@Injectable({ providedIn: 'root' })
export class SupportApiService {
  private readonly session = inject(AdminSessionService);
  private readonly router = inject(Router);
  private async request<T>(path: string, body?: object): Promise<T> {
    const response = await fetch('/admin/support' + path, {
      credentials: 'include',
      method: body === undefined ? 'GET' : 'POST',
      signal: AbortSignal.timeout(path.endsWith('/draft') ? 90000 : 20000),
      headers: {
        Accept: 'application/json',
        ...this.session.headers(),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    if (!/\bjson\b/i.test(response.headers.get('content-type') || ''))
      throw new SupportApiError(
        502,
        'Chưa kết nối được dịch vụ hỗ trợ. Vui lòng thử tải lại trang.',
      );
    const data = await response.json().catch(() => null);
    if (response.status === 401) {
      this.session.invalidate();
      void this.router.navigate(['/admin/login'], { queryParams: { returnUrl: this.router.url } });
    }
    if (!response.ok)
      throw new SupportApiError(
        response.status,
        typeof data?.message === 'string'
          ? data.message
          : 'Không thực hiện được yêu cầu. Vui lòng thử lại.',
      );
    if (!data) throw new SupportApiError(502, 'Dịch vụ hỗ trợ trả về dữ liệu không hợp lệ.');
    return data as T;
  }
  context() {
    return this.request<{ agent: SupportAgent | null; agents: SupportAgent[] }>('/context');
  }
  agents() {
    return this.request<{ data: SupportAgent[] }>('/agents');
  }
  workspace(ids: string[]) {
    return this.request<{ data: import('../models/support.models').InboxConversation[] }>(
      '/workspace?' + new URLSearchParams({ ids: ids.join(',') }),
    );
  }
  queue(status: InboxLane, page: number, search: string, category: string, priority: string) {
    const params = new URLSearchParams({ status, page: String(page) });
    if (search.trim()) params.set('search', search.trim());
    if (category) params.set('category', category);
    if (priority) params.set('priority', priority);
    return this.request<InboxResponse>('/conversations?' + params);
  }
  detail(id: string, before?: number) {
    return this.request<ConversationDetail>(
      '/conversations/' + encodeURIComponent(id) + (before ? '?before=' + before : ''),
    );
  }
  action(id: string, action: string, body: object = {}) {
    return this.request('/conversations/' + encodeURIComponent(id) + '/' + action, body);
  }
  draft(id: string) {
    return this.request<{ text: string; requiresReview: boolean }>(
      '/conversations/' + encodeURIComponent(id) + '/draft',
      {},
    );
  }
}
