import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { nextBusinessId } from '../../../../shared/business-id';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  CareerApplicationDto,
  CV_EXTENSIONS,
  CV_MAX_SIZE,
  pagination,
  PublicCareersQueryDto,
  UploadedCv,
  vietnamDate,
  WORK_TYPES,
} from '../about.dto';
import { CvStorageService } from './cv-storage.service';

const summarySelect = {
  matin: true,
  tieude: true,
  phongban: true,
  hinhthuclamviec: true,
  diadiemlamviec: true,
  mucluong: true,
  motacongviec: true,
  hannop: true,
} satisfies Prisma.tin_tuyen_dungSelect;
const detailSelect = {
  ...summarySelect,
  motacongviec: true,
  yeucauungvien: true,
  quyenloi: true,
  thoigianlamviec: true,
  moitruonglamviec: true,
  cachthucungtuyen: true,
  email: true,
  hotline: true,
} satisfies Prisma.tin_tuyen_dungSelect;
type Job = Prisma.tin_tuyen_dungGetPayload<{ select: typeof summarySelect }>;
type JobDetail = Prisma.tin_tuyen_dungGetPayload<{
  select: typeof detailSelect;
}>;
const openJobs = (): Prisma.tin_tuyen_dungWhereInput => ({
  trangthai: 'DangTuyen',
  hannop: { gte: new Date(`${vietnamDate()}T00:00:00Z`) },
});
const lines = (value?: string | null) =>
  value
    ?.replace(/<\/(?:li|p)>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean) ?? [];

@Injectable()
export class CustomerCareersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cvs: CvStorageService,
  ) {}

  async findAll(query: PublicCareersQueryDto) {
    const where: Prisma.tin_tuyen_dungWhereInput = {
      ...openJobs(),
      ...(query.department && {
        phongban: { equals: query.department, mode: 'insensitive' },
      }),
      ...(query.location && {
        diadiemlamviec: { contains: query.location, mode: 'insensitive' },
      }),
      ...(query.workType && { hinhthuclamviec: query.workType }),
      ...(query.search && {
        OR: [
          { tieude: { contains: query.search, mode: 'insensitive' } },
          { motacongviec: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
    return this.prisma.$transaction(
      async (tx) => {
        const total = await tx.tin_tuyen_dung.count({ where });
        const rows = await tx.tin_tuyen_dung.findMany({
          where,
          select: summarySelect,
          orderBy: [{ hannop: 'asc' }, { matin: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        return {
          data: rows.map((row) => this.summary(row)),
          pagination: pagination(query, total),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async options() {
    const rows = await this.prisma.tin_tuyen_dung.findMany({
      where: openJobs(),
      select: { phongban: true, diadiemlamviec: true, hinhthuclamviec: true },
    });
    return {
      departments: [...new Set(rows.map((row) => row.phongban))].sort((a, b) =>
        a.localeCompare(b, 'vi'),
      ),
      locations: [...new Set(rows.map((row) => row.diadiemlamviec))].sort(
        (a, b) => a.localeCompare(b, 'vi'),
      ),
      workTypes: [...new Set(rows.map((row) => row.hinhthuclamviec))].map(
        (code) => ({ code, label: WORK_TYPES[code] }),
      ),
      application: {
        cv: {
          field: 'cv',
          required: true,
          maxSizeBytes: CV_MAX_SIZE,
          extensions: CV_EXTENSIONS,
        },
        consentRequired: true,
        termsPath: '/customer/dieu-khoan',
      },
    };
  }

  async findOne(jobId: string) {
    const row = await this.prisma.tin_tuyen_dung.findFirst({
      where: { ...openJobs(), matin: jobId },
      select: detailSelect,
    });
    if (!row) throw new NotFoundException('Không tìm thấy vị trí đang tuyển.');
    return this.detail(row);
  }

  async apply(jobId: string, dto: CareerApplicationDto, file?: UploadedCv) {
    if (dto.dateOfBirth && dto.dateOfBirth > vietnamDate())
      throw new BadRequestException('Ngày sinh không được ở tương lai.');
    const stored = await this.cvs.save(file);
    let keep = false;
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          keep = await this.prisma.$transaction(
            async (tx) => {
              const job = await tx.tin_tuyen_dung.findFirst({
                where: { ...openJobs(), matin: jobId },
                select: { matin: true },
              });
              if (!job)
                throw new NotFoundException('Vị trí này không còn nhận hồ sơ.');
              const duplicate = await tx.ho_so_ung_tuyen.findFirst({
                where: {
                  matin: jobId,
                  trangthai: { not: 'TuChoi' },
                  OR: [
                    { email: { equals: dto.email, mode: 'insensitive' } },
                    { sodienthoai: dto.phoneNumber },
                  ],
                },
                select: { mahoso: true },
              });
              if (duplicate) return false;
              await tx.ho_so_ung_tuyen.create({
                data: {
                  mahoso: await nextBusinessId(tx, 'UV'),
                  matin: jobId,
                  hoten: dto.fullName,
                  sodienthoai: dto.phoneNumber,
                  email: dto.email,
                  ngaysinh: dto.dateOfBirth
                    ? new Date(`${dto.dateOfBirth}T00:00:00Z`)
                    : null,
                  diachi: dto.address,
                  trinhdohocvan: dto.education,
                  kinhnghiem: dto.experience,
                  linkportfolio: dto.portfolioLink,
                  filecv: stored.reference,
                  thugioithieu: dto.introduction,
                  thoigianungtuyen: new Date(),
                  trangthai: 'Moi',
                },
              });
              return true;
            },
            {
              isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
              timeout: 15000,
              maxWait: 5000,
            },
          );
          return {
            received: true,
            message: 'Đã tiếp nhận hồ sơ ứng tuyển của bạn.',
          };
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2034'
          ) {
            if (attempt < 2) continue;
            throw new ConflictException(
              'Yêu cầu đang được xử lý. Vui lòng thử lại sau.',
            );
          }
          throw error;
        }
      }
      throw new ConflictException(
        'Chưa thể tiếp nhận hồ sơ. Vui lòng thử lại.',
      );
    } finally {
      if (!keep) await this.cvs.remove(stored);
    }
  }

  private summary(row: Job) {
    return {
      id: row.matin,
      title: row.tieude,
      department: row.phongban,
      location: row.diadiemlamviec,
      workType: WORK_TYPES[row.hinhthuclamviec],
      workTypeCode: row.hinhthuclamviec,
      salary: row.mucluong,
      description: row.motacongviec,
      deadline: row.hannop.toISOString().slice(0, 10),
    };
  }

  private detail(row: JobDetail) {
    return {
      ...this.summary(row),
      description: row.motacongviec,
      requirements: lines(row.yeucauungvien),
      requirementsText: row.yeucauungvien,
      benefits: lines(row.quyenloi),
      benefitsText: row.quyenloi,
      workHours: row.thoigianlamviec,
      workEnvironment: row.moitruonglamviec,
      howToApply: row.cachthucungtuyen,
      email: row.email,
      hotline: row.hotline,
    };
  }
}
