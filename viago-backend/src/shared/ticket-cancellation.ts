import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { newId } from './accounts/account-security';

type Tx = Prisma.TransactionClient;

export type CancelTicketInput = {
  ticketId: string;
  /** KhachHang: khách tự hủy trực tuyến; NhanVienBanVe: nhân viên hủy theo yêu cầu hoặc do nhà xe. */
  source: 'KhachHang' | 'NhanVienBanVe';
  reason: string;
  /** Nhà xe không thể phục vụ: hoàn 100%, không phí hủy (BR-25). */
  carrierFault?: boolean;
  accountId?: string | null;
  staffId?: string | null;
};

export type CancelTicketResult = {
  ticketId: string;
  orderId: string;
  historyId: string;
  refundId: string | null;
  refundRate: number;
  paidAmount: number;
  refundAmount: number;
  fee: number;
  duplicate: boolean;
};

const HOUR = 3600000;

/** Tỷ lệ hoàn theo BR-24: >= 24 giờ 100%, 12–24 giờ 50%, dưới 12 giờ 0%. */
export function refundRateFor(hoursLeft: number, carrierFault = false) {
  if (carrierFault) return 100;
  if (hoursLeft >= 24) return 100;
  if (hoursLeft >= 12) return 50;
  return 0;
}

/**
 * Hủy một vé đã thanh toán trong giao dịch đang mở: vé -> Đã hủy, ghế mở bán lại,
 * cập nhật trạng thái đơn, ghi lịch sử hủy, tạo khoản hoàn tiền (nếu có) và nhật ký.
 * Gọi lặp với cùng vé và cùng nguồn hủy trả lại kết quả cũ.
 */
