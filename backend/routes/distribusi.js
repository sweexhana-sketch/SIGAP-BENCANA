const express = require('express');
const supabase = require('../supabaseClient');
const { authenticate, authorize } = require('../middleware/auth');
const { TAHAPAN_DISTRIBUSI } = require('../utils/constants');
const { catatAktivitas } = require('../utils/log');

const router = express.Router();
router.use(authenticate);

router.get('/tahapan-referensi', (req, res) => res.json(TAHAPAN_DISTRIBUSI));

// GET daftar distribusi (header), filter per bencana_id opsional
router.get('/', async (req, res) => {
  let query = supabase.from('distribusi').select('*').order('created_at', { ascending: false });
  const { bencana_id, tahap } = req.query;
  if (bencana_id) query = query.eq('bencana_id', bencana_id);
  if (tahap) query = query.eq('tahap', tahap);
  
  const { data, error } = await query;
  if (error) return res.status(500).json({ message: 'Gagal mengambil data distribusi.' });
  res.json(data);
});

router.get('/:id', async (req, res) => {
  const { data: item, error } = await supabase.from('distribusi').select('*').eq('id', req.params.id).single();
  if (error || !item) return res.status(404).json({ message: 'Data distribusi tidak ditemukan.' });
  
  const { data: detail } = await supabase.from('distribusi_detail').select('*').eq('distribusi_id', item.id);
  res.json({ ...item, detail: detail || [] });
});

// Buat rencana distribusi baru (tahap: assessment)
router.post('/', authorize('admin', 'kepala_bidang', 'petugas'), async (req, res) => {
  const { bencana_id, judul, catatan } = req.body;
  if (!bencana_id) return res.status(400).json({ message: 'Kejadian bencana terkait wajib dipilih.' });
  
  const { data: bencana, error: errBencana } = await supabase.from('bencana').select('jenis_bencana, lokasi').eq('id', bencana_id).single();
  if (errBencana || !bencana) return res.status(404).json({ message: 'Kejadian bencana tidak ditemukan.' });

  const item = {
    bencana_id,
    judul: judul || `Distribusi Bantuan - ${bencana.jenis_bencana} - ${bencana.lokasi}`,
    tahap: 'assessment',
    catatan: catatan || '',
    dibuat_oleh: req.user.id,
    dibuat_oleh_nama: req.user.nama
  };
  
  const { data, error } = await supabase.from('distribusi').insert([item]).select().single();
  if (error) return res.status(500).json({ message: 'Gagal membuat rencana distribusi.' });
  
  catatAktivitas(req.user, `Membuat rencana distribusi bantuan: ${data.judul}`);
  res.status(201).json(data);
});

// Tambah item detail (barang untuk korban tertentu) — checklist distribusi
router.post('/:id/detail', authorize('admin', 'kepala_bidang', 'petugas'), async (req, res) => {
  const { data: distribusi, error: errDist } = await supabase.from('distribusi').select('id').eq('id', req.params.id).single();
  if (errDist || !distribusi) return res.status(404).json({ message: 'Data distribusi tidak ditemukan.' });
  
  const { korban_id, logistik_id, jumlah } = req.body;
  if (!korban_id || !logistik_id || !jumlah) {
    return res.status(400).json({ message: 'Korban penerima, jenis barang, dan jumlah wajib diisi.' });
  }
  
  const { data: korban, error: errKorban } = await supabase.from('korban').select('nama').eq('id', korban_id).single();
  const { data: barang, error: errBarang } = await supabase.from('logistik').select('nama_barang, satuan').eq('id', logistik_id).single();
  
  if (errKorban || !korban) return res.status(404).json({ message: 'Data korban penerima tidak ditemukan.' });
  if (errBarang || !barang) return res.status(404).json({ message: 'Jenis barang logistik tidak ditemukan.' });

  const detail = {
    distribusi_id: distribusi.id,
    korban_id,
    korban_nama: korban.nama,
    logistik_id,
    nama_barang: barang.nama_barang,
    satuan: barang.satuan,
    jumlah: Number(jumlah)
  };
  
  const { data, error } = await supabase.from('distribusi_detail').insert([detail]).select().single();
  if (error) return res.status(500).json({ message: 'Gagal menambahkan detail distribusi.' });
  
  res.status(201).json(data);
});

router.delete('/:id/detail/:detailId', authorize('admin', 'kepala_bidang', 'petugas'), async (req, res) => {
  const { error } = await supabase.from('distribusi_detail').delete().eq('id', req.params.detailId).eq('distribusi_id', req.params.id);
  if (error) return res.status(500).json({ message: 'Gagal menghapus item checklist.' });
  res.json({ message: 'Item checklist berhasil dihapus.' });
});

