/**
 * ========================================
 * 🔄 imageConverter.js - 图像格式转换器
 * ========================================
 * 
 * 🧠 核心策略：归一化为 "白纸黑字" (Dark Ink on White Paper)
 * 
 * 为了彻底解决黑底/隐形问题，我们统一所有输入的标准：
 * 无论原图是 黑字透明底、白字透明底 还是 扫描件，
 * 最终都转换为 => 【白色背景，深色前景】的 PGM 图片。
 * 
 * 然后配合 potrace (禁用 -i 反转)，即可准确提取轮廓。
 */

const fs = require('fs');
const path = require('path');

const SUPPORTED_INPUT_FORMATS = ['png', 'jpg', 'jpeg', 'gif', 'tiff', 'bmp'];
const MKBITMAP_NATIVE_FORMATS = ['pbm', 'pgm', 'ppm', 'pnm'];

function needsConversion(filePath) {
    const ext = path.extname(filePath).toLowerCase().slice(1);
    // 强制所有格式走清洗流程，确保对比度归一化
    return true;
}

// ========================================
// 核心：Canvas 转 PGM (归一化处理)
// ========================================
async function convertToPgm(inputPath, outputPath) {
    try {
        const img = new Image();
        const srcPath = inputPath.startsWith('http') ? inputPath : `file://${inputPath}`;
        img.src = srcPath;

        await new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = (e) => reject(new Error(`图片加载失败: ${srcPath}`));
        });

        // 2. 分析原始图片（在缩放前分析颜色，准确度够了）
        // 创建一个小画布用于快速分析
        const analysisCanvas = document.createElement('canvas');
        analysisCanvas.width = img.width;
        analysisCanvas.height = img.height;
        const analysisCtx = analysisCanvas.getContext('2d');
        analysisCtx.drawImage(img, 0, 0);
        const rawData = analysisCtx.getImageData(0, 0, img.width, img.height);

        const stats = analyzeImageStats(rawData);
        console.log(`[imageConverter] 图像分析:`, stats);

        const shouldInvertContent = stats.isLightContent;
        console.log(`[imageConverter] 模式: ${shouldInvertContent ? '白字转黑字 (Invert)' : '保持原有 (Keep)'}`);

        // 3. 决定缩放倍率 (Smart Upscaling)
        // 🧠 核心优化：为了解决低分辨率图片的锯齿/波浪线问题
        // 我们将图片放大，利用 Canvas 的双线性/双三次插值让边缘更平滑
        // 目标尺寸：长边至少达到 2048px (但限制最大缩放倍数，防止过大)
        const TARGET_DIM = 2048;
        const maxDim = Math.max(img.width, img.height);

        // 计算缩放比：如果小于目标尺寸，就放大；否则保持 (不缩小)
        let scale = 1;
        if (maxDim < TARGET_DIM) {
            scale = TARGET_DIM / maxDim;
            // 限制最大放大倍数 (比如 8x)，避免 16x16 的 icon 爆炸
            scale = Math.min(scale, 8);
            // 确保至少是整数或者 .5 这种比较整的数？不，Canvas 无所谓。
        }

        // 四舍五入保留2位小数方便看日志
        scale = Math.round(scale * 100) / 100;

        console.log(`[imageConverter] 原始尺寸: ${img.width}x${img.height}, 缩放倍率: ${scale}x`);

        // 4. 创建最终画布 (Scaled)
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');

        // 开启平滑插值 (默认就是开启的，显式声明一下以防万一)
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 5. 绘制并应用颜色归一化
        // 先绘制图片（带缩放）
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // 获取缩放后的数据
        const scaledData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // 6. 编码并写入 PGM
        // 注意：这里使用的是 scaledData，所以输出的 PGM 也是高分辨率的
        const pgmBuffer = encodeToPgm(scaledData, shouldInvertContent);
        fs.writeFileSync(outputPath, pgmBuffer);

        return { success: true, outputPath };

    } catch (error) {
        console.error('[imageConverter] 转换失败:', error);
        return { success: false, error: error.message };
    }
}

/**
 * 统计图像特征
 */
function analyzeImageStats(imageData) {
    const { data } = imageData;
    let totalLuma = 0;
    let pixelCount = 0;
    let transparentCount = 0;
    const totalPixels = data.length / 4;

    for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a < 10) {
            transparentCount++;
        } else {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            totalLuma += (0.299 * r + 0.587 * g + 0.114 * b);
            pixelCount++;
        }
    }

    const hasTransparency = (transparentCount / totalPixels) > 0.05; // >5% 透明度

    let isLightContent = false;

    if (hasTransparency) {
        // 如果有透明背景，看剩下的内容是亮是暗
        // 平均亮度 > 128 -> 白字 -> 需要反转
        const avgLuma = pixelCount > 0 ? totalLuma / pixelCount : 0;
        isLightContent = avgLuma > 128;
    } else {
        // 如果是不透明图片 (扫描件/照片)
        // 主要是黑字白底 (Avg > 128) -> 不需要反转
        // 或者是白字黑板 (Avg < 128) -> 需要反转
        const avgLuma = totalLuma / totalPixels;
        // 如果整体很暗 (<128)，说明是黑底白字，我们需要反转成白底黑字
        isLightContent = avgLuma < 128;
    }

    return {
        hasTransparency,
        isLightContent
    };
}

/**
 * 编码 PGM (Standard P5)
 * 目标：White Background (255), Dark Ink (0)
 */
function encodeToPgm(imageData, invertContent) {
    const { width, height, data } = imageData;
    const header = `P5\n${width} ${height}\n255\n`;

    const headerBuf = Buffer.from(header);
    const pixelBuf = Buffer.alloc(width * height);

    for (let i = 0; i < width * height; i++) {
        const offset = i * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const a = data[offset + 3];

        let gray;

        // 逻辑核心：
        // 1. 透明像素 -> 永远变成 白色背景 (255)
        if (a < 10) {
            gray = 255;
        } else {
            // 2. 内容像素
            let luma = 0.299 * r + 0.587 * g + 0.114 * b;

            // 如果我们需要“反转内容” (比如把白字变黑)
            if (invertContent) {
                // 白(255) -> 黑(0)
                // 黑(0) -> 白(255)
                gray = 255 - luma;
            } else {
                // 保持原样 (比如原本就是黑字)
                gray = luma;
            }

            gray = Math.round(gray);
        }

        pixelBuf[i] = gray;
    }

    return Buffer.concat([headerBuf, pixelBuf]);
}

module.exports = {
    needsConversion,
    convertToPgm,
    SUPPORTED_INPUT_FORMATS,
    MKBITMAP_NATIVE_FORMATS
};
