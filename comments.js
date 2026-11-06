/**
 * Comments System - Antarmuka Komentar Berdasarkan Nama Pengguna
 * Terintegrasi dengan sessionStorage (nama pengunjung dari gerbang login)
 * dan localStorage (penyimpanan komentar permanen).
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

    // Inisialisasi Widget Komentar
    function initComments(config) {
        const {
            containerId,
            storageKey = 'biodata_general_comments',
            title = 'Kolom Komentar Pengunjung',
            defaultComments = []
        } = config;

        const container = document.getElementById(containerId);
        if (!container) return;

        let activeUser = getActiveUserName();

        // Muat komentar dari localStorage
        let comments = [];
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                comments = JSON.parse(saved);
            } else if (defaultComments && defaultComments.length > 0) {
                comments = defaultComments;
                localStorage.setItem(storageKey, JSON.stringify(comments));
            }
        } catch (e) {
            console.error('Gagal membaca komentar dari localStorage', e);
            comments = defaultComments || [];
        }

        // Render struktur HTML form & list
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
                    <span class="active-user-note">Komentar akan diposting sesuai nama kamu</span>
                </div>

                <!-- Toast Notifikasi -->
                <div class="comment-toast" id="${containerId}-toast">
                    Komentar kamu berhasil ditambahkan!
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
                                <option value="Diskusi"> Diskusi</option>
                                <option value="Apresiasi / Kesan"> Apresiasi / Kesan</option>
                                <option value="Masukan & Saran"> Masukan & Saran</option>
                                <option value="Pertanyaan"> Pertanyaan</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-field">
                        <label for="${containerId}-input-text">Tulis Komentar atau Pesan</label>
                        <textarea id="${containerId}-input-text" placeholder="Tinggalkan komentar, pesan hangat, atau pertanyaan seputar materi..." required minlength="2" maxlength="500"></textarea>
                    </div>

                    <div class="comment-submit-wrap">
                        <button type="submit" class="btn-comment-submit">
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

        // Render List
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
            comments.forEach((item, index) => {
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
                                    <span class="comment-time">${escapeHtml(item.time)}</span>
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
                btn.addEventListener('click', function () {
                    const idToDelete = this.getAttribute('data-id');
                    if (confirm('Yakin ingin menghapus komentar ini?')) {
                        comments = comments.filter(c => String(c.id) !== String(idToDelete));
                        try {
                            localStorage.setItem(storageKey, JSON.stringify(comments));
                        } catch (e) {
                            console.error(e);
                        }
                        renderCommentsList();
                    }
                });
            });
        }

        renderCommentsList();

        // Submit Komentar Baru
        formEl.addEventListener('submit', function (e) {
            e.preventDefault();

            const authorName = authorInput.value.trim() || activeUser || 'Pengunjung';
            const textContent = textInput.value.trim();
            const tagValue = tagSelect.value;

            if (!textContent) return;

            // Simpan nama baru jika diubah
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

            // Masukkan ke awal daftar
            comments.unshift(newComment);

            try {
                localStorage.setItem(storageKey, JSON.stringify(comments));
            } catch (err) {
                console.error('Gagal menyimpan komentar', err);
            }

            renderCommentsList();

            // Reset input text
            textInput.value = '';

            // Tampilkan toast
            toastEl.style.display = 'block';
            setTimeout(() => {
                toastEl.style.display = 'none';
            }, 3500);
        });
    }

    // Export ke window
    window.BiodataComments = {
        init: initComments,
        getUserName: getActiveUserName
    };

})(window);

