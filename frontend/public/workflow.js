// 工作流管理模块 - 处理剧本创作的各个步骤

// 工作流相关配置
const WORKFLOW_CONFIG = {
    // 定义创作流程的各个步骤
    steps: [
        {
            id: 'setup',
            name: '剧本设置',
            description: '选择剧本类型、集数和创作方式'
        },
        {
            id: 'logline',
            name: '故事创意',
            description: '生成或输入故事创意'
        },
        {
            id: 'outline',
            name: '分集大纲',
            description: '生成详细的分集大纲'
        },
        {
            id: 'script',
            name: '剧本创作',
            description: '基于大纲生成完整剧本内容'
        },
        {
            id: 'edit',
            name: '剧本编辑',
            description: '编辑和优化剧本内容'
        },
        {
            id: 'export',
            name: '导出完成',
            description: '导出剧本并完成创作'
        }
    ],
    // 每个步骤的验证规则
    validationRules: {
        setup: function(appState) {
            return appState.scriptType && appState.episodeCount > 0;
        },
        logline: function(appState) {
            return appState.scriptData.loglines && appState.scriptData.loglines.length > 0 && appState.scriptData.selectedLogline;
        },
        outline: function(appState) {
            return appState.scriptData.outline && appState.scriptData.outline.trim() !== '';
        },
        script: function(appState) {
            return appState.scriptData.scriptContent && appState.scriptData.scriptContent.trim() !== '';
        },
        edit: function(appState) {
            return appState.scriptData.scriptContent && appState.scriptData.scriptContent.trim() !== '';
        },
        export: function(appState) {
            return appState.scriptData.scriptContent && appState.scriptData.scriptContent.trim() !== '';
        }
    },
    // 每个步骤的默认数据
    defaultData: {
        setup: {
            scriptType: '竖屏短剧',
            episodeCount: 60,
            wordCount: 800,
            genreType: '女频',
            selectedGenres: ['都市情感']
        }
    }
};

