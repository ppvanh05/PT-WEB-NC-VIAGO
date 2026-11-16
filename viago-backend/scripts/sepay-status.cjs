// Configuration diagnostics only: never prints account numbers, names or secrets.
require('dotenv').config({ quiet: true });
const {
  readSepayConfig,
} = require('../dist/featured/customer/home/payments/sepay.config');
const { configured, environment, accountType, issues } = readSepayConfig();
console.log(
  JSON.stringify(
    {
      configured,
      authentication: 'HMAC-SHA256',
      environment,
      accountType,
      issues,
      bankConnectionVerified: false,
      note: 'Local configuration only. Bank linkage and webhook delivery must be checked in SePay.',
    },
    null,
    2,
  ),
);
if (!configured) process.exitCode = 1;
