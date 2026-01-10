/**
 * ========================================
 * 🖼️ mkbitmap.js - mkbitmap 命令行封装
 * ========================================
 * 
 * 🧠 核心知识点：mkbitmap 的作用
 * 
 * mkbitmap 是 potrace 套件中的预处理工具，
 * 它将彩色/灰度图像转换为高质量的黑白位图（PBM 格式）。
 * 
 * 处理顺序：
 * 1. 反相（可选）- 将黑白颠倒
 * 2. 高通滤波 - 去除低频背景噪声
 * 3. 缩放 - 放大图像以保留更多细节
 * 4. 阈值化 - 将灰度转为纯黑白
 * 
 * 为什么需要 mkbitmap？
 * potrace 只能处理黑白位图，直接转换灰度图效果很差。
 * mkbitmap 的插值放大 + 智能阈值化能保留更多边缘细节。
 */

const { spawn } = require('child_process');      // 用于执行外部命令
const path = require('path');
const { getBinPath } = require('./binResolver');

// ========================================
// 默认参数
// ========================================
/**
 * mkbitmap 默认参数配置
 * 这些值来自 PRD 文档的推荐设置
 */
const DEFAULT_PARAMS = {
    scale: 2,           // -s: 放大倍数，2 是官方推荐值
    threshold: 0.45,    // -t: 阈值 (0~1)，0.45 是默认预设
    filter: 4,          // -f: 高通滤波半径
    blur: 0,            // -b: 模糊程度，0 表示关闭
    invert: true,       // -i: 反相，默认开启（适合面性图标）
    cubic: true         // -3: 使用三次插值（更平滑）
};

// ========================================
// 构建命令行参数
// ========================================
/**
 * 将参数对象转换为命令行参数数组
 * 
 * @param {object} params - 参数对象
 * @param {string} inputPath - 输入文件路径
 * @param {string} outputPath - 输出文件路径
 * @returns {string[]} - 命令行参数数组
 * 
 * 🗺️ 逻辑思路：
 * 1. 检查每个参数是否有值
 * 2. 将其转换为对应的命令行开关
 * 3. 最后添加输入和输出文件
 */
function buildArgs(params, inputPath, outputPath) {
    const args = [];

    // 放大倍数：-s <n>
    if (params.scale && params.scale !== 1) {
        args.push('-s', String(params.scale));
    }

    // 阈值：-t <n>
    if (params.threshold !== undefined) {
        args.push('-t', String(params.threshold));
    }

    // 高通滤波：-f <n>
    if (params.filter && params.filter > 0) {
        args.push('-f', String(params.filter));
    }

    // 模糊：-b <n>
    if (params.blur && params.blur > 0) {
        args.push('-b', String(params.blur));
    }

    // 反相：-i
    if (params.invert) {
        args.push('-i');
    }

    // 插值方式：-3 (cubic) 或 -1 (linear)
    if (params.cubic !== false) {
        args.push('-3');  // 默认使用三次插值
    } else {
        args.push('-1');  // 线性插值
    }

    // 输出文件：-o <path>
    args.push('-o', outputPath);

    // 输入文件（放在最后）
    args.push(inputPath);

    return args;
}

// ========================================
// 执行 mkbitmap
// ========================================
/**
 * 执行 mkbitmap 命令，将输入图像转换为 PBM
 * 
 * @param {string} inputPath - 输入图像路径
 * @param {string} outputPath - 输出 PBM 路径
 * @param {object} params - 参数配置（可选）
 * @returns {Promise<{success: boolean, outputPath?: string, error?: string, stderr?: string}>}
 * 
 * 🗺️ 逻辑思路：
 * 1. 获取 mkbitmap 可执行文件路径
 * 2. 构建命令行参数
 * 3. 使用 spawn 执行命令
 * 4. 监听 stdout、stderr、exit 事件
 * 5. 返回执行结果
 */
function run(inputPath, outputPath, params = {}) {
    return new Promise((resolve) => {
        // 合并默认参数和用户参数
        const mergedParams = { ...DEFAULT_PARAMS, ...params };

        // 获取 mkbitmap 路径
        const binPath = getBinPath('mkbitmap');

        // 构建参数
        const args = buildArgs(mergedParams, inputPath, outputPath);

        // 打印执行的命令（方便调试）
        console.log('[mkbitmap] 执行命令:', binPath, args.join(' '));

        // 使用 spawn 执行命令
        // spawn 比 exec 更适合处理大量输出
        const process = spawn(binPath, args);

        let stdout = '';   // 标准输出
        let stderr = '';   // 错误输出

        // 收集标准输出
        process.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        // 收集错误输出
        process.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        // 进程结束时处理结果
        process.on('close', (code) => {
            if (code === 0) {
                // 退出码 0 表示成功
                resolve({
                    success: true,
                    outputPath: outputPath,
                    stdout: stdout,
                    stderr: stderr
                });
            } else {
                // 非 0 退出码表示失败
                resolve({
                    success: false,
                    error: `mkbitmap 退出码: ${code}`,
                    stderr: stderr
                });
            }
        });

        // 处理进程错误（如文件不存在）
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
