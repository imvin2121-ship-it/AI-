// 独立剧本创作页面脚本

// 全局应用状态
const appState = {
    currentStep: 0,
    scriptType: '竖屏短剧',
    episodeCount: 60,
    wordCount: 800,
    currentUser: null,
    scriptData: {
        title: '未命名剧本',
        loglines: [],
        outline: '',
        outlinePoints: null, // 大纲要点
        episodes: [],
        scriptContent: '',
        selectedLogline: null,
        currentEpisodeIndex: 0
    },
    // 新增的题材相关状态
    genreType: '', // 女频/男频
    selectedGenres: [] // 选择的热门题材
};

// 初始化自动保存功能
const autoSave = {
    saveState: function() {
        saveStateToLocalStorage();
    },
    scheduleSave: function() {
        // 延迟保存，避免频繁保存影响性能
        if (autoSaveTimer) {
            clearTimeout(autoSaveTimer);
        }
        autoSaveTimer = setTimeout(() => {
            this.saveState();
        }, 3000);
    }
};

// 初始化自动保存功能
initAutoSave();

// 富文本编辑器实例缓存
const richTextEditors = {};

// 任务管理器 - 用于处理异步任务
const taskManager = {
    activeTasks: {},
    taskStatusCallbacks: {},
    progressBar: null,
    progressText: null,
    cancelBtn: null,
    
    // 初始化任务UI
    initTaskUI() {
        // 创建进度条元素（如果不存在）
        if (!this.progressBar) {
            const progressContainer = document.createElement('div');
            progressContainer.id = 'task-progress-container';
            progressContainer.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg p-4 w-80 z-50 hidden';
            
            progressContainer.innerHTML = `
                <h3 class="text-lg font-medium mb-2">处理中...</h3>
                <div class="flex items-center mb-2">
                    <span id="progress-text">正在准备任务</span>
                    <span id="progress-percentage" class="ml-auto font-medium">0%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2 mb-3">
                    <div id="progress-bar" class="bg-primary h-2 rounded-full" style="width: 0%"></div>
                </div>
                <button id="cancel-task-btn" class="btn-secondary w-full">取消任务</button>
            `;
            
            document.body.appendChild(progressContainer);
            
            this.progressBar = document.getElementById('progress-bar');
            this.progressText = document.getElementById('progress-text');
            this.progressPercentage = document.getElementById('progress-percentage');
            this.cancelBtn = document.getElementById('cancel-task-btn');
            this.progressContainer = progressContainer;
            
            // 绑定取消按钮事件
            this.cancelBtn.addEventListener('click', () => {
                const activeTaskId = Object.keys(this.activeTasks)[0];
                if (activeTaskId) {
                    this.cancelTask(activeTaskId);
                }
            });
        }
    },
    
    // 创建新任务
    async createTask(endpoint, payload, onSuccess, onError, onProgress) {
        this.initTaskUI();
        
        try {
            // 显示加载状态
            showLoading('正在创建任务...');
            
            // 创建任务
            const response = await fetch(`http://localhost:3000${endpoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(payload)
            });
            
            const data = await response.json();
            
            if (!response.ok || !data.taskId) {
                throw new Error(data.message || '创建任务失败');
            }
            
            // 记录任务信息
            this.activeTasks[data.taskId] = {
                startTime: Date.now(),
                endpoint: endpoint
            };
            
            // 保存回调
            if (onProgress) {
                this.taskStatusCallbacks[data.taskId] = {
                    onSuccess,
                    onError,
                    onProgress
                };
            }
            
            // 显示进度条
            this.progressContainer.classList.remove('hidden');
            hideLoading();
            
            // 开始轮询任务状态
            this.pollTaskStatus(data.taskId, onSuccess, onError, onProgress);
            
            return data.taskId;
        } catch (error) {
            hideLoading();
            if (onError) {
                onError(error);
            } else {
                showToast(error.message || '创建任务失败');
            }
            throw error;
        }
    },
    
    // 轮询任务状态
    async pollTaskStatus(taskId, onSuccess, onError, onProgress) {
        try {
            // 轮询间隔从2秒开始，逐渐增加到10秒
            let interval = 2000;
            const maxInterval = 10000;
            
            // 最多轮询5分钟
            const maxPollingTime = 5 * 60 * 1000;
            const startTime = Date.now();
            
            while (Date.now() - startTime < maxPollingTime && this.activeTasks[taskId]) {
                // 检查任务状态
                const response = await fetch(`http://localhost:3000/api/tasks/status/${taskId}`, {
                    method: 'GET',
                    credentials: 'include'
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || '获取任务状态失败');
                }
                
                // 更新进度UI
                const progress = data.progress || 0;
                this.updateProgressUI(progress, data.statusMessage || '正在处理...');
                
                // 调用进度回调
                if (onProgress) {
                    onProgress(data);
                }
                
                // 检查任务是否完成
                if (data.status === 'completed') {
                    // 隐藏进度条
                    this.progressContainer.classList.add('hidden');
                    
                    // 调用成功回调
                    if (onSuccess) {
                        onSuccess(data.result);
                    }
                    
                    // 清理任务
                    delete this.activeTasks[taskId];
                    if (this.taskStatusCallbacks[taskId]) {
                        delete this.taskStatusCallbacks[taskId];
                    }
                    
                    return;
                }
                
                // 检查任务是否失败
                if (data.status === 'failed') {
                    // 隐藏进度条
                    this.progressContainer.classList.add('hidden');
                    
                    // 调用失败回调
                    if (onError) {
                        onError(new Error(data.errorMessage || '任务执行失败'));
                    } else {
                        showToast(data.errorMessage || '任务执行失败');
                    }
                    
                    // 清理任务
                    delete this.activeTasks[taskId];
                    if (this.taskStatusCallbacks[taskId]) {
                        delete this.taskStatusCallbacks[taskId];
                    }
                    
                    return;
                }
                
                // 增加轮询间隔
                interval = Math.min(interval + 500, maxInterval);
                
                // 等待下一次轮询
                await new Promise(resolve => setTimeout(resolve, interval));
            }
            
            // 轮询超时
            if (this.activeTasks[taskId]) {
                // 隐藏进度条
                this.progressContainer.classList.add('hidden');
                
                const error = new Error('任务处理超时，请重试');
                if (onError) {
                    onError(error);
                } else {
                    showToast('任务处理超时，请重试');
                }
                
                // 清理任务
                delete this.activeTasks[taskId];
                if (this.taskStatusCallbacks[taskId]) {
                    delete this.taskStatusCallbacks[taskId];
                }
            }
        } catch (error) {
            // 隐藏进度条
            this.progressContainer.classList.add('hidden');
            
            if (onError) {
                onError(error);
            } else {
                showToast(error.message || '任务状态查询失败');
            }
            
            // 清理任务
            if (this.activeTasks[taskId]) {
                delete this.activeTasks[taskId];
            }
            if (this.taskStatusCallbacks[taskId]) {
                delete this.taskStatusCallbacks[taskId];
            }
        }
    },
    
    // 取消任务
    async cancelTask(taskId) {
        try {
            const response = await fetch(`http://localhost:3000/api/tasks/cancel/${taskId}`, {
                method: 'POST',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || '取消任务失败');
            }
            
            // 隐藏进度条
            this.progressContainer.classList.add('hidden');
            
            // 清理任务
            delete this.activeTasks[taskId];
            if (this.taskStatusCallbacks[taskId]) {
                delete this.taskStatusCallbacks[taskId];
            }
            
            showToast('任务已取消');
        } catch (error) {
            showToast(error.message || '取消任务失败');
        }
    },
    
    // 更新进度UI
    updateProgressUI(progress, statusMessage) {
        if (this.progressBar && this.progressText && this.progressPercentage) {
            this.progressBar.style.width = `${progress}%`;
            this.progressText.textContent = statusMessage;
            this.progressPercentage.textContent = `${progress}%`;
        }
    },
    
    // 检查是否有活跃任务
    hasActiveTask() {
        return Object.keys(this.activeTasks).length > 0;
    },
    
    // 获取所有活跃任务
    getActiveTasks() {
        return this.activeTasks;
    }
};

// DOM元素缓存
const domElements = {
    scriptCreatorContent: document.getElementById('script-creator-content'),
    prevStepBtn: document.getElementById('prev-step-btn'),
    nextStepBtn: document.getElementById('next-step-btn'),
    saveScriptBtn: document.getElementById('save-script-btn'),
    exportScriptBtn: document.getElementById('export-script-btn'),
    userMenuBtn: document.getElementById('user-menu-btn'),
    userMenu: document.getElementById('user-menu'),
    logoutBtn: document.getElementById('logout-btn'),
    backBtn: document.getElementById('back-btn'),
    previewBtn: document.getElementById('preview-btn'),
    loadingOverlay: document.getElementById('loading-overlay'),
    loadingMessage: document.getElementById('loading-message'),
    scriptTitle: document.getElementById('script-title'),
    scriptTypeDisplay: document.getElementById('script-type-display'),
    episodeCountDisplay: document.getElementById('episode-count-display'),
    lastUpdated: document.getElementById('last-updated'),
    userInitial: document.getElementById('user-initial'),
    userName: document.getElementById('user-name')
};

// 初始化应用
function initApp() {
    // 检查用户登录状态
    checkUserLogin();
    
    // 绑定事件监听
    bindEventListeners();
    
    // 初始渲染
    renderCurrentStep();
    updateStepNavigation();
}

// 检查用户登录状态
async function checkUserLogin() {
    try {
        const response = await fetch('http://localhost:3000/api/users/current', {
            credentials: 'include'
        });
        
        if (response.ok) {
            const user = await response.json();
            appState.currentUser = user;
            updateUserDisplay(user);
        } else {
            // 用户未登录，显示为演示模式
            console.log('用户未登录，进入演示模式');
            appState.currentUser = { username: '演示用户' };
            updateUserDisplay(appState.currentUser);
        }
    } catch (error) {
        console.error('检查用户登录状态失败:', error);
        // API调用失败，进入演示模式
        appState.currentUser = { username: '演示用户' };
        updateUserDisplay(appState.currentUser);
        showToast('当前为离线演示模式，部分功能可能受限');
    }
}

// 更新用户显示
function updateUserDisplay(user) {
    if (user.name) {
        domElements.userName.textContent = user.name;
        domElements.userInitial.textContent = user.name.charAt(0).toUpperCase();
    } else if (user.email) {
        domElements.userName.textContent = user.email.split('@')[0];
        domElements.userInitial.textContent = user.email.charAt(0).toUpperCase();
    }
}

