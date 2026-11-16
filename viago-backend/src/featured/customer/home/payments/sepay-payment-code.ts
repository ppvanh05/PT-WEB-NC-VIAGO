import { ServiceUnavailableException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomInt } from 'node:crypto';

export async function generateSepayPaymentCode(
  tx: Pick<Prisma.TransactionClient, 'thanh_toan'>,
): Promise<string> {
  // The caller inserts the intent in the same Serializable transaction.
  // Concurrent collisions cause a serialization failure and retry the creation.
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = 'VIAGO' + String(randomInt(100000000)).padStart(8, '0');
    const existing = await tx.thanh_toan.findFirst({
      where: { kenhthanhtoan: 'SePay', mathamchieuyeucau: code },
      select: { mathanhtoan: true },
    });
    // Keep paid and expired references reserved for late-transfer reconciliation.
    if (!existing) return code;
  }
  throw new ServiceUnavailableException(
    'Chưa tạo được mã thanh toán. Vui lòng thử lại.',
  );
}

export function extractSepayPaymentCode(content: string): string | null {
  // Accept old QR references while new orders use SePay's VIAGO + digits format.
  const codes = content
    .toUpperCase()
    .match(/\b(?:VIAGO[0-9]{6,8}|VG[A-F0-9]{20})\b/g);
  return codes && new Set(codes).size === 1 ? codes[0] : null;
}
