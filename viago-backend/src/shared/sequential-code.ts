import { Prisma } from '@prisma/client';

/**
 * Các bảng dùng mã nghiệp vụ dạng TIỀN_TỐ + số (YCTX006, DTL00004...).
 * Chỉ cho phép đúng các cặp bảng/cột ở đây để câu SQL không nhận tên tùy ý.
 */
const CODE_COLUMNS = {
  yeu_cau_thue_xe: 'mayeucau',
  bao_gia_thue_xe: 'mabaogia',
  hop_dong_thue_xe: 'mahopdong',
  thanh_toan_thue_xe: 'mathanhtoantx',
  lich_su_thue_xe: 'malichsuthuexe',
  do_that_lac: 'madothatlac',
  yeu_cau_nhan_do: 'mayeucaunhando',
  danh_gia: 'madanhgia',
} as const;
export type CodeTable = keyof typeof CODE_COLUMNS;

/**
 * Lấy mã tiếp theo = số lớn nhất hiện có + 1.
 * Hai yêu cầu ghi cùng lúc có thể ra trùng mã; khi đó khóa chính báo P2002
 * và nơi gọi dùng withCodeRetry để thử lại.
 */
export async function nextCode(
  tx: Prisma.TransactionClient,
  table: CodeTable,
  prefix: string,
  width: number,
  offset = 0,
): Promise<string> {
  const column = CODE_COLUMNS[table];
  const pattern = `^${prefix}([0-9]+)$`;
  const rows = await tx.$queryRawUnsafe<{ max: number | null }[]>(
    `SELECT MAX((substring(${column} from $1))::int) AS max FROM public.${table} WHERE ${column} ~ $1`,
    pattern,
  );
  const next = Number(rows[0]?.max ?? 0) + 1 + offset;
  return prefix + String(next).padStart(width, '0');
}

/** Lấy nhiều mã liên tiếp trong cùng giao dịch (ví dụ nhiều dòng lịch sử). */
export async function nextCodes(
  tx: Prisma.TransactionClient,
  table: CodeTable,
  prefix: string,
  width: number,
  count: number,
) {
  const first = await nextCode(tx, table, prefix, width);
  const start = Number(first.slice(prefix.length));
  return Array.from({ length: count }, (_, i) =>
    prefix + String(start + i).padStart(width, '0'),
  );
}

/**
 * Khóa chống lặp theo đúng mẫu dữ liệu có sẵn: TIỀN_TỐ + ngày (yyyymmdd) + '-' + số.
 * Ví dụ mã YCTX006 tạo ngày 2026-11-14 → YCTX20261114-006.
 */
export function dedupKey(code: string, prefix: string, date: string) {
  return `${prefix}${date.replace(/-/g, '')}-${code.slice(prefix.length)}`;
}

export function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

/** Chạy lại thao tác khi bị trùng mã do ghi đồng thời (tối đa 3 lần). */
export async function withCodeRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= 3 || !isUniqueViolation(error)) throw error;
    }
  }
}
