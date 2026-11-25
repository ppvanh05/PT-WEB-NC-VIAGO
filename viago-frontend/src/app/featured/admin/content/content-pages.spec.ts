import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AdminSessionService } from '../../../core/services/admin-session.service';
import { ContentManager } from './content-manager/content-manager';
import { News } from './news/news';
import { Policies } from './policies/policies';
import { PromotionsComponent } from './promotions/promotions';

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

function kindOf(type: typeof News | typeof Policies | typeof PromotionsComponent) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [type],
    providers: [
      provideRouter([]),
      {
        provide: AdminSessionService,
        useValue: { headers: () => ({ Authorization: 'Bearer test-session' }), invalidate: vi.fn() },
      },
    ],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  return fixture.debugElement.query(By.directive(ContentManager)).componentInstance.kind;
}

describe('Admin content pages', () => {
  beforeEach(() => {
    // Ba trang này chỉ là vỏ; chúng tải dữ liệu qua ContentManager nên phải chặn mạng.
    vi.stubGlobal('fetch', vi.fn(async () => json({ items: [], pagination: { totalPages: 1 } })));
  });

  it('opens the shared content manager in news mode', () => {
    expect(kindOf(News)).toBe('news');
  });

  it('opens the shared content manager in policy mode', () => {
    expect(kindOf(Policies)).toBe('policies');
  });

  it('opens the shared content manager in promotion mode', () => {
    expect(kindOf(PromotionsComponent)).toBe('promotions');
  });
});
