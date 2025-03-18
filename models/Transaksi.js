const mongoose = require('mongoose');

const TransaksiSchema = new mongoose.Schema({
  kodeTransaksi: {
    type: String,
    required: true,
    unique: true
  },
  tanggalTransaksi: {
    type: Date,
    default: Date.now
  },
  produkDibeli: [
    {
      namaProduk : {type: String, required: true},
      qty : {type: Number, required: true},
      hargaJual : {type: Number, required: true},
      hpp: {type: Number, required: true},
    }
  ],
  metodePembayaran: {
    type: String,
    required: true
  },
  totalPembayaran: {
    type: Number,
    required: true,
  },
  margin: {
    type: Number,
    required: true,
  },
  shift: {
    type: String,
    required: true,
  }
});

module.exports = mongoose.model('Transaksi', TransaksiSchema)