
(function () {
    // 1. Pulihkan halaman jika pengguna menekan tombol Back di browser
    window.addEventListener('pageshow', function (event) {
        document.body.classList.remove('is-leaving');
    });

    // 2. Intersepsi Navigasi Link untuk Transisi Halus (Page Transition)
    document.addEventListener('DOMContentLoaded', function () {
        // Deteksi semua link internal
        const links = document.querySelectorAll('a[href]');
        links.forEach(function (link) {
            link.addEventListener('click', function (e) {
                const href = link.getAttribute('href');

                // Lewati link eksternal, anchor kosong, target _blank, atau kombinasi tombol modifikasi
                if (
                    !href ||
                    href.startsWith('#') ||
                    href.startsWith('mailto:') ||
                    href.startsWith('tel:') ||
                    href.startsWith('http://') ||
                    href.startsWith('https://') ||
                    link.target === '_blank' ||
                    e.ctrlKey ||
                    e.metaKey ||
                    e.shiftKey ||
                    e.altKey
                ) {
                    return;
                }

                e.preventDefault();

                // Jika menuju dashboard.html dan kita punya nama tersimpan, teruskan nama
                let targetUrl = href;
                const savedName = sessionStorage.getItem('namaPengunjung');
                if (href === 'dashboard.html' && savedName && !href.includes('nama=')) {
                    targetUrl = 'dashboard.html?nama=' + encodeURIComponent(savedName);
                }

                // Berikan efek keluar (fade out / smooth slide)
                document.body.classList.add('is-leaving');

                setTimeout(function () {
                    window.location.href = targetUrl;
                }, 220);
            });
        });

        // 3. Khusus Halaman Login: Efek Animasi Tombol & Transisi Masuk Dashboard
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', function (e) {
                const btnSubmit = document.getElementById('btnMasuk');
                const namaInput = document.getElementById('nama');
                const customInput = document.getElementById('inputCustom1');

                if (namaInput && namaInput.value.trim() !== '') {
                    sessionStorage.setItem('namaPengunjung', namaInput.value.trim());
                }
                if (customInput && customInput.value.trim() !== '') {
                    sessionStorage.setItem('custom1Pengunjung', customInput.value.trim());
                }

                // Efek animasi pada tombol & form saat masuk
                if (btnSubmit) {
                    btnSubmit.innerHTML = '✨ Membuka Dashboard...';
                    btnSubmit.style.transform = 'scale(0.98)';
                    btnSubmit.style.opacity = '0.9';
                }

                // Haluskan transisi perpindahan halaman
                e.preventDefault();
                document.body.classList.add('is-leaving');

                setTimeout(function () {
                    loginForm.submit();
                }, 280);
            });
        }

        // 4. Khusus Halaman Dashboard: Tampilkan nama dari URL atau SessionStorage
        const namaPengunjungEl = document.getElementById('namaPengunjung');
        if (namaPengunjungEl) {
            const urlParams = new URLSearchParams(window.location.search);
            const namaDariUrl = urlParams.get('nama');
            const namaDariStorage = sessionStorage.getItem('namaPengunjung');

            if (namaDariUrl && namaDariUrl.trim() !== '') {
                namaPengunjungEl.textContent = namaDariUrl;
                sessionStorage.setItem('namaPengunjung', namaDariUrl.trim());
            } else if (namaDariStorage && namaDariStorage.trim() !== '') {
                namaPengunjungEl.textContent = namaDariStorage;
            }
        }
    });
})();
