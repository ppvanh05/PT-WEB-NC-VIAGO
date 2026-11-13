import { BadRequestException } from '@nestjs/common';

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;

/** Ngày theo lịch Việt Nam (yyyy-MM-dd) của một thời điểm. */
export function vnDate(value: Date): string {
  return new Date(value.getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);
}

/** Giờ:phút theo giờ Việt Nam. */
export function vnTime(value: Date): string {
  return new Date(value.getTime() + VN_OFFSET_MS).toISOString().slice(11, 16);
}

/** Đầu ngày (00:00 giờ Việt Nam) của một chuỗi yyyy-MM-dd. */
export function startOfVnDay(day: string): Date {
  const date = new Date(`${day}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime()) || vnDate(date) !== day)
    throw new BadRequestException('Ngày không hợp lệ.');
  return date;
}

/**
 * Khoảng thời gian [gte, lt) từ hai ngày yyyy-MM-dd (bao gồm cả ngày "to").
 * Trả về undefined khi không có ngày nào.
 */
export function vnDayRange(from?: string, to?: string) {
  if (!from && !to) return undefined;
  const gte = from ? startOfVnDay(from) : undefined;
  const lt = to ? new Date(startOfVnDay(to).getTime() + DAY_MS) : undefined;
  if (gte && lt && gte >= lt)
    throw new BadRequestException('Ngày bắt đầu phải trước ngày kết thúc.');
  return { ...(gte ? { gte } : {}), ...(lt ? { lt } : {}) };
}
