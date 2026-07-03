// Konstanta domain — diturunkan langsung dari Permensos No. 9 Tahun 2018
// tentang Standar Teknis Pelayanan Dasar pada SPM Bidang Sosial

// Pasal 5 — Jenis Bencana
const JENIS_BENCANA_ALAM = [
  'Gempa Bumi', 'Tsunami', 'Banjir', 'Tanah Longsor',
  'Letusan Gunung Api', 'Gelombang Laut Ekstrem',
  'Angin Topan/Siklon Tropis/Puting Beliung', 'Kekeringan'
];

const JENIS_BENCANA_SOSIAL = [
  'Konflik Sosial', 'Aksi Teror', 'Kebakaran Permukiman dan Gedung',
  'Wabah/Epidemi', 'Gagal Teknologi', 'Kebakaran Hutan dan Lahan'
];

// Pasal 10 & 29 — Kriteria kewenangan provinsi vs kabupaten/kota
// Provinsi: 51-100 org, dampak > 1 kab/kota, surat penetapan gubernur
// Kab/Kota: 1-50 org, dampak 1 kab/kota, surat penetapan bupati/wali kota
function tentukanKewenangan({ jumlah_pengungsi, dampak_lebih_1_kabkota }) {
  if (jumlah_pengungsi >= 51 && jumlah_pengungsi <= 100) return 'provinsi';
  if (jumlah_pengungsi >= 1 && jumlah_pengungsi <= 50 && !dampak_lebih_1_kabkota) return 'kabupaten/kota';
  if (dampak_lebih_1_kabkota) return 'provinsi';
  return 'perlu_verifikasi';
}

// Pasal 15 — Kebutuhan dasar Korban Bencana SAAT tanggap darurat
const KEBUTUHAN_DASAR_SAAT_DARURAT = [
  { kode: 'permakanan', label: 'Permakanan', satuan_default: 'paket/hari', catatan: 'Diberikan paling sedikit 7 hari sejak terjadinya bencana (Pasal 16)' },
  { kode: 'sandang', label: 'Sandang', satuan_default: 'paket' },
  { kode: 'shelter', label: 'Tempat Penampungan Pengungsi', satuan_default: 'unit', catatan: 'Barak, fasilitas sosial, fasilitas umum lainnya (Pasal 17)' },
  { kode: 'kelompok_rentan', label: 'Penanganan Khusus Kelompok Rentan', satuan_default: 'orang', catatan: 'Ibu hamil, penyandang disabilitas, anak, lansia (Pasal 18)' },
  { kode: 'psikososial', label: 'Dukungan Psikososial', satuan_default: 'sesi', catatan: 'Bimbingan & konsultasi, konseling, pendampingan, rujukan (Pasal 19)' }
];

// Pasal 20 — Kebutuhan dasar SETELAH tanggap darurat
const KEBUTUHAN_DASAR_PASCA_DARURAT = [
  { kode: 'kelompok_rentan', label: 'Penanganan Khusus Kelompok Rentan', satuan_default: 'orang' },
  { kode: 'psikososial', label: 'Dukungan Psikososial', satuan_default: 'sesi' }
];

// Pasal 18 — Kategori kelompok rentan
const KATEGORI_RENTAN = ['Tidak Ada', 'Ibu Hamil', 'Penyandang Disabilitas', 'Anak', 'Lanjut Usia'];

// Pasal 24 & 41 — SDM minimal yang harus disiapkan
const SDM_MINIMAL = {
  provinsi: ['Pekerja Sosial Profesional', 'Tenaga Kesejahteraan Sosial', 'Relawan Sosial'],
  'kabupaten/kota': ['Tenaga Kesejahteraan Sosial', 'Relawan Sosial']
};

// Tahapan SOP SIGAP BENCANA (Bab III.E rancangan aktualisasi) —
// dipakai sebagai status workflow distribusi bantuan
const TAHAPAN_DISTRIBUSI = ['assessment', 'verifikasi', 'distribusi', 'pelaporan'];

// Tahapan Incident Command System (ICS) sederhana untuk alur tanggap darurat
const TAHAPAN_TANGGAP_DARURAT = [
  'Laporan Awal Kejadian',
  'Aktivasi Komando Tanggap Darurat',
  'Assessment Kebutuhan',
  'Verifikasi & Penetapan Bantuan',
  'Distribusi Bantuan Logistik',
  'Pelaporan & Evaluasi'
];

const ROLES = ['admin', 'kepala_bidang', 'petugas'];

module.exports = {
  JENIS_BENCANA_ALAM,
  JENIS_BENCANA_SOSIAL,
  tentukanKewenangan,
  KEBUTUHAN_DASAR_SAAT_DARURAT,
  KEBUTUHAN_DASAR_PASCA_DARURAT,
  KATEGORI_RENTAN,
  SDM_MINIMAL,
  TAHAPAN_DISTRIBUSI,
  TAHAPAN_TANGGAP_DARURAT,
  ROLES
};
