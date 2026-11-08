import type {
  nguoi_gui_chatbot_enum,
  trang_thai_hoi_thoai_chatbot_enum,
} from '@prisma/client';

// Only the HTTP contract uses the historic widget values. Persisted names and
// enum values follow the same Vietnamese convention as VIAGO business tables.
export const conversationStatus = {
  TroLyAI: 'BOT',
  ChoXacNhan: 'AWAITING_CONFIRMATION',
  ChoNhanVien: 'QUEUED',
  NhanVienHoTro: 'ASSIGNED',
  DaGiaiQuyet: 'RESOLVED',
  DaDong: 'CLOSED',
} satisfies Record<trang_thai_hoi_thoai_chatbot_enum, string>;
export const senderRole = {
  KhachHang: 'CUSTOMER',
  TroLyAI: 'BOT',
  NhanVien: 'AGENT',
  HeThong: 'SYSTEM',
} satisfies Record<nguoi_gui_chatbot_enum, string>;
