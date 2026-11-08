import {
  ConflictException,
  Injectable,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { nextBusinessId } from '../../../shared/business-id';
import { open } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { PrismaService } from '../../../prisma/prisma.service';
import { CONTACT_SUBJECTS } from '../../customer/about/about.dto';
import {
  ApplicationsQueryDto,
  ApplicationStatusDto,
  ContactsQueryDto,
  ContactStatusDto,
} from './intake.dto';
import { IntakeWorkflowService } from './workflow.service';
import type { IntakeActor } from './intake.guard';

const contactSelect = {
  malienhe: true,
  hoten: true,
  sodienthoai: true,
  email: true,
  chude: true,
  noidung: true,
  thoigiangui: true,
  trangthai: true,
  manhanvienxuly: true,
  nhan_vien: { select: { hoten: true } },
} satisfies Prisma.yeu_cau_lien_heSelect;
const applicationSelect = {
  mahoso: true,
  matin: true,
  hoten: true,
  sodienthoai: true,
  email: true,
  kinhnghiem: true,
  filecv: true,
  thoigianungtuyen: true,
  trangthai: true,
  tin_tuyen_dung: {
    select: { tieude: true, phongban: true, diadiemlamviec: true },
  },
} satisfies Prisma.ho_so_ung_tuyenSelect;
const pageInfo = (q: { page: number; pageSize: number }, total: number) => ({
  page: q.page,
  pageSize: q.pageSize,
  total,
  totalPages: Math.ceil(total / q.pageSize),
});
@Injectable()
export class AdminIntakeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflow: IntakeWorkflowService,
  ) {}

  async contacts(q: ContactsQueryDto) {
    const where: Prisma.yeu_cau_lien_heWhereInput = {
      ...(q.status && { trangthai: q.status }),
      ...(q.subject && { chude: q.subject }),
      ...(q.search && {
        OR: ['hoten', 'email', 'sodienthoai', 'malienhe', 'noidung'].map(
          (key) => ({
            [key]: { contains: q.search, mode: 'insensitive' },
          }),
        ),
      }),
    };
    return this.prisma.$transaction(
      async (tx) => {
        const total = await tx.yeu_cau_lien_he.count({ where });
        const rows = await tx.yeu_cau_lien_he.findMany({
          where,
          select: contactSelect,
          orderBy: [{ thoigiangui: 'desc' }, { malienhe: 'asc' }],
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
        });
        const groups = await tx.yeu_cau_lien_he.groupBy({
          by: ['trangthai'],
          _count: { _all: true },
        });
        return {
          data: await this.workflow.enrich(
            tx,
            'contact',
            rows.map((row) => this.contactView(row)),
          ),
          pagination: pageInfo(q, total),
          statistics: Object.fromEntries(
            groups.map((g) => [g.trangthai, g._count._all]),
          ),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async contactOptions() {
    return {
      staff: await this.staffOptions(),
      subjects: Object.entries(CONTACT_SUBJECTS).map(([id, label]) => ({
        id,
        label,
      })),
    };
  }
  async contact(id: string) {
    const row = await this.prisma.yeu_cau_lien_he.findUnique({
      where: { malienhe: id },
      select: contactSelect,
    });
    if (!row) throw new NotFoundException('Không tìm thấy yêu cầu liên hệ.');
    return {
      ...(
        await this.workflow.enrich(this.prisma, 'contact', [
          this.contactView(row),
        ])
      )[0],
      history: await this.history('yeu_cau_lien_he', id),
    };
  }
  private contactView(
    row: Prisma.yeu_cau_lien_heGetPayload<{ select: typeof contactSelect }>,
  ) {
    return {
      id: row.malienhe,
      name: row.hoten,
      phone: row.sodienthoai,
      email: row.email,
      subject: row.chude,
      subjectLabel: CONTACT_SUBJECTS[row.chude],
      message: row.noidung,
      createdAt: row.thoigiangui,
      status: row.trangthai,
      assignedTo: row.nhan_vien?.hoten || null,
    };
  }
  async updateContact(id: string, dto: ContactStatusDto, actor: IntakeActor) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT malienhe FROM public.yeu_cau_lien_he WHERE malienhe=${id} FOR UPDATE`;
      const previous = await tx.yeu_cau_lien_he.findUnique({
        where: { malienhe: id },
        select: { trangthai: true },
      });
      if (!previous)
        throw new NotFoundException('Không tìm thấy yêu cầu liên hệ.');
      if (previous.trangthai !== dto.expectedStatus) throw this.conflict();
      const management = await this.workflow.update(
        tx,
        'contact',
        id,
        dto,
        actor.staffId,
      );
      const changed = await tx.yeu_cau_lien_he.updateMany({
        where: { malienhe: id, trangthai: dto.expectedStatus },
        data: { trangthai: dto.status, manhanvienxuly: management.assigned },
      });
      if (!changed.count) throw this.conflict();
      await this.record(
        tx,
        'yeu_cau_lien_he',
        id,
        previous.trangthai,
        dto.status,
        dto.note,
        actor,
        management,
      );
    });
    return this.contact(id);
  }
  async applications(q: ApplicationsQueryDto) {
    const where: Prisma.ho_so_ung_tuyenWhereInput = {
      ...(q.status && { trangthai: q.status }),
      ...(q.jobId && { matin: q.jobId }),
      ...(q.search && {
        OR: ['hoten', 'email', 'sodienthoai', 'mahoso'].map((key) => ({
          [key]: { contains: q.search, mode: 'insensitive' },
        })),
      }),
    };
    return this.prisma.$transaction(
      async (tx) => {
        const total = await tx.ho_so_ung_tuyen.count({ where });
        const rows = await tx.ho_so_ung_tuyen.findMany({
          where,
          select: applicationSelect,
          orderBy: [{ thoigianungtuyen: 'desc' }, { mahoso: 'asc' }],
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
        });
        const groups = await tx.ho_so_ung_tuyen.groupBy({
          by: ['trangthai'],
          _count: { _all: true },
        });
        return {
          data: await this.workflow.enrich(
            tx,
            'application',
            rows.map((row) => this.applicationView(row)),
          ),
          pagination: pageInfo(q, total),
          statistics: Object.fromEntries(
            groups.map((g) => [g.trangthai, g._count._all]),
          ),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async applicationOptions() {
    return {
      staff: await this.staffOptions(),
      jobs: (
        await this.prisma.tin_tuyen_dung.findMany({
          select: { matin: true, tieude: true },
          orderBy: { thoigiantao: 'desc' },
        })
      ).map((job) => ({ id: job.matin, label: job.tieude })),
    };
  }
  async application(id: string) {
    const row = await this.prisma.ho_so_ung_tuyen.findUnique({
      where: { mahoso: id },
      select: {
        ...applicationSelect,
        ngaysinh: true,
        diachi: true,
        trinhdohocvan: true,
        kinhnghiem: true,
        linkportfolio: true,
        filecv: true,
        thugioithieu: true,
      },
    });
    if (!row) throw new NotFoundException('Không tìm thấy hồ sơ ứng tuyển.');
    return {
      ...(
        await this.workflow.enrich(this.prisma, 'application', [
          this.applicationView(row),
        ])
      )[0],
      dateOfBirth: row.ngaysinh?.toISOString().slice(0, 10),
      address: row.diachi,
      education: row.trinhdohocvan,
      experience: row.kinhnghiem,
      portfolio: this.safeUrl(row.linkportfolio),
      introduction: row.thugioithieu,
      hasCv: !!row.filecv,
      history: await this.history('ho_so_ung_tuyen', id),
    };
  }
  private safeUrl(value: string | null) {
    try {
      const url = new URL(value || '');
      return ['https:', 'http:'].includes(url.protocol) &&
        !url.username &&
        !url.password
        ? url.href
        : null;
    } catch {
      return null;
    }
  }
  private applicationView(
    row: Prisma.ho_so_ung_tuyenGetPayload<{ select: typeof applicationSelect }>,
  ) {
    return {
      id: row.mahoso,
      name: row.hoten,
      email: row.email,
      phone: row.sodienthoai,
      jobId: row.matin,
      jobTitle: row.tin_tuyen_dung.tieude,
      department: row.tin_tuyen_dung.phongban,
      location: row.tin_tuyen_dung.diadiemlamviec,
      status: row.trangthai,
      createdAt: row.thoigianungtuyen,
      experience: row.kinhnghiem,
      hasCv: !!row.filecv,
    };
  }
  async updateApplication(
    id: string,
    dto: ApplicationStatusDto,
    actor: IntakeActor,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT mahoso FROM public.ho_so_ung_tuyen WHERE mahoso=${id} FOR UPDATE`;
      const previous = await tx.ho_so_ung_tuyen.findUnique({
        where: { mahoso: id },
        select: { trangthai: true },
      });
      if (!previous)
        throw new NotFoundException('Không tìm thấy hồ sơ ứng tuyển.');
      if (previous.trangthai !== dto.expectedStatus) throw this.conflict();
      const management = await this.workflow.update(tx, 'application', id, dto);
      const changed = await tx.ho_so_ung_tuyen.updateMany({
        where: { mahoso: id, trangthai: dto.expectedStatus },
        data: { trangthai: dto.status },
      });
      if (!changed.count) throw this.conflict();
      await this.record(
        tx,
        'ho_so_ung_tuyen',
        id,
        previous.trangthai,
        dto.status,
        dto.note,
        actor,
        management,
      );
    });
    return this.application(id);
  }
  async cv(id: string) {
    const row = await this.prisma.ho_so_ung_tuyen.findUnique({
      where: { mahoso: id },
      select: { filecv: true },
    });
    const reference = row?.filecv || '';
    // Only private CV references generated by CvStorageService may be read.
    if (
      !/^(?:UV\d{3,}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.(pdf|docx|doc)$/i.test(
        reference,
      )
    )
      throw new NotFoundException('CV chưa được lưu trong kho hồ sơ riêng tư.');
    const root = resolve(
      process.env.CV_UPLOAD_DIR ??
        join(process.cwd(), 'uploads', 'private', 'cv'),
    );
    let handle;
    try {
      handle = await open(join(root, reference), 'r');
    } catch {
      throw new NotFoundException('Không tìm thấy file CV.');
    }
    return new StreamableFile(handle.createReadStream(), {
      type: 'application/octet-stream',
      disposition: `attachment; filename="CV${extname(reference)}"`,
    });
  }
  private conflict() {
    return new ConflictException(
      'Dữ liệu vừa được người khác cập nhật. Vui lòng tải lại trước khi lưu.',
    );
  }
  private async record(
    tx: Prisma.TransactionClient,
    table: string,
    id: string,
    before: string,
    after: string,
    note: string | undefined,
    actor: IntakeActor,
    management: { before: object; after: object },
  ) {
    await tx.nhat_ky_he_thong.create({
      data: {
        manhatky: await nextBusinessId(tx, 'NK'),
        mataikhoan: actor.id,
        manhanvien: actor.staffId,
        hanhdong: 'CapNhatTrangThai',
        banglienquan: table,
        madoituong: id,
        trangthai: 'ThanhCong',
        thoigian: new Date(),
        chitiet: note?.trim() || 'Cập nhật trạng thái xử lý.',
        dulieutruoc: { status: before, ...management.before },
        dulieusau: { status: after, ...management.after },
      },
    });
  }
  private async staffOptions() {
    const rows = await this.prisma.nhan_vien.findMany({
      where: {
        trangthai: 'HoatDong',
        tai_khoan: { trangthai: 'HoatDong', vaitrotaikhoan: 'NhanVien' },
      },
      select: { manhanvien: true, hoten: true },
      orderBy: { hoten: 'asc' },
    });
    return rows.map((r) => ({ id: r.manhanvien, label: r.hoten }));
  }
  private async history(table: string, id: string) {
    const rows = await this.prisma.nhat_ky_he_thong.findMany({
      where: { banglienquan: table, madoituong: id },
      orderBy: [{ thoigian: 'desc' }, { manhatky: 'desc' }],
      take: 50,
      select: {
        manhatky: true,
        thoigian: true,
        chitiet: true,
        dulieutruoc: true,
        dulieusau: true,
        nhan_vien: { select: { hoten: true } },
      },
    });
    return rows.map((row) => ({
      id: row.manhatky,
      at: row.thoigian,
      note: row.chitiet,
      actor: row.nhan_vien?.hoten || 'Nhân viên',
      before: row.dulieutruoc,
      after: row.dulieusau,
    }));
  }
}
