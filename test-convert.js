/**
 * ========================================
 * 🧪 test-convert.js - 转换测试脚本
 * ========================================
 * 
 * 这是一个独立的测试脚本，用于验证转换流程是否正常工作。
 * 不依赖 Eagle 环境，可以直接用 Node.js 运行。
 * 
 * 使用方法：
 * node test-convert.js <图片路径>
 * 
 * 例如：
 * node test-convert.js tmp/test-input.png
 */

const path = require('path');
const pipeline = require('./src/core/pipeline');
const { initBinaries } = require('./src/core/binResolver');

// ========================================
// 主函数
// ========================================
async function main() {
    console.log('========================================');
    console.log('🧪 转换测试脚本');
    console.log('========================================\n');

    // 获取命令行参数
    const args = process.argv.slice(2);

    // 如果没有提供参数，使用默认测试图片
    let inputPath;
    if (args.length > 0) {
        inputPath = path.resolve(args[0]);
    } else {
        // 默认测试图片路径
        inputPath = path.resolve(__dirname, 'tmp/test-input.png');
    }

    console.log('📂 输入文件:', inputPath);
    console.log('');

    // 检查二进制文件
    console.log('🔍 检查二进制文件...');
    const binResult = initBinaries();

    if (!binResult.ready) {
        console.error('❌ 二进制文件不可用:');
        binResult.errors.forEach(e => console.error('  -', e));
        process.exit(1);
    }

    console.log('✅ 二进制文件就绪');
    for (const [name, info] of Object.entries(binResult.binaries)) {
        console.log(`   ${name}: ${info.version}`);
    }
    console.log('');

    // 检查输入文件是否存在
    const fs = require('fs');
    if (!fs.existsSync(inputPath)) {
        console.error('❌ 输入文件不存在:', inputPath);
        process.exit(1);
    }

    // 执行转换
    console.log('🔄 开始转换...\n');

    const result = await pipeline.convertOne(inputPath, {
        mkbitmap: {
            scale: 2,
            threshold: 0.45,
            filter: 4
        },
        potrace: {
            alphamax: 1.0,
            opttolerance: 0.2,
            turdsize: 2,
            tight: true
        },
        keepTemp: true  // 保留临时文件，方便查看
    });

    console.log('\n========================================');

    if (result.success) {
        console.log('✅ 转换成功！');
        console.log('========================================');
        console.log('📄 输出文件:', result.outputPath);
        console.log('📁 临时目录:', result.tempDir);
        console.log('⏱️  耗时:', result.stats.duration, 'ms');
        console.log('📊 输出大小:', result.stats.outputSize, 'bytes');
        console.log('');
        console.log('💡 提示: 可以用浏览器打开 SVG 文件查看效果');
    } else {
        console.log('❌ 转换失败！');
        console.log('========================================');
        console.log('错误:', result.error);
        console.log('临时目录:', result.tempDir);
        console.log('');
        console.log('💡 提示: 查看临时目录中的文件进行调试');
    }
}

// 运行主函数
main().catch(console.error);
