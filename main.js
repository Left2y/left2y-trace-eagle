/**
 * ========================================
 * 🚀 main.js - 插件主入口
 * ========================================
 * 
 * 🧠 核心知识点：Eagle 插件生命周期
 * 
 * Eagle 插件有几个关键的生命周期事件：
 * 1. onPluginCreate - 插件窗口创建时触发（初始化）
 * 2. onPluginRun - 用户点击插件图标时触发（可能多次）
 * 3. onPluginShow - 插件窗口显示时触发
 * 4. onPluginHide - 插件窗口隐藏时触发
 */

// 引入模块
const path = require('path');

// 使用绝对路径引入本地模块 (解决 process.cwd() 为 / 的问题)
const { initBinaries } = require(path.join(__dirname, 'src/core/binResolver.js'));
const { getSelectedItems, addSvgToLibrary, generateSvgName } = require(path.join(__dirname, 'src/adapters/eagleAdapter.js'));
const { convertOne } = require(path.join(__dirname, 'src/core/pipeline.js'));
// Milestone 5: 预设 & 设置
const { PRESETS, getPreset } = require(path.join(__dirname, 'src/core/presets.js'));
const { loadSettings, saveSettings } = require(path.join(__dirname, 'src/core/settings.js'));
const { initSettingsPanel } = require(path.join(__dirname, 'src/ui/settingsPanel.js'));
// Milestone 6: 任务队列
const TaskQueue = require(path.join(__dirname, 'src/core/taskQueue.js'));


// ========================================
// DOM 元素引用
// ========================================
let statusIcon;      // 状态图标
let statusText;      // 状态文字
let btnConvert;      // 转换按钮
let btnCancel;       // 取消按钮
let invertCheck;     // 反相复选框
let logContainer;    // 日志容器
let fileListEl;      // 文件列表容器
let progressContainer, progressBar, progressText; // 进度条组件

// ========================================
// 全局状态
// ========================================
let selectedItems = [];    // 当前选中的素材项
let isConverting = false;  // 是否正在转换中
let appSettings = {};      // 应用设置
const taskQueue = new TaskQueue(); // 任务队列


// ========================================
// 工具函数：添加日志
// ========================================
function addLog(message, type = 'info') {
    const entry = document.createElement('p');
    entry.className = `log-entry ${type}`;
    entry.textContent = message;
    logContainer.appendChild(entry);
    logContainer.scrollTop = logContainer.scrollHeight;
}

// ========================================
// 更新状态显示
// ========================================
function updateStatus(icon, text) {
    statusIcon.textContent = icon;
    statusText.textContent = text;
}

// ========================================
// 更新文件列表显示
// ========================================
function updateFileList(items) {
    if (!items || items.length === 0) {
        fileListEl.innerHTML = `
      <div class="placeholder">
        <p>没有选中可转换的图片</p>
        <p style="font-size: 12px; margin-top: 8px;">支持格式: .png, .jpg, .bmp</p>
      </div>
    `;
        btnConvert.disabled = true;
        return;
    }

    // 构建文件列表 HTML
    let html = '';
    for (const item of items) {
        // Eagle 选中项提供 thumbnail 路径或 filePath 原图路径
        // Windows 路径分隔符转义可能需要处理，但在 Electron 环境通常直接用 file:// 协议或绝对路径
        const thumbSrc = item.thumbnail || item.filePath;
        const sizeKB = item.fileSize ? Math.round(item.fileSize / 1024) : '?';

        html += `
      <div class="file-item" id="item-${item.id}">
        <img class="file-thumbnail" src="${thumbSrc}" alt="thumb">
        <div class="file-info">
          <span class="file-name" title="${item.name}.${item.ext}">${item.name}.${item.ext}</span>
          <span class="file-meta">${item.width}×${item.height} | ${sizeKB}KB</span>
        </div>
        <div class="file-status">
          <span class="status-pending">等待</span>
        </div>
      </div>
    `;
    }

    fileListEl.innerHTML = html;
    btnConvert.disabled = false;
}

// ========================================
// 更新单个文件项状态
// ========================================
function updateItemStatus(itemId, status, message) {
    const itemEl = document.getElementById(`item-${itemId}`);
    if (!itemEl) return;

    const statusEl = itemEl.querySelector('.file-status');
    if (!statusEl) return;

    let className = 'status-pending';
    let icon = '';
    let statusText = message;

    switch (status) {
        case 'converting':
            className = 'status-converting';
            icon = '🔄';
            break;
        case 'success':
            className = 'status-success';
            icon = '✅';
            statusText = '已完成';
            break;
        case 'error':
            className = 'status-error';
            icon = '❌';
            break;
    }

    statusEl.innerHTML = `<span class="${className}" title="${message || ''}">${icon} ${statusText}</span>`;
}

