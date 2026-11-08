-- Keep existing keys; new IDs follow the existing readable business conventions.
DO $$
DECLARE item record; maximum bigint; prior bigint; called boolean; sequence_name text;
BEGIN
  FOR item IN SELECT * FROM (VALUES
    ('DH','don_hang','madonhang'), ('VE','ve_xe','mave'), ('SD','su_dung_khuyen_mai','masudungkhuyenmai'), ('TT','thanh_toan','mathanhtoan'),
    ('UV','ho_so_ung_tuyen','mahoso'), ('LH','yeu_cau_lien_he','malienhe'), ('TD','tin_tuyen_dung','matin'),
    ('TT','tin_tuc','matintuc'), ('CS','chinh_sach','machinhsach'),
    ('CSH','chinh_sach_huy','machinhsach'), ('MCS','chi_tiet_chinh_sach_huy','mamucchinhsach'),
    ('KM','khuyen_mai','makhuyenmai'), ('VKH','voucher_khach_hang','mavoucherkhachhang'),
    ('NK','nhat_ky_he_thong','manhatky'), ('BL','binh_luan_tin_tuc','mabinhluan')
  ) AS ids(prefix,table_name,column_name)
  LOOP
    sequence_name := 'viago_id_' || lower(item.prefix);
    EXECUTE format('CREATE SEQUENCE IF NOT EXISTS public.%I', sequence_name);
    EXECUTE format('SELECT COALESCE(MAX(substring(%I FROM %L)::bigint),0) FROM public.%I', item.column_name, '^' || item.prefix || '([0-9]{1,12})$', item.table_name) INTO maximum;
    EXECUTE format('SELECT last_value, is_called FROM public.%I', sequence_name) INTO prior, called;
    PERFORM setval(('public.' || sequence_name)::regclass, GREATEST(maximum + 1, prior + CASE WHEN called THEN 1 ELSE 0 END), false);
    EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM anon, authenticated', sequence_name);
  END LOOP;
END $$;
