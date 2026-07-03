const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../supabaseClient');
const { authenticate, authorize, JWT_SECRET } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi.' });
  }
  
  const { data: user, error } = await supabase.from('users').select('*').eq('username', username).single();
  
  if (error || !user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: 'Username atau password salah.' });
  }
  const token = jwt.sign(
    { id: user.id, nama: user.nama, role: user.role, jabatan: user.jabatan },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
  res.json({
    token,
    user: { id: user.id, nama: user.nama, username: user.username, role: user.role, jabatan: user.jabatan }
  });
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

router.post('/change-password', authenticate, async (req, res) => {
  const { password_lama, password_baru } = req.body;
  
  const { data: user, error } = await supabase.from('users').select('*').eq('id', req.user.id).single();
  
  if (error || !user || !bcrypt.compareSync(password_lama, user.password_hash)) {
    return res.status(400).json({ message: 'Password lama salah.' });
  }
  if (!password_baru || password_baru.length < 6) {
    return res.status(400).json({ message: 'Password baru minimal 6 karakter.' });
  }
  
  await supabase.from('users').update({ password_hash: bcrypt.hashSync(password_baru, 10) }).eq('id', req.user.id);
  res.json({ message: 'Password berhasil diubah.' });
});

// Manajemen akun petugas — khusus admin
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  const { data: users, error } = await supabase.from('users').select('id, nama, username, role, jabatan, created_at').order('created_at', { ascending: true });
  if (error) return res.status(500).json({ message: 'Gagal mengambil data user.' });
  res.json(users);
});

router.post('/users', authenticate, authorize('admin'), async (req, res) => {
  const { nama, username, password, role, jabatan } = req.body;
  if (!nama || !username || !password || !role) {
    return res.status(400).json({ message: 'Nama, username, password, dan role wajib diisi.' });
  }
  if (!ROLES.includes(role)) {
    return res.status(400).json({ message: `Role tidak valid. Pilihan: ${ROLES.join(', ')}` });
  }
  
  const { data: existingUser } = await supabase.from('users').select('id').eq('username', username).single();
  if (existingUser) {
    return res.status(409).json({ message: 'Username sudah digunakan.' });
  }
  
  const newUser = {
    nama, username, password_hash: bcrypt.hashSync(password, 10),
    role, jabatan: jabatan || ''
  };
  
  const { data, error } = await supabase.from('users').insert([newUser]).select('id, nama, username, role, jabatan').single();
  if (error) return res.status(500).json({ message: 'Gagal membuat user.' });
  
  res.status(201).json(data);
});

router.delete('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  if (req.user.id === req.params.id) {
    return res.status(400).json({ message: 'Tidak dapat menghapus akun yang sedang digunakan.' });
  }
  await supabase.from('users').delete().eq('id', req.params.id);
  res.json({ message: 'Akun petugas berhasil dihapus.' });
});

module.exports = router;
