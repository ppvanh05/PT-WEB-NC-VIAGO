// Explicitly requested starter data, persisted in Supabase; no frontend mock fallback.
const fs = require('node:fs/promises'),
  path = require('node:path');
const root = path.resolve(__dirname, '..');
process.chdir(root);
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
const { PrismaClient } = require('@prisma/client');
const { nextBusinessId } = require('../dist/shared/business-id');
const data = require('../prisma/intake-data.json');
const db = new PrismaClient();
const uploadRoot = path.resolve(
  root,
  process.env.CV_UPLOAD_DIR || 'uploads/private/cv',
);
const workspace = path.resolve(root, '..');
if (!uploadRoot.toLowerCase().startsWith(workspace.toLowerCase() + path.sep))
  throw new Error(
    'CV_UPLOAD_DIR must remain inside this workspace for this import.',
  );
(async () => {
  const preview = {
    applications: data.applications.length,
    contacts: data.contacts.length,
    overwriteExisting: false,
    prefixes: { applications: 'UV', contacts: 'LH' },
  };
  if (!process.argv.includes('--apply')) {
    console.log(JSON.stringify({ mode: 'preview', ...preview }));
    return;
  }
  const files = [];
  let committed = false;
  try {
    const result = await db.$transaction(
      async (tx) => {
        const staff = await tx.nhan_vien.findFirstOrThrow({
          where: { trangthai: 'HoatDong' },
          orderBy: { manhanvien: 'asc' },
          select: { manhanvien: true },
        });
        const inserted = { applications: [], contacts: [] };
        await fs.mkdir(uploadRoot, { recursive: true });
        for (let i = 0; i < data.applications.length; i++) {
          const item = data.applications[i],
            email =
              'viago.ungvien.' +
              String(i + 1).padStart(2, '0') +
              '@example.invalid';
          if (
            await tx.ho_so_ung_tuyen.findFirst({
              where: { email },
              select: { mahoso: true },
            })
          )
            continue;
          await tx.tin_tuyen_dung.findUniqueOrThrow({
            where: { matin: item.jobId },
            select: { matin: true },
          });
          const id = await nextBusinessId(tx, 'UV'),
            reference = id + '.pdf',
            destination = path.join(uploadRoot, reference);
          await fs.copyFile(
            path.resolve(
              root,
              '../artifacts/intake-cv/candidate-' +
                String(i + 1).padStart(2, '0') +
                '.pdf',
            ),
            destination,
            require('node:fs').constants.COPYFILE_EXCL,
          );
          files.push(destination);
          await tx.ho_so_ung_tuyen.create({
            data: {
              mahoso: id,
              matin: item.jobId,
              hoten: item.name,
              sodienthoai: '090000' + String(i + 101).padStart(4, '0'),
              email,
              ngaysinh: new Date(1990 + (i % 9) + '-06-15T00:00:00Z'),
              diachi: 'TP. Hồ Chí Minh',
              trinhdohocvan: item.education,
              kinhnghiem: item.experience,
              filecv: reference,
              thugioithieu:
                'Mong muốn ứng tuyển vị trí phù hợp với kinh nghiệm và làm việc lâu dài tại VIAGO. Hồ sơ khởi tạo theo yêu cầu để kiểm tra quy trình tuyển dụng.',
              thoigianungtuyen: new Date(Date.now() - (i + 1) * 3600000),
              trangthai: item.status,
            },
          });
          inserted.applications.push(id);
        }
        for (let i = 0; i < data.contacts.length; i++) {
          const item = data.contacts[i],
            email =
              'viago.lienhe.' +
              String(i + 1).padStart(2, '0') +
              '@example.invalid';
          if (
            await tx.yeu_cau_lien_he.findFirst({
              where: { email },
              select: { malienhe: true },
            })
          )
            continue;
          const id = await nextBusinessId(tx, 'LH');
          await tx.yeu_cau_lien_he.create({
            data: {
              malienhe: id,
              hoten: item.name,
              sodienthoai: '091000' + String(i + 101).padStart(4, '0'),
              email,
              chude: item.subject,
              noidung: item.message,
              thoigiangui: new Date(Date.now() - (i + 1) * 7200000),
              trangthai: item.status,
              manhanvienxuly: item.status === 'Moi' ? null : staff.manhanvien,
            },
          });
          inserted.contacts.push(id);
        }
        return inserted;
      },
      { timeout: 60000, maxWait: 10000 },
    );
    committed = true;
    console.log(
      JSON.stringify({
        inserted: result,
        totals: {
          applications: await db.ho_so_ung_tuyen.count(),
          contacts: await db.yeu_cau_lien_he.count(),
        },
      }),
    );
  } finally {
    if (!committed)
      for (const file of files) await fs.unlink(file).catch(() => {});
  }
})()
  .catch((e) => {
    console.error(
      JSON.stringify({
        error: e.code || e.name,
        message: 'Intake import failed; database transaction was rolled back.',
      }),
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
