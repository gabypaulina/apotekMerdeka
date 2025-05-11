require('dotenv').config()

const ExcelJS = require('exceljs')
const express = require('express')
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt');
const cors = require('cors');
const Product = require('./models/Product');
const Racikan = require('./models/Racikan');
const Resepan = require('./models/Resepan');
const Transaksi = require('./models/Transaksi');
const Supplier = require('./models/Supplier')
const Faktur = require('./models/Faktur')
const Biaya = require('./models/BiayaOperasional')
const Retur = require('./models/Retur')

const app = express();
const port = 3000;

const adminCredentials = [
  {
    password: 'yessiApotek', // Password untuk Shift1
    fullName: 'Shift1',
    role: 'karyawan-yessi'
  },
  {
    password: 'alfiapotekmerdeka', // Password untuk Shift2
    fullName: 'Shift2',
    role: 'karyawan-alfi'
  }
];

const ownerCredentials = {
  password: 'davidApotek', // Password plain text
  fullName: 'David',
  role: 'owner'
};

const auth = (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'Akses ditolak' });

  try {
    const verified = jwt.verify(token, 'jwtSecret');
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: 'Token tidak valid' });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Akses ditolak' });
    }
    next();
  };
};

app.use(cors());
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

mongoose.connect('mongodb://127.0.0.1:27017/apotekMerdeka', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB Connected'))
.catch(err => console.error('MongoDB Connection Error:', err))

// Route yang hanya bisa diakses oleh karyawan Yessi
app.get('/api/karyawan-yessi', auth, checkRole(['karyawan-yessi']), (req, res) => {
  res.json({ message: 'Halo Karyawan Yessi!' });
});

// Route yang hanya bisa diakses oleh karyawan Alfi
// app.get('/api/karyawan-alfi', auth, checkRole(['karyawan-alfi']), (req, res) => {
//   res.json({ message: 'Halo Karyawan Alfi!' });
// });

// Route yang hanya bisa diakses oleh owner
app.get('/api/owner-only', auth, checkRole(['owner']), (req, res) => {
  res.json({ message: 'Halo Owner!' });
});

// export
app.get('/api/products/export-excel', async(req, res) => {
  try {
    const products = await Product.find({}, 'kodeProduk noBatch namaProduk exp hpp hargaJual stok notifStok deskripsi')
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Produk')

    // Tambahkan header
    worksheet.columns = [
      { header: 'Kode Produk', key: 'kodeProduk', width: 15 },
      { header: 'No. Batch', key: 'noBatch', width: 15 },
      { header: 'Nama Produk', key: 'namaProduk', width: 30 },
      { header: 'EXP Date', key: 'exp', width: 15 },
      { header: 'HPP', key: 'hpp', width: 15, style: { numFmt: '#,##0' } },
      { header: 'Harga Jual', key: 'hargaJual', width: 15, style: { numFmt: '#,##0' } },
      { header: 'Stok', key: 'stok', width: 10 },
      { header: 'Notif Stok', key: 'notifStok', width: 10 },
      { header: 'Deskripsi', key: 'deskripsi', width: 40 }
    ];

    // Tambahkan data produk
    products.forEach(product => {
      worksheet.addRow({
        kodeProduk: product.kodeProduk,
        noBatch: product.noBatch,
        namaProduk: product.namaProduk,
        exp: product.exp.toISOString().split('T')[0], // Format tanggal YYYY-MM-DD
        hpp: product.hpp,
        hargaJual: product.hargaJual,
        stok: product.stok,
        notifStok: product.notifStok,
        deskripsi: product.deskripsi
      });
    });

    // Set header response untuk download file
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=daftar_produk.xlsx'
    );

    // Tulis workbook ke response
    await workbook.xlsx.write(res);
    res.end();
  }catch(err) {
    console.error('Error exporting to Excel: ', err);
    res.status(500).json({message: 'Gagal export data ke Excel', error: err.message})
  }
})

