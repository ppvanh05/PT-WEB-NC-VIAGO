import { defineConfig } from 'vitest/config';

// Mỗi ca kiểm thử thành phần phải biên dịch một component standalone của Angular,
// nên trên máy yếu hoặc khi máy đang bận việc khác, mức hết giờ mặc định 5 giây là
// quá sát và làm cả bộ kiểm thử đỏ ngẫu nhiên dù mã nguồn không có lỗi.
export default defineConfig({
  test: {
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
