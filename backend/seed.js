// seed.js — Menyiapkan akun awal dan data referensi untuk Supabase
// Jalankan: node seed.js

const bcrypt = require('bcryptjs');
const supabase = require('./supabaseClient');

async function seed() {
  console.log('Memulai proses seeding...');

  // 1. Seed Users
  const { data: existingUsers, error: errUsers } = await supabase.from('users').select('id');
  if (errUsers) {
    console.error('Gagal mengecek tabel users:', errUsers);
    return;
  }
  
  if (existingUsers.length === 0) {
    const users = [
      {
        nama: 'Admin Sistem',
        username: 'admin',
        password_hash: bcrypt.hashSync('admin123', 10),
        role: 'admin',
        jabatan: 'Administrator Sistem'
      },
      {
        nama: 'Kepala Bidang Perlindungan dan Jaminan Sosial',
        username: 'kabid',
        password_hash: bcrypt.hashSync('kabid123', 10),
        role: 'kepala_bidang',
        jabatan: 'Kepala Bidang Perlindungan dan Jaminan Sosial'
      },
      {
        nama: 'Feronika Konjol, S.Sos.',
        username: 'feronika',
        password_hash: bcrypt.hashSync('petugas123', 10),
        role: 'petugas',
        jabatan: 'Penyuluh Sosial Ahli Pertama'
      }
    ];
    
    const { error } = await supabase.from('users').insert(users);
    if (error) {
      console.error('Gagal insert users:', error);
    } else {
      console.log('✔ Akun awal berhasil dibuat:');
      console.log('  admin    / admin123     (Administrator)');
      console.log('  kabid    / kabid123     (Kepala Bidang - approval)');
      console.log('  feronika / petugas123   (Petugas Lapangan)');
    }
  } else {
    console.log('ℹ Data users sudah ada, dilewati.');
  }

  // 2. Seed Logistik
  const { data: existingLogistik } = await supabase.from('logistik').select('id');
  if (existingLogistik && existingLogistik.length === 0) {
    const barang = [
      { nama_barang: 'Beras', kategori: 'Permakanan', satuan: 'kg', stok_tersedia: 2000, stok_minimum: 300 },
      { nama_barang: 'Mi Instan', kategori: 'Permakanan', satuan: 'dus', stok_tersedia: 150, stok_minimum: 30 },
      { nama_barang: 'Air Mineral', kategori: 'Permakanan', satuan: 'dus', stok_tersedia: 300, stok_minimum: 50 },
      { nama_barang: 'Selimut', kategori: 'Sandang', satuan: 'lembar', stok_tersedia: 400, stok_minimum: 100 },
      { nama_barang: 'Pakaian Layak Pakai', kategori: 'Sandang', satuan: 'paket', stok_tersedia: 250, stok_minimum: 50 },
      { nama_barang: 'Tenda Pengungsi', kategori: 'Shelter', satuan: 'unit', stok_tersedia: 20, stok_minimum: 5 },
      { nama_barang: 'Terpal', kategori: 'Shelter', satuan: 'lembar', stok_tersedia: 100, stok_minimum: 20 },
      { nama_barang: 'Kit Kebersihan (Hygiene Kit)', kategori: 'Perbekalan Kesehatan', satuan: 'paket', stok_tersedia: 300, stok_minimum: 50 },
      { nama_barang: 'Obat-obatan Umum', kategori: 'Perbekalan Kesehatan', satuan: 'paket', stok_tersedia: 100, stok_minimum: 20 },
      { nama_barang: 'Perlengkapan Bayi/Balita', kategori: 'Kelompok Rentan', satuan: 'paket', stok_tersedia: 80, stok_minimum: 15 }
    ];
    
    const { error } = await supabase.from('logistik').insert(barang);
    if (error) console.error('Gagal insert logistik:', error);
    else console.log('✔ Data referensi stok logistik awal berhasil dibuat.');
  } else {
    console.log('ℹ Data logistik sudah ada, dilewati.');
  }

  // 3. Seed SOP Dokumen
  const { data: existingSop } = await supabase.from('sop_dokumen').select('id');
  if (existingSop && existingSop.length === 0) {
    const { error } = await supabase.from('sop_dokumen').insert([{
      judul: 'SOP Pelayanan Tanggap Darurat dan Distribusi Bantuan Logistik Bagi Korban Bencana',
      nomor_dokumen: 'SOP/DINSOS-PPPA/PBD/2026/001',
      versi: '1.0',
      status: 'draft',
      dasar_hukum: 'Permensos No. 9 Tahun 2018 tentang Standar Teknis Pelayanan Dasar pada SPM Bidang Sosial',
      tanggal_berlaku: null,
      file_path: null,
      catatan: 'Draft awal disusun melalui aktualisasi SIGAP BENCANA'
    }]);
    if (error) console.error('Gagal insert SOP:', error);
    else console.log('✔ Dokumen SOP awal (draft) berhasil dibuat.');
  }

  // 4. Create Storage Bucket for SOP (jika belum ada)
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets && buckets.some(b => b.name === 'sop-dokumen');
    
    if (!bucketExists) {
      const { error } = await supabase.storage.createBucket('sop-dokumen', { public: true });
      if (error) console.error('Gagal membuat bucket sop-dokumen:', error);
      else console.log('✔ Bucket Storage "sop-dokumen" berhasil dibuat.');
    } else {
      console.log('ℹ Bucket Storage "sop-dokumen" sudah ada.');
    }
  } catch (e) {
    console.log('⚠ Gagal mengecek/membuat bucket via API (biasanya butuh service_role key untuk buat bucket). Buat manual di dashboard jika perlu.');
  }

  console.log('Proses seeding selesai.');
  process.exit(0);
}

seed();
