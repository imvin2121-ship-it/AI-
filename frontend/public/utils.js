// 工具函数模块 - 提供常用的辅助功能

// 本地存储键名
const STORAGE_KEYS = {
    SCRIPT_DATA: 'ai_script_creator_data',
    USER_PREFERENCES: 'ai_script_creator_preferences',
    AUTO_SAVE_TIMER: null
};

// 保存状态到本地存储
saveStateToLocalStorage = function(appState) {
    try {
        const stateToSave = {
            scriptType: appState.scriptType,
            episodeCount: appState.episodeCount,
            wordCount: appState.wordCount,
            scriptData: appState.scriptData,
            genreType: appState.genreType,
            selectedGenres: appState.selectedGenres,
            lastSaved: new Date().toISOString()
        };
        
        localStorage.setItem(STORAGE_KEYS.SCRIPT_DATA, JSON.stringify(stateToSave));
        
        // 如果有自动保存提示，可以在这里实现
        showAutoSaveIndicator();
        
        return true;
    } catch (error) {
        console.error('保存状态失败:', error);
        return false;
    }
};

// 从本地存储加载状态
loadStateFromLocalStorage = function() {
    try {
        const savedState = localStorage.getItem(STORAGE_KEYS.SCRIPT_DATA);
        if (savedState) {
            return JSON.parse(savedState);
        }
        return null;
    } catch (error) {
        console.error('加载状态失败:', error);
        return null;
    }
};

// 清除本地存储
clearLocalStorage = function() {
    try {
        localStorage.removeItem(STORAGE_KEYS.SCRIPT_DATA);
        return true;
    } catch (error) {
        console.error('清除本地存储失败:', error);
        return false;
    }
};

// 自动保存计时器
let autoSaveTimer = null;
const AUTO_SAVE_INTERVAL = 30000; // 30秒自动保存一次

// 启动自动保存计时器
startAutoSaveTimer = function() {
    // 清除现有的计时器
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
    }
    
    // 设置新的计时器
    autoSaveTimer = setTimeout(function() {
        if (window.appState && typeof window.saveStateToLocalStorage === 'function') {
            window.saveStateToLocalStorage(window.appState);
        }
    }, AUTO_SAVE_INTERVAL);
};

// 停止自动保存计时器
stopAutoSaveTimer = function() {
    if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
        autoSaveTimer = null;
    }
};

// 显示自动保存指示器
function showAutoSaveIndicator() {
    // 检查是否已存在自动保存指示器
    let indicator = document.getElementById('auto-save-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'auto-save-indicator';
        indicator.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-3 py-1 rounded-md text-sm shadow-lg transform transition-all duration-300 translate-y-full z-50';
        indicator.innerHTML = '<i class="fa fa-check mr-1"></i>已自动保存';
        document.body.appendChild(indicator);
    }
    
    // 显示指示器
    indicator.classList.remove('translate-y-full');
    
    // 3秒后隐藏
    setTimeout(function() {
        indicator.classList.add('translate-y-full');
    }, 3000);
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// 格式化时间
function formatTime(date) {
    const d = new Date(date);
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}

// 格式化日期
function formatDate(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 格式化日期时间
function formatDateTime(date) {
    return `${formatDate(date)} ${formatTime(date)}`;
}

// 生成唯一ID
function generateId() {
    return 'id_' + Math.random().toString(36).substr(2, 9);
}

// 深拷贝对象
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }
    
    if (obj instanceof Array) {
        return obj.map(item => deepClone(item));
    }
    
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

// 平滑滚动到指定元素
smoothScrollToElement = function(elementId, offset = 0) {
    const element = document.getElementById(elementId);
    if (element) {
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const targetPosition = elementPosition - offset;
        
        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }
};

// 检查是否在视口中
function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

// 获取URL参数
function getUrlParams() {
    const params = {};
    const queryString = window.location.search.slice(1);
    const pairs = queryString.split('&');
    
    for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i].split('=');
        const key = decodeURIComponent(pair[0]);
        const value = decodeURIComponent(pair[1] || '');
        params[key] = value;
    }
    
    return params;
}

// 设置URL参数
function setUrlParams(params) {
    const queryString = Object.keys(params)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(params[key]))
        .join('&');
    
    const newUrl = window.location.pathname + (queryString ? '?' + queryString : '');
    window.history.pushState({}, '', newUrl);
}

// 复制文本到剪贴板
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            // 回退方法
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
            } catch (error) {
                throw new Error('复制失败');
            } finally {
                document.body.removeChild(textArea);
            }
        }
        return true;
    } catch (error) {
        console.error('复制到剪贴板失败:', error);
        return false;
    }
}

// 检测移动设备
function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 检测触摸设备
function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// 下载文件
function downloadFile(content, filename, contentType) {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

// 导出到window对象
window.saveStateToLocalStorage = saveStateToLocalStorage;
window.loadStateFromLocalStorage = loadStateFromLocalStorage;
window.clearLocalStorage = clearLocalStorage;
window.startAutoSaveTimer = startAutoSaveTimer;
window.stopAutoSaveTimer = stopAutoSaveTimer;
window.smoothScrollToElement = smoothScrollToElement;
window.debounce = debounce;
window.throttle = throttle;
window.formatTime = formatTime;
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.generateId = generateId;
window.deepClone = deepClone;
window.isInViewport = isInViewport;
window.getUrlParams = getUrlParams;
window.setUrlParams = setUrlParams;
window.copyToClipboard = copyToClipboard;
window.isMobile = isMobile;
window.isTouchDevice = isTouchDevice;
window.downloadFile = downloadFile;