-- ====================================================================
-- SKEMA DATABASE & ROW LEVEL SECURITY (RLS) SUPABASE UNTUK KOMENTAR
-- Salin dan jalankan skrip SQL ini di menu "SQL Editor" pada Dashboard Supabase Anda
-- ====================================================================

-- 1. Buat Tabel "comments"
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL,
    message VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Aktifkan Fitur Keamanan Row Level Security (RLS)
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 3. Hapus Kebijakan Lama jika pernah dibuat sebelumnya (agar aman di-run ulang)
DROP POLICY IF EXISTS "Allow public read comments" ON public.comments;
DROP POLICY IF EXISTS "Allow public insert comments" ON public.comments;

-- 4. Kebijakan 1: Izin MEMBACA Komentar (SELECT)
-- Siapapun pengunjung website (anonim maupun terotentikasi) diizinkan membaca daftar komentar
CREATE POLICY "Allow public read comments"
ON public.comments
FOR SELECT
TO anon, authenticated
USING (true);

-- 5. Kebijakan 2: Izin MENAMBAHKAN Komentar Baru (INSERT)
-- Pengunjung diizinkan mengirim komentar baru dengan batasan validasi panjang karakter
CREATE POLICY "Allow public insert comments"
ON public.comments
FOR INSERT
TO anon, authenticated
WITH CHECK (
    char_length(trim(name)) > 0 AND char_length(name) <= 50 AND
    char_length(trim(message)) > 0 AND char_length(message) <= 500
);

-- PENTING TENTANG KEAMANAN UPDATE & DELETE:
-- Karena RLS diaktifkan dan kita TIDAK membuat policy untuk UPDATE maupun DELETE bagi role 'anon',
-- maka secara otomatis seluruh pengunjung TIDAK BISA mengedit atau menghapus komentar orang lain!

-- 6. (Opsional) Aktifkan Fitur Realtime Supabase
-- Agar komentar baru yang dikirim di satu device langsung muncul seketika di device lain tanpa reload
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;

