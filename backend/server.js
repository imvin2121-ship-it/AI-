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

// 导入数据库配置
const { connectDB } = require('./config/database');

// 导入模型
const User = require('./models/User');
const Script = require('./models/Script');

// 导入认证中间件和工具
const { verifyToken, optionalVerifyToken } = require('./middleware/auth');
const { generateToken } = require('./utils/jwt');

// 中间件配置
app.use(cors(config.security.cors));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// 提供静态文件服务
app.use(express.static(path.join(__dirname, '../frontend/public')));

// --------------------------
// 全局变量
// --------------------------

// 异步任务队列
const taskQueue = [];
const activeTasks = new Map();
const TASK_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// 导入AI服务
const aiService = require('./services/aiService');

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
app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 检查用户名和密码是否提供
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请提供用户名和密码' });
    }
    
    // 查找用户
    const user = await User.findOne({ username });
    
    // 检查用户是否存在
    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
    
    // 验证密码
    const isPasswordMatch = await user.comparePassword(password);
    
    if (!isPasswordMatch) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }
    
    // 生成JWT令牌
    const token = generateToken(user._id, user.username);
    
    // 返回用户信息和令牌
    res.json({
      success: true,
      id: user._id,
      username: user.username,
      token: token,
      message: '登录成功'
    });
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ success: false, message: '登录失败，请重试' });
  }
});

// 用户注册
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 检查用户名和密码是否提供
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请提供用户名和密码' });
    }
    
    // 检查用户名长度
    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({ success: false, message: '用户名长度应为3-20个字符' });
    }
    
    // 检查密码长度
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: '密码长度至少为6个字符' });
    }
    
    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    
    if (existingUser) {
      return res.status(400).json({ success: false, message: '用户名已存在' });
    }
    
    // 创建新用户
    const newUser = new User({
      username,
      password
    });
    
    // 保存用户
    await newUser.save();
    
    // 生成JWT令牌
    const token = generateToken(newUser._id, newUser.username);
    
    // 返回新用户信息和令牌
    res.json({
      success: true,
      id: newUser._id,
      username: newUser.username,
      token: token,
      message: '注册成功'
    });
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({ success: false, message: '注册失败，请重试' });
  }
});

// 检查用户登录状态
app.get('/api/users/current', verifyToken, (req, res) => {
  try {
    // 用户信息已在req.user中通过验证中间件添加
    res.json({
      success: true,
      id: req.user.id,
      username: req.user.username,
      message: '已登录'
    });
  } catch (error) {
    console.error('获取用户状态失败:', error);
    res.status(500).json({ success: false, message: '获取用户状态失败' });
  }
});

// 用户登出
app.post('/api/users/logout', verifyToken, (req, res) => {
  try {
    // JWT是无状态的，所以登出只需客户端删除令牌即可
    // 这里我们可以选择添加令牌到黑名单（可选）
    res.json({ success: true, message: '登出成功' });
  } catch (error) {
    console.error('登出失败:', error);
    res.status(500).json({ success: false, message: '登出失败' });
  }
});

// --------------------------
// 2. 任务状态管理API
// --------------------------

// 获取任务状态
app.get('/api/tasks/:taskId', optionalVerifyToken, (req, res) => {
  const { taskId } = req.params;
  const task = activeTasks.get(taskId);
  
  if (!task) {
    return res.status(404).json({ success: false, message: '任务不存在' });
  }
  
  // 返回任务状态信息，但不返回完整的结果（除非任务已完成）
  const taskStatus = {
    id: task.id,
    type: task.type,
    status: task.status,
    createdAt: task.createdAt,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    error: task.error,
    // 只有完成的任务才返回结果
    result: task.status === TASK_STATUS.COMPLETED ? task.result : undefined
  };
  
  res.json({ success: true, task: taskStatus });
});

