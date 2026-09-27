# Analisis Butir Soal

Aplikasi untuk guru Bahasa Inggris: satu butir soal dibandingkan dengan kisi-kisi melalui Gemini API. Antarmuka Bahasa Indonesia, revisi soal Bahasa Inggris.

## Status paket

Implementasi frontend, Netlify Function, rubrik, dan tes kontrak sudah tersedia. Paket ini belum diterbitkan ke akun Netlify pengguna. Pengujian Gemini langsung memerlukan API key yang valid dan kuota model pada akun pengguna. Tidak ada API key di dalam paket.

## Pembaruan v1.7.0 — kembali ke analisis sebelum rubrik tambahan

Atas permintaan pengguna, penilaian 28 kriteria, level 0–4, pemeriksaan kecocokan kutipan, pembatasan label otomatis, dan halaman rubrik tambahan dihapus. Format hasil kembali ke tujuh skor langsung, label, alasan, kunci dan revisi opsional seperti sebelum v1.6.0. Referensi dasar Barrett, Bloom dan CEFR tetap digunakan karena merupakan bagian dari fungsi awal aplikasi.

Revisi hanya diminta ketika label keseluruhan bukan Sangat Sesuai. Tidak lagi ada kewajiban menghasilkan 28 rincian penilaian dan menyalin revisi untuk soal yang sudah sangat sesuai.

Alur tiga halaman, START NEW ANALYSIS, Clear, gambar/kamera, tautan OCR alternatif, dan tampilan v1.5 tetap dipertahankan. Pengiriman JSON utuh, budget 25 detik, serta fallback langsung saat 429 juga dipertahankan agar masalah teknis lama tidak dikembalikan. Ini rollback lapisan rubrik, bukan seluruh perbaikan teknis.

Saat memperbarui GitHub, hapus juga public/rubrik.html dan scripts/export-rubric.mjs dari repository lama. Keduanya tidak disertakan lagi dalam paket. Kuota layanan dan durasi pemrosesan tetap dapat menyebabkan kegagalan; keberhasilan produksi belum diverifikasi.

## Pembaruan v1.5.0

- Tampilan minimalis dengan biru muda, ungu, putih, dan teks gelap; tetap tiga halaman dan responsif.
- Tombol Clear di Teks 1, Teks 2, serta kolom pertanyaan/opsi menghapus hanya kolom terkait, memperbarui hitungan kata dan draf, serta membatalkan hasil telaah lama.
- Jika gambar gagal disiapkan/dibaca, tampil tautan https://www.imagetotext.info/ beserta petunjuk menyalin hasil ke kolom soal. Situs terbuka pada tab baru; aplikasi tidak mengirim gambar ke situs itu secara otomatis.

## Pembaruan v1.4.0

Aplikasi memiliki tiga halaman tampilan terpisah dalam satu aplikasi:
1. Parameter dan kisi-kisi.
2. Input teks, unggah gambar/kamera, dan butir soal.
3. Progres analisis, pesan kegagalan bila ada, serta hasil analisis dan telaah.

Tombol **START NEW ANALYSIS** di halaman 3 menghapus semua parameter, kisi-kisi, teks, gambar, hasil pembacaan, hasil telaah, dan draf lokal aplikasi. Aplikasi kembali ke halaman 1 kosong. Tombol dinonaktifkan saat proses masih berjalan. Tombol Kembali ke Butir Soal memungkinkan koreksi tanpa menghapus isian. Halaman telaah dapat dibuka kembali melalui navigasi selama isian belum diubah.

## Pembaruan v1.3.0

