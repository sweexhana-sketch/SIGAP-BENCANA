const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Pastikan folder pendukung ada
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

app.use('/uploads', express.static(uploadsDir));

// ---- API Routes ----
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bencana', require('./routes/bencana'));
app.use('/api/korban', require('./routes/korban'));
app.use('/api/logistik', require('./routes/logistik'));
app.use('/api/distribusi', require('./routes/distribusi'));
app.use('/api/sop', require('./routes/sop'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', sistem: 'SIGAP BENCANA', waktu: new Date().toISOString() });
});

// ---- Frontend statis ----
const frontendDir = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendDir));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// ---- Penanganan error terpusat ----
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Terjadi kesalahan pada server.' });
});

app.listen(PORT, () => {
  console.log('==================================================');
  console.log(' SIGAP BENCANA — Sistem Informasi SOP Pelayanan');
  console.log(' Tanggap Darurat & Distribusi Bantuan Logistik');
  console.log(' Dinas Sosial, PPPA Provinsi Papua Barat Daya');
  console.log('==================================================');
  console.log(` Server berjalan di: http://localhost:${PORT}`);
  console.log('==================================================');
});
