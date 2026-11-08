-- Additive migration: preserve all applications, contacts and their business IDs.
CREATE TABLE IF NOT EXISTS public.quan_ly_tiep_nhan (
  loaidoituong varchar NOT NULL CHECK (loaidoituong IN ('contact','application')),
  madoituong varchar NOT NULL,
  manhanvienphutrach varchar REFERENCES public.nhan_vien(manhanvien),
  mucdouutien varchar NOT NULL DEFAULT 'BinhThuong' CHECK (mucdouutien IN ('Thap','BinhThuong','Cao','KhanCap')),
  danhgia text NOT NULL DEFAULT '',
  lichphongvan timestamptz,
  phanhoinhap text NOT NULL DEFAULT '',
  capnhatluc timestamptz NOT NULL DEFAULT now(),
  phienban integer NOT NULL DEFAULT 0,
  PRIMARY KEY (loaidoituong, madoituong)
);
ALTER TABLE public.quan_ly_tiep_nhan ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.quan_ly_tiep_nhan FROM anon, authenticated;
CREATE INDEX IF NOT EXISTS quan_ly_tiep_nhan_phutrach_idx ON public.quan_ly_tiep_nhan(manhanvienphutrach);
-- Initialise only missing workflow records; existing customer data is untouched.
INSERT INTO public.quan_ly_tiep_nhan(loaidoituong,madoituong,manhanvienphutrach,capnhatluc)
SELECT 'contact',malienhe,manhanvienxuly,thoigiangui FROM public.yeu_cau_lien_he ON CONFLICT DO NOTHING;
INSERT INTO public.quan_ly_tiep_nhan(loaidoituong,madoituong,capnhatluc)
SELECT 'application',mahoso,thoigianungtuyen FROM public.ho_so_ung_tuyen ON CONFLICT DO NOTHING;
