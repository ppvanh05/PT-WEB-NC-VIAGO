/** Số di động Việt Nam: 10 chữ số, đầu 03/05/07/08/09, không dùng +84. */
export const VN_PHONE_PATTERN = /^0[35789]\d{8}$/;

/** Đưa số điện thoại về dạng 0xxxxxxxxx để so khớp (chấp nhận dữ liệu cũ thiếu số 0 hoặc có 84). */
export function normalizePhone(value: string | null | undefined): string {
  let digits = (value ?? '').replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length === 11) digits = digits.slice(2);
  if (digits.length === 9) digits = '0' + digits;
  return digits;
}

export function samePhone(a: string | null | undefined, b: string | null | undefined) {
  const left = normalizePhone(a);
  return left.length === 10 && left === normalizePhone(b);
}

/** Che bớt số điện thoại khi trả về cho người chưa xác thực: 090****501. */
export function maskPhone(value: string | null | undefined): string {
  const phone = normalizePhone(value);
  return phone.length === 10 ? `${phone.slice(0, 3)}****${phone.slice(7)}` : '';
}
