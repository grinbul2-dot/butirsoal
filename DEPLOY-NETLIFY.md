# Pemasangan v2.2.0

Ganti isi proyek pada repositori GitHub yang terhubung ke Netlify dengan seluruh isi ZIP (termasuk folder netlify, public, package-lock.json dan netlify.toml), lalu commit/push. Jangan memakai drag-and-drop folder public karena Functions memerlukan build proyek.

Pada Netlify → Project configuration → Environment variables, atur variabel untuk Functions/production:

| Variabel | Nilai |
| --- | --- |
| GEMINI_API_KEY | Key Gemini milik Anda |
| GEMINI_MODEL | gemini-3.6-flash |
| GEMINI_FALLBACK_MODEL | gemini-3.5-flash-lite |

Variabel GROQ tidak digunakan oleh alur aplikasi versi ini. Jangan memasukkan API key ke HTML atau GitHub. Pastikan model tersedia bagi akun Anda; jika tidak, isi nama model Gemini yang tersedia pada akun.

Build command: `npm test`; publish directory: `public`; functions directory: `netlify/functions`; Node 22 atau lebih baru. Dependency dipasang melalui package-lock.json. Pastikan paket Netlify mendukung Background Functions dan Blobs.

Setelah perubahan variabel, lakukan deploy ulang. Periksa footer v2.2.0, lalu uji parameter → soal → hasil → revisi (kembali sebagai siklus baru ke parameter), serta START FRESH. Percobaan analisis gagal harus tetap berada pada halaman soal.

Log tersedia di Netlify → Logs & Metrics → Functions, terutama jobs dan process-background. Paket ini belum diterapkan otomatis ke situs produksi.
