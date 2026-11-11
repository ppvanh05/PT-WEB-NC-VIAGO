import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AccountsAccess,
  Identity,
} from '../../../shared/accounts/accounts-access';
import {
  calendarDate,
  hashPassword,
  newId,
} from '../../../shared/accounts/account-security';
import { fixedRolePermissions, samePermissionIds } from '../../../shared/accounts/fixed-role-permissions';
import {
  EmployeeCreateDto,
  EmployeeUpdateDto,
  PageDto,
  StatusDto,
} from '../../../shared/accounts/accounts.dto';
const employeeInclude = {
  tai_khoan: {
    select: { tendangnhap: true, trangthai: true, xacthuchailop: true },
  },
  vai_tro: true,
  nhan_vien_quyen_han: { select: { maquyen: true } },
} satisfies Prisma.nhan_vienInclude;
type Employee = Prisma.nhan_vienGetPayload<{ include: typeof employeeInclude }>;
function view(e: Employee) {
  return {
    code: e.manhanvien,
    accountId: e.mataikhoan,
    username: e.tai_khoan.tendangnhap,
    name: e.hoten,
    firstName: e.ten,
    lastName: e.hodem,
    phone: e.sodienthoai,
    email: e.email,
    gender: e.gioitinh,
    birthDate: e.ngaysinh.toISOString().slice(0, 10),
    startDate: e.ngayvaolam.toISOString().slice(0, 10),
    defaultRole: e.vai_tro.tenvaitro,
    roleId: e.mavaitro,
    status: e.trangthai,
    accountStatus: e.tai_khoan.trangthai,
    permissions: e.nhan_vien_quyen_han.map((p) => p.maquyen),
    address: e.diachi || '',
    notes: e.ghichu || '',
    avatarUrl: e.anhdaidien || '',
    contractType: e.loaihopdong,
    lockReason: e.lydokhoa,
    lockedAt: e.ngaykhoa,
    twoFA: e.tai_khoan.xacthuchailop,
  };
}
@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccountsAccess,
  ) {}
  async options() {
    const [roles, permissions] = await Promise.all([
      this.prisma.vai_tro.findMany({
        where: { trangthai: 'HoatDong', tenvaitro: { not: 'KhachHang' } },
        select: { mavaitro: true, tenvaitro: true },
      }),
      this.prisma.quyen_han.findMany({
        select: {
          maquyen: true,
          tenquyen: true,
          nhomchucnang: true,
          mota: true,
        },
      }),
    ]);
    return {
      roles, permissions,
      roleGroups: roles.map(role => {
        const group = fixedRolePermissions(role.tenvaitro, permissions);
        return group ? { ...group, roleId: role.mavaitro } : null;
      }).filter(group => group !== null),
    };
  }
  async list(query: PageDto) {
    const where: Prisma.nhan_vienWhereInput = {
      trangthai: query.status,
      mavaitro: query.roleId,
      gioitinh: query.gender,
      ...(query.search
        ? {
            OR: ['manhanvien', 'hoten', 'sodienthoai', 'email'].map(
              (field) => ({
                [field]: { contains: query.search, mode: 'insensitive' },
              }),
            ),
          }
        : {}),
    };
    const filtered = !!(query.search || query.status || query.roleId || query.gender);
    const [rows, statusCounts, filteredTotal] = await Promise.all([
      this.prisma.nhan_vien.findMany({
        where, include: employeeInclude,
        skip: (query.page - 1) * query.pageSize, take: query.pageSize,
        orderBy: [{ thoigiantao: 'desc' }, { manhanvien: 'desc' }],
      }),
      this.prisma.nhan_vien.groupBy({ by: ['trangthai'], _count: { _all: true } }),
      filtered ? this.prisma.nhan_vien.count({ where }) : Promise.resolve(null),
    ]);
    const total = filteredTotal ?? statusCounts.reduce((sum, row) => sum + row._count._all, 0);
    const active = statusCounts.find(row => row.trangthai === 'HoatDong')?._count._all || 0;
    const locked = statusCounts.find(row => row.trangthai === 'DaKhoa')?._count._all || 0;

    return {
      items: rows.map(view),
      total,
      active,
      locked,
      page: query.page,
      pageSize: query.pageSize,
    };
  }
  async detail(id: string) {
    const employee = await this.prisma.nhan_vien.findUnique({
      where: { manhanvien: id },
      include: employeeInclude,
    });
    if (!employee) throw new NotFoundException('Không tìm thấy nhân viên.');
    return view(employee);
  }
  private async validate(
    tx: Prisma.TransactionClient,
    dto: EmployeeCreateDto | EmployeeUpdateDto,
    actor: Identity,
    before?: Employee,
  ) {
    const birth = calendarDate(dto.birthday),
      start = calendarDate(dto.startDate);
    if (birth > new Date() || start < birth)
      throw new BadRequestException('Ngày sinh/ngày vào làm không hợp lệ.');
    const role = await tx.vai_tro.findUnique({
      where: { mavaitro: dto.roleId },
    });
    if (
      !role ||
      role.trangthai !== 'HoatDong' ||
      role.tenvaitro === 'KhachHang'
    )
      throw new BadRequestException('Vai trò nhân viên không hợp lệ.');
    if (actor.roleName !== 'QuanTriVien' && role.tenvaitro === 'QuanTriVien')
      throw new ForbiddenException('Không thể cấp quyền vượt quá quyền của bạn.');
    const applyGroup = !before || ('applyRolePermissions' in dto && dto.applyRolePermissions === true);
    if (before && before.mavaitro !== dto.roleId && !applyGroup)
      throw new BadRequestException('Hãy chọn nhóm vai trò để áp dụng bộ quyền cố định.');
    const catalog = await tx.quyen_han.findMany();
    const group = fixedRolePermissions(role.tenvaitro, catalog);
    if (applyGroup && (!group || group.missing.length))
      throw new ServiceUnavailableException('Danh mục quyền của nhóm vai trò chưa được cấu hình đầy đủ.');
    const permissionIds = applyGroup ? group!.permissionIds : before!.nhan_vien_quyen_han.map(p => p.maquyen);
    if (dto.permissions !== undefined && !samePermissionIds(dto.permissions, permissionIds))
      throw new BadRequestException('Không chọn quyền riêng lẻ. Hãy chọn một nhóm vai trò cố định.');
    const permissions = catalog.filter(p => permissionIds.includes(p.maquyen));
    if (permissions.length !== permissionIds.length)
      throw new BadRequestException('Có quyền không tồn tại trong Supabase.');
    if (
      actor.roleName !== 'QuanTriVien' &&
      (role.tenvaitro === 'QuanTriVien' ||
        permissions.some((p) => !actor.permissions.includes(p.tenquyen)))
    )
      throw new ForbiddenException(
        'Không thể cấp quyền vượt quá quyền của bạn.',
      );
    return { birth, start, permissions: permissionIds };
  }
  async create(dto: EmployeeCreateDto, actor: Identity, req: Request) {
    const hash = await hashPassword(dto.password),
      id = newId('NV'),
      now = new Date();
    await this.prisma.$transaction(
      async (tx) => {
        const { birth, start, permissions } = await this.validate(tx, dto, actor);
        const account = await tx.tai_khoan.create({
          data: {
            mataikhoan: newId('TK'),
            tendangnhap: dto.username,
            sodienthoai: dto.phoneNumber,
            email: dto.email.toLowerCase(),
            matkhauhash: hash,
            vaitrotaikhoan: 'NhanVien',
            trangthai: 'HoatDong',
            thoigiantao: now,
            thoigiancapnhat: now,
          },
        });
        await tx.nhan_vien.create({
          data: {
            manhanvien: id,
            mataikhoan: account.mataikhoan,
            mavaitro: dto.roleId,
            hodem: dto.lastName,
            ten: dto.firstName,
            hoten: `${dto.lastName} ${dto.firstName}`,
            sodienthoai: dto.phoneNumber,
            email: dto.email.toLowerCase(),
            gioitinh: dto.gender,
            ngaysinh: birth,
            ngayvaolam: start,
            loaihopdong: dto.contractType,
            anhdaidien: dto.avatar,
            diachi: dto.address,
            ghichu: dto.notes,
            trangthai: 'HoatDong',
            thoigiantao: now,
            thoigiancapnhat: now,
          },
        });
        await tx.nhan_vien_quyen_han.createMany({
          data: permissions.map((p) => ({
            manhanvien: id,
            maquyen: p,
            thoigiancap: now,
            nguoicap: actor.accountId,
          })),
        });
        await this.access.audit(
          tx,
          actor,
          req,
          'CREATE_STAFF',
          'nhan_vien',
          id,
          'Tạo nhân viên và cấp quyền.',
          undefined,
          { roleId: dto.roleId, permissions },
        );
      },
      { timeout: 15000 },
    );
    return this.detail(id);
  }
  async update(
    id: string,
    dto: EmployeeUpdateDto,
    actor: Identity,
    req: Request,
  ) {
    await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('viago:employee-admins'))`;
        const before = await tx.nhan_vien.findUniqueOrThrow({
          where: { manhanvien: id },
          include: employeeInclude,
        });
        if (
          before.vai_tro.tenvaitro === 'QuanTriVien' &&
          actor.roleName !== 'QuanTriVien'
        )
          throw new ForbiddenException();
        const { birth, start, permissions } = await this.validate(tx, dto, actor, before);
        if (
          actor.staffId === id &&
          (before.mavaitro !== dto.roleId ||
            before.nhan_vien_quyen_han
              .map((p) => p.maquyen)
              .sort()
              .join() !== [...permissions].sort().join())
        )
          throw new BadRequestException(
            'Không thể tự thay đổi vai trò/quyền của mình.',
          );
        if (
          before.vai_tro.tenvaitro === 'QuanTriVien' &&
          before.mavaitro !== dto.roleId
        )
          await this.ensureAnotherAdmin(tx, id);
        const now = new Date();
        await tx.nhan_vien.update({
          where: { manhanvien: id },
          data: {
            mavaitro: dto.roleId,
            hodem: dto.lastName,
            ten: dto.firstName,
            hoten: `${dto.lastName} ${dto.firstName}`,
            sodienthoai: dto.phoneNumber,
            email: dto.email.toLowerCase(),
            gioitinh: dto.gender,
            ngaysinh: birth,
            ngayvaolam: start,
            loaihopdong: dto.contractType,
            anhdaidien: dto.avatar,
            diachi: dto.address,
            ghichu: dto.notes,
            thoigiancapnhat: now,
          },
        });
        await tx.tai_khoan.update({
          where: { mataikhoan: before.mataikhoan },
          data: {
            tendangnhap: dto.username,
            sodienthoai: dto.phoneNumber,
            email: dto.email.toLowerCase(),
            thoigiancapnhat: now,
          },
        });
        if (!samePermissionIds(before.nhan_vien_quyen_han.map(p => p.maquyen), permissions)) {
          await tx.nhan_vien_quyen_han.deleteMany({ where: { manhanvien: id } });
          await tx.nhan_vien_quyen_han.createMany({
            data: permissions.map((p) => ({
              manhanvien: id, maquyen: p, thoigiancap: now, nguoicap: actor.accountId,
            })),
          });
        }
        await this.access.audit(
          tx,
          actor,
          req,
          'UPDATE_STAFF',
          'nhan_vien',
          id,
          'Cập nhật nhân viên.',
          {
            roleId: before.mavaitro,
            permissions: before.nhan_vien_quyen_han.map((p) => p.maquyen),
          },
          { roleId: dto.roleId, permissions },
        );
      },
      { timeout: 15000 },
    );
    return this.detail(id);
  }
  private async ensureAnotherAdmin(tx: Prisma.TransactionClient, id: string) {
    const count = await tx.nhan_vien.count({
      where: {
        manhanvien: { not: id },
        trangthai: 'HoatDong',
        tai_khoan: { trangthai: 'HoatDong' },
        vai_tro: { tenvaitro: 'QuanTriVien', trangthai: 'HoatDong' },
      },
    });
    if (!count)
      throw new BadRequestException(
        'Phải giữ ít nhất một quản trị viên hoạt động.',
      );
  }
  async status(id: string, dto: StatusDto, actor: Identity, req: Request) {
    if (id === actor.staffId)
      throw new BadRequestException(
        'Không thể tự khóa/mở khóa tài khoản quản trị.',
      );
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('viago:employee-admins'))`;
      const employee = await tx.nhan_vien.findUniqueOrThrow({
        where: { manhanvien: id },
        include: { vai_tro: true },
      });
      if (employee.vai_tro.tenvaitro === 'QuanTriVien') {
        if (actor.roleName !== 'QuanTriVien') throw new ForbiddenException();
        if (dto.status === 'DaKhoa') await this.ensureAnotherAdmin(tx, id);
      }
      const now = new Date();
      await tx.nhan_vien.update({
        where: { manhanvien: id },
        data: {
          trangthai: dto.status,
          ngaykhoa: dto.status === 'DaKhoa' ? now : null,
          lydokhoa: dto.status === 'DaKhoa' ? dto.reason : null,
          thoigiancapnhat: now,
        },
      });
      await tx.tai_khoan.update({
        where: { mataikhoan: employee.mataikhoan },
        data: {
          trangthai: dto.status,
          solandangnhapsai: 0,
          khoatamden: null,
          thoigiancapnhat: now,
        },
      });
      await tx.phien_dang_nhap.updateMany({
        where: { mataikhoan: employee.mataikhoan },
        data: { trangthai: 'DaDangXuat' },
      });
      await this.access.audit(
        tx,
        actor,
        req,
        dto.status === 'DaKhoa' ? 'LOCK_STAFF' : 'UNLOCK_STAFF',
        'nhan_vien',
        id,
        dto.reason,
        { status: employee.trangthai },
        { status: dto.status },
      );
    });
    return this.detail(id);
  }
}
