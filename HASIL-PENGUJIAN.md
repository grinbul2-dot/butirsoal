# Hasil pengujian paket v1.2.0

## Lulus: 17 pengujian otomatis

Dijalankan dengan `npm test` pada Node.js 24; proyek mensyaratkan Node.js minimal 22.

1. Input tipe bebas dan 1–2 stimulus diterima.
2. Input kosong, kategori tidak valid, kelas di luar 1–12, dan panjang berlebih ditolak.
3. Rata-rata dihitung ulang server dan urutan kategori dinormalisasi.
4. Revisi dibuang ketika label keseluruhan Sangat Sesuai.
5. Label lain mensyaratkan revisi utuh dengan jumlah teks yang sesuai.
6. Kategori duplikat, label tidak dikenal, dan skor di luar rentang ditolak.
7. Metode HTTP, format data, input tidak valid, dan API key kosong menghasilkan pesan yang sesuai.
8. Proxy meminta structured JSON dan menangani kuota serta output terpotong; diuji dengan simulasi respons penyedia.
9. JavaScript frontend berhasil dimuat dalam lingkungan uji; perbandingan kata mempertahankan teks asli/revisi dan mengamankan markup.
10. Renderer menghasilkan tujuh kartu, dua teks lengkap dalam perbandingan, dan menghilangkan panel revisi pada label Sangat Sesuai.
11. HTML yang berasal dari hasil model ditampilkan sebagai teks, bukan kode aktif.

12. Kunci jawaban asli dan revisi wajib tersedia; status ambigu diperbolehkan.
13. Format/signature gambar, jumlah gambar, dan batas payload diperiksa.
14. Transkripsi diterima hanya bila lengkap; penolakan tidak meneruskan teks tebakan.
15. Pesan file tidak didukung dibedakan dari gangguan konfigurasi/layanan.
16. Endpoint mengirim image parts dan menangani penerimaan, penolakan, serta kuota (respons simulasi).
17. Hasil foto ditinjau sebelum menimpa isian; penolakan mempertahankan isian sebelumnya.

## Belum diverifikasi

- Pembacaan gambar nyata, kualitas OCR, dan hasil analisis langsung dari Gemini: API key belum tersedia.
- Deploy produksi Netlify: akses akun/target belum tersedia.
- Kamera fisik dan pemeriksaan visual browser desktop/HP: browser pratinjau tidak dapat diakses di lingkungan pengerjaan. CSS responsif sudah disiapkan, tetapi pemeriksaan visual bukan bagian dari hasil lulus di atas.

Respons simulasi hanya dipakai tes. Aplikasi produksi tidak menampilkan skor buatan ketika Gemini tidak tersedia.