// 绑定事件监听
function bindEventListeners() {
    // 导航步骤点击事件
    for (let i = 0; i <= 5; i++) {
        const stepNavBtn = document.getElementById(`step-nav-${i}`);
        if (stepNavBtn) {
            stepNavBtn.addEventListener('click', () => {
                goToStep(i);
            });
        }
    }
    
    // 前后步骤按钮点击事件
    domElements.prevStepBtn.addEventListener('click', goToPrevStep);
    domElements.nextStepBtn.addEventListener('click', goToNextStep);
    
    // 用户菜单事件
    domElements.userMenuBtn.addEventListener('click', toggleUserMenu);
    domElements.logoutBtn.addEventListener('click', handleLogout);
    
    // 保存和导出按钮事件
    domElements.saveScriptBtn.addEventListener('click', saveScript);
    domElements.exportScriptBtn.addEventListener('click', exportScript);
    
    // 返回和预览按钮事件
    domElements.backBtn.addEventListener('click', goBack);
    domElements.previewBtn.addEventListener('click', previewScript);
    
    // 剧本标题更改事件
    domElements.scriptTitle.addEventListener('input', updateScriptTitle);
    
    // 点击页面其他地方关闭下拉菜单
    document.addEventListener('click', (event) => {
        if (!domElements.userMenuBtn.contains(event.target) && !domElements.userMenu.contains(event.target)) {
            domElements.userMenu.classList.add('hidden');
        }
    });
    
    // 剧本类型选择事件
    const scriptTypeOptions = document.querySelectorAll('.script-type-option');
    scriptTypeOptions.forEach(option => {
        // 跳过开发中的功能
        if (option.classList.contains('opacity-50')) return;
        
        option.addEventListener('click', () => {
            handleScriptTypeSelection(option);
        });
    });
    
    // 创作方式选择事件
    if (document.getElementById('start-original-btn')) {
        document.getElementById('start-original-btn').addEventListener('click', proceedToOriginalScript);
    }
    
    if (document.getElementById('start-adapt-btn')) {
        document.getElementById('start-adapt-btn').addEventListener('click', proceedToAdaptScript);
    }
    
    // 为剧集设置和每集字数输入框添加变化事件
    const episodeCountInput = document.getElementById('episode-count');
    const wordCountInput = document.getElementById('word-count');
    
    if (episodeCountInput) {
        episodeCountInput.addEventListener('change', (e) => {
            appState.episodeCount = parseInt(e.target.value) || 60;
            autoSave.saveState(appState); // 自动保存状态
        });
    }
    
    if (wordCountInput) {
        wordCountInput.addEventListener('change', (e) => {
            appState.wordCount = parseInt(e.target.value) || 800;
            autoSave.saveState(appState); // 自动保存状态
        });
    }
}

// 渲染当前步骤
function renderCurrentStep() {
    domElements.scriptCreatorContent.innerHTML = '';
    
    switch (appState.currentStep) {
        case 0:
            renderScriptTypeSelection();
            break;
        case 1:
            renderGenerateLoglinesStep();
            break;
        case 2:
            renderLoglinesStep();
            break;
        case 3:
            renderOutlineStep();
            break;
        case 4:
            renderEpisodesStep();
            break;
        case 5:
            renderScriptStep();
            break;
    }
}

// 渲染剧本类型选择步骤
function renderScriptTypeSelection() {
    const step0Content = document.createElement('div');
    step0Content.id = 'step-0';
    step0Content.className = 'animate-slide-up';
    
    step0Content.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">选择剧本类型</h2>
        <p class="text-gray-600 mb-8">请选择您想要创作的剧本类型，并设置相关参数</p>
        
        <div class="space-y-8">
            <!-- 剧本类型选择 -->
            <div>
                <label class="block text-gray-700 font-medium mb-3">剧本类型</label>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors script-type-option ${appState.scriptType === '竖屏短剧' ? 'border-primary bg-primary/5' : ''}" data-type="竖屏短剧">
                        <div class="flex items-center mb-2">
                            <div class="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                                <i class="fa fa-mobile text-primary"></i>
                            </div>
                            <h3 class="text-lg font-bold">竖屏短剧</h3>
                        </div>
                        <p class="text-gray-600">适用于手机端观看，每集时长1-3分钟，适合短视频平台</p>
                    </div>
                    
                    <div class="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors script-type-option ${appState.scriptType === '横屏短剧' ? 'border-primary bg-primary/5' : ''}" data-type="横屏短剧">
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
            
            <!-- 短剧题材分类 - 新增部分 -->
            <div id="genre-selection" class="${(appState.scriptType === '竖屏短剧' || appState.scriptType === '横屏短剧') ? '' : 'hidden'}">
                <label class="block text-gray-700 font-medium mb-3">题材分类</label>
                
                <!-- 女频/男频选择 -->
                <div class="mb-4">
                    <label class="block text-gray-500 mb-2">面向受众</label>
                    <div class="flex space-x-4">
                        <label class="flex items-center cursor-pointer">
                            <input type="radio" name="genreType" value="女频" ${appState.genreType === '女频' ? 'checked' : ''} class="form-radio text-primary focus:ring-primary h-5 w-5">
                            <span class="ml-2 text-gray-700">女频</span>
                        </label>
                        <label class="flex items-center cursor-pointer">
                            <input type="radio" name="genreType" value="男频" ${appState.genreType === '男频' ? 'checked' : ''} class="form-radio text-primary focus:ring-primary h-5 w-5">
                            <span class="ml-2 text-gray-700">男频</span>
                        </label>
                    </div>
                </div>
                
                <!-- 热门题材选择 -->
                <div>
                    <label class="block text-gray-500 mb-2">热门题材（可多选）</label>
                    <div class="flex flex-wrap gap-2">
                        ${['霸总', '魂穿', '萌宝', '复仇', '逆袭', '兽语', '甜宠', '悬疑', '校园', '修真', '职场', '末世'].map(genre => `
                        <label class="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-700 cursor-pointer hover:bg-primary/10 transition-colors">
                            <input type="checkbox" name="selectedGenres" value="${genre}" ${appState.selectedGenres.includes(genre) ? 'checked' : ''} class="form-checkbox text-primary focus:ring-primary h-4 w-4 mr-2">
                            <span>${genre}</span>
                        </label>
                        `).join('')}
                    </div>
                </div>
            </div>
            
            <!-- 剧集设置 -->
            <div id="script-settings" class="${appState.scriptType ? '' : 'hidden'}">
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
            <div id="creation-type-section" class="${appState.scriptType ? '' : 'hidden'}">
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
    
    domElements.scriptCreatorContent.appendChild(step0Content);
    
    // 重新绑定事件
    const scriptTypeOptions = document.querySelectorAll('.script-type-option');
    scriptTypeOptions.forEach(option => {
        if (option.classList.contains('opacity-50')) return;
        
        option.addEventListener('click', () => {
            handleScriptTypeSelection(option);
        });
    });
    
    // 绑定题材相关事件
    const genreTypeRadios = document.querySelectorAll('input[name="genreType"]');
    genreTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            appState.genreType = e.target.value;
            autoSave.saveState(appState); // 自动保存状态
        });
    });
    
    const genreCheckboxes = document.querySelectorAll('input[name="selectedGenres"]');
    genreCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const genre = e.target.value;
            if (e.target.checked) {
                if (!appState.selectedGenres.includes(genre)) {
                    appState.selectedGenres.push(genre);
                }
            } else {
                appState.selectedGenres = appState.selectedGenres.filter(g => g !== genre);
            }
            autoSave.saveState(appState); // 自动保存状态
        });
    });
    
    if (document.getElementById('start-original-btn')) {
        document.getElementById('start-original-btn').addEventListener('click', proceedToOriginalScript);
    }
    
    if (document.getElementById('start-adapt-btn')) {
        document.getElementById('start-adapt-btn').addEventListener('click', proceedToAdaptScript);
    }
}

// 处理剧本类型选择
function handleScriptTypeSelection(option) {
    // 移除之前的选择状态
    const scriptTypeOptions = document.querySelectorAll('.script-type-option');
    scriptTypeOptions.forEach(opt => opt.classList.remove('border-primary', 'bg-primary/5'));
    
    // 设置新的选择状态
    option.classList.add('border-primary', 'bg-primary/5');
    
    // 保存选择的剧本类型
    appState.scriptType = option.dataset.type;
    
    // 更新显示
    domElements.scriptTypeDisplay.textContent = appState.scriptType;
    
    // 显示设置区域
    document.getElementById('script-settings').classList.remove('hidden');
    document.getElementById('creation-type-section').classList.remove('hidden');
    
    // 显示题材选择区域（仅短剧类型）
    const genreSelection = document.getElementById('genre-selection');
    if (appState.scriptType === '竖屏短剧' || appState.scriptType === '横屏短剧') {
        genreSelection.classList.remove('hidden');
    } else {
        genreSelection.classList.add('hidden');
    }
    
    // 自动保存状态
    autoSave.saveState(appState);
}

// 继续到原创剧本创作
function proceedToOriginalScript() {
    // 保存设置
    appState.episodeCount = parseInt(document.getElementById('episode-count').value) || 10;
    appState.wordCount = parseInt(document.getElementById('word-count').value) || 5000;
    
    // 更新显示
    domElements.episodeCountDisplay.textContent = appState.episodeCount;
    
    // 进入步骤1
    goToStep(1);
}

// 继续到改编剧本创作
function proceedToAdaptScript() {
    // 保存设置
    appState.episodeCount = parseInt(document.getElementById('episode-count').value) || 10;
    appState.wordCount = parseInt(document.getElementById('word-count').value) || 5000;
    
    // 更新显示
    domElements.episodeCountDisplay.textContent = appState.episodeCount;
    
    // 进入改编剧本流程
    alert('改编剧本功能即将上线，请先尝试原创剧本功能');
    // 这里可以添加改编剧本的实现
}

