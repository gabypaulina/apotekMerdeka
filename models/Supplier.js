const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  kode: { type: String, required: true, unique: true },
  nama: { type: String, required: true },
  noHp: { type: String, required: true },
});

module.exports = mongoose.model('Supplier', supplierSchema);