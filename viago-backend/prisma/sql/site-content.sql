-- Durable editorial content. Public clients read published pages via NestJS.
BEGIN;
CREATE TABLE IF NOT EXISTS public.noi_dung_trang (
  slug varchar(100) PRIMARY KEY,
  loai varchar(30) NOT NULL CHECK (loai IN ('GioiThieu', 'HuongDan')),
  tieude varchar(255) NOT NULL,
  noidung jsonb NOT NULL CHECK (jsonb_typeof(noidung) = 'object'),
  thutu integer NOT NULL DEFAULT 0,
  trangthai varchar(30) NOT NULL DEFAULT 'DaXuatBan' CHECK (trangthai IN ('BanNhap', 'DaXuatBan')),
  thoigiantao timestamptz NOT NULL DEFAULT now(),
  thoigiancapnhat timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.noi_dung_trang ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.noi_dung_trang FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS noi_dung_trang_loai_thutu_idx ON public.noi_dung_trang(loai, thutu);
COMMIT;
