const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

// 加载配置
const config = require('../config/config');

// 初始化Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors(config.security.cors));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 提供静态文件服务
app.use(express.static(path.join(__dirname, '../frontend/public')));

// --------------------------
// 模拟数据存储
// --------------------------
let userData = {
  users: [
    { id: '1', username: 'demo', password: 'demo' } // 演示账号
  ],
  scripts: []
};

// --------------------------
// AI API测试端点
// --------------------------
app.get('/api/test-ai', async (req, res) => {
  try {
    const aiService = require('./services/aiService');
    const response = await aiService.generateLoglines('测试', '电影剧本', 1);
    res.json({
      success: true,
      message: 'AI API连接成功！',
      data: response
    });
  } catch (error) {
    console.error('AI API测试失败:', error);
    res.status(500).json({
      success: false,
      message: 'AI API连接失败',
      error: error.message
    });
  }
});

// --------------------------
// 1. 用户认证API
// --------------------------

// 用户登录
app.post('/api/users/login', (req, res) => {
  const { username, password } = req.body;
  const user = userData.users.find(u => u.username === username && u.password === password);
  
  if (user) {
    res.json({ id: user.id, username: user.username, success: true });
  } else {
    res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
});

// 检查用户登录状态
app.get('/api/users/current', (req, res) => {
  // 由于这是模拟环境，我们直接返回演示用户
  res.json({
    id: '1',
    username: 'demo',
    success: true
  });
});

// 用户注册
app.post('/api/users/register', (req, res) => {
  const { username, password } = req.body;
  
  if (userData.users.find(u => u.username === username)) {
    res.status(400).json({ success: false, message: '用户名已存在' });
  } else {
    const newUser = { id: uuidv4(), username, password };
    userData.users.push(newUser);
    res.json({ id: newUser.id, username: newUser.username, success: true });
  }
});

// 导入AI服务
const aiService = require('./services/aiService');

// --------------------------
// 2. 剧本创作API - 原创剧本
// --------------------------

// 生成故事创意
app.post('/api/scripts/generate-loglines', async (req, res) => {
  const { keywords, scriptType, episodeCount } = req.body;
  
  try {
    // 使用AI服务生成故事创意
    const loglines = await aiService.generateLoglines(keywords, scriptType, episodeCount);
    
    res.json({ success: true, loglines });
  } catch (error) {
    console.error("生成故事创意失败:", error);
    res.status(500).json({ success: false, message: "生成故事创意失败，请重试" });
  }
});

// 生成故事梗概
app.post('/api/scripts/generate-outline', async (req, res) => {
  const { logline, scriptType } = req.body;
  
  try {
    // 使用AI服务生成故事梗概
    const outline = await aiService.generateOutline(logline, scriptType);
    
    res.json({ success: true, outline });
  } catch (error) {
    console.error("生成故事梗概失败:", error);
    res.status(500).json({ success: false, message: "生成故事梗概失败，请重试" });
  }
});

// 生成分集大纲
app.post('/api/scripts/generate-episodes', async (req, res) => {
  const { outline, scriptType, episodeCount } = req.body;
  
  try {
    // 使用AI服务生成分集大纲
    const episodes = await aiService.generateEpisodes(outline, scriptType, episodeCount);
    
    res.json({ success: true, episodes });
  } catch (error) {
    console.error("生成分集大纲失败:", error);
    res.status(500).json({ success: false, message: "生成分集大纲失败，请重试" });
  }
});

// 生成剧本内容
app.post('/api/scripts/generate-script', async (req, res) => {
  const { outline, episodes, scriptType, wordCount } = req.body;
  
  try {
    // 使用AI服务生成剧本内容
    const script = await aiService.generateScript(outline, episodes, scriptType, wordCount);
    
    res.json({ success: true, script });
  } catch (error) {
    console.error("生成剧本内容失败:", error);
    res.status(500).json({ success: false, message: "生成剧本内容失败，请重试" });
  }
});

// --------------------------
// 3. 剧本创作API - 改编剧本
// --------------------------

// 上传原著文本并解析
app.post('/api/scripts/adapt/upload', async (req, res) => {
  const { text, scriptType } = req.body;
  
  try {
    // 使用AI服务解析原著文本
    const analysis = await aiService.analyzeOriginalText(text, scriptType);
    
    res.json({ success: true, analysis });
  } catch (error) {
    console.error("解析原著文本失败:", error);
    res.status(500).json({ success: false, message: "解析原著文本失败，请重试" });
  }
});

// 生成改编大纲
app.post('/api/scripts/adapt/generate-outline', async (req, res) => {
  const { analysis, rules, scriptType } = req.body;
  
  try {
    // 使用AI服务生成改编大纲
    const outline = await aiService.generateAdaptedOutline(analysis, rules, scriptType);
    
    res.json({ success: true, outline });
  } catch (error) {
    console.error("生成改编大纲失败:", error);
    res.status(500).json({ success: false, message: "生成改编大纲失败，请重试" });
  }
});

// --------------------------
// 4. 剧本编辑工具API
// --------------------------

// 局部重写
app.post('/api/scripts/rewrite-section', async (req, res) => {
  const { content, instruction, scriptType } = req.body;
  
  try {
    // 使用AI服务重写内容
    const rewrittenContent = await aiService.rewriteSection(content, instruction, scriptType);
    
    res.json({ success: true, rewrittenContent });
  } catch (error) {
    console.error("重写内容失败:", error);
    res.status(500).json({ success: false, message: "重写内容失败，请重试" });
  }
});

// 续写内容
app.post('/api/scripts/continue-script', async (req, res) => {
  const { content, instruction, scriptType } = req.body;
  
  try {
    // 使用AI服务续写内容
    const continuedContent = await aiService.continueScript(content, instruction, scriptType);
    
    res.json({ success: true, continuedContent });
  } catch (error) {
    console.error("续写内容失败:", error);
    res.status(500).json({ success: false, message: "续写内容失败，请重试" });
  }
});

// 保存剧本
app.post('/api/scripts/save', (req, res) => {
  const { scriptData, scriptType, episodeCount, wordCount } = req.body;
  
  try {
    const newScript = {
      id: uuidv4(),
      title: scriptData.title || `剧本_${new Date().toLocaleDateString()}`,
      scriptType,
      episodeCount,
      wordCount,
      keywords: scriptData.keywords,
      logline: scriptData.loglines && scriptData.selectedLogline !== null ? scriptData.loglines[scriptData.selectedLogline] : null,
      outline: scriptData.outline,
      episodes: scriptData.episodes,
      content: scriptData.scriptContent,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    userData.scripts.push(newScript);
    
    res.json({ success: true, script: newScript });
  } catch (error) {
    console.error("保存剧本失败:", error);
    res.status(500).json({ success: false, message: "保存剧本失败，请重试" });
  }
});

// 获取用户剧本列表
app.get('/api/scripts', (req, res) => {
  try {
    res.json({ success: true, scripts: userData.scripts });
  } catch (error) {
    console.error("获取剧本列表失败:", error);
    res.status(500).json({ success: false, message: "获取剧本列表失败，请重试" });
  }
});

// --------------------------
// 5. 前端路由
// --------------------------
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`AI剧本创作平台已启动，支持原创和改编两种创作模式`);
  console.log(`演示账号：demo / 密码：demo`);
});