import { Prisma, trang_thai_don_hang_enum } from '@prisma/client';

/**
 * Doanh thu vé chỉ tính vé chưa hủy thuộc đơn đã thu tiền
 * (đã thanh toán hoặc hủy một phần — phần vé còn lại vẫn có doanh thu).
 */
export const PAID_ORDER_STATUSES: trang_thai_don_hang_enum[] = ['DaThanhToan', 'HuyMotPhan'];

export const SOLD_TICKET: Prisma.ve_xeWhereInput = {
  trangthaive: { not: 'DaHuy' },
  don_hang: { trangthaidonhang: { in: PAID_ORDER_STATUSES } },
};

export function isSoldTicket(ticket: { trangthaive: string }, orderStatus: string) {
  return ticket.trangthaive !== 'DaHuy' && PAID_ORDER_STATUSES.includes(orderStatus as trang_thai_don_hang_enum);
}

export const percent = (part: number, whole: number) => (whole ? Math.round((part / whole) * 1000) / 10 : 0);

export function sumBy<T>(rows: T[], pick: (row: T) => number) {
  return rows.reduce((total, row) => total + pick(row), 0);
}

/** Gom nhóm và đếm/cộng dồn theo khóa. */
export function groupTotals<T>(rows: T[], key: (row: T) => string, value: (row: T) => number = () => 1) {
  const map = new Map<string, number>();
  for (const row of rows) map.set(key(row), (map.get(key(row)) ?? 0) + value(row));
  return [...map].map(([k, v]) => ({ key: k, value: v })).sort((a, b) => b.value - a.value);
}
