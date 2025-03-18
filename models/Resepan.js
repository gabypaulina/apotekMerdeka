const mongoose = require('mongoose');

const ResepanSchema = new mongoose.Schema({
  produkResepan: [
    {
      produk: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Product', 
        required: true 
      },
      quantity: { type: Number, required: true }
    }
  ],
  kodeResep: {
    type: String,
    required: true,
  },
  namaResep: {
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

module.exports = mongoose.model('Resepan', ResepanSchema);