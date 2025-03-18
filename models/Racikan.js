const mongoose = require('mongoose');

const RacikanSchema = new mongoose.Schema({
  produkRacikan: {
    type: [String],
    required: true,
  },
  kodeRacikan: {
    type: String,
    required: true,
  },
  namaRacikan: {
    type: String,
    required: true,
  },
  hpp: {
    type: Number,
    required: true,
  },
  hargaJual: {
    type: Number,
    required: true,
  }
});

module.exports = mongoose.model('Racikan', RacikanSchema)