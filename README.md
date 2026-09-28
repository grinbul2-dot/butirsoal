# Analisis Butir Soal — v2.0.0

Aplikasi guru Bahasa Inggris untuk menelaah satu butir soal berdasarkan tipe soal, jenis teks, Barrett, kisi-kisi, Bloom, CEFR dan grammar. Skor keseluruhan dihitung sebagai rata-rata tujuh kategori, bukan indeks kesukaran empiris. Tidak menggunakan kembali mesin rubrik 28 kriteria.

## Pembagian layanan

- **Gemini:** hanya membaca gambar JPG/PNG/WebP, termasuk kamera, menjadi teks. Tidak mendukung PDF atau Word.
- **Groq:** analisis, telaah, kunci jawaban dan revisi dari teks yang sudah dikonfirmasi pengguna. Model utama `openai/gpt-oss-120b`, cadangan `openai/gpt-oss-20b`.
- Input teks langsung tidak memanggil Gemini. Gangguan atau tidak adanya key Gemini tidak menghalangi analisis teks dengan Groq.
- API key tidak dapat saling menggantikan. Groq hanya menggunakan GROQ_API_KEY; Gemini hanya menggunakan GEMINI_API_KEY. Tidak ada fallback lintas penyedia.
- Groq memakai strict JSON schema. Validasi tujuh kategori, skor, kunci, dan revisi tetap dilakukan server. Ini menjaga format, bukan jaminan kebenaran klasifikasi pedagogis.
- Cache hasil versi lama tidak digunakan otomatis setelah migrasi; draf parameter dan soal tetap dipertahankan. Log admin mencatat provider/model untuk diagnosis; hasil telaah tidak menampilkan identitas model.

## Pemrosesan latar belakang

Versi sebelumnya membatasi seluruh panggilan layanan sampai 25 detik. Pada v2.0.0, browser mengirim pekerjaan ke `jobs`, server menyimpan pekerjaan di Netlify Blobs lalu memanggil `process-background`. Browser menerima status segera dan memeriksa hasil tiap 3 detik. Analisis, revisi dan pembacaan gambar memakai alur ini.

- Worker memiliki anggaran total 180 detik, maksimal 80 detik untuk satu panggilan, dengan sebagian waktu disisihkan untuk model cadangan. Timeout model utama langsung beralih ke cadangan.
- Retry transient tetap dibatasi dan memakai jeda 1, 2, 4 detik; kuota 429 pada model utama langsung mencoba model cadangan.
- Putusnya koneksi browser tidak membatalkan worker. Klik coba lagi akan memeriksa pekerjaan yang sama. Setelah proses benar-benar gagal, percobaan berikutnya membuat pekerjaan baru.
- Penguncian atomik mencegah panggilan worker ganda menjalankan analisis yang sama bersamaan.
- Halaman tidak menampilkan persentase kemajuan palsu atau nama model pada hasil telaah.
- Endpoint sinkron lama masih disertakan untuk kompatibilitas, dengan batas 25 detik; frontend v2.0.0 tidak memakainya untuk pemeriksaan.

## Alur pengguna

1. Parameter dan Kisi-kisi. Bisa simpan/gunakan template lokal.
2. Input stimulus dan pertanyaan/seluruh opsi, atau unggah gambar/kamera. Hasil pembacaan ditinjau dahulu sebelum diterapkan. Tombol Clear tersedia. Jika gambar gagal dibaca, tersedia tautan https://www.imagetotext.info/.
3. Ringkasan analisis, kunci jawaban, temuan utama dan rincian tujuh kategori. Klik **Buat Revisi Sesuai Parameter** bila perlu; kegagalan revisi tidak menghapus analisis. Revisi mempertimbangkan semua parameter termasuk menyesuaikan tuntutan bahasa dengan target CEFR tanpa mengarang fakta baru.

Hasil identik memakai cache perangkat. **Analisis Ulang** meminta pemeriksaan baru, kecuali ada pekerjaan identik yang belum selesai: pekerjaan tersebut dilanjutkan terlebih dahulu. **START NEW ANALYSIS** menghapus draf, hasil lokal dan penanda pekerjaan, tetapi mempertahankan template yang disimpan manual. Reset tidak membatalkan worker yang sudah berjalan di server.

## Penyimpanan

API key hanya berada di server. Gambar dikirim ke Google untuk ditranskripsikan; teks stimulus, soal, parameter dan konteks analisis dikirim ke Groq saat analisis/revisi dijalankan. Input dan hasil sementara disimpan di Netlify Blobs milik situs untuk menghubungkan worker dengan browser. Identitas pekerjaan menggunakan token acak 256 bit; token ini merupakan hak akses ke hasil dan tidak boleh dibagikan. Secret worker terpisah dan tidak dikirim ke browser.

Input/gambar dan secret worker dihapus dari catatan setelah pekerjaan selesai, baik berhasil maupun gagal. Hasil sementara tidak dapat diambil setelah 24 jam. Function terjadwal `cleanup-jobs` menghapus catatan berumur lebih dari 24 jam setiap hari (penyimpanan fisik bisa mendekati 48 jam bila pembersihan harian berjalan normal). Pekerjaan yang terhenti mendadak juga dibersihkan. Draf, hasil terakhir, template dan penanda pekerjaan disimpan lokal di browser; gambar tidak disimpan dalam localStorage.

## Deploy

Ikuti `DEPLOY-NETLIFY.md`. Unggah seluruh paket ke root repository GitHub yang sudah terhubung ke Netlify. Sertakan `package.json` dan `package-lock.json` agar dependency `@netlify/blobs` terpasang. Jangan drag-and-drop folder public saja.

Variabel Functions: `GROQ_API_KEY` wajib untuk analisis/revisi; `GEMINI_API_KEY` wajib untuk membaca gambar. Model dapat diatur melalui `GROQ_MODEL`, `GROQ_FALLBACK_MODEL`, `GEMINI_MODEL`, `GEMINI_FALLBACK_MODEL`. Lihat `.env.example`. Ketersediaan model, kuota dan paket hosting harus sesuai akun pengguna. Tidak ada API key dalam paket.

## Pengembangan lokal

Node.js 22 atau lebih baru:

```sh
npm ci
npm test
npm run dev
```

Jalankan dengan GROQ_API_KEY dan GEMINI_API_KEY melalui environment terminal. Server lokal memakai penyimpanan memori untuk simulasi antrian; hilang ketika server ditutup. Produksi memakai Netlify Blobs. Frontend tanpa dependency tambahan.

Tes memakai simulasi layanan dan penyimpanan; tidak membuktikan akurasi pedagogis atau keberhasilan akun produksi. Estimasi CEFR tetap perlu ditinjau guru. Referensi dasar tercantum di `REFERENSI.md` dan Panduan aplikasi.