export async function cancelPaidTicket(tx: Tx, input: CancelTicketInput): Promise<CancelTicketResult> {
  const now = new Date();
  await tx.$queryRaw`SELECT mave FROM public.ve_xe WHERE mave = ${input.ticketId} FOR UPDATE`;
  const key = `${input.source}:HUYVE:${input.ticketId}`;
  const existing = await tx.lich_su_huy_ve.findUnique({
    where: { khoachonglap: key },
    include: { hoan_tien: { select: { mahoantien: true } } },
  });
  if (existing) {
    const ticket = await tx.ve_xe.findUniqueOrThrow({ where: { mave: input.ticketId }, select: { madonhang: true } });
    return {
      ticketId: input.ticketId,
      orderId: ticket.madonhang,
      historyId: existing.malichsuhuy,
      refundId: existing.hoan_tien[0]?.mahoantien ?? null,
      refundRate: Number(existing.tylehoanapdung ?? 0) * 100,
      paidAmount: Number(existing.sotienlamcancuhoan),
      refundAmount: Number(existing.tienhoanlai),
      fee: Number(existing.phihuy),
      duplicate: true,
    };
  }

  const ticket = await tx.ve_xe.findUnique({
    where: { mave: input.ticketId },
    include: {
      don_hang: { select: { madonhang: true, trangthaidonhang: true } },
      ghe_chuyen: { select: { maghechuyen: true, lich_trinh: { select: { thoigiankhoihanh: true } } } },
      phan_bo_thanh_toan_ve: {
        include: { thanh_toan: { select: { mathanhtoan: true, trangthaithanhtoan: true, phuongthucthanhtoan: true } } },
      },
    },
  });
  if (!ticket) throw new NotFoundException('Không tìm thấy vé.');
  if (ticket.trangthaive !== 'ChoKhoiHanh')
    throw new ConflictException('Chỉ hủy được vé đang chờ khởi hành.');
  if (!['DaThanhToan', 'HuyMotPhan'].includes(ticket.don_hang.trangthaidonhang))
    throw new ConflictException('Đơn chưa thanh toán: hãy hủy đơn giữ chỗ thay vì hủy vé.');

  const hoursLeft = (ticket.ghe_chuyen.lich_trinh.thoigiankhoihanh.getTime() - now.getTime()) / HOUR;
  if (hoursLeft <= 0) throw new ConflictException('Đã qua giờ khởi hành, không thể hủy vé.');
  const rate = refundRateFor(hoursLeft, input.carrierFault);
  if (input.source === 'KhachHang' && rate === 0)
    throw new ConflictException('Còn dưới 12 giờ trước giờ khởi hành: vui lòng liên hệ tổng đài để được hỗ trợ.');

  const paidAllocations = ticket.phan_bo_thanh_toan_ve.filter((a) => a.thanh_toan.trangthaithanhtoan === 'ThanhCong');
  const refunded = await tx.hoan_tien.aggregate({
    where: { mave: ticket.mave, trangthaihoantien: { in: ['ChoXuLy', 'DangXuLy', 'ThanhCong'] } },
    _sum: { sotienhoan: true },
  });
  const paid = Math.max(
    0,
    paidAllocations.reduce((sum, a) => sum + Number(a.sotienphanbo), 0) - Number(refunded._sum.sotienhoan ?? 0),
  );
  const refundAmount = Math.round((paid * rate) / 100);
  const fee = paid - refundAmount;

  const policy = await tx.chinh_sach_huy.findFirst({
    where: {
      trangthai: 'HoatDong',
      ngayapdung: { lte: now },
      OR: [{ ngayngungapdung: null }, { ngayngungapdung: { gt: now } }],
    },
    orderBy: { phienban: 'desc' },
    include: { chi_tiet_chinh_sach_huy: true },
  });
  const tier = policy?.chi_tiet_chinh_sach_huy.find(
    (t) => hoursLeft >= t.sogiotoithieu && (t.sogiotoida === null || hoursLeft < t.sogiotoida),
  );

  const historyId = newId('LSH');
  await tx.lich_su_huy_ve.create({
    data: {
      malichsuhuy: historyId,
      mave: ticket.mave,
      khoachonglap: key,
      machinhsach: input.carrierFault ? null : (policy?.machinhsach ?? null),
      mamucchinhsachapdung: input.carrierFault ? null : (tier?.mamucchinhsach ?? null),
      lydokhongapdungchinhsach: input.carrierFault ? 'Nhà xe không thể cung cấp dịch vụ' : null,
      nguonhuy: input.source,
      nguoithuchienhuy: input.accountId ?? null,
      malydohuy: input.carrierFault ? 'NHA_XE' : input.source === 'KhachHang' ? 'KHACH_YEU_CAU' : 'NHAN_VIEN_HO_TRO',
      lydohuy: input.reason,
      tienvegoc: ticket.giave,
      sotienlamcancuhoan: paid,
      tylehoanapdung: rate / 100,
      tylephihuyapdung: (100 - rate) / 100,
      phihuy: fee,
      tienhoanlai: refundAmount,
      trangthaihuy: 'DaHuy',
      nguoixuly: input.accountId ?? null,
      thoigianyeucau: now,
      thoigianxuly: now,
      thoigianhuy: now,
      thoigiancapnhat: now,
    },
  });

  await tx.ve_xe.update({ where: { mave: ticket.mave }, data: { trangthaive: 'DaHuy', thoigiancapnhat: now } });
  await tx.ghe_chuyen.update({
    where: { maghechuyen: ticket.ghe_chuyen.maghechuyen },
    data: {
      trangthaighe: 'Trong',
      madonhanggiu: null,
      sessiongiucho: null,
      nguoigiughe: null,
      giuchoden: null,
      thoigiancapnhat: now,
    },
  });
  const remaining = await tx.ve_xe.count({
    where: { madonhang: ticket.madonhang, trangthaive: { not: 'DaHuy' } },
  });
  await tx.don_hang.update({
    where: { madonhang: ticket.madonhang },
    data: { trangthaidonhang: remaining ? 'HuyMotPhan' : 'DaHuy', thoigiancapnhat: now },
  });
  await tx.chia_se_hanh_trinh.updateMany({
    where: { mave: ticket.mave, trangthai: 'HoatDong' },
    data: { trangthai: 'DaThuHoi', thoigianthuhoi: now },
  });

  let refundId: string | null = null;
  const sourcePayment = paidAllocations[0]?.thanh_toan;
  if (refundAmount > 0 && sourcePayment) {
    refundId = newId('HT');
    await tx.hoan_tien.create({
      data: {
        mahoantien: refundId,
        khoachonglap: 'HOANTIEN:' + historyId,
        mathanhtoangoc: sourcePayment.mathanhtoan,
        mave: ticket.mave,
        malichsuhuy: historyId,
        loaihoantien: 'HuyVe',
        sotienhoan: refundAmount,
        phuongthuchoan: sourcePayment.phuongthucthanhtoan === 'TIEN_MAT' ? 'TienMat' : 'VeGiaoDichGoc',
        trangthaihoantien: 'ChoXuLy',
        lydohoantien: input.reason,
        nguoitao: input.accountId ?? null,
        thoigiantao: now,
        thoigiancapnhat: now,
      },
    });
  }

  await tx.nhat_ky_he_thong.create({
    data: {
      manhatky: newId('NK'),
      mataikhoan: input.accountId ?? null,
      manhanvien: input.staffId ?? null,
      hanhdong: input.source === 'KhachHang' ? 'KhachHuyVe' : 'NhanVienHuyVe',
      banglienquan: 've_xe',
      madoituong: ticket.mave,
      tendoituong: ticket.mave,
      loaidoituong: 'VeXe',
      trangthai: 'ThanhCong',
      thoigian: now,
      chitiet: `Hủy vé, hoàn ${rate}% = ${refundAmount} VND, phí ${fee} VND. Lý do: ${input.reason}`,
      dulieutruoc: { trangthaive: 'ChoKhoiHanh', trangthaidonhang: ticket.don_hang.trangthaidonhang },
      dulieusau: { trangthaive: 'DaHuy', trangthaidonhang: remaining ? 'HuyMotPhan' : 'DaHuy', refundId },
    },
  });

  return {
    ticketId: ticket.mave,
    orderId: ticket.madonhang,
    historyId,
    refundId,
    refundRate: rate,
    paidAmount: paid,
    refundAmount,
    fee,
    duplicate: false,
  };
}

