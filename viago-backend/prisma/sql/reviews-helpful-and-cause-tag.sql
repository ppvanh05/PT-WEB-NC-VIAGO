-- Bổ sung cho đánh giá chuyến đi. Chỉ thêm mới, không đổi dữ liệu cũ; chạy lại nhiều lần vẫn an toàn.
--   npx prisma db execute --file prisma/sql/reviews-helpful-and-cause-tag.sql
--   npm run prisma:generate

-- 1) Lượt "Hữu ích" cho đánh giá, mỗi trình duyệt (hash cookie khách) chỉ bấm một lần mỗi đánh giá.
CREATE TABLE IF NOT EXISTS public.luot_huu_ich_danh_gia (
  madanhgia varchar NOT NULL,
  nguoibinhchon varchar(64) NOT NULL,
  thoigian timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT luot_huu_ich_danh_gia_pkey PRIMARY KEY (madanhgia, nguoibinhchon),
  CONSTRAINT luot_huu_ich_danh_gia_madanhgia_fkey FOREIGN KEY (madanhgia)
    REFERENCES public.danh_gia(madanhgia) ON DELETE CASCADE ON UPDATE NO ACTION
);
ALTER TABLE public.luot_huu_ich_danh_gia ENABLE ROW LEVEL SECURITY;

-- 2) Nguyên nhân CSKH gắn cho đánh giá (phản ánh nghiệp vụ): tài xế, vận hành, thời tiết, khách chủ quan.
ALTER TABLE public.danh_gia ADD COLUMN IF NOT EXISTS tagnguyennhan varchar(30);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'danh_gia_tagnguyennhan_check') THEN
    ALTER TABLE public.danh_gia ADD CONSTRAINT danh_gia_tagnguyennhan_check
      CHECK (tagnguyennhan IS NULL OR tagnguyennhan IN ('tai-xe', 'van-hanh', 'thoi-tiet', 'khach-chu-quan'));
  END IF;
END $$;