// Tandai item sudah disiapkan (checklist distribusi)
router.patch('/:id/detail/:detailId/checklist', authorize('admin', 'kepala_bidang', 'petugas'), async (req, res) => {
  const { data: detail, error: errDetail } = await supabase.from('distribusi_detail').select('checklist_disiapkan').eq('id', req.params.detailId).eq('distribusi_id', req.params.id).single();
  if (errDetail || !detail) return res.status(404).json({ message: 'Item checklist tidak ditemukan.' });
  
  const { data, error } = await supabase.from('distribusi_detail').update({ checklist_disiapkan: !detail.checklist_disiapkan }).eq('id', req.params.detailId).select().single();
  if (error) return res.status(500).json({ message: 'Gagal memperbarui checklist.' });
  
  res.json(data);
});

// Tanda terima bantuan (Akuntabel — bukti serah terima)
router.patch('/:id/detail/:detailId/tanda-terima', authorize('admin', 'kepala_bidang', 'petugas'), async (req, res) => {
  const { penerima_ttd_nama } = req.body;
  const { data: detail, error: errDetail } = await supabase.from('distribusi_detail').select('*').eq('id', req.params.detailId).eq('distribusi_id', req.params.id).single();
  
  if (errDetail || !detail) return res.status(404).json({ message: 'Item checklist tidak ditemukan.' });
  if (!penerima_ttd_nama) return res.status(400).json({ message: 'Nama penerima wajib diisi untuk tanda terima.' });
  
  const payload = {
    tanda_terima_signed: true,
    penerima_ttd_nama,
    penerima_ttd_waktu: new Date().toISOString(),
    diserahkan_oleh: req.user.nama
  };
  
  const { data, error } = await supabase.from('distribusi_detail').update(payload).eq('id', req.params.detailId).select().single();
  if (error) return res.status(500).json({ message: 'Gagal mencatat tanda terima.' });
  
  res.json(data);
});

// Pindah tahap: assessment -> verifikasi -> distribusi -> pelaporan
router.patch('/:id/tahap', authorize('admin', 'kepala_bidang', 'petugas'), async (req, res) => {
  const { data: distribusi, error: errDist } = await supabase.from('distribusi').select('*').eq('id', req.params.id).single();
  if (errDist || !distribusi) return res.status(404).json({ message: 'Data distribusi tidak ditemukan.' });
  
  const { tahap } = req.body;
  const idxSekarang = TAHAPAN_DISTRIBUSI.indexOf(distribusi.tahap);
  const idxBaru = TAHAPAN_DISTRIBUSI.indexOf(tahap);
  if (idxBaru === -1) return res.status(400).json({ message: `Tahap tidak valid. Pilihan: ${TAHAPAN_DISTRIBUSI.join(', ')}` });

  // Verifikasi tahap distribusi hanya bisa dilakukan oleh admin/kepala_bidang
  if (tahap === 'verifikasi' && !['admin', 'kepala_bidang'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Hanya Kepala Bidang/Admin yang dapat memverifikasi rencana distribusi.' });
  }

  // Saat masuk tahap "distribusi": kurangi stok logistik otomatis sesuai checklist
  if (tahap === 'distribusi' && distribusi.tahap !== 'distribusi') {
    const { data: detailList } = await supabase.from('distribusi_detail').select('*').eq('distribusi_id', distribusi.id);
    const details = detailList || [];
    
    for (const d of details) {
      const { data: barang } = await supabase.from('logistik').select('*').eq('id', d.logistik_id).single();
      if (barang) {
        if (barang.stok_tersedia < d.jumlah) {
          return res.status(400).json({
            message: `Stok "${barang.nama_barang}" tidak mencukupi (tersedia ${barang.stok_tersedia} ${barang.satuan}, dibutuhkan ${d.jumlah}). Lengkapi stok terlebih dahulu.`
          });
        }
      }
    }
    for (const d of details) {
      const { data: barang } = await supabase.from('logistik').select('*').eq('id', d.logistik_id).single();
      if (barang) {
        await supabase.from('logistik').update({ stok_tersedia: barang.stok_tersedia - d.jumlah, updated_at: new Date().toISOString() }).eq('id', barang.id);
        await supabase.from('mutasi_stok').insert([{
          logistik_id: barang.id, jenis: 'keluar', jumlah: d.jumlah,
          keterangan: `Distribusi bantuan: ${distribusi.judul}`, oleh: req.user.nama
        }]);
      }
    }
  }

  const update = { tahap, updated_at: new Date().toISOString() };
  if (tahap === 'verifikasi') update.diverifikasi_oleh_nama = req.user.nama;
  if (tahap === 'distribusi') update.disalurkan_oleh_nama = req.user.nama;
  
  const { data, error } = await supabase.from('distribusi').update(update).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ message: 'Gagal memperbarui tahap distribusi.' });

  catatAktivitas(req.user, `Mengubah tahap distribusi "${distribusi.judul}" ke: ${tahap}`);
  res.json(data);
});

module.exports = router;
