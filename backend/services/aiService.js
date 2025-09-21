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
  async generateLoglines(keywords, scriptType, episodeCount, genreType = '', selectedGenres = []) {
    // 根据剧本类型和题材构建专业身份
    let professionalRole = '';
    let specialInstructions = '';
    
    if (scriptType.includes('短剧')) {
      professionalRole = '拥有10年短剧创作经验的金牌编剧，擅长设计紧凑剧情和吸引人的开头钩子';
      specialInstructions = '请严格遵循短剧创作的"黄金三秒"原则，每个创意的开头必须有足够吸引人的钩子元素，适合快节奏的短视频平台播放。';
    } else if (scriptType.includes('电影')) {
      professionalRole = '屡获国际奖项的电影编剧，擅长构建完整的故事弧线和复杂的人物关系';
      specialInstructions = '请注重电影的视觉表现力和情感深度，确保故事适合大银幕呈现。';
    } else if (scriptType.includes('电视剧')) {
      professionalRole = '知名电视剧编剧，擅长构建长篇幅的剧情和细腻的人物刻画';
      specialInstructions = '请设计适合电视剧节奏的剧情发展，注重人物关系的渐进式发展。';
    }
    
    // 添加题材相关的指导
    let genreGuidance = '';
    if (genreType) {
      genreGuidance += `\n请特别针对${genreType}受众的喜好进行创作，`;
    }
    
    if (selectedGenres && selectedGenres.length > 0) {
      genreGuidance += `融合${selectedGenres.join('、')}等热门题材元素，`;
    }
    
    const messages = [
      {
        role: 'system',
        content: `你是一位${professionalRole}，现在需要为用户提供高质量的故事创意服务。${specialInstructions}`
      },
      {
        role: 'user',
        content: `请根据用户提供的关键词、剧本类型和集数要求，生成5个不同方向的故事创意。${genreGuidance}每个创意应该包含明确的类型、核心冲突和主要人物。请确保故事创意适合${scriptType}的创作特点和节奏要求。\n\n格式要求：每个创意单独一行，以序号开头，结构为"序号. [题材] 故事标题 - 核心冲突和主要人物简介"。\n\n请基于关键词 "${keywords}" 生成${scriptType}的故事创意，适合制作${episodeCount}集的剧集。`
      }
    ];

    const response = await this.sendRequest(messages);
    // 将响应按行分割，返回故事创意数组
    return response.split('\n').filter(line => line.trim() !== '');
  }

  // 生成故事梗概
  async generateOutline(logline, scriptType, genreType = '', selectedGenres = []) {
    // 根据剧本类型构建专业身份
    let professionalRole = '';
    let structuralGuidance = '';
    let styleRequirements = '';
    
    if (scriptType.includes('短剧')) {
      professionalRole = '资深短剧策划人，擅长设计紧凑有力的故事结构';
      structuralGuidance = `\n请严格按照以下结构组织故事梗概：
1. **核心设定**：简要介绍故事背景、主要人物和世界观
2. **主线情节**：分为开端、发展、高潮、结局四个部分
3. **爽点设计**：明确标注每5-10集的中型爽点和每20-30集的大型爽点
4. **人物成长弧光**：描述主要人物的转变和成长`;
      styleRequirements = '语言要简洁有力，突出冲突和转折，每部分内容要明确为后续的分集大纲创作提供清晰指引。';
    } else if (scriptType.includes('电影')) {
      professionalRole = '经验丰富的电影文学策划，擅长构建适合大银幕的故事结构';
      structuralGuidance = `\n请按照三幕式结构组织故事梗概：
1. **第一幕（ setup）**：建立世界、介绍人物、提出核心问题
2. **第二幕（ confrontation）**：主角面临一系列挑战，情节发展
3. **第三幕（ resolution）**：高潮对决，问题解决，人物成长`;
      styleRequirements = '注重视觉化场景的描述，突出情感冲突和人物关系的复杂性。';
    } else if (scriptType.includes('电视剧')) {
      professionalRole = '知名电视剧编剧，擅长构建长篇幅的叙事结构';
      structuralGuidance = `\n请按照长篇电视剧的叙事结构组织故事梗概：
1. **故事背景与主要人物**：详细介绍故事发生的时空背景和主要人物关系
2. **主线与支线**：明确主线剧情和主要支线剧情的发展脉络
3. **情节节点**：标注每5-10集的关键情节转折点
4. **人物关系图谱**：描述主要人物之间的关系变化`;
      styleRequirements = '注重人物性格的多面性和情节发展的层次感，为长期追剧提供持续动力。';
    }
    
    // 添加题材相关的指导
    let genreGuidance = '';
    if (genreType) {
      genreGuidance += `\n请特别针对${genreType}受众的审美偏好进行创作，`;
    }
    
    if (selectedGenres && selectedGenres.length > 0) {
      genreGuidance += `融入${selectedGenres.join('、')}等题材的经典元素，`;
    }

    const messages = [
      {
        role: 'system',
        content: `你是一位${professionalRole}，现在需要为用户生成专业的故事梗概。${styleRequirements}`
      },
      {
        role: 'user',
        content: `请根据用户提供的故事创意和剧本类型，生成详细的故事梗概。${genreGuidance}梗概应包含明确的章节划分，每个章节有标题和详细内容，展现完整的故事弧线，包括开端、发展、高潮和结局。${structuralGuidance}\n\n请基于故事创意 "${logline}" 生成适合${scriptType}的详细故事梗概。`
      }
    ];

    return this.sendRequest(messages);
  }

  // 生成分集大纲
  async generateEpisodes(outline, scriptType, episodeCount, startIndex = 0, genreType = '', selectedGenres = []) {
    // 根据剧本类型构建专业身份和格式要求
    let professionalRole = '';
    let formatRequirements = '';
    let pacingGuidance = '';
    
    if (scriptType.includes('短剧')) {
      professionalRole = '深谙短剧创作规律的金牌编剧，尤其擅长设计吸引人的"钩子"和制造"爽点"';
      formatRequirements = `\n**格式严格要求**：
- 每集必须包含：集数、核心内容概括、详细场景描述、人物对话、关键镜头提示
- 场景标题格式："集数-场景序号 时间 内/外 场景地点"（如：31-1 夜 外 历史博物馆广场）
- 动作/场景描述：以三角符号 △ 开头，独立成段，只写能被看见和听见的内容
- 人物与对话：使用标准剧本格式，括号附注应极其简练`;
      pacingGuidance = '请严格遵循短剧"黄金三秒"原则，每集开头3秒内必须有强力钩子，每集结尾必须设置悬念，形成"钩子-发展-爽点-悬念"的标准结构。';
    } else if (scriptType.includes('电影')) {
      professionalRole = '经验丰富的电影分镜师，擅长将文学剧本转化为视觉化的分镜头脚本';
      formatRequirements = `\n**格式严格要求**：
- 按场景划分，每个场景包含：场景号、时间、地点、内外景、详细镜头描述
- 镜头描述需包含：景别、镜头运动、画面内容、声音设计
- 人物对话需标注情感和动作提示`;
      pacingGuidance = '请注重电影的视觉节奏和情感韵律，根据情节重要性分配不同的镜头长度和节奏。';
    } else if (scriptType.includes('电视剧')) {
      professionalRole = '资深电视剧策划，擅长设计适合长篇幅叙事的分集结构';
      formatRequirements = `\n**格式严格要求**：
- 每集包含：集数标题、本集核心内容、主要场景、人物线进展
- 场景描述需详细但简洁，为后续剧本创作提供清晰指引
- 人物对话需符合角色性格和剧情发展`;
      pacingGuidance = '请保持电视剧的叙事连贯性和节奏感，每集设置1-2个小高潮和1个大悬念，吸引观众持续观看。';
    }
    
    // 添加题材相关的指导
    let genreGuidance = '';
    if (genreType) {
      genreGuidance += `\n请特别针对${genreType}受众的观剧偏好进行创作，`;
    }
    
    if (selectedGenres && selectedGenres.length > 0) {
      genreGuidance += `巧妙融入${selectedGenres.join('、')}等题材的经典元素，`;
    }

    const messages = [
      {
        role: 'system',
        content: `你是一位${professionalRole}，现在需要为用户生成分集大纲。${pacingGuidance}`
      },
      {
        role: 'user',
        content: `请根据用户提供的故事梗概、剧本类型和集数要求，生成分集大纲。${genreGuidance}${formatRequirements}\n\n返回格式必须为严格的JSON数组，每个对象必须包含以下字段：
- id: 集数编号（字符串格式）
- summary: 本集核心内容概括（50-100字）
- content: 本集详细内容，包括场景、人物和对话（使用剧本格式）
- highlights: 本集的亮点和爽点（数组格式）
- cliffhanger: 本集结尾的悬念（30-50字）\n\n请基于故事梗概 "${outline}" 生成${scriptType}的分集大纲，从第${startIndex + 1}集开始，总共${episodeCount}集。`
      }
    ];

    const response = await this.sendRequest(messages);
    // 尝试解析JSON响应，如果失败则返回模拟数据
    try {
      return JSON.parse(response);
    } catch (e) {
      console.error('解析分集大纲失败，返回模拟数据:', e);
      return this.generateMockEpisodes(outline, scriptType, episodeCount, startIndex);
    }
  }

  // 生成剧本内容
  async generateScript(outline, episodes, scriptType, wordCount, genreType = '', selectedGenres = []) {
    // 根据剧本类型构建专业身份和格式要求
    let professionalRole = '';
    let formatRequirements = '';
    let styleGuidance = '';
    
    if (scriptType.includes('短剧')) {
      professionalRole = '经验丰富的短剧执行编剧，擅长将分集大纲转化为符合拍摄要求的剧本';
      formatRequirements = `\n**剧本格式严格要求**：
1. **场景标题**：使用"集数-场景序号 时间 内/外 场景地点"的标准格式
2. **动作/场景描述**：以三角符号 △ 开头，独立成段，只写能被看见和听见的内容
3. **人物与对话**：人物名加粗居中，对话内容另起一行，括号附注极其简练
4. **特殊格式标记**：特效使用【特效】标记，内心独白使用OS，画外音使用VO，交叉剪辑使用（交叉剪辑）`;
      styleGuidance = '语言要简洁有力，动作描述要具体可执行，对话要符合人物性格，每句台词都要有明确的戏剧目的。';
    } else if (scriptType.includes('电影')) {
      professionalRole = '资深电影编剧，擅长创作符合电影语言的剧本';
      formatRequirements = `\n**剧本格式严格要求**：
1. **场景标题**：使用"EXT./INT. 地点 - 时间"的标准格式
2. **动作描述**：详细但不冗长，突出视觉元素和人物动作
3. **人物与对话**：人物名大写，对话内容简洁有力
4. **镜头提示**：适当加入必要的镜头提示，如特写、全景等`;
      styleGuidance = '注重电影的视觉叙事和节奏，通过画面和动作推动剧情发展，减少不必要的台词。';
    } else if (scriptType.includes('电视剧')) {
      professionalRole = '知名电视剧编剧，擅长创作适合小屏幕的剧本';
      formatRequirements = `\n**剧本格式严格要求**：
1. **场景标题**：使用"场景名称 - 时间 - 内/外"的格式
2. **动作描述**：详细描述环境和人物动作
3. **人物与对话**：人物名明确，对话符合角色性格和剧情发展
4. **情感提示**：适当加入情感和心理活动的描述`;
      styleGuidance = '注重人物关系的细腻描写和剧情的渐进式发展，通过对话和细节展现人物性格。';
    }
    
    // 添加题材相关的指导
    let genreGuidance = '';
    if (genreType) {
      genreGuidance += `\n请特别注意${genreType}题材的创作特点，`;
    }
    
    if (selectedGenres && selectedGenres.length > 0) {
      genreGuidance += `巧妙运用${selectedGenres.join('、')}等题材的创作手法，`;
    }

    const messages = [
      {
        role: 'system',
        content: `你是一位${professionalRole}，现在需要为用户生成专业的剧本内容。${styleGuidance}`
      },
      {
        role: 'user',
        content: `请根据用户提供的故事梗概、分集大纲、剧本类型和字数要求，生成符合剧本格式的详细内容。${genreGuidance}${formatRequirements}\n\n请确保内容专业、生动，符合${scriptType}的创作特点和节奏要求，字数控制在${wordCount}字左右。\n\n故事梗概: ${outline}\n\n分集大纲: ${JSON.stringify(episodes)}`
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
  async rewriteSection(content, instruction, scriptType, genreType = '', selectedGenres = []) {
    // 根据剧本类型构建专业身份
    let professionalRole = '';
    let styleGuidance = '';
    
    if (scriptType.includes('短剧')) {
      professionalRole = '资深短剧编辑，擅长对剧本进行精细化打磨和优化';
      styleGuidance = '请保持短剧的快节奏和强冲突特点，语言要简洁有力，突出戏剧张力。';
    } else if (scriptType.includes('电影')) {
      professionalRole = '经验丰富的电影剧本顾问，擅长提升剧本的艺术性和商业性';
      styleGuidance = '请注重电影的视觉表现力和情感深度，优化后的内容要有更强的画面感。';
    } else if (scriptType.includes('电视剧')) {
      professionalRole = '知名电视剧剧本编辑，擅长强化人物性格和戏剧冲突';
      styleGuidance = '请保持电视剧的叙事连贯性和人物性格的一致性，优化后的内容要更符合角色定位。';
    }
    
    // 添加题材相关的指导
    let genreGuidance = '';
    if (genreType) {
      genreGuidance += `\n请特别注意保持${genreType}题材的风格特点，`;
    }
    
    if (selectedGenres && selectedGenres.length > 0) {
      genreGuidance += `融入${selectedGenres.join('、')}等题材的创作元素，`;
    }

    const messages = [
      {
        role: 'system',
        content: `你是一位${professionalRole}，现在需要为用户提供剧本局部重写服务。${styleGuidance}`
      },
      {
        role: 'user',
        content: `请根据用户提供的内容、修改指令和剧本类型，进行局部重写。${genreGuidance}确保重写后的内容完全符合用户要求，同时保持与原文的整体风格一致，并符合${scriptType}的创作特点和格式要求。\n\n请根据以下指令重写${scriptType}剧本内容：\n修改指令：${instruction}\n需要重写的内容：${content}`
      }
    ];

    return this.sendRequest(messages);
  }

  // 续写内容
  async continueScript(content, instruction, scriptType, genreType = '', selectedGenres = []) {
    // 根据剧本类型构建专业身份
    let professionalRole = '';
    let pacingGuidance = '';
    
    if (scriptType.includes('短剧')) {
      professionalRole = '经验丰富的短剧编剧，擅长设计紧凑的剧情和吸引人的情节发展';
      pacingGuidance = '请保持短剧的快节奏和强冲突特点，续写内容要推进剧情发展，为后续情节埋下伏笔。';
    } else if (scriptType.includes('电影')) {
      professionalRole = '资深电影编剧，擅长构建完整的故事弧线和情感脉络';
      pacingGuidance = '请注重电影的叙事节奏和情感表达，续写内容要符合故事发展逻辑，丰富人物形象。';
    } else if (scriptType.includes('电视剧')) {
      professionalRole = '知名电视剧编剧，擅长设计长篇幅的剧情发展和人物关系';
      pacingGuidance = '请保持电视剧的叙事连贯性和人物性格的一致性，续写内容要推动多条故事线的发展。';
    }
    
    // 添加题材相关的指导
    let genreGuidance = '';
    if (genreType) {
      genreGuidance += `\n请特别注意${genreType}题材的创作特点，`;
    }
    
    if (selectedGenres && selectedGenres.length > 0) {
      genreGuidance += `融入${selectedGenres.join('、')}等题材的创作元素，`;
    }

    const messages = [
      {
        role: 'system',
        content: `你是一位${professionalRole}，现在需要为用户提供剧本续写服务。${pacingGuidance}`
      },
      {
        role: 'user',
        content: `请仔细阅读用户提供的现有剧本内容，理解其中的人物关系、情节发展和整体风格。${genreGuidance}然后根据续写指令，生成符合上下文逻辑的后续内容。确保续写内容流畅自然，与原文无缝衔接，符合故事发展方向，并严格遵循${scriptType}的创作特点、节奏要求和格式规范。\n\n请根据以下指令续写${scriptType}剧本内容：\n续写指令：${instruction}\n现有内容：${content}`
      }
    ];

    return this.sendRequest(messages);
  }

  // 生成模拟数据（当AI API调用失败时使用）
  generateMockEpisodes(outline, scriptType, episodeCount, startIndex = 0) {
    const mockEpisodes = [];
    const count = episodeCount || 5;
    
    for (let i = 0; i < count; i++) {
      const episodeNum = startIndex + i + 1;
      mockEpisodes.push({
        id: episodeNum.toString(),
        summary: `${scriptType || '剧本'}第${episodeNum}集：主角面临新的挑战，情节进一步发展。`,
        content: `# 第${episodeNum}集\n\n## 场景1\n${episodeNum}-1 日 内 主角办公室\n△ 主角坐在办公桌前，眉头紧锁，面前摊满了文件。\n△ 电话铃声突然响起，主角接起电话。\n\n## 场景2\n${episodeNum}-2 日 外 咖啡厅\n△ 主角与配角在咖啡厅见面，两人表情严肃地交谈着什么。\n\n## 场景3\n${episodeNum}-3 夜 内 主角家\n△ 主角独自坐在沙发上，思考着今天发生的事情，神情忧虑。\n△ 突然传来敲门声，主角起身去开门...`,
        highlights: ['主角面临新的挑战', '情节出现转折', '人物关系发生变化'],
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