// 渲染生成故事创意步骤
function renderGenerateLoglinesStep() {
    const step1Content = document.createElement('div');
    step1Content.id = 'step-1';
    step1Content.className = 'animate-slide-up';
    
    step1Content.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">生成故事创意</h2>
        <p class="text-gray-600 mb-8">请输入关键词，AI将为您生成故事创意</p>
        
        <div class="space-y-6">
            <div>
                <label for="keywords" class="block text-gray-700 font-medium mb-2">关键词</label>
                <input type="text" id="keywords" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50" placeholder="例如：爱情,都市,职场,逆袭">
                <p class="text-sm text-gray-500 mt-1">多个关键词请用逗号分隔</p>
            </div>
            
            <div class="flex space-x-4">
                <button id="generate-loglines-btn" class="btn-primary flex-1">
                    <i class="fa fa-magic mr-2"></i>生成故事创意
                </button>
            </div>
        </div>
    `;
    
    domElements.scriptCreatorContent.appendChild(step1Content);
    
    // 绑定生成故事创意按钮事件
    document.getElementById('generate-loglines-btn').addEventListener('click', generateLoglines);
}

// 生成故事创意
async function generateLoglines() {
    const keywords = document.getElementById('keywords').value.trim();
    
    if (!keywords) {
        alert('请输入至少一个关键词');
        return;
    }
    
    // 检查是否有活跃任务
    if (taskManager.hasActiveTask()) {
        alert('有任务正在处理中，请等待完成后再进行操作');
        return;
    }
    
    try {
        // 显示加载骨架屏
        const loglinesContainer = document.getElementById('loglines-container');
        if (loglinesContainer) {
            // 清空容器并添加骨架屏
            loglinesContainer.innerHTML = '';
            for (let i = 0; i < 5; i++) {
                const skeleton = createTextSkeleton('logline-skeleton', 'logline-option border border-gray-200 rounded-lg p-4 mb-4');
                loglinesContainer.appendChild(skeleton);
            }
        }
        
        // 使用任务管理器创建异步任务
        await taskManager.createTask(
            '/api/scripts/generate-loglines',
            {
                keywords,
                scriptType: appState.scriptType,
                genreType: appState.genreType,
                selectedGenres: appState.selectedGenres,
                episodeCount: appState.episodeCount,
                maxResults: 5 // 请求固定返回5个创意
            },
            // 成功回调
            (result) => {
                // 确保最多只显示5个创意且每个创意在100字以内
                appState.scriptData.loglines = result.loglines.slice(0, 5).map(logline => {
                    if (logline.length > 100) {
                        return logline.substring(0, 97) + '...';
                    }
                    return logline;
                });
                appState.scriptData.selectedLogline = null; // 重置选择
                goToStep(2);
                showToast('故事创意生成成功！');
                
                // 自动保存状态
                autoSave.saveState(appState);
            },
            // 失败回调
            (error) => {
                console.error('生成故事创意错误:', error);
                // API调用失败，使用模拟数据生成5个创意，每个都控制在100字以内
                const mockKeywords = keywords.split(',');
                const templates = [
                    `《${mockKeywords[0]}奇缘》\n${appState.genreType === '女频' ? '平凡少女' : '普通青年'}意外卷入${appState.selectedGenres.includes('魂穿') ? '时空穿越' : '奇妙事件'}，与${appState.selectedGenres.includes('霸总') ? '霸道总裁' : '神秘人物'}相遇，展开一段精彩故事。`,
                    `${appState.genreType === '女频' ? '《心动瞬间》' : '《热血征程》'}\n讲述${appState.selectedGenres.includes('校园') ? '校园' : appState.selectedGenres.includes('职场') ? '职场' : '都市'}中的${mockKeywords[0]}故事，主角面对挑战展现${appState.selectedGenres.includes('逆袭') ? '逆袭' : '坚韧'}精神，最终收获成功。`,
                    `${appState.selectedGenres.includes('萌宝') ? '《萌宝当家》' : '《命运交错》'}\n${appState.genreType === '女频' ? '单身母亲' : '年轻父亲'}带着可爱的${mockKeywords[0]}宝宝，在贵人帮助下揭开身世之谜，充满温情与悬念。`,
                    `${appState.selectedGenres.includes('兽语') ? '《与兽共舞》' : '《都市传说》'}\n${appState.genreType === '女频' ? '少女' : '少年'}意外获得特殊能力，在与${mockKeywords[0]}相关事件中成长并发现自己的使命。`,
                    `${appState.selectedGenres.includes('悬疑') ? '《迷雾追踪》' : '《未来告白》'}\n在${appState.selectedGenres.includes('末世') ? '末世' : appState.selectedGenres.includes('校园') ? '校园' : '都市'}背景下，主角调查与${mockKeywords[0]}相关的离奇事件，过程中产生复杂情感纠葛。`
                ];
                
                appState.scriptData.loglines = templates;
                appState.scriptData.selectedLogline = null; // 重置选择
                goToStep(2);
                showToast('当前为离线模式，显示模拟数据');
                
                // 自动保存状态
                autoSave.saveState(appState);
            },
            // 进度回调
            (status) => {
                // 可以在这里添加自定义的进度处理逻辑
                console.log('任务进度:', status);
            }
        );
    } catch (error) {
        console.error('创建任务失败:', error);
    }
}

// 渲染故事创意选择步骤
function renderLoglinesStep() {
    const step2Content = document.createElement('div');
    step2Content.id = 'step-2';
    step2Content.className = 'animate-slide-up';
    
    let loglinesHtml = '';
    appState.scriptData.loglines.forEach((logline, index) => {
        loglinesHtml += `
            <div class="logline-option border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-primary/50 transition-colors mb-4" data-index="${index}">
                <h3 class="text-lg font-bold mb-2">故事创意 ${index + 1}</h3>
                <p class="text-gray-700">${logline}</p>
            </div>
        `;
    });
    
    step2Content.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">选择故事创意</h2>
        <p class="text-gray-600 mb-8">请选择一个故事创意，或点击"换一批"获取更多灵感</p>
        
        <div id="loglines-container" class="space-y-4 mb-6">
            ${loglinesHtml}
        </div>
        
        <div class="flex space-x-4">
            <button id="change-loglines-btn" class="btn-secondary">
                <i class="fa fa-refresh mr-2"></i>换一批
            </button>
            <button id="confirm-logline-btn" class="btn-primary ml-auto">
                确认选择<i class="fa fa-arrow-right ml-2"></i>
            </button>
        </div>
    `;
    
    domElements.scriptCreatorContent.appendChild(step2Content);
    
    // 绑定故事创意选择事件
    const loglineOptions = document.querySelectorAll('.logline-option');
    loglineOptions.forEach(option => {
        option.addEventListener('click', () => {
            // 移除之前的选择状态
            loglineOptions.forEach(opt => opt.classList.remove('border-primary', 'bg-primary/5'));
            // 设置新的选择状态
            option.classList.add('border-primary', 'bg-primary/5');
            // 保存选择的故事创意
            appState.scriptData.selectedLogline = parseInt(option.dataset.index);
        });
    });
    
    // 绑定按钮事件
    document.getElementById('change-loglines-btn').addEventListener('click', generateLoglines);
    document.getElementById('confirm-logline-btn').addEventListener('click', confirmLogline);
}

// 确认故事创意选择
function confirmLogline() {
    if (appState.scriptData.selectedLogline === null) {
        alert('请先选择一个故事创意');
        return;
    }
    
    // 自动保存状态
    autoSave.saveState(appState);
    
    goToStep(3);
}

