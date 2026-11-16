export type SepayConfig = {
  bankId: string;
  accountName: string;
  qrAccountNumber: string;
  bankAccountNumber: string;
  gateway: string;
  environment: 'test' | 'live';
  accountType: 'bank' | 'virtual';
};

export function sepayWebhookSecret(env: NodeJS.ProcessEnv = process.env) {
  const secret = env.SEPAY_WEBHOOK_SECRET ?? '';
  return secret.trim().length >= 32 && secret === secret.trim()
    ? secret
    : undefined;
}

// Keep the QR recipient separate from the parent bank account reported by SePay.
// Official VA payments (including OCB) identify the recipient in subAccount.
export function readSepayConfig(env: NodeJS.ProcessEnv = process.env) {
  const value = (name: string) => env[name]?.trim() ?? '';
  const bankId = value('VIETQR_BANK_ID');
  const accountName = value('VIETQR_ACCOUNT_NAME');
  const qrAccountNumber = value('VIETQR_ACCOUNT_NO');
  const parentAccount = value('SEPAY_ACCOUNT_NO');
  const bankAccountNumber = parentAccount || qrAccountNumber;
  const gateway = value('SEPAY_BANK_NAME');
  const mode = value('SEPAY_MODE').toLowerCase() || 'live';
  const environment = mode === 'test' ? 'test' : 'live';
  const accountType =
    bankAccountNumber !== qrAccountNumber ? 'virtual' : 'bank';
  const issues: string[] = [];
  if (!/^[a-zA-Z0-9]{2,30}$/.test(bankId)) issues.push('VIETQR_BANK_ID');
  if (!/^[a-zA-Z0-9]{4,40}$/.test(qrAccountNumber))
    issues.push('VIETQR_ACCOUNT_NO');
  if (!accountName) issues.push('VIETQR_ACCOUNT_NAME');
  if (!gateway) issues.push('SEPAY_BANK_NAME');
  if (parentAccount && !/^[a-zA-Z0-9]{4,40}$/.test(parentAccount))
    issues.push('SEPAY_ACCOUNT_NO');
  if (!sepayWebhookSecret(env)) issues.push('SEPAY_WEBHOOK_SECRET');
  if (!['test', 'live'].includes(mode)) issues.push('SEPAY_MODE');
  if (
    (gateway.toUpperCase() === 'OCB' ||
      ['OCB', '970448'].includes(bankId.toUpperCase())) &&
    (!parentAccount || accountType !== 'virtual')
  )
    issues.push('OCB_VIRTUAL_ACCOUNT_REQUIRED');
  const config: SepayConfig | null = issues.length
    ? null
    : {
        bankId,
        accountName,
        qrAccountNumber,
        bankAccountNumber,
        gateway,
        environment,
        accountType,
      };
  return {
    configured: config !== null,
    issues,
    environment,
    accountType,
    config,
  };
}

export function sepayRecipientMatches(
  config: SepayConfig,
  payment: {
    accountNumber: string;
    gateway: string;
    subAccount?: string | null;
  },
) {
  return (
    payment.accountNumber === config.bankAccountNumber &&
    payment.gateway.toLowerCase() === config.gateway.toLowerCase() &&
    (config.accountType !== 'virtual' ||
      payment.subAccount === config.qrAccountNumber)
  );
}
