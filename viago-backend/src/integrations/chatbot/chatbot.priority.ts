export type PriorityInput = {
  intent: string;
  reasons: string[];
  frustration: { score: number };
};
export function supportPriority(input: PriorityInput) {
  const reasons = input.reasons;
  const basis: string[] = [];
  if (reasons.includes('safety_incident'))
    basis.push('Có dấu hiệu sự cố hoặc đe dọa an toàn cần kiểm tra ngay.');
  if (reasons.includes('payment_requires_verification'))
    basis.push('Có phản ánh bất thường về tiền hoặc thanh toán cần đối soát.');
  if (reasons.includes('refund_requires_verification'))
    basis.push(
      'Khách yêu cầu hoàn/trả tiền, cần nhân viên kiểm tra giao dịch.',
    );
  if (reasons.includes('fraud_accusation'))
    basis.push(
      'Khách cáo buộc lừa đảo; cần nhân viên tiếp nhận khiếu nại sớm.',
    );
  if (reasons.includes('formal_complaint'))
    basis.push('Khách yêu cầu khiếu nại hoặc báo cơ quan có trách nhiệm.');
  if (reasons.includes('repeated_unresolved_issue'))
    basis.push('Vấn đề được phản ánh lặp lại và chưa giải quyết.');
  if (input.frustration.score >= 70)
    basis.push('Có nhiều dấu hiệu khách bức xúc trong nội dung trao đổi.');
  const level = reasons.includes('safety_incident')
    ? ('KhanCap' as const)
    : basis.length
      ? ('Cao' as const)
      : ('TrungBinh' as const);
  if (!basis.length)
    basis.push(
      'Yêu cầu hỗ trợ thông thường; chưa có dấu hiệu về an toàn, tranh chấp tiền hoặc khiếu nại nghiêm trọng.',
    );
  return {
    policyVersion: 'uu-tien-cskh-v1',
    level,
    score: level === 'KhanCap' ? 100 : level === 'Cao' ? 80 : 50,
    basis,
    automatic: true,
    description:
      'Mức ưu tiên xử lý yêu cầu, không phải xếp hạng khách hàng hay xác suất đã được kiểm chứng.',
  };
}
