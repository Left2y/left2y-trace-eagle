/**
 * ⚙️ settings.js - 用户偏好设置管理
 */

const { DEFAULT_PRESET_ID } = require('./presets.js');

const STORAGE_KEY = 'left2y_trace_settings_v1';

const DEFAULT_SETTINGS = {
    currentPresetId: DEFAULT_PRESET_ID,
    invert: false, // 默认不反相
    // 这里将来可以存放自定义参数
    customParams: {}
};

/**
 * 加载设置
 */
function loadSettings() {
    try {
        const json = localStorage.getItem(STORAGE_KEY);
        if (json) {
            const parsed = JSON.parse(json);
            return { ...DEFAULT_SETTINGS, ...parsed };
        }
    } catch (e) {
        console.error('[Settings] 加载失败，使用默认值:', e);
    }
    return { ...DEFAULT_SETTINGS };
}

/**
 * 保存设置
 */
function saveSettings(settings) {
    try {
        const toSave = { ...settings };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
        // console.log('[Settings] 已保存');
    } catch (e) {
        console.error('[Settings] 保存失败:', e);
    }
}

/**
 * 重置设置
 */
function resetSettings() {
    localStorage.removeItem(STORAGE_KEY);
    return { ...DEFAULT_SETTINGS };
}

module.exports = {
    loadSettings,
    saveSettings,
    resetSettings
};
