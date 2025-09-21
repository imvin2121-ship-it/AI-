// 认证中间件
const jwt = require('jsonwebtoken');
const config = require('../../config/config');

// 验证JWT令牌的中间件
exports.verifyToken = (req, res, next) => {
  // 获取授权头
  const authHeader = req.headers.authorization;
  
  // 检查授权头是否存在
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: '未提供授权令牌'
    });
  }
  
  // 提取令牌
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '无效的授权格式'
    });
  }
  
  try {
    // 验证令牌
    const decoded = jwt.verify(token, config.security.jwtSecret);
    
    // 将用户信息存储在请求对象中
    req.user = decoded;
    
    next();
  } catch (error) {
    // 令牌验证失败
    return res.status(401).json({
      success: false,
      message: '令牌无效或已过期'
    });
  }
};

// 可选的认证中间件（如果没有令牌也可以继续）
exports.optionalVerifyToken = (req, res, next) => {
  // 获取授权头
  const authHeader = req.headers.authorization;
  
  // 如果没有授权头，继续下一步
  if (!authHeader) {
    return next();
  }
  
  // 提取令牌
  const token = authHeader.split(' ')[1];
  
  if (!token) {
    return next();
  }
  
  try {
    // 验证令牌
    const decoded = jwt.verify(token, config.security.jwtSecret);
    
    // 将用户信息存储在请求对象中
    req.user = decoded;
  } catch (error) {
    // 令牌验证失败，但仍然继续下一步
    console.error('令牌验证失败:', error);
  }
  
  next();
};