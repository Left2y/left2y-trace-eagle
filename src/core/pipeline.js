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
const fs = require('fs');

// ========================================
// Phase 1 Core: 分离预处理
// ========================================
/**
 * 1. 预处理阶段 (耗时)
 * 将输入图片清洗、缩放、归一化为标准的 PGM 文件
 * 
 * @param {string} inputPath 
 * @param {string} tempDir (可选, 如果不传则自动创建)
 * @returns {Promise<{pgmPath: string, tempDir: string, stats: object}>}
 */
async function preprocessImage(inputPath, tempDir = null) {
    const startTime = Date.now();
    const baseName = fsAdapter.getBaseName(inputPath);

    // 如果没有提供临时目录，创建一个新的
    if (!tempDir) {
        tempDir = fsAdapter.createTempDir(baseName);
    }

    const pgmPath = fsAdapter.getTempFilePath(tempDir, baseName, '.pgm');
    console.log('[pipeline] Preprocess Start:', inputPath);

    // 调用 imageConverter 进行 Canvas 绘图 + 缩放 + 归一化
    const convertResult = await imageConverter.convertToPgm(inputPath, pgmPath);

    if (!convertResult.success) {
        throw new Error(`预处理失败: ${convertResult.error}`);
    }

    const duration = Date.now() - startTime;
    console.log('[pipeline] Preprocess Done, PGM created:', pgmPath, `(${duration}ms)`);

    return {
        pgmPath,
        tempDir,
        stats: { preprocessTime: duration }
    };
}

// ========================================
// Phase 1 Core: 实时追踪
// ========================================
/**
 * 2. 追踪阶段 (快速 / 实时)
 * 使用指定参数将 PGM 转换为 SVG 字符串 (预览用) 或 文件 (保存用)
 * 
 * @param {string} pgmPath - 预处理好的 PGM 路径
 * @param {object} options - Potrace 参数 (opttolerance, alphamax, etc.)
 * @param {string} outputPath - (可选) 如果传了路径，则写入文件；否则只读出内容
 * @returns {Promise<{svgContent: string, outputPath?: string}>}
 */
async function tracePgm(pgmPath, options = {}, outputPath = null) {
    const startTime = Date.now();

    // 构造临时输出路径 (potrace 必须输出到文件，不能直接 stdout svg)
    // 我们可以输出到一个 temp svg，然后读出来
    const tempSvgPath = outputPath || pgmPath.replace('.pgm', `_${Date.now()}.svg`);

    console.log('[pipeline] Trace Start (Params):', JSON.stringify(options));

    const potraceResult = await potrace.run(
        pgmPath,
        tempSvgPath,
        options
    );

    if (!potraceResult.success) {
        throw new Error(`Tracing 失败: ${potraceResult.error}`);
    }

    // 读取生成的 SVG 内容
    let svgContent = '';
    if (fs.existsSync(tempSvgPath)) {
        svgContent = fs.readFileSync(tempSvgPath, 'utf-8');
    }

    // 如果只是为了预览 (outputPath 为空)，读完后可以把这个临时的 SVG 删掉
    if (!outputPath) {
        try {
            fs.unlinkSync(tempSvgPath);
        } catch (e) { /* ignore */ }
    }

    const duration = Date.now() - startTime;
    console.log('[pipeline] Trace Done', `(${duration}ms)`);

    return {
        success: true,
        svgContent,
        outputPath: outputPath ? tempSvgPath : null,
        stats: { traceTime: duration }
    };
}

// ========================================
// 兼容旧接口：一键转换
// ========================================
/**
 * 传统的全流程转换 (v1.3 逻辑的 wrapper)
 */
async function convertOne(inputPath, options = {}) {
    const startTime = Date.now();
    let tempDir = null;
    let pgmPath = null;

    try {
        // Step 1: Preprocess
        const preResult = await preprocessImage(inputPath);
        tempDir = preResult.tempDir;
        pgmPath = preResult.pgmPath;

        // Step 2: Trace
        const baseName = fsAdapter.getBaseName(inputPath);
        const svgPath = fsAdapter.getTempFilePath(tempDir, baseName, '.svg');

        const traceResult = await tracePgm(
            pgmPath,
            options.potrace || {},
            svgPath
        );

        // Step 3: Cleanup (Optional)
        if (!options.keepTemp) {
            try {
                if (fs.existsSync(pgmPath)) fs.unlinkSync(pgmPath);
            } catch (e) { }
        }

        return {
            success: true,
            inputPath,
            outputPath: svgPath,
            tempDir,
            stats: {
                duration: Date.now() - startTime,
                preprocessTime: preResult.stats.preprocessTime,
                traceTime: traceResult.stats.traceTime
            }
        };

    } catch (error) {
        console.error('[pipeline] Full Convert Failed:', error);
        return {
            success: false,
            inputPath,
            error: error.message,
            tempDir,
            stats: { duration: Date.now() - startTime }
        };
    }
}

module.exports = {
    preprocessImage,
    tracePgm,
    convertOne
};
