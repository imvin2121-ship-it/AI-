// 全局状态管理
const appState = {
  currentStep: 0, // 0表示剧本类型选择步骤
  selectedLogline: null,
  keywords: '',
  currentUser: null,
  isLoading: false,
  scriptType: '', // 剧本类型
  episodeCount: 10, // 默认集数
  wordCount: 5000, // 默认字数
  scriptData: {
    loglines: [],
    outline: '',
    episodes: [],
    scriptContent: ''
  }
};

// DOM 元素缓存
const domElements = {
  // 导航栏
  navbar: document.getElementById('navbar'),
  menuToggle: document.getElementById('menu-toggle'),
  mobileMenu: document.getElementById('mobile-menu'),
  authButtons: document.getElementById('auth-buttons'),
  userProfile: document.getElementById('user-profile'),
  usernameDisplay: document.getElementById('username-display'),
  logoutBtn: document.getElementById('logout-btn'),
  loginBtn: document.getElementById('login-btn'),
  mobileLoginBtn: document.getElementById('mobile-login-btn'),
  startTrialBtn: document.getElementById('start-trial-btn'),
  
  // 模态框
  authModal: document.getElementById('auth-modal'),
  closeModalBtn: document.getElementById('close-modal-btn'),
  modalTitle: document.getElementById('modal-title'),
  loginForm: document.getElementById('login-form'),
  registerForm: document.getElementById('register-form'),
  switchToRegisterBtn: document.getElementById('switch-to-register-btn'),
  switchToLoginBtn: document.getElementById('switch-to-login-btn'),
  submitLoginBtn: document.getElementById('submit-login-btn'),
  submitRegisterBtn: document.getElementById('submit-register-btn'),
  
  // 剧本创作流程
  homeSection: document.getElementById('home-section'),
  scriptCreationSection: document.getElementById('script-creation'),
  originalPath: document.getElementById('original-path'),
  adaptPath: document.getElementById('adapt-path'),
  stepsIndicator: document.getElementById('steps-indicator'),
  scriptCreationContent: document.getElementById('script-creation-content'),
  
  // 步骤元素
  step1: document.getElementById('step1'),
  step2: document.getElementById('step2'),
  keywordsInput: document.getElementById('keywords-input'),
  generateLoglinesBtn: document.getElementById('generate-loglines-btn'),
  loglinesContainer: document.getElementById('loglines-container'),
  generateOutlineBtn: document.getElementById('generate-outline-btn'),
  backToStep1Btn: document.getElementById('back-to-step1-btn'),
  
  // 加载指示器
  loadingIndicator: document.getElementById('loading-indicator'),
  loadingMessage: document.getElementById('loading-message'),
  
  // 创建剧本按钮
  createScriptBtn: document.getElementById('create-script-btn')
};

// 初始化函数
function initApp() {
  // 绑定事件监听器
  bindEventListeners();
  
  // 检查用户登录状态
  checkUserAuthentication();
  
  // 初始化步骤指示器
  updateStepIndicator();
}

// 绑定事件监听器
function bindEventListeners() {
  // 导航栏交互
  domElements.menuToggle.addEventListener('click', toggleMobileMenu);
  window.addEventListener('scroll', handleNavbarScroll);
  domElements.logoutBtn.addEventListener('click', handleLogout);
  
  // 登录/注册模态框交互
  domElements.loginBtn.addEventListener('click', openLoginModal);
  domElements.mobileLoginBtn.addEventListener('click', openLoginModal);
  domElements.closeModalBtn.addEventListener('click', closeAuthModal);
  domElements.switchToRegisterBtn.addEventListener('click', switchToRegisterForm);
  domElements.switchToLoginBtn.addEventListener('click', switchToLoginForm);
  domElements.submitLoginBtn.addEventListener('click', handleLogin);
  domElements.submitRegisterBtn.addEventListener('click', handleRegister);
  
  // 剧本创作流程交互
  domElements.originalPath.addEventListener('click', () => startScriptCreation('original'));
  domElements.adaptPath.addEventListener('click', () => startScriptCreation('adapt'));
  domElements.createScriptBtn.addEventListener('click', () => startScriptCreation('original'));
  
  // 步骤1交互
  domElements.generateLoglinesBtn.addEventListener('click', generateLoglines);
  domElements.backToStep1Btn.addEventListener('click', () => goToStep(1));
}

