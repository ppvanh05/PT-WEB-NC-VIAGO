import type { BadgeVariant } from '../../../shared/components/badge/badge';

export function orderStatusVariant(label: string): BadgeVariant {
  if (label === 'Chờ khởi hành') return 'info';
  if (label === 'Đã hoàn thành' || label === 'Đã thanh toán') return 'success';
  if (label === 'Đã hủy') return 'danger';
  if (['Giữ chỗ', 'Hủy một phần', 'Chờ thanh toán', 'Chờ thu tiền', 'Chờ chuyển khoản', 'Chờ thu tiền mặt'].includes(label)) return 'warning';
  return 'neutral';
}
