/**
 * ========================================
 * 🔄 fsAdapter.js - 文件系统适配器
 * ========================================
 * 
 * 🧠 核心知识点：临时文件管理
 * 
 * 在图像处理过程中，我们需要创建临时文件：
 * - 输入图像的副本（如果格式需要转换）
 * - mkbitmap 输出的 PBM 文件
 * - potrace 输出的 SVG 文件
 * 
 * 好的临时文件管理策略：
 * 1. 每次运行创建独立的临时目录（用时间戳命名）
 * 2. 成功后可选择清理或保留
 * 3. 失败时保留以便调试
 */

const fs = require('fs');
const path = require('path');
const { getPluginDir } = require('../core/binResolver');

// ========================================
// 创建临时目录
// ========================================
/**
 * 为本次转换创建一个临时目录
 * 
 * @param {string} prefix - 目录前缀（可选）
 * @returns {string} - 创建的临时目录路径
 * 
 * 🗺️ 逻辑思路：
 * 1. 获取插件目录下的 tmp 目录
 * 2. 用时间戳创建唯一子目录
 * 3. 确保目录存在
 */
function createTempDir(prefix = 'job') {
    const pluginDir = getPluginDir();
    const tmpBase = path.join(pluginDir, 'tmp');

    // 确保 tmp 目录存在
    if (!fs.existsSync(tmpBase)) {
        fs.mkdirSync(tmpBase, { recursive: true });
    }

    // 用时间戳创建唯一目录名
    const timestamp = Date.now();
    const dirName = `${prefix}-${timestamp}`;
    const tempDir = path.join(tmpBase, dirName);

    fs.mkdirSync(tempDir, { recursive: true });

    console.log('[fsAdapter] 创建临时目录:', tempDir);
    return tempDir;
}

// ========================================
// 生成临时文件路径
// ========================================
/**
 * 在临时目录中生成文件路径
 * 
 * @param {string} tempDir - 临时目录
 * @param {string} baseName - 基础文件名
 * @param {string} ext - 扩展名（如 '.pbm', '.svg'）
 * @returns {string} - 完整文件路径
 */
function getTempFilePath(tempDir, baseName, ext) {
    // 确保扩展名以点开头
    const extension = ext.startsWith('.') ? ext : '.' + ext;
    return path.join(tempDir, baseName + extension);
}

// ========================================
// 清理临时目录
// ========================================
/**
 * 删除临时目录及其内容
 * 
 * @param {string} tempDir - 要删除的目录路径
 * @param {boolean} force - 是否强制删除（即使有文件）
 */
function cleanupTempDir(tempDir, force = false) {
    try {
        if (fs.existsSync(tempDir)) {
            // recursive: true 会删除目录及其所有内容
            fs.rmSync(tempDir, { recursive: true, force: force });
            console.log('[fsAdapter] 清理临时目录:', tempDir);
        }
    } catch (error) {
        console.warn('[fsAdapter] 清理失败:', error.message);
    }
}

// ========================================
// 检查文件是否存在且非空
// ========================================
/**
 * 验证输出文件是否有效
 * 
 * @param {string} filePath - 文件路径
 * @returns {{ exists: boolean, size: number }}
 */
function validateOutput(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return {
            exists: true,
            size: stats.size
        };
    } catch {
        return {
            exists: false,
            size: 0
        };
    }
}

// ========================================
// 获取文件基础名（不含扩展名）
// ========================================
/**
 * 从文件路径中提取基础名
 * 
 * @param {string} filePath - 文件路径
 * @returns {string} - 基础名
 * 
 * 例如: '/path/to/image.png' -> 'image'
 */
function getBaseName(filePath) {
    return path.basename(filePath, path.extname(filePath));
}

// ========================================
// 导出模块
// ========================================
module.exports = {
    createTempDir,
    getTempFilePath,
    cleanupTempDir,
    validateOutput,
    getBaseName
};
