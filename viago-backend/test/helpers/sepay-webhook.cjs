const { createHmac } = require('node:crypto');

// Send exactly the bytes that were signed, including spaces and Unicode.
function postSepayWebhook(api, payload) {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac('sha256', process.env.SEPAY_WEBHOOK_SECRET)
    .update(timestamp + '.')
    .update(body, 'utf8')
    .digest('hex');
  return api
    .post('/customer/home/payments/sepay')
    .set('Content-Type', 'application/json')
    .set('X-SePay-Timestamp', timestamp)
    .set('X-SePay-Signature', 'sha256=' + signature)
    .send(body);
}
module.exports = { postSepayWebhook };
