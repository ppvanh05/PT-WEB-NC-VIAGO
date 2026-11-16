const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const { Prisma } = require('@prisma/client');
const {
  HomeBookingService,
} = require('../dist/featured/customer/home/booking/booking.service');
const {
  AdminBookingOrdersService,
} = require('../dist/featured/admin/booking-management/booking-orders.service');
const {
  inventoryResponse,
  readSeatInventory,
} = require('../dist/featured/customer/home/booking/seat-inventory');
const actor = { id: 'TK_TEST', staffId: 'NV_TEST' },
  session = 'ADMIN_TEST';
const lease = new Date(Date.now() + 120000);
const row = (overrides = {}) => ({
  tripId: 'LT_TEST',
  tripStatus: 'DangMoBan',
  departureAt: new Date(Date.now() + 3600000),
  saleClosesAt: new Date(Date.now() + 1800000),
  advanceDays: 30,
  holdMinutes: 10,
  routeStatus: 'HoatDong',
  vehicleStatus: 'DangHoatDong',
  layoutId: 'LAYOUT',
  seatId: 'GC1',
  seatTripId: 'LT_TEST',
  label: '1A',
  floor: 1,
  row: 1,
  column: 1,
  type: 'GheNgoi',
  price: new Prisma.Decimal(160000),
  seatStatus: 'Trong',
  definitionStatus: 'HoatDong',
  seatLayoutId: 'LAYOUT',
  heldBySession: null,
  heldUntil: null,
  orderId: null,
  orderStatus: null,
  orderExpiresAt: null,
  hasTicket: false,
  ...overrides,
});
function database(rows) {
  const tx = {
    $queryRaw: mock.fn(async () => rows),
    don_hang: { findFirst: mock.fn(async () => null) },
    ghe_chuyen: { updateMany: mock.fn(async () => ({ count: 1 })) },
  };
  const prisma = { ...tx, $transaction: async (fn) => fn(tx) };
  return { tx, prisma, service: new HomeBookingService(prisma, {}, {}) };
}
void test('inventory reads one query, never cleans expired orders or writes data', async () => {
  const { tx, prisma } = database([row()]);
  const booking = { cleanupExpired: mock.fn() };
  const result = await new AdminBookingOrdersService(prisma, booking, {}).seats(
    'LT_TEST',
  );
  assert.equal(result.availableSeats, 1);
  assert.equal(result.seatDetails[0].label, '1A');
  assert.equal(tx.$queryRaw.mock.callCount(), 1);
  assert.equal(booking.cleanupExpired.mock.callCount(), 0);
  assert.equal(tx.ghe_chuyen.updateMany.mock.callCount(), 0);
});
void test('read-only expiry does not revive sold or locked seats', async () => {
  const { prisma } = database([
    row({ seatStatus: 'DangGiu', heldUntil: new Date(0) }),
    row({ seatId: 'GC2', hasTicket: true }),
    row({ seatId: 'GC3', definitionStatus: 'Khoa' }),
    row({
      seatId: 'GC4',
      seatStatus: 'DangGiu',
      heldUntil: lease,
      orderId: 'DH1',
      orderStatus: 'ChoThanhToanOnline',
      orderExpiresAt: new Date(0),
    }),
  ]);
  const result = inventoryResponse(await readSeatInventory(prisma, 'LT_TEST'));
  assert.deepEqual(
    result.seatDetails.map((s) => s.status),
    ['available', 'sold', 'locked', 'available'],
  );
});
void test('adding a seat only writes that seat and preserves the old deadline', async () => {
  const { tx, service } = database([
    row({ seatStatus: 'DangGiu', heldBySession: session, heldUntil: lease }),
    row({ seatId: 'GC2' }),
  ]);
  const result = await service.holdAdmin(
    session,
    'LT_TEST',
    ['GC1', 'GC2'],
    actor,
  );
  assert.equal(result.expiresAt, lease.toISOString());
  assert.deepEqual(result.releasedSeatIds, []);
  assert.equal(tx.$queryRaw.mock.callCount(), 1);
  assert.equal(tx.ghe_chuyen.updateMany.mock.callCount(), 1);
  assert.deepEqual(
    tx.ghe_chuyen.updateMany.mock.calls[0].arguments[0].where.maghechuyen.in,
    ['GC2'],
  );
});
void test('unchanged selections write nothing and do not extend expiry', async () => {
  const { tx, service } = database([
    row({ seatStatus: 'DangGiu', heldBySession: session, heldUntil: lease }),
  ]);
  assert.equal(
    (await service.holdAdmin(session, 'LT_TEST', ['GC1'], actor)).expiresAt,
    lease.toISOString(),
  );
  assert.equal(tx.ghe_chuyen.updateMany.mock.callCount(), 0);
});
void test('deselecting only releases the removed seat', async () => {
  const { tx, service } = database([
    row({ seatStatus: 'DangGiu', heldBySession: session, heldUntil: lease }),
    row({
      seatId: 'GC2',
      seatStatus: 'DangGiu',
      heldBySession: session,
      heldUntil: lease,
    }),
  ]);
  const result = await service.holdAdmin(session, 'LT_TEST', ['GC2'], actor);
  assert.deepEqual(result.releasedSeatIds, ['GC1']);
  assert.equal(tx.ghe_chuyen.updateMany.mock.callCount(), 1);
  assert.equal(
    tx.ghe_chuyen.updateMany.mock.calls[0].arguments[0].data.trangthaighe,
    'Trong',
  );
});
for (const overrides of [
  { seatStatus: 'DangGiu', heldBySession: 'OTHER', heldUntil: lease },
  { hasTicket: true },
  { definitionStatus: 'Khoa' },
  { seatLayoutId: 'OTHER' },
]) {
  void test(
    'unavailable seat is not written: ' + JSON.stringify(overrides),
    async () => {
      const { tx, service } = database([row(overrides)]);
      await assert.rejects(
        service.holdAdmin(session, 'LT_TEST', ['GC1'], actor),
        { status: 409 },
      );
      assert.equal(tx.ghe_chuyen.updateMany.mock.callCount(), 0);
    },
  );
}
void test('expired unassigned lease is acquired with a conditional write', async () => {
  const { tx, service } = database([
    row({
      seatStatus: 'DangGiu',
      heldBySession: 'OTHER',
      heldUntil: new Date(0),
    }),
  ]);
  await service.holdAdmin(session, 'LT_TEST', ['GC1'], actor);
  assert.equal(
    tx.ghe_chuyen.updateMany.mock.calls[0].arguments[0].data.sessiongiucho,
    session,
  );
});
void test('lost concurrent update fails rather than claiming success', async () => {
  const { tx, service } = database([row()]);
  tx.ghe_chuyen.updateMany.mock.mockImplementation(async () => ({ count: 0 }));
  await assert.rejects(service.holdAdmin(session, 'LT_TEST', ['GC1'], actor), {
    status: 409,
  });
});
void test('closed trips and seats from other schedules cannot be held', async () => {
  await assert.rejects(
    database([row({ tripStatus: 'DaDongBan' })]).service.holdAdmin(
      session,
      'LT_TEST',
      ['GC1'],
      actor,
    ),
    { status: 409 },
  );
  await assert.rejects(
    database([row({ seatTripId: 'OTHER' })]).service.holdAdmin(
      session,
      'LT_TEST',
      ['GC1'],
      actor,
    ),
    { status: 400 },
  );
});
