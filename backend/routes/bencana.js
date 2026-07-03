const express = require('express');
const supabase = require('../supabaseClient');
const { authenticate, authorize } = require('../middleware/auth');
const { tentukanKewenangan, TAHAPAN_TANGGAP_DARURAT } = require('../utils/constants');
const { catatAktivitas } = require('../utils/log');

const router = express.Router();
router.use(authenticate);

// GET semua kejadian bencana (dengan filter status & pencarian)
router.get('/', async (req, res) => {
  let query = supabase.from('bencana').select('*').order('tanggal_kejadian', { ascending: false });
  const { status, kewenangan, q } = req.query;
  if (status) query = query.eq('status', status);
  if (kewenangan) query = query.eq('kewenangan', kewenangan);
  if (q) query = query.or(`jenis_bencana.ilike.%${q}%,lokasi.ilike.%${q}%`);
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ message: 'Gagal mengambil data bencana.' });
  res.json(data);
});

router.get('/tahapan-referensi', (req, res) => res.json(TAHAPAN_TANGGAP_DARURAT));

router.get('/:id', async (req, res) => {
  const { data: item, error } = await supabase.from('bencana').select('*').eq('id', req.params.id).single();
  if (error || !item) return res.status(404).json({ message: 'Data kejadian bencana tidak ditemukan.' });
  
  const { data: korban } = await supabase.from('korban').select('*').eq('bencana_id', item.id);
  const { data: distribusi } = await supabase.from('distribusi').select('*').eq('bencana_id', item.id);
  
  res.json({ ...item, korban: korban || [], distribusi: distribusi || [] });
});

router.post('/', authorize('admin', 'kepala_bidang', 'petugas'), async (req, res) => {
  const {
    jenis_kategori, jenis_bencana, lokasi, tanggal_kejadian,
    jumlah_pengungsi, dampak_lebih_1_kabkota, no_surat_penetapan,
    pejabat_penetapan, deskripsi
  } = req.body;

  if (!jenis_kategori || !jenis_bencana || !lokasi || !tanggal_kejadian || jumlah_pengungsi === undefined) {
    return res.status(400).json({ message: 'Jenis bencana, lokasi, tanggal kejadian, dan jumlah pengungsi wajib diisi.' });
  }

  const kewenangan = tentukanKewenangan({
    jumlah_pengungsi: Number(jumlah_pengungsi),
    dampak_lebih_1_kabkota: !!dampak_lebih_1_kabkota
  });

  const item = {
    jenis_kategori,
    jenis_bencana,
    lokasi,
    tanggal_kejadian,
    jumlah_pengungsi: Number(jumlah_pengungsi),
    dampak_lebih_1_kabkota: !!dampak_lebih_1_kabkota,
    kewenangan,
    no_surat_penetapan: no_surat_penetapan || null,
    pejabat_penetapan: pejabat_penetapan || null,
    deskripsi: deskripsi || '',
    status: 'tanggap_darurat',
    tahap_ics: TAHAPAN_TANGGAP_DARURAT[0],
    dibuat_oleh: req.user.id,
    dibuat_oleh_nama: req.user.nama
  };
  
  const { data, error } = await supabase.from('bencana').insert([item]).select().single();
  if (error) return res.status(500).json({ message: 'Gagal mencatat kejadian bencana.' });
  
  catatAktivitas(req.user, `Mencatat kejadian bencana baru: ${jenis_bencana} di ${lokasi}`);
  res.status(201).json(data);
});

router.put('/:id', authorize('admin', 'kepala_bidang', 'petugas'), async (req, res) => {
  const { data: existing, error: errExisting } = await supabase.from('bencana').select('*').eq('id', req.params.id).single();
  if (errExisting || !existing) return res.status(404).json({ message: 'Data kejadian bencana tidak ditemukan.' });

  const payload = { ...req.body };
  if (payload.jumlah_pengungsi !== undefined || payload.dampak_lebih_1_kabkota !== undefined) {
    const jumlah = payload.jumlah_pengungsi !== undefined ? Number(payload.jumlah_pengungsi) : existing.jumlah_pengungsi;
    const dampak = payload.dampak_lebih_1_kabkota !== undefined ? !!payload.dampak_lebih_1_kabkota : existing.dampak_lebih_1_kabkota;
    payload.kewenangan = tentukanKewenangan({ jumlah_pengungsi: jumlah, dampak_lebih_1_kabkota: dampak });
  }
  payload.updated_at = new Date().toISOString();

  const { data, error } = await supabase.from('bencana').update(payload).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ message: 'Gagal memperbarui data kejadian bencana.' });
  
  catatAktivitas(req.user, `Memperbarui data kejadian bencana: ${existing.jenis_bencana} di ${existing.lokasi}`);
  res.json(data);
});

router.patch('/:id/tahap', authorize('admin', 'kepala_bidang', 'petugas'), async (req, res) => {
  const { tahap_ics, status } = req.body;
  const { data: existing, error: errExisting } = await supabase.from('bencana').select('*').eq('id', req.params.id).single();
  if (errExisting || !existing) return res.status(404).json({ message: 'Data kejadian bencana tidak ditemukan.' });
  
  const update = { updated_at: new Date().toISOString() };
  if (tahap_ics) update.tahap_ics = tahap_ics;
  if (status) update.status = status;
  
  const { data, error } = await supabase.from('bencana').update(update).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ message: 'Gagal mengubah tahap kejadian bencana.' });
  
  catatAktivitas(req.user, `Mengubah tahapan penanganan bencana "${existing.jenis_bencana}" menjadi: ${tahap_ics || status}`);
  res.json(data);
});

router.delete('/:id', authorize('admin', 'kepala_bidang'), async (req, res) => {
  const { data: existing, error: errExisting } = await supabase.from('bencana').select('jenis_bencana, lokasi').eq('id', req.params.id).single();
  if (errExisting || !existing) return res.status(404).json({ message: 'Data kejadian bencana tidak ditemukan.' });
  
  const { error } = await supabase.from('bencana').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ message: 'Gagal menghapus data kejadian bencana.' });
  
  catatAktivitas(req.user, `Menghapus data kejadian bencana: ${existing.jenis_bencana} di ${existing.lokasi}`);
  res.json({ message: 'Data kejadian bencana berhasil dihapus.' });
});

module.exports = router;