/** Nhân viên ghi nhận kết quả hoàn tiền (BR-28): chỉ chuyển sang Thành công khi có xác nhận chi trả. */
export async function completeRefund(
  tx: Tx,
  input: { refundId: string; success: boolean; transactionCode?: string; note?: string; accountId?: string | null; staffId?: string | null },
) {
  const now = new Date();
  await tx.$queryRaw`SELECT mahoantien FROM public.hoan_tien WHERE mahoantien = ${input.refundId} FOR UPDATE`;
  const refund = await tx.hoan_tien.findUnique({ where: { mahoantien: input.refundId } });
  if (!refund) throw new NotFoundException('Không tìm thấy khoản hoàn tiền.');
  if (refund.trangthaihoantien === 'ThanhCong') return refund;
  if (!['ChoXuLy', 'DangXuLy', 'ThatBai'].includes(refund.trangthaihoantien))
    throw new ConflictException('Khoản hoàn tiền không còn chờ xử lý.');
  const updated = await tx.hoan_tien.update({
    where: { mahoantien: refund.mahoantien },
    data: input.success
      ? {
          trangthaihoantien: 'ThanhCong',
          magiaodichhoan: input.transactionCode || null,
          manhanvienchi: input.staffId ?? null,
          thoigianhoan: now,
          maloi: null,
          motaloi: null,
          thoigiancapnhat: now,
        }
      : {
          trangthaihoantien: 'ThatBai',
          maloi: 'HOAN_THU_CONG_THAT_BAI',
          motaloi: input.note || 'Nhân viên ghi nhận hoàn tiền thất bại.',
          thoigiancapnhat: now,
        },
  });
  await tx.nhat_ky_he_thong.create({
    data: {
      manhatky: newId('NK'),
      mataikhoan: input.accountId ?? null,
      manhanvien: input.staffId ?? null,
      hanhdong: input.success ? 'XacNhanHoanTien' : 'HoanTienThatBai',
      banglienquan: 'hoan_tien',
      madoituong: refund.mahoantien,
      tendoituong: refund.mave,
      loaidoituong: 'HoanTien',
      trangthai: 'ThanhCong',
      thoigian: now,
      chitiet: `${input.success ? 'Hoàn tiền thành công' : 'Hoàn tiền thất bại'}: ${Number(refund.sotienhoan)} VND`,
      dulieutruoc: { trangthaihoantien: refund.trangthaihoantien },
      dulieusau: { trangthaihoantien: updated.trangthaihoantien },
    },
  });
  return updated;
}
