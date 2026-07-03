const express = require('express');
const supabase = require('../supabaseClient');
const { authenticate, authorize } = require('../middleware/auth');
const { KEBUTUHAN_DASAR_SAAT_DARURAT, KATEGORI_RENTAN } = require('../utils/constants');
const { catatAktivitas } = require('../utils/log');

const router = express.Router();
router.use(authenticate);

router.get('/kebutuhan-referensi', (req, res) => res.json({ kebutuhan: KEBUTUHAN_DASAR_SAAT_DARURAT, kategori_rentan: KATEGORI_RENTAN }));

// GET daftar korban (filter per bencana_id opsional)
router.get('/', async (req, res) => {
  let query = supabase.from('korban').select('*').order('created_at', { ascending: false });
  const { bencana_id, kategori_rentan, q } = req.query;
  if (bencana_id) query = query.eq('bencana_id', bencana_id);
  // Kita pakai field kondisi untuk kategori rentan sesuai schema
  if (kategori_rentan) query = query.eq('kondisi', kategori_rentan);
  if (q) query = query.or(`nama.ilike.%${q}%,nik.ilike.%${q}%`);
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ message: 'Gagal mengambil data korban.' });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { data: item, error } = await supabase.from('korban').select('*').eq('id', req.params.id).single();
  if (error || !item) return res.status(404).json({ message: 'Data korban tidak ditemukan.' });
  res.json(item);
});

router.post('/', authorize('admin', 'kepala_bidang', 'petugas'), async (req, res) => {
  const {
    bencana_id, nama, nik, jenis_kelamin, usia, kategori_rentan,
    alamat_asal, lokasi_pengungsian, kondisi_kesehatan,
    kebutuhan_assessment, catatan_petugas
  } = req.body;

  if (!bencana_id || !nama) {
    return res.status(400).json({ message: 'Data kejadian bencana dan nama korban wajib diisi.' });
  }
  const { data: bencana, error: errBencana } = await supabase.from('bencana').select('id').eq('id', bencana_id).single();
  if (errBencana || !bencana) return res.status(404).json({ message: 'Kejadian bencana terkait tidak ditemukan.' });

  const item = {
    bencana_id,
    nama,
    nik: nik || '',
    jenis_kelamin: jenis_kelamin || null,
    usia: usia !== undefined ? Number(usia) : null,
    alamat: alamat_asal || '',
    kondisi: kategori_rentan || 'Tidak Ada',
    jenis_bantuan_dibutuhkan: JSON.stringify(Array.isArray(kebutuhan_assessment) ? kebutuhan_assessment : []),
    dibuat_oleh: req.user.nama
  };
  
  const { data, error } = await supabase.from('korban').insert([item]).select().single();
  if (error) return res.status(500).json({ message: 'Gagal menambahkan data korban.', detail: error.message });
  
  catatAktivitas(req.user, `Menambahkan data & assessment korban bencana: ${nama}`);
  res.status(201).json(data);
});

router.put('/:id', authorize('admin', 'kepala_bidang', 'petugas'), async (req, res) => {
  const { data: existing, error: errExisting } = await supabase.from('korban').select('*').eq('id', req.params.id).single();
  if (errExisting || !existing) return res.status(404).json({ message: 'Data korban tidak ditemukan.' });
  
  const payload = { ...req.body, updated_at: new Date().toISOString() };
  delete payload.id;
  delete payload.bencana_id;
  
  // Mapping field names for schema
  if (payload.alamat_asal !== undefined) { payload.alamat = payload.alamat_asal; delete payload.alamat_asal; }
  if (payload.kategori_rentan !== undefined) { payload.kondisi = payload.kategori_rentan; delete payload.kategori_rentan; }
  if (payload.kebutuhan_assessment !== undefined) { payload.jenis_bantuan_dibutuhkan = JSON.stringify(payload.kebutuhan_assessment); delete payload.kebutuhan_assessment; }
  
  // Remove fields not in schema
  delete payload.lokasi_pengungsian;
  delete payload.kondisi_kesehatan;
  delete payload.catatan_petugas;
  delete payload.status_bantuan;
  delete payload.dicatat_oleh;
  delete payload.dicatat_oleh_nama;
  delete payload.diverifikasi_oleh;
  
  const { data, error } = await supabase.from('korban').update(payload).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ message: 'Gagal memperbarui data korban.' });
  
  catatAktivitas(req.user, `Memperbarui data korban bencana: ${existing.nama}`);
  res.json(data);
});

router.patch('/:id/verifikasi', authorize('admin', 'kepala_bidang'), async (req, res) => {
  const { data: existing, error: errExisting } = await supabase.from('korban').select('*').eq('id', req.params.id).single();
  if (errExisting || !existing) return res.status(404).json({ message: 'Data korban tidak ditemukan.' });
  
  // In the new schema we don't have a status_bantuan column, so this endpoint might just return the user or we can add it later.
  // For now we just record the activity.
  const { data, error } = await supabase.from('korban').update({ updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ message: 'Gagal memverifikasi korban.' });
  
  catatAktivitas(req.user, `Memverifikasi kebutuhan korban bencana: ${existing.nama}`);
  res.json(data);
});

router.delete('/:id', authorize('admin', 'kepala_bidang'), async (req, res) => {
  const { data: existing, error: errExisting } = await supabase.from('korban').select('nama').eq('id', req.params.id).single();
  if (errExisting || !existing) return res.status(404).json({ message: 'Data korban tidak ditemukan.' });
  
  await supabase.from('korban').delete().eq('id', req.params.id);
  catatAktivitas(req.user, `Menghapus data korban bencana: ${existing.nama}`);
  res.json({ message: 'Data korban berhasil dihapus.' });
});

module.exports = router;