// 工作流操作对象
export const workflowActions = {
    // 初始化工作流
    initWorkflow: function(appState) {
        // 应用默认设置
        Object.assign(appState, WORKFLOW_CONFIG.defaultData.setup);
        
        // 显示当前步骤
        this.showStep(appState.currentStep);
        
        // 初始化步骤UI
        this.initStepUI(appState.currentStep);
    },
    
    // 显示指定步骤
    showStep: function(stepIndex) {
        // 隐藏所有步骤容器
        const stepContainers = document.querySelectorAll('.step-container');
        stepContainers.forEach(container => {
            container.classList.add('hidden');
        });
        
        // 显示当前步骤容器
        const currentStepContainer = document.querySelector(`.step-container[data-step="${stepIndex}"]`);
        if (currentStepContainer) {
            currentStepContainer.classList.remove('hidden');
            
            // 为进入的步骤添加动画
            setTimeout(() => {
                currentStepContainer.classList.add('animate-fade-in');
            }, 10);
        }
    },
    
    // 初始化步骤UI
    initStepUI: function(stepIndex) {
        switch (stepIndex) {
            case 0:
                this.initSetupStep();
                break;
            case 1:
                this.initLoglineStep();
                break;
            case 2:
                this.initOutlineStep();
                break;
            case 3:
                this.initScriptStep();
                break;
            case 4:
                this.initEditStep();
                break;
            case 5:
                this.initExportStep();
                break;
        }
    },
    
    // 初始化设置步骤
    initSetupStep: function() {
        // 绑定剧本类型选择事件
        const scriptTypeButtons = document.querySelectorAll('.script-type-button');
        scriptTypeButtons.forEach(button => {
            button.addEventListener('click', function() {
                // 移除其他按钮的选中状态
                scriptTypeButtons.forEach(btn => {
                    btn.classList.remove('bg-primary', 'text-white');
                    btn.classList.add('bg-gray-100', 'text-gray-700');
                });
                
                // 添加当前按钮的选中状态
                this.classList.remove('bg-gray-100', 'text-gray-700');
                this.classList.add('bg-primary', 'text-white');
                
                // 更新应用状态
                if (window.appState) {
                    window.appState.scriptType = this.querySelector('h3').textContent;
                    // 更新显示
                    if (window.domElements && window.domElements.scriptTypeDisplay) {
                        window.domElements.scriptTypeDisplay.textContent = this.querySelector('h3').textContent;
                    }
                }
            });
        });
        
        // 绑定剧集数量变化事件
        const episodeCountInput = document.getElementById('episode-count');
        if (episodeCountInput && window.appState) {
            episodeCountInput.value = window.appState.episodeCount;
            
            episodeCountInput.addEventListener('input', function() {
                const count = parseInt(this.value) || 1;
                window.appState.episodeCount = count;
                // 更新显示
                if (window.domElements && window.domElements.episodeCountDisplay) {
                    window.domElements.episodeCountDisplay.textContent = count;
                }
            });
        }
        
        // 绑定创作方式选择事件
        const creationMethodButtons = document.querySelectorAll('.creation-method-button');
        creationMethodButtons.forEach(button => {
            button.addEventListener('click', function() {
                // 移除其他按钮的选中状态
                creationMethodButtons.forEach(btn => {
                    btn.classList.remove('border-primary', 'bg-primary/5');
                    btn.classList.add('border-gray-200', 'bg-white');
                });
                
                // 添加当前按钮的选中状态
                this.classList.remove('border-gray-200', 'bg-white');
                this.classList.add('border-primary', 'bg-primary/5');
            });
        });
    },
    
    // 初始化故事创意步骤
    initLoglineStep: function() {
        // 绑定生成创意按钮事件
        const generateLoglineBtn = document.getElementById('generate-logline-btn');
        if (generateLoglineBtn && window.taskManager && window.appState) {
            generateLoglineBtn.addEventListener('click', async function() {
                try {
                    // 构建请求参数
                    const payload = {
                        scriptType: window.appState.scriptType,
                        genreType: window.appState.genreType || '女频',
                        selectedGenres: window.appState.selectedGenres || ['都市情感'],
                        userId: window.appState.currentUser?.id || 'demo'
                    };
                    
                    // 创建任务
                    await window.taskManager.createTask(
                        '/api/ai/generate/loglines',
                        payload,
                        function(result) {
                            // 处理成功结果
                            if (result && result.loglines) {
                                window.appState.scriptData.loglines = result.loglines;
                                renderLoglines(result.loglines);
                            }
                        },
                        function(error) {
                            // 处理错误
                            if (window.showToast) {
                                window.showToast('生成故事创意失败: ' + error.message);
                            }
                        }
                    );
                } catch (error) {
                    console.error('生成故事创意失败:', error);
                    if (window.showToast) {
                        window.showToast('生成故事创意失败');
                    }
                }
            });
        }
    },
    
    // 初始化大纲步骤
    initOutlineStep: function() {
        // 绑定生成大纲按钮事件
        const generateOutlineBtn = document.getElementById('generate-outline-btn');
        if (generateOutlineBtn && window.taskManager && window.appState) {
            generateOutlineBtn.addEventListener('click', async function() {
                try {
                    // 验证是否已选择故事创意
                    if (!window.appState.scriptData.selectedLogline) {
                        if (window.showToast) {
                            window.showToast('请先选择一个故事创意');
                        }
                        return;
                    }
                    
                    // 构建请求参数
                    const payload = {
                        logline: window.appState.scriptData.selectedLogline,
                        episodeCount: window.appState.episodeCount,
                        scriptType: window.appState.scriptType,
                        userId: window.appState.currentUser?.id || 'demo'
                    };
                    
                    // 创建任务
                    await window.taskManager.createTask(
                        '/api/ai/generate/outline',
                        payload,
                        function(result) {
                            // 处理成功结果
                            if (result && result.outline) {
                                window.appState.scriptData.outline = result.outline;
                                // 渲染大纲内容
                                const outlineEditor = document.getElementById('outline-editor');
                                if (outlineEditor) {
                                    outlineEditor.value = result.outline;
                                }
                            }
                        },
                        function(error) {
                            // 处理错误
                            if (window.showToast) {
                                window.showToast('生成大纲失败: ' + error.message);
                            }
                        }
                    );
                } catch (error) {
                    console.error('生成大纲失败:', error);
                    if (window.showToast) {
                        window.showToast('生成大纲失败');
                    }
                }
            });
        }
    },
    
    // 初始化剧本创作步骤
    initScriptStep: function() {
        // 绑定生成剧本按钮事件
        const generateScriptBtn = document.getElementById('generate-script-btn');
        if (generateScriptBtn && window.taskManager && window.appState) {
            generateScriptBtn.addEventListener('click', async function() {
                try {
                    // 验证是否已有大纲
                    if (!window.appState.scriptData.outline || window.appState.scriptData.outline.trim() === '') {
                        if (window.showToast) {
                            window.showToast('请先生成分集大纲');
                        }
                        return;
                    }
                    
                    // 构建请求参数
                    const payload = {
                        outline: window.appState.scriptData.outline,
                        scriptType: window.appState.scriptType,
                        wordCount: window.appState.wordCount,
                        userId: window.appState.currentUser?.id || 'demo'
                    };
                    
                    // 创建任务
                    await window.taskManager.createTask(
                        '/api/ai/generate/script',
                        payload,
                        function(result) {
                            // 处理成功结果
                            if (result && result.scriptContent) {
                                window.appState.scriptData.scriptContent = result.scriptContent;
                                // 渲染剧本内容
                                const scriptEditor = document.getElementById('script-editor');
                                if (scriptEditor) {
                                    scriptEditor.value = result.scriptContent;
                                }
                            }
                        },
                        function(error) {
                            // 处理错误
                            if (window.showToast) {
                                window.showToast('生成剧本失败: ' + error.message);
                            }
                        }
                    );
                } catch (error) {
                    console.error('生成剧本失败:', error);
                    if (window.showToast) {
                        window.showToast('生成剧本失败');
                    }
                }
            });
        }
    },
    
    // 初始化编辑步骤
    initEditStep: function() {
        // 绑定局部重写按钮事件
        const rewriteSectionBtn = document.getElementById('rewrite-section-btn');
        if (rewriteSectionBtn && window.taskManager && window.appState) {
            rewriteSectionBtn.addEventListener('click', async function() {
                try {
                    // 获取选中的文本或当前段落
                    let selectedText = '';
                    const selection = window.getSelection();
                    if (selection.toString()) {
                        selectedText = selection.toString();
                    }
                    
                    // 构建请求参数
                    const payload = {
                        currentContent: window.appState.scriptData.scriptContent,
                        selectedText: selectedText,
                        instruction: document.getElementById('rewrite-instruction')?.value || '',
                        userId: window.appState.currentUser?.id || 'demo'
                    };
                    
                    // 创建任务
                    await window.taskManager.createTask(
                        '/api/scripts/rewrite',
                        payload,
                        function(result) {
                            // 处理成功结果
                            if (result && result.rewrittenContent) {
                                // 更新剧本内容
                                window.appState.scriptData.scriptContent = result.rewrittenContent;
                                const scriptEditor = document.getElementById('script-editor');
                                if (scriptEditor) {
                                    scriptEditor.value = result.rewrittenContent;
                                }
                            }
                        },
                        function(error) {
                            // 处理错误
                            if (window.showToast) {
                                window.showToast('局部重写失败: ' + error.message);
                            }
                        }
                    );
                } catch (error) {
                    console.error('局部重写失败:', error);
                    if (window.showToast) {
                        window.showToast('局部重写失败');
                    }
                }
            });
        }
    },
    
    // 初始化导出步骤
    initExportStep: function() {
        // 绑定导出按钮事件
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn && window.API && window.appState) {
            exportBtn.addEventListener('click', async function() {
                try {
                    // 显示加载状态
                    if (window.showLoading) {
                        window.showLoading('正在导出剧本...');
                    }
                    
                    // 保存剧本到服务器
                    const saveResult = await window.API.saveScriptToServer(window.appState.scriptData);
                    
                    if (saveResult.success && saveResult.data && saveResult.data.scriptId) {
                        // 导出剧本
                        const exportResult = await window.API.exportScriptToServer(saveResult.data.scriptId);
                        
                        if (exportResult.success && exportResult.blob) {
                            // 创建下载链接
                            const url = URL.createObjectURL(exportResult.blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = (window.appState.scriptData.title || '未命名剧本') + '.docx';
                            a.click();
                            
                            // 释放URL对象
                            URL.revokeObjectURL(url);
                            
                            if (window.showToast) {
                                window.showToast('剧本导出成功');
                            }
                        } else {
                            throw new Error('导出失败');
                        }
                    } else {
                        throw new Error('保存剧本失败');
                    }
                } catch (error) {
                    console.error('导出剧本失败:', error);
                    if (window.showToast) {
                        window.showToast('导出剧本失败: ' + error.message);
                    }
                } finally {
                    // 隐藏加载状态
                    if (window.hideLoading) {
                        window.hideLoading();
                    }
                }
            });
        }
    },
    
    // 验证当前步骤是否可以继续
    validateCurrentStep: function(appState) {
        const currentStep = appState.currentStep;
        const validationRule = WORKFLOW_CONFIG.validationRules[WORKFLOW_CONFIG.steps[currentStep].id];
        
        if (typeof validationRule === 'function') {
            return validationRule(appState);
        }
        
        // 默认允许继续
        return true;
    },
    
    // 进入下一步前的准备工作
    prepareForNextStep: function(appState, nextStepIndex) {
        // 保存当前状态
        if (window.autoSave && window.autoSave.saveState) {
            window.autoSave.saveState();
        }
        
        // 根据不同步骤执行特定的准备工作
        switch (nextStepIndex) {
            case 1:
                // 准备故事创意步骤
                this.prepareLoglineStep(appState);
                break;
            case 2:
                // 准备大纲步骤
                this.prepareOutlineStep(appState);
                break;
            case 3:
                // 准备剧本创作步骤
                this.prepareScriptStep(appState);
                break;
            case 4:
                // 准备编辑步骤
                this.prepareEditStep(appState);
                break;
            case 5:
                // 准备导出步骤
                this.prepareExportStep(appState);
                break;
        }
    },
    
    // 准备故事创意步骤
    prepareLoglineStep: function(appState) {
        // 可以在这里初始化故事创意步骤的数据
    },
    
    // 准备大纲步骤
    prepareOutlineStep: function(appState) {
        // 可以在这里初始化大纲步骤的数据
    },
    
    // 准备剧本创作步骤
    prepareScriptStep: function(appState) {
        // 可以在这里初始化剧本创作步骤的数据
    },
    
    // 准备编辑步骤
    prepareEditStep: function(appState) {
        // 可以在这里初始化编辑步骤的数据
    },
    
    // 准备导出步骤
    prepareExportStep: function(appState) {
        // 可以在这里初始化导出步骤的数据
    }
};

