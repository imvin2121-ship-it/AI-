const axios = require('axios');
const config = require('../../config/config');

// AI服务模块
class AIService {
  constructor() {
    this.apiKey = config.ai.apiKey;
    this.apiUrl = config.ai.apiUrl;
    this.model = config.ai.model;
  }

  // 发送请求到Gemini API
  async sendRequest(messages) {
    try {
      // 构建Gemini API格式的请求体
      const requestBody = {
        contents: messages.map(msg => ({
          role: msg.role,
          parts: [{
            text: msg.content
          }]
        }))
      };

      const response = await axios.post(`${this.apiUrl}:generateContent`, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      // 解析Gemini API响应
      if (response.data && response.data.candidates && response.data.candidates.length > 0) {
        const candidate = response.data.candidates[0];
        if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          return candidate.content.parts[0].text.trim();
        }
      }
      
      throw new Error('无效的AI响应格式');
    } catch (error) {
      console.error('AI API调用失败:', error.response?.data || error.message);
      throw new Error('AI服务暂时不可用，请稍后再试');
    }
  }

  // 生成故事创意
  async generateLoglines(keywords, scriptType, episodeCount) {
    const messages = [
      {
        role: 'user',
        content: `你是一位专业的剧本创作顾问。请根据用户提供的关键词、剧本类型和集数要求，生成5个不同方向的故事创意。每个创意应该包含明确的类型、核心冲突和主要人物。请确保故事创意适合${scriptType}的创作特点。格式要求：每个创意单独一行，以序号开头。

请基于关键词 "${keywords}" 生成${scriptType}的故事创意，适合制作${episodeCount}集的剧集。`
      }
    ];

    const response = await this.sendRequest(messages);
    // 将响应按行分割，返回故事创意数组
    return response.split('\n').filter(line => line.trim() !== '');
  }

  // 生成故事梗概
  async generateOutline(logline, scriptType) {
    const messages = [
      {
        role: 'user',
        content: `你是一位专业的编剧。请根据用户提供的故事创意和剧本类型，生成详细的故事梗概。梗概应包含明确的章节划分，每个章节有标题和详细内容，展现完整的故事弧线，包括开端、发展、高潮和结局。

特别注意：如果剧本类型是短剧（包括竖屏短剧），请严格遵循以下写作规则：
1. **黄金三秒与强力钩子**：开头必须有钩子，可采用开场即高潮或悬念前置的手法
2. **极致人设与强力反差**：塑造立体有趣的人物，可使用身份反差和成长弧光
3. **"爽点"密集的情节设计**：规划好每5-10集的中型爽点和每20-30集的大型爽点

请确保故事梗概适合${scriptType}的创作特点。

请基于故事创意 "${logline}" 生成适合${scriptType}的详细故事梗概`
      }
    ];

    return this.sendRequest(messages);
  }

  // 生成分集大纲
  async generateEpisodes(outline, scriptType, episodeCount) {
    const messages = [
      {
        role: 'user',
        content: `你是一位专业的编剧。请根据用户提供的故事梗概、剧本类型和集数要求，生成分集大纲。

特别注意：如果剧本类型是短剧（包括竖屏短剧），请严格遵循以下写作规则：
1. **场景标题格式**：使用"集数-场景序号 时间 内/外 场景地点"的标准格式（如：31-1 夜 外 历史博物馆广场）
2. **动作/场景描述格式**：以三角符号 △ 开头，独立成段，只写能被看见和听见的内容
3. **人物与对话格式**：使用标准剧本格式，括号附注应极其简练
4. **黄金三秒与强力钩子**：每集开头必须有钩子，可采用开场即高潮或悬念前置
5. **极致人设与强力反差**：塑造立体有趣的人物，可使用身份反差和成长弧光
6. **"爽点"密集的情节设计**：规划好每集的爽点，形成波浪式观剧体验

每个分集应包含集数、内容概要和悬念结尾。返回格式应为JSON数组，每个对象包含id、summary和cliffhanger三个字段。请确保分集大纲符合${scriptType}的创作特点和节奏要求。

请基于故事梗概 "${outline}" 生成${scriptType}的分集大纲，总共${episodeCount}集。`
      }
    ];

    const response = await this.sendRequest(messages);
    // 尝试解析JSON响应，如果失败则返回模拟数据
    try {
      return JSON.parse(response);
    } catch (e) {
      console.error('解析分集大纲失败，返回模拟数据:', e);
      return this.generateMockEpisodes(outline, scriptType, episodeCount);
    }
  }

  // 生成剧本内容
  async generateScript(outline, episodes, scriptType, wordCount) {
    const messages = [
      {
        role: 'user',
        content: `你是一位专业的编剧。请根据用户提供的故事梗概、分集大纲、剧本类型和字数要求，生成符合剧本格式的详细内容。

特别注意：如果剧本类型是短剧（包括竖屏短剧），请严格遵循以下写作格式和手法规则：

**第一部分：短剧剧本的写作格式**
1. **场景标题 (Scene Heading)**
   - 标准格式: 集数-场景序号 时间 内/外 场景地点
   - 示例: 31-1 夜 外 历史博物馆广场

2. **动作/场景描述 (Action/Scene Description)**
   - 标准格式: 以三角符号 △ 开头，独立成段
   - 核心原则：只写能被看见和听见的一切
   - 特殊提示格式: 特效使用【特效】标记，交叉剪辑使用（交叉剪辑），内心独白使用OS，画外音使用VO

3. **人物与对话 (Character & Dialogue)**
   - 标准格式: 人物: 夜莱、顾昀
   - 对话主体: 顾昀: (声音颤抖，几乎不成语调) ……好。
   - 括号附注: 极其简练，只提示必要的语气、情绪或微小动作

**第二部分：短剧剧本的写作手法**
1. **黄金三秒与强力钩子**：每集开头必须有钩子，可采用开场即高潮或悬念前置
2. **极致人设与强力反差**：塑造立体有趣的人物，可使用身份反差和成长弧光
3. **"爽点"密集的情节设计**：规划好每集的爽点，形成波浪式观剧体验

请确保内容专业、生动，符合${scriptType}的创作特点和节奏要求，每集大约${wordCount}字左右。

故事梗概: ${outline}

分集大纲: ${JSON.stringify(episodes)}`
      }
    ];

    return this.sendRequest(messages);
  }

