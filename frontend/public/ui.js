// UI工具模块 - 提供所有UI相关的函数

// 显示加载状态
function showLoading(message = '加载中...') {
    // 检查是否已存在加载指示器
    let loadingIndicator = document.getElementById('loading-indicator');
    
    if (!loadingIndicator) {
        // 创建加载指示器元素
        loadingIndicator = document.createElement('div');
        loadingIndicator.id = 'loading-indicator';
        loadingIndicator.className = 'fixed inset-0 bg-black/30 flex items-center justify-center z-50 backdrop-blur-sm';
        loadingIndicator.innerHTML = `
            <div class="bg-white rounded-lg p-6 flex flex-col items-center shadow-xl max-w-sm w-full mx-4">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                <p class="text-gray-700 text-center" id="loading-message">${message}</p>
            </div>
        `;
        document.body.appendChild(loadingIndicator);
    } else {
        // 更新已有加载指示器的消息
        const loadingMessage = document.getElementById('loading-message');
        if (loadingMessage) {
            loadingMessage.textContent = message;
        }
        // 显示加载指示器
        loadingIndicator.classList.remove('hidden');
    }
}

// 隐藏加载状态
function hideLoading() {
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.classList.add('hidden');
    }
}

// 显示提示消息
function showToast(message, duration = 3000, type = 'info') {
    // 定义提示类型的样式
    const toastStyles = {
        success: 'bg-green-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-primary'
    };
    
    // 检查是否已存在toast容器
    let toastContainer = document.getElementById('toast-container');
    
    if (!toastContainer) {
        // 创建toast容器
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2';
        document.body.appendChild(toastContainer);
    }
    
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `px-4 py-3 rounded-lg text-white shadow-lg transform transition-all duration-300 translate-y-4 opacity-0 ${toastStyles[type] || toastStyles.info}`;
    toast.innerHTML = `
        <div class="flex items-center gap-2">
            <i class="fa fa-check-circle"></i>
            <span>${message}</span>
        </div>
    `;
    
    // 添加到容器
    toastContainer.appendChild(toast);
    
    // 显示toast
    setTimeout(() => {
        toast.classList.remove('translate-y-4', 'opacity-0');
    }, 10);
    
    // 设置自动关闭
    setTimeout(() => {
        toast.classList.add('translate-y-4', 'opacity-0');
        setTimeout(() => {
            if (toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// 更新最后更新时间
function updateLastUpdated() {
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        lastUpdatedElement.textContent = `最后更新: ${hours}:${minutes}:${seconds}`;
    }
}

// 更新步骤导航状态
function updateStepNavigation(appState) {
    for (let i = 0; i <= 5; i++) {
        const stepNavBtn = document.getElementById(`step-nav-${i}`);
        if (stepNavBtn) {
            // 重置所有步骤样式
            stepNavBtn.classList.remove('bg-primary-10', 'text-primary', 'nav-item-active');
            stepNavBtn.classList.add('text-gray-600', 'hover:bg-primary-5');
            
            // 更新步骤数字样式
            const stepNumber = stepNavBtn.querySelector('span:first-child');
            if (stepNumber) {
                stepNumber.classList.remove('bg-primary', 'text-white');
                stepNumber.classList.add('bg-gray-200', 'text-gray-600');
            }
            
            // 当前步骤和已完成步骤的样式
            if (i < appState.currentStep) {
                // 已完成步骤
                stepNavBtn.classList.remove('text-gray-600', 'hover:bg-primary-5');
                stepNavBtn.classList.add('text-primary-7', 'hover:bg-primary-5');
                
                if (stepNumber) {
                    stepNumber.classList.remove('bg-gray-200', 'text-gray-600');
                    stepNumber.classList.add('bg-primary-20', 'text-primary');
                    stepNumber.innerHTML = '<i class="fa fa-check text-xs"></i>';
                }
            } else if (i === appState.currentStep) {
                // 当前步骤
                stepNavBtn.classList.remove('text-gray-600', 'hover:bg-primary-5');
                stepNavBtn.classList.add('bg-primary-10', 'text-primary', 'nav-item-active');
                
                if (stepNumber) {
                    stepNumber.classList.remove('bg-gray-200', 'text-gray-600');
                    stepNumber.classList.add('bg-primary', 'text-white');
                }
            }
        }
    }
}

// 更新步骤按钮状态
function updateStepButtons(appState) {
    const prevStepBtn = document.getElementById('prev-step-btn');
    const nextStepBtn = document.getElementById('next-step-btn');
    
    if (prevStepBtn) {
        if (appState.currentStep > 0) {
            prevStepBtn.classList.remove('hidden');
        } else {
            prevStepBtn.classList.add('hidden');
        }
    }
    
    if (nextStepBtn) {
        if (appState.currentStep === 5) {
            nextStepBtn.textContent = '完成创作';
            nextStepBtn.classList.remove('group');
            nextStepBtn.innerHTML = '完成创作';
        } else {
            nextStepBtn.classList.add('group');
            nextStepBtn.innerHTML = `下一步<i class="fa fa-arrow-right ml-2 transition-transform duration-300 group-hover:translate-x-[2px]"></i>`;
        }
    }
}

// 渲染当前步骤
function renderCurrentStep(appState, workflowActions) {
    // 根据当前步骤渲染不同的内容
    const currentStepContainer = document.querySelector(`.step-container[data-step="${appState.currentStep}"]`);
    if (currentStepContainer) {
        // 显示当前步骤
        workflowActions.showStep(appState.currentStep);
        
        // 初始化当前步骤的UI
        workflowActions.initStepUI(appState.currentStep);
    }
}

// 切换导航菜单
function toggleNavigationMenu() {
    const navMenu = document.getElementById('navigation-menu');
    if (navMenu) {
        navMenu.classList.toggle('hidden');
    }
}

// 初始化工具提示
function initTooltips() {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    tooltipElements.forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltipText = this.getAttribute('data-tooltip');
            if (tooltipText) {
                // 创建tooltip元素
                const tooltip = document.createElement('div');
                tooltip.className = 'absolute z-30 bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap';
                tooltip.textContent = tooltipText;
                tooltip.id = 'temp-tooltip';
                
                // 定位tooltip
                const rect = this.getBoundingClientRect();
                tooltip.style.top = `${rect.top - 30}px`;
                tooltip.style.left = `${rect.left + rect.width / 2}px`;
                tooltip.style.transform = 'translateX(-50%)';
                
                document.body.appendChild(tooltip);
            }
        });
        
        element.addEventListener('mouseleave', function() {
            const tooltip = document.getElementById('temp-tooltip');
            if (tooltip) {
                document.body.removeChild(tooltip);
            }
        });
    });
}

// 检查元素是否在视口中
function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// 添加滚动动画
function addScrollAnimation() {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    
    function checkScroll() {
        animatedElements.forEach(element => {
            if (isElementInViewport(element)) {
                element.classList.add('animate-fade-in');
            }
        });
    }
    
    // 初始检查
    checkScroll();
    
    // 滚动时检查
    window.addEventListener('scroll', checkScroll);
}

// 初始化导航菜单
function initNavigationMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleNavigationMenu);
    }
    
    // 点击外部关闭菜单
    document.addEventListener('click', function(event) {
        const menuToggle = document.getElementById('menu-toggle');
        const navMenu = document.getElementById('navigation-menu');
        
        if (navMenu && !navMenu.classList.contains('hidden') &&
            menuToggle && !menuToggle.contains(event.target) &&
            !navMenu.contains(event.target)) {
            navMenu.classList.add('hidden');
        }
    });
}

