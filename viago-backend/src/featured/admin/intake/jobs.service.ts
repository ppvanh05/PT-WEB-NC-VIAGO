import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, tin_tuyen_dung } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { nextBusinessId } from '../../../shared/business-id';
import { vietnamDate } from '../../customer/about/about.dto';
import { IntakeActor } from './intake.guard';
import { JobDto, JobsQueryDto } from './jobs.dto';

@Injectable()
export class AdminJobsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(q: JobsQueryDto) {
    const where: Prisma.tin_tuyen_dungWhereInput = {
      ...(q.status && { trangthai: q.status }),
      ...(q.search && {
        OR: ['matin', 'tieude', 'phongban', 'diadiemlamviec'].map((k) => ({
          [k]: { contains: q.search, mode: 'insensitive' },
        })),
      }),
    };
    return this.prisma.$transaction(
      async (tx) => {
        const total = await tx.tin_tuyen_dung.count({ where });
        const rows = await tx.tin_tuyen_dung.findMany({
          where,
          include: { _count: { select: { ho_so_ung_tuyen: true } } },
          orderBy: [{ thoigiantao: 'desc' }, { matin: 'asc' }],
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
        });
        return {
          data: rows.map((r) => ({
            ...this.view(r),
            applications: r._count.ho_so_ung_tuyen,
          })),
          pagination: {
            page: q.page,
            total,
            totalPages: Math.ceil(total / q.pageSize),
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
  async detail(id: string) {
    const row = await this.prisma.tin_tuyen_dung.findUnique({
      where: { matin: id },
    });
    if (!row) throw new NotFoundException('Không tìm thấy vị trí tuyển dụng.');
    return this.view(row);
  }
  async save(dto: JobDto, actor: IntakeActor, id?: string) {
    if (dto.status === 'DangTuyen' && dto.deadline < vietnamDate())
      throw new BadRequestException(
        'Tin đang tuyển phải có hạn nộp từ hôm nay trở đi.',
      );
    if (id && !dto.expectedUpdatedAt)
      throw new BadRequestException('Thiếu thời điểm phiên bản cần cập nhật.');
    return this.prisma.$transaction(async (tx) => {
      let old: tin_tuyen_dung | null = null;
      if (id) {
        await tx.$queryRaw`SELECT matin FROM public.tin_tuyen_dung WHERE matin=${id} FOR UPDATE`;
        old = await tx.tin_tuyen_dung.findUnique({ where: { matin: id } });
        if (!old)
          throw new NotFoundException('Không tìm thấy vị trí tuyển dụng.');
        if (
          old.thoigiancapnhat.getTime() !==
          new Date(dto.expectedUpdatedAt!).getTime()
        )
          throw new ConflictException(
            'Tin đã được chỉnh sửa. Hãy tải lại trước khi lưu.',
          );
      }
      const data = {
        tieude: dto.title,
        phongban: dto.department,
        diadiemlamviec: dto.location,
        hinhthuclamviec: dto.workType,
        mucluong: dto.salary || null,
        hannop: new Date(dto.deadline + 'T00:00:00Z'),
        motacongviec: dto.description,
        yeucauungvien: dto.requirements,
        quyenloi: dto.benefits || null,
        thoigianlamviec: dto.workHours || null,
        moitruonglamviec: dto.workEnvironment || null,
        cachthucungtuyen: dto.howToApply || null,
        email: dto.email || null,
        hotline: dto.hotline || null,
        trangthai: dto.status,
        thoigiancapnhat: new Date(),
      };
      const row = id
        ? await tx.tin_tuyen_dung.update({ where: { matin: id }, data })
        : await tx.tin_tuyen_dung.create({
            data: {
              ...data,
              matin: await nextBusinessId(tx, 'TD'),
              manhanvientao: actor.staffId,
              thoigiantao: new Date(),
            },
          });
      await tx.nhat_ky_he_thong.create({
        data: {
          manhatky: await nextBusinessId(tx, 'NK'),
          mataikhoan: actor.id,
          manhanvien: actor.staffId,
          hanhdong: id ? 'CapNhatTuyenDung' : 'TaoTuyenDung',
          banglienquan: 'tin_tuyen_dung',
          madoituong: row.matin,
          trangthai: 'ThanhCong',
          thoigian: new Date(),
          chitiet: `${id ? 'Cập nhật' : 'Tạo'} vị trí: ${row.tieude}`,
          dulieutruoc: old
            ? { title: old.tieude, status: old.trangthai }
            : Prisma.JsonNull,
          dulieusau: { title: row.tieude, status: row.trangthai },
        },
      });
      return this.view(row);
    });
  }
  private view(r: tin_tuyen_dung) {
    return {
      id: r.matin,
      title: r.tieude,
      department: r.phongban,
      location: r.diadiemlamviec,
      workType: r.hinhthuclamviec,
      salary: r.mucluong,
      deadline: r.hannop.toISOString().slice(0, 10),
      description: r.motacongviec,
      requirements: r.yeucauungvien,
      benefits: r.quyenloi,
      workHours: r.thoigianlamviec,
      workEnvironment: r.moitruonglamviec,
      howToApply: r.cachthucungtuyen,
      email: r.email,
      hotline: r.hotline,
      status: r.trangthai,
      updatedAt: r.thoigiancapnhat,
      acceptingApplications:
        r.trangthai === 'DangTuyen' &&
        r.hannop.toISOString().slice(0, 10) >= vietnamDate(),
    };
  }
}
