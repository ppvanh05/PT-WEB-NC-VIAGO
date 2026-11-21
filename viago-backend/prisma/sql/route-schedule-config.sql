-- Run this script in Supabase SQL Editor before using route schedule configuration.
ALTER TABLE public.tuyen_xe
  ADD COLUMN IF NOT EXISTS ngaybatdauapdung date,
  ADD COLUMN IF NOT EXISTS ngayketthucapdung date,
  ADD COLUMN IF NOT EXISTS thutrongtuan integer[] DEFAULT ARRAY[1,2,3,4,5,6,7]::integer[],
  ADD COLUMN IF NOT EXISTS giokhoihanh time[] DEFAULT ARRAY['08:00'::time,'10:00'::time,'12:00'::time,'14:00'::time,'16:00'::time];

ALTER TABLE public.tuyen_xe
  ADD CONSTRAINT tuyen_xe_apdung_dates_check
  CHECK (ngayketthucapdung IS NULL OR ngayketthucapdung >= ngaybatdauapdung);

ALTER TABLE public.tuyen_xe
  ADD CONSTRAINT tuyen_xe_weekdays_check
  CHECK (thutrongtuan IS NULL OR thutrongtuan <@ ARRAY[1,2,3,4,5,6,7]::integer[]);