// 渲染故事创意列表
function renderLoglines(loglines) {
    const loglinesContainer = document.getElementById('loglines-container');
    if (!loglinesContainer) return;
    
    // 清空容器
    loglinesContainer.innerHTML = '';
    
    // 渲染每个故事创意
    loglines.forEach((logline, index) => {
        const loglineCard = document.createElement('div');
        loglineCard.className = 'logline-card border border-gray-200 rounded-lg p-4 mb-3 cursor-pointer hover:border-primary transition-colors';
        
        // 添加选中状态的样式
        if (window.appState && window.appState.scriptData.selectedLogline === logline) {
            loglineCard.classList.add('border-primary', 'bg-primary/5');
        }
        
        // 设置卡片内容
        loglineCard.innerHTML = `
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <p class="text-gray-700">${logline}</p>
                </div>
                <div class="flex items-center ml-4">
                    <span class="text-xs text-gray-500">创意 ${index + 1}</span>
                </div>
            </div>
        `;
        
        // 绑定点击事件
        loglineCard.addEventListener('click', function() {
            // 更新选中状态
            document.querySelectorAll('.logline-card').forEach(card => {
                card.classList.remove('border-primary', 'bg-primary/5');
            });
            this.classList.add('border-primary', 'bg-primary/5');
            
            // 更新应用状态
            if (window.appState) {
                window.appState.scriptData.selectedLogline = logline;
            }
        });
        
        loglinesContainer.appendChild(loglineCard);
    });
}

// 导出到window对象，确保非模块化脚本也能使用
if (typeof window !== 'undefined') {
    window.workflowActions = workflowActions;
    window.renderLoglines = renderLoglines;
}