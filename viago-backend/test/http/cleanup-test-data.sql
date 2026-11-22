-- =====================================================================
-- DỌN DỮ LIỆU TEST GIAO DIỆN (thuê xe hợp đồng, đồ thất lạc, đánh giá)
-- Quy ước khi test: mọi thứ tự gõ vào đều BẮT ĐẦU BẰNG "TEST"
--   - Thuê xe: Họ tên người thuê  = "TEST Nguyễn Văn A"
--   - Đồ thất lạc (khách/admin):  Tên vật phẩm = "TEST Ví da đen"
--   - Báo nhận đồ: Đặc điểm nhận dạng = "TEST ví có thẻ sinh viên..."
--   - Đánh giá viết ở trang hồ sơ: Nhận xét = "TEST xe sạch, tài xế vui vẻ"
--     (xóa đánh giá thì vé VE012/VE013 lại được đánh giá lần nữa)
-- Chạy trong Supabase > SQL Editor.
--   BƯỚC 1: chỉ chạy phần XEM TRƯỚC, kiểm tra đúng là dữ liệu test.
--   BƯỚC 2: chạy phần XÓA (bôi đen từ BEGIN đến COMMIT rồi Run).
-- =====================================================================

-- ---------------------------- BƯỚC 1: XEM TRƯỚC ----------------------
SELECT 'yeu_cau_thue_xe' AS bang, mayeucau AS ma, hotennguoiyeucau AS mo_ta, ngaytao AS luc
FROM yeu_cau_thue_xe WHERE hotennguoiyeucau ILIKE 'TEST%'
UNION ALL
SELECT 'bao_gia_thue_xe', b.mabaogia, b.mayeucau, b.thoigiantao
FROM bao_gia_thue_xe b JOIN yeu_cau_thue_xe y ON y.mayeucau = b.mayeucau
WHERE y.hotennguoiyeucau ILIKE 'TEST%'
UNION ALL
SELECT 'hop_dong_thue_xe', h.mahopdong, h.mabaogia, h.thoigiantao
FROM hop_dong_thue_xe h JOIN bao_gia_thue_xe b ON b.mabaogia = h.mabaogia
JOIN yeu_cau_thue_xe y ON y.mayeucau = b.mayeucau
WHERE y.hotennguoiyeucau ILIKE 'TEST%'
UNION ALL
SELECT 'do_that_lac', madothatlac, tenvatpham, thoigiantao
FROM do_that_lac WHERE tenvatpham ILIKE 'TEST%'
UNION ALL
SELECT 'yeu_cau_nhan_do', mayeucaunhando, dacdiemnhandang, thoigiangui
FROM yeu_cau_nhan_do
WHERE dacdiemnhandang ILIKE 'TEST%'
   OR madothatlac IN (SELECT madothatlac FROM do_that_lac WHERE tenvatpham ILIKE 'TEST%')
UNION ALL
SELECT 'danh_gia', madanhgia, mave || ' · ' || LEFT(noidung, 40), thoigiantao
FROM danh_gia WHERE noidung ILIKE 'TEST%'
UNION ALL
SELECT 'tep_danh_gia', t.matepdanhgia, t.duongdantep, t.thoigiantailen
FROM tep_danh_gia t JOIN danh_gia d ON d.madanhgia = t.madanhgia
WHERE d.noidung ILIKE 'TEST%'
UNION ALL
SELECT 'danh_gia (ghi chú TEST)', madanhgia, LEFT(ghichunoibo, 60), thoigiancapnhat
FROM danh_gia WHERE ghichunoibo ~ '\] Ẩn vì vi phạm: TEST'
ORDER BY bang, ma;


-- ---------------------------- BƯỚC 2: XÓA ----------------------------
BEGIN;

CREATE TEMP TABLE t_yc ON COMMIT DROP AS
  SELECT mayeucau FROM yeu_cau_thue_xe WHERE hotennguoiyeucau ILIKE 'TEST%';
