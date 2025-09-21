// API通信模块 - 负责与后端服务器的所有通信

// 基础API配置
const API_BASE_URL = 'http://localhost:3000';

// 用户相关API
export async function checkUserLoginStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/current`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const user = await response.json();
            return { success: true, user };
        } else {
            return { success: false, demo: true };
        }
    } catch (error) {
        console.error('检查用户登录状态失败:', error);
        return { success: false, demo: true, error };
    }
}

export async function logoutUser() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/users/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        return response.ok;
    } catch (error) {
        console.error('退出登录失败:', error);
        return false;
    }
}

// 剧本相关API
export async function saveScriptToServer(scriptData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/scripts/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(scriptData)
        });
        
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        console.error('保存剧本失败:', error);
        return { success: false, error };
    }
}

export async function exportScriptToServer(scriptId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/scripts/export/${scriptId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        if (response.ok) {
            const blob = await response.blob();
            return { success: true, blob };
        }
        
        return { success: false };
    } catch (error) {
        console.error('导出剧本失败:', error);
        return { success: false, error };
    }
}

// 任务管理API
export async function createTask(endpoint, payload) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        
        const data = await response.json();
        return { success: response.ok && data.taskId, data };
    } catch (error) {
        console.error('创建任务失败:', error);
        return { success: false, error };
    }
}

export async function getTaskStatus(taskId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/status/${taskId}`, {
            method: 'GET',
            credentials: 'include'
        });
        
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        console.error('获取任务状态失败:', error);
        return { success: false, error };
    }
}

export async function cancelTask(taskId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/tasks/cancel/${taskId}`, {
            method: 'POST',
            credentials: 'include'
        });
        
        const data = await response.json();
        return { success: response.ok, data };
    } catch (error) {
        console.error('取消任务失败:', error);
        return { success: false, error };
    }
}

// AI生成相关API
export async function generateLoglines(payload) {
    return createTask('/api/ai/generate/loglines', payload);
}

export async function generateOutline(payload) {
    return createTask('/api/ai/generate/outline', payload);
}

export async function generateEpisodes(payload) {
    return createTask('/api/ai/generate/episodes', payload);
}

export async function generateScriptContent(payload) {
    return createTask('/api/ai/generate/script', payload);
}