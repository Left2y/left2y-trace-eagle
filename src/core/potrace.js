/**
 * ========================================
 * ✏️ potrace.js - potrace 命令行封装
 * ========================================
 * 
 * 🧠 核心知识点：potrace 的作用
 * 
 * potrace 是一个位图追踪工具，能将黑白位图转换为矢量图。
 * 它会分析图像中的黑色区域，用贝塞尔曲线描绘其轮廓。
 * 
 * 关键参数：
 * - alphamax: 角点阈值，越小角越尖（0 = 多边形）
 * - opttolerance: 曲线优化容差，越大节点越少但精度降低
 * - turdsize: 去噪点阈值，忽略小于该像素数的斑点
 * - tight: 裁掉外围空白
 */

const { spawn } = require('child_process');
const path = require('path');
const { getBinPath } = require('./binResolver');

// ========================================
// 默认参数
// ========================================
/**
 * potrace 默认参数配置
 * 经过测试验证，这组参数适合干净的 Logo/图标转换
 */
const DEFAULT_PARAMS = {
    invert: true,         // -i: 反转位图（白底→追踪深色）
    blacklevel: 0.3,      // -k: 黑度阈值（低于此值视为黑色）
    alphamax: 0.5,        // -a: 角点阈值，0.5 更锐利
    opttolerance: 0.2,    // -O: 曲线优化容差
    turdsize: 10,         // -t: 去噪点像素阈值（忽略小斑点）
    tight: true,          // --tight: 裁掉外围空白
    group: false          // --group: 是否分组输出
};

// ========================================
// 构建命令行参数
// ========================================
/**
 * 将参数对象转换为命令行参数数组
 */
function buildArgs(params, inputPath, outputPath) {
    const args = [];

    // 输出格式：SVG
    args.push('--svg');

    // 反转位图：-i
    if (params.invert) {
        args.push('-i');
    }

    // 黑度阈值：-k <n>
    if (params.blacklevel !== undefined) {
        args.push('-k', String(params.blacklevel));
    }

    // 角点阈值：-a <n>
    if (params.alphamax !== undefined) {
        args.push('-a', String(params.alphamax));
    }

    // 曲线优化容差：-O <n>
    if (params.opttolerance !== undefined) {
        args.push('-O', String(params.opttolerance));
    }

    // 去噪点：-t <n>
    if (params.turdsize !== undefined) {
        args.push('-t', String(params.turdsize));
    }

    // 裁白边：--tight
    if (params.tight) {
        args.push('--tight');
    }

    // 分组输出：--group
    if (params.group) {
        args.push('--group');
    }

    // 输出文件：-o <path>
    args.push('-o', outputPath);

    // 输入文件
    args.push(inputPath);

    return args;
}

// ========================================
// 执行 potrace
// ========================================
/**
 * 执行 potrace 命令，将 PBM 转换为 SVG
 * 
 * @param {string} inputPath - 输入 PBM 文件路径
 * @param {string} outputPath - 输出 SVG 文件路径
 * @param {object} params - 参数配置（可选）
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string}>}
 */
function run(inputPath, outputPath, params = {}) {
    return new Promise((resolve) => {
        const mergedParams = { ...DEFAULT_PARAMS, ...params };
        const binPath = getBinPath('potrace');
        const args = buildArgs(mergedParams, inputPath, outputPath);

        console.log('[potrace] 执行命令:', binPath, args.join(' '));

        const process = spawn(binPath, args);

        let stdout = '';
        let stderr = '';

        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        process.on('close', (code) => {
            if (code === 0) {
                resolve({
                    success: true,
                    outputPath: outputPath,
                    stdout: stdout,
                    stderr: stderr
                });
            } else {
                resolve({
                    success: false,
                    error: `potrace 退出码: ${code}`,
                    stderr: stderr
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
// 导出模块
// ========================================
module.exports = {
    run,
    DEFAULT_PARAMS,
    buildArgs
};
