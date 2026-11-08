import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { WorkflowDto } from './intake.dto';

type Kind = 'contact' | 'application';
type Management = {
  madoituong: string;
  manhanvienphutrach: string | null;
  hoten: string | null;
  mucdouutien: string;
  danhgia: string;
  lichphongvan: Date | null;
  phanhoinhap: string;
  capnhatluc: Date;
  phienban: number;
};
@Injectable()
export class IntakeWorkflowService {
  async enrich<
    T extends { id: string; createdAt: Date; assignedTo?: string | null },
  >(tx: Prisma.TransactionClient, kind: Kind, rows: T[]) {
    if (!rows.length) return [];
    const entries = await tx.$queryRaw<
      Management[]
    >`SELECT q.*, n.hoten FROM public.quan_ly_tiep_nhan q
      LEFT JOIN public.nhan_vien n ON n.manhanvien=q.manhanvienphutrach
      WHERE q.loaidoituong=${kind} AND q.madoituong IN (${Prisma.join(rows.map((r) => r.id))})`;
    const map = new Map(entries.map((r) => [r.madoituong, r]));
    return rows.map((row) => {
      const m = map.get(row.id);
      return {
        ...row,
        assignedTo: m ? m.hoten : (row.assignedTo ?? null),
        assignedStaffId: m?.manhanvienphutrach ?? '',
        priority: m?.mucdouutien ?? 'BinhThuong',
        evaluation: m?.danhgia ?? '',
        interviewAt: m?.lichphongvan ?? null,
        replyDraft: m?.phanhoinhap ?? '',
        updatedAt: m?.capnhatluc ?? row.createdAt,
        version: m?.phienban ?? 0,
      };
    });
  }
  async update(
    tx: Prisma.TransactionClient,
    kind: Kind,
    id: string,
    dto: WorkflowDto,
    fallbackStaff?: string,
  ) {
    // Parent row is locked by the caller, serialising all edits, including unchanged status.
    await tx.$executeRaw`INSERT INTO public.quan_ly_tiep_nhan(loaidoituong,madoituong)
      VALUES (${kind},${id}) ON CONFLICT DO NOTHING`;
    const [prior] = await tx.$queryRaw<
      Management[]
    >`SELECT * FROM public.quan_ly_tiep_nhan
      WHERE loaidoituong=${kind} AND madoituong=${id}`;
    if (
      dto.expectedVersion !== undefined &&
      prior.phienban !== dto.expectedVersion
    )
      throw new ConflictException(
        'Dữ liệu đã thay đổi. Hãy tải lại chi tiết trước khi lưu.',
      );
    const assigned =
      dto.assignedStaffId === undefined
        ? (prior.manhanvienphutrach ?? fallbackStaff ?? null)
        : dto.assignedStaffId || null;
    if (assigned) {
      const staff = await tx.nhan_vien.findFirst({
        where: {
          manhanvien: assigned,
          trangthai: 'HoatDong',
          tai_khoan: { trangthai: 'HoatDong', vaitrotaikhoan: 'NhanVien' },
        },
        select: { manhanvien: true },
      });
      if (!staff)
        throw new BadRequestException(
          'Nhân viên phụ trách không còn hoạt động.',
        );
    }
    const interview =
      dto.interviewAt === undefined
        ? prior.lichphongvan
        : dto.interviewAt
          ? new Date(dto.interviewAt)
          : null;
    const priority = dto.priority ?? prior.mucdouutien;
    const evaluation = dto.evaluation?.trim() ?? prior.danhgia;
    const reply = dto.replyDraft?.trim() ?? prior.phanhoinhap;
    await tx.$executeRaw`UPDATE public.quan_ly_tiep_nhan SET manhanvienphutrach=${assigned},
      mucdouutien=${priority}, danhgia=${evaluation}, lichphongvan=${interview}, phanhoinhap=${reply},
      capnhatluc=clock_timestamp(), phienban=phienban+1 WHERE loaidoituong=${kind} AND madoituong=${id}`;
    return {
      assigned,
      before: {
        assignedStaffId: prior.manhanvienphutrach,
        priority: prior.mucdouutien,
        evaluation: prior.danhgia,
        interviewAt: prior.lichphongvan,
        replyDraft: prior.phanhoinhap,
      },
      after: {
        assignedStaffId: assigned,
        priority,
        evaluation,
        interviewAt: interview,
        replyDraft: reply,
      },
    };
  }
}