// 导航栏滚动效果
function handleNavbarScroll() {
  if (window.scrollY > 10) {
    domElements.navbar.classList.add('shadow-md');
    domElements.navbar.classList.remove('shadow-sm');
  } else {
    domElements.navbar.classList.remove('shadow-md');
    domElements.navbar.classList.add('shadow-sm');
  }
}

// 切换移动端菜单
function toggleMobileMenu() {
  domElements.mobileMenu.classList.toggle('hidden');
}

// 检查用户认证状态
function checkUserAuthentication() {
  const user = localStorage.getItem('currentUser');
  if (user) {
    appState.currentUser = JSON.parse(user);
    showUserProfile();
  } else {
    showAuthButtons();
  }
}

// 显示用户信息
function showUserProfile() {
  domElements.authButtons.classList.add('hidden');
  domElements.userProfile.classList.remove('hidden');
  domElements.usernameDisplay.textContent = appState.currentUser.username;
}

// 显示认证按钮
function showAuthButtons() {
  domElements.authButtons.classList.remove('hidden');
  domElements.userProfile.classList.add('hidden');
}

// 打开登录模态框
function openLoginModal() {
  domElements.modalTitle.textContent = '登录';
  domElements.loginForm.classList.remove('hidden');
  domElements.registerForm.classList.add('hidden');
  domElements.authModal.classList.remove('hidden');
}

// 切换到注册表单
function switchToRegisterForm() {
  domElements.modalTitle.textContent = '注册';
  domElements.loginForm.classList.add('hidden');
  domElements.registerForm.classList.remove('hidden');
}

// 切换到登录表单
function switchToLoginForm() {
  domElements.modalTitle.textContent = '登录';
  domElements.loginForm.classList.remove('hidden');
  domElements.registerForm.classList.add('hidden');
}

// 关闭认证模态框
function closeAuthModal() {
  domElements.authModal.classList.add('hidden');
}

// 处理登录
async function handleLogin() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  
  if (!username || !password) {
    alert('请输入用户名和密码');
    return;
  }
  
  showLoading('登录中...');
  
  try {
    const response = await fetch('/api/users/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      appState.currentUser = data;
      localStorage.setItem('currentUser', JSON.stringify(data));
      showUserProfile();
      closeAuthModal();
      alert('登录成功');
    } else {
      alert(data.message || '登录失败');
    }
  } catch (error) {
    console.error('登录错误:', error);
    alert('登录失败，请稍后重试');
  } finally {
    hideLoading();
  }
}

// 处理注册
async function handleRegister() {
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
  if (!username || !password || !confirmPassword) {
    alert('请填写所有字段');
    return;
  }
  
  if (password !== confirmPassword) {
    alert('两次输入的密码不一致');
    return;
  }
  
  showLoading('注册中...');
  
  try {
    const response = await fetch('/api/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ username, password })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      switchToLoginForm();
      alert('注册成功，请登录');
    } else {
      alert(data.message || '注册失败');
    }
  } catch (error) {
    console.error('注册错误:', error);
    alert('注册失败，请稍后重试');
  } finally {
    hideLoading();
  }
}

// 处理登出
function handleLogout() {
  localStorage.removeItem('currentUser');
  appState.currentUser = null;
  showAuthButtons();
  alert('已成功登出');
}