// ========================================
// 刷新选中的文件列表
// ========================================
async function refreshSelectedItems() {
    addLog('正在获取选中的素材...');

    const result = await getSelectedItems();

    if (!result.success) {
        addLog(`获取选中项失败: ${result.error}`, 'error');
        updateStatus('❌', '获取失败');
        return;
    }

    selectedItems = result.items;

    if (selectedItems.length === 0) {
        addLog('没有选中可转换的图片', 'warning');
        updateStatus('⏳', '等待选择');
    } else {
        // addLog(`找到 ${selectedItems.length} 张可转换的图片`, 'success');
        if (result.skipped > 0) {
            addLog(`跳过 ${result.skipped} 个不支持的文件`, 'warning');
        }
        updateStatus('✅', `已选 ${selectedItems.length} 张`);
    }

    updateFileList(selectedItems);
}

// ========================================
// 执行转换
// ========================================
async function doConvert() {
    if (isConverting) return;
    if (selectedItems.length === 0) {
        addLog('请先选择要转换的图片', 'warning');
        return;
    }

    // 1. UI 状态切换
    isConverting = true;
    btnConvert.disabled = true;
    btnConvert.classList.add('hidden');
    btnCancel.classList.remove('hidden');

    progressContainer.classList.remove('hidden');
    progressBar.value = 0;
    progressBar.max = selectedItems.length;
    progressText.textContent = `0/${selectedItems.length}`;

    updateStatus('🔄', '转换中...');

    // 2. 准备队列
    taskQueue.clear();

    // 获取当前参数
    const currentPreset = getPreset(appSettings.currentPresetId);
    const convertParams = { ...currentPreset.params };

    // 3. 添加任务
    for (const item of selectedItems) {
        taskQueue.addTask(async () => {
            // 更新该 Item 状态
            updateItemStatus(item.id, 'converting', '转换中...');
            addLog(`正在转换: ${item.name}.${item.ext}`);

            // 执行转换
            const convertResult = await convertOne(item.filePath, {
                potrace: convertParams,
                keepTemp: false
            });

            if (!convertResult.success) {
                throw new Error(convertResult.error);
            }

            // 导入到 Eagle
            updateItemStatus(item.id, 'converting', '导入中...');
            const svgName = generateSvgName(item.name);

            const importResult = await addSvgToLibrary(convertResult.outputPath, {
                name: svgName,
                tags: ['vectorized', 'potrace'],
                folderId: item.folderId,
                annotation: `由 ${item.name}.${item.ext} 转换生成`
            });

            if (!importResult.success) {
                throw new Error(importResult.error);
            }

            // 成功
            updateItemStatus(item.id, 'success', '已完成');
            // addLog(`✓ ${svgName}.svg`, 'success');

        }, item);
    }

    // 4. 绑定回调
    taskQueue.onProgress = (current, total, item) => {
        progressBar.value = current;
        // progressText.textContent = `${Math.round((current / total) * 100)}%`;
        progressText.textContent = `${current}/${total}`;
    };

    taskQueue.onComplete = (results) => {
        isConverting = false;
        resetUIState();

        if (results.fail === 0) {
            updateStatus('🎉', '全部完成');
            addLog(`全部完成！成功 ${results.success} 张`, 'success');
        } else {
            updateStatus('⚠️', '部分完成');
            addLog(`完成！成功 ${results.success} 张，失败 ${results.fail} 张`, 'warning');
        }
    };

    taskQueue.onStop = () => {
        isConverting = false;
        resetUIState();
        addLog('操作已取消', 'warning');
        updateStatus('⛔', '已取消');
    };

    // 5. 开始执行
    await taskQueue.start();
}

function resetUIState() {
    btnConvert.disabled = false;
    btnConvert.classList.remove('hidden');
    btnCancel.classList.add('hidden');
    btnConvert.textContent = '开始转换';
    // 保持进度条显示，用户知道刚才发生了什么
}

