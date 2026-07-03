const supabase = require('../supabaseClient');

async function catatAktivitas(user, keterangan) {
  try {
    const { error } = await supabase.from('aktivitas').insert([{
      user_id: user.id,
      user_nama: user.nama,
      aksi: keterangan
    }]);
    if (error) console.error('Gagal mencatat aktivitas (Supabase):', error);
  } catch (err) {
    console.error('Gagal mencatat aktivitas:', err);
  }
}

module.exports = { catatAktivitas };
