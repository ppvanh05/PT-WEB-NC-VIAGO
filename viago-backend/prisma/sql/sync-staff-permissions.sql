-- Đồng bộ quyền nhân viên theo vai trò cố định (shared/accounts/fixed-role-permissions.ts).
-- Sửa lỗi 403: dữ liệu mẫu cũ gán sai quyền (vd. nhân viên điều phối mang quyền của khách hàng).
-- Chỉ đụng bảng nhan_vien_quyen_han của các nhân viên có vai trò cố định; chạy lại vẫn an toàn.
--   npx prisma db execute --file prisma/sql/sync-staff-permissions.sql --schema prisma/schema.prisma
BEGIN;
-- NV001 Nguyễn Văn Hùng (NhanVienBanVe): 9 quyền
DELETE FROM public.nhan_vien_quyen_han WHERE manhanvien = 'NV001' AND maquyen NOT IN ('Q003', 'Q004', 'Q005', 'Q006', 'Q007', 'Q008', 'Q009', 'Q014', 'Q016');
INSERT INTO public.nhan_vien_quyen_han (manhanvien, maquyen, thoigiancap) VALUES
  ('NV001', 'Q003', now()),
  ('NV001', 'Q004', now()),
  ('NV001', 'Q005', now()),
  ('NV001', 'Q006', now()),
  ('NV001', 'Q007', now()),
  ('NV001', 'Q008', now()),
  ('NV001', 'Q009', now()),
  ('NV001', 'Q014', now()),
  ('NV001', 'Q016', now())
ON CONFLICT (manhanvien, maquyen) DO NOTHING;
-- NV002 Trần Minh Đức (NhanVienDieuPhoi): 8 quyền
DELETE FROM public.nhan_vien_quyen_han WHERE manhanvien = 'NV002' AND maquyen NOT IN ('Q008', 'Q014', 'Q020', 'Q021', 'Q022', 'Q023', 'Q024', 'Q029');
INSERT INTO public.nhan_vien_quyen_han (manhanvien, maquyen, thoigiancap) VALUES
  ('NV002', 'Q008', now()),
  ('NV002', 'Q014', now()),
  ('NV002', 'Q020', now()),
  ('NV002', 'Q021', now()),
  ('NV002', 'Q022', now()),
  ('NV002', 'Q023', now()),
  ('NV002', 'Q024', now()),
  ('NV002', 'Q029', now())
ON CONFLICT (manhanvien, maquyen) DO NOTHING;
-- NV003 Lê Thị Hương (BanQuanLy): 7 quyền
DELETE FROM public.nhan_vien_quyen_han WHERE manhanvien = 'NV003' AND maquyen NOT IN ('Q008', 'Q014', 'Q032', 'Q033', 'Q034', 'Q035', 'Q036');
INSERT INTO public.nhan_vien_quyen_han (manhanvien, maquyen, thoigiancap) VALUES
  ('NV003', 'Q008', now()),
  ('NV003', 'Q014', now()),
  ('NV003', 'Q032', now()),
  ('NV003', 'Q033', now()),
  ('NV003', 'Q034', now()),
  ('NV003', 'Q035', now()),
  ('NV003', 'Q036', now())
ON CONFLICT (manhanvien, maquyen) DO NOTHING;
-- NV004 Phạm Quốc Bảo (QuanTriVien): 36 quyền
DELETE FROM public.nhan_vien_quyen_han WHERE manhanvien = 'NV004' AND maquyen NOT IN ('Q001', 'Q002', 'Q003', 'Q004', 'Q005', 'Q006', 'Q007', 'Q008', 'Q009', 'Q010', 'Q011', 'Q012', 'Q013', 'Q014', 'Q015', 'Q016', 'Q017', 'Q018', 'Q019', 'Q020', 'Q021', 'Q022', 'Q023', 'Q024', 'Q025', 'Q026', 'Q027', 'Q028', 'Q029', 'Q030', 'Q031', 'Q032', 'Q033', 'Q034', 'Q035', 'Q036');
INSERT INTO public.nhan_vien_quyen_han (manhanvien, maquyen, thoigiancap) VALUES
  ('NV004', 'Q001', now()),
  ('NV004', 'Q002', now()),
  ('NV004', 'Q003', now()),
  ('NV004', 'Q004', now()),
  ('NV004', 'Q005', now()),
  ('NV004', 'Q006', now()),
  ('NV004', 'Q007', now()),
  ('NV004', 'Q008', now()),
  ('NV004', 'Q009', now()),
  ('NV004', 'Q010', now()),
  ('NV004', 'Q011', now()),
  ('NV004', 'Q012', now()),
  ('NV004', 'Q013', now()),
  ('NV004', 'Q014', now()),
  ('NV004', 'Q015', now()),
  ('NV004', 'Q016', now()),
  ('NV004', 'Q017', now()),
  ('NV004', 'Q018', now()),
  ('NV004', 'Q019', now()),
  ('NV004', 'Q020', now()),
  ('NV004', 'Q021', now()),
  ('NV004', 'Q022', now()),
  ('NV004', 'Q023', now()),
  ('NV004', 'Q024', now()),
  ('NV004', 'Q025', now()),
  ('NV004', 'Q026', now()),
  ('NV004', 'Q027', now()),
  ('NV004', 'Q028', now()),
  ('NV004', 'Q029', now()),
  ('NV004', 'Q030', now()),
  ('NV004', 'Q031', now()),
  ('NV004', 'Q032', now()),
  ('NV004', 'Q033', now()),
  ('NV004', 'Q034', now()),
  ('NV004', 'Q035', now()),
  ('NV004', 'Q036', now())
ON CONFLICT (manhanvien, maquyen) DO NOTHING;
-- Mọi nhân viên vai trò NhanVienCSKH: quản lý khách hàng, đánh giá, đồ thất lạc, thuê xe hợp đồng.
-- Bỏ quyền từ khóa cấm (chức năng đã gỡ). Tra theo tên quyền nên không phụ thuộc mã Q.
DELETE FROM public.nhan_vien_quyen_han nq USING public.nhan_vien nv, public.vai_tro vt, public.quyen_han q
WHERE nq.manhanvien = nv.manhanvien AND nv.mavaitro = vt.mavaitro AND nq.maquyen = q.maquyen
  AND vt.tenvaitro = 'NhanVienCSKH'
  AND q.tenquyen NOT IN ('DangNhapNoiBo', 'QuanLyHoSoCaNhan', 'QuanLyTaiKhoanKhachHang', 'QuanLyDanhGiaVaPhanHoi',
    'QuanLyDoThatLac', 'QuanLyYeuCauThueXe');
INSERT INTO public.nhan_vien_quyen_han (manhanvien, maquyen, thoigiancap)
SELECT nv.manhanvien, q.maquyen, now()
FROM public.nhan_vien nv
JOIN public.vai_tro vt ON vt.mavaitro = nv.mavaitro AND vt.tenvaitro = 'NhanVienCSKH'
JOIN public.quyen_han q ON q.tenquyen IN ('DangNhapNoiBo', 'QuanLyHoSoCaNhan', 'QuanLyTaiKhoanKhachHang',
  'QuanLyDanhGiaVaPhanHoi', 'QuanLyDoThatLac', 'QuanLyYeuCauThueXe')
ON CONFLICT (manhanvien, maquyen) DO NOTHING;
-- Quản trị viên không còn quyền từ khóa cấm.
DELETE FROM public.nhan_vien_quyen_han nq USING public.quyen_han q
WHERE nq.maquyen = q.maquyen AND q.tenquyen = 'QuanLyTuKhoaCam';
COMMIT;
