const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 配置
const PLUGIN_NAME = 'Raster_to_Vector';
const VERSION = require('../manifest.json').version;
const DIST_DIR = path.join(__dirname, '../dist');

// 确保 dist 目录存在
if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR);
}

// 需要忽略的文件 (不仅是 gitignore，还要剔除其他平台的 bin)
const COMMON_IGNORE = [
    '.git',
    '.DS_Store',
    'node_modules',
    'tmp',
    'dist',
    'scripts',
    'release_notes.md',
    '.gitignore',
    'README.md',
    'LICENSE',
    'Raster to Vector.eagleplugin' // 避免把已有包嵌入包体
];

/**
 * 此时我们手动打包 zip 比较麻烦 (Eagle 插件其实就是一个 zip，把后缀改成 .eagleplugin)
 * 但为了简单，我们还是让用户用 Eagle 客户端打包比较好？
 * 不，用户要求我们发布 release。所以我们需要自己打包。
 * 
 * 方案：
 * 1. 创建临时构建目录 build_tmp/mac 和 build_tmp/win
 * 2. 复制文件进去
 * 3. 压缩为 zip
 * 4. 重命名为 .eagleplugin
 */

async function build() {
    console.log('📦 开始构建...');
    await buildPlatform('mac', 'darwin-arm64');
    await buildPlatform('win', 'win32-x64');
    console.log('🎉 构建完成！查看 dist 目录。');
}


async function buildPlatform(platformAlias, binDirName) {
    console.log(`\n🔨 构建 [${platformAlias}] 版本...`);
    const buildDir = path.join(DIST_DIR, `build_${platformAlias}`);

    // 1. 清理并创建构建目录
    if (fs.existsSync(buildDir)) {
        fs.rmSync(buildDir, { recursive: true, force: true });
    }
    fs.mkdirSync(buildDir);

    // 2. 复制文件
    copyRecursive(path.join(__dirname, '..'), buildDir, (src) => {
        const basename = path.basename(src);
        if (COMMON_IGNORE.includes(basename)) return false;

        // 特殊处理 bin 目录
        if (src.includes('/bin/')) {
            // 只保留对应平台的 bin
            if (src.includes(binDirName)) return true; // 保留目标平台
            if (basename === 'bin') return true;      // 保留 bin 根目录
            return false;                             // 剔除其他平台
        }

        return true;
    });

    // 3. 压缩 (使用 zip 命令，假设环境有)
    const zipName = `${PLUGIN_NAME}_${platformAlias}_v${VERSION}.eagleplugin`;
    const zipPath = path.join(DIST_DIR, zipName);

    try {
        // 进入构建目录打包所有内容
        execSync(`cd "${buildDir}" && zip -r -9 "${zipPath}" ./*`);
        console.log(`✅ 生成: ${zipName}`);
    } catch (e) {
        console.error(`❌ 打包失败: ${e.message}`);
    }

    // 清理临时目录
    fs.rmSync(buildDir, { recursive: true, force: true });
}

function copyRecursive(src, dest, filter) {
    if (filter && !filter(src)) return;

    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);
        fs.readdirSync(src).forEach(child => {
            copyRecursive(path.join(src, child), path.join(dest, child), filter);
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

build();