// 取消任务
app.delete('/api/tasks/:taskId', verifyToken, (req, res) => {
  const { taskId } = req.params;
  
  // 首先检查任务是否在队列中
  const queueIndex = taskQueue.findIndex(task => task.id === taskId);
  if (queueIndex !== -1) {
    // 从队列中移除任务
    taskQueue.splice(queueIndex, 1);
    activeTasks.delete(taskId);
    return res.json({ success: true, message: '任务已取消' });
  }
  
  // 然后检查任务是否正在处理中
  const activeTask = activeTasks.get(taskId);
  if (activeTask && activeTask.status === TASK_STATUS.PROCESSING) {
    // 对于正在处理的任务，我们无法真正取消AI API调用，但可以将其标记为取消
    activeTask.status = 'cancelled';
    activeTasks.set(taskId, activeTask);
    return res.json({ success: true, message: '任务已标记为取消' });
  }
  
  return res.status(404).json({ success: false, message: '任务不存在或已完成' });
});

// --------------------------
// 3. 异步任务处理系统
// --------------------------

// 处理任务队列的函数
function processTaskQueue() {
  // 检查是否有可用的处理槽位
  const activeTaskCount = Array.from(activeTasks.values()).filter(task => 
    task.status === TASK_STATUS.PROCESSING
  ).length;
  
  // 限制并发任务数
  const maxConcurrentTasks = 3;
  
  if (activeTaskCount < maxConcurrentTasks && taskQueue.length > 0) {
    // 从队列中取出一个任务
    const task = taskQueue.shift();
    
    // 更新任务状态为处理中
    task.status = TASK_STATUS.PROCESSING;
    task.startedAt = new Date();
    activeTasks.set(task.id, task);
    
    // 执行任务
    executeTask(task)
      .then(result => {
        // 更新任务状态为完成
        task.status = TASK_STATUS.COMPLETED;
        task.result = result;
        task.completedAt = new Date();
        activeTasks.set(task.id, task);
      })
      .catch(error => {
        // 更新任务状态为失败
        task.status = TASK_STATUS.FAILED;
        task.error = error.message;
        activeTasks.set(task.id, task);
      })
      .finally(() => {
        // 继续处理下一个任务
        processTaskQueue();
      });
  }
  
  // 如果队列中有任务但当前没有处理槽位，稍后再检查
  if (taskQueue.length > 0) {
    setTimeout(processTaskQueue, 1000);
  }
}

// 执行具体任务的函数
async function executeTask(task) {
  try {
    // 根据任务类型调用相应的AI服务方法
    switch (task.type) {
      case 'generateLoglines':
        return await aiService.generateLoglines(
          task.params.keywords,
          task.params.scriptType,
          task.params.episodeCount,
          task.params.genreType || '',
          task.params.selectedGenres || []
        );
      case 'generateOutline':
        return await aiService.generateOutline(
          task.params.logline,
          task.params.scriptType,
          task.params.genreType || '',
          task.params.selectedGenres || []
        );
      case 'generateEpisodes':
        return await aiService.generateEpisodes(
          task.params.outline,
          task.params.scriptType,
          task.params.episodeCount,
          task.params.startIndex || 0,
          task.params.genreType || '',
          task.params.selectedGenres || []
        );
      case 'generateScript':
        return await aiService.generateScript(
          task.params.outline,
          task.params.episodes,
          task.params.scriptType,
          task.params.wordCount,
          task.params.genreType || '',
          task.params.selectedGenres || []
        );
      case 'analyzeOriginalText':
        return await aiService.analyzeOriginalText(
          task.params.text,
          task.params.scriptType
        );
      case 'generateAdaptedOutline':
        return await aiService.generateAdaptedOutline(
          task.params.analysis,
          task.params.rules,
          task.params.scriptType
        );
      case 'rewriteSection':
      case 'rewriteContent':
        return await aiService.rewriteSection(
          task.params.content,
          task.params.instruction || task.params.requirements || '',
          task.params.scriptType,
          task.params.genreType || '',
          task.params.selectedGenres || []
        );
      case 'continueScript':
        return await aiService.continueScript(
          task.params.content,
          task.params.instruction,
          task.params.scriptType,
          task.params.genreType || '',
          task.params.selectedGenres || []
        );
      default:
        throw new Error(`未知的任务类型: ${task.type}`);
    }
  } catch (error) {
    console.error(`执行任务失败 ${task.id}:`, error);
    throw error;
  }
}

