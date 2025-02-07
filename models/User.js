const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  balance: { 
    type: Number, 
    default: 10000,
    min: [0, 'Số dư không thể âm'],
    max: [Number.MAX_SAFE_INTEGER, 'Số dư tối đa là ' + Number.MAX_SAFE_INTEGER] // Sử dụng Number.MAX_SAFE_INTEGER
  },
  inventory: {
    rock: { type: Number, default: 0 },
    iron: { type: Number, default: 0 },
    gold: { type: Number, default: 0 },
    diamond: { type: Number, default: 0 }
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  lastStolenDate: {
    type: String,
    default: null
  },
  lastCheckinDate: {
    type: String,
    default: null
  }
});

module.exports = mongoose.model('User ', userSchema);