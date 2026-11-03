-- Additive setup for anonymous comment likes; does not change existing data.
CREATE TABLE IF NOT EXISTS public.luot_thich_binh_luan (
  mabinhluan varchar NOT NULL,
  nguoithich varchar(64) NOT NULL,
  thoigian timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT luot_thich_binh_luan_pkey PRIMARY KEY (mabinhluan, nguoithich),
  CONSTRAINT luot_thich_binh_luan_mabinhluan_fkey FOREIGN KEY (mabinhluan)
    REFERENCES public.binh_luan_tin_tuc(mabinhluan) ON DELETE CASCADE ON UPDATE NO ACTION
);
ALTER TABLE public.luot_thich_binh_luan ENABLE ROW LEVEL SECURITY;
