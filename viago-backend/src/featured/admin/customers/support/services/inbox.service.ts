import { Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  type loai_van_de_chatbot_enum,
  type muc_do_uu_tien_chatbot_enum,
} from '@prisma/client';
import { PrismaService } from '../../../../../prisma/prisma.service';
import type { StaffIdentity } from '../../../../customer/chatbot/auth/chatbot.auth';
import {
  CustomerChatbotService,
  publicConversation,
  publicMessage,
} from '../../../../customer/chatbot/conversation/chatbot.service';
import type { InboxQueryDto } from '../dto/support.dto';

const agentSelect = { manhanvien: true, hoten: true } as const;
const requestSelect = {
  mayeucau: true,
  lydo: true,
  loaivande: true,
  mucdouutien: true,
  kieukichhoat: true,
  trangthai: true,
  thoigiantao: true,
  thoigiangiaiquyet: true,
  ketquaxuly: true,
} as const;
const listInclude = Prisma.validator<Prisma.hoi_thoai_chatbotInclude>()({
  assignedAgent: { select: agentSelect },
  handoffs: {
    orderBy: { thoigiantao: 'desc' },
    take: 1,
    select: requestSelect,
  },
  messages: {
    where: { role: { not: 'HeThong' } },
    orderBy: { sequence: 'desc' },
    take: 1,
  },
  _count: { select: { messages: true } },
});
type InboxRow = Prisma.hoi_thoai_chatbotGetPayload<{
  include: typeof listInclude;
}>;
const agentView = (agent: { manhanvien: string; hoten: string } | null) =>
  agent ? { id: agent.manhanvien, name: agent.hoten } : null;
const requestView = (r: NonNullable<InboxRow['handoffs'][number]>) => ({
  id: r.mayeucau,
  reason:
    /Conservative rules|semantic model unavailable|^[a-z_]+(?:,\s*[a-z_]+)*$/.test(
      r.lydo,
    )
      ? {
          KhachYeuCau: 'Khách yêu cầu gặp nhân viên hỗ trợ.',
          KhachXacNhan: 'Khách đã đồng ý chuyển sang nhân viên.',
          TinhHuongNghiemTrong:
            'Vấn đề cần nhân viên kiểm tra và xử lý trực tiếp.',
          KhachChuaHaiLong: 'Khách chưa hài lòng và cần được hỗ trợ thêm.',
          AIKhongXuLyDuoc: 'Trợ lý chưa giải quyết được yêu cầu của khách.',
        }[r.kieukichhoat]
      : r.lydo,
  category: r.loaivande,
  priority: r.mucdouutien,
  trigger: r.kieukichhoat,
  status: r.trangthai,
  createdAt: r.thoigiantao,
  resolvedAt: r.thoigiangiaiquyet,
  resolution: r.ketquaxuly,
});
const rowView = (row: InboxRow) => ({
  ...publicConversation(row),
  assignedAgentId: row.assignedAgentId,
  assignedAgent: agentView(row.assignedAgent),
  priority: row.priority,
  priorityAssessment:
    row.analysis &&
    typeof row.analysis === 'object' &&
    !Array.isArray(row.analysis)
      ? (row.analysis.priority ?? null)
      : null,
  request: row.handoffs[0] ? requestView(row.handoffs[0]) : null,
  lastMessage: row.messages[0] ? publicMessage(row.messages[0]) : null,
  messageCount: row._count.messages,
});

