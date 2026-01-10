/**
 * ========================================
 * 🔧 binResolver.js - 二进制文件定位器
 * ========================================
 * 
 * 🧠 核心知识点：
 * 这个模块负责根据当前操作系统和 CPU 架构，
 * 找到正确的 potrace/mkbitmap 可执行文件路径。
 * 
 * 不同平台的二进制文件是不同的：
 * - macOS arm64 (M1/M2/M3): darwin-arm64
 * - macOS Intel: darwin-x64
 * - Windows: win32-x64
 * - Linux: linux-x64
 */

const path = require('path');                    // Node.js 路径处理模块
const { execSync } = require('child_process');   // 同步执行命令行

// ========================================
// 获取插件根目录
// ========================================
// __dirname 是当前文件所在的目录
// 我们需要从 src/core 回退到插件根目录
function getPluginDir() {
  // __dirname 可能是: /path/to/plugin/src/core
  // 我们需要返回: /path/to/plugin
  return path.resolve(__dirname, '..', '..');
}

// ========================================
// 获取二进制文件路径
// ========================================
/**
 * 根据当前平台获取指定二进制文件的完整路径
 * 
 * @param {string} binName - 二进制文件名，如 'potrace' 或 'mkbitmap'
 * @returns {string} - 完整的可执行文件路径
 * 
 * 🗺️ 逻辑思路：
 * 1. 获取当前操作系统 (process.platform)
 * 2. 获取 CPU 架构 (process.arch)
 * 3. 拼接路径: bin/{platform}-{arch}/{binName}
 * 4. Windows 需要加 .exe 后缀
 */
function getBinPath(binName) {
  // process.platform 返回: 'darwin'(macOS), 'win32'(Windows), 'linux'(Linux)
  const platform = process.platform;
  
  // process.arch 返回: 'arm64'(M1/M2), 'x64'(Intel/AMD 64位)
  const arch = process.arch;
  
  // 拼接平台-架构目录名，如 'darwin-arm64'
  const platformDir = `${platform}-${arch}`;
  
  // Windows 可执行文件需要 .exe 后缀
  const ext = platform === 'win32' ? '.exe' : '';
  
  // 最终路径: {插件目录}/bin/{平台目录}/{文件名}
  const binPath = path.join(getPluginDir(), 'bin', platformDir, binName + ext);
  
  return binPath;
}

// ========================================
// 验证二进制文件是否可用
// ========================================
/**
 * 执行 --version 命令来验证二进制文件是否可正常运行
 * 
 * @param {string} binPath - 二进制文件的完整路径
 * @returns {{ success: boolean, version?: string, error?: string }}
 * 
 * 🗺️ 逻辑思路：
 * 1. 尝试执行 "{binPath} --version"
 * 2. 如果成功，提取版本号
 * 3. 如果失败，返回错误信息
 */
function verifyBinary(binPath) {
  try {
    // execSync 同步执行命令，返回 stdout
    // stdio: 'pipe' 表示捕获输出而不是打印到控制台
    const output = execSync(`"${binPath}" --version`, { 
      stdio: 'pipe',
      encoding: 'utf-8'  // 将 Buffer 转为字符串
    });
    
    // 提取第一行作为版本信息
    const version = output.split('\n')[0].trim();
    
    return {
      success: true,
      version: version
    };
  } catch (error) {
    // 执行失败（文件不存在、权限不足等）
    return {
      success: false,
      error: error.message
    };
  }
}

// ========================================
// 初始化并验证所有必需的二进制文件
// ========================================
/**
 * 验证 potrace 和 mkbitmap 是否都可用
 * 
 * @returns {{ ready: boolean, binaries: object, errors: string[] }}
 */
function initBinaries() {
  const errors = [];                // 收集所有错误
  const binaries = {};              // 存储二进制信息
  
  // 需要验证的二进制文件列表
  const requiredBins = ['potrace', 'mkbitmap'];
  
  for (const binName of requiredBins) {
    const binPath = getBinPath(binName);
    const result = verifyBinary(binPath);
    
    binaries[binName] = {
      path: binPath,
      ...result
    };
    
    if (!result.success) {
      errors.push(`${binName} 不可用: ${result.error}`);
    }
  }
  
  return {
    ready: errors.length === 0,     // 所有二进制都可用才算 ready
    binaries: binaries,
    errors: errors
  };
}

// ========================================
// 导出模块
// ========================================
// 使用 CommonJS 模块语法（Node.js 默认）
module.exports = {
  getPluginDir,
  getBinPath,
  verifyBinary,
  initBinaries
};
