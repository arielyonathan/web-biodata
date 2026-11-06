/**
 * Comments System - Antarmuka Komentar Berdasarkan Nama Pengguna
 * Terintegrasi dengan sessionStorage (nama pengunjung dari gerbang login)
 * dan localStorage (penyimpanan komentar permanen).
 * 
 * Versi Real Storage (Tanpa data dummy/palsu).
 * Komentar yang dikirim oleh pengunjung pertama akan tersimpan dan
 * dapat dibaca oleh pengunjung berikutnya.
 */

(function (window) {
    'use strict';

    // Daftar nama author dummy terdahulu untuk pembersihan otomatis di localStorage
    const DUMMY_AUTHORS = [
        'Kevin Alvaro', 'Siti Nurhaliza', 'Budi Santoso', 'Dina Rahmawati',
        'Fajar Pratama', 'Clara Sitorus', 'Andi Wijaya', 'Rizky Kurniawan'
    ];
    const DUMMY_IDS = [1, 2, 101, 102, 201, 202, 301, 302];

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

        // Cegah inisialisasi ganda pada container yang sama
        if (container.dataset.initialized === 'true') return;
        container.dataset.initialized = 'true';

        let activeUser = getActiveUserName();

        // Muat komentar murni dari localStorage (tanpa dummy)
        let comments = [];
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Bersihkan komentar dummy masa lalu jika masih ada di browser pengguna
                comments = parsed.filter(item => {
                    if (DUMMY_IDS.includes(Number(item.id))) return false;
                    if (DUMMY_AUTHORS.includes(item.author)) return false;
                    return true;
                });
                // Simpan kembali data yang sudah bersih
                localStorage.setItem(storageKey, JSON.stringify(comments));
            } else if (defaultComments && defaultComments.length > 0) {
                // Jika sengaja diberikan defaultComments non-dummy
                comments = defaultComments;
                localStorage.setItem(storageKey, JSON.stringify(comments));
            }
        } catch (e) {
            console.error('Gagal membaca komentar dari localStorage', e);
            comments = [];
        }

        // Render struktur HTML form & list (desain tetap sama)
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
                    ✅ Komentar kamu berhasil ditambahkan dan disimpan!
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

            // Event Hapus Komentar (berguna jika ingin menghapus komentar saat pengetesan)
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

        // Sinkronisasi Antar-Tab (Real-time storage event)
        // Jika orang pertama kirim komentar di Tab 1, orang kedua di Tab 2 langsung melihatnya
        window.addEventListener('storage', function (e) {
            if (e.key === storageKey) {
                try {
                    comments = JSON.parse(e.newValue || '[]');
                    renderCommentsList();
                } catch (err) {
                    console.error('Gagal menyinkronkan komentar', err);
                }
            }
        });

        // Submit Komentar Baru (Tersimpan Permanen di localStorage)
        formEl.addEventListener('submit', function (e) {
            e.preventDefault();

            const authorName = authorInput.value.trim() || activeUser || 'Pengunjung';
            const textContent = textInput.value.trim();
            const tagValue = tagSelect.value;

            if (!textContent) return;

            // Simpan nama baru jika pengunjung mengubah nama di formulir
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

            // Masukkan ke urutan paling atas
            comments.unshift(newComment);

            // Simpan ke localStorage agar permanen bagi siapa saja yang membuka halaman ini
            try {
                localStorage.setItem(storageKey, JSON.stringify(comments));
            } catch (err) {
                console.error('Gagal menyimpan komentar ke localStorage', err);
            }

            renderCommentsList();

            // Reset input teks
            textInput.value = '';

            // Tampilkan notifikasi berhasil
            toastEl.style.display = 'block';
            setTimeout(() => {
                toastEl.style.display = 'none';
            }, 3500);
        });
    }

    // Auto-Init: Otomatis mendeteksi container komentar pada halaman tanpa perlu script tambahan di tiap file
    document.addEventListener('DOMContentLoaded', function () {
        // 1. Dashboard Utama
        if (document.getElementById('dashboard-comments-container')) {
            initComments({
                containerId: 'dashboard-comments-container',
                storageKey: 'komentar_dashboard_utama',
                title: '💬 Buku Tamu & Komentar Pengunjung'
            });
        }

        // 2. Arsip Partisi
        if (document.getElementById('arsip-comments-container')) {
            initComments({
                containerId: 'arsip-comments-container',
                storageKey: 'komentar_arsip_partisi',
                title: '💬 Komentar & Tanggapan Arsip Partisi'
            });
        }

        // 3. Materi Partisi 1
        if (document.getElementById('materi1-comments-container')) {
            initComments({
                containerId: 'materi1-comments-container',
                storageKey: 'komentar_materi_partisi_1',
                title: '💬 Komentar & Diskusi Materi Partisi 1'
            });
        }

        // 4. Materi Partisi 2 (Atau materi1 yang menggunakan id materi2)
        if (document.getElementById('materi2-comments-container')) {
            const isMateri1 = window.location.pathname.includes('materi-partisi-1');
            initComments({
                containerId: 'materi2-comments-container',
                storageKey: isMateri1 ? 'komentar_materi_partisi_1' : 'komentar_materi_partisi_2',
                title: isMateri1 ? '💬 Komentar & Diskusi Materi Partisi 1' : '💬 Komentar & Diskusi Materi Partisi 2'
            });
        }
    });

    // Ekspor API
    window.BiodataComments = {
        init: initComments,
        getUserName: getActiveUserName
    };

})(window);
