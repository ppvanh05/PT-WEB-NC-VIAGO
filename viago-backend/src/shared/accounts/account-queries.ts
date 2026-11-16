import { Prisma } from '@prisma/client';

type QueryClient = Pick<Prisma.TransactionClient, '$queryRaw'>;
export interface StaffAccountData {
  manhanvien: string; hoten: string; sodienthoai: string; email: string;
  anhdaidien: string | null; trangthai: string;
  vai_tro: { tenvaitro: string; trangthai: string };
  nhan_vien_quyen_han: { quyen_han: { maquyen: string; tenquyen: string } }[];
}
export interface ActiveAccountSession {
  maphien: string; mataikhoan: string; thoigianhethan: Date; thoigianhoatdongcuoi: Date;
  tai_khoan: {
    mataikhoan: string; vaitrotaikhoan: string;
    khach_hang: { makhachhang: string; hotenkhachhang: string; trangthai: string } | null;
    nhan_vien: StaffAccountData | null;
  };
}
interface LoginAccount {
  mataikhoan: string; matkhauhash: string; vaitrotaikhoan: string; trangthai: string;
  solandangnhapsai: number; khoatamden: Date | null; xacthuchailop: boolean;
  sodienthoai: string; nhan_vien: StaffAccountData | null;
}

const staffData = Prisma.sql`CASE WHEN n.manhanvien IS NULL THEN NULL ELSE jsonb_build_object(
  'manhanvien', n.manhanvien, 'hoten', n.hoten, 'sodienthoai', n.sodienthoai,
  'email', n.email, 'anhdaidien', n.anhdaidien, 'trangthai', n.trangthai,
  'vai_tro', jsonb_build_object('tenvaitro', v.tenvaitro, 'trangthai', v.trangthai),
  'nhan_vien_quyen_han', COALESCE((
    SELECT jsonb_agg(jsonb_build_object('quyen_han', jsonb_build_object('maquyen', q.maquyen, 'tenquyen', q.tenquyen)))
    FROM nhan_vien_quyen_han nq JOIN quyen_han q ON q.maquyen = nq.maquyen
    WHERE nq.manhanvien = n.manhanvien
  ), '[]'::jsonb)
) END`;

export async function readActiveAccountSession(db: QueryClient, tokenDigest: string) {
  const [session] = await db.$queryRaw<ActiveAccountSession[]>(Prisma.sql`
    SELECT p.maphien, p.mataikhoan, p.thoigianhethan, p.thoigianhoatdongcuoi,
      jsonb_build_object(
        'mataikhoan', t.mataikhoan, 'vaitrotaikhoan', t.vaitrotaikhoan,
        'khach_hang', CASE WHEN k.makhachhang IS NULL THEN NULL ELSE jsonb_build_object(
          'makhachhang', k.makhachhang, 'hotenkhachhang', k.hotenkhachhang, 'trangthai', k.trangthai
        ) END,
        'nhan_vien', ${staffData}
      ) AS tai_khoan
    FROM phien_dang_nhap p JOIN tai_khoan t ON t.mataikhoan = p.mataikhoan
    LEFT JOIN khach_hang k ON k.mataikhoan = t.mataikhoan
    LEFT JOIN nhan_vien n ON n.mataikhoan = t.mataikhoan
    LEFT JOIN vai_tro v ON v.mavaitro = n.mavaitro
    WHERE p.tokenphien = ${tokenDigest} AND p.trangthai = 'DangHoatDong'
      AND p.thoigianhethan > ${new Date()} AND t.trangthai = 'HoatDong'
    LIMIT 1
  `);
  return session;
}

export async function lockLoginAccount(db: QueryClient, username: string) {
  const [account] = await db.$queryRaw<LoginAccount[]>(Prisma.sql`
    SELECT t.mataikhoan, t.matkhauhash, t.vaitrotaikhoan, t.trangthai,
      t.solandangnhapsai, t.khoatamden, t.xacthuchailop, t.sodienthoai,
      ${staffData} AS nhan_vien
    FROM tai_khoan t LEFT JOIN nhan_vien n ON n.mataikhoan = t.mataikhoan
    LEFT JOIN vai_tro v ON v.mavaitro = n.mavaitro
    WHERE t.email = ${username} OR t.sodienthoai = ${username} OR t.tendangnhap = ${username}
    LIMIT 1 FOR UPDATE OF t
  `);
  return account;
}
