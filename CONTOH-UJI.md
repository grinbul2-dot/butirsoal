# Contoh uji guru

Uji ini untuk dijalankan setelah API key aktif. Skor persis tidak ditentukan; yang diperiksa adalah alasan dan perilaku aplikasi.

## 1. Soal inferential sederhana

- Tipe: Pilihan Ganda
- Jenis teks: Narrative
- Barrett: Inferential Comprehension
- Kelas: 7
- Kisi-kisi: Disajikan cerita pendek tentang kehidupan sehari-hari, siswa dapat menyimpulkan sifat tokoh utama berdasarkan tindakannya.
- Bloom: C2 — Understand
- CEFR: A2

Stimulus:

> Rina was walking home after school. She saw an old woman carrying two heavy bags. Rina stopped and carried one of the bags to the woman's house. She arrived home late, but she smiled when she told her mother about the woman.

Pertanyaan:

> What can we infer about Rina?
> A. She likes helping other people.
> B. She is afraid of older people.
> C. She always forgets the way home.
> D. She dislikes talking to her mother.

Harapan: AI mengidentifikasi inferensi sifat melalui tindakan, bukan menganggap semua inferensi otomatis C4. Tidak harus membuat revisi bila overall Sangat Sesuai.

## 2. Ketidaksesuaian Barrett

Pertahankan kisi-kisi contoh 1, ubah pertanyaan menjadi:

> How many bags was the old woman carrying?
> A. One.
> B. Two.
> C. Three.
> D. Four.

Harapan: ada catatan bahwa jawaban eksplisit, sehingga tidak sesuai target Inferential. Perbaikan mengutamakan pertanyaan, mempertahankan stimulus.

## 3. Grammar dan dua teks

Aktifkan teks kedua, isi:

> Dina see an old man carrying a bag. She walked past him and went home.

Ubah Kisi-kisi menjadi “Disajikan dua bacaan pendek, siswa menyimpulkan perbedaan sikap tokoh berdasarkan tindakan mereka dalam kedua bacaan.”

Pertanyaan:

> Which statement best compares Rina and Dina?
> A. Rina helped someone, while Dina did not.
> B. Both girls carried the old man's bag.
> C. Dina helped someone, while Rina did not.
> D. Both girls asked their mothers for help.

Harapan: temuan grammar pada “Dina see”; jika direvisi, tetap dua stimulus lengkap dan satu pertanyaan lengkap. AI boleh mengidentifikasi perbandingan eksplisit sebagai Reorganization, sesuai bukti aktual dan options, sehingga perlu revisi terhadap target inferential. Highlight menampilkan bagian yang berubah.

## 4. Aturan UI dan kegagalan

- Field wajib kosong: tidak dikirim.
- Teks kedua yang ditampilkan kosong: tidak dikirim.
- Sembunyikan teks kedua: teks tersimpan sebagai draf, tetapi tidak disertakan dalam analisis.
- Muat ulang: draf kembali; hasil analisis lama tidak dianggap hasil terbaru.
- Ubah input sesudah hasil: hasil lama disembunyikan.
- API key belum disetel: tampil pesan pengaturan; input tidak hilang.
- Kuota habis: tampil pesan kuota, bukan skor buatan.
- Pada HP: versi asli di atas, revisi di bawah; tidak ada scroll horizontal halaman.
- Overall Sangat Sesuai: tampil pesan tidak perlu revisi, tanpa panel revisi.

## 5. Gambar dan kunci jawaban

- Foto soal Bahasa Inggris lengkap dan tajam: hasil pembacaan muncul untuk ditinjau; isian lama baru diganti setelah Gunakan Hasil Pembacaan.
- Bacaan dan soal pada dua foto: unggah keduanya sebelum Baca Gambar; periksa urutannya.
- Foto blur/silau/terpotong atau foto benda tanpa soal: pesan File tidak didukung karena … dengan alasan spesifik.
- PDF/HEIC atau file palsu berekstensi JPG: pesan alasan format tidak didukung.
- Gangguan jaringan/kuota: pesan gangguan layanan, bukan tuduhan isi file tidak didukung.
- Telaah menampilkan kunci asli dan alasan; jika direvisi, kunci revisi ditampilkan terpisah.
- Soal PG dengan dua jawaban benar yang tak disengaja: status kunci Ambigu dan alasan; tidak memaksakan satu huruf.
- Bagian hasil tidak menampilkan footer model, kata AI sebagai label layanan, atau metadata penyedia.
