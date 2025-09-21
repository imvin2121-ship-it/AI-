// JWT工具函数
const jwt = require('jsonwebtoken');
const config = require('../../config/config');

// 生成JWT令牌
exports.generateToken = (userId, username) => {
  // 令牌负载
  const payload = {
    id: userId,
    username: username,
    iat: Date.now(),
    exp: Date.now() + config.security.jwtExpiresIn.replace('h', '') * 60 * 60 * 1000
  };
  
  // 生成令牌
  const token = jwt.sign(payload, config.security.jwtSecret, {
    expiresIn: config.security.jwtExpiresIn
  });
  
  return token;
};

// 验证JWT令牌
exports.verifyToken = (token) => {
  try {
    // 验证令牌
    const decoded = jwt.verify(token, config.security.jwtSecret);
    return decoded;
  } catch (error) {
    throw error;
  }
};

// 刷新JWT令牌
exports.refreshToken = (token) => {
  try {
    // 首先验证当前令牌
    const decoded = jwt.verify(token, config.security.jwtSecret);
    
    // 生成新令牌
    const newToken = jwt.sign(
      { id: decoded.id, username: decoded.username },
      config.security.jwtSecret,
      { expiresIn: config.security.jwtExpiresIn }
    );
    
    return newToken;
  } catch (error) {
    throw error;
  }
};