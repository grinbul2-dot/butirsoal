# Analisis Butir Soal — v2.1.0

Aplikasi guru Bahasa Inggris untuk menelaah satu butir soal menurut tipe soal, jenis teks, Barrett, kisi-kisi, Bloom, CEFR dan grammar. Seluruh pemrosesan menggunakan **Groq dengan model qwen/qwen3.8-27b**, termasuk pembacaan gambar. Hanya GROQ_API_KEY dan GROQ_MODEL yang digunakan pada alur aplikasi; key Gemini tidak diperlukan.

## Alur

1. Isi parameter dan kisi-kisi; template parameter dapat disimpan lokal.
2. Tempel teks atau unggah JPG/PNG/WebP/foto kamera (maksimal 3 gambar berurutan). PDF dan Word tidak didukung. Tinjau transkripsi sebelum diterapkan. Gambar buram/tidak sesuai ditolak dengan alasan; tersedia tautan OCR alternatif.
3. Lihat analisis, kunci jawaban dan temuan. Klik Buat Revisi Sesuai Parameter untuk revisi terpisah yang mencakup target CEFR. Gagal revisi tidak menghapus analisis.

Input teks langsung tidak menjalankan pembacaan gambar. Transkripsi dipakai kembali; gambar tidak dikirim ulang pada analisis atau revisi. Semua gambar dan teks yang diproses dikirim ke Groq. Hasil telaah tidak menampilkan identitas layanan/model.

Groq memakai strict JSON schema, disertai validasi server terhadap skor 1–100, tujuh kategori unik, kunci dan kelengkapan revisi. Rata-rata dihitung server. Tidak ada mesin penilaian 28 kriteria. Struktur JSON benar bukan jaminan ketepatan isi; estimasi CEFR dan klasifikasi tetap perlu ditinjau guru.

## Keandalan

Jobs dan process-background memakai Netlify Blobs untuk pekerjaan terpisah dari koneksi browser. Anggaran layanan 180 detik, maksimal 80 detik per panggilan. Retry dibatasi; hanya model Qwen yang sama digunakan, tanpa fallback ke GPT atau Gemini. Saat koneksi putus, browser memeriksa pekerjaan yang sama untuk menghindari panggilan ganda. Klaim worker menggunakan ETag atomik.

Cache analisis versi lama tidak digunakan otomatis pada v2.1.0; draf parameter dan soal tetap dipertahankan. START NEW ANALYSIS menghapus draf, hasil dan penanda pekerjaan lokal, mempertahankan template manual. Reset tidak membatalkan worker yang sudah berjalan.

## Penyimpanan

API key hanya di server. Input/gambar dan secret worker dihapus dari catatan setelah pekerjaan selesai. Hasil sementara tidak dapat diakses setelah 24 jam; cleanup-jobs menghapus catatan kedaluwarsa setiap hari. Penyimpanan fisik bisa mendekati 48 jam jika jadwal berjalan normal. Token pekerjaan acak merupakan hak akses hasil dan tidak boleh dibagikan. Draf/hasil/template disimpan lokal di browser; gambar tidak disimpan di localStorage.

## Deploy dan pengujian

Ikuti DEPLOY-NETLIFY.md. Ubah GROQ_MODEL menjadi qwen/qwen3.8-27b; variabel lama dapat mengalahkan default paket. Variabel GEMINI_* serta GROQ_FALLBACK_MODEL tidak digunakan oleh alur aplikasi.

Node 22+: `npm ci`, `npm test`, `npm run dev`. Server lokal memakai penyimpanan memori untuk simulasi antrian; produksi memakai Netlify Blobs. Tidak ada dependency frontend tambahan. Endpoint sinkron lama tetap tersedia dengan batas 25 detik, tetapi frontend memakai alur jobs.

37 pengujian simulasi lulus. Belum diuji dengan API key pengguna atau deployment Netlify nyata. Ketersediaan model, kuota dan akurasi pedagogis memerlukan verifikasi pada akun dan contoh soal pengguna.
