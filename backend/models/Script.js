// 剧本模型
const mongoose = require('mongoose');

// 定义剧本Schema
const scriptSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  scriptType: {
    type: String,
    required: true,
    enum: ['竖屏短剧', '横屏短剧', '电视剧', '电影']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  episodeCount: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  wordCount: {
    type: Number,
    required: true,
    min: 500
  },
  keywords: [{
    type: String,
    trim: true
  }],
  selectedLogline: {
    type: String,
    trim: true
  },
  loglines: [{
    type: String,
    trim: true
  }],
  outline: {
    type: String,
    trim: true
  },
  outlinePoints: {
    type: Array
  },
  episodes: [{
    index: Number,
    title: String,
    content: String
  }],
  scriptContent: {
    type: String,
    trim: true
  },
  currentEpisodeIndex: {
    type: Number,
    default: 0
  },
  genreType: {
    type: String,
    enum: ['', '女频', '男频']
  },
  selectedGenres: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 更新更新时间的中间件
scriptSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 导出剧本模型
const Script = mongoose.model('Script', scriptSchema);

module.exports = Script;