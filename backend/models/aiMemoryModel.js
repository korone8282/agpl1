const mongoose = require('mongoose');

const aiMemorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['RULE', 'CORRECTION', 'USER_PREFERENCE', 'ALIAS_MAPPING', 'FEEDBACK', 'QUERY_LOG'],
    default: 'RULE'
  },
  topic: {
    type: String,
    default: 'GENERAL',
    trim: true
  },
  rule: {
    type: String,
    required: true,
    trim: true
  },
  triggerKeywords: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  originalQuery: {
    type: String,
    default: ''
  },
  correctedBy: {
    type: String,
    default: 'User'
  },
  active: {
    type: Boolean,
    default: true
  },
  usageCount: {
    type: Number,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('AiMemory', aiMemorySchema);
