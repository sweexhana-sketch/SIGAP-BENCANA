const express = require('express');
const supabase = require('../supabaseClient');
const { authenticate, authorize } = require('../middleware/auth');
const { catatAktivitas } = require('../utils/log');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res) => {
  let query = supabase.from('logistik').select('*').order('nama_barang', { ascending: true });
  const { kategori, kritis } = req.query;
  
  if (kategori) query = query.eq('kategori', kategori);
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ message: 'Gagal mengambil data logistik.' });
  
  let result = data;
  if (kritis === 'true') {
    result = result.filter(l => l.stok_tersedia <= l.stok_minimum);
  }
  
  res.json(result);
});

router.get('/:id/mutasi', async (req, res) => {
  const { data, error } = await supabase.from('mutasi_stok').select('*').eq('logistik_id', req.params.id).order('waktu', { ascending: false });
  if (error) return res.status(500).json({ message: 'Gagal mengambil data mutasi.' });
  res.json(data);
});

router.post('/', authorize('admin', 'kepala_bidang'), async (req, res) => {
  const { nama_barang, kategori, satuan, stok_tersedia, stok_minimum } = req.body;
  if (!nama_barang || !kategori || !satuan) {
    return res.status(400).json({ message: 'Nama barang, kategori, dan satuan wajib diisi.' });
  }
  
  const item = {
    nama_barang, kategori, satuan,
    stok_tersedia: Number(stok_tersedia) || 0,
    stok_minimum: Number(stok_minimum) || 0
  };
  
  const { data, error } = await supabase.from('logistik').insert([item]).select().single();
  if (error) return res.status(500).json({ message: 'Gagal menambah barang logistik.' });
  
  catatAktivitas(req.user, `Menambahkan jenis barang logistik baru: ${nama_barang}`);
  res.status(201).json(data);
});

router.put('/:id', authorize('admin', 'kepala_bidang'), async (req, res) => {
  const { data: existing, error: errExisting } = await supabase.from('logistik').select('*').eq('id', req.params.id).single();
  if (errExisting || !existing) return res.status(404).json({ message: 'Barang logistik tidak ditemukan.' });
  
  const { nama_barang, kategori, satuan, stok_minimum } = req.body;
  
  const payload = {
    nama_barang: nama_barang ?? existing.nama_barang,
    kategori: kategori ?? existing.kategori,
    satuan: satuan ?? existing.satuan,
    stok_minimum: stok_minimum !== undefined ? Number(stok_minimum) : existing.stok_minimum,
    updated_at: new Date().toISOString()
  };
  
  const { data, error } = await supabase.from('logistik').update(payload).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ message: 'Gagal memperbarui barang logistik.' });
  
  res.json(data);
});

// Mutasi stok: masuk (donasi/pengadaan) atau keluar (selain lewat distribusi resmi)
router.post('/:id/mutasi', authorize('admin', 'kepala_bidang', 'petugas'), async (req, res) => {
  const { jenis, jumlah, keterangan } = req.body; // jenis: 'masuk' | 'keluar'
  
  const { data: item, error: errItem } = await supabase.from('logistik').select('*').eq('id', req.params.id).single();
  if (errItem || !item) return res.status(404).json({ message: 'Barang logistik tidak ditemukan.' });
  
  if (!['masuk', 'keluar'].includes(jenis) || !jumlah || Number(jumlah) <= 0) {
    return res.status(400).json({ message: 'Jenis mutasi (masuk/keluar) dan jumlah yang valid wajib diisi.' });
  }
  const jml = Number(jumlah);
  if (jenis === 'keluar' && jml > item.stok_tersedia) {
    return res.status(400).json({ message: `Stok tidak mencukupi. Stok tersedia saat ini: ${item.stok_tersedia} ${item.satuan}.` });
  }
  
  const stokBaru = jenis === 'masuk' ? item.stok_tersedia + jml : item.stok_tersedia - jml;
  
  const { data: updatedItem, error: errUpdate } = await supabase.from('logistik').update({ stok_tersedia: stokBaru, updated_at: new Date().toISOString() }).eq('id', req.params.id).select().single();
  if (errUpdate) return res.status(500).json({ message: 'Gagal memperbarui stok.' });

  const catatan = {
    logistik_id: item.id, jenis, jumlah: jml,
    keterangan: keterangan || (jenis === 'masuk' ? 'Penambahan stok' : 'Pengurangan stok'),
    oleh: req.user.nama
  };
  
  await supabase.from('mutasi_stok').insert([catatan]);
  
  catatAktivitas(req.user, `Mutasi stok ${jenis}: ${item.nama_barang} sejumlah ${jml} ${item.satuan}`);
  res.status(201).json(updatedItem);
});

router.delete('/:id', authorize('admin'), async (req, res) => {
  const { data: existing, error: errExisting } = await supabase.from('logistik').select('nama_barang').eq('id', req.params.id).single();
  if (errExisting || !existing) return res.status(404).json({ message: 'Barang logistik tidak ditemukan.' });
  
  const { error } = await supabase.from('logistik').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ message: 'Gagal menghapus barang logistik.' });
  
  catatAktivitas(req.user, `Menghapus barang logistik: ${existing.nama_barang}`);
  res.json({ message: 'Barang logistik berhasil dihapus.' });
});

module.exports = router;
