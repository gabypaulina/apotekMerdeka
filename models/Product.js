const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  kodeProduk: {
    type: String,
    required: true,
  },
  noBatch: {
    type: String,
    required: true,
  },
  namaProduk: {
    type: String,
    required: true,
  },
  exp: {
    type: Date,
    default: Date.now
  },
  hpp: {
    type: Number,
    required: true,
  },
  hargaJual: {
    type: Number,
    required: true,
  },
  stok: {
    type: Number,
    required: true,
  },
  notifStok: {
    type: Number,
    required: true,
  },
  deskripsi: {
    type: String,
    required: true,
  }
});

module.exports = mongoose.model('Product', ProductSchema)