// 启动任务队列处理器
setTimeout(processTaskQueue, 1000);

// --------------------------
// 2. 剧本创作API - 原创剧本
// --------------------------

// 生成故事创意（异步）
app.post('/api/scripts/generate-loglines', verifyToken, (req, res) => {
  try {
    const { keywords, scriptType, episodeCount, genreType, selectedGenres } = req.body;
    
    // 创建新任务
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task = {
      id: taskId,
      type: 'generateLoglines',
      params: { keywords, scriptType, episodeCount, genreType, selectedGenres },
      status: TASK_STATUS.PENDING,
      createdAt: new Date(),
      userId: req.user.id
    };
    
    // 将任务添加到队列
    taskQueue.push(task);
    activeTasks.set(taskId, task);
    
    // 立即返回任务ID，让客户端可以轮询任务状态
    res.json({ success: true, taskId, status: TASK_STATUS.PENDING });
    
    // 触发任务处理
    processTaskQueue();
  } catch (error) {
    console.error("创建生成故事创意任务失败:", error);
    res.status(500).json({ success: false, message: "创建任务失败，请重试" });
  }
});

// 生成故事梗概（异步）
app.post('/api/scripts/generate-outline', verifyToken, (req, res) => {
  try {
    const { logline, scriptType, genreType, selectedGenres } = req.body;
    
    // 创建新任务
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task = {
      id: taskId,
      type: 'generateOutline',
      params: { logline, scriptType, genreType, selectedGenres },
      status: TASK_STATUS.PENDING,
      createdAt: new Date(),
      userId: req.user.id
    };
    
    // 将任务添加到队列
    taskQueue.push(task);
    activeTasks.set(taskId, task);
    
    // 立即返回任务ID，让客户端可以轮询任务状态
    res.json({ success: true, taskId, status: TASK_STATUS.PENDING });
    
    // 触发任务处理
    processTaskQueue();
  } catch (error) {
    console.error("创建生成故事梗概任务失败:", error);
    res.status(500).json({ success: false, message: "创建任务失败，请重试" });
  }
});

// 生成分集大纲（异步）
app.post('/api/scripts/generate-episodes', verifyToken, (req, res) => {
  try {
    const { outline, scriptType, episodeCount, startIndex, genreType, selectedGenres } = req.body;
    
    // 创建新任务
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task = {
      id: taskId,
      type: 'generateEpisodes',
      params: { outline, scriptType, episodeCount, startIndex, genreType, selectedGenres },
      status: TASK_STATUS.PENDING,
      createdAt: new Date(),
      userId: req.user.id
    };
    
    // 将任务添加到队列
    taskQueue.push(task);
    activeTasks.set(taskId, task);
    
    // 立即返回任务ID，让客户端可以轮询任务状态
    res.json({ success: true, taskId, status: TASK_STATUS.PENDING });
    
    // 触发任务处理
    processTaskQueue();
  } catch (error) {
    console.error("创建生成分集大纲任务失败:", error);
    res.status(500).json({ success: false, message: "创建任务失败，请重试" });
  }
});

// 生成剧本内容（异步）
app.post('/api/scripts/generate-script', verifyToken, (req, res) => {
  try {
    const { outline, episodes, scriptType, wordCount, genreType, selectedGenres } = req.body;
    
    // 创建新任务
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task = {
      id: taskId,
      type: 'generateScript',
      params: { outline, episodes, scriptType, wordCount, genreType, selectedGenres },
      status: TASK_STATUS.PENDING,
      createdAt: new Date(),
      userId: req.user.id
    };
    
    // 将任务添加到队列
    taskQueue.push(task);
    activeTasks.set(taskId, task);
    
    // 立即返回任务ID，让客户端可以轮询任务状态
    res.json({ success: true, taskId, status: TASK_STATUS.PENDING });
    
    // 触发任务处理
    processTaskQueue();
  } catch (error) {
    console.error("创建生成剧本内容任务失败:", error);
    res.status(500).json({ success: false, message: "创建任务失败，请重试" });
  }
});

