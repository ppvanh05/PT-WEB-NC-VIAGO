const path = require('node:path'),
  fs = require('node:fs/promises'),
  assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
require(path.join(root, 'node_modules/dotenv')).config({
  path: path.join(root, '.env'),
  quiet: true,
});
require(path.join(root, 'node_modules/reflect-metadata'));
const { randomBytes, createHash } = require('node:crypto');
const { Test } = require(path.join(root, 'node_modules/@nestjs/testing'));
const { PrismaClient } = require(
  path.join(root, 'node_modules/@prisma/client'),
);
const request = require(path.join(root, 'node_modules/supertest'));
const { PrismaService } = require(
  path.join(root, 'dist/prisma/prisma.service'),
);
const { AdminIntakeModule } = require(
  path.join(root, 'dist/featured/admin/intake/intake.module'),
);
const { CustomerAboutModule } = require(
  path.join(root, 'dist/featured/customer/about/about.module'),
);
const { AdminNewsModule } = require(
  path.join(root, 'dist/featured/admin/content/news/news.module'),
);
const { AdminPoliciesModule } = require(
  path.join(root, 'dist/featured/admin/content/policies/policies.module'),
);
const { AdminPromotionsModule } = require(
  path.join(root, 'dist/featured/admin/content/promotions/promotions.module'),
);
const { CustomerNewsModule } = require(
  path.join(root, 'dist/featured/customer/news/news.module'),
);
const { CustomerHomeModule } = require(
  path.join(root, 'dist/featured/customer/home/home.module'),
);
const suffix = randomBytes(6).toString('hex'),
  token = randomBytes(32).toString('hex');
process.env.NEWS_SCHEDULER_ENABLED = 'false';
process.env.CV_UPLOAD_DIR = path.resolve(
  root,
  '../artifacts/intake-cv-' + suffix,
);
const db = new PrismaClient(),
  results = [],
  cleanup = [];
