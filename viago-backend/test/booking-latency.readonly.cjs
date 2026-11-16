// Read-only comparison of the previous relation load and the new seat snapshot.
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const { performance } = require('node:perf_hooks');
const assert = require('node:assert/strict');
const { readOrderDetailTrips } = require('../dist/featured/customer/home/booking/order-detail-trips');
const { CustomerHomeService } = require('../dist/featured/customer/home/catalog/home.service');
const {
  readTrip,
} = require('../dist/featured/customer/home/catalog/home.service');
const {
  readSeatInventory,
  inventoryResponse,
} = require('../dist/featured/customer/home/booking/seat-inventory');
const db = new PrismaClient({ log: [{ emit: 'event', level: 'query' }] });
let queries = 0;
db.$on('query', () => {
  queries++;
});
(async () => {
  const report = await db.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '12000ms'");
      const trip = await tx.lich_trinh.findFirstOrThrow({
        where: { ghe_chuyen: { some: {} } },
        select: { malichtrinh: true },
      });
      const results = [];
      const baseline = await readTrip(tx, trip.malichtrinh);
      const detailTrips = await readOrderDetailTrips(tx, [trip.malichtrinh]);
      assert.deepEqual(CustomerHomeService.prototype.tripResponse(detailTrips.get(trip.malichtrinh), 'READ_ONLY'), CustomerHomeService.prototype.tripResponse(baseline, 'READ_ONLY'));
      const snapshot = await readSeatInventory(tx, trip.malichtrinh);
      if (
        baseline.ghe_chuyen.length !==
        inventoryResponse(snapshot).seatDetails.length
      )
        throw new Error('Inventory size mismatch');
      for (const [name, operation] of [
        ['previousTripRead', () => readTrip(tx, trip.malichtrinh)],
        ['seatInventoryRead', () => readSeatInventory(tx, trip.malichtrinh)],
        ['orderDetailTripRead', () => readOrderDetailTrips(tx, [trip.malichtrinh])],
      ]) {
        const samples = [];
        for (let index = 0; index < 3; index++) {
          const before = queries,
            started = performance.now();
          await operation();
          samples.push({
            milliseconds: Math.round(performance.now() - started),
            queries: queries - before,
          });
        }
        results.push({ name, samples });
      }
      return { readOnly: true, includesAuthentication: false, results };
    },
    { timeout: 120000, maxWait: 15000 },
  );
  console.log(JSON.stringify(report, null, 2));
})()
  .catch((e) => {
    console.error(
      JSON.stringify({
        name: e.name,
        code: e.code || e.errorCode || null,
        message: 'Read-only timing check failed',
      }),
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