// 初始化步骤导航
function initStepNavigation(appState) {
    // 为每个步骤导航按钮添加点击事件
    for (let i = 0; i <= 5; i++) {
        const stepNavBtn = document.getElementById(`step-nav-${i}`);
        if (stepNavBtn) {
            stepNavBtn.addEventListener('click', function() {
                goToStep(i, appState);
            });
        }
    }
    
    // 更新步骤导航状态
    updateStepNavigation(appState);
}

// 初始化步骤按钮
function initStepButtons(appState) {
    const prevStepBtn = document.getElementById('prev-step-btn');
    const nextStepBtn = document.getElementById('next-step-btn');
    
    // 上一步按钮
    if (prevStepBtn) {
        prevStepBtn.addEventListener('click', function() {
            goToPrevStep(appState);
        });
    }
    
    // 下一步按钮
    if (nextStepBtn) {
        nextStepBtn.addEventListener('click', function() {
            goToNextStep(appState);
        });
    }
    
    // 更新步骤按钮状态
    updateStepButtons(appState);
}

// 前往指定步骤
function goToStep(stepIndex, appState) {
    // 检查步骤是否有效且可以访问
    if (stepIndex >= 0 && stepIndex <= 5 && stepIndex <= appState.currentStep) {
        appState.currentStep = stepIndex;
        
        // 渲染当前步骤
        renderCurrentStep(appState, window.workflowActions || {});
        
        // 更新步骤导航
        updateStepNavigation(appState);
        
        // 更新步骤按钮
        updateStepButtons(appState);
        
        // 滚动到页面顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// 前往上一步
function goToPrevStep(appState) {
    if (appState.currentStep > 0) {
        appState.currentStep--;
        
        // 渲染当前步骤
        renderCurrentStep(appState, window.workflowActions || {});
        
        // 更新步骤导航
        updateStepNavigation(appState);
        
        // 更新步骤按钮
        updateStepButtons(appState);
        
        // 滚动到页面顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// 前往下一步
function goToNextStep(appState) {
    if (appState.currentStep < 5) {
        // 检查当前步骤是否可以进入下一步
        if (canProceedToNextStep(appState)) {
            appState.currentStep++;
            
            // 渲染当前步骤
            renderCurrentStep(appState, window.workflowActions || {});
            
            // 更新步骤导航
            updateStepNavigation(appState);
            
            // 更新步骤按钮
            updateStepButtons(appState);
            
            // 滚动到页面顶部
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // 显示提示信息
            showToast('请先完成当前步骤的必填项', 3000, 'warning');
        }
    }
}

// 检查是否可以进入下一步
function canProceedToNextStep(appState) {
    // 使用workflowActions中的验证方法
    if (window.workflowActions && window.workflowActions.validateCurrentStep) {
        return window.workflowActions.validateCurrentStep(appState);
    }
    
    // 默认验证规则
    switch (appState.currentStep) {
        case 0:
            // 剧本类型选择步骤
            return appState.scriptType && appState.scriptType !== '' && appState.episodeCount > 0;
        case 1:
            // 故事创意生成步骤
            return appState.scriptData.loglines && appState.scriptData.loglines.length > 0 && appState.scriptData.selectedLogline;
        case 2:
            // 故事梗概完善步骤
            return appState.scriptData.outline && appState.scriptData.outline.trim() !== '';
        case 3:
            // 分集大纲生成步骤
            return appState.scriptData.scriptContent && appState.scriptData.scriptContent.trim() !== '';
        case 4:
            // 剧本内容生成步骤
            return appState.scriptData.scriptContent && appState.scriptData.scriptContent.trim() !== '';
        default:
            return true;
    }
}

// 导出函数，支持模块化和非模块化使用
if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    // 模块化导出
    module.exports = {
        showLoading,
        hideLoading,
        showToast,
        updateLastUpdated,
        updateStepNavigation,
        updateStepButtons,
        renderCurrentStep,
        toggleNavigationMenu,
        initTooltips,
        addScrollAnimation,
        initNavigationMenu,
        initStepNavigation,
        initStepButtons,
        goToStep,
        goToPrevStep,
        goToNextStep,
        canProceedToNextStep
    };
} else if (typeof window !== 'undefined') {
    // 导出到window对象，确保非模块化脚本也能使用
    window.showLoading = showLoading;
    window.hideLoading = hideLoading;
    window.showToast = showToast;
    window.updateLastUpdated = updateLastUpdated;
    window.updateStepNavigation = updateStepNavigation;
    window.updateStepButtons = updateStepButtons;
    window.renderCurrentStep = renderCurrentStep;
    window.toggleNavigationMenu = toggleNavigationMenu;
    window.initTooltips = initTooltips;
    window.addScrollAnimation = addScrollAnimation;
    window.initNavigationMenu = initNavigationMenu;
    window.initStepNavigation = initStepNavigation;
    window.initStepButtons = initStepButtons;
    window.goToStep = goToStep;
    window.goToPrevStep = goToPrevStep;
    window.goToNextStep = goToNextStep;
    window.canProceedToNextStep = canProceedToNextStep;
}