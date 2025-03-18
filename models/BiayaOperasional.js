const mongoose = require('mongoose');

const biayaSchema = new mongoose.Schema({
  kategori: { type: String, required: true, unique: true },
  jumlah: { type: Number, required: true },
  bulan: { type: String, required: true },
  tahun : { type: String, required: true},
  isLocked: { type: Boolean, default: false }, // Untuk mengunci biaya yang sudah disimpan
  isCustom : {type: Boolean, default: false}
});

module.exports = mongoose.model('Biaya', biayaSchema);