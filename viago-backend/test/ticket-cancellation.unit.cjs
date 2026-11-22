// Kiểm tra logic hủy vé/hoàn tiền bằng giao dịch giả lập, không ghi database.
// Chạy: npm run build && node --test test/ticket-cancellation.unit.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const { cancelPaidTicket, completeRefund, refundRateFor } = require('../dist/shared/ticket-cancellation');

const HOUR = 3600000;
function fakeTx({ hoursLeft, otherActiveTickets = 1, paid = 200000, method = 'VIETQR' }) {
  const state = { histories: [], refunds: [], logs: [], ticket: 'ChoKhoiHanh', seat: 'DaBan', order: 'DaThanhToan' };
  const tx = {
    state,
    $queryRaw: async () => [],
    lich_su_huy_ve: {
      findUnique: async ({ where }) => {
        const h = state.histories.find((x) => x.khoachonglap === where.khoachonglap);
        return h ? { ...h, hoan_tien: state.refunds.filter((r) => r.malichsuhuy === h.malichsuhuy) } : null;
      },
      create: async ({ data }) => (state.histories.push(data), data),
    },
    ve_xe: {
      findUnique: async () => ({
        mave: 'VE1', madonhang: 'DH1', giave: paid, trangthaive: state.ticket,
        don_hang: { madonhang: 'DH1', trangthaidonhang: state.order },
        ghe_chuyen: { maghechuyen: 'GC1', lich_trinh: { thoigiankhoihanh: new Date(Date.now() + hoursLeft * HOUR) } },
        phan_bo_thanh_toan_ve: [{ sotienphanbo: paid, thanh_toan: { mathanhtoan: 'TT1', trangthaithanhtoan: 'ThanhCong', phuongthucthanhtoan: method } }],
      }),
      findUniqueOrThrow: async () => ({ madonhang: 'DH1' }),
      update: async ({ data }) => { state.ticket = data.trangthaive; },
      count: async () => otherActiveTickets,
    },
    hoan_tien: {
      aggregate: async () => ({ _sum: { sotienhoan: 0 } }),
      create: async ({ data }) => (state.refunds.push(data), data),
      findUnique: async ({ where }) => state.refunds.find((r) => r.mahoantien === where.mahoantien) ?? null,
      update: async ({ where, data }) => Object.assign(state.refunds.find((r) => r.mahoantien === where.mahoantien), data),
    },
    chinh_sach_huy: { findFirst: async () => null },
    ghe_chuyen: { update: async ({ data }) => { state.seat = data.trangthaighe; } },
    don_hang: { update: async ({ data }) => { state.order = data.trangthaidonhang; } },
    chia_se_hanh_trinh: { updateMany: async () => ({ count: 0 }) },
    nhat_ky_he_thong: { create: async ({ data }) => state.logs.push(data) },
  };
  return tx;
}

void test('tỷ lệ hoàn theo mốc 24 giờ / 12 giờ và lỗi nhà xe', () => {
  assert.equal(refundRateFor(30), 100);
  assert.equal(refundRateFor(24), 100);
  assert.equal(refundRateFor(12), 50);
  assert.equal(refundRateFor(11.9), 0);
  assert.equal(refundRateFor(2, true), 100);
});

void test('khách hủy trước 30 giờ: hoàn 100%, mở lại ghế, đơn hủy một phần, tạo yêu cầu hoàn', async () => {
  const tx = fakeTx({ hoursLeft: 30 });
  const r = await cancelPaidTicket(tx, { ticketId: 'VE1', source: 'KhachHang', reason: 'Đổi kế hoạch' });
  assert.equal(r.refundAmount, 200000);
  assert.equal(r.fee, 0);
  assert.equal(tx.state.ticket, 'DaHuy');
  assert.equal(tx.state.seat, 'Trong');
  assert.equal(tx.state.order, 'HuyMotPhan');
  assert.equal(tx.state.refunds[0].trangthaihoantien, 'ChoXuLy');
  assert.equal(tx.state.refunds[0].phuongthuchoan, 'VeGiaoDichGoc');
});

void test('khách hủy trong khoảng 12–24 giờ: hoàn 50%; hủy vé cuối thì đơn Đã hủy', async () => {
  const tx = fakeTx({ hoursLeft: 15, otherActiveTickets: 0, method: 'TIEN_MAT' });
  const r = await cancelPaidTicket(tx, { ticketId: 'VE1', source: 'KhachHang', reason: 'Bận việc' });
  assert.equal(r.refundAmount, 100000);
  assert.equal(r.fee, 100000);
  assert.equal(tx.state.order, 'DaHuy');
  assert.equal(tx.state.refunds[0].phuongthuchoan, 'TienMat');
});

void test('khách không tự hủy khi còn dưới 12 giờ; nhân viên hủy được nhưng không hoàn', async () => {
  await assert.rejects(
    () => cancelPaidTicket(fakeTx({ hoursLeft: 5 }), { ticketId: 'VE1', source: 'KhachHang', reason: 'x' }),
    /12 giờ/,
  );
  const tx = fakeTx({ hoursLeft: 5 });
  const r = await cancelPaidTicket(tx, { ticketId: 'VE1', source: 'NhanVienBanVe', reason: 'Khách yêu cầu' });
  assert.equal(r.refundAmount, 0);
  assert.equal(tx.state.refunds.length, 0);
});

void test('nhà xe không phục vụ: hoàn 100% dù sát giờ; gọi lặp trả kết quả cũ', async () => {
  const tx = fakeTx({ hoursLeft: 2 });
  const input = { ticketId: 'VE1', source: 'NhanVienBanVe', reason: 'Xe hỏng', carrierFault: true };
  const first = await cancelPaidTicket(tx, input);
  assert.equal(first.refundAmount, 200000);
  const again = await cancelPaidTicket(tx, input);
  assert.equal(again.duplicate, true);
  assert.equal(tx.state.histories.length, 1);
});

void test('không hủy vé đã qua giờ khởi hành hoặc vé đã hủy', async () => {
  await assert.rejects(
    () => cancelPaidTicket(fakeTx({ hoursLeft: -1 }), { ticketId: 'VE1', source: 'NhanVienBanVe', reason: 'x' }),
    /khởi hành/,
  );
  const tx = fakeTx({ hoursLeft: 30 });
  tx.state.ticket = 'DaHuy';
  await assert.rejects(() => cancelPaidTicket(tx, { ticketId: 'VE1', source: 'KhachHang', reason: 'x' }), /chờ khởi hành/);
});

void test('xác nhận hoàn tiền: thành công hoặc thất bại rồi xử lý lại', async () => {
  const tx = fakeTx({ hoursLeft: 30 });
  const r = await cancelPaidTicket(tx, { ticketId: 'VE1', source: 'KhachHang', reason: 'x' });
  const failed = await completeRefund(tx, { refundId: r.refundId, success: false, note: 'Sai tài khoản' });
  assert.equal(failed.trangthaihoantien, 'ThatBai');
  const ok = await completeRefund(tx, { refundId: r.refundId, success: true, transactionCode: 'GD01' });
  assert.equal(ok.trangthaihoantien, 'ThanhCong');
  assert.equal(ok.magiaodichhoan, 'GD01');
});
