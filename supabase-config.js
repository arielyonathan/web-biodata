/**
 * supabase-config.js - Konfigurasi Client Supabase
 * 
 * CARA 1 (Deployment Vercel - Sangat Direkomendasikan):
 * Cukup tambahkan Environment Variables pada menu:
 * Project Settings -> Environment Variables di Dashboard Vercel:
 *   - SUPABASE_URL      = (URL Project Supabase Anda)
 *   - SUPABASE_ANON_KEY = (Anon / Public Key Supabase Anda)
 * File /api/config.js akan otomatis menyediakannya secara aman.
 * 
 * CARA 2 (Testing Lokal / Manual):
 * Jika ingin mencoba langsung di komputer lokal tanpa Vercel,
 * Anda bisa mengisi variabel url dan anonKey di bawah ini:
 */

window.SUPABASE_CONFIG = {
    url: 'https://tycrprswzosomolillfq.supabase.co',
    anonKey: 'sb_publishable_GZDBIJAXf8PUgdnHeoLJ6w_KceZrbrF'
};