// login
app.post('/api/login', async (req, res) => {
  const { fullName, password } = req.body;
  console.log(`Login attempt with fullName: ${fullName}`);

  try {
    // Cek apakah user adalah admin
    const admin = adminCredentials.find(admin => admin.fullName === fullName);
    if (admin) {
      if (password === admin.password) { // Bandingkan password plain text
        const adminToken = jwt.sign({ id: admin.fullName, role: admin.role }, 'jwtSecret', { expiresIn: '1h' });
        return res.status(200).json({ 
          token: adminToken, 
          fullName: admin.fullName, 
          role: admin.role 
        });
      } else {
        return res.status(400).json({ message: 'Password Salah' });
      }
    }

    // Cek apakah user adalah owner
    if (fullName === ownerCredentials.fullName) {
      if (password === ownerCredentials.password) { // Bandingkan password plain text
        const ownerToken = jwt.sign({ id: ownerCredentials.fullName, role: ownerCredentials.role }, 'jwtSecret', { expiresIn: '1h' });
        return res.status(200).json({ 
          token: ownerToken, 
          fullName: ownerCredentials.fullName, 
          role: ownerCredentials.role 
        });
      } else {
        return res.status(400).json({ message: 'Password Salah' });
      }
    }

    // Jika user tidak terdaftar
    return res.status(400).json({ message: 'User tidak terdaftar' });
  } catch (err) {
    console.error('Error during login:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

//logout
const tokenBlacklist = new Set();

app.post('/api/logout', (req, res) => {
  const token = req.header('Authorization');
  if (!token) return res.status(400).json({ message: 'Token tidak ditemukan' });

  // Tambahkan token ke daftar hitam
  tokenBlacklist.add(token);

  res.status(200).json({ message: 'Logout berhasil' });
});

// Middleware untuk memeriksa token blacklist
const checkBlacklist = (req, res, next) => {
  const token = req.header('Authorization');
  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ message: 'Token tidak valid' });
  }
  next();
};

// Gunakan middleware di route yang memerlukan autentikasi
app.get('/api/protected-route', checkBlacklist, auth, (req, res) => {
  res.json({ message: 'Akses berhasil' });
});

// Get all products
app.get('/api/products', async (req,res) => {
  try{
    const products = await Product.find()
    res.status(200).json(products);
    console.log(products)
  }catch(err) {
    console.error('Error fetching produccts: ', err);
    res.status(500).json({ message: 'Server error', error: err.message})
  }
})

// Add Products
app.post('/api/addProduct', async(req,res) => {
  console.log('Request body:', req.body)
  const {kodeProduk, noBatch, namaProduk, exp, hpp, hargaJual, stok, notifStok, deskripsi} = req.body

  try {
    if(!kodeProduk || !noBatch || !namaProduk || !exp || !hpp || !hargaJual || !stok || !notifStok || !deskripsi) {
      return res.status(400).json({ message: 'Field harus diisi semua' })
    }

    const newProduct = new Product({ kodeProduk, noBatch, namaProduk, exp, hpp, hargaJual, stok, notifStok, deskripsi})
    await newProduct.save();
    
    res.status(201).json({ message: 'Produk saved successfully'})
  }catch(err) {
    console.error('Error during saving product', err);
    res.status(500).json({ message: 'Server error', error: err.message})
  }
})

// Product berdasarkan ID
app.get('/api/products/:id', async(req, res)=>{
  try{
    const products = await Product.findById(req.params.id);
    if(!products) {
      return res.status(404).json({ message: 'Produk tidak ditemukan'})
    }
    res.json(products);
  }catch(err) {
    res.status(500).json({ message: err.message })
  }
})

// Edit produk
app.put('/api/products/:id', async (req,res) => {
  try{
    const products = await Product.findById(req.params.id);
    if (!products) {
      return res.status(404).json({ message: 'Produk tidak ditemuukan'})
    }   

    products.kodeProduk = req.body.kodeProduk || products.kodeProduk
    products.noBatch = req.body.noBatch || products.noBatch
    products.namaProduk = req.body.namaProduk || products.namaProduk
    products.exp = req.body.exp || products.exp
    products.hpp = req.body.hpp || products.hpp;
    products.hargaJual = req.body.hargaJual || products.hargaJual
    products.stok = req.body.stok || products.stok
    products.notifStok = req.body.notifStok || products.notifStok
    products.deskripsi = req.body.deskripsi || products.deskripsi

    const updateProduct = await products.save()
    res.json(updateProduct)
  }catch(err) {
    res.status(400).json({ message: err.message })
  }
})

// Get All Racikan
app.get('/api/racikans', async (req,res) => {
  try{
    const racikans = await Racikan.find()
    res.status(200).json(racikans);
    console.log(racikans)
  }catch(err) {
    console.error('Error fetching racikans: ', err);
    res.status(500).json({ message: 'Server error', error: err.message})
  }
})

// Add racikan
app.post('/api/addRacikan', async (req,res) => {
  try {
    const {produkRacikan, kodeRacikan, namaRacikan, hpp, hargaJual} = req.body
    const racikan = new Racikan ({
      produkRacikan,
      kodeRacikan,
      namaRacikan,
      hpp,
      hargaJual
    });

    await racikan.save()
    res.status(201).json({ message: 'Racikan berhasil disimpan'})
  }catch(err) {
    res.status(400).json({ message: err.message})
  }
})

// Product berdasarkan ID
app.get('/api/racikans/:id', async(req, res)=>{
  try{
    const racikans = await Racikan.findById(req.params.id);
    if(!racikans) {
      return res.status(404).json({ message: 'Racikans tidak ditemukan'})
    }
    res.json(racikans);
  }catch(err) {
    res.status(500).json({ message: err.message })
  }
})

// Edit produk
app.put('/api/racikans/:id', async (req,res) => {
  try{
    const racikans = await Racikan.findById(req.params.id);
    if (!racikans) {
      return res.status(404).json({ message: 'Racikans tidak ditemuukan'})
    }
    
    racikans.produkRacikan = req.body.produkRacikan || racikans.produkRacikan || []
    racikans.kodeProduk = req.body.kodeRacikan || racikans.kodeRacikan
    racikans.namaProduk = req.body.namaRacikan || racikans.namaRacikan
    racikans.hpp = req.body.hpp || racikans.hpp;
    racikans.hargaJual = req.body.hargaJual || racikans.hargaJual

    const updateProduct = await racikans.save()
    res.json(updateProduct)
  }catch(err) {
    res.status(400).json({ message: err.message })
  }
})

// Get All Resepan
app.get('/api/resepans', async (req,res) => {
  try{
    const resepans = await Resepan.find()
    res.status(200).json(resepans);
    console.log(resepans)
  }catch(err) {
    console.error('Error fetching resepans: ', err);
    res.status(500).json({ message: 'Server error', error: err.message})
  }
})

// Add resepan
app.post('/api/addResepan', async (req,res) => {
  try {
    const {produkResepan, kodeResep, namaResep, hpp, hargaJual} = req.body
    const resepan = new Resepan ({
      produkResepan,
      kodeResep,
      namaResep,
      hpp,
      hargaJual
    });

    await resepan.save()
    res.status(201).json({ message: 'Resepan berhasil disimpan'})
  }catch(err) {
    res.status(400).json({ message: err.message})
  }
})

// Resep berdasarkan ID
app.get('/api/resepans/:id', async (req, res) => {
  try {
    const resepans = await Resepan.findById(req.params.id).populate({
      path: 'produkResepan.produk', // Path yang benar untuk populate
      model: 'Product' // Model yang dituju
    });
    if (!resepans) {
      return res.status(404).json({ message: 'Resepan tidak ditemukan' });
    }
    res.json(resepans);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Edit resep
app.put('/api/resepans/:id', async (req, res) => {
  try {
    const resepans = await Resepan.findById(req.params.id);
    if (!resepans) {
      return res.status(404).json({ message: 'Resepan tidak ditemukan' });
    }

    resepans.produkResepan = req.body.produkResepan || resepans.produkResepan || [];
    resepans.kodeResep = req.body.kodeResep || resepans.kodeResep;
    resepans.namaResep = req.body.namaResep || resepans.namaResep;
    resepans.hpp = req.body.hpp || resepans.hpp;
    resepans.hargaJual = req.body.hargaJual || resepans.hargaJual;

    const updatedResepan = await resepans.save();
    res.json(updatedResepan);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all product racikan resepan 
app.get('/api/allProduct', async (req, res) => {
  try{
    const products = await Product.find({}, 'namaProduk stok exp kodeProduk hargaJual hpp noBatch')
    const racikans = await Racikan.find({}, 'namaRacikan kodeRacikan hargaJual hpp')
    const resepans = await Resepan.find({}, 'namaResep kodeResep hargaJual hpp')

    const combinedData = {
      products,
      racikans,
      resepans
    }

    res.json(combinedData)
  }catch (error) {
    res.status(500).json({ message: error.message })
  }
})

// Add transaksi
app.post('/api/saveTransaction', async (req, res) => {
  const {
    kodeTransaksi,
    produkDibeli,
    metodePembayaran,
    totalPembayaran,
    shift
  } = req.body;

  try {
    // Validasi data
    if (!kodeTransaksi || !produkDibeli || !metodePembayaran || !totalPembayaran || !shift) {
      return res.status(400).json({ message: 'Semua field harus diisi' });
    }

    // Hitung margin
    let totalMargin = 0;

    // Loop melalui setiap produk yang dibeli
    for (const produk of produkDibeli) {
      const marginPerProduk =
        produk.qty * (((produk.hargaJual - produk.hpp) / produk.hargaJual) * 100);
      totalMargin += marginPerProduk;

      // Tentukan jenis produk berdasarkan field yang ada
      let type = 'product'; // Default ke produk biasa
      const racikan = await Racikan.findById(produk._id);
      const resepan = await Resepan.findById(produk._id);

      if (racikan) {
        type = 'racikan';
      } else if (resepan) {
        type = 'resep';
      }

      console.log('Jenis produk:', type);

      // Kurangi stok berdasarkan jenis produk
      if (type === 'racikan') {
        console.log('Produk adalah racikan');

        // Cari racikan berdasarkan ID
        if (!racikan) {
          console.error('Racikan tidak ditemukan:', produk._id);
          return res.status(404).json({ message: 'Racikan tidak ditemukan' });
        }

        console.log('Racikan ditemukan:', racikan);

        // Kurangi stok produk yang ada di racikan
        for (const produkId of racikan.produkRacikan) {
          console.log('Mencari produk dengan ID:', produkId);

          const produkBiasa = await Product.findById(produkId);
          if (!produkBiasa) {
            console.error('Produk tidak ditemukan:', produkId);
            return res.status(404).json({ message: `Produk ${produkId} tidak ditemukan` });
          }

          console.log('Produk ditemukan:', produkBiasa);

          produkBiasa.stok -= produk.qty; // Kurangi stok sesuai qty racikan
          await produkBiasa.save();
          console.log('Stok produk berkurang:', produkBiasa.kodeProduk, produkBiasa.stok);
        }
      } else if (type === 'resep') {
        console.log('Produk adalah resep');

        // Cari resepan berdasarkan ID
        if (!resepan) {
          console.error('Resepan tidak ditemukan:', produk._id);
          return res.status(404).json({ message: 'Resepan tidak ditemukan' });
        }

        console.log('Resepan ditemukan:', resepan);

        // Kurangi stok produk yang ada di resepan
        for (const produkResepan of resepan.produkResepan) {
          const produkBiasa = await Product.findById(produkResepan.produk);
          if (!produkBiasa) {
            console.error('Produk tidak ditemukan:', produkResepan.produk);
            return res.status(404).json({ message: `Produk ${produkResepan.produk} tidak ditemukan` });
          }

          console.log('Produk ditemukan:', produkBiasa);

          produkBiasa.stok -= produkResepan.quantity * produk.qty; // Kurangi stok sesuai qty resepan
          await produkBiasa.save();
          console.log('Stok produk berkurang:', produkBiasa.kodeProduk, produkBiasa.stok);
        }
      } else {
        console.log('Produk adalah produk biasa');

        // Jika produk biasa, kurangi stok langsung
        const produkBiasa = await Product.findById(produk._id);
        if (!produkBiasa) {
          console.error('Produk tidak ditemukan:', produk._id);
          return res.status(404).json({ message: `Produk ${produk._id} tidak ditemukan` });
        }

        console.log('Produk ditemukan:', produkBiasa);

        produkBiasa.stok -= produk.qty;
        await produkBiasa.save();
        console.log('Stok produk berkurang:', produkBiasa.kodeProduk, produkBiasa.stok);
      }
    }

    // Buat transaksi baru
    const newTransaction = new Transaksi({
      kodeTransaksi,
      produkDibeli,
      metodePembayaran,
      totalPembayaran,
      margin: totalMargin,
      shift
    });

    // Simpan ke database
    await newTransaction.save();

    res.status(201).json({ message: 'Transaksi berhasil disimpan' });
  } catch (err) {
    console.error('Error saving transaction:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// all transaksi
app.get('/api/transactions', async (req, res) => {
  const { shift, startDate, endDate } = req.query; // Ambil query parameter

  try {
    // Buat query filter berdasarkan shift dan range tanggal
    const query = {};

    if (shift) {
      query.shift = shift; // Filter berdasarkan shift
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Set waktu endDate ke akhir hari

      query.tanggalTransaksi = {
        $gte: start, // Tanggal mulai (termasuk tanggal ini)
        $lte: end,   // Tanggal akhir (termasuk tanggal ini)
      };
    }

    // Ambil data transaksi dengan filter
    const transactions = await Transaksi.find(query).sort({ tanggalTransaksi: -1 });
    res.status(200).json(transactions);
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// get all suppliers
app.get('/api/suppliers', async (req, res) => {
  try {
    const suppliers = await Supplier.find();
    res.status(200).json(suppliers);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// tambah supplier
app.post('/api/suppliers', async (req, res) => {
  const { nama, noHp } = req.body;
  console.log('Data yang diterima:', { nama, noHp }); // Debugging

  try {
    if (!nama || !noHp) {
      return res.status(400).json({ message: 'Nama dan No. HP harus diisi' });
    }

    const kode = `SUP-${Math.floor(Math.random() * 1000)}`; // Generate kode supplier otomatis
    const newSupplier = new Supplier({ kode, nama, noHp });
    await newSupplier.save();
    console.log('Supplier berhasil disimpan:', newSupplier); // Debugging

    res.status(201).json({ message: 'Supplier berhasil ditambahkan', supplier: newSupplier });
  } catch (err) {
    console.error('Error saat menyimpan supplier:', err); // Debugging
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// get all fakturs
app.get('/api/fakturs', async (req, res) => {
  try {
    const fakturs = await Faktur.find();
    res.status(200).json(fakturs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// tambah faktur
app.post('/api/fakturs', async (req, res) => {
  console.log("Data yang diterima dari frontend:", req.body); // Debugging

  const {
    kodePembelian, // Kode dari frontend
    tanggalBeli,
    kodeSupplier,
    noFakturAsli,
    metodePembelian,
    tanggalPelunasan,
    produk,
    totalPembelian,
    uangMuka,
    hutang,
    tanggalKirim,
    tanggalBayar
  } = req.body;

  try {
    // Validasi data
    if (
      !kodePembelian ||
      !tanggalBeli ||
      !kodeSupplier ||
      !noFakturAsli ||
      !metodePembelian ||
      !produk ||
      !totalPembelian ||
      !tanggalKirim
    ) {
      return res.status(400).json({ message: 'Semua field wajib harus diisi' });
    }

    // Buat objek faktur baru
    const newFaktur = new Faktur({
      kodePembelian, // Gunakan kode dari frontend
      tanggalBeli,
      kodeSupplier,
      noFakturAsli,
      metodePembelian,
      tanggalPelunasan: metodePembelian === "kredit" ? tanggalPelunasan : null,
      tanggalBayar: null,
      produk,
      totalPembelian,
      uangMuka: metodePembelian === "cash" ? totalPembelian : uangMuka || 0,
      hutang: metodePembelian === "cash" ? 0 : hutang || totalPembelian - (uangMuka || 0),
      tanggalKirim,
      statusPembayaran: metodePembelian === "cash" ? "lunas" : "belum lunas",
    });

    // Simpan faktur ke database
    await newFaktur.save();

    res.status(201).json({ message: 'Faktur berhasil ditambahkan', faktur: newFaktur });
  } catch (err) {
    console.error('Error menyimpan faktur:', err); // Debugging
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Endpoint untuk Produk faktur
app.get('/api/produk', async (req, res) => {
  try {
    const produk = await Product.find();
    res.status(200).json(produk);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// tambah produk faktur
app.post('/api/produk', async (req, res) => {
  const { kode, nama, noBatch, harga, qty, disc1, disc2, disc3, ppn } = req.body;

  try {
    if (!kode || !nama || !harga || !noBatch || !qty) {
      return res.status(400).json({ message: 'Field wajib harus diisi' });
    }

    const newProduk = new Product({ kode, nama, harga, noBatch, qty, disc1, disc2, disc3, ppn });
    await newProduk.save();

    res.status(201).json({ message: 'Produk berhasil ditambahkan', produk: newProduk });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// get all biaya
app.get("/api/biaya", async (req, res) => {
  try {
    const biayaList = await Biaya.find();
    res.json(biayaList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// tambah biaya
app.post("/api/biaya", async (req, res) => {
  const { kategori, jumlah, bulan, tahun, isCustom } = req.body;

  // Validasi input
  if (!kategori || !jumlah || !bulan || !tahun) {
    return res.status(400).json({ message: "Semua field (kategori, jumlah, bulan, tahun) harus diisi." });
  }

  try {
    // Cek apakah biaya dengan kategori, bulan, dan tahun yang sama sudah ada
    const existingBiaya = await Biaya.findOne({ kategori, bulan, tahun });

    if (existingBiaya) {
      return res.status(400).json({ message: `Biaya ${kategori} sudah ada untuk bulan ${bulan} tahun ${tahun}.` });
    }

    // Simpan biaya baru
    const newBiaya = new Biaya({ kategori, jumlah, bulan, tahun, isCustom });
    await newBiaya.save();

    res.status(201).json(newBiaya);
  } catch (error) {
    console.error("Error saving biaya:", error);
    res.status(400).json({ message: error.message });
  }
});app.post("/api/biaya", async (req, res) => {
  const { kategori, jumlah, bulan, isCustom } = req.body;

  if (!kategori || !jumlah || !bulan) {
    return res.status(400).json({ message: "Semua field (kategori, jumlah, bulan) harus diisi." });
  }

  try {
    const existingBiaya = await Biaya.findOne({ kategori, bulan });

    if (existingBiaya) {
      return res.status(400).json({ message: `Biaya ${kategori} sudah ada untuk bulan ${bulan}.` });
    }

    const newBiaya = new Biaya({ kategori, jumlah, bulan, isCustom, isLocked: isCustom });
    await newBiaya.save();
    res.status(201).json(newBiaya);
  } catch (error) {
    console.error("Error saving biaya:", error);
    res.status(400).json({ message: error.message });
  }
});

// edit biaya
app.put("/api/biaya/lock/:id", async (req, res) => {
  try {
    const biayaId = req.params.id;
    console.log("Received Biaya ID:", biayaId); // Log the _id

    const biaya = await Biaya.findById(biayaId);
    if (!biaya) {
      return res.status(404).json({ message: "Biaya tidak ditemukan." });
    }

    biaya.isLocked = true;
    await biaya.save();
    res.json(biaya);
  } catch (error) {
    console.error("Error locking biaya:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get all utang
app.get('/api/utang', async (req, res) => {
  try {
    // Ambil data faktur yang memiliki status "belum lunas"
    const fakturs = await Faktur.find({ statusPembayaran: "belum lunas" });
    res.status(200).json(fakturs);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// pelunasan utang
app.put('/api/pembelian/lunasi/:kodePembelian', async (req, res) => {
  try {
    const { kodePembelian } = req.params;

    // Cari faktur berdasarkan kode pembelian
    const faktur = await Faktur.findOne({ kodePembelian });
    if (!faktur) {
      return res.status(404).json({ message: "Faktur tidak ditemukan" });
    }

    // Update status pembayaran dan tambahkan tanggal bayar
    faktur.statusPembayaran = "lunas";
    faktur.tanggalBayar = new Date(); // Simpan tanggal saat ini sebagai tanggal bayar
    faktur.hutang = 0; // Set hutang menjadi 0
    await faktur.save();

    res.status(200).json({ message: "Utang berhasil dilunasi", faktur });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Endpoint untuk menghitung laba rugi
app.get('/api/laba-rugi', async (req, res) => {
  const { startDate, endDate } = req.query; // Ambil query parameter untuk range tanggal

  try {
    // Validasi input
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Tanggal mulai dan tanggal akhir harus diisi' });
    }

    // Konversi tanggal ke format Date
    const start = new Date(startDate);
    const end = new Date(endDate);

    // Set waktu endDate ke akhir hari (23:59:59) untuk memastikan transaksi pada tanggal tersebut termasuk
    end.setHours(23, 59, 59, 999);

    // Ambil semua transaksi dalam range tanggal tertentu
    const transactions = await Transaksi.find({
      tanggalTransaksi: {
        $gte: start, // Tanggal mulai (termasuk tanggal ini)
        $lte: end,   // Tanggal akhir (termasuk tanggal ini)
      },
    });

    // Hitung total penjualan (dikelompokkan berdasarkan metode pembayaran)
    let totalPenjualanCash = 0;
    let totalPenjualanQRIS = 0;

    // Hitung total HPP
    let totalHPP = 0;

    transactions.forEach((transaction) => {
      // Kelompokkan total penjualan berdasarkan metode pembayaran
      if (transaction.metodePembayaran === "CASH") {
        totalPenjualanCash += transaction.totalPembayaran || 0;
      } else if (transaction.metodePembayaran === "QRIS") {
        totalPenjualanQRIS += transaction.totalPembayaran || 0;
      }

      // Hitung total HPP dari produk yang terjual
      transaction.produkDibeli.forEach((produk) => {
        totalHPP += (produk.hpp || 0) * (produk.qty || 0);
      });
    });

    // Hitung total penjualan keseluruhan
    const totalPenjualan = totalPenjualanCash + totalPenjualanQRIS;

    // Hitung laba rugi
    const labaRugi = totalPenjualan - totalHPP;

    // Kirim respons ke frontend
    res.status(200).json({
      totalPenjualan, // Total penjualan keseluruhan
      totalPenjualanCash,
      totalPenjualanQRIS,
      totalHPP,
      labaRugi,
    });
  } catch (err) {
    console.error('Error calculating laba rugi:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Endpoint untuk menghitung TOP SALE
app.get('/api/top-sale', async (req, res) => {
  const { startDate, endDate } = req.query; // Ambil query parameter untuk range tanggal

  try {
    let query = {};

    // Jika ada range tanggal, filter berdasarkan range tanggal
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Set waktu endDate ke akhir hari

      query.tanggalTransaksi = {
        $gte: start,
        $lte: end,
      };
    } else {
      // Jika tidak ada range tanggal, filter berdasarkan bulan berjalan
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endOfMonth.setHours(23, 59, 59, 999);

      query.tanggalTransaksi = {
        $gte: startOfMonth,
        $lte: endOfMonth,
      };
    }

    // Ambil semua transaksi dalam range tanggal tertentu
    const transactions = await Transaksi.find(query);

    // Hitung jumlah terjual per produk
    const productSales = {};

    transactions.forEach((transaction) => {
      transaction.produkDibeli.forEach((produk) => {
        const productId = produk._id;
        const productName = produk.namaProduk || produk.namaRacikan || produk.namaResep;
        const qty = produk.qty || 0;

        if (productSales[productId]) {
          productSales[productId].qty += qty;
        } else {
          productSales[productId] = {
            namaProduk: productName,
            qty: qty,
          };
        }
      });
    });

    // Ubah ke array dan urutkan berdasarkan jumlah terjual (descending)
    const topSales = Object.values(productSales).sort((a, b) => b.qty - a.qty);

    // Kirim respons ke frontend
    res.status(200).json(topSales);
  } catch (err) {
    console.error('Error calculating top sale:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Endpoint untuk menghitung profit bersih per bulan
app.get('/api/profit-bersih', async (req, res) => {
  const { bulan, tahun } = req.query;

  // Validasi input
  if (!bulan || !tahun) {
    return res.status(400).json({ message: "Bulan dan tahun harus diisi." });
  }

  try {
    // Hitung laba kotor
    const labaKotor = await calculateLabaKotor(bulan, tahun);

    // Hitung total utang
    const totalUtang = await calculateTotalUtang(bulan, tahun);

    // Hitung total biaya operasional
    const totalBiayaOperasional = await calculateTotalBiayaOperasional(bulan, tahun);

    // Hitung profit bersih
    const profitBersih = labaKotor - totalUtang - totalBiayaOperasional;

    // Kirim respons ke frontend
    res.json({
      labaKotor,
      totalUtang,
      totalBiayaOperasional,
      profitBersih,
    });
  } catch (error) {
    console.error("Error calculating profit:", error);
    res.status(500).json({ message: "Gagal menghitung profit. Silakan coba lagi." });
  }
});

// Fungsi untuk menghitung laba kotor
const calculateLabaKotor = async (bulan, tahun) => {
  try {
    // Ambil semua transaksi dalam bulan dan tahun tertentu
    const transactions = await Transaksi.find({
      tanggalTransaksi: {
        $gte: new Date(`${tahun}-${bulan}-01`), // Mulai dari tanggal 1 bulan tersebut
        $lt: new Date(`${tahun}-${parseInt(bulan) + 1}-01`), // Sampai tanggal 1 bulan berikutnya
      },
    });

    // Hitung laba kotor
    let labaKotor = 0;
    transactions.forEach((transaction) => {
      // Pastikan margin dihitung dengan benar
      const margin = transaction.totalPembayaran - transaction.produkDibeli.reduce((sum, produk) => {
        return sum + (produk.hpp || 0) * (produk.qty || 0);
      }, 0);
      labaKotor += margin;
    });

    return labaKotor;
  } catch (error) {
    console.error("Error calculating laba kotor:", error);
    throw error;
  }
};

// Fungsi untuk menghitung total utang
const calculateTotalUtang = async (bulan, tahun) => {
  try {
    // Ambil semua faktur yang belum lunas dalam bulan dan tahun tertentu
    const fakturs = await Faktur.find({
      statusPembayaran: "belum lunas",
      tanggalBeli: {
        $gte: new Date(`${tahun}-${bulan}-01`),
        $lt: new Date(`${tahun}-${parseInt(bulan) + 1}-01`),
      },
    });

    // Hitung total utang
    let totalUtang = 0;
    fakturs.forEach((faktur) => {
      totalUtang += faktur.hutang || 0;
    });

    return totalUtang;
  } catch (error) {
    console.error("Error calculating total utang:", error);
    throw error;
  }
};

// Fungsi untuk menghitung total biaya operasional
const calculateTotalBiayaOperasional = async (bulan, tahun) => {
  try {
    // Konversi bulan dari angka ke nama bulan (misalnya, 3 -> "March")
    const monthName = getMonthName(parseInt(bulan));

    // Ambil semua biaya operasional dalam bulan dan tahun tertentu
    const biayaList = await Biaya.find({
      bulan: monthName, // Gunakan nama bulan
      tahun: tahun.toString(), // Pastikan tahun sesuai format
    });

    console.log("Biaya List dari Database:", biayaList); // Debugging

    // Hitung total biaya operasional
    let totalBiayaOperasional = 0;
    biayaList.forEach((biaya) => {
      totalBiayaOperasional += biaya.jumlah || 0;
    });

    return totalBiayaOperasional;
  } catch (error) {
    console.error("Error calculating total biaya operasional:", error);
    throw error;
  }
};

const getMonthName = (monthNumber) => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return months[monthNumber - 1]; // Array dimulai dari 0, jadi kurangi 1
};

app.get("/api/retur/last", async (req, res) => {
  try {
    const lastRetur = await Retur.findOne().sort({ noRetur: -1 });
    const lastNoRetur = lastRetur ? lastRetur.noRetur : "RTR000";
    res.status(200).json({ lastNoRetur });
  } catch (error) {
    console.error("Error fetching last retur:", error);
    res.status(500).json({ message: "Gagal mengambil nomor retur terakhir." });
  }
});

// add retur
app.post("/api/retur", async (req, res) => {
  const {
    noRetur,
    namaProduk,
    qtyKadaluarsa,
    namaSupplier,
    alasanRetur,
    noBatch,
    expDate,
    noFakturAsli,
    tanggalFaktur,
  } = req.body;

  // Validasi input
  if (
    !noRetur ||
    !namaProduk ||
    !qtyKadaluarsa ||
    !namaSupplier ||
    !alasanRetur ||
    !noBatch ||
    !expDate ||
    !noFakturAsli ||
    !tanggalFaktur
  ) {
    return res.status(400).json({ message: "Semua field harus diisi." });
  }

  try {
    // Buat retur baru
    const newRetur = new Retur({
      noRetur,
      namaProduk,
      qtyKadaluarsa,
      namaSupplier,
      alasanRetur,
      noBatch,
      expDate,
      noFakturAsli,
      tanggalFaktur,
    });

    // Simpan ke database
    await newRetur.save();

    res.status(201).json(newRetur);
  } catch (error) {
    console.error("Error saving retur:", error);
    res.status(500).json({ message: "Gagal menyimpan retur." });
  }
});

// Endpoint untuk mengambil semua data retur
app.get("/api/retur", async (req, res) => {
  try {
    const returList = await Retur.find();
    res.status(200).json(returList);
  } catch (error) {
    console.error("Error fetching retur:", error);
    res.status(500).json({ message: "Gagal mengambil data retur." });
  }
});

// get faktur querry kodeSupplier
app.get("/api/faktur", async (req, res) => {
  const { kodeSupplier } = req.query;

  try {
    const fakturs = await Faktur.find({ kodeSupplier });
    res.status(200).json(fakturs);
  } catch (error) {
    console.error("Error fetching fakturs:", error);
    res.status(500).json({ message: "Gagal mengambil data faktur." });
  }
});


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
})