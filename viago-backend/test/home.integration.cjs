// Read-only regression: a small pool and overlapping home requests must work.
const assert = require('node:assert/strict');
const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
require('reflect-metadata');
const url = new URL(process.env.DATABASE_URL);
url.searchParams.set('connection_limit', '1');
url.searchParams.set('pool_timeout', '15');
process.env.DATABASE_URL = url.toString();

const { Test } = require('@nestjs/testing');
const request = require('supertest');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { CustomerHomeModule } = require('../dist/featured/customer/home/home.module');
const db = new PrismaService();
let app;

async function run() {
  await db.$connect();
  let ready;
  const acquired = new Promise((resolve) => { ready = resolve; });
  // Hold the sole connection for longer than Prisma's default 2s maxWait.
  const blocker = db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT 1`;
    ready();
    await new Promise((resolve) => setTimeout(resolve, 2800));
  }, { timeout: 10000 });
  const waiting = acquired.then(() =>
    db.$transaction((tx) => tx.$queryRaw`SELECT 1`),
  );
  await Promise.all([blocker, waiting]);
  console.log('PASS transaction waits for a busy connection beyond 2 seconds');

  const module = await Test.createTestingModule({ imports: [CustomerHomeModule] })
    .overrideProvider(PrismaService).useValue(db).compile();
  app = module.createNestApplication({ logger: false });
  await app.init();
  const api = request(app.getHttpServer());
  const responses = await Promise.all(Array.from({ length: 8 }, () =>
    api.get('/customer/home').expect(200),
  ));
  for (const { body } of responses) {
    for (const key of ['cities', 'featuredRoutes', 'promotions', 'latestNews', 'reviews'])
      assert.ok(Array.isArray(body[key]), key);
    assert.ok(body.featuredRoutes.length <= 3);
    assert.ok(body.latestNews.length <= 3);
    assert.equal(typeof body.reviewStatistics.total, 'number');
    assert.deepEqual(body, responses[0].body);
  }
  console.log('PASS 8 concurrent home API requests return Supabase data with one connection');
  await api.get('/customer/home').expect(200);
  console.log('PASS a subsequent home API request succeeds without a stale response');
  console.log(JSON.stringify({ groupsPassed: 3, databaseWrites: 0 }));
}

run().catch((error) => {
  // Do not print database URLs or real customer data.
  console.error(error.name, error.code || '', error.message);
  process.exitCode = 1;
}).finally(async () => {
  if (app) await app.close();
  await db.$disconnect();
});
