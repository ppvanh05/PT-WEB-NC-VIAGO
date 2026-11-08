-- VIAGO chatbot v2. Transactional and repeatable; business tables are untouched.
-- Old support tables are renamed in place, preserving conversations and messages.
BEGIN;
SELECT pg_advisory_xact_lock(8675309);
CREATE TEMP TABLE chatbot_migration_audit (table_name text, row_count bigint) ON COMMIT DROP;
DO $$ DECLARE item record; source_table regclass; total bigint; BEGIN
  FOR item IN SELECT * FROM (VALUES ('SupportConversation','hoi_thoai_chatbot'),('SupportMessage','tin_nhan_chatbot'),('SupportEvent','su_kien_chatbot'),('bo_nho_chatbot','bo_nho_chatbot'),('yeu_cau_chuyen_tiep_chatbot','yeu_cau_chuyen_tiep_chatbot'),('phan_cong_chatbot','phan_cong_chatbot'),('danh_muc_kien_thuc_chatbot','danh_muc_kien_thuc_chatbot'),('tai_lieu_kien_thuc_chatbot','tai_lieu_kien_thuc_chatbot'),('doan_kien_thuc_chatbot','doan_kien_thuc_chatbot')) AS names(old_name,new_name)
  LOOP
    source_table := COALESCE(to_regclass(format('public.%I',item.old_name)),to_regclass(format('public.%I',item.new_name)));
    IF source_table IS NOT NULL THEN
      EXECUTE format('SELECT count(*) FROM %s',source_table) INTO total;
      INSERT INTO chatbot_migration_audit VALUES (item.new_name,total);
    END IF;
  END LOOP;
END $$;
CREATE EXTENSION IF NOT EXISTS vector;
DO $$
DECLARE old_name text; new_name text;
BEGIN
  FOR old_name, new_name IN SELECT * FROM (VALUES
    ('SupportConversation','hoi_thoai_chatbot'),
    ('SupportMessage','tin_nhan_chatbot'),
    ('SupportEvent','su_kien_chatbot')) AS names(old_name,new_name)
  LOOP
    IF to_regclass(format('public.%I', old_name)) IS NOT NULL THEN
      IF to_regclass(format('public.%I', new_name)) IS NOT NULL THEN
        RAISE EXCEPTION 'Both legacy and new chatbot tables exist: % / %', old_name, new_name;
      END IF;
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I', old_name, new_name);
    END IF;
  END LOOP;