let app;
const check = async (name, fn) => {
  await fn();
  results.push(name);
  console.log('PASS ' + name);
};
async function run(tx) {
  const prisma = new Proxy(tx, {
    get(target, prop) {
      if (prop === '$transaction')
        return async (fn) =>
          typeof fn === 'function' ? fn(prisma) : Promise.all(fn);
      if (
        ['$connect', '$disconnect', 'onModuleInit', 'onModuleDestroy'].includes(
          prop,
        )
      )
        return async () => {};
      return Reflect.get(target, prop);
    },
  });
  const module = await Test.createTestingModule({
    imports: [
      AdminIntakeModule,
      CustomerAboutModule,
      AdminNewsModule,
      AdminPoliciesModule,
      AdminPromotionsModule,
      CustomerNewsModule,
      CustomerHomeModule,
    ],
  })
    .overrideProvider(PrismaService)
    .useValue(prisma)
    .compile();
  app = module.createNestApplication({ logger: false });
  await app.init();
  const api = request(app.getHttpServer());
  const staff = await tx.nhan_vien.findFirstOrThrow({
    where: {
      trangthai: 'HoatDong',
      tai_khoan: { trangthai: 'HoatDong', vaitrotaikhoan: 'NhanVien' },
    },
  });
  await tx.phien_dang_nhap.create({
    data: {
      maphien: 'PDN_INTAKE_' + suffix,
      mataikhoan: staff.mataikhoan,
      tokenphien: createHash('sha256').update(token).digest('hex'),
      tenthietbi: 'Integration test',
      trinhduyet: 'supertest',
      diachiip: '127.0.0.1',
      thoigiandangnhap: new Date(),
      thoigianhoatdongcuoi: new Date(),
      thoigianhethan: new Date(Date.now() + 600000),
      trangthai: 'DangHoatDong',
    },
  });
  const admin = (method, url) =>
    api[method](url).set('Authorization', 'Bearer ' + token);
  await check('all intake routes require a real admin session', async () => {
    for (const url of [
      '/admin/contacts',
      '/admin/contacts/options',
      '/admin/contacts/nope',
      '/admin/applications',
      '/admin/applications/options',
      '/admin/applications/nope/cv',
      '/admin/jobs',
      '/admin/jobs/nope',
    ])
      await api.get(url).expect(401);
    await api
      .patch('/admin/contacts/nope/status')
      .send({ status: 'DaXuLy', expectedStatus: 'Moi' })
      .expect(401);
    await api.post('/admin/jobs').send({}).expect(401);
    await api.patch('/admin/jobs/nope').send({}).expect(401);
  });
  const publicCounts = {};
  await check(
    'existing public and admin read APIs query Supabase successfully',
    async () => {
      for (const url of [
        '/customer/about/faq',
        '/customer/about/policies',
        '/customer/about/terms',
        '/customer/about/guide',
        '/customer/about/about-us',
        '/customer/about/careers',
        '/customer/news',
        '/customer/news/categories',
        '/customer/home',
        '/customer/home/promotions',
      ]) {
        const r = await api.get(url).expect(200);
        publicCounts[url] =
          r.body.pagination?.total ?? r.body.data?.length ?? 'ok';
      }
      for (const url of [
        '/admin/news',
        '/admin/policies',
        '/admin/promotions',
      ]) {
        await api.get(url).expect(401);
        const r = await admin('get', url).expect(200);
        publicCounts[url] = {
          status: 200,
          authenticated: true,
          total: r.body.pagination?.total,
        };
      }
    },
  );
  let contactId;
  await check(
    'contact submitted publicly is searchable in admin with correct subject',
    async () => {
      await api
        .post('/customer/about/contact')
        .send({
          fullName: 'Intake test ' + suffix,
          phone: '0900000000',
          email: suffix + '@example.invalid',
          subject: 'HoTroDatVe',
          message: 'Integration test ' + suffix,
        })
        .expect(201);
      const list = (
        await admin(
          'get',
          '/admin/contacts?search=' + suffix + '&pageSize=1',
        ).expect(200)
      ).body;
      assert.equal(list.pagination.total, 1);
      assert.equal(list.data[0].status, 'Moi');
      contactId = list.data[0].id;
      const detail = (
        await admin('get', '/admin/contacts/' + contactId).expect(200)
      ).body;
      assert.equal(detail.message, 'Integration test ' + suffix);
      assert.deepEqual(detail.history, []);
      assert.equal(
        (await admin('get', '/admin/contacts/options').expect(200)).body
          .subjects.length,
        5,
      );
    },
  );
  await check(
    'contact status, assignee and internal note persist atomically; stale updates rejected',
    async () => {
      const r = (
        await admin('patch', '/admin/contacts/' + contactId + '/status')
          .send({
            status: 'DangXuLy',
            expectedStatus: 'Moi',
            note: 'Called customer',
          })
          .expect(200)
      ).body;
      assert.equal(r.status, 'DangXuLy');
      assert.equal(r.assignedTo, staff.hoten);
      assert.equal(r.history[0].note, 'Called customer');
      await admin('patch', '/admin/contacts/' + contactId + '/status')
        .send({ status: 'DaXuLy', expectedStatus: 'Moi' })
        .expect(409);
      await admin('patch', '/admin/contacts/' + contactId + '/status')
        .send({ status: 'bogus', expectedStatus: 'DangXuLy' })
        .expect(400);
      await admin('patch', '/admin/contacts/' + contactId + '/status')
        .send({
          status: 'DaXuLy',
          expectedStatus: 'DangXuLy',
          note: 'Resolved',
        })
        .expect(200);
      const r2 = (
        await admin('get', '/admin/contacts/' + contactId).expect(200)
      ).body;
      assert.equal(r2.history.length, 2);
      await admin('get', '/admin/contacts?pageSize=101').expect(400);
      await admin('get', '/admin/contacts?status=bad').expect(400);
      await admin('get', '/admin/contacts/no-such-id').expect(404);
    },
  );
  const jobs = (await api.get('/customer/about/careers').expect(200)).body.data;
  await check(
    'contact priority, delegation and reply draft persist; same-status stale writes cannot overwrite them',
    async () => {
      const before = (
        await admin('get', '/admin/contacts/' + contactId).expect(200)
      ).body;
      const options = (
        await admin('get', '/admin/contacts/options').expect(200)
      ).body;
      assert(options.staff.some((s) => s.id === staff.manhanvien));
      const edit = {
        status: before.status,
        expectedStatus: before.status,
        expectedVersion: before.version,
        assignedStaffId: staff.manhanvien,
        priority: 'Cao',
        replyDraft: 'Draft only: ' + suffix,
        note: 'Delegated and prioritised',
      };
      const after = (
        await admin('patch', '/admin/contacts/' + contactId + '/status')
          .send(edit)
          .expect(200)
      ).body;
      assert.equal(after.priority, 'Cao');
      assert.equal(after.assignedStaffId, staff.manhanvien);
      assert.equal(after.replyDraft, 'Draft only: ' + suffix);
      assert.equal(after.version, before.version + 1);
      assert(new Date(after.updatedAt) > new Date(before.updatedAt));
      assert.equal(after.history[0].after.priority, 'Cao');
      await admin('patch', '/admin/contacts/' + contactId + '/status')
        .send({ ...edit, priority: 'KhanCap' })
        .expect(409);
      await admin('patch', '/admin/contacts/' + contactId + '/status')
        .send({
          ...edit,
          expectedVersion: after.version,
          assignedStaffId: 'NV_NOT_FOUND',
        })
        .expect(400);
      const list = (
        await admin('get', '/admin/contacts?search=' + suffix).expect(200)
      ).body.data[0];
      assert.equal(list.priority, 'Cao');
      assert.equal(list.replyDraft, after.replyDraft);
      assert.equal(list.version, after.version);
    },
  );
  assert(jobs.length);
  const job = jobs[0],
    email = suffix + '@example.invalid';
  let applicationId;
  const pdf = Buffer.from(
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF',
  );
  const apply = () =>
    api
      .post('/customer/about/careers/' + job.id + '/applications')
      .field('fullName', 'Intake candidate ' + suffix)
      .field('email', email)
      .field('phoneNumber', '0900000000')
      .field('agreeTerms', 'true')
      .field('introduction', 'Applicant test ' + suffix)
      .attach('cv', pdf, 'resume.pdf');
  await check(
    'real multipart CV application reaches admin; no private file path exposed',
    async () => {
      await apply().expect(201);
      const r = (
        await admin('get', '/admin/applications?search=' + suffix).expect(200)
      ).body;
      assert.equal(r.pagination.total, 1);
      applicationId = r.data[0].id;
      const row = await tx.ho_so_ung_tuyen.findUniqueOrThrow({
        where: { mahoso: applicationId },
      });
      cleanup.push(row.filecv);
      const detail = (
        await admin('get', '/admin/applications/' + applicationId).expect(200)
      ).body;
      assert.equal(detail.jobId, job.id);
      assert.equal(detail.hasCv, true);
      assert.equal(detail.filecv, undefined);
      assert.equal(detail.introduction, 'Applicant test ' + suffix);
      assert(
        (await admin('get', '/admin/applications/options').expect(200)).body
          .jobs.length,
      );
      const download = await admin(
        'get',
        '/admin/applications/' + applicationId + '/cv',
      ).expect(200);
      assert.match(download.headers['content-disposition'], /attachment/);
      assert.equal(download.headers['cache-control'], 'no-store');
      assert.deepEqual(download.body, pdf);
    },
  );
  await check(
    'duplicate pending application stays single and orphan CV is removed',
    async () => {
      await apply().expect(201);
      assert.equal(await tx.ho_so_ung_tuyen.count({ where: { email } }), 1);
      assert.equal((await fs.readdir(process.env.CV_UPLOAD_DIR)).length, 1);
    },
  );
  await check(
    'application stages, history and notes survive reload; stale/invalid writes fail',
    async () => {
      await admin('patch', '/admin/applications/' + applicationId + '/status')
        .send({
          status: 'MoiPhongVan',
          expectedStatus: 'Moi',
          note: 'Interview scheduled internally',
        })
        .expect(200);
      await admin('patch', '/admin/applications/' + applicationId + '/status')
        .send({ status: 'TrungTuyen', expectedStatus: 'Moi' })
        .expect(409);
      await admin('patch', '/admin/applications/' + applicationId + '/status')
        .send({ status: 'bad', expectedStatus: 'MoiPhongVan' })
        .expect(400);
      const detail = (
        await admin('get', '/admin/applications/' + applicationId).expect(200)
      ).body;
      assert.equal(detail.status, 'MoiPhongVan');
      assert.equal(detail.history[0].after.status, 'MoiPhongVan');
      assert.equal(detail.history[0].actor, staff.hoten);
      await tx.ho_so_ung_tuyen.update({
        where: { mahoso: applicationId },
        data: { filecv: '../../.env' },
      });
      await admin('get', '/admin/applications/' + applicationId + '/cv').expect(
        404,
      );
    },
  );
  await check('invalid customer submissions are rejected', async () => {
    await api
      .post('/customer/about/contact')
      .send({ fullName: 'X', phone: 'bad', message: 'test' })
      .expect(400);
    await api
      .post('/customer/about/careers/' + job.id + '/applications')
      .field('fullName', 'X')
      .field('email', email)
      .field('phoneNumber', '0900000000')
      .field('agreeTerms', 'true')
      .attach('cv', Buffer.from('fake'), 'resume.pdf')
      .expect(400);
  });
  await check(
    'recruiter assignment, evaluation and interview date survive reload and reject stale versions',
    async () => {
      const before = (
        await admin('get', '/admin/applications/' + applicationId).expect(200)
      ).body;
      const interviewAt = '2026-12-20T09:30:00+07:00';
      const edit = {
        status: 'MoiPhongVan',
        expectedStatus: before.status,
        expectedVersion: before.version,
        assignedStaffId: staff.manhanvien,
        evaluation: 'Relevant experience; verify licence in interview',
        interviewAt,
        note: 'Reviewed CV',
      };
      const after = (
        await admin('patch', '/admin/applications/' + applicationId + '/status')
          .send(edit)
          .expect(200)
      ).body;
      assert.equal(after.assignedTo, staff.hoten);
      assert.equal(after.evaluation, edit.evaluation);
      assert.equal(
        new Date(after.interviewAt).getTime(),
        new Date(interviewAt).getTime(),
      );
      assert.equal(after.history[0].after.assignedStaffId, staff.manhanvien);
      await admin('patch', '/admin/applications/' + applicationId + '/status')
        .send({ ...edit, evaluation: 'Must not overwrite' })
        .expect(409);
      const list = (
        await admin('get', '/admin/applications?search=' + suffix).expect(200)
      ).body.data[0];
      assert.equal(list.evaluation, edit.evaluation);
      assert.equal(list.assignedStaffId, staff.manhanvien);
      const cleared = (
        await admin('patch', '/admin/applications/' + applicationId + '/status')
          .send({
            ...edit,
            expectedVersion: after.version,
            interviewAt: null,
            assignedStaffId: '',
          })
          .expect(200)
      ).body;
      assert.equal(cleared.interviewAt, null);
      assert.equal(cleared.assignedTo, null);
    },
  );
  await check(
    'admin publishes a new TD job; customer reads, applies, sees edits and cannot apply to closed jobs',
    async () => {
      const dto = {
        title: 'Integration job ' + suffix,
        department: 'Operations',
        location: 'Ho Chi Minh',
        workType: 'ToanThoiGian',
        deadline: '2099-12-31',
        description: 'Actual job description',
        requirements: 'Valid licence\nCustomer service',
        benefits: 'Insurance\nTraining',
        status: 'DangTuyen',
      };
      await admin('post', '/admin/jobs')
        .send({ ...dto, maNhanVien: 'spoof' })
        .expect(400);
      const created = (await admin('post', '/admin/jobs').send(dto).expect(201))
        .body;
      assert.match(created.id, /^TD\d{3,}$/);
      assert.equal(created.acceptingApplications, true);
      assert.equal(
        (
          await tx.tin_tuyen_dung.findUniqueOrThrow({
            where: { matin: created.id },
          })
        ).manhanvientao,
        staff.manhanvien,
      );
      const publicJob = (
        await api.get('/customer/about/careers/' + created.id).expect(200)
      ).body;
      assert.equal(publicJob.title, dto.title);
      assert.deepEqual(publicJob.benefits, ['Insurance', 'Training']);
      assert(
        (
          await api.get('/customer/about/careers?search=' + suffix).expect(200)
        ).body.data.some((j) => j.id === created.id),
      );
      assert(
        (
          await api.get('/customer/about/careers/options').expect(200)
        ).body.departments.includes(dto.department),
      );
      const submit = () =>
        api
          .post('/customer/about/careers/' + created.id + '/applications')
          .field('fullName', 'New position candidate ' + suffix)
          .field('email', 'job-' + suffix + '@example.invalid')
          .field('phoneNumber', '0900000001')
          .field('experience', 'Three years driving')
          .field('agreeTerms', 'true')
          .attach('cv', pdf, 'cv.pdf');
      await submit().expect(201);
      const application = await tx.ho_so_ung_tuyen.findFirstOrThrow({
        where: { matin: created.id },
      });
      cleanup.push(application.filecv);
      assert.equal(application.kinhnghiem, 'Three years driving');
      const adminList = (
        await admin('get', '/admin/applications?jobId=' + created.id).expect(
          200,
        )
      ).body;
      assert.equal(adminList.data[0].experience, application.kinhnghiem);
      assert.equal(adminList.data[0].hasCv, true);
      const updated = (
        await admin('patch', '/admin/jobs/' + created.id)
          .send({
            ...dto,
            title: 'Edited job ' + suffix,
            expectedUpdatedAt: created.updatedAt,
          })
          .expect(200)
      ).body;
      assert.equal(
        (await api.get('/customer/about/careers/' + created.id).expect(200))
          .body.title,
        updated.title,
      );
      await admin('patch', '/admin/jobs/' + created.id)
        .send({ ...dto, expectedUpdatedAt: created.updatedAt })
        .expect(409);
      const paused = (
        await admin('patch', '/admin/jobs/' + created.id)
          .send({
            ...dto,
            status: 'TamDung',
            expectedUpdatedAt: updated.updatedAt,
          })
          .expect(200)
      ).body;
      await api.get('/customer/about/careers/' + created.id).expect(404);
      const closed = (
        await admin('patch', '/admin/jobs/' + created.id)
          .send({
            ...dto,
            status: 'DaDong',
            expectedUpdatedAt: paused.updatedAt,
          })
          .expect(200)
      ).body;
      assert.equal(closed.acceptingApplications, false);
      await submit().expect(404);
      await admin('post', '/admin/jobs')
        .send({ ...dto, deadline: '2026-02-30' })
        .expect(400);
      await admin('post', '/admin/jobs')
        .send({ ...dto, deadline: '2020-01-01' })
        .expect(400);
      const list = (
        await admin('get', '/admin/jobs?search=' + suffix).expect(200)
      ).body;
      assert.equal(list.data.length, 1);
      assert.equal(list.data[0].applications, 1);
      assert.equal(list.data[0].status, 'DaDong');
    },
  );
  console.log(JSON.stringify({ publicCounts }));
  throw new Error('ROLLBACK_INTAKE_SUCCESS');
}
(async () => {
  try {
    await db.$transaction(run, { timeout: 180000, maxWait: 15000 });
  } catch (e) {
    if (e.message !== 'ROLLBACK_INTAKE_SUCCESS') throw e;
  } finally {
    await app?.close();
    for (const file of cleanup)
      await fs
        .unlink(path.join(process.env.CV_UPLOAD_DIR, file))
        .catch(() => {});
    await fs.rmdir(process.env.CV_UPLOAD_DIR).catch(() => {});
  }
  assert.equal(
    await db.yeu_cau_lien_he.count({
      where: { email: suffix + '@example.invalid' },
    }),
    0,
  );
  assert.equal(
    await db.ho_so_ung_tuyen.count({
      where: { email: suffix + '@example.invalid' },
    }),
    0,
  );
  assert.equal(
    await db.phien_dang_nhap.count({
      where: { maphien: 'PDN_INTAKE_' + suffix },
    }),
    0,
  );
  console.log(
    JSON.stringify({ groupsPassed: results.length, rolledBack: true }),
  );
})()
  .catch((e) => {
    console.error(e.stack);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
