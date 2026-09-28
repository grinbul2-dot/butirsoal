# Hasil pengujian v2.0.0

36 pengujian otomatis lulus melalui npm test.

- Kontrak output kembali ke tujuh skor langsung, label dan penjelasan.
- Rata-rata dihitung oleh server. Tidak ada 28 nilai kriteria atau pemeriksaan kecocokan kutipan.
- Kunci asli/revisi, kelengkapan hasil dan jumlah stimulus tetap diperiksa.
- Analisis diterima tanpa revisi; endpoint revisi terpisah memeriksa kelengkapan stimulus dan kunci revisi.
- Cache input identik menghindari panggilan ulang. Kegagalan revisi mempertahankan analisis dan tombol coba lagi hanya memanggil revisi.
- Tiga halaman, reset, Clear, OCR alternatif dan rendering aman tetap diuji.
- Retry dan fallback tetap diuji. Endpoint sinkron lama mempertahankan batas 25 detik; alur latar belakang baru diuji dengan anggaran 180 detik dan simulasi model utama timeout 80 detik lalu cadangan selesai 40 detik kemudian.

Tes menggunakan respons simulasi. Belum ada bukti bahwa semua soal akan berhasil di produksi; API key, kuota dan latensi tetap memengaruhi layanan.
Instruksi revisi kini mencakup semua parameter dan adaptasi CEFR pada stimulus, stem, opsi serta instruksi. Pengujian kontrak bukan verifikasi empiris bahwa adaptasi CEFR selalu tepat.

Tampilan diuji melalui simulasi DOM, belum melalui pemeriksaan visual browser. Paket belum diterbitkan ke Netlify dari sesi ini.

- Worker terpisah dari koneksi browser, autentikasi secret worker, klaim atomik, hasil terminal, dan penghapusan input dari catatan diuji memakai penyimpanan simulasi.
- Polling yang kehilangan koneksi melanjutkan ID pekerjaan yang sama tanpa start kedua.
- Error penyimpanan, dispatch, ID tidak valid dan kedaluwarsa memiliki pesan khusus.
- Dependency @netlify/blobs dipasang versi terkunci 11.1.1. Netlify Blobs dan pemanggilan background nyata belum diuji pada akun pengguna.

## Pengujian migrasi Groq

- Analisis dan revisi menggunakan endpoint Groq, Authorization Bearer GROQ_API_KEY, strict JSON schema dan format respons choices.
- Pembacaan gambar tetap memakai Gemini dan GEMINI_API_KEY. Input PDF/Word tidak ditambahkan.
- Antrian analisis dapat dimulai tanpa GEMINI_API_KEY; antrian gambar dapat dimulai tanpa GROQ_API_KEY. Kekurangan key yang relevan dilaporkan sebelum worker dipanggil.
- 429 Groq beralih dari model 120B ke 20B tanpa mengirim permintaan ke Gemini.
- Refusal, respons terpotong dan key kosong tidak diterima sebagai hasil sukses.
- Schema transport tidak mengubah schema semantik. Validasi skor dan jumlah kategori tetap dijalankan.

Belum dilakukan panggilan dengan API key pengguna atau deploy ke akun Netlify pengguna. Tes menggunakan respons simulasi, sehingga bukan jaminan ketersediaan kuota maupun akurasi pedagogis.
