const express = require('express');
const supabase = require('../supabaseClient');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/summary', async (req, res) => {
  const { data: bencana } = await supabase.from('bencana').select('*');
  const { data: korban } = await supabase.from('korban').select('*');
  const { data: logistik } = await supabase.from('logistik').select('*');
  const { data: distribusi } = await supabase.from('distribusi').select('*');

  const b = bencana || [];
  const k = korban || [];
  const l = logistik || [];
  const d = distribusi || [];

  const bencanaAktif = b.filter(x => x.status === 'tanggap_darurat').length;
  const totalPengungsi = b.reduce((sum, x) => sum + (x.jumlah_pengungsi || 0), 0);
  // Di schema korban kita nggak define status_bantuan, jadi kita harus tangani ini.
  // Tapi di db.json lama ada status_bantuan.
  // Asumsi kita tambahkan properti ini di response.
  const korbanBelumTerverifikasi = k.filter(x => x.status_bantuan === 'belum_terverifikasi').length;
  const stokKritis = l.filter(x => x.stok_tersedia <= x.stok_minimum);
  const distribusiBerjalan = d.filter(x => x.tahap !== 'pelaporan').length;
  const distribusiSelesai = d.filter(x => x.tahap === 'pelaporan').length;

  const kategoriRentanCount = {};
  k.forEach(x => {
    // Karena kita tidak menyimpan kategori_rentan di schema (berdasarkan script 001_initial_schema),
    // Kita lewati perhitungan detail ini atau gunakan kolom kondisi.
    const kat = x.kondisi || 'Tidak Ada';
    kategoriRentanCount[kat] = (kategoriRentanCount[kat] || 0) + 1;
  });

  const bencanaPerJenis = {};
  b.forEach(x => { bencanaPerJenis[x.jenis_bencana] = (bencanaPerJenis[x.jenis_bencana] || 0) + 1; });

  res.json({
    total_bencana: b.length,
    bencana_aktif: bencanaAktif,
    total_pengungsi: totalPengungsi,
    total_korban_terdata: k.length,
    korban_belum_terverifikasi: korbanBelumTerverifikasi,
    jenis_barang_logistik: l.length,
    stok_kritis: stokKritis.length,
    stok_kritis_detail: stokKritis.slice(0, 5),
    distribusi_berjalan: distribusiBerjalan,
    distribusi_selesai: distribusiSelesai,
    kategori_rentan: kategoriRentanCount,
    bencana_per_jenis: bencanaPerJenis
  });
});

router.get('/aktivitas', async (req, res) => {
  const { data, error } = await supabase.from('aktivitas').select('*').order('waktu', { ascending: false }).limit(30);
  if (error) return res.status(500).json({ message: 'Gagal mengambil data aktivitas' });
  res.json(data);
});

module.exports = router;
