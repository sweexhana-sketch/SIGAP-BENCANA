# SIGAP BENCANA
Sistem Informasi SOP Pelayanan Tanggap Darurat dan Distribusi Bantuan Logistik
Bagi Korban Bencana — Bidang Perlindungan dan Jaminan Sosial, Dinas Sosial,
Pemberdayaan Perempuan dan Perlindungan Anak Provinsi Papua Barat Daya

Dibangun berdasarkan:
1. Rancangan Aktualisasi "SIGAP BENCANA" (Latsar CPNS 2026) — struktur alur kerja SOP,
   tahapan assessment → verifikasi → distribusi → pelaporan, dan checklist/tanda terima.
2. Permenso No. 9 Tahun 2018 tentang Standar Teknis Pelayanan Dasar pada SPM Bidang
   Sosial — klasifikasi kewenangan provinsi/kabupaten-kota, kebutuhan dasar korban
   bencana (Pasal 15/18/19), dan kriteria jenis bencana (Pasal 5).

## Arsitektur

```
sigap-bencana/
├── backend/            Express.js REST API + penyimpanan data (lowdb/JSON)
│   ├── server.js       Entry point server
│   ├── db.js           Lapisan data
│   ├── seed.js         Data awal (akun demo + referensi stok)
│   ├── middleware/      Autentikasi JWT & otorisasi peran
│   ├── routes/          auth, bencana, korban, logistik, distribusi, sop, dashboard
│   ├── utils/           Konstanta domain (Permensos) & log aktivitas
│   ├── data/db.json     Basis data (dibuat otomatis)
│   └── uploads/         File dokumen SOP yang diunggah
└── frontend/            Aplikasi web statis (vanilla JS, tanpa build step)
    ├── login.html, dashboard.html, bencana.html, korban.html,
    │   logistik.html, distribusi.html, sop.html, laporan.html, users.html
    ├── css/style.css     Sistem desain "Pusat Komando Tanggap Darurat"
    └── js/api.js, layout.js
```

Backend menyajikan frontend statis sekaligus API, sehingga hanya **satu server** yang
perlu dijalankan.

## Menjalankan secara lokal

Prasyarat: Node.js 18+ 

```bash
cd backend
npm install
npm run seed     # membuat akun demo & data referensi awal (sekali saja)
npm start        # menjalankan server di http://localhost:4000
```

Buka `http://localhost:4000` di browser.

### Akun demo (dibuat oleh `npm run seed`)
| Username   | Password    | Peran               | Kewenangan                                   |
|------------|-------------|----------------------|-----------------------------------------------|
| `admin`    | `admin123`  | Administrator        | Akses penuh, kelola akun, hapus data          |
| `kabid`    | `kabid123`  | Kepala Bidang        | Verifikasi rencana distribusi, sahkan SOP     |
| `feronika` | `petugas123`| Petugas Lapangan     | Input data bencana/korban/distribusi          |

**Segera ganti password akun demo** sebelum digunakan pada data operasional nyata.

## Modul Sistem

1. **Dashboard** — ringkasan bencana aktif, pengungsi, stok kritis, distribusi berjalan,
   grafik kelompok rentan, dan log aktivitas (jejak audit/akuntabilitas).
2. **Kejadian Bencana** — pencatatan bencana alam/sosial (Pasal 5), klasifikasi
   kewenangan provinsi vs kabupaten/kota otomatis (Pasal 10 & 29), dan tahapan
   komando tanggap darurat (ICS) bergaya stepper.
3. **Data & Assessment Korban** — identitas korban, kategori kelompok rentan
   (Pasal 18), dan formulir assessment kebutuhan dasar (permakanan, sandang,
   shelter, kelompok rentan, dukungan psikososial — Pasal 15/19).
4. **Inventori Logistik** — stok barang, ambang kritis, mutasi masuk/keluar dengan
   riwayat.
5. **Distribusi & Tanda Terima** — alur kerja 4 tahap (assessment → verifikasi →
   distribusi → pelaporan) sesuai gagasan kreatif SIGAP BENCANA; checklist
   penyiapan barang; tanda terima bantuan per korban; pengurangan stok otomatis
   saat memasuki tahap distribusi.
