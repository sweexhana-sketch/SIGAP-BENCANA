const express = require('express');
const multer = require('multer');
const path = require('path');
const supabase = require('../supabaseClient');
const { authenticate, authorize } = require('../middleware/auth');
const { catatAktivitas } = require('../utils/log');

const router = express.Router();
router.use(authenticate);

// Menggunakan memory storage karena kita akan melemparnya ke Supabase Storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['.pdf', '.doc', '.docx'].includes(path.extname(file.originalname).toLowerCase());
    cb(ok ? null : new Error('Hanya file PDF/DOC/DOCX yang diperbolehkan.'), ok);
  }
});

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('sop_dokumen').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ message: 'Gagal mengambil data SOP.' });
  res.json(data);
});

router.post('/', authorize('admin', 'kepala_bidang', 'petugas'), upload.single('file'), async (req, res) => {
  const { judul, nomor_dokumen, versi, dasar_hukum, catatan } = req.body;
  if (!judul || !versi) return res.status(400).json({ message: 'Judul dan versi dokumen wajib diisi.' });
  
  let filePath = null;
  
  // Jika ada file yang diupload, kirim ke Supabase Storage bucket 'sop-dokumen'
  if (req.file) {
    const fileName = `${Date.now()}-${req.file.originalname.replace(/\s+/g, '_')}`;
    const { data: storageData, error: storageError } = await supabase.storage
      .from('sop-dokumen')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype
      });
      
    if (storageError) {
      console.error('Storage Error:', storageError);
      // Fallback: biarkan null atau lemparkan error
      // return res.status(500).json({ message: 'Gagal mengupload file dokumen.' });
    } else {
      // Dapatkan public URL
      const { data: publicUrlData } = supabase.storage.from('sop-dokumen').getPublicUrl(fileName);
      filePath = publicUrlData.publicUrl;
    }
  }

  const item = {
    judul,
    nomor_dokumen: nomor_dokumen || '',
    versi,
    dasar_hukum: dasar_hukum || 'Permensos No. 9 Tahun 2018',
    status: 'draft',
    tanggal_berlaku: null,
    file_path: filePath,
    catatan: catatan || ''
  };
  
  const { data, error } = await supabase.from('sop_dokumen').insert([item]).select().single();
  if (error) return res.status(500).json({ message: 'Gagal menyimpan dokumen SOP.' });
  
  catatAktivitas(req.user, `Mengunggah dokumen SOP: ${judul} (v${versi})`);
  res.status(201).json(data);
});

// Sahkan / finalisasi SOP — sesuai Kegiatan 5 rancangan aktualisasi (Finalisasi & Sosialisasi)
router.patch('/:id/sahkan', authorize('admin', 'kepala_bidang'), async (req, res) => {
  const { data: item, error: errItem } = await supabase.from('sop_dokumen').select('*').eq('id', req.params.id).single();
  if (errItem || !item) return res.status(404).json({ message: 'Dokumen SOP tidak ditemukan.' });
  
  const { data, error } = await supabase.from('sop_dokumen').update({
    status: 'final',
    tanggal_berlaku: new Date().toISOString()
  }).eq('id', req.params.id).select().single();
  
  if (error) return res.status(500).json({ message: 'Gagal mengesahkan dokumen SOP.' });
  
  catatAktivitas(req.user, `Mengesahkan dokumen SOP: ${item.judul}`);
  res.json(data);
});

router.delete('/:id', authorize('admin', 'kepala_bidang'), async (req, res) => {
  const { data: item, error: errItem } = await supabase.from('sop_dokumen').select('*').eq('id', req.params.id).single();
  if (errItem || !item) return res.status(404).json({ message: 'Dokumen SOP tidak ditemukan.' });
  
  // Hapus dari database
  await supabase.from('sop_dokumen').delete().eq('id', req.params.id);
  
  // Opsional: Hapus file fisiknya dari Storage jika ada
  if (item.file_path && item.file_path.includes('sop-dokumen')) {
    try {
      const urlParts = item.file_path.split('/');
      const fileName = urlParts[urlParts.length - 1];
      await supabase.storage.from('sop-dokumen').remove([fileName]);
    } catch(e) {}
  }
  
  catatAktivitas(req.user, `Menghapus dokumen SOP: ${item.judul}`);
  res.json({ message: 'Dokumen SOP berhasil dihapus.' });
});

module.exports = router;
