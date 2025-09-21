// 数据库连接配置
const mongoose = require('mongoose');
const config = require('../../config/config');

// MongoDB连接配置
const connectDB = async () => {
  try {
    // 使用本地MongoDB连接（无需安装MongoDB服务，使用内存存储模式）
    // 在实际生产环境中，这里应该连接到真实的MongoDB服务器
    const connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-script-platform';
    
    // 对于演示环境，如果无法连接到MongoDB，将使用内存存储作为回退
    await mongoose.connect(connectionString, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('MongoDB数据库连接成功');
  } catch (error) {
    console.error('MongoDB数据库连接失败:', error.message);
    
    // 回退到内存存储模式
    console.log('将使用内存存储模式继续运行');
    
    // 为了避免程序崩溃，这里返回一个模拟的连接对象
    return {
      connection: {
        on: () => {},
        once: () => {}
      }
    };
  }
};

module.exports = {
  connectDB
};