6. **Dokumen SOP** — repositori draft hingga dokumen final yang disahkan Kepala
   Bidang/Admin.
7. **Laporan & Rekap** — rekap lintas kejadian bencana, serta cetak **Berita Acara
   Serah Terima Bantuan** siap cetak/PDF (melalui dialog cetak browser) untuk tiap
   paket distribusi.
8. **Kelola Akun Petugas** *(khusus Admin)* — manajemen pengguna & peran.

## Peran & Hak Akses (Role-Based Access Control)

| Aksi                                             | Petugas | Kepala Bidang | Admin |
|---------------------------------------------------|:-------:|:-------------:|:-----:|
| Input data bencana/korban/checklist distribusi     | ✅      | ✅            | ✅    |
| Verifikasi tahap distribusi & kebutuhan korban      | ❌      | ✅            | ✅    |
| Sahkan dokumen SOP final                            | ❌      | ✅            | ✅    |
| Hapus data bencana                                  | ❌      | ✅            | ✅    |
| Kelola akun petugas                                 | ❌      | ❌            | ✅    |

## Catatan Produksi (Untuk Pengembangan Lanjutan)

Sistem ini adalah **MVP fungsional penuh** yang siap dipakai untuk lingkup satu
dinas/bidang. Untuk skala produksi yang lebih besar (multi-OPD, beban tinggi,
banyak pengguna bersamaan), disarankan migrasi berikut — struktur data sudah
dirancang relasional sehingga migrasi relatif mudah:

- **Basis data**: ganti `lowdb` (JSON file) → PostgreSQL/MySQL.
- **Penyimpanan file**: ganti folder lokal `uploads/` → object storage (S3-compatible).
- **Autentikasi**: tambahkan refresh token & rate limiting pada endpoint login.
- **Backup**: jadwalkan backup rutin `backend/data/db.json` dan `backend/uploads/`
  apabila tetap memakai penyimpanan berbasis file.
- **HTTPS**: jalankan di belakang reverse proxy (nginx) dengan sertifikat TLS.
- **Environment variable**: set `JWT_SECRET` dan `PORT` sesuai lingkungan
  (lihat `backend/middleware/auth.js` dan `backend/server.js`).

## Ringkasan API

Semua endpoint (kecuali `/api/auth/login`) memerlukan header
`Authorization: Bearer <token>`.

```
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/change-password
GET    /api/auth/users                [admin]
POST   /api/auth/users                [admin]
DELETE /api/auth/users/:id            [admin]

GET    /api/bencana
POST   /api/bencana
GET    /api/bencana/:id
PUT    /api/bencana/:id
PATCH  /api/bencana/:id/tahap
DELETE /api/bencana/:id               [admin, kepala_bidang]

GET    /api/korban
POST   /api/korban
GET    /api/korban/:id
PUT    /api/korban/:id
PATCH  /api/korban/:id/verifikasi     [admin, kepala_bidang]
DELETE /api/korban/:id                [admin, kepala_bidang]

GET    /api/logistik
POST   /api/logistik                  [admin, kepala_bidang]
POST   /api/logistik/:id/mutasi
GET    /api/logistik/:id/mutasi
DELETE /api/logistik/:id              [admin]

GET    /api/distribusi
POST   /api/distribusi
GET    /api/distribusi/:id
POST   /api/distribusi/:id/detail
DELETE /api/distribusi/:id/detail/:detailId
PATCH  /api/distribusi/:id/detail/:detailId/checklist
PATCH  /api/distribusi/:id/detail/:detailId/tanda-terima
PATCH  /api/distribusi/:id/tahap

GET    /api/sop
POST   /api/sop                        (multipart/form-data, field "file")
PATCH  /api/sop/:id/sahkan             [admin, kepala_bidang]
DELETE /api/sop/:id                    [admin, kepala_bidang]

GET    /api/dashboard/summary
GET    /api/dashboard/aktivitas
```