CREATE TEMP TABLE t_bg ON COMMIT DROP AS
  SELECT mabaogia, makhuyenmai FROM bao_gia_thue_xe WHERE mayeucau IN (SELECT mayeucau FROM t_yc);
CREATE TEMP TABLE t_hd ON COMMIT DROP AS
  SELECT h.mahopdong, b.makhuyenmai FROM hop_dong_thue_xe h JOIN t_bg b ON b.mabaogia = h.mabaogia;
CREATE TEMP TABLE t_dtl ON COMMIT DROP AS
  SELECT madothatlac FROM do_that_lac WHERE tenvatpham ILIKE 'TEST%';
CREATE TEMP TABLE t_ycnd ON COMMIT DROP AS
  SELECT mayeucaunhando FROM yeu_cau_nhan_do
  WHERE dacdiemnhandang ILIKE 'TEST%' OR madothatlac IN (SELECT madothatlac FROM t_dtl);
CREATE TEMP TABLE t_dg ON COMMIT DROP AS
  SELECT madanhgia, mave FROM danh_gia WHERE noidung ILIKE 'TEST%';
-- Thanh toán ghi nhật ký theo mã TTTX nên phải giữ lại mã trước khi xóa
CREATE TEMP TABLE t_tt ON COMMIT DROP AS
  SELECT mathanhtoantx FROM thanh_toan_thue_xe WHERE mahopdong IN (SELECT mahopdong FROM t_hd);

-- Lập hợp đồng có mã khuyến mãi đã cộng 1 lượt dùng -> trả lại
UPDATE khuyen_mai k SET soluongdadung = GREATEST(0, k.soluongdadung - x.so_lan)
FROM (SELECT makhuyenmai, COUNT(*) AS so_lan FROM t_hd WHERE makhuyenmai IS NOT NULL GROUP BY makhuyenmai) x
WHERE k.makhuyenmai = x.makhuyenmai;

-- Thuê xe: xóa từ bảng con lên bảng cha
DELETE FROM thanh_toan_thue_xe WHERE mahopdong IN (SELECT mahopdong FROM t_hd);
DELETE FROM phan_cong_xe_thue  WHERE mahopdong IN (SELECT mahopdong FROM t_hd);
DELETE FROM lich_su_thue_xe    WHERE mayeucau  IN (SELECT mayeucau  FROM t_yc);
DELETE FROM su_dung_khuyen_mai WHERE mabaogia  IN (SELECT mabaogia  FROM t_bg);
DELETE FROM hop_dong_thue_xe   WHERE mahopdong IN (SELECT mahopdong FROM t_hd);
DELETE FROM bao_gia_thue_xe    WHERE mabaogia  IN (SELECT mabaogia  FROM t_bg);
DELETE FROM yeu_cau_thue_xe    WHERE mayeucau  IN (SELECT mayeucau  FROM t_yc);

-- Đồ thất lạc
DELETE FROM yeu_cau_nhan_do WHERE mayeucaunhando IN (SELECT mayeucaunhando FROM t_ycnd);
DELETE FROM do_that_lac     WHERE madothatlac    IN (SELECT madothatlac    FROM t_dtl);

-- Đánh giá test (lượt hữu ích, ảnh/video đính kèm rồi tới đánh giá)
DELETE FROM luot_huu_ich_danh_gia WHERE madanhgia IN (SELECT madanhgia FROM t_dg);
DELETE FROM tep_danh_gia          WHERE madanhgia IN (SELECT madanhgia FROM t_dg);
DELETE FROM danh_gia              WHERE madanhgia IN (SELECT madanhgia FROM t_dg);