- Analisis dan pembacaan gambar menggunakan retry gangguan sementara (429, 408, 5xx, jaringan, hasil tidak lengkap) maksimal tiga kali per model, dengan jeda 1 → 2 → 4 detik. Header Retry-After dihormati jika meminta jeda lebih panjang.
- Setelah layanan utama gagal atau model tidak ditemukan, otomatis beralih ke model cadangan. Default `GEMINI_FALLBACK_MODEL=gemini-3.5-flash-lite`; dapat diganti lewat environment Netlify.
- Budget total 54 detik; fase utama maksimal 32 detik agar tersedia waktu untuk cadangan. Retry bisa dihentikan lebih awal jika budget tidak mencukupi. Model utama dan cadangan yang sama tidak dipanggil sebagai dua fase terpisah.
- Pesan progres dikirim melalui streaming NDJSON pada Functions v2, bukan hanya animasi waktu. Identitas model tidak ditampilkan kepada pengguna.
- Input tidak valid, konfigurasi/key salah, pembatasan keamanan, output terpotong karena panjang, serta gambar yang ditolak tidak dicoba ulang otomatis.
- Browser tidak mengulangi seluruh request; server yang mengelola retry agar tidak terjadi penggandaan percobaan. Percobaan tambahan dapat memakai kuota/biaya tambahan. Fallback tidak menjamin berhasil jika kuota akun habis atau kedua layanan terganggu.
- Kedua model memakai rubrik, schema, dan validasi hasil yang sama. Tidak ada skor atau transkripsi buatan sebagai pengganti kegagalan.

