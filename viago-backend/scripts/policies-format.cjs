const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true });
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const headings = new Map([
  ['CS00001', 'ĐẶT VÉ VÀ GIỮ CHỖ TRỰC TUYẾN'],
  ['CS00002', 'CHỈNH SỬA THÔNG TIN VÉ'],
  ['CS00003', 'HỦY VÉ VÀ HOÀN TIỀN'],
  ['CS00004', 'CAM KẾT DỊCH VỤ VÀ BỒI THƯỜNG'],
]);

async function run() {
  const rows = await db.chinh_sach.findMany({
    select: { machinhsach: true, tieude: true, loaichinhsach: true, noidung: true },
    orderBy: { machinhsach: 'asc' },
  });
  const changes = rows.flatMap((row) => {
    const heading = headings.get(row.machinhsach);
    if (!heading || row.noidung.split(/\r?\n/, 1)[0] !== heading) return [];
    const content = row.noidung.slice(heading.length).replace(/^\r?\n+/, '');
    assert.ok(content.trim(), 'Cannot remove the whole document');
    return [{ ...row, content }];
  });
  console.log(JSON.stringify({
    mode: process.argv.includes('--apply') ? 'apply' : 'preview',
    changes: changes.map((row) => ({
      id: row.machinhsach, title: row.tieude,
      removedHeading: headings.get(row.machinhsach),
      newFirstLine: row.content.split(/\r?\n/, 1)[0],
    })),
  }, null, 2));
  if (!process.argv.includes('--apply') || !changes.length) return;

  // Preserve the exact original published text before updating anything.
  const backupDirectory = path.join(__dirname, '../.tmp');
  fs.mkdirSync(backupDirectory, { recursive: true });
  const backupPath = path.join(backupDirectory, `policies-format-${Date.now()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(changes, null, 2), { flag: 'wx' });
  await db.$transaction(async (tx) => {
    for (const row of changes) {
      // Abort atomically if an administrator changed the copy since preview.
      const result = await tx.chinh_sach.updateMany({
        where: { machinhsach: row.machinhsach, noidung: row.noidung },
        data: { noidung: row.content, thoigiancapnhat: new Date() },
      });
      assert.equal(result.count, 1, `Content changed concurrently: ${row.machinhsach}`);
    }
  }, { maxWait: 10000, timeout: 15000 });
  const saved = await db.chinh_sach.findMany({
    where: { machinhsach: { in: rows.map((row) => row.machinhsach) } },
    select: { machinhsach: true, tieude: true, noidung: true },
  });
  for (const before of rows) {
    const after = saved.find((row) => row.machinhsach === before.machinhsach);
    assert.equal(after?.tieude, before.tieude);
    assert.equal(after?.noidung,
      changes.find((row) => row.machinhsach === before.machinhsach)?.content ?? before.noidung);
  }
  console.log(JSON.stringify({ updated: changes.length, verified: true, backupPath }));
}

run().catch((error) => {
  console.error(error.code || error.name);
  process.exitCode = 1;
}).finally(() => db.$disconnect());
