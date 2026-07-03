-- Initial Schema for SIGAP BENCANA

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'kepala_bidang', 'petugas')),
    jabatan VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: bencana
CREATE TABLE bencana (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    jenis_kategori VARCHAR(50) NOT NULL CHECK (jenis_kategori IN ('alam', 'sosial')),
    jenis_bencana VARCHAR(255) NOT NULL,
    lokasi TEXT NOT NULL,
    tanggal_kejadian TIMESTAMP WITH TIME ZONE NOT NULL,
    jumlah_pengungsi INTEGER NOT NULL DEFAULT 0,
    dampak_lebih_1_kabkota BOOLEAN NOT NULL DEFAULT FALSE,
    kewenangan VARCHAR(100) NOT NULL,
    no_surat_penetapan VARCHAR(255),
    pejabat_penetapan VARCHAR(255),
    deskripsi TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'tanggap_darurat' CHECK (status IN ('tanggap_darurat', 'pasca_darurat', 'selesai')),
    tahap_ics VARCHAR(255),
    dibuat_oleh UUID REFERENCES users(id) ON DELETE SET NULL,
    dibuat_oleh_nama VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: korban
CREATE TABLE korban (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bencana_id UUID NOT NULL REFERENCES bencana(id) ON DELETE CASCADE,
    nik VARCHAR(50),
    nama VARCHAR(255) NOT NULL,
    usia INTEGER,
    jenis_kelamin VARCHAR(20) CHECK (jenis_kelamin IN ('Laki-laki', 'Perempuan')),
    alamat TEXT,
    kondisi VARCHAR(100) NOT NULL,
    jenis_bantuan_dibutuhkan TEXT,
    dibuat_oleh VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: logistik
CREATE TABLE logistik (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_barang VARCHAR(255) NOT NULL,
    kategori VARCHAR(100) NOT NULL,
    satuan VARCHAR(50) NOT NULL,
    stok_tersedia INTEGER NOT NULL DEFAULT 0,
    stok_minimum INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: mutasi_stok
CREATE TABLE mutasi_stok (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    logistik_id UUID NOT NULL REFERENCES logistik(id) ON DELETE CASCADE,
    jenis VARCHAR(50) NOT NULL CHECK (jenis IN ('masuk', 'keluar')),
    jumlah INTEGER NOT NULL CHECK (jumlah > 0),
    keterangan TEXT,
    oleh VARCHAR(255),
    waktu TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: distribusi
CREATE TABLE distribusi (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bencana_id UUID NOT NULL REFERENCES bencana(id) ON DELETE CASCADE,
    judul VARCHAR(255) NOT NULL,
    tahap VARCHAR(50) NOT NULL CHECK (tahap IN ('assessment', 'verifikasi', 'distribusi', 'pelaporan')),
    catatan TEXT,
    dibuat_oleh UUID REFERENCES users(id) ON DELETE SET NULL,
    dibuat_oleh_nama VARCHAR(255),
    diverifikasi_oleh_nama VARCHAR(255),
    disalurkan_oleh_nama VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: distribusi_detail
CREATE TABLE distribusi_detail (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    distribusi_id UUID NOT NULL REFERENCES distribusi(id) ON DELETE CASCADE,
    korban_id UUID NOT NULL REFERENCES korban(id) ON DELETE CASCADE,
    korban_nama VARCHAR(255),
    logistik_id UUID NOT NULL REFERENCES logistik(id) ON DELETE RESTRICT,
    nama_barang VARCHAR(255),
    satuan VARCHAR(50),
    jumlah INTEGER NOT NULL CHECK (jumlah > 0),
    checklist_disiapkan BOOLEAN NOT NULL DEFAULT FALSE,
    tanda_terima_signed BOOLEAN NOT NULL DEFAULT FALSE,
    penerima_ttd_nama VARCHAR(255),
    penerima_ttd_waktu TIMESTAMP WITH TIME ZONE,
    diserahkan_oleh VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: sop_dokumen
CREATE TABLE sop_dokumen (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    judul VARCHAR(255) NOT NULL,
    nomor_dokumen VARCHAR(255),
    versi VARCHAR(50),
    status VARCHAR(50) NOT NULL,
    dasar_hukum TEXT,
    tanggal_berlaku DATE,
    file_path TEXT,
    catatan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table: aktivitas
CREATE TABLE aktivitas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_nama VARCHAR(255),
    aksi TEXT NOT NULL,
    waktu TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
