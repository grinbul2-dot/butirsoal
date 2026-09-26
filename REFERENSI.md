# Referensi dan rubrik

Rubrik versi 2026-09-25.2. Ini ringkasan operasional untuk mendukung penelaahan guru. Penerapan contoh, skor kesesuaian, dan logika aplikasi adalah rancangan aplikasi, bukan kutipan atau pengesahan lembaga sumber.

## Barrett

- Putri, Tasya Azzahra Wisnu. (2025). The Study of Reading Comprehension Questions in Bright an English 2 Based on Barrett’s Taxonomy. Retain: Journal of Research in English Language Teaching, 13(1), 1–10.
  https://ejournal.unesa.ac.id/index.php/retain/article/view/62937
- Cooke, Dean Albutt. (1970). An Analysis of Reading Comprehension Questions in Basal Reading Series According to the Barrett Taxonomy. Disertasi, Cornell University; catatan ERIC ED064672.
  https://eric.ed.gov/?id=ED064672

Lima kategori yang dipakai: Literal Comprehension, Reorganization, Inferential Comprehension, Evaluation, Appreciation. Sebutan “Bennet/Bennett” pada rancangan awal telah dikoreksi sesuai konfirmasi pengguna.

## Bloom revisi

- University of Illinois Chicago, Center for the Advancement of Teaching Excellence. Bloom’s Taxonomy of Educational Objectives.
  https://teaching.uic.edu/cate-teaching-guides/syllabus-course-design/blooms-taxonomy-of-educational-objectives/
- Acuan konseptual yang dirangkum panduan: Anderson & Krathwohl (2001), revisi taksonomi Bloom. Buku asli tidak disertakan dalam paket.

C1 Remember; C2 Understand; C3 Apply; C4 Analyze; C5 Evaluate; C6 Create. Analisis memperhatikan proses yang diperlukan, bukan pencocokan kata kerja secara mekanis. Tidak ada pemetaan satu-ke-satu yang diwajibkan antara Bloom dan Barrett.

## CEFR

- Council of Europe. CEFR Levels.
  https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions
- Council of Europe. Reading Comprehension.
  https://www.coe.int/en/web/common-european-framework-reference-languages/reading-comprehension

Dipakai sebagai orientasi tingkat bahasa A1–C2, dengan mempertimbangkan teks, pembaca, konteks, dan tujuan tugas. Aplikasi tidak menghasilkan sertifikasi CEFR.

## Dokumentasi implementasi

- Google AI for Developers, Gemini 3.5 Flash: https://ai.google.dev/gemini-api/docs/models/gemini-3.5-flash
- Google AI for Developers, generateContent: https://ai.google.dev/api/generate-content
- Google AI for Developers, structured output: https://ai.google.dev/gemini-api/docs/structured-output
- Netlify, functions configuration: https://docs.netlify.com/build/functions/configuration/
- Netlify, functions deployment: https://docs.netlify.com/build/functions/get-started/

Kunci disimpan pada environment function. Output diminta sebagai JSON schema dan diverifikasi server. Batas waktu fetch 52 detik memberi ruang sebelum batas eksekusi sinkron Netlify 60 detik pada dokumentasi yang diperiksa. Tidak ada retry otomatis yang dapat menggandakan penggunaan API tanpa tindakan pengguna.
