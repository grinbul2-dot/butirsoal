# Deploy v2.1.0 — seluruh proses memakai Groq Qwen

## Perubahan dari v2.0.0

Pembacaan gambar/kamera, analisis, telaah, kunci jawaban dan revisi seluruhnya menggunakan **qwen/qwen3.8-27b** melalui Groq. Tidak ada pemanggilan Gemini pada alur aplikasi. Unggahan tetap JPG, PNG, WebP, maksimal 3 gambar; tidak ada PDF atau Word.

## Pengaturan Netlify

Buka proyek → **Project configuration → Environment variables**:

| Variabel | Nilai |
| --- | --- |
| GROQ_API_KEY | API key Groq yang sudah berhasil digunakan |
| GROQ_MODEL | qwen/qwen3.8-27b |

**Penting: ubah GROQ_MODEL lama yang masih openai/gpt-oss-120b.** Variabel dashboard mengalahkan default kode. Paket akan menampilkan CONFIG_MODEL jika masih menggunakan model lama, agar tidak diam-diam mengirim gambar ke model yang tidak sesuai.

Tetapkan **Production** dan **Functions** (atau All scopes). Jangan menaruh key asli dalam file yang diunggah ke GitHub.

`GROQ_FALLBACK_MODEL` dan seluruh variabel `GEMINI_*` tidak digunakan oleh alur v2.1.0. Boleh dihapus dari pengaturan **proyek ini**. Jika variabel dibagikan ke proyek lain, jangan menghapus variabel bersama tersebut.

Hanya satu model Qwen yang dikonfigurasi. Retry tetap maksimal tiga kali setelah panggilan pertama, dengan jeda 1, 2, 4 detik dan menghormati Retry-After. Tidak ada cadangan GPT atau Gemini. Memakai model yang sama sebagai fallback tidak memberi cadangan independen.

## Menerbitkan pembaruan

1. Ekstrak ZIP dan unggah **seluruh isi** ke root repository GitHub yang sudah terhubung ke Netlify, termasuk package.json, package-lock.json, tests dan seluruh folder netlify/functions. Jangan hanya mengganti index.html.
2. Simpan pengaturan environment di atas dan commit berkas pembaruan. Jalankan deploy ulang setelah perubahan variabel.
3. Build command `npm test`, Publish directory `public`, Functions directory `netlify/functions`, Node 22. Dependency @netlify/blobs dipasang dari package-lock.json.
4. Pastikan jobs, process-background dan cleanup-jobs tersedia. analyze, revise dan read-image juga tetap dipaketkan.
5. Tunggu deploy berstatus Published. Tekan Ctrl+F5; footer harus **v2.1.0**.
6. Uji input teks → analisis → revisi. Kemudian uji gambar yang jelas → Baca Gambar → periksa transkripsi → terapkan ke kolom teks → analisis.

Paket belum diterbitkan langsung ke akun Netlify pengguna. Tidak perlu membuat API key baru apabila key Groq yang ada masih valid dan memiliki akses model Qwen.

## Jika gagal

- CONFIG_MODEL: perbarui GROQ_MODEL persis seperti tabel, lalu deploy ulang.
- CONFIG_MISSING: periksa GROQ_API_KEY pada Production/Functions.
- UPSTREAM_429: periksa batas permintaan/token model Qwen di Groq Console. Gambar juga menggunakan kuota token. Free tier bukan tanpa batas.
- UPSTREAM_503: layanan model sedang tidak tersedia setelah percobaan ulang; input tetap tersedia.
- JOB_STORAGE: periksa instalasi @netlify/blobs dan deployment Functions v2.
- JOB_DISPATCH: periksa process-background dan dukungan Background Functions pada paket Netlify.
- STATUS_CONNECTION/STATUS_WAIT: tombol coba lagi memeriksa pekerjaan yang sama dahulu.

Log admin: **Logs → Functions → process-background**. Baris analysis_attempt_failed menyertakan provider, model, attempt dan elapsedMs. Nama model tidak muncul pada hasil telaah pengguna.

## Referensi teknis

- https://console.groq.com/docs/vision
- https://console.groq.com/docs/structured-outputs
- https://console.groq.com/docs/rate-limits
- https://docs.netlify.com/build/functions/background-functions/
- https://docs.netlify.com/build/data-and-storage/netlify-blobs/