// --------------------------
// 3. 剧本创作API - 改编剧本
// --------------------------

// 上传原著文本并解析（异步）
app.post('/api/scripts/adapt/upload', verifyToken, (req, res) => {
  try {
    const { text, scriptType } = req.body;
    
    // 创建新任务
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task = {
      id: taskId,
      type: 'analyzeOriginalText',
      params: { text, scriptType },
      status: TASK_STATUS.PENDING,
      createdAt: new Date(),
      userId: req.user.id
    };
    
    // 将任务添加到队列
    taskQueue.push(task);
    activeTasks.set(taskId, task);
    
    // 立即返回任务ID，让客户端可以轮询任务状态
    res.json({ success: true, taskId, status: TASK_STATUS.PENDING });
    
    // 触发任务处理
    processTaskQueue();
  } catch (error) {
    console.error("创建解析原著文本任务失败:", error);
    res.status(500).json({ success: false, message: "创建任务失败，请重试" });
  }
});

// 生成改编大纲（异步）
app.post('/api/scripts/adapt/generate-outline', verifyToken, (req, res) => {
  try {
    const { analysis, rules, scriptType } = req.body;
    
    // 创建新任务
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task = {
      id: taskId,
      type: 'generateAdaptedOutline',
      params: { analysis, rules, scriptType },
      status: TASK_STATUS.PENDING,
      createdAt: new Date(),
      userId: req.user.id
    };
    
    // 将任务添加到队列
    taskQueue.push(task);
    activeTasks.set(taskId, task);
    
    // 立即返回任务ID，让客户端可以轮询任务状态
    res.json({ success: true, taskId, status: TASK_STATUS.PENDING });
    
    // 触发任务处理
    processTaskQueue();
  } catch (error) {
    console.error("创建生成改编大纲任务失败:", error);
    res.status(500).json({ success: false, message: "创建任务失败，请重试" });
  }
});

// --------------------------
// 4. 剧本编辑工具API
// --------------------------

// 局部重写（异步）
app.post('/api/scripts/rewrite-section', verifyToken, (req, res) => {
  try {
    const { content, instruction, scriptType, genreType, selectedGenres } = req.body;
    
    // 创建新任务
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task = {
      id: taskId,
      type: 'rewriteSection',
      params: { content, instruction, scriptType, genreType, selectedGenres },
      status: TASK_STATUS.PENDING,
      createdAt: new Date(),
      userId: req.user.id
    };
    
    // 将任务添加到队列
    taskQueue.push(task);
    activeTasks.set(taskId, task);
    
    // 立即返回任务ID，让客户端可以轮询任务状态
    res.json({ success: true, taskId, status: TASK_STATUS.PENDING });
    
    // 触发任务处理
    processTaskQueue();
  } catch (error) {
    console.error("创建重写内容任务失败:", error);
    res.status(500).json({ success: false, message: "创建任务失败，请重试" });
  }
});

// 续写内容（异步）
app.post('/api/scripts/continue-script', verifyToken, (req, res) => {
  try {
    const { content, instruction, scriptType, genreType, selectedGenres } = req.body;
    
    // 创建新任务
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const task = {
      id: taskId,
      type: 'continueScript',
      params: { content, instruction, scriptType, genreType, selectedGenres },
      status: TASK_STATUS.PENDING,
      createdAt: new Date(),
      userId: req.user.id
    };
    
    // 将任务添加到队列
    taskQueue.push(task);
    activeTasks.set(taskId, task);
    
    // 立即返回任务ID，让客户端可以轮询任务状态
    res.json({ success: true, taskId, status: TASK_STATUS.PENDING });
    
    // 触发任务处理
    processTaskQueue();
  } catch (error) {
    console.error("创建续写内容任务失败:", error);
    res.status(500).json({ success: false, message: "创建任务失败，请重试" });
  }
});

