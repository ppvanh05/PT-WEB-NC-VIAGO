import { loai_xe_enum } from '@prisma/client';

/** 6 tiêu chí chấm điểm, cùng thứ tự với ReviewDto.scores của trang khách. */
export const REVIEW_CRITERIA = [
  { key: 'safety', label: 'An toàn', column: 'diemantoan' },
  { key: 'cleanliness', label: 'Sạch sẽ', column: 'diemsachse' },
  { key: 'attitude', label: 'Thái độ nhân viên', column: 'diemthaido' },
  { key: 'punctuality', label: 'Đúng giờ', column: 'diemdunggio' },
  { key: 'information', label: 'Thông tin đầy đủ', column: 'diemthongtin' },
  { key: 'comfort', label: 'Tiện nghi', column: 'diemtiennghi' },
] as const;
export type CriterionKey = (typeof REVIEW_CRITERIA)[number]['key'];
export type CriterionColumn = (typeof REVIEW_CRITERIA)[number]['column'];
export const CRITERION_KEYS = REVIEW_CRITERIA.map((c) => c.key);

export const VEHICLE_TYPE_LABELS: Record<loai_xe_enum, string> = {
  Limousine9Cho: 'Limousine 9 chỗ',
  GiuongNam34Cho: 'Giường nằm 34 chỗ',
  Cabin22Cho: 'Cabin 22 phòng',
};

/** Từ ngữ cho thấy nhận xét đang phản ánh vấn đề nghiệp vụ cần xử lý sớm. */
const NEGATIVE_WORDS = ['thái độ', 'bỏ khách', 'ồn', 'mùi', 'lạng lách', 'ẩu', 'say xe', 'trễ', 'quỵt', 'hoàn tiền', 'lừa'];

export function hasNegativeWords(text: string | null | undefined) {
  const content = (text ?? '').toLowerCase();
  return NEGATIVE_WORDS.some((word) => content.includes(word));
}

/** Chuyến trễ khi đến thực tế muộn hơn dự kiến quá 15 phút. */
export function isLateTrip(expected: Date, actual: Date | null | undefined) {
  return !!actual && actual.getTime() - expected.getTime() > 15 * 60 * 1000;
}

/** Mức khẩn cấp tính tự động khi chưa được nhân viên đặt tay. */
export function autoUrgency(score: number, late: boolean, content?: string | null) {
  if (score <= 2 || late || hasNegativeWords(content)) return 'Cao' as const;
  if (score === 3) return 'TrungBinh' as const;
  return 'Thap' as const;
}

/** Tên hiển thị công khai: "Nguyễn M. Thư" thay vì họ tên đầy đủ. */
export function publicName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? 'Khách hàng';
  return parts.map((p, i) => (i === parts.length - 1 ? p : p[0] + '.')).join(' ');
}

export function initials(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return ((parts.at(-2)?.[0] ?? '') + (parts.at(-1)?.[0] ?? '')).toUpperCase() || 'KH';
}

export function round1(value: number | null | undefined) {
  return value == null ? null : Math.round(value * 10) / 10;
}