-- Đánh giá THẬT bị test ẩn/hiện với lý do "TEST…": xóa các dòng ghi chú đó, ghi lại
-- nhật ký thao tác admin trên các đánh giá này để xóa ở dưới.
-- ngay = ngày (giờ VN) ghi trong dòng "[yyyy-mm-dd] Ẩn vì vi phạm: TEST…" → nhật ký từ ngày đó là của buổi test
CREATE TEMP TABLE t_dg_sua ON COMMIT DROP AS
  SELECT madanhgia,
         (substring(ghichunoibo from '\[([0-9-]+)\] Ẩn vì vi phạm: TEST'))::date AS ngay
  FROM danh_gia
  WHERE ghichunoibo ~ '\] Ẩn vì vi phạm: TEST' AND madanhgia NOT IN (SELECT madanhgia FROM t_dg);
UPDATE danh_gia
SET ghichunoibo = NULLIF(btrim(regexp_replace(ghichunoibo,
      E'^\\[[0-9-]+\\] (Ẩn vì vi phạm: TEST[^\n]*|Hiển thị lại[^\n]*)\n?', '', 'gm'), E' \n'), '')
WHERE madanhgia IN (SELECT madanhgia FROM t_dg_sua);
DELETE FROM nhat_ky_he_thong n
USING t_dg_sua s
WHERE n.madoituong = s.madanhgia
  AND n.hanhdong IN ('HIDE_REVIEW','SHOW_REVIEW','REPLY_REVIEW','DELETE_REVIEW_REPLY','UPDATE_REVIEW_WORKFLOW')
  AND n.thoigian >= (s.ngay::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh');

-- Nhật ký hệ thống ghi kèm các thao tác trên
DELETE FROM nhat_ky_he_thong WHERE madoituong IN (
  SELECT mayeucau FROM t_yc UNION SELECT mabaogia FROM t_bg UNION SELECT mahopdong FROM t_hd
  UNION SELECT madothatlac FROM t_dtl UNION SELECT mayeucaunhando FROM t_ycnd
  UNION SELECT madanhgia FROM t_dg UNION SELECT mathanhtoantx FROM t_tt
);
-- Gửi đánh giá ghi nhật ký theo mã vé (CREATE_REVIEW trên bảng ve_xe)
DELETE FROM nhat_ky_he_thong
WHERE hanhdong = 'CREATE_REVIEW' AND madoituong IN (SELECT mave FROM t_dg);

COMMIT;

-- Ảnh/video của đánh giá test nằm ở viago-backend/uploads/private/reviews/
-- (đường dẫn xem ở cột duongdantep phần XEM TRƯỚC) → xóa tay các file đó nếu muốn.


-- ------------- (TÙY CHỌN) LƯỢT "HỮU ÍCH" BẤM KHI TEST --------------------
-- Lượt hữu ích không có chữ TEST nên chỉ lọc được theo thời gian.
-- Sửa mốc giờ bắt đầu test rồi chạy (giờ Việt Nam):
-- SELECT * FROM luot_huu_ich_danh_gia WHERE thoigian >= TIMESTAMPTZ '2026-11-14 08:00+07';
-- DELETE FROM luot_huu_ich_danh_gia  WHERE thoigian >= TIMESTAMPTZ '2026-11-14 08:00+07';


-- ------------- (TÙY CHỌN) ĐƯA khoachonglap CŨ VỀ ĐÚNG MẪU ----------------
-- Mẫu chuẩn: TIỀN_TỐ + yyyymmdd + '-' + số  (vd. YCTX20261117-001, TTTX20261117-001).
-- Code mới đã sinh đúng mẫu; 2 câu dưới chỉ sửa các dòng tạo trước khi sửa code
-- (thường là dòng test, đã bị xóa ở BƯỚC 2 nên có thể không còn dòng nào).
UPDATE yeu_cau_thue_xe
SET khoachonglap = 'YCTX' || to_char(ngaytao AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYYMMDD') || '-' || substring(mayeucau from 5)
WHERE khoachonglap LIKE 'REQ-%';

UPDATE thanh_toan_thue_xe
SET khoachonglap = 'TTTX' || to_char(thoigiantao AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYYMMDD') || '-' || substring(mathanhtoantx from 5)
WHERE khoachonglap ~ '^TTTX[0-9]+-[0-9]{8}$';