// 保存剧本
app.post('/api/scripts/save', verifyToken, async (req, res) => {
  const { scriptData, scriptType, episodeCount, wordCount } = req.body;
  
  try {
    // 创建一个新的剧本对象
    const newScript = new Script({
      title: scriptData.title || `剧本_${new Date().toLocaleDateString()}`,
      scriptType,
      episodeCount,
      wordCount,
      keywords: scriptData.keywords,
      logline: scriptData.loglines && scriptData.selectedLogline !== null ? scriptData.loglines[scriptData.selectedLogline] : null,
      outline: scriptData.outline,
      episodes: scriptData.episodes,
      content: scriptData.scriptContent,
      user: req.user.id
    });
    
    // 保存到数据库
    await newScript.save();
    
    res.json({ success: true, script: newScript });
  } catch (error) {
    console.error("保存剧本失败:", error);
    res.status(500).json({ success: false, message: "保存剧本失败，请重试" });
  }
});

// 获取用户剧本列表
app.get('/api/scripts', verifyToken, async (req, res) => {
  try {
    // 从数据库中获取用户的所有剧本
    const userScripts = await Script.find({ user: req.user.id })
      .sort({ updatedAt: -1 })
      .select('-content -outline -episodes'); // 不返回大文本内容，只返回基本信息
    
    res.json({ success: true, scripts: userScripts });
  } catch (error) {
    console.error("获取剧本列表失败:", error);
    res.status(500).json({ success: false, message: "获取剧本列表失败，请重试" });
  }
});

// 获取剧本详情
app.get('/api/scripts/:scriptId', verifyToken, async (req, res) => {
  try {
    const { scriptId } = req.params;
    
    // 从数据库中获取剧本详情
    const script = await Script.findOne({
      _id: scriptId,
      user: req.user.id
    });
    
    if (!script) {
      return res.status(404).json({ success: false, message: '剧本不存在或无权访问' });
    }
    
    res.json({ success: true, script });
  } catch (error) {
    console.error('获取剧本详情失败:', error);
    res.status(500).json({ success: false, message: '获取剧本详情失败，请重试' });
  }
});

// 更新剧本
app.put('/api/scripts/:scriptId', verifyToken, async (req, res) => {
  try {
    const { scriptId } = req.params;
    const { scriptData, scriptType, episodeCount, wordCount } = req.body;
    
    // 检查剧本是否存在且属于当前用户
    const script = await Script.findOne({
      _id: scriptId,
      user: req.user.id
    });
    
    if (!script) {
      return res.status(404).json({ success: false, message: '剧本不存在或无权访问' });
    }
    
    // 更新剧本信息
    if (scriptData.title) script.title = scriptData.title;
    if (scriptType) script.scriptType = scriptType;
    if (episodeCount) script.episodeCount = episodeCount;
    if (wordCount) script.wordCount = wordCount;
    if (scriptData.keywords) script.keywords = scriptData.keywords;
    if (scriptData.loglines && scriptData.selectedLogline !== null) {
      script.logline = scriptData.loglines[scriptData.selectedLogline];
    }
    if (scriptData.outline) script.outline = scriptData.outline;
    if (scriptData.episodes) script.episodes = scriptData.episodes;
    if (scriptData.scriptContent) script.content = scriptData.scriptContent;
    
    script.updatedAt = new Date();
    
    // 保存更新
    await script.save();
    
    res.json({ success: true, message: '剧本更新成功' });
  } catch (error) {
    console.error('更新剧本失败:', error);
    res.status(500).json({ success: false, message: '更新剧本失败，请重试' });
  }
});

// 删除剧本
app.delete('/api/scripts/:scriptId', verifyToken, async (req, res) => {
  try {
    const { scriptId } = req.params;
    
    // 检查剧本是否存在且属于当前用户
    const script = await Script.findOne({
      _id: scriptId,
      user: req.user.id
    });
    
    if (!script) {
      return res.status(404).json({ success: false, message: '剧本不存在或无权访问' });
    }
    
    // 删除剧本
    await script.deleteOne();
    
    res.json({ success: true, message: '剧本删除成功' });
  } catch (error) {
    console.error('删除剧本失败:', error);
    res.status(500).json({ success: false, message: '删除剧本失败，请重试' });
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