// 开始剧本创作
function startScriptCreation(type) {
  // 如果用户未登录，先弹出登录框
  if (!appState.currentUser) {
    openLoginModal();
    return;
  }
  
  // 重置应用状态
  appState.currentStep = 0; // 设置为剧本类型选择步骤
  appState.selectedLogline = null;
  appState.scriptData = {
    loglines: [],
    outline: '',
    episodes: [],
    scriptContent: ''
  };
  appState.scriptType = type || ''; // 保存剧本类型
  
  // 隐藏主页，显示剧本创作界面
  domElements.homeSection.classList.add('hidden');
  domElements.scriptCreationSection.classList.remove('hidden');
  
  // 初始化步骤指示器
  initStepsIndicator();
  
  // 显示剧本类型选择步骤
  renderScriptTypeSelection();
  
  // 滚动到顶部
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 渲染剧本类型选择步骤
function renderScriptTypeSelection() {
  // 清空内容区域
  domElements.scriptCreationContent.innerHTML = '';
  
  // 创建剧本类型选择界面
  const scriptTypeSection = document.createElement('div');
  scriptTypeSection.id = 'step0';
  scriptTypeSection.className = 'animate-fade-in';
  
  scriptTypeSection.innerHTML = `
    <h2 class="text-2xl font-bold mb-6">选择剧本类型</h2>
    <p class="text-gray-600 mb-8">请选择您想要创作的剧本类型，并设置相关参数</p>
    
    <div class="space-y-8">
      <!-- 剧本类型选择 -->
      <div>
        <label class="block text-gray-700 font-medium mb-3">剧本类型</label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors script-type-option" data-type="竖屏短剧">
            <div class="flex items-center mb-2">
              <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                <i class="fa fa-mobile text-primary"></i>
              </div>
              <h3 class="text-lg font-bold">竖屏短剧</h3>
            </div>
            <p class="text-gray-600">适用于手机端观看，每集时长1-3分钟，适合短视频平台</p>
          </div>
          
          <div class="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors script-type-option" data-type="横屏短剧">
            <div class="flex items-center mb-2">
              <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                <i class="fa fa-tablet text-primary"></i>
              </div>
              <h3 class="text-lg font-bold">横屏短剧</h3>
            </div>
            <p class="text-gray-600">适用于平板或电脑观看，每集时长5-10分钟</p>
          </div>
          
          <div class="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors script-type-option opacity-50" data-type="电视剧">
            <div class="flex items-center mb-2">
              <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                <i class="fa fa-television text-gray-500"></i>
              </div>
              <h3 class="text-lg font-bold">电视剧</h3>
            </div>
            <p class="text-gray-600">适用于电视播放，每集时长30-60分钟（开发中）</p>
          </div>
          
          <div class="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors script-type-option opacity-50" data-type="电影">
            <div class="flex items-center mb-2">
              <div class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                <i class="fa fa-film text-gray-500"></i>
              </div>
              <h3 class="text-lg font-bold">电影</h3>
            </div>
            <p class="text-gray-600">适用于影院放映，时长90-120分钟（开发中）</p>
          </div>
        </div>
      </div>
      
      <!-- 剧集设置 -->
      <div id="script-settings" class="hidden">
        <label class="block text-gray-700 font-medium mb-3">剧集设置</label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label class="block text-gray-500 mb-2">集数</label>
            <input type="number" id="episode-count" min="1" max="100" value="${appState.episodeCount}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50">
            <p class="text-sm text-gray-500 mt-1">建议短剧集数：10-30集</p>
          </div>
          
          <div>
            <label class="block text-gray-500 mb-2">每集字数（约）</label>
            <input type="number" id="word-count" min="500" max="50000" value="${appState.wordCount}" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50">
            <p class="text-sm text-gray-500 mt-1">建议短剧字数：3000-8000字/集</p>
          </div>
        </div>
      </div>
      
      <!-- 创作类型选择 -->
      <div id="creation-type-section" class="hidden">
        <label class="block text-gray-700 font-medium mb-3">创作方式</label>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button id="start-original-btn" class="border border-primary bg-primary/5 text-primary rounded-lg p-4 hover:bg-primary/10 transition-colors">
            <div class="flex items-center mb-2">
              <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                <i class="fa fa-lightbulb-o text-primary"></i>
              </div>
              <h3 class="text-lg font-bold">原创剧本</h3>
            </div>
            <p class="text-gray-600">从灵感出发，创作全新的剧本内容</p>
          </button>
          
          <button id="start-adapt-btn" class="border border-gray-200 rounded-lg p-4 hover:border-primary/50 transition-colors">
            <div class="flex items-center mb-2">
              <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                <i class="fa fa-book text-gray-500"></i>
              </div>
              <h3 class="text-lg font-bold">改编剧本</h3>
            </div>
            <p class="text-gray-600">上传原著文本，改编成剧本格式</p>
          </button>
        </div>
      </div>
    </div>
  `;
  
  domElements.scriptCreationContent.appendChild(scriptTypeSection);
  
  // 绑定剧本类型选择事件
  const scriptTypeOptions = document.querySelectorAll('.script-type-option');
  scriptTypeOptions.forEach(option => {
    // 跳过开发中的功能
    if (option.classList.contains('opacity-50')) return;
    
    option.addEventListener('click', () => {
      // 移除之前的选择状态
      scriptTypeOptions.forEach(opt => opt.classList.remove('border-primary', 'bg-primary/5'));
      
      // 设置新的选择状态
      option.classList.add('border-primary', 'bg-primary/5');
      
      // 保存选择的剧本类型
      appState.scriptType = option.dataset.type;
      
      // 显示设置区域
      document.getElementById('script-settings').classList.remove('hidden');
      document.getElementById('creation-type-section').classList.remove('hidden');
      
      // 绑定创作方式选择事件
      document.getElementById('start-original-btn').addEventListener('click', proceedToOriginalScript);
      document.getElementById('start-adapt-btn').addEventListener('click', proceedToAdaptScript);
    });
  });
}

// 继续到原创剧本创作
function proceedToOriginalScript() {
  // 保存设置
  appState.episodeCount = parseInt(document.getElementById('episode-count').value) || 10;
  appState.wordCount = parseInt(document.getElementById('word-count').value) || 5000;
  
  // 进入步骤1
  appState.currentStep = 1;
  goToStep(1);
}

// 继续到改编剧本创作
function proceedToAdaptScript() {
  // 保存设置
  appState.episodeCount = parseInt(document.getElementById('episode-count').value) || 10;
  appState.wordCount = parseInt(document.getElementById('word-count').value) || 5000;
  
  // 进入改编剧本流程
  alert('改编剧本功能即将上线，请先尝试原创剧本功能');
  // 这里可以添加改编剧本的实现
}

// 生成故事创意
  async function generateLoglines() {
    const keywords = domElements.keywordsInput.value.trim();
    
    if (!keywords) {
      alert('请输入至少一个关键词');
      return;
    }
    
    appState.keywords = keywords;
    
    showLoading('正在生成故事创意...');
    
    try {
      const response = await fetch('/api/scripts/generate-loglines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          keywords,
          scriptType: appState.scriptType, // 添加剧本类型参数
          episodeCount: appState.episodeCount // 添加集数参数
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        appState.scriptData.loglines = data.loglines;
        renderLoglines(data.loglines);
        goToStep(2);
      } else {
        alert(data.message || '生成故事创意失败');
      }
    } catch (error) {
      console.error('生成故事创意错误:', error);
      alert('生成故事创意失败，请稍后重试');
    } finally {
      hideLoading();
    }
  }

// 渲染故事创意选项
function renderLoglines(loglines) {
  domElements.loglinesContainer.innerHTML = '';
  
  loglines.forEach((logline, index) => {
    const loglineElement = document.createElement('div');
    loglineElement.className = 'border border-gray-200 rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer';
    loglineElement.innerHTML = `
      <div class="flex items-start mb-2">
        <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center mr-3 mt-0.5">
          <span class="text-sm font-medium">${index + 1}</span>
        </div>
        <p class="text-gray-800">${logline}</p>
      </div>
    `;
    
    loglineElement.addEventListener('click', () => selectLogline(index));
    domElements.loglinesContainer.appendChild(loglineElement);
  });
}

// 选择故事创意
function selectLogline(index) {
  // 移除之前的选择状态
  const loglineElements = domElements.loglinesContainer.querySelectorAll('div');
  loglineElements.forEach(el => el.classList.remove('border-primary', 'bg-primary/5'));
  
  // 设置新的选择状态
  loglineElements[index].classList.add('border-primary', 'bg-primary/5');
  
  // 保存选择的创意
  appState.selectedLogline = appState.scriptData.loglines[index];
  
  // 启用生成梗概按钮
  domElements.generateOutlineBtn.classList.remove('hidden');
  domElements.generateOutlineBtn.disabled = false;
  
  // 绑定生成梗概事件（确保只绑定一次）
  domElements.generateOutlineBtn.onclick = generateOutline;
}

// 生成故事梗概
async function generateOutline() {
  if (!appState.selectedLogline) {
    alert('请先选择一个故事创意');
    return;
  }
  
  showLoading('正在生成故事梗概...');
  
  try {
    const response = await fetch('/api/scripts/generate-outline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ logline: appState.selectedLogline })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      appState.scriptData.outline = data.outline;
      renderOutlineStep();
      goToStep(3);
    } else {
      alert(data.message || '生成故事梗概失败');
    }
  } catch (error) {
    console.error('生成故事梗概错误:', error);
    alert('生成故事梗概失败，请稍后重试');
  } finally {
    hideLoading();
  }
}

// 渲染梗概编辑步骤
function renderOutlineStep() {
  // 检查步骤3是否已存在，如果不存在则创建
  let step3 = document.getElementById('step3');
  if (!step3) {
    step3 = document.createElement('div');
    step3.id = 'step3';
    step3.className = 'hidden animate-fade-in';
    
    step3.innerHTML = `
      <h2 class="text-2xl font-bold mb-6">完善故事梗概</h2>
      <p class="text-gray-600 mb-6">请审阅并修改AI生成的故事梗概，然后生成分集大纲</p>
      
      <div class="mb-6">
        <textarea id="outline-editor" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[300px]"></textarea>
      </div>
      
      <div class="flex justify-between">
        <button id="back-to-step2-btn" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
          <i class="fa fa-arrow-left mr-2"></i> 返回
        </button>
        <button id="generate-episodes-btn" class="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md">
          生成分集大纲 <i class="fa fa-arrow-right ml-2"></i>
        </button>
      </div>
    `;
    
    domElements.scriptCreationContent.appendChild(step3);
    
    // 绑定返回按钮事件
    document.getElementById('back-to-step2-btn').addEventListener('click', () => goToStep(2));
    
    // 绑定生成分集大纲按钮事件
    document.getElementById('generate-episodes-btn').addEventListener('click', generateEpisodes);
  }
  
  // 设置梗概内容
  document.getElementById('outline-editor').value = appState.scriptData.outline;
}

// 生成分集大纲
  async function generateEpisodes() {
    const outline = document.getElementById('outline-editor').value.trim();
    
    if (!outline) {
      alert('请完善故事梗概');
      return;
    }
    
    appState.scriptData.outline = outline;
    
    showLoading('正在生成分集大纲...');
    
    try {
      const response = await fetch('/api/scripts/generate-episodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          outline,
          episodeCount: appState.episodeCount, // 使用用户选择的集数
          scriptType: appState.scriptType // 添加剧本类型参数
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        appState.scriptData.episodes = data.episodes;
        renderEpisodesStep();
        goToStep(4);
      } else {
        alert(data.message || '生成分集大纲失败');
      }
    } catch (error) {
      console.error('生成分集大纲错误:', error);
      alert('生成分集大纲失败，请稍后重试');
    } finally {
      hideLoading();
    }
  }

// 渲染分集大纲步骤
function renderEpisodesStep() {
  // 检查步骤4是否已存在，如果不存在则创建
  let step4 = document.getElementById('step4');
  if (!step4) {
    step4 = document.createElement('div');
    step4.id = 'step4';
    step4.className = 'hidden animate-fade-in';
    
    step4.innerHTML = `
      <h2 class="text-2xl font-bold mb-6">调整分集大纲</h2>
      <p class="text-gray-600 mb-6">请审阅并修改AI生成的分集大纲，然后生成剧本内容</p>
      
      <div class="mb-6 space-y-4" id="episodes-container"></div>
      
      <div class="flex justify-between">
        <button id="back-to-step3-btn" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
          <i class="fa fa-arrow-left mr-2"></i> 返回
        </button>
        <button id="generate-script-btn" class="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md">
          生成剧本内容 <i class="fa fa-arrow-right ml-2"></i>
        </button>
      </div>
    `;
    
    domElements.scriptCreationContent.appendChild(step4);
    
    // 绑定返回按钮事件
    document.getElementById('back-to-step3-btn').addEventListener('click', () => goToStep(3));
    
    // 绑定生成剧本按钮事件
    document.getElementById('generate-script-btn').addEventListener('click', generateScript);
  }
  
  // 渲染分集大纲列表
  const episodesContainer = document.getElementById('episodes-container');
  episodesContainer.innerHTML = '';
  
  appState.scriptData.episodes.forEach((episode, index) => {
    const episodeElement = document.createElement('div');
    episodeElement.className = 'border border-gray-200 rounded-lg p-4';
    episodeElement.innerHTML = `
      <h3 class="text-lg font-bold mb-2">第${index + 1}集</h3>
      <p class="text-gray-800 mb-2">${episode.summary}</p>
      <div class="text-gray-500 text-sm">${episode.cliffhanger}</div>
    `;
    
    episodesContainer.appendChild(episodeElement);
  });
}

// 生成剧本内容
  async function generateScript() {
    if (!appState.scriptData.episodes.length) {
      alert('请先生成分集大纲');
      return;
    }
    
    showLoading('正在生成剧本内容...');
    
    try {
      const response = await fetch('/api/scripts/generate-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          outline: appState.scriptData.outline,
          episodes: appState.scriptData.episodes,
          scriptType: appState.scriptType, // 添加剧本类型参数
          wordCount: appState.wordCount // 添加每集字数参数
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        appState.scriptData.scriptContent = data.script;
        renderScriptStep();
        goToStep(5);
      } else {
        alert(data.message || '生成剧本内容失败');
      }
    } catch (error) {
      console.error('生成剧本内容错误:', error);
      alert('生成剧本内容失败，请稍后重试');
    } finally {
      hideLoading();
    }
  }

// 渲染剧本内容步骤
function renderScriptStep() {
  // 检查步骤5是否已存在，如果不存在则创建
  let step5 = document.getElementById('step5');
  if (!step5) {
    step5 = document.createElement('div');
    step5.id = 'step5';
    step5.className = 'hidden animate-fade-in';
    
    step5.innerHTML = `
      <h2 class="text-2xl font-bold mb-6">生成剧本内容</h2>
      <p class="text-gray-600 mb-6">剧本已生成完成，您可以进行最后的修改和完善</p>
      
      <div class="mb-6">
        <div class="flex justify-between items-center mb-2">
          <span class="font-medium">剧本内容</span>
          <div class="space-x-2">
            <button id="rewrite-section-btn" class="px-3 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors text-sm">
              <i class="fa fa-refresh mr-1"></i> 重写选中
            </button>
            <button id="continue-script-btn" class="px-3 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors text-sm">
              <i class="fa fa-plus mr-1"></i> 续写
            </button>
          </div>
        </div>
        <div id="script-editor" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[500px] bg-gray-50 font-mono text-sm whitespace-pre-wrap"></div>
      </div>
      
      <div class="flex justify-between">
        <button id="back-to-step4-btn" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
          <i class="fa fa-arrow-left mr-2"></i> 返回
        </button>
        <div class="space-x-3">
          <button id="export-script-btn" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
            <i class="fa fa-download mr-2"></i> 导出剧本
          </button>
          <button id="finish-script-btn" class="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md">
            <i class="fa fa-check mr-2"></i> 完成创作
          </button>
        </div>
      </div>
    `;
    
    domElements.scriptCreationContent.appendChild(step5);
    
    // 绑定返回按钮事件
    document.getElementById('back-to-step4-btn').addEventListener('click', () => goToStep(4));
    
    // 绑定其他操作按钮事件
    document.getElementById('rewrite-section-btn').addEventListener('click', handleRewriteSection);
    document.getElementById('continue-script-btn').addEventListener('click', handleContinueScript);
    document.getElementById('export-script-btn').addEventListener('click', handleExportScript);
    document.getElementById('finish-script-btn').addEventListener('click', handleFinishScript);
  }
  
  // 设置剧本内容
  document.getElementById('script-editor').textContent = appState.scriptData.scriptContent;
}

// 处理局部重写
  async function handleRewriteSection() {
    const editor = document.getElementById('script-editor');
    const selectedText = editor.value.substring(
      editor.selectionStart,
      editor.selectionEnd
    );
    
    if (!selectedText.trim()) {
      alert('请先选中要重写的内容');
      return;
    }
    
    const instruction = prompt('请输入重写指令（例如：让这段对话更生动）：');
    
    if (!instruction) return;
    
    showLoading('正在重写内容...');
    
    try {
      const response = await fetch('/api/scripts/rewrite-section', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: selectedText,
          instruction: instruction,
          scriptType: appState.scriptType // 添加剧本类型参数
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // 替换选中的内容
        const newContent = editor.value.substring(0, editor.selectionStart) + 
                          data.rewrittenContent + 
                          editor.value.substring(editor.selectionEnd);
        
        editor.value = newContent;
        appState.scriptData.scriptContent = newContent;
      } else {
        alert(data.message || '重写失败');
      }
    } catch (error) {
      console.error('重写错误:', error);
      alert('重写失败，请稍后重试');
    } finally {
      hideLoading();
    }
  }

// 处理续写
  async function handleContinueScript() {
    const editor = document.getElementById('script-editor');
    const currentContent = editor.value;
    
    const instruction = prompt('请输入续写指令（例如：继续编写下一个场景）：');
    
    if (!instruction) return;
    
    showLoading('正在续写内容...');
    
    try {
      const response = await fetch('/api/scripts/continue-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: currentContent,
          instruction: instruction,
          scriptType: appState.scriptType // 添加剧本类型参数
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // 添加续写内容
        const newContent = currentContent + '\n\n' + data.continuedContent;
        
        editor.value = newContent;
        appState.scriptData.scriptContent = newContent;
      } else {
        alert(data.message || '续写失败');
      }
    } catch (error) {
      console.error('续写错误:', error);
      alert('续写失败，请稍后重试');
    } finally {
      hideLoading();
    }
  }

// 处理导出剧本
function handleExportScript() {
  const scriptContent = document.getElementById('script-editor').value;
  
  // 创建一个Blob对象
  const blob = new Blob([scriptContent], { type: 'text/plain' });
  
  // 创建一个下载链接
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '剧本.txt';
  
  // 触发下载
  document.body.appendChild(a);
  a.click();
  
  // 清理
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  alert('剧本导出成功');
}

// 处理完成创作
function handleFinishScript() {
  if (confirm('确定要完成创作吗？完成后您可以在"我的剧本"中查看。')) {
    // 保存剧本到后端
    saveScript();
  }
}

// 保存剧本
async function saveScript() {
  showLoading('正在保存剧本...');
  
  try {
    const response = await fetch('/api/scripts/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: `剧本_${new Date().toLocaleDateString()}`,
        keywords: appState.keywords,
        logline: appState.selectedLogline,
        outline: appState.scriptData.outline,
        episodes: appState.scriptData.episodes,
        content: document.getElementById('script-editor').value
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      alert('剧本保存成功！');
      // 返回首页
      domElements.scriptCreationSection.classList.add('hidden');
      domElements.homeSection.classList.remove('hidden');
    } else {
      alert(data.message || '保存剧本失败');
    }
  } catch (error) {
    console.error('保存剧本错误:', error);
    alert('保存剧本失败，请稍后重试');
  } finally {
    hideLoading();
  }
}

// 更新步骤指示器
function updateStepIndicator() {
  const steps = domElements.stepsIndicator.querySelectorAll('.flex.flex-col.items-center');
  const lines = domElements.stepsIndicator.querySelectorAll('.step-line');
  
  steps.forEach((step, index) => {
    const stepNumber = index + 1;
    const stepCircle = step.querySelector('div');
    
    if (stepNumber < appState.currentStep) {
      stepCircle.className = 'w-10 h-10 rounded-full border-2 step-complete flex items-center justify-center mb-2';
    } else if (stepNumber === appState.currentStep) {
      stepCircle.className = 'w-10 h-10 rounded-full border-2 step-active flex items-center justify-center mb-2';
    } else {
      stepCircle.className = 'w-10 h-10 rounded-full border-2 step-pending flex items-center justify-center mb-2';
    }
  });
  
  lines.forEach((line, index) => {
    if (index < appState.currentStep - 1) {
      line.className = 'step-line step-line-complete';
    } else if (index === appState.currentStep - 1) {
      line.className = 'step-line step-line-active';
    } else {
      line.className = 'step-line';
    }
  });
}

// 跳转到指定步骤
function goToStep(stepNumber) {
  appState.currentStep = stepNumber;
  
  // 隐藏所有步骤
  for (let i = 1; i <= 5; i++) {
    const stepElement = document.getElementById(`step${i}`);
    if (stepElement) {
      stepElement.classList.add('hidden');
    }
  }
  
  // 显示当前步骤
  const currentStepElement = document.getElementById(`step${stepNumber}`);
  if (currentStepElement) {
    currentStepElement.classList.remove('hidden');
  }
  
  // 更新步骤指示器
  updateStepIndicator();
}

// 显示加载指示器
function showLoading(message) {
  appState.isLoading = true;
  domElements.loadingIndicator.classList.remove('hidden');
  domElements.loadingMessage.textContent = message || '正在处理...';
}

// 隐藏加载指示器
function hideLoading() {
  appState.isLoading = false;
  domElements.loadingIndicator.classList.add('hidden');
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);