@Injectable()
export class SupportInboxService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatbot: CustomerChatbotService,
  ) {}

  async agents() {
    const rows = await this.prisma.nhan_vien.findMany({
      where: {
        trangthai: 'HoatDong',
        tai_khoan: { trangthai: 'HoatDong', vaitrotaikhoan: 'NhanVien' },
      },
      select: agentSelect,
      orderBy: { hoten: 'asc' },
    });
    return { data: rows.map(agentView) };
  }

  async queue(query: InboxQueryDto, agent?: StaffIdentity) {
    const base: Prisma.hoi_thoai_chatbotWhereInput = {
      handoffs: { some: { trangthai: { notIn: ['ChoXacNhan', 'DaHuy'] } } },
      ...(query.search
        ? {
            OR: [
              { id: { contains: query.search, mode: 'insensitive' } },
              {
                messages: {
                  some: {
                    text: { contains: query.search, mode: 'insensitive' },
                  },
                },
              },
            ],
          }
        : {}),
      ...(query.category || query.priority
        ? {
            AND: [
              {
                handoffs: {
                  some: {
                    trangthai: { notIn: ['ChoXacNhan', 'DaHuy'] },
                    ...(query.category
                      ? {
                          loaivande: query.category as loai_van_de_chatbot_enum,
                        }
                      : {}),
                    ...(query.priority
                      ? {
                          mucdouutien:
                            query.priority as muc_do_uu_tien_chatbot_enum,
                        }
                      : {}),
                  },
                },
              },
            ],
          }
        : {}),
    };
    const states = {
      QUEUED: 'ChoNhanVien',
      ASSIGNED: 'NhanVienHoTro',
      RESOLVED: 'DaGiaiQuyet',
      CLOSED: 'DaDong',
    } as const;
    const where: Prisma.hoi_thoai_chatbotWhereInput = {
      ...base,
      ...(query.status === 'MINE'
        ? { status: 'NhanVienHoTro', assignedAgentId: agent?.id ?? '' }
        : query.status === 'ALL'
          ? {}
          : { status: states[query.status as keyof typeof states] }),
    };
    return this.prisma.$transaction(
      async (tx) => {
        const total = await tx.hoi_thoai_chatbot.count({ where });
        const totalPages = Math.max(1, Math.ceil(total / 20));
        const page = Math.min(query.page, totalPages);
        const rows = await tx.hoi_thoai_chatbot.findMany({
          where,
          include: listInclude,
          take: 20,
          skip: (page - 1) * 20,
          orderBy:
            query.status === 'RESOLVED' || query.status === 'CLOSED'
              ? [{ updatedAt: 'desc' }, { id: 'asc' }]
              : [{ priority: 'desc' }, { updatedAt: 'asc' }, { id: 'asc' }],
        });
        const grouped = await tx.hoi_thoai_chatbot.groupBy({
          by: ['status'],
          where: base,
          _count: true,
        });
        const counts = Object.fromEntries(
          grouped.map((g) => [g.status, g._count]),
        );
        const mine = await tx.hoi_thoai_chatbot.count({
          where: {
            ...base,
            status: 'NhanVienHoTro',
            assignedAgentId: agent?.id ?? '',
          },
        });
        const statistics = await tx.hoi_thoai_chatbot.groupBy({
          by: ['status'],
          where: {
            handoffs: {
              some: { trangthai: { notIn: ['ChoXacNhan', 'DaHuy'] } },
            },
          },
          _count: true,
        });
        const totals = Object.fromEntries(
          statistics.map((g) => [g.status, g._count]),
        );
        return {
          statistics: {
            QUEUED: totals.ChoNhanVien || 0,
            ASSIGNED: totals.NhanVienHoTro || 0,
            RESOLVED: totals.DaGiaiQuyet || 0,
            CLOSED: totals.DaDong || 0,
          },
          data: rows.map(rowView),
          pagination: { page, pageSize: 20, total, totalPages },
          counts: {
            ALL: grouped.reduce((sum, g) => sum + g._count, 0),
            QUEUED: counts.ChoNhanVien || 0,
            MINE: mine,
            ASSIGNED: counts.NhanVienHoTro || 0,
            RESOLVED: counts.DaGiaiQuyet || 0,
            CLOSED: counts.DaDong || 0,
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async workspace(ids: string[], agent: StaffIdentity) {
    return this.prisma.$transaction(
      async (tx) => {
        const watched = ids.length
          ? await tx.hoi_thoai_chatbot.findMany({
              where: { id: { in: ids } },
              include: listInclude,
            })
          : [];
        const mine = await tx.hoi_thoai_chatbot.findMany({
          where: { status: 'NhanVienHoTro', assignedAgentId: agent.id },
          include: listInclude,
          orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
          take: 100,
        });
        const rows = new Map([...watched, ...mine].map((row) => [row.id, row]));
        return { data: [...rows.values()].map(rowView) };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async detail(id: string, before?: number) {
    await this.chatbot.recover(id);
    return this.prisma.$transaction(
      async (tx) => {
        const row = await tx.hoi_thoai_chatbot.findUnique({
          where: { id },
          include: listInclude,
        });
        if (!row) throw new NotFoundException('Không tìm thấy hội thoại.');
        const messages = await tx.tin_nhan_chatbot.findMany({
          where: {
            conversationId: id,
            ...(before ? { sequence: { lt: before } } : {}),
          },
          orderBy: { sequence: 'desc' },
          take: 101,
          include: { agent: { select: agentSelect } },
        });
        const requests = await tx.yeu_cau_chuyen_tiep_chatbot.findMany({
          where: { mahoithoai: id },
          orderBy: { thoigiantao: 'desc' },
          take: 30,
          select: {
            ...requestSelect,
            phan_cong_chatbot: {
              orderBy: { thoigianphancong: 'asc' },
              select: {
                maphancong: true,
                trangthai: true,
                thoigianphancong: true,
                thoigianketthuc: true,
                nhan_vien: { select: agentSelect },
              },
            },
          },
        });
        const memory = await tx.bo_nho_chatbot.findUnique({
          where: { mahoithoai: id },
          select: { tomtat: true },
        });
        return {
          ...rowView(row),
          summary: memory?.tomtat ?? null,
          messages: messages
            .slice(0, 100)
            .reverse()
            .map((m) => ({
              ...publicMessage(m),
              originalText: m.originalText,
              agentId: m.agentId,
              agent: agentView(m.agent),
            })),
          hasOlder: messages.length > 100,
          requests: requests.map((r) => ({
            ...requestView(r),
            assignments: r.phan_cong_chatbot.map((a) => ({
              id: a.maphancong,
              status: a.trangthai,
              assignedAt: a.thoigianphancong,
              endedAt: a.thoigianketthuc,
              agent: agentView(a.nhan_vien),
            })),
          })),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
