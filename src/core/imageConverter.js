/**
 * ========================================
 * 🔄 imageConverter.js - 图像格式转换器
 * ========================================
 * 
 * 🧠 核心知识点：格式转换的必要性
 * 
 * mkbitmap 只支持 pnm (pbm, pgm, ppm) 和 bmp 格式，
 * 但我们常用的图片格式是 PNG/JPG。
 * 
 * 解决方案：
 * - macOS: 使用系统自带的 sips 命令
 * - 其他平台: 可以使用 ImageMagick 或 sharp 库
 * 
 * sips (Scriptable Image Processing System):
 * macOS 自带的图像处理工具，功能强大且无需安装。
 */

const { spawn } = require('child_process');
const path = require('path');

// ========================================
// 支持的输入格式
// ========================================
const SUPPORTED_INPUT_FORMATS = ['png', 'jpg', 'jpeg', 'gif', 'tiff', 'bmp'];

// mkbitmap 支持的格式（不需要转换）
const MKBITMAP_NATIVE_FORMATS = ['bmp', 'pbm', 'pgm', 'ppm', 'pnm'];

// ========================================
// 检查是否需要格式转换
// ========================================
/**
 * 判断文件是否需要转换
 * 
 * @param {string} filePath - 文件路径
 * @returns {boolean} - true 表示需要转换
 */
function needsConversion(filePath) {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    return !MKBITMAP_NATIVE_FORMATS.includes(ext);
}

// ========================================
// 使用 sips 转换为 BMP
// ========================================
/**
 * 使用 macOS sips 将图片转换为 BMP 格式
 * 
 * @param {string} inputPath - 输入图片路径
 * @param {string} outputPath - 输出 BMP 路径
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 * 
 * sips 命令格式：
 * sips -s format bmp <input> --out <output>
 */
function convertToBmp(inputPath, outputPath) {
    return new Promise((resolve) => {
        console.log('[imageConverter] 使用 sips 转换:', inputPath, '->', outputPath);

        // sips 参数：
        // -s format bmp : 设置输出格式为 BMP
        // --out <path> : 指定输出路径
        const args = ['-s', 'format', 'bmp', inputPath, '--out', outputPath];

        const process = spawn('sips', args);

        let stderr = '';

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve({
                    success: true,
                    outputPath: outputPath
                });
            } else {
                resolve({
                    success: false,
                    error: `sips 退出码: ${code}, ${stderr}`
                });
            }
        });

        process.on('error', (err) => {
            resolve({
                success: false,
                error: err.message
            });
        });
    });
}

// ========================================
// 检查文件格式是否支持
// ========================================
/**
 * 检查文件扩展名是否在支持列表中
 */
function isSupportedFormat(filePath) {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    return SUPPORTED_INPUT_FORMATS.includes(ext) || MKBITMAP_NATIVE_FORMATS.includes(ext);
}

// ========================================
// 导出模块
// ========================================
module.exports = {
    needsConversion,
    convertToBmp,
    isSupportedFormat,
    SUPPORTED_INPUT_FORMATS,
    MKBITMAP_NATIVE_FORMATS
};