// ========================================
// 初始化插件
// ========================================
async function initPlugin() {
    addLog('正在初始化插件...');
    console.log('[main] 预设模块已加载:', PRESETS);

    // 加载用户设置
    appSettings = loadSettings();
    console.log('[main] 用户设置已加载:', appSettings);

    // 验证二进制文件
    // addLog('检查 potrace 二进制文件...');
    const binResult = initBinaries();

    if (binResult.ready) {
        updateStatus('✅', '就绪');
        // addLog('✓ potrace 可用', 'success');
        addLog('初始化完成！请在 Eagle 中选择图片', 'success');

        // 尝试获取当前选中的文件
        // await refreshSelectedItems(); // 延迟到 onPluginRun/Show 执行，避免 "This method can only be used after..." 错误

    } else {
        updateStatus('❌', '初始化失败');
        for (const error of binResult.errors) {
            addLog(error, 'error');
        }
        addLog('请确保 bin 目录中有正确的可执行文件', 'warning');
    }
}

// ========================================
// 初始化 DOM 元素
// ========================================
function initDOMElements() {
    console.log('[left2y-trace] 初始化 DOM 元素');
    statusIcon = document.querySelector('.status-icon');
    statusText = document.getElementById('status-text');
    btnConvert = document.getElementById('btn-convert');
    logContainer = document.getElementById('log');
    fileListEl = document.getElementById('file-list');

    // Milestone 6: 新增 UI 元素
    btnCancel = document.getElementById('btn-cancel');
    progressContainer = document.getElementById('progress-container');
    progressBar = document.getElementById('progress-bar');
    progressText = document.getElementById('progress-text');

    // 绑定按钮点击事件
    if (btnConvert) {
        btnConvert.addEventListener('click', doConvert);
    }

    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            // addLog('用户请求取消...', 'warning');
            taskQueue.stop();
        });
    }

    // 初始化设置面板
    initSettingsPanel();

    // 初始化预设选择器
    const presetSelect = document.getElementById('preset-select');
    if (presetSelect) {
        // 清空选项
        presetSelect.innerHTML = '';

        // 填充选项
        Object.values(PRESETS).forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = preset.label;
            presetSelect.appendChild(option);
        });

        // 恢复上次选择
        if (appSettings && appSettings.currentPresetId) {
            presetSelect.value = appSettings.currentPresetId;
        }

        // 监听变更
        presetSelect.addEventListener('change', (e) => {
            appSettings.currentPresetId = e.target.value;
            saveSettings(appSettings);
            // addLog(`已切换到模式: ${PRESETS[e.target.value].label}`);
        });
    }

    // 初始化反相复选框
    invertCheck = document.getElementById('invert-check');
    if (invertCheck) {
        // 恢复状态
        if (appSettings && typeof appSettings.invert === 'boolean') {
            invertCheck.checked = appSettings.invert;
        }

        // 监听变更
        invertCheck.addEventListener('change', (e) => {
            appSettings.invert = e.target.checked;
            saveSettings(appSettings);
        });
    }
}

// ========================================
// 初始化锁：确保 DOM 加载完成后再执行 Eagle 事件
// ========================================
const domReadyPromise = new Promise(resolve => {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initDOMElements(); // 确保 resolve 前先初始化变量
            resolve();
        });
    } else {
        initDOMElements();
        resolve();
    }
});

// ========================================
// Eagle 生命周期事件
// ========================================
let isPluginReady = false; // 插件是否初始化完成

eagle.onPluginCreate(async () => {
    await domReadyPromise;
    console.log('[left2y-trace] 插件创建 (onPluginCreate)');
    // 初始化插件（二进制检查等）
    await initPlugin();
    isPluginReady = true;  // 标记初始化完成
});

eagle.onPluginRun(async () => {
    await domReadyPromise;
    console.log('[left2y-trace] 插件运行 (onPluginRun)');

    // 只有当插件初始化完成后才允许刷新
    if (isPluginReady && !isConverting) {
        await refreshSelectedItems();
    } else {
        console.log('[left2y-trace] 插件未就绪或正在转换，跳过刷新');
    }
});

eagle.onPluginShow(async () => {
    await domReadyPromise;
    console.log('[left2y-trace] 插件显示 (onPluginShow)');

    // 同上
    if (isPluginReady && !isConverting) {
        await refreshSelectedItems();
    }
});

// ========================================
// 页面加载完成后执行
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('[left2y-trace] DOM 加载完成');

    // 清空初始日志
    if (logContainer) logContainer.innerHTML = '';
});

// 注意：不要在这里直接调用 initPlugin()
console.log('[left2y-trace] 等待插件创建事件...');