  // 解析原著文本
  async analyzeOriginalText(text, scriptType) {
    const messages = [
      {
        role: 'user',
        content: `你是一位文学分析专家。请分析用户提供的原著文本，提取主要人物、核心情节和关键场景。返回格式应为JSON对象，包含title、mainCharacters、mainPlotLines和keyScenes字段。请确保分析结果适合改编为${scriptType}。

请分析以下原著文本：
${text}`
      }
    ];


    const response = await this.sendRequest(messages);
    // 尝试解析JSON响应，如果失败则返回模拟数据
    try {
      return JSON.parse(response);
    } catch (e) {
      console.error('解析原著分析失败，返回模拟数据:', e);
      return this.generateMockAnalysis(scriptType);
    }
  }

  // 生成改编大纲
  async generateAdaptedOutline(analysis, rules, scriptType) {
    const messages = [
      {
        role: 'user',
        content: `你是一位专业的改编编剧。请根据用户提供的原著分析、改编规则和剧本类型，生成详细的改编剧本大纲。大纲应包含明确的章节划分和内容概要，同时满足用户的改编要求，并符合${scriptType}的创作特点和格式要求。

请基于以下原著分析和改编规则生成${scriptType}的改编剧本大纲：
原著分析：${JSON.stringify(analysis)}
改编规则：${rules}`
      }
    ];

    return this.sendRequest(messages);
  }

  // 局部重写
  async rewriteSection(content, instruction, scriptType) {
    const messages = [
      {
        role: 'user',
        content: `你是一位专业的剧本编辑。请根据用户提供的内容、修改指令和剧本类型，进行局部重写。确保重写后的内容符合用户要求，同时保持整体风格一致，并符合${scriptType}的创作特点。

请根据以下指令重写${scriptType}剧本内容：
修改指令：${instruction}
需要重写的内容：${content}`
      }
    ];

    return this.sendRequest(messages);
  }

  // 续写内容
  async continueScript(content, instruction, scriptType) {
    const messages = [
      {
        role: 'user',
        content: `你是一位专业的编剧。请根据用户提供的现有剧本内容、续写指令和剧本类型，生成符合上下文逻辑的后续内容。确保续写内容流畅自然，符合故事发展方向，并符合${scriptType}的创作特点和节奏要求。

请根据以下指令续写${scriptType}剧本内容：
续写指令：${instruction}
现有内容：${content}`
      }
    ];

    return this.sendRequest(messages);
  }

  // 生成模拟数据（当AI API调用失败时使用）
  generateMockEpisodes(outline, scriptType, episodeCount) {
    const mockEpisodes = [];
    const count = episodeCount || 5;
    
    for (let i = 0; i < count; i++) {
      mockEpisodes.push({
        id: (i + 1).toString(),
        summary: `${scriptType || '剧本'}第${i + 1}集：主角面临新的挑战，情节进一步发展。`,
        cliffhanger: `主角在本集结尾遇到了意想不到的情况，留下悬念...`
      });
    }
    
    return mockEpisodes;
  }

  // 生成原著分析的模拟数据
  generateMockAnalysis(scriptType) {
    const defaultAnalysis = {
      title: "原著分析报告",
      mainCharacters: ["主角", "配角A", "配角B"],
      mainPlotLines: ["主线：主角的成长历程", "支线：主角与配角A的关系发展"],
      keyScenes: ["场景1：故事开端", "场景2：冲突爆发", "场景3：高潮", "场景4：结局"],
      themes: ['亲情', '友情', '成长', '自我认同'],
      style: '现实主义风格，情感细腻，人物刻画深刻'
    };

    // 根据剧本类型调整模拟数据
    if (scriptType === '电影剧本') {
      return {
        ...defaultAnalysis,
        style: '紧凑的电影叙事风格，视觉冲击力强，情感渲染到位',
        adaptationSuggestions: ['剧情需要更加紧凑，重点突出核心冲突', '增加视觉化场景描述', '强化角色动机']
      };
    } else if (scriptType === '电视剧剧本') {
      return {
        ...defaultAnalysis,
        style: '适合长篇幅电视剧的叙事节奏，注重人物关系发展和情节铺垫',
        adaptationSuggestions: ['扩展配角故事线', '增加情节转折和悬念设置', '保持每集结尾有吸引力']
      };
    } else if (scriptType === '网络剧剧本') {
      return {
        ...defaultAnalysis,
        style: '符合网络观众喜好的快节奏叙事，年轻化的表达',
        adaptationSuggestions: ['加快叙事节奏', '增加流行文化元素', '设计符合社交媒体传播的名场面']
      };
    } else {
      return defaultAnalysis;
    }
  }
}

module.exports = new AIService();