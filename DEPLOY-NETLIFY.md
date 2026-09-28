# Deploy v2.0.0 — Gemini untuk gambar, Groq untuk telaah

## Repository GitHub yang sudah terhubung

1. Ekstrak ZIP, lalu unggah **seluruh isinya** ke root repository yang digunakan situs Netlify. Pastikan netlify.toml berada di root, bukan subfolder.
2. Sertakan **package.json, package-lock.json, public, netlify/functions, tests** beserta berkas pendukung dalam paket. Netlify akan memasang @netlify/blobs saat build. Jangan hanya mengganti index.html atau recovery.mjs.
3. Commit. Tunggu deploy selesai. Build command `npm test`, Publish directory `public`, Functions directory `netlify/functions`, Node 22.
4. Pastikan Functions baru **jobs**, **process-background**, **cleanup-jobs** terpasang. Endpoint lama **analyze**, **revise**, **read-image** tetap disertakan.
5. Buka **Project configuration → Environment variables**. Tambahkan **GROQ_API_KEY** dari akun Groq dan pertahankan **GEMINI_API_KEY**. Kedua key harus berbeda dan sesuai penyedianya. Atur Production dan cakupan Functions (atau semua scope).
6. Gunakan pengaturan berikut:

   | Variabel | Nilai |
   | --- | --- |
   | GROQ_API_KEY | Key dari akun Groq — jangan unggah ke GitHub |
   | GROQ_MODEL | openai/gpt-oss-120b |
   | GROQ_FALLBACK_MODEL | openai/gpt-oss-20b |
   | GEMINI_API_KEY | Key Gemini yang sudah dimiliki |
   | GEMINI_MODEL | gemini-3.6-flash |
   | GEMINI_FALLBACK_MODEL | gemini-3.5-flash-lite |

   Keempat variabel model bersifat opsional karena nilai di atas merupakan default kode. Jika variabel lama sudah ada, nilainya mengalahkan default; periksa nilainya. Jangan memasukkan nama Gemini pada GROQ_MODEL atau sebaliknya.
7. Setelah menyimpan variabel, deploy ulang. Netlify memberikan konfigurasi Blobs dan URL deployment untuk Functions v2; tidak perlu menaruh token Netlify di frontend.
8. Muat ulang situs dengan Ctrl+F5. Footer harus **v2.0.0**. Uji **input teks dahulu**, lalu revisi, dan terakhir unggah JPG/PNG/WebP. PDF dan Word tidak didukung.

Paket ini belum diterbitkan langsung ke akun Netlify Anda. Pembaruan frontend dan backend harus berasal dari deployment yang sama.

## Pemeriksaan hasil deployment

- Browser mengirim POST ke `/.netlify/functions/jobs`, mendapat status 202 (queued/running), kemudian meminta status hingga done/error.
- `process-background` menerima pemanggilan singkat, lalu memproses tanpa menahan koneksi browser. Worker tidak mengembalikan hasil lewat respons HTTP; hasil disimpan dan dibaca melalui jobs.
- Buka Logs → Functions → **process-background** untuk melihat kegagalan model, retry dan fallback. Untuk masalah antrean/penyimpanan, periksa **jobs**. Log `analysis_attempt_failed` sekarang mencantumkan `provider`, `model`, `fallback`, `attempt` dan `elapsedMs`; tanpa API key atau isi soal.
- Aplikasi memberi anggaran pemrosesan 3 menit. Jangan menambahkan timeout 180 detik pada Function sinkron: pekerjaan panjang memang harus berjalan pada process-background.

## Arti kode error

| Kode | Langkah berikutnya |
| --- | --- |
| JOB_STORAGE | Periksa instalasi @netlify/blobs, build log dan konteks Blobs pada Functions. Deploy ulang seluruh paket melalui Git. Jangan menyalin API key ke browser. |
| JOB_DISPATCH | Pastikan process-background terpasang dan bisa dipanggil dari URL deployment. Periksa proteksi akses deployment dan dukungan Background Functions pada paket akun. |
| CONFIG_MISSING | Pasang key sesuai tahap: GROQ_API_KEY untuk analisis/revisi, GEMINI_API_KEY untuk gambar, lalu deploy ulang. |
| STATUS_CONNECTION / STATUS_WAIT | Klik coba lagi untuk memeriksa pekerjaan yang sama; jangan langsung mengirim ulang beberapa kali. |
| JOB_STALLED / TIME_LIMIT | Layanan belum menyelesaikan pekerjaan dalam anggaran baru. Periksa log process-background dan latensi/model yang digunakan. |
| UPSTREAM_429 | Kuota/rate limit; tunggu dan periksa kuota. Memperpanjang waktu tidak memperbaiki kuota yang habis. |
| JOB_EXPIRED | Hasil sementara sudah kedaluwarsa atau jam perangkat tidak tepat. Mulai ulang dan pastikan tanggal/jam perangkat benar. |

Jika masih tampil pesan lama yang menyuruh memendekkan stimulus, periksa footer dan pastikan browser tidak memuat frontend lama.

## Catatan hosting dan penyimpanan

Background Functions didokumentasikan tersedia pada paket credit-based termasuk Free serta Enterprise. Akun legacy dapat memiliki ketentuan berbeda. Pemakaian Functions dan Blobs tetap mengikuti kuota/biaya akun; tidak ada jaminan penggunaan tanpa batas.

Hasil sementara memakai Netlify Blobs situs ini. Akses hasil kedaluwarsa 24 jam, pembersihan fisik berjalan harian melalui cleanup-jobs. Pastikan function terjadwal aktif pada production deploy.

Hapus public/rubrik.html dan scripts/export-rubric.mjs jika masih ada dari versi lama; unggah file tidak otomatis menghapus file lama tersebut.

Sumber resmi:
- https://docs.netlify.com/build/functions/background-functions/
- https://docs.netlify.com/build/data-and-storage/netlify-blobs/

## Pemeriksaan keberhasilan migrasi

Frontend harus v2.0.0. Proses analisis/revisi dikirim ke Groq, pembacaan gambar dikirim ke Gemini. Pengguna yang hanya mengetik teks cukup memasang GROQ_API_KEY. Gambar dibaca dahulu dan teks dikonfirmasi sebelum dikirim ke Groq. Hasil analisis tidak menyebut nama layanan.

Buat key Groq melalui https://console.groq.com/ . Ketersediaan model dan batas token mengikuti akun Groq; free tier tidak berarti tanpa batas. Jika mendapat 429, periksa batas model di akun tersebut.

Dokumentasi Groq: https://console.groq.com/docs/structured-outputs dan https://console.groq.com/docs/rate-limits .
