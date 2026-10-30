# arkomponenkomputer
heheha

## Penyimpanan dan nilai kuis

Halaman kuis mengirim identitas dan jawaban ke Google Apps Script. Kode backend ada di `apps-script\Code.gs` dan menyimpan setiap pengumpulan ke sheet **Hasil Kuis**.

### Menyiapkan Google Sheets

1. Buat Google Spreadsheet untuk menyimpan hasil. Jangan bagikan spreadsheet kepada peserta.
2. Dari spreadsheet, buka **Ekstensi > Apps Script**, lalu salin isi `apps-script\Code.gs` ke editor Apps Script dan simpan.
3. Pilih fungsi `setupQuizSheet`, klik **Jalankan**, lalu setujui izin akses spreadsheet. Fungsi ini membuat sheet dan judul kolom, memasang filter, membekukan identitas peserta, serta merapikan warna, lebar kolom, dan format nilai. Jalankan lagi fungsi ini jika ingin menerapkan ulang format.
4. Pilih **Deploy > New deployment > Web app**. Atur **Execute as** ke akun Anda dan **Who has access** ke **Anyone**, lalu deploy.
5. Salin URL Web App yang berakhiran `/exec` dan ganti nilai `APPS_SCRIPT_URL` di `kuis.html`.
6. Setelah mengubah kode Apps Script, buka **Deploy > Manage deployments**, edit deployment, pilih versi baru, lalu deploy ulang.

Web App menerima kiriman publik agar peserta dapat mengirim jawaban. Karena itu, gunakan spreadsheet khusus dan jaga akses spreadsheet hanya untuk guru. Jangan simpan data sensitif peserta.

Tab **Hasil Kuis** memakai filter pada judul kolom. Kolom identitas tetap terlihat ketika digulir ke samping, sedangkan jawaban lengkap disimpan di kolom paling kanan agar tabel nilai mudah dipindai.

### Perhitungan nilai

- Pilihan ganda: 15 soal × 4 poin (maksimal 60).
- Uraian: 5 soal × 8 poin (maksimal 40); tiap soal memakai empat kelompok kata kunci, masing-masing 2 poin.
- Nilai akhir maksimal 100 dan ditampilkan setelah server mengonfirmasi penyimpanan.

Penilaian uraian berbasis kata kunci tidak memahami konteks jawaban seperti guru. Periksa kembali jawaban dan rincian rubrik di spreadsheet sebelum menetapkan nilai akhir.
