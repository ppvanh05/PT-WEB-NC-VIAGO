import { PrismaService } from '../../../../prisma/prisma.service';
import { CustomerNewsService } from '../../news/news.service';
import { HomePromotionsService } from '../promotions/promotions.service';
import { CustomerHomeService } from './home.service';

function fixture() {
  let active = 0;
  let transactions = 0;
  let failNews = false;
  const cities = [{ diemdi: 'Hồ Chí Minh', diemden: 'Cần Thơ' }];
  const tx = {
    tuyen_xe: { count: async () => 0, findMany: async () => [] },
    khuyen_mai: {
      fields: { soluongtoida: 'soluongtoida' },
      count: async () => 0,
      findMany: async () => [],
    },
    $queryRaw: async (query: { sql: string }) => {
      if (failNews) throw new Error('Database unavailable');
      return query.sql.includes('count(*)') ? [{ total: 0n }] : [];
    },
    tin_tuc: { findMany: async () => [] },
    danh_gia: {
      aggregate: async () => ({ _count: 0, _avg: { diemtongquat: null } }),
      findMany: async () => [],
    },
  };
  const prisma = {
    tuyen_xe: { findMany: async () => [...cities] },
    $transaction: async (read: (client: typeof tx) => Promise<unknown>) => {
      // A single available connection must be enough for a public home load.
      if (active) throw new Error('No transaction connection available');
      active++;
      transactions++;
      try {
        return await read(tx);
      } finally {
        active--;
      }
    },
  } as unknown as PrismaService;
  const home = new CustomerHomeService(
    prisma,
    new CustomerNewsService(prisma),
    new HomePromotionsService(prisma),
  );
  return {
    home,
    cities,
    transactions: () => transactions,
    failNews: (value: boolean) => { failNews = value; },
  };
}

describe('Customer home database contention', () => {
  it('serves overlapping home loads with one connection and one set of reads', async () => {
    const test = fixture();
    const pages = await Promise.all(
      Array.from({ length: 8 }, () => test.home.overview()),
    );
    expect(test.transactions()).toBe(4);
    for (const page of pages) {
      expect(page.cities).toEqual(['Cần Thơ', 'Hồ Chí Minh']);
      expect(page.latestNews).toEqual([]);
      expect(page.reviewStatistics).toEqual({ total: 0, averageRating: null });
    }
  });

  it('reads current database data again after the previous response completes', async () => {
    const test = fixture();
    await test.home.overview();
    test.cities.push({ diemdi: 'Đà Lạt', diemden: 'Cần Thơ' });
    expect((await test.home.overview()).cities).toContain('Đà Lạt');
    expect(test.transactions()).toBe(8);
  });

  it('propagates database failures and allows a fresh request to retry', async () => {
    const test = fixture();
    test.failNews(true);
    const results = await Promise.allSettled([
      test.home.overview(), test.home.overview(),
    ]);
    expect(results.every((result) => result.status === 'rejected')).toBe(true);
    test.failNews(false);
    expect((await test.home.overview()).cities).toHaveLength(2);
  });
});
