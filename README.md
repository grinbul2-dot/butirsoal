# Analisis Butir Soal — v2.2.0

Aplikasi telaah soal Bahasa Inggris berdasarkan tipe soal, jenis teks, Barrett, kisi-kisi, Bloom, CEFR dan grammar. Gemini digunakan untuk pembacaan gambar, analisis, dan revisi. Identitas layanan/model tidak ditampilkan pada hasil telaah.

## Alur

1. Parameter dan kisi-kisi. Parameter dikunci ketika melanjutkan.
2. Input teks atau unggah gambar/kamera. Analisis gagal tetap di halaman ini dengan isian utuh. Pembacaan gambar dipratinjau sebelum diterapkan; gambar tidak dikirim ulang untuk analisis teks.
3. Hasil analisis dan kunci jawaban. Tidak ada navigasi kembali atau analisis ulang dari hasil.
4. Revisi yang berhasil otomatis memulai siklus baru pada halaman Parameter. Parameter sebelumnya dan soal revisi terisi; ringkasan revisi tampil di halaman 1, teks siap pada halaman 2. Revisi gagal mempertahankan hasil sebelumnya.

START FRESH pada halaman 3 menghapus seluruh isian, gambar, hasil, parameter, dan penanda pekerjaan dari siklus sebelumnya. Draf, template, dan cache lokal versi lama juga dihapus saat aplikasi dibuka. Tidak ada penyimpanan isian otomatis di perangkat; memuat ulang halaman memulai dari kosong.

Setiap siklus memakai pekerjaan baru. Saat reset, aplikasi meminta penghapusan data pekerjaan server; worker terlambat tidak dapat membuatnya kembali. Jika koneksi terputus saat penghapusan, pembersihan server terjadwal menangani data kedaluwarsa (TTL 24 jam). Reset tidak membatalkan permintaan provider yang sudah berjalan.

## Server

Netlify Background Functions dan Blobs menangani pekerjaan serta polling status untuk menghindari menunggu satu koneksi panjang. Retry dan fallback dibatasi waktu. Perubahan alur mencegah pemakaian hasil/siklus lama; tidak menjamin gangguan provider seperti HTTP 503 tidak terjadi.

Validasi server memeriksa tujuh kategori, skor, kunci dan kelengkapan revisi. Rubrik 28 kriteria tidak digunakan. Ketepatan isi tetap perlu ditinjau guru.

Lihat DEPLOY-NETLIFY.md untuk konfigurasi. Jalankan `npm ci`, lalu `npm test`; `npm run dev` untuk server lokal. Pengujian otomatis memakai respons tiruan, bukan panggilan provider berbayar.
