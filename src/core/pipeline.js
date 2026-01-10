/**
 * ========================================
 * 🔗 pipeline.js - 转换流水线
 * ========================================
 * 
 * 🧠 核心知识点：简化的转换流程
 * 
 * 经过测试验证，对于干净的 Logo/图标，直接使用 potrace 效果更好：
 * [PNG/JPG] → (sips) → [BMP] → potrace → [SVG]
 * 
 * 跳过 mkbitmap 预处理步骤，potrace 自带 -i (反转) 和 -k (黑度阈值) 
 * 参数可以直接处理彩色/灰度图像。
 */

const path = require('path');
const potrace = require('./potrace');
const imageConverter = require('./imageConverter');
const fsAdapter = require('../adapters/fsAdapter');

// ========================================
// 单张图片转换
// ========================================
/**
 * 将一张图片转换为 SVG
 * 
 * @param {string} inputPath - 输入图片路径（PNG/JPG/BMP）
 * @param {object} options - 配置选项
 * @param {object} options.potrace - potrace 参数
 * @param {boolean} options.keepTemp - 是否保留临时文件
 * @returns {Promise<ConvertResult>}
 * 
 * 🗺️ 逻辑思路：
 * 1. 创建临时目录
 * 2. 如果是 PNG/JPG，先用 sips 转为 BMP
 * 3. 执行 potrace：BMP → SVG
 * 4. 验证输出文件
 * 5. 清理或保留临时文件
 * 6. 返回结果
 */
async function convertOne(inputPath, options = {}) {
    const startTime = Date.now();         // 记录开始时间
    const baseName = fsAdapter.getBaseName(inputPath);  // 获取文件基础名

    // 创建临时目录
    const tempDir = fsAdapter.createTempDir(baseName);

    // 定义中间文件路径
    const bmpPath = fsAdapter.getTempFilePath(tempDir, baseName, '.bmp');
    const svgPath = fsAdapter.getTempFilePath(tempDir, baseName, '.svg');

    console.log('[pipeline] 开始转换:', inputPath);
    console.log('[pipeline] 临时目录:', tempDir);

    // potrace 的输入（可能是原文件或转换后的 BMP）
    let potraceInput = inputPath;

    try {
        // ========================================
        // Step 1: 格式转换（如果需要）
        // ========================================
        if (imageConverter.needsConversion(inputPath)) {
            console.log('[pipeline] Step 1: PNG/JPG → BMP...');

            const convertResult = await imageConverter.convertToBmp(inputPath, bmpPath);

            if (!convertResult.success) {
                throw new Error(`格式转换失败: ${convertResult.error}`);
            }

            // 验证 BMP 输出
            const bmpValidation = fsAdapter.validateOutput(bmpPath);
            if (!bmpValidation.exists || bmpValidation.size === 0) {
                throw new Error('sips 输出的 BMP 文件为空或不存在');
            }

            console.log('[pipeline] BMP 转换成功，大小:', bmpValidation.size, 'bytes');
            potraceInput = bmpPath;  // 使用转换后的 BMP 作为 potrace 输入
        }

        // ========================================
        // Step 2: potrace（BMP → SVG）
        // ========================================
        console.log('[pipeline] Step 2: BMP → SVG (potrace)...');
        const potraceResult = await potrace.run(
            potraceInput,
            svgPath,
            options.potrace || {}
        );

        if (!potraceResult.success) {
            throw new Error(`potrace 失败: ${potraceResult.error}\n${potraceResult.stderr || ''}`);
        }

        // 验证 SVG 输出
        const svgValidation = fsAdapter.validateOutput(svgPath);
        if (!svgValidation.exists || svgValidation.size === 0) {
            throw new Error('potrace 输出的 SVG 文件为空或不存在');
        }
        console.log('[pipeline] SVG 生成成功，大小:', svgValidation.size, 'bytes');

        // ========================================
        // 计算耗时
        // ========================================
        const duration = Date.now() - startTime;
        console.log('[pipeline] 转换完成，耗时:', duration, 'ms');

        // ========================================
        // 清理临时文件（可选）
        // ========================================
        if (!options.keepTemp) {
            const fs = require('fs');
            // 删除中间文件（BMP），保留 SVG
            try {
                if (fs.existsSync(bmpPath)) fs.unlinkSync(bmpPath);
                console.log('[pipeline] 已删除临时 BMP 文件');
            } catch (e) {
                console.warn('[pipeline] 删除临时文件失败:', e.message);
            }
        }

        // 返回成功结果
        return {
            success: true,
            inputPath: inputPath,
            outputPath: svgPath,
            tempDir: tempDir,
            stats: {
                duration: duration,
                outputSize: svgValidation.size
            }
        };

    } catch (error) {
        // ========================================
        // 错误处理
        // ========================================
        const duration = Date.now() - startTime;
        console.error('[pipeline] 转换失败:', error.message);

        // 失败时保留临时目录，方便调试
        return {
            success: false,
            inputPath: inputPath,
            error: error.message,
            tempDir: tempDir,
            stats: {
                duration: duration
            }
        };
    }
}

// ========================================
// 导出模块
// ========================================
module.exports = {
    convertOne
};
