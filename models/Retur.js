const mongoose = require("mongoose");

const returSchema = new mongoose.Schema({
  noRetur: { type: String, required: true, unique: true }, // Nomor retur
  namaProduk: { type: String, required: true }, // Nama produk yang diretur
  qtyKadaluarsa: { type: Number, required: true }, // Jumlah produk yang kadaluarsa
  namaSupplier: { type: String, required: true }, // Nama supplier
  alasanRetur: { type: String, required: true }, // Alasan retur
  noBatch: { type: String, required: true }, // Nomor batch produk
  expDate: { type: Date, required: true }, // Tanggal kadaluarsa
  noFakturAsli: { type: String, required: true }, // Nomor faktur asli
  tanggalRetur: { type: Date, default: Date.now }, // Tanggal retur
  tanggalFaktur: { type: Date, required: true }, // Tanggal faktur (barang datang)
});

module.exports = mongoose.model("Retur", returSchema);