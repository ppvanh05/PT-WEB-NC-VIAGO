// Optional live smoke test: SELECTs only, never creates accounts or sessions.
require('dotenv/config');
require('reflect-metadata');
const assert = require('node:assert/strict');
const { PrismaService } = require('../dist/prisma/prisma.service');
const { AccountsAccess } = require('../dist/shared/accounts/accounts-access');
const {
  CustomerAuthService,
} = require('../dist/featured/customer/auth/customer-auth.service');
const {
  CustomerProfileService,
} = require('../dist/featured/customer/profile/customer-profile.service');
const {
  EmployeesService,
} = require('../dist/featured/admin/employees/employees.service');
const {
  CustomersService,
} = require('../dist/featured/admin/customers/accounts/customers.service');
const {
  ActivityLogsService,
} = require('../dist/featured/admin/activity-logs/activity-logs.service');
const db = new PrismaService();
async function main() {
  await db.$connect();
  const access = new AccountsAccess(db),
    auth = new CustomerAuthService(db, access),
    profile = new CustomerProfileService(db, access, auth);
  const employees = new EmployeesService(db, access),
    customers = new CustomersService(db, access),
    logs = new ActivityLogsService(db);
  const q = { page: 1, pageSize: 2 };
  const staff = await employees.list(q);
  assert.ok(Array.isArray(staff.items));
  if (staff.items[0]) {
    const detail = await employees.detail(staff.items[0].code);
    assert.equal(detail.code, staff.items[0].code);
    assert.ok(!JSON.stringify(detail).includes('matkhauhash'));
  }
  const options = await employees.options();
  assert.ok(options.roles.length);
  assert.ok(options.permissions.length);
  console.log(
    'PASS Supabase employee list/detail and actual role/permission catalogs',
  );
  const clients = await customers.list(q);
  assert.ok(Array.isArray(clients.items));
  const tiers = await customers.options();
  assert.ok(Array.isArray(tiers.memberTiers));
  if (clients.items[0]) {
    const detail = await customers.detail(clients.items[0].code);
    assert.equal(detail.code, clients.items[0].code);
    const tickets = await profile.tickets(detail.code, {
      ...q,
      sort: 'newest',
    });
    assert.ok(Array.isArray(tickets.items));
    const vouchers = await profile.vouchers(detail.code, q);
    assert.ok(Array.isArray(vouchers.items));
  }
  console.log(
    'PASS Supabase customer list/detail, membership, ticket and voucher queries',
  );
  const registered = await db.khach_hang.findFirst({
    where: { mataikhoan: { not: null } },
    select: { mataikhoan: true, makhachhang: true },
  });
  if (registered) {
    const result = await profile.current({
      accountId: registered.mataikhoan,
      customerId: registered.makhachhang,
    });
    assert.equal(result.id, registered.makhachhang);
    assert.ok(!JSON.stringify(result).includes('matkhauhash'));
    console.log(
      'PASS Supabase registered customer profile and spending/ticket aggregates',
    );
  }
  const page = await logs.list(q);
  assert.ok(Array.isArray(page.items));
  if (page.items[0])
    assert.equal((await logs.detail(page.items[0].id)).id, page.items[0].id);
  const statistics = await logs.statistics();
  assert.ok(Number.isInteger(statistics.total));
  console.log('PASS Supabase audit list/detail/statistics');
}
main()
  .catch((e) => {
    console.error(
      JSON.stringify({
        code: e.code || e.name,
        reason: e.meta?.code || 'Read-only smoke test failed',
      }),
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
