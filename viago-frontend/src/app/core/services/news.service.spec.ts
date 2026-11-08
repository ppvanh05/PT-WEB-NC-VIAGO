import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { NewsService } from './news.service';
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
describe('News database API', () => {
  afterEach(() => vi.unstubAllGlobals());
  it('requests server pagination and category filtering instead of filtering a seed array', async () => {
    const fetchMock = vi.fn(async () =>
      json({ data: [], pagination: { total: 41, page: 2, totalPages: 4 } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const api = TestBed.inject(NewsService),
      result = await api.list({
        category: 'promotion',
        search: 'ưu đãi',
        time: 'month',
        sort: 'popular',
        page: 2,
        pageSize: 12,
      });
    expect(result.pagination.total).toBe(41);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/customer\/news\?.*category=promotion.*page=2/),
      expect.objectContaining({ credentials: 'include', cache: 'no-store' }),
    );
  });
  it('rejects a missing article rather than substituting a different article', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => json({ message: 'Not found' }, 404)),
    );
    await expect(TestBed.inject(NewsService).article('missing')).rejects.toThrow('Not found');
  });
  it('saves comments and toggles persisted likes using cookie credentials', async () => {
    const fetchMock = vi.fn(async () => json({ id: 'BL001', likes: 1, isLiked: true }));
    vi.stubGlobal('fetch', fetchMock);
    const api = TestBed.inject(NewsService);
    await api.addComment('TT001', ' Reader ', ' Comment ');
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/customer/news/TT001/comments',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ authorName: 'Reader', content: 'Comment' }),
      }),
    );
    const comment = {
      id: 'BL001',
      authorName: 'Reader',
      content: 'Comment',
      createdAt: '',
      likes: 0,
      isLiked: false,
    };
    await api.toggleLike('TT001', comment);
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/customer/news/TT001/comments/BL001/like',
      expect.objectContaining({ method: 'PUT', credentials: 'include' }),
    );
    await api.toggleLike('TT001', { ...comment, isLiked: true });
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/customer/news/TT001/comments/BL001/like',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });
});
