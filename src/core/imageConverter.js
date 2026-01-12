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
 * - Windows: 优先使用内置 ImageMagick (便携版 magick.exe) 转 BMP，若缺失则回退 PowerShell/.NET
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { getPluginDir } = require('./binResolver');

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
// 跨平台转换为 BMP
// ========================================
/**
 * 将图片转换为 BMP 格式（mac 用 sips，Windows 用内置 ImageMagick；备用回退 PowerShell/.NET）
 *
 * @param {string} inputPath - 输入图片路径
 * @param {string} outputPath - 输出 BMP 路径
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
function convertToBmp(inputPath, outputPath) {
    return new Promise((resolve) => {
        const platform = process.platform;

        if (platform === 'darwin') {
            console.log('[imageConverter] macOS 使用 sips 转换:', inputPath, '->', outputPath);
            const args = ['-s', 'format', 'bmp', inputPath, '--out', outputPath];
            const proc = spawn('sips', args);
            let stderr = '';

            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, outputPath });
                } else {
                    resolve({ success: false, error: `sips 退出码: ${code}, ${stderr}` });
                }
            });

            proc.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });
            return;
        }

        if (platform === 'win32') {
            const magickPath = path.join(getPluginDir(), 'bin', 'win32-x64', 'imagemagick', 'magick.exe');
            if (fsExists(magickPath)) {
                console.log('[imageConverter] Windows 使用内置 ImageMagick:', magickPath);
                const args = [magickPath, inputPath, 'BMP3:' + outputPath];
                const proc = spawn(args.shift(), args);
                let stderr = '';

                proc.stderr.on('data', (data) => {
                    stderr += data.toString();
                });

                proc.on('close', (code) => {
                    if (code === 0) {
                        resolve({ success: true, outputPath });
                    } else {
                        resolve({ success: false, error: `ImageMagick 退出码: ${code}, ${stderr}` });
                    }
                });

                proc.on('error', (err) => {
                    resolve({ success: false, error: err.message });
                });
                return;
            }

            console.log('[imageConverter] ImageMagick 不可用，回退 PowerShell 转 BMP:', inputPath, '->', outputPath);
            const escapedInput = inputPath.replace(/'/g, "''");
            const escapedOutput = outputPath.replace(/'/g, "''");
            const psScript = `
Add-Type -AssemblyName System.Drawing;
$img = [System.Drawing.Image]::FromFile('${escapedInput}');
$img.Save('${escapedOutput}', [System.Drawing.Imaging.ImageFormat]::Bmp);
$img.Dispose();`;
            const args = ['-NoProfile', '-NonInteractive', '-Command', psScript];
            const proc = spawn('powershell.exe', args);
            let stderr = '';

            proc.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            proc.on('close', (code) => {
                if (code === 0) {
                    resolve({ success: true, outputPath });
                } else {
                    resolve({ success: false, error: `PowerShell 转换失败 (exit ${code}): ${stderr}` });
                }
            });

            proc.on('error', (err) => {
                resolve({ success: false, error: err.message });
            });
            return;
        }

        resolve({
            success: false,
            error: `当前平台未提供内置转换器: ${platform}`
        });
    });
}

function fsExists(p) {
    try {
        fs.accessSync(p);
        return true;
    } catch {
        return false;
    }
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