// 渲染完善故事梗概步骤
function renderOutlineStep() {
    const step3Content = document.createElement('div');
    step3Content.id = 'step-3';
    step3Content.className = 'animate-slide-up';
    
    const selectedLogline = appState.scriptData.loglines[appState.scriptData.selectedLogline] || '';
    
    step3Content.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">完善故事梗概</h2>
        <p class="text-gray-600 mb-8">请完善故事梗概，或让AI帮您生成更详细的梗概和大纲要点</p>
        
        <div class="space-y-8">
            <!-- 大纲要点自动生成区域 -->
            <div>
                <div class="flex items-center justify-between mb-3">
                    <label class="block text-gray-700 font-medium">大纲要点</label>
                    <button id="generate-outline-points-btn" class="text-primary text-sm hover:underline">
                        <i class="fa fa-refresh mr-1"></i>生成要点
                    </button>
                </div>
                <div id="outline-points-container" class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <!-- 大纲要点将在这里生成 -->
                </div>
                <p class="text-sm text-gray-500">点击生成要点，AI将根据您的故事创意生成核心情节要点</p>
            </div>
            
            <!-- 故事梗概编辑区域 -->
            <div>
                <label for="outline-editor" class="block text-gray-700 font-medium mb-2">故事梗概</label>
                <div id="outline-editor-container" class="w-full border border-gray-300 rounded-lg overflow-hidden">
                    <!-- 富文本编辑器工具栏 -->
                    <div id="outline-toolbar" class="bg-gray-50 border-b border-gray-200 p-2 flex items-center space-x-2">
                        <button class="editor-tool text-gray-700 p-1 hover:bg-gray-200 rounded" title="加粗" data-command="bold"><i class="fa fa-bold"></i></button>
                        <button class="editor-tool text-gray-700 p-1 hover:bg-gray-200 rounded" title="斜体" data-command="italic"><i class="fa fa-italic"></i></button>
                        <button class="editor-tool text-gray-700 p-1 hover:bg-gray-200 rounded" title="下划线" data-command="underline"><i class="fa fa-underline"></i></button>
                        <span class="h-4 border-r border-gray-300 mx-1"></span>
                        <button class="editor-tool text-gray-700 p-1 hover:bg-gray-200 rounded" title="插入标题" data-command="heading"><i class="fa fa-header"></i></button>
                        <button class="editor-tool text-gray-700 p-1 hover:bg-gray-200 rounded" title="插入列表" data-command="list"><i class="fa fa-list-ul"></i></button>
                        <button class="editor-tool text-gray-700 p-1 hover:bg-gray-200 rounded" title="插入编号列表" data-command="numbered-list"><i class="fa fa-list-ol"></i></button>
                        <span class="h-4 border-r border-gray-300 mx-1"></span>
                        <button class="editor-tool text-gray-700 p-1 hover:bg-gray-200 rounded" title="撤销" data-command="undo"><i class="fa fa-undo"></i></button>
                        <button class="editor-tool text-gray-700 p-1 hover:bg-gray-200 rounded" title="重做" data-command="redo"><i class="fa fa-repeat"></i></button>
                    </div>
                    <!-- 富文本编辑区域 -->
                    <div id="outline-editor" class="w-full min-h-[300px] p-4 focus:outline-none" contenteditable="true">${appState.scriptData.outline || selectedLogline}</div>
                </div>
            </div>
            
            <div class="flex space-x-4">
                <button id="generate-outline-btn" class="btn-secondary">
                    <i class="fa fa-magic mr-2"></i>AI生成完整梗概
                </button>
                <button id="confirm-outline-btn" class="btn-primary ml-auto">
                    确认梗概<i class="fa fa-arrow-right ml-2"></i>
                </button>
            </div>
        </div>
    `;
    
    domElements.scriptCreatorContent.appendChild(step3Content);
    
    // 初始化富文本编辑器
    if (!richTextEditors.outline) {
        richTextEditors.outline = new RichTextEditor('outline-editor', 'outline-toolbar');
        
        // 添加内容变化事件，实现自动保存
        document.getElementById('outline-editor').addEventListener('input', () => {
            // 延迟保存，避免频繁保存影响性能
            autoSave.scheduleSave(appState);
        });
    }
    
    // 绑定按钮事件
    document.getElementById('generate-outline-btn').addEventListener('click', generateOutline);
    document.getElementById('confirm-outline-btn').addEventListener('click', confirmOutline);
    document.getElementById('generate-outline-points-btn').addEventListener('click', generateOutlinePoints);
    
    // 如果已有大纲要点数据，渲染出来
    if (appState.scriptData.outlinePoints) {
        renderOutlinePoints(appState.scriptData.outlinePoints);
    }
}

// 生成大纲要点
async function generateOutlinePoints() {
    const selectedLogline = appState.scriptData.loglines[appState.scriptData.selectedLogline] || '';
    
    if (!selectedLogline) {
        alert('请先选择一个故事创意');
        return;
    }
    
    showLoading('正在生成大纲要点...');
    
    // 显示骨架屏
    const outlinePointsContainer = document.getElementById('outline-points-container');
    if (outlinePointsContainer) {
        outlinePointsContainer.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            const skeleton = createParagraphSkeleton('outline-point-skeleton', 'flex items-start p-3 bg-gray-50 rounded-lg');
            outlinePointsContainer.appendChild(skeleton);
        }
    }
    
    try {
        // 实际项目中这里应该调用API
        // 由于是模拟环境，直接生成模拟数据
        
        // 根据选择的题材类型生成对应的大纲要点
        const genreType = appState.genreType || '女频';
        const selectedGenres = appState.selectedGenres || [];
        
        let points = [];
        
        // 根据题材组合生成不同的大纲要点
        if (selectedGenres.includes('霸总')) {
            points = [
                '主角意外邂逅霸道总裁，产生误会',
                '工作中再次相遇，被迫合作',
                '总裁的强势性格与主角的独立产生冲突',
                '逐渐了解彼此的过去，产生感情',
                '面临外界压力和竞争对手的挑战',
                '克服困难，最终走到一起'
            ];
        } else if (selectedGenres.includes('魂穿')) {
            points = [
                '主角意外穿越到异世界或古代',
                '适应新身份和环境，发现自己的特殊能力',
                '遇到关键人物，展开冒险',
                '寻找回到原世界的方法',
                '在过程中成长并找到真爱',
                '面临重大抉择，最终找到自我价值'
            ];
        } else if (selectedGenres.includes('萌宝')) {
            points = [
                '主角意外成为萌宝的监护人',
                '手忙脚乱的照顾萌宝过程',
                '与萌宝的生父/生母相遇',
                '共同照顾萌宝，产生感情',
                '面临外界对萌宝的威胁',
                '一家三口团聚，获得幸福'
            ];
        } else {
            points = [
                '主角遭遇生活中的重大变故',
                '在困境中寻找突破',
                '遇到贵人相助',
                '通过努力获得成长和成功',
                '收获友情和爱情',
                '实现自我价值'
            ];
        }
        
        appState.scriptData.outlinePoints = points;
        renderOutlinePoints(points);
        showToast('大纲要点生成成功！');
        
        // 自动保存状态
        autoSave.saveState(appState);
    } catch (error) {
        console.error('生成大纲要点错误:', error);
        showToast('生成大纲要点失败');
    } finally {
        hideLoading();
    }
}

// 渲染大纲要点
function renderOutlinePoints(points) {
    const container = document.getElementById('outline-points-container');
    container.innerHTML = '';
    
    points.forEach((point, index) => {
        const pointElement = document.createElement('div');
        pointElement.className = 'flex items-start p-3 bg-gray-50 rounded-lg';
        pointElement.innerHTML = `
            <div class="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">
                ${index + 1}
            </div>
            <p class="text-gray-700">${point}</p>
        `;
        container.appendChild(pointElement);
    });
}

// AI生成详细故事梗概
async function generateOutline() {
    const selectedLogline = appState.scriptData.loglines[appState.scriptData.selectedLogline] || '';
    
    if (!selectedLogline) {
        alert('请先选择一个故事创意');
        return;
    }
    
    // 检查是否有活跃任务
    if (taskManager.hasActiveTask()) {
        alert('有任务正在处理中，请等待完成后再进行操作');
        return;
    }
    
    try {
        // 显示加载骨架屏
        const outlineEditor = document.getElementById('outline-editor');
        if (outlineEditor) {
            // 清空内容并添加骨架屏
            outlineEditor.innerHTML = '';
            
            // 创建多个段落骨架屏
            for (let i = 0; i < 5; i++) {
                const skeleton = createParagraphSkeleton('outline-skeleton', 'mb-4');
                outlineEditor.appendChild(skeleton);
            }
        }
        
        // 使用任务管理器创建异步任务
        await taskManager.createTask(
            '/api/scripts/generate-outline',
            {
                logline: appState.scriptData.loglines[appState.scriptData.selectedLogline],
                scriptType: appState.scriptType,
                genreType: appState.genreType,
                selectedGenres: appState.selectedGenres,
                outlinePoints: appState.scriptData.outlinePoints
            },
            // 成功回调
            (result) => {
                appState.scriptData.outline = result.outline;
                document.getElementById('outline-editor').innerHTML = result.outline;
                showToast('故事梗概生成成功！');
                
                // 自动保存状态
                autoSave.saveState(appState);
            },
            // 失败回调
            (error) => {
                console.error('生成故事梗概错误:', error);
                // API调用失败，使用模拟数据
                // 首先获取故事标题（处理换行符的情况）
                const loglineText = appState.scriptData.loglines[appState.scriptData.selectedLogline];
                const title = loglineText.split('\n')[0].split('》')[0].substring(1) || '都市情感故事';
                const genreType = appState.genreType || '女频';
                const selectedGenres = appState.selectedGenres || [];
                
                // 根据题材生成不同的模拟大纲
                let mockOutline = `# 故事梗概

## 标题
${title}

## 类型
`;
                
                // 添加类型标签
                if (selectedGenres.length > 0) {
                    mockOutline += selectedGenres.join(' / ') + '\n\n';
                } else {
                    mockOutline += '都市情感\n\n';
                }
                
                // 主要内容
                mockOutline += '## 主要内容\n';
                if (selectedGenres.includes('霸总')) {
                    mockOutline += '这是一个关于霸道总裁与坚强独立女性之间的爱情故事。故事开场即设置强力钩子：女主角因误会当众顶撞总裁，却意外获得工作机会。两人从互相嫌弃到彼此欣赏，身份反差和性格冲突贯穿始终，每5集设计一个中型爽点（如女主打脸反派、总裁英雄救美），每20集设计一个大型爽点（如两人关系公开、共同度过危机）。\n\n';
                } else if (selectedGenres.includes('魂穿')) {
                    mockOutline += '这是一个关于时空穿越的奇幻故事。故事以强烈悬念开场：主角在车祸中穿越到异世界，醒来发现自己拥有特殊能力。极致人设反差：现代人的思维与古代身份的碰撞，平凡少女与尊贵身份的对比。每集结尾设置悬念，每8集设计一个情感或能力展示的爽点，让观众欲罢不能。\n\n';
                } else if (selectedGenres.includes('萌宝')) {
                    mockOutline += '这是一个充满温情的故事。故事以萌宝突然出现的悬念开场，主角被迫成为监护人。极致人设：事业型女性与萌宝的温馨互动，高冷总裁与软萌孩子的反差萌。每集设计暖心小剧场，每10集安排一次情感高潮，形成温馨而有节奏的观剧体验。\n\n';
                } else {
                    mockOutline += '这是一个关于年轻人在都市中奋斗、成长并收获爱情的故事。故事以主角面临人生重大抉择的悬念开场，塑造有成长弧光的人物形象。每集设置小冲突推动情节发展，每12集设计一次角色能力或情感的高光时刻，形成波浪式的观剧体验。\n\n';
                }
                
                // 主要人物
                mockOutline += '## 主要人物\n';
                if (genreType === '女频') {
                    mockOutline += '- 林小棠：女主角，25岁，独立坚强，对生活充满热情\n';
                    mockOutline += selectedGenres.includes('霸总') ? '- 顾景深：男主角，30岁，霸道总裁，外表冷漠内心温柔\n' : 
                                   '- 陈阳：男主角，28岁，阳光开朗，充满责任感\n';
                } else {
                    mockOutline += '- 龙辰：男主角，28岁，热血青年，勇敢正直\n';
                    mockOutline += '- 苏凝：女主角，23岁，温柔善良，善解人意\n';
                }
                mockOutline += '- 配角：1-2位好友或同事，为故事增添趣味和推动情节发展\n\n';
                
                // 故事发展
                mockOutline += '## 故事发展\n';
                if (appState.scriptData.outlinePoints && appState.scriptData.outlinePoints.length > 0) {
                    appState.scriptData.outlinePoints.forEach((point, index) => {
                        mockOutline += `${index + 1}. ${point}\n`;
                    });
                } else {
                    mockOutline += '1. **相遇**：主角在偶然的机会下相遇，产生初步印象\n';
                    mockOutline += '2. **接触**：通过工作或生活中的接触，逐渐了解彼此\n';
                    mockOutline += '3. **冲突**：由于性格、背景或外界因素，产生矛盾和冲突\n';
                    mockOutline += '4. **成长**：在解决问题的过程中，两人共同成长\n';
                    mockOutline += '5. **和解**：敞开心扉，化解误会，感情升温\n';
                    mockOutline += '6. **圆满**：克服重重困难，最终走到一起\n';
                }
                
                appState.scriptData.outline = mockOutline;
                document.getElementById('outline-editor').innerHTML = mockOutline;
                showToast('当前为离线模式，显示模拟数据');
                
                // 自动保存状态
                autoSave.saveState(appState);
            },
            // 进度回调
            (status) => {
                // 可以在这里添加自定义的进度处理逻辑
                console.log('任务进度:', status);
            }
        );
    } catch (error) {
        console.error('创建任务失败:', error);
    }
}

// 确认故事梗概
function confirmOutline() {
    const outline = document.getElementById('outline-editor').innerHTML.trim();
    
    if (!outline) {
        alert('请完善故事梗概');
        return;
    }
    
    appState.scriptData.outline = outline;
    
    // 自动保存状态
    autoSave.saveState(appState);
    
    goToStep(4);
}

// 渲染分集大纲步骤
function renderEpisodesStep() {
    const step4Content = document.createElement('div');
    step4Content.id = 'step-4';
    step4Content.className = 'animate-slide-up';
    
    let episodesHtml = '';
    if (appState.scriptData.episodes.length > 0) {
        appState.scriptData.episodes.forEach((episode, index) => {
            episodesHtml += `
                <div class="episode-item border border-gray-200 rounded-lg p-4 mb-4">
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="text-lg font-bold">第 ${index + 1} 集</h3>
                        <div class="flex space-x-2">
                            <button class="edit-episode-btn text-gray-600 hover:text-primary p-1" data-index="${index}" title="编辑">
                                <i class="fa fa-pencil"></i>
                            </button>
                            <button class="delete-episode-btn text-gray-600 hover:text-red-500 p-1" data-index="${index}" title="删除">
                                <i class="fa fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="episode-content">
                        <div class="line-clamp-3 mb-2">${episode.split('\n').slice(0, 10).join('\n')}</div>
                        ${episode.split('\n').length > 10 ? `
                        <button class="show-more-btn text-primary text-sm hover:underline" data-index="${index}">显示更多</button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
    }
    
    step4Content.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">生成分集大纲</h2>
        <p class="text-gray-600 mb-8">请生成分集大纲，或根据需要进行调整</p>
        
        <div class="mb-6">
            <div class="flex justify-between items-center mb-4">
                <div class="flex items-center space-x-2">
                    <label for="batch-episode-count" class="text-gray-700 font-medium">批量生成集数：</label>
                    <input type="number" id="batch-episode-count" min="1" max="10" value="5" class="w-20 px-3 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-center">
                </div>
                ${appState.scriptData.episodes.length > 0 ? `
                <button id="clear-all-episodes-btn" class="text-gray-600 hover:text-red-500 text-sm">
                    <i class="fa fa-trash mr-1"></i>清空全部
                </button>
                ` : ''}
            </div>
            
            ${episodesHtml ? `
            <div id="episodes-container" class="space-y-4 mb-6">
                ${episodesHtml}
            </div>
            ` : `
            <div class="text-center py-10 text-gray-500">
                <i class="fa fa-file-text-o text-5xl mb-4 opacity-30"></i>
                <p>尚未生成分集大纲</p>
                <p class="text-sm mt-2">点击下方按钮生成分集大纲</p>
            </div>
            `}
        </div>
        
        <div class="flex flex-wrap gap-4 justify-end">
            ${appState.scriptData.episodes.length > 0 ? `
            <button id="add-episode-btn" class="btn-secondary">
                <i class="fa fa-plus mr-2"></i>添加单集
            </button>
            <button id="regenerate-episodes-btn" class="btn-secondary">
                <i class="fa fa-refresh mr-2"></i>重新生成
            </button>
            ` : ''}
            <button id="generate-episodes-btn" class="btn-primary">
                ${appState.scriptData.episodes.length > 0 ? '确认大纲' : '批量生成分集大纲'}<i class="fa fa-arrow-right ml-2"></i>
            </button>
        </div>
    `;
    
    domElements.scriptCreatorContent.appendChild(step4Content);
    
    // 绑定按钮事件
    if (document.getElementById('generate-episodes-btn')) {
        document.getElementById('generate-episodes-btn').addEventListener('click', generateEpisodes);
    }
    
    if (document.getElementById('regenerate-episodes-btn')) {
        document.getElementById('regenerate-episodes-btn').addEventListener('click', generateEpisodes);
    }
    
    if (document.getElementById('add-episode-btn')) {
        document.getElementById('add-episode-btn').addEventListener('click', addSingleEpisode);
    }
    
    if (document.getElementById('clear-all-episodes-btn')) {
        document.getElementById('clear-all-episodes-btn').addEventListener('click', clearAllEpisodes);
    }
    
    // 绑定单集编辑和删除事件
    document.querySelectorAll('.edit-episode-btn').forEach(btn => {
        btn.addEventListener('click', () => editEpisode(parseInt(btn.dataset.index)));
    });
    
    document.querySelectorAll('.delete-episode-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteEpisode(parseInt(btn.dataset.index)));
    });
    
    // 绑定显示更多按钮事件
    document.querySelectorAll('.show-more-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const index = parseInt(btn.dataset.index);
            const contentElement = btn.closest('.episode-item').querySelector('.episode-content');
            contentElement.innerHTML = appState.scriptData.episodes[index];
        });
    });
}

