const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporterId: {
    type: String,
    required: true
  },
  reportedId: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Report', reportSchema);