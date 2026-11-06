/**
 * Comments System - Terhubung dengan Backend API (/api/comments) & LocalStorage
 * Khusus untuk halaman Dashboard Utama.
 * 
 * Komentar yang dikirim akan tersimpan di server (comments.json) sehingga dapat
 * dibaca oleh siapapun yang membuka website ini dari HP, Laptop, atau Device lain!
 */

(function (window) {
    'use strict';

    // Helper: Escaping HTML untuk keamanan
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // Helper: Ambil nama pengunjung yang aktif
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

    // Helper: Generate Avatar Color
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
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    }

    // Format Waktu Sekarang
    function getFormattedTimestamp() {
        const now = new Date();
        const options = {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        };
        return now.toLocaleDateString('id-ID', options);
    }

    // Deteksi Endpoint Backend API yang tepat
    function getApiEndpoints() {
        const endpoints = [];
        // 1. Endpoint relatif (paling utama saat dibuka lewat server.py di device manapun)
        endpoints.push('/api/comments');
        
        // 2. Jika dibuka lewat Live Server (port 5500) atau file:///, fallback ke port 8000
        if (window.location.hostname) {
            endpoints.push(`http://${window.location.hostname}:8000/api/comments`);
        }
        endpoints.push('http://localhost:8000/api/comments');
        endpoints.push('http://127.0.0.1:8000/api/comments');
        
        return endpoints;
    }

    // Fetch dari API dengan fallback antar endpoint
    async function fetchApi(pathOptions, fetchOptions) {
        for (const url of pathOptions) {
            try {
                const res = await fetch(url, fetchOptions);
                if (res.ok) {
                    return await res.json();
                }
            } catch (err) {
                // Lanjut coba endpoint berikutnya
            }
        }
        return null;
    }

    // Inisialisasi Widget Komentar (Khusus Dashboard)
    function initComments(config) {
        const {
            containerId = 'dashboard-comments-container',
            storageKey = 'komentar_dashboard_utama',
            title = '💬 Buku Tamu & Komentar Pengunjung'
        } = config;

        const container = document.getElementById(containerId);
        if (!container) return;

        // Cegah inisialisasi ganda
        if (container.dataset.initialized === 'true') return;
        container.dataset.initialized = 'true';

        let activeUser = getActiveUserName();
        let comments = [];
        const apiUrls = getApiEndpoints();

        // 1. Muat awal dari localStorage agar instan tanpa loading
        try {
            const cached = localStorage.getItem(storageKey);
            if (cached) {
                comments = JSON.parse(cached);
            }
        } catch (e) {
            comments = [];
        }

        // Render struktur HTML form & list (Desain asli dipertahankan 100%)
        container.innerHTML = `
            <section class="comments-section">
                <!-- Header -->
                <div class="comments-header">
                    <div class="comments-title-wrap">
                        <span class="comments-icon">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </span>
                        <h2 class="comments-title">${escapeHtml(title)}</h2>
                    </div>
                    <span class="comments-counter" id="${containerId}-counter">${comments.length} Komentar</span>
                </div>

                <!-- Info Pengguna Aktif -->
                <div class="active-user-badge">
                    <div class="active-user-info">
                        <span class="active-user-dot"></span>
                        <span>Masuk sebagai: <strong class="active-user-name" id="${containerId}-active-name">${escapeHtml(activeUser)}</strong></span>
                    </div>
                    <span class="active-user-note">Tersimpan ke server &amp; dapat dilihat device lain</span>
                </div>

                <!-- Toast Notifikasi -->
                <div class="comment-toast" id="${containerId}-toast">
                    ✅ Komentar kamu berhasil disimpan ke server!
                </div>

                <!-- Form Tambah Komentar -->
                <form class="comment-form" id="${containerId}-form">
                    <div class="form-row">
                        <div class="form-field">
                            <label for="${containerId}-input-author">Nama Pengguna (Bisa Disesuaikan)</label>
                            <input type="text" id="${containerId}-input-author" value="${escapeHtml(activeUser)}" placeholder="Nama Anda..." required maxlength="40">
                        </div>
                        <div class="form-field">
                            <label for="${containerId}-select-tag">Kategori Komentar</label>
                            <select id="${containerId}-select-tag">
                                <option value="💬 Diskusi">💬 Diskusi</option>
                                <option value="⭐ Apresiasi / Kesan">⭐ Apresiasi / Kesan</option>
                                <option value="💡 Masukan & Saran">💡 Masukan & Saran</option>
                                <option value="❓ Pertanyaan">❓ Pertanyaan</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-field">
                        <label for="${containerId}-input-text">Tulis Komentar atau Pesan</label>
                        <textarea id="${containerId}-input-text" placeholder="Tinggalkan komentar, pesan hangat, atau pertanyaan..." required minlength="2" maxlength="500"></textarea>
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

                <!-- Daftar Komentar -->
                <div class="comments-list" id="${containerId}-list"></div>
            </section>
        `;

        const listEl = document.getElementById(`${containerId}-list`);
        const counterEl = document.getElementById(`${containerId}-counter`);
        const toastEl = document.getElementById(`${containerId}-toast`);
        const formEl = document.getElementById(`${containerId}-form`);
        const authorInput = document.getElementById(`${containerId}-input-author`);
        const textInput = document.getElementById(`${containerId}-input-text`);
        const tagSelect = document.getElementById(`${containerId}-select-tag`);
        const activeNameEl = document.getElementById(`${containerId}-active-name`);

        // Render List Komentar
        function renderCommentsList() {
            counterEl.textContent = `${comments.length} Komentar`;
            if (comments.length === 0) {
                listEl.innerHTML = `
                    <div class="empty-comments">
                        Belum ada komentar. Jadilah yang pertama meninggalkan pesan atau komentar!
                    </div>
                `;
                return;
            }

            let html = '';
            comments.forEach((item) => {
                const initial = item.author ? item.author.trim().charAt(0).toUpperCase() : '?';
                const bgGradient = getAvatarColor(item.author || 'User');
                html += `
                    <article class="comment-item" id="comment-${containerId}-${item.id}">
                        <div class="comment-avatar" style="background: ${bgGradient};">
                            ${escapeHtml(initial)}
                        </div>
                        <div class="comment-content">
                            <div class="comment-top">
                                <div class="comment-author-wrap">
                                    <span class="comment-author">${escapeHtml(item.author)}</span>
                                    <span class="comment-tag">${escapeHtml(item.tag || '💬 Komentar')}</span>
                                </div>
                                <div class="comment-meta">
                                    <span class="comment-time">${escapeHtml(item.time || '')}</span>
                                    <button type="button" class="btn-delete-comment" data-id="${item.id}" title="Hapus komentar ini">✕</button>
                                </div>
                            </div>
                            <p class="comment-text">${escapeHtml(item.text)}</p>
                        </div>
                    </article>
                `;
            });

            listEl.innerHTML = html;

            // Event Hapus Komentar
            listEl.querySelectorAll('.btn-delete-comment').forEach(btn => {
                btn.addEventListener('click', async function () {
                    const idToDelete = this.getAttribute('data-id');
                    if (confirm('Yakin ingin menghapus komentar ini?')) {
                        // 1. Hapus di UI & LocalStorage
                        comments = comments.filter(c => String(c.id) !== String(idToDelete));
                        localStorage.setItem(storageKey, JSON.stringify(comments));
                        renderCommentsList();

                        // 2. Hapus di Backend API
                        await fetchApi(apiUrls.map(u => `${u}?id=${idToDelete}`), {
                            method: 'DELETE'
                        });
                    }
                });
            });
        }

        renderCommentsList();

        // 2. Ambil data komentar terbaru dari Backend Server
        async function syncFromBackend() {
            const data = await fetchApi(apiUrls, { method: 'GET' });
            if (Array.isArray(data)) {
                comments = data;
                localStorage.setItem(storageKey, JSON.stringify(comments));
                renderCommentsList();
            }
        }

        // Sinkronisasi awal dari backend
        syncFromBackend();

        // Polling berkala (setiap 4 detik) agar jika ada orang lain di device berbeda kirim komen,
        // komen langsung muncul otomatis tanpa perlu refresh!
        const pollInterval = setInterval(syncFromBackend, 4000);

        // Sinkronisasi Storage Event untuk multi-tab
        window.addEventListener('storage', function (e) {
            if (e.key === storageKey) {
                try {
                    comments = JSON.parse(e.newValue || '[]');
                    renderCommentsList();
                } catch (err) {}
            }
        });

        // Submit Komentar Baru (Disimpan ke Backend API & LocalStorage)
        formEl.addEventListener('submit', async function (e) {
            e.preventDefault();

            const authorName = authorInput.value.trim() || activeUser || 'Pengunjung';
            const textContent = textInput.value.trim();
            const tagValue = tagSelect.value;

            if (!textContent) return;

            // Simpan nama pengunjung
            sessionStorage.setItem('namaPengunjung', authorName);
            activeUser = authorName;
            if (activeNameEl) activeNameEl.textContent = authorName;

            const newComment = {
                id: Date.now(),
                author: authorName,
                text: textContent,
                tag: tagValue,
                time: getFormattedTimestamp()
            };

            // Update lokal instan (Optimistic UI)
            comments.unshift(newComment);
            localStorage.setItem(storageKey, JSON.stringify(comments));
            renderCommentsList();

            // Reset input form
            textInput.value = '';

            // Tampilkan toast
            toastEl.style.display = 'block';
            setTimeout(() => {
                toastEl.style.display = 'none';
            }, 3500);

            // Simpan permanen ke Backend API
            const postResponse = await fetchApi(apiUrls, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newComment)
            });

            if (postResponse && Array.isArray(postResponse.comments)) {
                comments = postResponse.comments;
                localStorage.setItem(storageKey, JSON.stringify(comments));
                renderCommentsList();
            }
        });
    }

    // Auto-Init: Otomatis berjalan HANYA di Dashboard
    document.addEventListener('DOMContentLoaded', function () {
        if (document.getElementById('dashboard-comments-container')) {
            initComments({
                containerId: 'dashboard-comments-container',
                storageKey: 'komentar_dashboard_utama',
                title: '💬 Buku Tamu & Komentar Pengunjung'
            });
        }
    });

    window.BiodataComments = {
        init: initComments,
        getUserName: getActiveUserName
    };

})(window);