// 添加单集
function addSingleEpisode() {
    const newEpisodeIndex = appState.scriptData.episodes.length + 1;
    const mockEpisode = `# 第${newEpisodeIndex}集

## 标题
${appState.scriptData.title || '未命名剧本'} 第${newEpisodeIndex}集

## 主要内容
请输入本集的主要内容...

## 场景1
请描述第一个场景...

## 场景2
请描述第二个场景...

## 结尾
请输入本集的结尾...`;
    
    appState.scriptData.episodes.push(mockEpisode);
    renderEpisodesStep();
    // 自动编辑新增的剧集
    editEpisode(newEpisodeIndex - 1);
}

// 编辑剧集
function editEpisode(index) {
    const currentEpisode = appState.scriptData.episodes[index];
    
    // 创建编辑模态框
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div class="p-4 border-b flex justify-between items-center">
                <h3 class="text-xl font-bold">编辑第 ${index + 1} 集</h3>
                <button id="close-modal-btn" class="text-gray-500 hover:text-gray-700">
                    <i class="fa fa-times text-xl"></i>
                </button>
            </div>
            <div class="p-4 flex-grow overflow-y-auto">
                <textarea id="episode-editor" class="w-full h-full min-h-[400px] px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm">${currentEpisode}</textarea>
            </div>
            <div class="p-4 border-t flex justify-end space-x-4">
                <button id="cancel-edit-btn" class="btn-secondary">取消</button>
                <button id="save-edit-btn" class="btn-primary">保存</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定模态框按钮事件
    document.getElementById('close-modal-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    document.getElementById('cancel-edit-btn').addEventListener('click', () => {
        document.body.removeChild(modal);
    });
    
    document.getElementById('save-edit-btn').addEventListener('click', () => {
        const updatedEpisode = document.getElementById('episode-editor').value.trim();
        if (updatedEpisode) {
            appState.scriptData.episodes[index] = updatedEpisode;
            renderEpisodesStep();
            showToast('剧集已更新');
        }
        document.body.removeChild(modal);
    });
    
    // 点击模态框外部关闭
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            document.body.removeChild(modal);
        }
    });
}

// 删除剧集
function deleteEpisode(index) {
    if (confirm(`确定要删除第 ${index + 1} 集吗？`)) {
        appState.scriptData.episodes.splice(index, 1);
        renderEpisodesStep();
        showToast('剧集已删除');
    }
}

// 清空全部剧集
function clearAllEpisodes() {
    if (confirm('确定要清空所有剧集吗？此操作不可撤销。')) {
        appState.scriptData.episodes = [];
        renderEpisodesStep();
        showToast('所有剧集已清空');
    }
}