END $$;
DO $$ BEGIN CREATE TYPE "trang_thai_hoi_thoai_chatbot_enum" AS ENUM ('TroLyAI', 'ChoXacNhan', 'ChoNhanVien', 'NhanVienHoTro', 'DaGiaiQuyet', 'DaDong'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "nguoi_gui_chatbot_enum" AS ENUM ('KhachHang', 'TroLyAI', 'NhanVien', 'HeThong'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "trang_thai_chuyen_tiep_chatbot_enum" AS ENUM ('ChoXacNhan', 'ChoNhanVien', 'DangXuLy', 'DaGiaiQuyet', 'DaHuy'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "loai_van_de_chatbot_enum" AS ENUM ('ThanhToan', 'DatVe', 'HoanTien', 'KhieuNai', 'DoiVe', 'KyThuat', 'AnToan', 'Khac'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "muc_do_uu_tien_chatbot_enum" AS ENUM ('Thap', 'TrungBinh', 'Cao', 'KhanCap'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "kieu_kich_hoat_chatbot_enum" AS ENUM ('KhachYeuCau', 'TinhHuongNghiemTrong', 'AIKhongXuLyDuoc', 'KhachChuaHaiLong', 'KhachXacNhan'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "trang_thai_phan_cong_chatbot_enum" AS ENUM ('DaPhanCong', 'DaTiepNhan', 'DaChuyen', 'DaTuChoi', 'DaHoanThanh'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "trang_thai_tai_lieu_chatbot_enum" AS ENUM ('ChoXuLy', 'HoatDong', 'DaKhoa', 'LoiXuLy'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hoi_thoai_chatbot' AND column_name='id') THEN
    ALTER TABLE "hoi_thoai_chatbot" RENAME COLUMN "id" TO "mahoithoai";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hoi_thoai_chatbot' AND column_name='ownerHash') THEN
    ALTER TABLE "hoi_thoai_chatbot" RENAME COLUMN "ownerHash" TO "mabamchusohuu";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hoi_thoai_chatbot' AND column_name='status') THEN
    ALTER TABLE "hoi_thoai_chatbot" RENAME COLUMN "status" TO "trangthai";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hoi_thoai_chatbot' AND column_name='language') THEN
    ALTER TABLE "hoi_thoai_chatbot" RENAME COLUMN "language" TO "ngonngu";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hoi_thoai_chatbot' AND column_name='assignedAgentId') THEN
    ALTER TABLE "hoi_thoai_chatbot" RENAME COLUMN "assignedAgentId" TO "manhanvienphutrach";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hoi_thoai_chatbot' AND column_name='priority') THEN
    ALTER TABLE "hoi_thoai_chatbot" RENAME COLUMN "priority" TO "diemuutien";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hoi_thoai_chatbot' AND column_name='analysis') THEN
    ALTER TABLE "hoi_thoai_chatbot" RENAME COLUMN "analysis" TO "phantich";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hoi_thoai_chatbot' AND column_name='handoff') THEN
    ALTER TABLE "hoi_thoai_chatbot" RENAME COLUMN "handoff" TO "thongtinchuyentiep";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hoi_thoai_chatbot' AND column_name='revision') THEN
    ALTER TABLE "hoi_thoai_chatbot" RENAME COLUMN "revision" TO "phienban";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hoi_thoai_chatbot' AND column_name='processingToken') THEN
    ALTER TABLE "hoi_thoai_chatbot" RENAME COLUMN "processingToken" TO "makhoaxuly";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hoi_thoai_chatbot' AND column_name='processingUntil') THEN
    ALTER TABLE "hoi_thoai_chatbot" RENAME COLUMN "processingUntil" TO "thoigianhethankhoa";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hoi_thoai_chatbot' AND column_name='createdAt') THEN
    ALTER TABLE "hoi_thoai_chatbot" RENAME COLUMN "createdAt" TO "thoigiantao";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hoi_thoai_chatbot' AND column_name='updatedAt') THEN
    ALTER TABLE "hoi_thoai_chatbot" RENAME COLUMN "updatedAt" TO "thoigiancapnhat";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hoi_thoai_chatbot' AND column_name='confirmationExpiresAt') THEN
    ALTER TABLE "hoi_thoai_chatbot" RENAME COLUMN "confirmationExpiresAt" TO "thoigianhethanxacnhan";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='hoi_thoai_chatbot' AND column_name='closedAt') THEN
    ALTER TABLE "hoi_thoai_chatbot" RENAME COLUMN "closedAt" TO "thoigiandong";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tin_nhan_chatbot' AND column_name='id') THEN
    ALTER TABLE "tin_nhan_chatbot" RENAME COLUMN "id" TO "matinnhan";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tin_nhan_chatbot' AND column_name='conversationId') THEN
    ALTER TABLE "tin_nhan_chatbot" RENAME COLUMN "conversationId" TO "mahoithoai";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tin_nhan_chatbot' AND column_name='sequence') THEN
    ALTER TABLE "tin_nhan_chatbot" RENAME COLUMN "sequence" TO "thutu";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tin_nhan_chatbot' AND column_name='role') THEN
    ALTER TABLE "tin_nhan_chatbot" RENAME COLUMN "role" TO "nguoigui";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tin_nhan_chatbot' AND column_name='text') THEN
    ALTER TABLE "tin_nhan_chatbot" RENAME COLUMN "text" TO "noidung";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tin_nhan_chatbot' AND column_name='originalText') THEN
    ALTER TABLE "tin_nhan_chatbot" RENAME COLUMN "originalText" TO "noidunggoc";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tin_nhan_chatbot' AND column_name='clientMessageId') THEN
    ALTER TABLE "tin_nhan_chatbot" RENAME COLUMN "clientMessageId" TO "mayeucauclient";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tin_nhan_chatbot' AND column_name='agentId') THEN
    ALTER TABLE "tin_nhan_chatbot" RENAME COLUMN "agentId" TO "manhanvien";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='tin_nhan_chatbot' AND column_name='createdAt') THEN
    ALTER TABLE "tin_nhan_chatbot" RENAME COLUMN "createdAt" TO "thoigiantao";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='su_kien_chatbot' AND column_name='id') THEN
    ALTER TABLE "su_kien_chatbot" RENAME COLUMN "id" TO "masukien";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='su_kien_chatbot' AND column_name='conversationId') THEN
    ALTER TABLE "su_kien_chatbot" RENAME COLUMN "conversationId" TO "mahoithoai";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='su_kien_chatbot' AND column_name='type') THEN
    ALTER TABLE "su_kien_chatbot" RENAME COLUMN "type" TO "loaisukien";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='su_kien_chatbot' AND column_name='data') THEN
    ALTER TABLE "su_kien_chatbot" RENAME COLUMN "data" TO "dulieu";
  END IF;
END $$;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='su_kien_chatbot' AND column_name='createdAt') THEN
    ALTER TABLE "su_kien_chatbot" RENAME COLUMN "createdAt" TO "thoigiantao";
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS "hoi_thoai_chatbot" (
    "mahoithoai" VARCHAR NOT NULL,
    "mabamchusohuu" VARCHAR(64) NOT NULL,
    "trangthai" "trang_thai_hoi_thoai_chatbot_enum" NOT NULL DEFAULT 'TroLyAI',
    "ngonngu" VARCHAR(8) NOT NULL DEFAULT 'vi',
    "manhanvienphutrach" VARCHAR,
    "diemuutien" INTEGER NOT NULL DEFAULT 0,
    "phantich" JSONB,
    "thongtinchuyentiep" JSONB,
    "phienban" INTEGER NOT NULL DEFAULT 0,
    "makhoaxuly" VARCHAR,
    "thoigianhethankhoa" TIMESTAMPTZ(6),
    "thoigiantao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thoigiancapnhat" TIMESTAMPTZ(6) NOT NULL,
    "thoigianhethanxacnhan" TIMESTAMPTZ(6),
    "thoigiandong" TIMESTAMPTZ(6),

    CONSTRAINT "hoi_thoai_chatbot_pkey" PRIMARY KEY ("mahoithoai")
);
CREATE TABLE IF NOT EXISTS "tin_nhan_chatbot" (
    "matinnhan" VARCHAR NOT NULL,
    "mahoithoai" VARCHAR NOT NULL,
    "thutu" SERIAL NOT NULL,
    "nguoigui" "nguoi_gui_chatbot_enum" NOT NULL,
    "noidung" TEXT NOT NULL,
    "noidunggoc" TEXT,
    "mayeucauclient" VARCHAR,
    "manhanvien" VARCHAR,
    "thoigiantao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tin_nhan_chatbot_pkey" PRIMARY KEY ("matinnhan")
);
CREATE TABLE IF NOT EXISTS "su_kien_chatbot" (
    "masukien" SERIAL NOT NULL,
    "mahoithoai" VARCHAR NOT NULL,
    "loaisukien" VARCHAR(32) NOT NULL,
    "dulieu" JSONB NOT NULL,
    "thoigiantao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "su_kien_chatbot_pkey" PRIMARY KEY ("masukien")
);
CREATE TABLE IF NOT EXISTS "bo_nho_chatbot" (
    "mabonho" VARCHAR NOT NULL,
    "mahoithoai" VARCHAR NOT NULL,
    "tomtat" TEXT,
    "ngucanh" JSONB,
    "thoigiancapnhat" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "bo_nho_chatbot_pkey" PRIMARY KEY ("mabonho")
);
CREATE TABLE IF NOT EXISTS "yeu_cau_chuyen_tiep_chatbot" (
    "mayeucau" VARCHAR NOT NULL,
    "mahoithoai" VARCHAR NOT NULL,
    "lydo" TEXT NOT NULL,
    "loaivande" "loai_van_de_chatbot_enum" NOT NULL,
    "mucdouutien" "muc_do_uu_tien_chatbot_enum" NOT NULL,
    "kieukichhoat" "kieu_kich_hoat_chatbot_enum" NOT NULL,
    "trangthai" "trang_thai_chuyen_tiep_chatbot_enum" NOT NULL DEFAULT 'ChoXacNhan',
    "thoigianxacnhan" TIMESTAMPTZ(6),
    "thoigianhethanxacnhan" TIMESTAMPTZ(6),
    "manhanvien" VARCHAR,
    "thoigiantao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thoigiangiaiquyet" TIMESTAMPTZ(6),
    "ketquaxuly" TEXT,

    CONSTRAINT "yeu_cau_chuyen_tiep_chatbot_pkey" PRIMARY KEY ("mayeucau")
);
CREATE TABLE IF NOT EXISTS "phan_cong_chatbot" (
    "maphancong" VARCHAR NOT NULL,
    "mayeucau" VARCHAR NOT NULL,
    "manhanvien" VARCHAR NOT NULL,
    "thoigianphancong" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thoigiantiepnhan" TIMESTAMPTZ(6),
    "thoigianketthuc" TIMESTAMPTZ(6),
    "trangthai" "trang_thai_phan_cong_chatbot_enum" NOT NULL DEFAULT 'DaPhanCong',

    CONSTRAINT "phan_cong_chatbot_pkey" PRIMARY KEY ("maphancong")
);
CREATE TABLE IF NOT EXISTS "danh_muc_kien_thuc_chatbot" (
    "madanhmuc" VARCHAR NOT NULL,
    "tendanhmuc" VARCHAR NOT NULL,
    "mota" TEXT,

    CONSTRAINT "danh_muc_kien_thuc_chatbot_pkey" PRIMARY KEY ("madanhmuc")
);
CREATE TABLE IF NOT EXISTS "tai_lieu_kien_thuc_chatbot" (
    "matailieu" VARCHAR NOT NULL,
    "madanhmuc" VARCHAR,
    "tieude" TEXT NOT NULL,
    "nguon" TEXT NOT NULL,
    "duongdan" TEXT,
    "noidung" TEXT NOT NULL,
    "mabamnoidung" VARCHAR(64) NOT NULL,
    "trangthai" "trang_thai_tai_lieu_chatbot_enum" NOT NULL DEFAULT 'ChoXuLy',
    "thoigiantao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "thoigiancapnhat" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tai_lieu_kien_thuc_chatbot_pkey" PRIMARY KEY ("matailieu")
);
CREATE TABLE IF NOT EXISTS "doan_kien_thuc_chatbot" (
    "madoan" VARCHAR NOT NULL,
    "matailieu" VARCHAR NOT NULL,
    "thutudoan" INTEGER NOT NULL,
    "noidung" TEXT NOT NULL,
    "embedding" vector(1536),
    "mohinhnhung" VARCHAR,
    "metadata" JSONB,
    "thoigiantao" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doan_kien_thuc_chatbot_pkey" PRIMARY KEY ("madoan")
);

ALTER TABLE hoi_thoai_chatbot ADD COLUMN IF NOT EXISTS thoigianhethanxacnhan TIMESTAMPTZ;
ALTER TABLE hoi_thoai_chatbot ADD COLUMN IF NOT EXISTS thoigiandong TIMESTAMPTZ;
-- Legacy CHECK constraints use English values and must be removed before casting.
DO $$ DECLARE constraint_row record; BEGIN
  FOR constraint_row IN SELECT conrelid::regclass AS target, conname FROM pg_constraint
    WHERE conrelid IN ('hoi_thoai_chatbot'::regclass,'tin_nhan_chatbot'::regclass)
    AND contype='c' AND (pg_get_constraintdef(oid) LIKE '%trangthai%' OR pg_get_constraintdef(oid) LIKE '%nguoigui%')
  LOOP EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', constraint_row.target, constraint_row.conname); END LOOP;
END $$;
ALTER TABLE hoi_thoai_chatbot ALTER COLUMN trangthai DROP DEFAULT;
ALTER TABLE hoi_thoai_chatbot ALTER COLUMN trangthai TYPE trang_thai_hoi_thoai_chatbot_enum USING
  (CASE trangthai::text WHEN 'BOT' THEN 'TroLyAI' WHEN 'QUEUED' THEN 'ChoNhanVien' WHEN 'ASSIGNED' THEN 'NhanVienHoTro' WHEN 'RESOLVED' THEN 'DaGiaiQuyet' ELSE trangthai::text END)::trang_thai_hoi_thoai_chatbot_enum;
ALTER TABLE hoi_thoai_chatbot ALTER COLUMN trangthai SET DEFAULT 'TroLyAI';
ALTER TABLE tin_nhan_chatbot ALTER COLUMN nguoigui TYPE nguoi_gui_chatbot_enum USING
  (CASE nguoigui::text WHEN 'CUSTOMER' THEN 'KhachHang' WHEN 'BOT' THEN 'TroLyAI' WHEN 'AGENT' THEN 'NhanVien' WHEN 'SYSTEM' THEN 'HeThong' ELSE nguoigui::text END)::nguoi_gui_chatbot_enum;
CREATE INDEX IF NOT EXISTS "hoi_thoai_chatbot_mabamchusohuu_thoigiantao_idx" ON "hoi_thoai_chatbot"("mabamchusohuu", "thoigiantao");
CREATE INDEX IF NOT EXISTS "hoi_thoai_chatbot_trangthai_diemuutien_thoigiancapnhat_idx" ON "hoi_thoai_chatbot"("trangthai", "diemuutien", "thoigiancapnhat");
CREATE UNIQUE INDEX IF NOT EXISTS "tin_nhan_chatbot_thutu_key" ON "tin_nhan_chatbot"("thutu");
CREATE INDEX IF NOT EXISTS "tin_nhan_chatbot_mahoithoai_thutu_idx" ON "tin_nhan_chatbot"("mahoithoai", "thutu");
CREATE UNIQUE INDEX IF NOT EXISTS "tin_nhan_chatbot_mahoithoai_mayeucauclient_key" ON "tin_nhan_chatbot"("mahoithoai", "mayeucauclient");
CREATE INDEX IF NOT EXISTS "su_kien_chatbot_mahoithoai_masukien_idx" ON "su_kien_chatbot"("mahoithoai", "masukien");
CREATE UNIQUE INDEX IF NOT EXISTS "bo_nho_chatbot_mahoithoai_key" ON "bo_nho_chatbot"("mahoithoai");
CREATE INDEX IF NOT EXISTS "yeu_cau_chuyen_tiep_chatbot_trangthai_mucdouutien_thoigiant_idx" ON "yeu_cau_chuyen_tiep_chatbot"("trangthai", "mucdouutien", "thoigiantao");
CREATE INDEX IF NOT EXISTS "yeu_cau_chuyen_tiep_chatbot_mahoithoai_thoigiantao_idx" ON "yeu_cau_chuyen_tiep_chatbot"("mahoithoai", "thoigiantao");
CREATE INDEX IF NOT EXISTS "phan_cong_chatbot_manhanvien_trangthai_idx" ON "phan_cong_chatbot"("manhanvien", "trangthai");
CREATE UNIQUE INDEX IF NOT EXISTS "danh_muc_kien_thuc_chatbot_tendanhmuc_key" ON "danh_muc_kien_thuc_chatbot"("tendanhmuc");
CREATE UNIQUE INDEX IF NOT EXISTS "tai_lieu_kien_thuc_chatbot_nguon_key" ON "tai_lieu_kien_thuc_chatbot"("nguon");
CREATE UNIQUE INDEX IF NOT EXISTS "doan_kien_thuc_chatbot_matailieu_thutudoan_key" ON "doan_kien_thuc_chatbot"("matailieu", "thutudoan");
DO $$ BEGIN ALTER TABLE "hoi_thoai_chatbot" ADD CONSTRAINT "hoi_thoai_chatbot_manhanvienphutrach_fkey" FOREIGN KEY ("manhanvienphutrach") REFERENCES "nhan_vien"("manhanvien") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tin_nhan_chatbot" ADD CONSTRAINT "tin_nhan_chatbot_mahoithoai_fkey" FOREIGN KEY ("mahoithoai") REFERENCES "hoi_thoai_chatbot"("mahoithoai") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tin_nhan_chatbot" ADD CONSTRAINT "tin_nhan_chatbot_manhanvien_fkey" FOREIGN KEY ("manhanvien") REFERENCES "nhan_vien"("manhanvien") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "su_kien_chatbot" ADD CONSTRAINT "su_kien_chatbot_mahoithoai_fkey" FOREIGN KEY ("mahoithoai") REFERENCES "hoi_thoai_chatbot"("mahoithoai") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "bo_nho_chatbot" ADD CONSTRAINT "bo_nho_chatbot_mahoithoai_fkey" FOREIGN KEY ("mahoithoai") REFERENCES "hoi_thoai_chatbot"("mahoithoai") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "yeu_cau_chuyen_tiep_chatbot" ADD CONSTRAINT "yeu_cau_chuyen_tiep_chatbot_mahoithoai_fkey" FOREIGN KEY ("mahoithoai") REFERENCES "hoi_thoai_chatbot"("mahoithoai") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "yeu_cau_chuyen_tiep_chatbot" ADD CONSTRAINT "yeu_cau_chuyen_tiep_chatbot_manhanvien_fkey" FOREIGN KEY ("manhanvien") REFERENCES "nhan_vien"("manhanvien") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "phan_cong_chatbot" ADD CONSTRAINT "phan_cong_chatbot_mayeucau_fkey" FOREIGN KEY ("mayeucau") REFERENCES "yeu_cau_chuyen_tiep_chatbot"("mayeucau") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "phan_cong_chatbot" ADD CONSTRAINT "phan_cong_chatbot_manhanvien_fkey" FOREIGN KEY ("manhanvien") REFERENCES "nhan_vien"("manhanvien") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "tai_lieu_kien_thuc_chatbot" ADD CONSTRAINT "tai_lieu_kien_thuc_chatbot_madanhmuc_fkey" FOREIGN KEY ("madanhmuc") REFERENCES "danh_muc_kien_thuc_chatbot"("madanhmuc") ON DELETE NO ACTION ON UPDATE NO ACTION; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "doan_kien_thuc_chatbot" ADD CONSTRAINT "doan_kien_thuc_chatbot_matailieu_fkey" FOREIGN KEY ("matailieu") REFERENCES "tai_lieu_kien_thuc_chatbot"("matailieu") ON DELETE CASCADE ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Convert only chatbot UUID storage to VIAGO's varchar business-code format.
-- Existing code values are retained so old history and links remain valid.
CREATE TEMP TABLE chatbot_foreign_keys ON COMMIT DROP AS
SELECT conrelid::regclass AS target, conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE contype = 'f' AND conrelid IN (
  'hoi_thoai_chatbot'::regclass, 'tin_nhan_chatbot'::regclass,
  'su_kien_chatbot'::regclass, 'bo_nho_chatbot'::regclass,
  'yeu_cau_chuyen_tiep_chatbot'::regclass, 'phan_cong_chatbot'::regclass,
  'danh_muc_kien_thuc_chatbot'::regclass, 'tai_lieu_kien_thuc_chatbot'::regclass,
  'doan_kien_thuc_chatbot'::regclass
);
DO $$ DECLARE item record; BEGIN
  FOR item IN SELECT * FROM chatbot_foreign_keys LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', item.target, item.conname);
  END LOOP;
  FOR item IN SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND data_type = 'uuid'
    AND table_name IN ('hoi_thoai_chatbot','tin_nhan_chatbot','su_kien_chatbot',
      'bo_nho_chatbot','yeu_cau_chuyen_tiep_chatbot','phan_cong_chatbot',
      'danh_muc_kien_thuc_chatbot','tai_lieu_kien_thuc_chatbot','doan_kien_thuc_chatbot')
  LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE varchar USING %I::text', item.table_name, item.column_name, item.column_name);
  END LOOP;
  FOR item IN SELECT * FROM chatbot_foreign_keys LOOP
    EXECUTE format('ALTER TABLE %s ADD CONSTRAINT %I %s', item.target, item.conname, item.definition);
  END LOOP;
END $$;

-- Move legacy summaries into dedicated memory without deleting the original audit.
INSERT INTO bo_nho_chatbot (mabonho,mahoithoai,tomtat,ngucanh,thoigiancapnhat)
SELECT 'BN' || upper(md5(mahoithoai::text || ':memory')), mahoithoai, phantich->>'summaryVi', phantich->'memory', thoigiancapnhat
FROM hoi_thoai_chatbot WHERE phantich IS NOT NULL ON CONFLICT (mahoithoai) DO NOTHING;
INSERT INTO yeu_cau_chuyen_tiep_chatbot (mayeucau,mahoithoai,lydo,loaivande,mucdouutien,kieukichhoat,trangthai,manhanvien,thoigiantao)
SELECT 'YCCT' || upper(md5(mahoithoai::text || ':legacy-handoff')), mahoithoai,
  COALESCE(thongtinchuyentiep->>'modelReason','Chuyển đổi yêu cầu hỗ trợ cũ'), 'Khac',
  CASE WHEN diemuutien >= 80 THEN 'Cao' ELSE 'TrungBinh' END::muc_do_uu_tien_chatbot_enum,
  'AIKhongXuLyDuoc',
  CASE trangthai WHEN 'ChoNhanVien' THEN 'ChoNhanVien' WHEN 'NhanVienHoTro' THEN 'DangXuLy' ELSE 'DaGiaiQuyet' END::trang_thai_chuyen_tiep_chatbot_enum,
  manhanvienphutrach, thoigiantao
FROM hoi_thoai_chatbot WHERE trangthai IN ('ChoNhanVien','NhanVienHoTro','DaGiaiQuyet')
AND NOT EXISTS (SELECT 1 FROM yeu_cau_chuyen_tiep_chatbot y WHERE y.mahoithoai=hoi_thoai_chatbot.mahoithoai)
ON CONFLICT DO NOTHING;
INSERT INTO phan_cong_chatbot (maphancong,mayeucau,manhanvien,thoigianphancong,thoigiantiepnhan,trangthai)
SELECT 'PCCT' || upper(md5(y.mayeucau::text || ':legacy-assignment')),y.mayeucau,y.manhanvien,y.thoigiantao,y.thoigiantao,'DaTiepNhan'
FROM yeu_cau_chuyen_tiep_chatbot y WHERE y.trangthai='DangXuLy' AND y.manhanvien IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM phan_cong_chatbot p WHERE p.mayeucau=y.mayeucau)
ON CONFLICT DO NOTHING;
CREATE UNIQUE INDEX IF NOT EXISTS mot_yeu_cau_chatbot_dang_mo ON yeu_cau_chuyen_tiep_chatbot(mahoithoai)
WHERE trangthai IN ('ChoXacNhan','ChoNhanVien','DangXuLy');
CREATE UNIQUE INDEX IF NOT EXISTS mot_phan_cong_chatbot_dang_mo ON phan_cong_chatbot(mayeucau)
WHERE trangthai IN ('DaPhanCong','DaTiepNhan');
CREATE INDEX IF NOT EXISTS doan_kien_thuc_chatbot_embedding_idx ON doan_kien_thuc_chatbot
USING hnsw (embedding vector_cosine_ops);
ALTER TABLE "hoi_thoai_chatbot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tin_nhan_chatbot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "su_kien_chatbot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "bo_nho_chatbot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "yeu_cau_chuyen_tiep_chatbot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "phan_cong_chatbot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "danh_muc_kien_thuc_chatbot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tai_lieu_kien_thuc_chatbot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "doan_kien_thuc_chatbot" ENABLE ROW LEVEL SECURITY;
-- Realtime is a notification channel only; all mutations use authenticated NestJS.
-- No client write policies or public table grants are added.
DO $$ DECLARE item record; total bigint; BEGIN
  FOR item IN SELECT * FROM chatbot_migration_audit LOOP
    EXECUTE format('SELECT count(*) FROM %I',item.table_name) INTO total;
    IF total <> item.row_count THEN RAISE EXCEPTION 'Chatbot migration changed row count for %',item.table_name; END IF;
  END LOOP;
END $$;
COMMIT;