Dokumentasi kompatibilitas: [Netlify streaming Functions](https://docs.netlify.com/build/functions/api/) dan [Gemini 3.5 Flash-Lite](https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash-lite). Akses model pada API key pengguna tetap harus diuji.

## Pembaruan v1.2.0

- Hasil telaah tidak lagi menampilkan label AI, nama model/penyedia, atau footer metadata.
- Kunci jawaban dan alasan untuk soal asli; kunci terpisah untuk revisi jika tersedia. Soal ambigu atau kurang informasi tidak dipaksa memiliki jawaban tunggal.
- Unggah JPG/PNG/WebP atau ambil foto dari kamera perangkat, sampai tiga gambar berurutan untuk satu soal.
- Foto diperiksa dan ditranskripsikan melalui function `read-image`. Keterbacaan dan kesesuaian diperiksa sebelum teks digunakan. File tidak layak mendapat pesan “File tidak didukung karena …” beserta alasan.
- Hasil pembacaan ditinjau terlebih dahulu, lalu tombol “Gunakan Hasil Pembacaan” mengisi stimulus dan pertanyaan. Isian lama tidak ditimpa ketika pembacaan gagal.

Deploy ulang **seluruh paket termasuk kedua Functions** (`analyze` dan `read-image`). Environment key yang sama melayani analisis dan pembacaan gambar. Tidak perlu kunci tambahan.

### Penggunaan gambar/kamera

Pada langkah Butir Soal: pilih Unggah Gambar atau Ambil Foto / Kamera, tambahkan foto yang saling melengkapi satu soal, tekan Baca Gambar, tinjau hasilnya, lalu Gunakan Hasil Pembacaan. Setelah memastikan teks benar, tekan Analisis Soal.

Batas per file asli 10 MB; aplikasi menyiapkan JPEG maksimal sekitar 1 MB per gambar (sisi terpanjang maksimal 2.600 piksel), sampai 3 gambar. Format HEIC, PDF dan SVG tidak diterima; simpan sebagai JPG/PNG/WebP dahulu. Foto tidak disimpan dalam draf lokal; hasil teks disimpan sesudah digunakan. Pemanggilan pembacaan menggunakan kuota layanan tersendiri sebelum analisis.

Ambil Foto memakai pilihan kamera native (`capture=environment`) pada browser/perangkat yang mendukung. Di desktop atau perangkat tanpa dukungan capture, browser dapat membuka pemilih file. Kamera fisik belum diuji dalam lingkungan pengerjaan.

Foto wajib mencakup satu soal dan stimulus yang dirujuk. Gambar blur, silau, terlalu kecil, terpotong, bukan soal Bahasa Inggris, atau berisi banyak butir tanpa satu pilihan jelas ditolak. Diagram/ilustrasi esensial yang tidak bisa ditranskripsikan setia ke teks juga ditolak dengan alasan. Penilaian keterbacaan bersifat model-based, bukan jaminan bebas kesalahan; pengguna meninjau hasil sebelum menerapkannya.

## Pembaruan v1.1.0

KD/Indikator dan Deskripsi/Ruang Lingkup digabung menjadi satu kolom **Kisi-kisi** untuk diketik atau di-copy paste (maksimal 12.000 karakter). Penilaian menjadi tujuh kategori berbobot sama. Draf lama otomatis menggabungkan isi kedua kolom ke Kisi-kisi ketika dibuka di versi baru.

## Yang sudah dibuat

- Tiga halaman: Parameter & Kisi-kisi, Butir Soal, serta Analisis & Telaah.
- Tipe soal berupa teks bebas; mendukung PG, PG kompleks/kategori, isian, matching, uraian, dan tipe lain melalui instruksi AI.
- Enam parameter kisi-kisi wajib, kelas 1–12 opsional, 1 atau 2 stimulus.
- Jumlah kata informatif; tidak menjadi skor tersendiri.
- Tujuh kategori berbobot sama, skor 1–100 dan label diberikan langsung dalam hasil analisis.
- Skor keseluruhan dihitung di backend sebagai rata-rata tepat tujuh skor.
- Rubrik Barrett dan Bloom revisi terpisah, disertakan di setiap permintaan AI.
- Analisis grammar untuk stimulus, stem, options dan instruksi.
- Bukti, kategori teridentifikasi, ketidaksesuaian, serta arah perbaikan.
- Revisi hanya jika label keseluruhan bukan “Sangat Sesuai”; satu paket lengkap dengan jumlah stimulus yang sama.
- Perbandingan asli/revisi dengan sorotan perubahan kata. Pada rentang perubahan sangat besar, sorotan dikelompokkan agar HP tetap responsif.
- Draf lokal otomatis; tidak ada database/histori server.
- Penanganan kuota, respons tidak lengkap, waktu tunggu, dan kegagalan koneksi.
- Tidak ada ikon, framework, build frontend, atau ketergantungan CDN. Font menggunakan font perangkat dengan fallback Georgia/Arial.

## Pemasangan ke Netlify — melalui Git

1. Ekstrak ZIP. Folder proyek yang benar berisi `netlify.toml`, `package.json`, `public/`, dan `netlify/`.
2. Unggah seluruh isi proyek ke repository Git milik Anda. Jangan unggah `.env` yang berisi kunci.
3. Di Netlify, pilih penambahan proyek dengan mengimpor repository tersebut.
4. Gunakan konfigurasi:
   - Base directory: kosong, jika file proyek berada di root repository.
   - Build command: `npm test`; frontend tidak memerlukan kompilasi.
   - Publish directory: `public`.
   - Functions directory: `netlify/functions` (sudah diatur dalam `netlify.toml`).
   - Jika proyek berada di subfolder repository, jadikan subfolder itu sebagai Base directory.
5. Di pengaturan environment variables proyek Netlify, tambahkan:

   | Nama | Nilai | Cakupan |
   |---|---|---|
   | `GEMINI_API_KEY` | API key dari Google AI Studio | Functions / semua cakupan yang mencakup Functions |
   | `GEMINI_MODEL` | `gemini-3.5-flash` | Functions / semua cakupan yang mencakup Functions |
   | `GEMINI_FALLBACK_MODEL` | `gemini-3.5-flash-lite` (opsional) | Functions / semua cakupan yang mencakup Functions |

   Model dapat diganti melalui variabel `GEMINI_MODEL` tanpa mengubah frontend. Pastikan model yang dipilih mendukung generateContent dan structured JSON output. Default yang diverifikasi pada pengerjaan adalah Gemini 3.5 Flash; bukan jaminan akses/kuota pada setiap akun.
6. Lakukan deploy. Setelah mengubah environment variables, deploy ulang agar function menggunakan konfigurasi baru.
7. Buka URL Netlify dan jalankan contoh pada `CONTOH-UJI.md`.

**Jangan hanya menyeret folder `public` ke Netlify Drop.** Itu hanya menerbitkan frontend; backend Functions juga harus dipaketkan melalui alur Git atau Netlify CLI.

## Alternatif — Netlify CLI

Pada komputer dengan Node.js 22 atau lebih baru, buka terminal di folder proyek:

```sh
npx netlify-cli login
npx netlify-cli init
```

Pasang `GEMINI_API_KEY` melalui pengaturan environment variables Netlify, lalu:

```sh
npx netlify-cli deploy --prod --dir=public --functions=netlify/functions
```

Tidak perlu menuliskan kunci di perintah terminal atau di HTML. Sumber resmi: https://docs.netlify.com/api-and-cli-guides/cli-guides/get-started-with-cli/

## Pratinjau lokal

Tanpa API key, form dapat dibuka dan dicoba; tombol Analisis akan memberi pesan konfigurasi yang jelas.

```sh
npm run dev
```

Buka http://localhost:8787 . Untuk mencoba analisis langsung, buat `.env` lokal berdasarkan `.env.example`, isi kunci secara privat, lalu jalankan:

```sh
node --env-file=.env dev-server.mjs
```

File `.env` diabaikan oleh Git. Jangan memasukkannya ke ZIP yang dibagikan. Membuka `public/index.html` dengan klik ganda hanya menampilkan antarmuka; API membutuhkan server.

## Struktur

| File | Fungsi |
|---|---|
| `public/index.html` | Seluruh UI, CSS, dan JavaScript frontend |
| `netlify/functions/read-image.mjs` | Validasi gambar, pemeriksaan keterbacaan dan transkripsi |
| `netlify/functions/analyze.mjs` | Proxy Gemini; kunci dibaca di server |
| `netlify/functions/lib/rubrics.mjs` | Rubrik Barrett/Bloom dan instruksi analisis |
| `netlify/functions/lib/contract.mjs` | JSON schema dan validasi input/output |
| `netlify.toml` | Direktori deploy dan header keamanan |
| `dev-server.mjs` | Server pratinjau lokal tanpa dependency |
| `tests/analysis.test.mjs` | Pengujian kontrak dan proxy menggunakan respons simulasi |
| `CONTOH-UJI.md` | Skenario penerimaan untuk guru |
| `REFERENSI.md` | Referensi dan keputusan rubrik |

## Pengujian

```sh
npm test
```

Tes menggunakan respons buatan untuk memeriksa perilaku aplikasi; bukan bukti akurasi model Gemini. Pengujian analisis nyata memerlukan API key. Tidak ada respons contoh yang dijadikan hasil analisis palsu pada aplikasi produksi.

## Batas interpretasi

- Skor 1–100 adalah kesesuaian berdasarkan rubrik aplikasi, bukan skor resmi Barrett/Bloom, validitas empiris, daya beda, reliabilitas, atau indeks kesukaran.
- Kategori lebih tinggi tidak otomatis lebih baik. Soal Literal/C1 boleh mendapat 100 bila tepat sasaran.
- Label diberikan langsung oleh layanan analisis, tanpa ambang skor yang dipaksakan kode. Rata-rata tujuh skor dihitung server; hasil dapat bervariasi.
- Barrett digunakan untuk reading comprehension. Soal yang tidak mengukur bacaan akan diberi penjelasan keterbatasan oleh AI.
- CEFR adalah estimasi tuntutan bahasa dan tugas, bukan sertifikasi.
- Referensi diringkas ke rubrik backend, bukan dibaca ulang dari web pada setiap analisis.
- Input dan revisi diperlakukan sebagai teks biasa agar markup tidak dieksekusi. Kunci tidak dikirim ke browser. Soal tetap dikirim ke Google untuk dianalisis saat tombol Analisis ditekan.
- Tidak ada login atau pembatasan pengguna dalam spesifikasi ini. Jika situs dibuka untuk publik, pemakaian API mengikuti kuota akun pengelola; atur kuota/batas biaya di penyedia API sesuai kebutuhan.
- Batas input: 12.000 karakter untuk kolom Kisi-kisi dan 4.000 per parameter lain, 20.000 per stimulus, 12.000 untuk pertanyaan. Analisis panjang dapat melewati batas waktu function; pesan gagal mempertahankan draf agar bisa dicoba lagi.
