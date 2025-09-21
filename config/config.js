// 配置文件
const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost'
  },
  
  // AI API 配置
  ai: {
    apiKey: process.env.AI_API_KEY || 'demo-api-key',
    apiUrl: process.env.AI_API_URL || 'https://api.example.com/ai',
    model: process.env.AI_MODEL || 'gpt-3.5-turbo'
  },
  
  // 数据库配置
  database: {
    type: process.env.DB_TYPE || 'memory', // 可以是 'memory', 'mongodb', 'mysql' 等
    // 其他数据库配置...
  },
  
  // 应用配置
  app: {
    name: process.env.APP_NAME || '剧作AI',
    description: process.env.APP_DESCRIPTION || '智能剧本创作平台',
    version: '1.0.0',
    debug: process.env.NODE_ENV !== 'production'
  },
  
  // 文件存储配置
  storage: {
    tempDir: process.env.TEMP_DIR || './tmp',
    scriptDir: process.env.SCRIPT_DIR || './scripts'
  },
  
  // 安全配置
  security: {
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
      jwtExpiresIn: '24h',
      cors: {
        origin: 'http://localhost:5000',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization']
      }
    }
};

module.exports = config;