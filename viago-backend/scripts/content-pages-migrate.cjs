// One-time import of the existing authored site copy. This is never a runtime fallback.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
const { PrismaClient } = require('@prisma/client');
const data = JSON.parse(
  fs.readFileSync(path.join(root, 'prisma/content-pages.json'), 'utf8'),
);
const db = new PrismaClient();
(async () => {
  if (!process.argv.includes('--apply')) {
    console.log(
      JSON.stringify({
        mode: 'preview',
        pages: data.map(({ slug, loai, tieude }) => ({ slug, loai, tieude })),
        overwriteExisting: false,
      }),
    );
    return;
  }
  await db.$transaction(async (tx) => {
    for (const page of data) {
      await tx.$executeRaw`INSERT INTO public.noi_dung_trang (slug, loai, tieude, noidung, thutu)
        VALUES (${page.slug}, ${page.loai}, ${page.tieude}, ${JSON.stringify(page.noidung)}::jsonb, ${page.thutu || 0})
        ON CONFLICT (slug) DO NOTHING`;
    }
  });
  console.log(
    JSON.stringify({
      imported: true,
      pages: data.length,
      overwriteExisting: false,
    }),
  );
})()
  .catch((e) => {
    console.error(JSON.stringify({ error: e.code || e.name }));
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
