CREATE TABLE IF NOT EXISTS phien_tra_cuu_ve (
 tokenhash varchar(64) PRIMARY KEY,
 sodienthoai varchar(10) NOT NULL,
 thoigiantao timestamptz NOT NULL DEFAULT now(),
 thoigianhethan timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS phien_tra_cuu_ve_expiry ON phien_tra_cuu_ve(thoigianhethan);
-- Lookup sessions are private to the backend; expose no policies to browser DB roles.
ALTER TABLE phien_tra_cuu_ve ENABLE ROW LEVEL SECURITY;
