import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { nextBusinessId, nextBusinessIds } from '../../../../shared/business-id';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  CancellationRuleDto,
  CreatePolicyDto,
  ListPoliciesDto,
  POLICY_STATUSES,
  POLICY_TYPES,
  UpdatePolicyDto,
  UpdatePolicyStatusDto,
} from './policies.dto';

const policyInclude = {
  nhan_vien_chinh_sach_manhanvientaoTonhan_vien: { select: { hoten: true } },
  nhan_vien_chinh_sach_manhanviencapnhatTonhan_vien: {
    select: { hoten: true },
  },
} satisfies Prisma.chinh_sachInclude;

const versionInclude = {
  chi_tiet_chinh_sach_huy: { orderBy: { sogiotoithieu: 'desc' as const } },
} satisfies Prisma.chinh_sach_huyInclude;

type Policy = Prisma.chinh_sachGetPayload<{ include: typeof policyInclude }>;
type Version = Prisma.chinh_sach_huyGetPayload<{
  include: typeof versionInclude;
}>;
type Tx = Prisma.TransactionClient;
const dateOnly = (value: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
const effectiveDate = (value: string) => new Date(`${value}T00:00:00+07:00`);

@Injectable()
export class AdminPoliciesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListPoliciesDto) {
    const where: Prisma.chinh_sachWhereInput = {
      ...(query.loaiChinhSach && { loaichinhsach: query.loaiChinhSach }),
      ...(query.trangThai && { trangthai: query.trangThai }),
      ...(query.search && {
        OR: [
          { machinhsach: { contains: query.search, mode: 'insensitive' } },
          { tieude: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };
    const orderBy: Prisma.chinh_sachOrderByWithRelationInput =
      query.sort === 'name'
        ? { tieude: 'asc' }
        : { thoigiantao: query.sort === 'oldest' ? 'asc' : 'desc' };

    return this.prisma.$transaction(
      async (tx) => {
        const total = await tx.chinh_sach.count({ where });
        const policies = await tx.chinh_sach.findMany({
          where,
          include: policyInclude,
          orderBy: [orderBy, { machinhsach: 'asc' }],
          skip: (query.page - 1) * query.pageSize,
          take: query.pageSize,
        });
        const versions = await this.versions(tx, policies);
        return {
          data: policies.map((policy) =>
            this.response(policy, versions.get(policy.machinhsach)),
          ),
          pagination: {
            page: query.page,
            pageSize: query.pageSize,
            total,
            totalPages: Math.ceil(total / query.pageSize),
          },
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async statistics() {
    const groups = await this.prisma.chinh_sach.groupBy({
      by: ['loaichinhsach', 'trangthai'],
      _count: { _all: true },
    });
    const byType = Object.entries(POLICY_TYPES).map(([code, label]) => ({
      code,
      label,
      total: groups
        .filter((group) => group.loaichinhsach === code)
        .reduce((sum, group) => sum + group._count._all, 0),
    }));
    const count = (status?: string) =>
      groups
        .filter((group) => !status || group.trangthai === status)
        .reduce((sum, group) => sum + group._count._all, 0);
    return {
      total: count(),
      active: count('DangApDung'),
      locked: count('DaKhoa'),
      byType,
    };
  }

  async findOne(policyId: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const policy = await this.policy(tx, policyId);
        return this.response(policy, await this.latestVersion(tx, policy));
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }

  async create(dto: CreatePolicyDto) {
    this.validateContent(dto.noiDungChinhSach);
    const rules = this.validateRules(
      dto.loaiChinhSach,
      dto.mocThoiGianHuyVe ?? [],
      true,
    );
    return this.write(async (tx) => {
      const actor = await this.actor(tx, dto.maNhanVien);
      const now = new Date();
      const policy = await tx.chinh_sach.create({
        data: {
          machinhsach: await nextBusinessId(tx, 'CS'),
          tieude: dto.tenChinhSach,
          loaichinhsach: dto.loaiChinhSach,
          noidung: dto.noiDungChinhSach,
          ngayapdung: effectiveDate(dto.ngayApDung),
          manhanvientao: actor.manhanvien,
          trangthai: dto.trangThai ?? 'DangApDung',
          thoigiantao: now,
          thoigiancapnhat: now,
        },
        include: policyInclude,
      });
      const version =
        policy.loaichinhsach === 'HoanHuy'
          ? await this.createVersion(tx, policy, rules, actor.mataikhoan, now)
          : undefined;
      await this.audit(tx, actor, policy, 'TaoChinhSach', now);
      return this.response(policy, version);
    });
  }

  async update(policyId: string, dto: UpdatePolicyDto) {
    const { maNhanVien, ...changes } = dto;
    if (!Object.values(changes).some((value) => value !== undefined)) {
      throw new BadRequestException(
        'Vui lòng gửi ít nhất một trường cần cập nhật.',
      );
    }
    if (dto.noiDungChinhSach !== undefined)
      this.validateContent(dto.noiDungChinhSach);

    return this.write(async (tx) => {
      const previous = await this.policy(tx, policyId);
      const actor = await this.actor(tx, maNhanVien);
      const previousVersion = await this.latestVersion(tx, previous);
      const type = dto.loaiChinhSach ?? previous.loaichinhsach;
      const rules = this.validateRules(
        type,
        dto.mocThoiGianHuyVe ??
          (type === 'HoanHuy' ? this.rules(previousVersion) : []),
        type === 'HoanHuy' &&
          (previous.loaichinhsach !== 'HoanHuy' ||
            dto.mocThoiGianHuyVe !== undefined),
      );
      const now = new Date();
      const data = {
        tieude: dto.tenChinhSach ?? previous.tieude,
        loaichinhsach: type,
        noidung: dto.noiDungChinhSach ?? previous.noidung,
        ngayapdung: dto.ngayApDung
          ? effectiveDate(dto.ngayApDung)
          : previous.ngayapdung,
      };
      const unchanged =
        data.tieude === previous.tieude &&
        data.loaichinhsach === previous.loaichinhsach &&
        data.noidung === previous.noidung &&
        data.ngayapdung.getTime() === previous.ngayapdung.getTime() &&
        JSON.stringify(rules) === JSON.stringify(this.rules(previousVersion));
      if (unchanged)
        throw new BadRequestException('Không có dữ liệu nào thay đổi.');

      const policy = await tx.chinh_sach.update({
        where: { machinhsach: policyId },
        data: {
          ...data,
          manhanviencapnhat: actor.manhanvien,
          thoigiancapnhat: now,
        },
        include: policyInclude,
      });
      let version: Version | undefined;
      if (type === 'HoanHuy' && rules.length) {
        version = await this.createVersion(
          tx,
          policy,
          rules,
          actor.mataikhoan,
          now,
          previousVersion,
        );
      } else if (previous.loaichinhsach === 'HoanHuy') {
        await this.setVersionStatus(tx, policyId, false, actor.mataikhoan, now);
      }
      await this.audit(tx, actor, policy, 'CapNhatChinhSach', now);
      return this.response(policy, version);
    });
  }

  async updateStatus(policyId: string, dto: UpdatePolicyStatusDto) {
    return this.write(async (tx) => {
      const previous = await this.policy(tx, policyId);
      const actor = await this.actor(tx, dto.maNhanVien);
      if (previous.trangthai === dto.trangThai) {
        return this.response(previous, await this.latestVersion(tx, previous));
      }
      const now = new Date();
      const policy = await tx.chinh_sach.update({
        where: { machinhsach: policyId },
        data: {
          trangthai: dto.trangThai,
          manhanviencapnhat: actor.manhanvien,
          thoigiancapnhat: now,
        },
        include: policyInclude,
      });
      if (policy.loaichinhsach === 'HoanHuy') {
        await this.setVersionStatus(
          tx,
          policyId,
          dto.trangThai === 'DangApDung',
          actor.mataikhoan,
          now,
        );
      }
      await this.audit(
        tx,
        actor,
        policy,
        dto.trangThai === 'DaKhoa' ? 'KhoaChinhSach' : 'MoKhoaChinhSach',
        now,
      );
      return this.response(policy, await this.latestVersion(tx, policy));
    });
  }

  private async policy(tx: Tx, policyId: string) {
    const policy = await tx.chinh_sach.findUnique({
      where: { machinhsach: policyId },
      include: policyInclude,
    });
    if (!policy) throw new NotFoundException('Không tìm thấy chính sách.');
    return policy;
  }

  private async actor(tx: Tx, employeeId: string) {
    const employee = await tx.nhan_vien.findUnique({
      where: { manhanvien: employeeId },
      select: { manhanvien: true, mataikhoan: true, trangthai: true },
    });
    if (!employee || employee.trangthai !== 'HoatDong') {
      throw new BadRequestException(
        'Mã nhân viên không tồn tại hoặc đã bị khóa.',
      );
    }
    return employee;
  }

  private validateContent(content: string) {
    if (
      !content
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;|&#160;|&#x[aA]0;/g, ' ')
        .trim()
    ) {
      throw new BadRequestException('Nội dung chính sách không được để trống.');
    }
  }

  private validateRules(
    type: string,
    input: CancellationRuleDto[],
    required: boolean,
  ) {
    if (type !== 'HoanHuy') {
      if (input.length)
        throw new BadRequestException(
          'Mốc phí hủy chỉ dùng cho chính sách hoàn hủy.',
        );
      return [];
    }
    if (!input.length) {
      if (required)
        throw new BadRequestException(
          'Chính sách hoàn hủy cần ít nhất một mốc phí hủy.',
        );
      return [];
    }
    const rules = input
      .map((rule) => ({
        truocGio: rule.truocGio,
        phiHuy: rule.phiHuy,
        choPhepHuy: rule.choPhepHuy ?? rule.phiHuy < 100,
      }))
      .sort((a, b) => b.truocGio - a.truocGio);
    if (
      new Set(rules.map((rule) => rule.truocGio)).size !== rules.length ||
      rules.at(-1)!.truocGio !== 0
    ) {
      throw new BadRequestException(
        'Các mốc giờ không được trùng và phải có mốc 0 giờ.',
      );
    }
    if (rules.some((rule) => !rule.choPhepHuy && rule.phiHuy !== 100)) {
      throw new BadRequestException(
        'Mốc không cho phép hủy phải có phí hủy 100%.',
      );
    }
    return rules;
  }

  private rules(version?: Version): CancellationRuleDto[] {
    return (
      version?.chi_tiet_chinh_sach_huy.map((rule) => ({
        truocGio: rule.sogiotoithieu,
        phiHuy: Number(rule.tylephihuy),
        choPhepHuy: rule.chophephuy,
      })) ?? []
    );
  }

  private async latestVersion(tx: Tx, policy: Policy) {
    if (policy.loaichinhsach !== 'HoanHuy') return undefined;
    return (
      (await tx.chinh_sach_huy.findFirst({
        where: { manhomchinhsach: policy.machinhsach },
        orderBy: [{ phienban: 'desc' }, { machinhsach: 'asc' }],
        include: versionInclude,
      })) ?? undefined
    );
  }

  private async versions(tx: Tx, policies: Policy[]) {
    const ids = policies
      .filter((policy) => policy.loaichinhsach === 'HoanHuy')
      .map((policy) => policy.machinhsach);
    const result = new Map<string, Version>();
    if (!ids.length) return result;
    const versions = await tx.chinh_sach_huy.findMany({
      where: { manhomchinhsach: { in: ids } },
      orderBy: [{ phienban: 'desc' }, { machinhsach: 'asc' }],
      include: versionInclude,
    });
    for (const version of versions)
      if (!result.has(version.manhomchinhsach))
        result.set(version.manhomchinhsach, version);
    return result;
  }

  private async createVersion(
    tx: Tx,
    policy: Policy,
    rules: CancellationRuleDto[],
    accountId: string,
    now: Date,
    previous?: Version,
  ) {
    // Existing ticket cancellations keep their FK to the old version and rules.
    // Future-dated versions retain the current rules until the effective instant.
    const startsAt = new Date(
      Math.max(policy.ngayapdung.getTime(), now.getTime()),
    );
    const latest =
      previous ??
      (await tx.chinh_sach_huy.findFirst({
        where: { manhomchinhsach: policy.machinhsach },
        orderBy: { phienban: 'desc' },
      }));
    const pending = await tx.chinh_sach_huy.findMany({
      where: { manhomchinhsach: policy.machinhsach, ngayapdung: { gt: now } },
      select: { machinhsach: true, ngayapdung: true },
    });
    for (const version of pending) {
      // A superseded scheduled version has an empty effective interval.
      await tx.chinh_sach_huy.update({
        where: { machinhsach: version.machinhsach },
        data: {
          ngayngungapdung: version.ngayapdung,
          trangthai: 'NgungHoatDong',
          nguoicapnhat: accountId,
          thoigiancapnhat: now,
        },
      });
    }
    await tx.chinh_sach_huy.updateMany({
      where: {
        manhomchinhsach: policy.machinhsach,
        ngayapdung: { lte: now },
        OR: [{ ngayngungapdung: null }, { ngayngungapdung: { gt: now } }],
      },
      data: {
        ngayngungapdung: startsAt,
        nguoicapnhat: accountId,
        thoigiancapnhat: now,
      },
    });
    const ruleIds = await nextBusinessIds(tx, 'MCS', rules.length);
    return tx.chinh_sach_huy.create({
      data: {
        machinhsach: await nextBusinessId(tx, 'CSH'),
        manhomchinhsach: policy.machinhsach,
        phienban: (latest?.phienban ?? 0) + 1,
        tenchinhsach: policy.tieude,
        noidungchinhsach: policy.noidung,
        ngayapdung: startsAt,
        trangthai:
          policy.trangthai === 'DangApDung' ? 'HoatDong' : 'NgungHoatDong',
        nguoitao: accountId,
        thoigiantao: now,
        thoigiancapnhat: now,
        chi_tiet_chinh_sach_huy: {
          create: rules.map((rule, index) => ({
            mamucchinhsach: ruleIds[index],
            sogiotoithieu: rule.truocGio,
            sogiotoida: index === 0 ? null : rules[index - 1].truocGio,
            chophephuy: rule.choPhepHuy ?? true,
            tylephihuy: rule.phiHuy,
            tylehoan: new Prisma.Decimal(100).minus(rule.phiHuy),
          })),
        },
      },
      include: versionInclude,
    });
  }

  private async setVersionStatus(
    tx: Tx,
    policyId: string,
    active: boolean,
    accountId: string,
    now: Date,
  ) {
    const candidates = await tx.chinh_sach_huy.findMany({
      where: {
        manhomchinhsach: policyId,
        OR: [{ ngayngungapdung: null }, { ngayngungapdung: { gt: now } }],
      },
      select: { machinhsach: true, ngayapdung: true, ngayngungapdung: true },
    });
    const ids = candidates
      .filter(
        (version) =>
          !version.ngayngungapdung ||
          version.ngayngungapdung > version.ngayapdung,
      )
      .map((version) => version.machinhsach);
    return tx.chinh_sach_huy.updateMany({
      where: { manhomchinhsach: policyId, machinhsach: { in: ids } },
      data: {
        trangthai: active ? 'HoatDong' : 'NgungHoatDong',
        nguoicapnhat: accountId,
        thoigiancapnhat: now,
      },
    });
  }

  private async audit(
    tx: Tx,
    actor: { manhanvien: string; mataikhoan: string },
    policy: Policy,
    action: string,
    now: Date,
  ) {
    return tx.nhat_ky_he_thong.create({
      data: {
        manhatky: await nextBusinessId(tx, 'NK'),
        mataikhoan: actor.mataikhoan,
        manhanvien: actor.manhanvien,
        hanhdong: action,
        banglienquan: 'chinh_sach',
        madoituong: policy.machinhsach,
        tendoituong: policy.tieude,
        loaidoituong: 'ChinhSach',
        trangthai: 'ThanhCong',
        thoigian: now,
        chitiet: `${action}: ${policy.machinhsach} - ${policy.tieude}`,
      },
    });
  }

  private response(policy: Policy, version?: Version) {
    return {
      maCS: policy.machinhsach,
      tenChinhSach: policy.tieude,
      loaiChinhSach: POLICY_TYPES[policy.loaichinhsach],
      loaiChinhSachCode: policy.loaichinhsach,
      trangThai: POLICY_STATUSES[policy.trangthai],
      trangThaiCode: policy.trangthai,
      ngayApDung: dateOnly(policy.ngayapdung),
      capNhatCuoi: policy.thoigiancapnhat.toISOString(),
      nguoiThucHien:
        policy.nhan_vien_chinh_sach_manhanviencapnhatTonhan_vien?.hoten ??
        policy.nhan_vien_chinh_sach_manhanvientaoTonhan_vien.hoten,
      maNhanVienTao: policy.manhanvientao,
      maNhanVienCapNhat: policy.manhanviencapnhat,
      noiDungChinhSach: policy.noidung,
      mocThoiGianHuyVe: this.rules(version),
      phienBanHuy: version?.phienban ?? null,
      ngayApDungPhiHuy: version?.ngayapdung.toISOString() ?? null,
    };
  }

  private async write<T>(operation: (tx: Tx) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 15000,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          if (error.code === 'P2034' && attempt < 2) continue;
          if (error.code === 'P2034' || error.code === 'P2002') {
            throw new ConflictException(
              'Dữ liệu vừa thay đổi. Vui lòng tải lại và thử lại.',
            );
          }
          if (error.code === 'P2025')
            throw new NotFoundException('Không tìm thấy chính sách.');
          if (error.code === 'P2003')
            throw new BadRequestException('Dữ liệu tham chiếu không hợp lệ.');
        }
        throw error;
      }
    }
    throw new ConflictException(
      'Không thể cập nhật chính sách. Vui lòng thử lại.',
    );
  }
}
