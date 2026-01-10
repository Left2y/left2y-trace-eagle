/**
 * 🎨 presets.js - 转换预设配置
 */

const PRESETS = {
    logo: {
        id: 'logo',
        label: 'Logo / 图标',
        description: '适合边缘清晰的面性图形，去噪能力强',
        // potrace 参数
        params: {
            invert: false,     // 不反相 (提取黑色部分)
            blacklevel: 0.3,   // 黑度阈值
            turdsize: 10,      // 噪点过滤大小
            alphamax: 0.5,     // 拐角阈值
            optcurve: true,    // 曲线优化
            opttolerance: 0.2  // 优化公差
        }
    },
    sketch: {
        id: 'sketch',
        label: '手绘 / 扫描稿',
        description: '保留更多细节和线条纹理',
        params: {
            invert: false,
            blacklevel: 0.45,  // 稍微提高阈值以捕捉更多浅色线条
            turdsize: 2,       // 减少去噪，保留小细节
            alphamax: 1,       // 允许更尖锐的角
            optcurve: false    // 关闭曲线优化，还原笔触
        }
    },
    // 将来可以添加更多预设
};

const DEFAULT_PRESET_ID = 'logo';

/**
 * 获取指定 ID 的预设，如果不存在则返回默认预设
 */
function getPreset(id) {
    return PRESETS[id] || PRESETS[DEFAULT_PRESET_ID];
}

// 导出模块
module.exports = {
    PRESETS,
    DEFAULT_PRESET_ID,
    getPreset
};
