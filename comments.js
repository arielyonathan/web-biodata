/**
 * comments.js - Sistem Komentar Online Terintegrasi Supabase Database
 * Khusus Halaman Dashboard Utama.
 * 
 * Fitur:
 * - Menggunakan Supabase JS Client v2 (CDN)
 * - Tabel: 'comments' (id UUID, name, message, created_at)
 * - Pengambilan & pengiriman data murni online (Bukan LocalStorage)
 * - Row Level Security (RLS) compliant
 * - Proteksi XSS (textContent / DOM text escaping)
 * - Indikator Loading & Pesan Kesalahan Koneksi
 * - Mendukung Realtime Update antar perangkat
 */

(function (window) {
    'use strict';

    let supabaseClient = null;

    // Helper: Escaping HTML untuk keamanan
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Helper: Ambil nama pengunjung yang aktif (dari session login atau URL)
    function getActiveUserName() {
        const urlParams = new URLSearchParams(window.location.search);
        const nameFromUrl = urlParams.get('nama');
        const nameFromStorage = sessionStorage.getItem('namaPengunjung');

        if (nameFromUrl && nameFromUrl.trim() !== '') {
            sessionStorage.setItem('namaPengunjung', nameFromUrl.trim());
            return nameFromUrl.trim();
        }
        if (nameFromStorage && nameFromStorage.trim() !== '') {
            return nameFromStorage.trim();
        }
        return 'Pengunjung';
    }

    // Helper: Generate Avatar Gradient dari nama
    function getAvatarColor(name) {
        const colors = [
            'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            'linear-gradient(135deg, #10b981, #047857)',
            'linear-gradient(135deg, #8b5cf6, #6d28d9)',
            'linear-gradient(135deg, #f59e0b, #b45309)',
            'linear-gradient(135deg, #ec4899, #be185d)',
            'linear-gradient(135deg, #64748b, #334155)',
            'linear-gradient(135deg, #06b6d4, #0e7490)'
        ];
        let hash = 0;
        const str = name || 'User';
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    // Helper: Format Waktu Supabase ke Standar Indonesia
    function formatCommentDate(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            return date.toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    }

    // Helper: Dapatkan Kredensial Supabase (dari supabase-config.js atau /api/config di Vercel)
    async function resolveSupabaseCredentials() {
        // 1. Cek dari window.SUPABASE_CONFIG (file supabase-config.js)
        if (window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url && window.SUPABASE_CONFIG.anonKey) {
            return {
                url: window.SUPABASE_CONFIG.url.trim(),
                anonKey: window.SUPABASE_CONFIG.anonKey.trim()
            };
        }

        // 2. Cek dari Vercel Serverless Function (/api/config)
        try {
            const res = await fetch('/api/config');
            if (res.ok) {
                const data = await res.json();
                if (data.url && data.anonKey) {
                    return {
                        url: data.url.trim(),
                        anonKey: data.anonKey.trim()
                    };
                }
            }
        } catch (e) {
            // Bukan di environment Vercel atau fetch gagal
        }

        return null;
    }

    // Inisialisasi Widget Komentar Online
    async function initComments(config = {}) {
        const {
            containerId = 'dashboard-comments-container',
            title = '💬 Buku Tamu & Komentar Pengunjung'
        } = config;

        const container = document.getElementById(containerId);
        if (!container) return;

        if (container.dataset.initialized === 'true') return;
        container.dataset.initialized = 'true';

        let activeUser = getActiveUserName();
        let commentsList = [];

        // Render struktur utama kolom komentar
        container.innerHTML = `
            <section class="comments-section">
                <!-- Header Komentar -->
                <div class="comments-header">
                    <div class="comments-title-wrap">
                        <span class="comments-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </span>
                        <h2 class="comments-title">${escapeHtml(title)}</h2>
                    </div>
                    <span class="comments-counter" id="${containerId}-counter">Memuat...</span>
                </div>

                <!-- Info Pengguna Aktif & Status Database -->
                <div class="active-user-badge">
                    <div class="active-user-info">
                        <span class="active-user-dot" id="${containerId}-status-dot"></span>
                        <span>Masuk sebagai: <strong class="active-user-name" id="${containerId}-active-name">${escapeHtml(activeUser)}</strong></span>
                    </div>
                    <span class="active-user-note" id="${containerId}-status-text">Terhubung ke Database Online Supabase</span>
                </div>

                <!-- Alert Kesalahan Global (jika ada) -->
                <div class="comment-error-alert" id="${containerId}-error-alert" style="display: none;"></div>

                <!-- Toast Notifikasi (Sukses / Error) -->
                <div class="comment-toast" id="${containerId}-toast"></div>

                <!-- Formulir Tambah Komentar -->
                <form class="comment-form" id="${containerId}-form">
                    <div class="form-row">
                        <div class="form-field">
                            <label for="${containerId}-input-name">Nama Pengunjung (Maks. 50 Karakter)</label>
                            <input type="text" id="${containerId}-input-name" value="${escapeHtml(activeUser)}" placeholder="Nama Anda..." required maxlength="50">
                        </div>
                    </div>

                    <div class="form-field">
                        <label for="${containerId}-input-message">Isi Pesan / Komentar (Maks. 500 Karakter)</label>
                        <textarea id="${containerId}-input-message" placeholder="Tinggalkan pesan hangat, kesan, atau komentar kamu di sini..." required minlength="2" maxlength="500"></textarea>
                        <div class="char-counter" id="${containerId}-char-counter">0 / 500</div>
                    </div>

                    <div class="comment-submit-wrap">
                        <button type="submit" class="btn-comment-submit" id="${containerId}-btn-submit">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                            Kirim Komentar
                        </button>
                    </div>
                </form>

                <!-- Daftar Komentar (Akan dirender dinamis) -->
                <div class="comments-list" id="${containerId}-list">
                    <div class="comments-loading">
                        <div class="spinner"></div>
                        <span>Menghubungkan ke Supabase Database...</span>
                    </div>
                </div>
            </section>
        `;

        const listEl = document.getElementById(`${containerId}-list`);
        const counterEl = document.getElementById(`${containerId}-counter`);
        const toastEl = document.getElementById(`${containerId}-toast`);
        const errorAlertEl = document.getElementById(`${containerId}-error-alert`);
        const formEl = document.getElementById(`${containerId}-form`);
        const nameInput = document.getElementById(`${containerId}-input-name`);
        const messageInput = document.getElementById(`${containerId}-input-message`);
        const charCounter = document.getElementById(`${containerId}-char-counter`);
        const submitBtn = document.getElementById(`${containerId}-btn-submit`);
        const statusDot = document.getElementById(`${containerId}-status-dot`);
        const statusText = document.getElementById(`${containerId}-status-text`);

        // Event listener penghitung karakter pesan
        messageInput.addEventListener('input', function () {
            charCounter.textContent = `${this.value.length} / 500`;
        });

        // Helper Toast Notifikasi
        function showToast(message, type = 'success') {
            toastEl.textContent = message;
            toastEl.className = `comment-toast ${type}`;
            toastEl.style.display = 'block';
            setTimeout(() => {
                toastEl.style.display = 'none';
            }, 4000);
        }

        // Helper Alert Kesalahan
        function showError(message) {
            errorAlertEl.textContent = `⚠️ ${message}`;
            errorAlertEl.style.display = 'flex';
        }

        function hideError() {
            errorAlertEl.style.display = 'none';
        }

        // Inisialisasi Supabase Client
        const creds = await resolveSupabaseCredentials();

        if (!creds || !creds.url || !creds.anonKey) {
            statusDot.style.backgroundColor = '#ef4444';
            statusDot.style.boxShadow = '0 0 8px #ef4444';
            statusText.textContent = 'Kredensial Supabase Belum Dikonfigurasi';
            listEl.innerHTML = `
                <div class="comment-error-alert" style="display: flex;">
                    <div>
                        <strong>⚠️ Konfigurasi Supabase Belum Lengkap</strong><br>
                        Silakan masukkan <code>SUPABASE_URL</code> dan <code>SUPABASE_ANON_KEY</code> di:
                        <ul style="margin: 8px 0 0 20px; font-size: 13px;">
                            <li><strong>Vercel Dashboard:</strong> Project Settings &rarr; Environment Variables</li>
                            <li><strong>Atau File Lokal:</strong> <code>supabase-config.js</code></li>
                        </ul>
                    </div>
                </div>
            `;
            counterEl.textContent = '0 Komentar';
            return;
        }

        if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
            showError('Pustaka Supabase JS belum termuat. Pastikan terhubung ke internet.');
            listEl.innerHTML = `
                <div class="empty-comments">
                    Gagal memuat pustaka Supabase. Periksa koneksi internet Anda.
                </div>
            `;
            return;
        }

        // Buat Client Supabase Resmi
        try {
            supabaseClient = window.supabase.createClient(creds.url, creds.anonKey);
        } catch (err) {
            showError(`Gagal membuat Supabase client: ${err.message}`);
            return;
        }

        // Render Daftar Komentar ke DOM (XSS-Safe menggunakan textContent)
        function renderComments(comments) {
            counterEl.textContent = `${comments.length} Komentar`;

            if (comments.length === 0) {
                listEl.innerHTML = `
                    <div class="empty-comments">
                        Belum ada komentar di database. Jadilah yang pertama meninggalkan pesan!
                    </div>
                `;
                return;
            }

            listEl.innerHTML = '';

            comments.forEach((item) => {
                const article = document.createElement('article');
                article.className = 'comment-item';
                article.id = `comment-${item.id}`;

                // Avatar
                const avatar = document.createElement('div');
                avatar.className = 'comment-avatar';
                avatar.style.background = getAvatarColor(item.name);
                const initial = item.name ? item.name.trim().charAt(0).toUpperCase() : '?';
                avatar.textContent = initial;

                // Konten
                const contentDiv = document.createElement('div');
                contentDiv.className = 'comment-content';

                // Baris Atas (Nama & Tanggal)
                const topDiv = document.createElement('div');
                topDiv.className = 'comment-top';

                const authorWrap = document.createElement('div');
                authorWrap.className = 'comment-author-wrap';

                const authorSpan = document.createElement('span');
                authorSpan.className = 'comment-author';
                authorSpan.textContent = item.name || 'Pengunjung'; // 100% XSS Safe

                authorWrap.appendChild(authorSpan);

                const metaDiv = document.createElement('div');
                metaDiv.className = 'comment-meta';

                const timeSpan = document.createElement('span');
                timeSpan.className = 'comment-time';
                timeSpan.textContent = formatCommentDate(item.created_at);

                metaDiv.appendChild(timeSpan);
                topDiv.appendChild(authorWrap);
                topDiv.appendChild(metaDiv);

                // Teks Komentar
                const messageP = document.createElement('p');
                messageP.className = 'comment-text';
                messageP.textContent = item.message; // 100% XSS Safe

                contentDiv.appendChild(topDiv);
                contentDiv.appendChild(messageP);

                article.appendChild(avatar);
                article.appendChild(contentDiv);

                listEl.appendChild(article);
            });
        }

        // Mengambil Komentar dari Database Supabase (SELECT)
        async function fetchComments() {
            hideError();
            listEl.innerHTML = `
                <div class="comments-loading">
                    <div class="spinner"></div>
                    <span>Mengambil komentar dari database online...</span>
                </div>
            `;

            try {
                const { data, error } = await supabaseClient
                    .from('comments')
                    .select('id, name, message, created_at')
                    .order('created_at', { ascending: false });

                if (error) {
                    throw error;
                }

                commentsList = data || [];
                renderComments(commentsList);
            } catch (err) {
                console.error('Error fetching comments from Supabase:', err);
                showError(`Gagal mengambil komentar dari database: ${err.message || 'Periksa koneksi atau izin tabel'}`);
                listEl.innerHTML = `
                    <div class="empty-comments">
                        Gagal memuat komentar. Pastikan tabel <strong>comments</strong> dan kebijakan RLS sudah dibuat di Supabase.
                    </div>
                `;
            }
        }

        // Jalankan fetch pertama kali
        await fetchComments();

        // Aktifkan Realtime Listener (Jika fitur Realtime diaktifkan di Supabase)
        try {
            supabaseClient
                .channel('public:comments')
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'comments' },
                    (payload) => {
                        const newComment = payload.new;
                        if (newComment && !commentsList.some(c => c.id === newComment.id)) {
                            commentsList.unshift(newComment);
                            renderComments(commentsList);
                        }
                    }
                )
                .subscribe();
        } catch (e) {
            // Realtime opsional
        }

        // Handler Submit Komentar Baru (INSERT ke Supabase)
        formEl.addEventListener('submit', async function (e) {
            e.preventDefault();

            const nameValue = nameInput.value.trim();
            const messageValue = messageInput.value.trim();

            // Validasi Input Frontend
            if (!nameValue) {
                showToast('Nama pengunjung tidak boleh kosong.', 'error');
                nameInput.focus();
                return;
            }
            if (nameValue.length > 50) {
                showToast('Nama pengunjung maksimal 50 karakter.', 'error');
                nameInput.focus();
                return;
            }
            if (!messageValue || messageValue.length < 2) {
                showToast('Isi pesan komentar minimal 2 karakter.', 'error');
                messageInput.focus();
                return;
            }
            if (messageValue.length > 500) {
                showToast('Isi pesan komentar maksimal 500 karakter.', 'error');
                messageInput.focus();
                return;
            }

            // Simpan nama pengunjung ke sessionStorage untuk kenyamanan sesi berikutnya
            sessionStorage.setItem('namaPengunjung', nameValue);

            // Indikator Loading Pengiriman
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <span class="spinner-small"></span>
                <span>Mengirim ke Database...</span>
            `;

            try {
                const { data, error } = await supabaseClient
                    .from('comments')
                    .insert([
                        {
                            name: nameValue,
                            message: messageValue
                        }
                    ])
                    .select();

                if (error) {
                    throw error;
                }

                showToast('✅ Komentar berhasil dikirim dan tersimpan di database online!', 'success');

                // Reset isi form
                messageInput.value = '';
                charCounter.textContent = '0 / 500';

                // Tambahkan langsung ke list jika realtime belum sempat merespons
                if (data && data.length > 0) {
                    const insertedItem = data[0];
                    if (!commentsList.some(c => c.id === insertedItem.id)) {
                        commentsList.unshift(insertedItem);
                        renderComments(commentsList);
                    }
                } else {
                    // Refetch manual
                    await fetchComments();
                }

            } catch (err) {
                console.error('Error inserting comment to Supabase:', err);
                showToast(`❌ Gagal mengirim komentar: ${err.message || 'Periksa izin RLS Supabase'}`, 'error');
            } finally {
                // Pulihkan tombol submit
                submitBtn.disabled = false;
                submitBtn.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                    Kirim Komentar
                `;
            }
        });
    }

    // Auto-Init: Otomatis aktif saat DOM Dashboard selesai dimuat
    document.addEventListener('DOMContentLoaded', function () {
        if (document.getElementById('dashboard-comments-container')) {
            initComments({
                containerId: 'dashboard-comments-container',
                title: '💬 Buku Tamu & Komentar Pengunjung'
            });
        }
    });

    window.BiodataComments = {
        init: initComments,
        getUserName: getActiveUserName
    };

})(window);