// 生成分集大纲
async function generateEpisodes() {
    if (!appState.scriptData.outline) {
        alert('请先完善故事梗概');
        return;
    }
    
    // 获取批量生成的集数
    const batchCountElement = document.getElementById('batch-episode-count');
    const batchCount = batchCountElement ? parseInt(batchCountElement.value) : 5;
    
    // 确定是重新生成还是追加生成
    const isRegenerate = document.activeElement && document.activeElement.id === 'regenerate-episodes-btn';
    
    // 检查是否有活跃任务
    if (taskManager.hasActiveTask()) {
        alert('有任务正在处理中，请等待完成后再进行操作');
        return;
    }
    
    try {
        // 使用任务管理器创建异步任务
        await taskManager.createTask(
            '/api/scripts/generate-episodes',
            {
                outline: appState.scriptData.outline,
                episodeCount: batchCount,
                scriptType: appState.scriptType,
                genreType: appState.genreType,
                selectedGenres: appState.selectedGenres,
                startIndex: isRegenerate ? 0 : appState.scriptData.episodes.length
            },
            // 成功回调
            (result) => {
                if (isRegenerate) {
                    appState.scriptData.episodes = result.episodes;
                } else {
                    appState.scriptData.episodes = [...appState.scriptData.episodes, ...result.episodes];
                }
                renderEpisodesStep();
                showToast('分集大纲生成成功！');
            },
            // 失败回调
            (error) => {
                console.error('生成分集大纲错误:', error);
                // API调用失败，使用模拟数据
                const mockEpisodes = [];
                const startIndex = isRegenerate ? 0 : appState.scriptData.episodes.length;
                
                for (let i = 1; i <= batchCount; i++) {
                    const episodeNumber = startIndex + i;
                    // 获取标题，修复了获取选中故事创意的问题
                    let title = '都市情感故事';
                    if (appState.scriptData.title) {
                        title = appState.scriptData.title;
                    } else if (appState.scriptData.selectedLogline !== null && appState.scriptData.loglines && appState.scriptData.loglines[appState.scriptData.selectedLogline]) {
                        const loglineText = appState.scriptData.loglines[appState.scriptData.selectedLogline];
                        title = loglineText.split('\n')[0].split('》')[0].substring(1) || '都市情感故事';
                    }
                    const genreType = appState.genreType || '女频';
                    const selectedGenres = appState.selectedGenres || [];
                
                // 根据题材生成不同的模拟剧集内容
                let episodeContent = `# 第${episodeNumber}集\n\n## 标题\n${title} 第${episodeNumber}集\n\n## 主要内容\n`;
                
                // 根据不同题材生成不同的主要内容
                if (selectedGenres.includes('霸总')) {
                    if (episodeNumber === 1) {
                        episodeContent += '【黄金三秒】主角林小棠在高级餐厅意外撞到霸道总裁顾景深，将红酒洒在他的西装上，两人产生激烈争吵，顾景深当场宣布要收购林小棠所在的公司。这一冲突为后续故事埋下强力钩子。\n\n';
                    } else if (episodeNumber === 2) {
                        episodeContent += '林小棠被迫成为顾景深的私人助理，两人在工作中摩擦不断。顾景深的严苛要求让林小棠倍感压力，但也逐渐发现他不为人知的温柔一面。\n\n';
                    } else if (episodeNumber === 3) {
                        episodeContent += '【爽点】林小棠在商业酒会上巧妙化解了竞争对手的刁难，让顾景深刮目相看。两人关系开始缓和，顾景深主动邀请林小棠共进晚餐。\n\n';
                    } else if (episodeNumber <= 5) {
                        episodeContent += '林小棠逐渐了解顾景深的过去，原来他曾经有过一段伤痛的感情经历。两人在相互理解中关系升温，顾景深开始对林小棠产生不一样的感情。\n\n';
                    } else {
                        episodeContent += '【悬念】顾景深的前女友突然回国，试图破坏他与林小棠的关系。两人的感情面临巨大考验，林小棠陷入自我怀疑。\n\n';
                    }
                } else if (selectedGenres.includes('魂穿')) {
                    if (episodeNumber === 1) {
                        episodeContent += '【黄金三秒】主角苏晓在车祸中昏迷，醒来后发现自己穿越到了古代，成为了不受宠的侯府千金。更让她震惊的是，她能看到别人的死亡日期。这一特殊能力为故事设置了强力钩子。\n\n';
                    } else if (episodeNumber === 2) {
                        episodeContent += '苏晓开始适应古代生活，凭借现代知识屡屡化险为夷。她遇到了神秘的江湖侠客楚风，两人不打不相识，成为了合作伙伴。\n\n';
                    } else if (episodeNumber === 3) {
                        episodeContent += '【爽点】苏晓运用现代医学知识，成功救治了即将死亡的侯府老夫人，赢得了侯府上下的尊重。她开始意识到自己的能力不仅能看到死亡，还能改变命运。\n\n';
                    } else if (episodeNumber <= 5) {
                        episodeContent += '苏晓和楚风在寻找回到现代的线索过程中，逐渐发现了一个关于时空穿越的巨大秘密。两人的关系也在合作中不断升温。\n\n';
                    } else {
                        episodeContent += '【悬念】苏晓终于找到了回到现代的方法，但此时她必须在楚风和现代生活之间做出抉择。她陷入了深深的纠结。\n\n';
                    }
                } else if (selectedGenres.includes('萌宝')) {
                    if (episodeNumber === 1) {
                        episodeContent += '主角意外成为萌宝的监护人，开始了手忙脚乱的育儿生活。\n\n';
                    } else if (episodeNumber === 2) {
                        episodeContent += '萌宝的生父/生母出现，与主角产生交集。\n\n';
                    } else if (episodeNumber === 3) {
                        episodeContent += '在照顾萌宝的过程中，主角与萌宝的生父/生母关系逐渐缓和。\n\n';
                    } else if (episodeNumber <= 5) {
                        episodeContent += '三人形成了特殊的家庭关系，共同照顾萌宝。\n\n';
                    } else {
                        episodeContent += '外界对萌宝的身份产生质疑，主角需要保护萌宝。\n\n';
                    }
                } else {
                    if (episodeNumber === 1) {
                        episodeContent += '主角遭遇生活中的重大变故，开始了新的人生阶段。\n\n';
                    } else if (episodeNumber === 2) {
                        episodeContent += '主角在新环境中结识了新朋友，并面临新的挑战。\n\n';
                    } else if (episodeNumber === 3) {
                        episodeContent += '主角通过努力，开始在新环境中站稳脚跟。\n\n';
                    } else if (episodeNumber <= 5) {
                        episodeContent += '主角遇到了生命中的贵人，获得了重要的机遇。\n\n';
                    } else {
                        episodeContent += '主角在事业和爱情上都取得了成功，实现了自我价值。\n\n';
                    }
                }
                
                // 添加场景描述（使用标准剧本格式）
                episodeContent += '## 场景1\n';
                if (selectedGenres.includes('霸总')) {
                    episodeContent += `${episodeNumber}-1 日 内 顾氏集团总裁办公室\n`;
                    episodeContent += '△ 豪华的办公室里，落地窗外阳光明媚。顾景深坐在办公桌后，眉头紧锁地处理文件。他穿着剪裁合身的西装，浑身上下散发着上位者的气息。\n';
                    episodeContent += '△ 秘书敲门走进来，手里拿着一份文件。\n';
                    episodeContent += '秘书: (恭敬地)顾总，这是关于收购星辰设计公司的最新进展。\n';
                    episodeContent += '△ 顾景深接过文件，当看到"林小棠"这个名字时，眼神微微变化。\n\n';
                } else if (selectedGenres.includes('魂穿')) {
                    episodeContent += `${episodeNumber}-1 晨 内 侯府小姐闺房\n`;
                    episodeContent += '△ 古色古香的房间里，苏晓躺在床上，缓缓睁开眼睛。她环顾四周，看到了雕花的床架、刺绣的帷幔，以及放在梳妆台上的古代铜镜。\n';
                    episodeContent += '△ 苏晓突然坐起来，低头看着自己身上的古装，又摸了摸自己的脸。\n';
                    episodeContent += '苏晓: (不敢相信地)这...这是怎么回事？我不是在车祸现场吗？\n\n';
                } else if (selectedGenres.includes('萌宝')) {
                    episodeContent += `${episodeNumber}-1 日 内 温馨公寓客厅\n`;
                    episodeContent += '△ 阳光透过窗户洒进客厅，李悦手忙脚乱地给三岁的小糯米换尿布。小糯米穿着可爱的小熊睡衣，坐在沙发上咯咯直笑。\n';
                    episodeContent += '△ 李悦好不容易给小糯米换好尿布，刚要松口气，小糯米突然扑进她怀里，在她脸上亲了一口。\n';
                    episodeContent += '小糯米: (奶声奶气)妈妈，爱你！\n\n';
                } else {
                    episodeContent += `${episodeNumber}-1 晨 外 都市街头\n`;
                    episodeContent += '△ 清晨的阳光洒在繁忙的都市街头，行人如织。陈阳背着背包，手里拿着一份简历，神情疲惫但眼神坚定地走向远方的写字楼。\n';
                    episodeContent += '△ 他不时低头看看手表，脚步越来越快。\n\n';
                }
                
                episodeContent += '## 场景2\n';
                if (selectedGenres.includes('霸总')) {
                    episodeContent += `${episodeNumber}-2 日 内 云端咖啡厅\n`;
                    episodeContent += '△ 林小棠和闺蜜周雨坐在靠窗的位置，面前放着两杯咖啡。林小棠皱着眉头，正在诉说工作上的烦恼。\n';
                    episodeContent += '林小棠: (烦恼地)你说，顾景深是不是故意针对我？明明是个小错误，他却要我写五千字的检讨。\n';
                    episodeContent += '△ 就在这时，咖啡厅的门被推开，顾景深走了进来。他一眼就看到了林小棠，两人的目光在空中相遇。\n\n';
                } else if (selectedGenres.includes('魂穿')) {
                    episodeContent += `${episodeNumber}-2 日 外 京城市集\n`;
                    episodeContent += '△ 热闹的市集上，苏晓东张西望，对周围的一切都充满了好奇。她穿着一身淡蓝色的古装，手里拿着一串糖葫芦，边走边吃。\n';
                    episodeContent += '△ 突然，不远处传来一声尖叫: "救命啊！有人抢东西！"\n';
                    episodeContent += '△ 苏晓循声望去，看到一个黑衣人正拿着一个妇人的钱包，朝着她这个方向跑来。\n\n';
                } else if (selectedGenres.includes('萌宝')) {
                    episodeContent += `${episodeNumber}-2 日 外 城市公园\n`;
                    episodeContent += '△ 阳光明媚的公园里，李悦带着小糯米在草坪上玩耍。小糯米穿着粉色的连衣裙，手里拿着一个小皮球，跑来跑去。\n';
                    episodeContent += '△ 突然，小糯米看到不远处有一个穿着西装的男人，她眼睛一亮，立刻跑了过去，嘴里喊着: "爸爸！爸爸！"\n';
                    episodeContent += '△ 李悦紧张地追过去，却发现那个男人竟然是她的大学同学，现在的知名律师——陆明远。\n\n';
                } else {
                    episodeContent += `${episodeNumber}-2 日 内 远景科技公司会议室\n`;
                    episodeContent += '△ 会议室里，陈阳站在投影仪前，正在进行项目汇报。他虽然有些紧张，但依然表现得很专业，不时用手势辅助说明。\n';
                    episodeContent += '△ 台下的评委们认真地听着，不时点头或记录。\n\n';
                }
                
                episodeContent += '## 场景3\n';
                if (episodeNumber % 3 === 0) {
                    episodeContent += '夜已深，主角独自坐在窗前，思考着最近发生的事情，对未来充满了迷茫和期待。\n\n';
                } else {
                    episodeContent += '主角回到家中，疲惫地瘫在沙发上，这时手机突然响起，是一个陌生的号码...\n\n';
                }
                
                episodeContent += '## 结尾\n';
                if (episodeNumber % 5 === 0) {
                    episodeContent += '本集结束时，主角得知了一个惊人的秘密，表情震惊。下集预告：主角将如何面对这个突如其来的消息？';
                } else {
                    episodeContent += '本集以主角坚定的眼神结束，预示着下一集将有更大的挑战等待着他/她。';
                }
                
                mockEpisodes.push(episodeContent);
                }
                
                // 更新剧集列表
                if (isRegenerate) {
                    appState.scriptData.episodes = mockEpisodes;
                } else {
                    appState.scriptData.episodes = [...appState.scriptData.episodes, ...mockEpisodes];
                }
                
                renderEpisodesStep();
                showToast('当前为离线模式，显示模拟数据');
            },
            // 进度回调
            (status) => {
                // 可以在这里添加自定义的进度处理逻辑
                console.log('任务进度:', status);
            }
        );
    } catch (error) {
        console.error('创建任务失败:', error);
    }
}

