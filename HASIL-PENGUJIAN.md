# Hasil pengujian v2.1.0

37 pengujian otomatis melalui npm test lulus.

- Endpoint gambar mengirim konten multimodal image_url berupa data URL ke api.groq.com, dengan model qwen/qwen3.8-27b dan GROQ_API_KEY.
- Urutan teks dan beberapa gambar dipertahankan.
- Penolakan gambar buram/tidak sesuai mempertahankan pesan alasan dan tidak mengganti input secara otomatis.
- Analisis dan revisi menggunakan model Qwen yang sama, schema ketat dan validasi semantik terpisah.
- Pekerjaan teks dan gambar dapat dimulai tanpa GEMINI_API_KEY, dan keduanya membutuhkan GROQ_API_KEY.
- Setting fallback GPT lama diabaikan; retry tetap memakai Qwen. Model utama lama yang bukan Qwen ditolak sebelum panggilan layanan.
- Rata-rata skor, kunci asli/revisi, jumlah stimulus, reset tiga halaman, cache, pemulihan polling dan penguncian worker tetap diuji.
- Refusal dan respons terpotong tidak diterima sebagai hasil lengkap.

Semua panggilan penyedia dalam tes disimulasikan. Tidak ada API key pengguna dalam paket. Pengujian ini bukan bukti keberhasilan model pada akun produksi atau akurasi pedagogis. Tidak ada perubahan layout yang memerlukan inspeksi visual baru.
