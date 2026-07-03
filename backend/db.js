// db.js — Lapisan data (JSON file store via lowdb)
// Catatan produksi: untuk beban multi-user tinggi, ganti adapter ini dengan
// PostgreSQL/MySQL (struktur tabel sudah dirancang relasional, tinggal migrasi).

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, 'data', 'db.json'));
const db = low(adapter);

db.defaults({
  users: [],
  bencana: [],
  korban: [],
  logistik: [],
  mutasi_stok: [],
  distribusi: [],
  distribusi_detail: [],
  sop_dokumen: [],
  aktivitas: []
}).write();

module.exports = db;