// 渲染剧本内容步骤
function renderScriptStep() {
    const step5Content = document.createElement('div');
    step5Content.id = 'step-5';
    step5Content.className = 'animate-slide-up';
    
    // 剧集选择下拉菜单
    let episodeOptions = '';
    appState.scriptData.episodes.forEach((episode, index) => {
        episodeOptions += `<option value="${index}" ${appState.scriptData.currentEpisodeIndex === index ? 'selected' : ''}>第 ${index + 1} 集</option>`;
    });
    
    step5Content.innerHTML = `
        <h2 class="text-2xl font-bold mb-6">剧本创作</h2>
        <p class="text-gray-600 mb-6">请选择剧集并生成剧本内容，或进行编辑和修改</p>
        
        <div class="space-y-6">
            <!-- 剧集选择 -->
            <div class="flex items-center space-x-4">
                <label for="episode-select" class="text-gray-700 font-medium">选择剧集：</label>
                <select id="episode-select" class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50">
                    ${episodeOptions}
                </select>
                <button id="generate-script-btn" class="btn-primary ml-4">
                    <i class="fa fa-magic mr-2"></i>生成剧本
                </button>
            </div>
            
            <!-- 剧本编辑工具栏 -->
            <div class="bg-gray-50 p-3 rounded-lg flex items-center space-x-2">
                <button id="rewrite-section-btn" class="p-2 text-gray-600 hover:text-primary hover:bg-primary/10 rounded" title="局部重写">
                    <i class="fa fa-pencil"></i>
                </button>
                <button id="continue-script-btn" class="p-2 text-gray-600 hover:text-primary hover:bg-primary/10 rounded" title="续写内容">
                    <i class="fa fa-plus-circle"></i>
                </button>
                <div class="h-6 border-r border-gray-300 mx-1"></div>
                <span class="text-sm text-gray-500">提示：选中文字后点击工具栏按钮可进行操作</span>
            </div>
            
            <!-- 剧本编辑器 -->
            <div>
                <textarea id="script-editor" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 min-h-[400px] font-mono text-sm" placeholder="剧本内容将在这里生成...">${appState.scriptData.scriptContent}</textarea>
            </div>
            
            <div class="flex space-x-4">
                <button id="complete-script-btn" class="btn-primary ml-auto">
                    <i class="fa fa-check-circle mr-2"></i>完成创作
                </button>
            </div>
        </div>
    `;
    
    domElements.scriptCreatorContent.appendChild(step5Content);
    
    // 绑定按钮事件
    document.getElementById('episode-select').addEventListener('change', changeEpisode);
    document.getElementById('generate-script-btn').addEventListener('click', generateScript);
    document.getElementById('rewrite-section-btn').addEventListener('click', handleRewriteSection);
    document.getElementById('continue-script-btn').addEventListener('click', handleContinueScript);
    document.getElementById('complete-script-btn').addEventListener('click', completeScript);
}

// 切换剧集
function changeEpisode() {
    const episodeIndex = parseInt(document.getElementById('episode-select').value);
    appState.scriptData.currentEpisodeIndex = episodeIndex;
    // 这里可以添加加载当前剧集剧本内容的逻辑
}

// 生成剧本内容
async function generateScript() {
    if (!appState.scriptData.episodes.length) {
        alert('请先生成分集大纲');
        return;
    }
    
    // 检查是否有活跃任务
    if (taskManager.hasActiveTask()) {
        alert('有任务正在处理中，请等待完成后再进行操作');
        return;
    }
    
    try {
        // 使用任务管理器创建异步任务
        await taskManager.createTask(
            '/api/scripts/generate-script',
            {
                outline: appState.scriptData.outline,
                episodes: appState.scriptData.episodes,
                scriptType: appState.scriptType,
                wordCount: appState.wordCount
            },
            // 成功回调
            (result) => {
                appState.scriptData.scriptContent = result.script;
                document.getElementById('script-editor').value = result.script;
                showToast('剧本内容生成成功！');
            },
            // 失败回调
            (error) => {
                console.error('生成剧本内容错误:', error);
                // API调用失败，使用模拟数据
                const episodeNum = appState.scriptData.currentEpisodeIndex + 1;
                const mockScript = `# 剧本内容 - 第${episodeNum}集

## ${episodeNum}-1 日 内 星辰设计公司办公室

△ 宽敞明亮的开放式办公室里，员工们都在忙碌地工作。阳光透过落地窗洒进来，给整个空间增添了一丝温暖。

△ 林小棠（28岁，独立自信的设计师，此刻正皱着眉头盯着电脑屏幕）坐在工位上，手指快速地敲打着键盘。她的桌上堆满了设计稿和咖啡杯，显示出她已经工作了很久。

林小棠: (自言自语，语气中带着焦虑) 这个方案必须在今天完成，否则顾景深那个恶魔肯定又要找我麻烦。

△ 她的手机突然震动起来，屏幕上显示着"恶魔总裁"的来电显示。林小棠深吸一口气，按下了接听键。

林小棠: (尽量保持平静) 您好，顾总。

△ 镜头切到顾氏集团总裁办公室（交叉剪辑）

△ 顾景深（32岁，高大英俊，穿着剪裁合身的西装，此刻正站在落地窗前，目光深邃）拿着手机，嘴角微微上扬。

顾景深: (声音低沉，带着一丝命令的口吻) 来我办公室一趟，现在。

△ 电话挂断的声音。林小棠的眉头皱得更紧了，她迅速收拾了一下桌上的文件，起身朝电梯走去。

## ${episodeNum}-2 日 内 顾氏集团总裁办公室

△ 豪华的办公室里，落地窗外是城市的繁华景色。顾景深坐在办公桌后，手里翻看着林小棠的设计稿。

△ 敲门声响起，林小棠走了进来，拘谨地站在办公桌前。

林小棠: (礼貌地) 顾总，您找我？

△ 顾景深抬起头，目光灼灼地看着林小棠，看得她有些不自在。

顾景深: (将设计稿扔在桌上) 这份设计稿你是随便应付的吗？林设计师，我以为你的专业水平会比这高得多。

△ 林小棠的脸色变了变，她走到办公桌前，拿起设计稿仔细看了看。

林小棠: (反驳) 顾总，这份设计稿我花了整整三天时间，每一个细节都经过反复推敲。如果您有什么具体的修改意见，我可以马上调整。

△ 顾景深站起来，走到林小棠身边，两人的距离变得很近。林小棠能清楚地闻到他身上淡淡的木质香。

顾景深: (低头逼近林小棠，声音低沉) 林设计师，我要的不仅仅是专业，还要有灵魂。这个设计，没有灵魂。

△ 林小棠的心跳加速，但她强装镇定，抬头迎上顾景深的目光。

林小棠: (不甘示弱) 那顾总能否告诉我，什么样的设计才有灵魂？

△ 顾景深突然笑了，他退后两步，重新坐回办公桌后。

顾景深: (指了指沙发) 坐下，我给你一个晚上的时间，重新设计。明天早上9点，我要看到满意的作品。

△ 林小棠的表情有些惊讶，但她很快恢复了平静。她坐下来，从包里拿出笔记本和笔。

林小棠: (认真地) 好的，顾总，请您告诉我您的具体需求。

△ 顾景深看着林小棠认真工作的样子，嘴角露出了一丝不易察觉的微笑。

## ${episodeNum}-3 夜 内 林小棠家

△ 深夜的公寓里，林小棠坐在电脑前，面前的咖啡已经凉了。她的眼睛里布满了血丝，但神情却异常专注。

△ 她的手指在键盘上飞舞，屏幕上的设计稿在不断地完善。

△ 时钟指向凌晨三点，林小棠伸了个懒腰，看着电脑屏幕上的成品，满意地笑了。

林小棠: (轻声自语) 这次应该能通过了吧？

△ 她站起身，走到窗边，看着窗外的夜景。远处的写字楼还有几盏灯亮着，不知是否也有像她一样为了工作熬夜的人。

△ 突然，她的手机震动起来，收到了一条新消息。她拿起手机，看到是顾景深发来的。

△ 手机屏幕特写："别熬太晚，注意休息。"后面跟着一个咖啡杯的表情。

△ 林小棠的脸上露出了困惑的表情，她盯着手机屏幕看了很久，然后轻轻笑了笑，把手机放在一边，继续工作`;
        
        appState.scriptData.scriptContent = mockScript;
        document.getElementById('script-editor').value = mockScript;
        showToast('当前为离线模式，显示模拟数据');
    },
            // 进度回调
            (status) => {
                // 可以在这里添加自定义的进度处理逻辑
                console.log('任务进度:', status);
            }
        );
    } catch (error) {
        console.error('创建任务失败:', error);
    }
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
    
    // 检查是否有活跃任务
    if (taskManager.hasActiveTask()) {
        alert('有任务正在处理中，请等待完成后再进行操作');
        return;
    }
    
    try {
        // 使用任务管理器创建异步任务
        await taskManager.createTask(
            '/api/scripts/rewrite-section',
            {
                content: selectedText,
                instruction: instruction,
                scriptType: appState.scriptType
            },
            // 成功回调
            (result) => {
                // 替换选中的内容
                const newContent = editor.value.substring(0, editor.selectionStart) + 
                                  result.rewrittenContent + 
                                  editor.value.substring(editor.selectionEnd);
                
                editor.value = newContent;
                appState.scriptData.scriptContent = newContent;
                showToast('内容重写成功！');
            },
            // 失败回调
            (error) => {
                console.error('重写错误:', error);
                // API调用失败，使用模拟数据
                // 根据选中内容的类型生成不同的模拟重写内容
                let rewrittenContent = '';
                
                if (selectedText.includes('**[') && selectedText.includes(']**')) {
                    // 重写镜头描述
                    rewrittenContent = selectedText + '\n（注：此处已根据您的要求进行了优化，增强了画面感和细节描写。）';
                } else if (selectedText.includes('**[')) {
                    // 重写角色对话
                    rewrittenContent = selectedText.replace(/\(.+?\)/, '(更加生动地表达了角色的情感和内心活动)');
                } else {
                    // 重写场景描述
                    rewrittenContent = selectedText + '\n（注：此处场景描述已根据您的要求进行了优化，更加具体和有画面感。）';
                }
                
                const newText = editor.value.substring(0, editor.selectionStart) + 
                                  rewrittenContent + 
                                  editor.value.substring(editor.selectionEnd);
                
                editor.value = newText;
                appState.scriptData.scriptContent = newText;
                showToast('当前为离线模式，显示模拟重写结果');
            },
            // 进度回调
            (status) => {
                // 可以在这里添加自定义的进度处理逻辑
                console.log('任务进度:', status);
            }
        );
    } catch (error) {
        console.error('创建任务失败:', error);
    }
}

