const mongoose = require('mongoose');

const fakturSchema = new mongoose.Schema({
  kodePembelian: { type: String, required: true, unique: true },
  tanggalBeli: { type: Date, required: true },
  kodeSupplier: { type: String, required: true },
  noFakturAsli: { type: String, required: true },
  metodePembelian: { type: String, enum: ['cash', 'kredit'], required: true },
  tanggalPelunasan: { type: Date, required: function() {return this.metodePembelian === 'kredit'} },
  produk: [
    {
      kode: { type: String, required: true },
      nama: { type: String, required: true },
      noBatch: { type: String, required: true},
      harga: { type: Number, required: true },
      qty: { type: Number, required: true },
      disc1: { type: Number, default: 0 },
      disc2: { type: Number, default: 0 },
      disc3: { type: Number, default: 0 },
      ppn: { type: Number, default: 0 },
      jumlah: { type: Number, required: true },
    }
  ],
  tanggalKirim: { type: Date, required: true },
  totalPembelian: {type: Number, required: true},
  uangMuka: { type: Number, required: true, default: function() { return this.metodePembelian === 'cash' ? this.totalPembelian : 0} },
  hutang: { type: Number, required: true, default: function() {return this.metodePembelian === 'cash' ? 0 : this.totalPembelian - this.uangMuka} },
  tanggalBayar: {type: Date},
  statusPembayaran: {type: String, enum: ['lunas', 'belum lunas'], default: 'belum lunas'},
  createdAt: { type: Date, default: Date.now},
  updateAt: { type: Date, default: Date.now},
});

fakturSchema.pre('save', function(next) {
  this.updateAt = Date.now();
  next();
})

module.exports = mongoose.model('Faktur', fakturSchema);