// 处理续写
async function handleContinueScript() {
    const editor = document.getElementById('script-editor');
    const currentContent = editor.value;
    
    const instruction = prompt('请输入续写指令（例如：继续编写下一个场景）：');
    
    if (!instruction) return;
    
    // 检查是否有活跃任务
    if (taskManager.hasActiveTask()) {
        alert('有任务正在处理中，请等待完成后再进行操作');
        return;
    }
    
    try {
        // 使用任务管理器创建异步任务
        await taskManager.createTask(
            '/api/scripts/continue-script',
            {
                content: currentContent,
                instruction: instruction,
                scriptType: appState.scriptType
            },
            // 成功回调
            (result) => {
                // 添加续写内容
                const newContent = currentContent + '\n\n' + result.continuedContent;
                
                editor.value = newContent;
                appState.scriptData.scriptContent = newContent;
                showToast('内容续写成功！');
            },
            // 失败回调
            (error) => {
                console.error('续写错误:', error);
                // API调用失败，使用模拟数据
                const mockContinuedContent = `## 续写内容

（注：由于当前为离线模式，根据您的要求"${instruction}"生成以下模拟内容。实际使用时将由AI生成更符合上下文的内容。）

**[镜头4]** 中景：张阳和李晓走进餐厅，找了一个靠窗的位置坐下。
**[张阳]** (微笑着) 这家餐厅的牛排很不错，你可以试试。
**[李晓]** (看了看菜单) 好的，那就听你的推荐。

（服务员走过来，两人点完餐后开始聊天。）
**[李晓]** (好奇地) 你平时工作一定很忙吧？
**[张阳]** (点了点头) 确实挺忙的，但我会尽量平衡工作和生活。你呢？工作还顺利吗？
**[李晓]** (叹气) 最近项目压力有点大，但我相信自己能处理好。
**[张阳]** (鼓励地) 我相信你，你看起来就是那种很有能力的人。`;
                
                const newContent = currentContent + '\n\n' + mockContinuedContent;
                
                editor.value = newContent;
                appState.scriptData.scriptContent = newContent;
                showToast('当前为离线模式，显示模拟续写内容');
            },
            // 进度回调
            (status) => {
                // 可以在这里添加自定义的进度处理逻辑
                console.log('任务进度:', status);
            }
        );
    } catch (error) {
        console.error('创建任务失败:', error);
    }
}

// 完成剧本创作
function completeScript() {
    // 保存剧本
    saveScript().then(() => {
        // 显示完成提示
        alert('剧本创作已完成！剧本已保存到您的账户中。');
        // 重定向到我的剧本页面
        window.location.href = '/saved-scripts.html';
    });
}

// 切换到指定步骤
function goToStep(stepIndex) {
    // 检查步骤是否有效
    if (stepIndex < 0 || stepIndex > 5) {
        return;
    }
    
    // 更新当前步骤
    appState.currentStep = stepIndex;
    
    // 渲染当前步骤
    renderCurrentStep();
    
    // 更新步骤导航
    updateStepNavigation();
    
    // 更新前后步骤按钮状态
    updateStepButtons();
    
    // 滚动到顶部
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 切换到上一步
function goToPrevStep() {
    if (appState.currentStep > 0) {
        goToStep(appState.currentStep - 1);
    }
}

// 切换到下一步
function goToNextStep() {
    if (appState.currentStep < 5) {
        goToStep(appState.currentStep + 1);
    }
}

// 更新步骤导航
function updateStepNavigation() {
    for (let i = 0; i <= 5; i++) {
        const stepNavBtn = document.getElementById(`step-nav-${i}`);
        if (stepNavBtn) {
            if (i === appState.currentStep) {
                stepNavBtn.classList.remove('text-gray-600');
                stepNavBtn.classList.add('bg-primary/10', 'text-primary');
                stepNavBtn.querySelector('span:first-child').classList.remove('bg-gray-200', 'text-gray-600');
                stepNavBtn.querySelector('span:first-child').classList.add('bg-primary', 'text-white');
            } else if (i < appState.currentStep) {
                stepNavBtn.classList.remove('bg-primary/10', 'text-primary');
                stepNavBtn.classList.add('text-gray-600');
                stepNavBtn.querySelector('span:first-child').classList.remove('bg-primary', 'text-white', 'bg-gray-200');
                stepNavBtn.querySelector('span:first-child').classList.add('bg-accent', 'text-white');
            } else {
                stepNavBtn.classList.remove('bg-primary/10', 'text-primary');
                stepNavBtn.classList.add('text-gray-600');
                stepNavBtn.querySelector('span:first-child').classList.remove('bg-primary', 'text-white', 'bg-accent');
                stepNavBtn.querySelector('span:first-child').classList.add('bg-gray-200', 'text-gray-600');
            }
        }
    }
}

// 更新步骤按钮状态
function updateStepButtons() {
    // 更新上一步按钮
    if (appState.currentStep > 0) {
        domElements.prevStepBtn.classList.remove('hidden');
    } else {
        domElements.prevStepBtn.classList.add('hidden');
    }
    
    // 更新下一步按钮文本
    if (appState.currentStep === 5) {
        domElements.nextStepBtn.innerHTML = '完成创作<i class="fa fa-check ml-2"></i>';
    } else {
        domElements.nextStepBtn.innerHTML = '下一步<i class="fa fa-arrow-right ml-2"></i>';
    }
}

// 保存剧本
async function saveScript() {
    // 更新剧本数据
    appState.scriptData.title = domElements.scriptTitle.value.trim() || '未命名剧本';
    if (appState.currentStep === 5) {
        appState.scriptData.scriptContent = document.getElementById('script-editor').value;
    }
    
    showLoading('正在保存剧本...');
    
    try {
        const response = await fetch('http://localhost:3000/api/scripts/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                scriptData: appState.scriptData,
                scriptType: appState.scriptType,
                episodeCount: appState.episodeCount,
                wordCount: appState.wordCount
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            // 更新最后保存时间
            const now = new Date();
            domElements.lastUpdated.textContent = `最后更新: ${now.toLocaleString()}`;
            
            // 显示保存成功提示
            showToast('剧本保存成功！');
            
            return true;
        } else {
            alert(data.message || '保存剧本失败');
            return false;
        }
    } catch (error) {
        console.error('保存剧本错误:', error);
        // API调用失败，进入离线模式处理
        
        // 更新本地最后保存时间
        const now = new Date();
        domElements.lastUpdated.textContent = `最后更新(本地): ${now.toLocaleString()}`;
        
        // 显示离线模式提示
        showToast('当前为离线模式，剧本已保存在本地');
        
        // 询问用户是否下载剧本到本地保存？
        if (confirm('当前无法连接到服务器，是否将剧本下载到本地保存？')) {
            // 创建一个Blob对象
            const contentToSave = JSON.stringify({
                title: appState.scriptData.title,
                content: appState.scriptData.scriptContent,
                outline: appState.scriptData.outline,
                episodes: appState.scriptData.episodes,
                created: new Date().toISOString()
            }, null, 2);
            
            const blob = new Blob([contentToSave], { type: 'application/json;charset=utf-8' });
            
            // 创建一个下载链接
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${appState.scriptData.title || '未命名剧本'}_local_backup.json`;
            
            // 触发下载
            document.body.appendChild(a);
            a.click();
            
            // 清理
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
        
        return false;
    } finally {
        hideLoading();
    }
}

// 导出剧本
function exportScript() {
    if (!appState.scriptData.scriptContent) {
        alert('请先生成剧本内容');
        return;
    }
    
    // 创建一个Blob对象
    const blob = new Blob([appState.scriptData.scriptContent], { type: 'text/plain;charset=utf-8' });
    
    // 创建一个下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${appState.scriptData.title || '未命名剧本'}.txt`;
    
    // 触发下载
    document.body.appendChild(a);
    a.click();
    
    // 清理
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 预览剧本
function previewScript() {
    if (!appState.scriptData.scriptContent) {
        alert('请先生成剧本内容');
        return;
    }
    
    // 这里可以实现剧本预览功能
    alert('预览功能即将上线！');
}

// 显示加载指示器
function showLoading(message = '加载中...') {
    domElements.loadingMessage.textContent = message;
    domElements.loadingOverlay.classList.remove('hidden');
}

// 隐藏加载指示器
function hideLoading() {
    domElements.loadingOverlay.classList.add('hidden');
}

// 显示提示消息
function showToast(message) {
    // 检查是否已存在toast元素
    let toast = document.getElementById('toast-message');
    
    if (!toast) {
        // 创建toast元素
        toast = document.createElement('div');
        toast.id = 'toast-message';
        toast.className = 'fixed bottom-4 right-4 bg-dark text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in';
        document.body.appendChild(toast);
    }
    
    // 设置消息内容并显示
    toast.textContent = message;
    toast.classList.remove('hidden');
    
    // 3秒后自动隐藏
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

// 处理登出
async function handleLogout() {
    try {
        const response = await fetch('http://localhost:3000/api/users/logout', {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            // 重定向到登录页
            window.location.href = '/login.html';
        } else {
            alert('登出失败，请稍后重试');
        }
    } catch (error) {
        console.error('登出错误:', error);
        // API调用失败，提供离线模式处理
        if (confirm('当前无法连接到服务器。由于处于离线模式，是否直接返回登录页面？')) {
            window.location.href = '/login.html';
        }
    }
}

// 切换用户菜单
function toggleUserMenu() {
    // 检查菜单是否隐藏
    if (domElements.userMenu.classList.contains('hidden')) {
        // 显示菜单并添加动画效果
        domElements.userMenu.classList.remove('hidden');
        // 使用setTimeout确保hidden被移除后再应用动画，避免CSS过渡不生效
        setTimeout(() => {
            domElements.userMenu.classList.remove('scale-95', 'opacity-0');
            domElements.userMenu.classList.add('scale-100', 'opacity-100');
        }, 10);
    } else {
        // 添加收起动画效果
        domElements.userMenu.classList.remove('scale-100', 'opacity-100');
        domElements.userMenu.classList.add('scale-95', 'opacity-0');
        // 动画完成后隐藏菜单
        setTimeout(() => {
            domElements.userMenu.classList.add('hidden');
        }, 300);
    }
}

// 更新剧本标题
function updateScriptTitle() {
    appState.scriptData.title = domElements.scriptTitle.value.trim() || '未命名剧本';
}

// 返回上一页
function goBack() {
    // 确认是否放弃当前编辑
    if (confirm('确定要离开当前页面吗？未保存的内容将会丢失。')) {
        window.history.back();
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);