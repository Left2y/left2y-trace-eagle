/**
 * ========================================
 * 🚀 main.js - v1.4 Controller (Live Preview)
 * ========================================
 */

const fs = require('fs');
const path = require('path');
// Use path.join to ensure correct resolution relative to the plugin root
const pipeline = require(path.join(__dirname, 'src/core/pipeline'));
const eagleAdapter = require(path.join(__dirname, 'src/adapters/eagleAdapter'));

// ========================================
// 1. State Management (应用状态)
// ========================================
const appState = {
    selectedFiles: [],      // 从 Eagle 获取的文件列表
    currentFileId: null,    // 当前选中的文件 ID

    // 缓存 (核心优化)
    pgmCache: new Map(),    // Map<filePath, { pgmPath, tempDir, stats }>

    // 当前参数
    params: {
        opttolerance: 0.4,
        alphamax: 1.0,
        blacklevel: 0.5,
        invert: false
    },

    viewMode: 'split', // split, vector, original
    isProcessing: false
};

// DOM Elements Cache
const UI = {};

// ========================================
// 2. Initialization
// ========================================
document.addEventListener('DOMContentLoaded', () => {
    initDOMElements();
    initEventListeners();
    // initPlugin will be called by eagle.onPluginCreate
});

// Fix: Wait for Eagle Plugin API to be ready
if (typeof eagle !== 'undefined') {
    eagle.onPluginCreate((plugin) => {
        console.log('[main] eagle.onPluginCreate triggered');
        initPlugin();
    });
} else {
    console.error('[main] Eagle API not found. Are you running inside Eagle?');
}

function initDOMElements() {
    // Sidebar Left
    UI.fileList = document.getElementById('file-list');
    UI.fileCount = document.getElementById('file-count');
    UI.btnRefresh = document.getElementById('btn-refresh');

    // Sidebar Right (Controls)
    UI.paramSmooth = document.getElementById('param-smooth');
    UI.paramCorner = document.getElementById('param-corner');
    UI.paramBlack = document.getElementById('param-black');
    UI.checkInvert = document.getElementById('check-invert');

    UI.valSmooth = document.getElementById('val-smooth');
    UI.valCorner = document.getElementById('val-corner');
    UI.valBlack = document.getElementById('val-black');

    UI.btnSave = document.getElementById('btn-process-single');
    UI.btnBatch = document.getElementById('btn-process-all');
    UI.loadingSpinner = document.getElementById('preview-loading');
    UI.logContainer = document.getElementById('log-container');

    // Preview
    UI.imgOriginal = document.getElementById('img-original');
    UI.svgContainer = document.getElementById('svg-container');
    UI.previewContainer = document.getElementById('preview-container');
    UI.viewToggles = document.querySelectorAll('.toggle-btn');
}

function initEventListeners() {
    // 列表刷新
    UI.btnRefresh.addEventListener('click', refreshSelectedItems);

    // 参数调节 (Debounced)
    const updateHandler = debounce(() => updatePreview(), 150);

    UI.paramSmooth.addEventListener('input', (e) => {
        appState.params.opttolerance = parseFloat(e.target.value);
        UI.valSmooth.textContent = appState.params.opttolerance;
        updateHandler();
    });

    UI.paramCorner.addEventListener('input', (e) => {
        appState.params.alphamax = parseFloat(e.target.value);
        UI.valCorner.textContent = appState.params.alphamax;
        updateHandler();
    });

    UI.paramBlack.addEventListener('input', (e) => {
        appState.params.blacklevel = parseFloat(e.target.value);
        UI.valBlack.textContent = appState.params.blacklevel;
        updateHandler();
    });

    UI.checkInvert.addEventListener('change', (e) => {
        appState.params.invert = e.target.checked;
        updateHandler(); // Invert usually needs re-tracing or re-encoding? 
        // Note: In our pipeline, 'invert' is a Potrace param (-i). So just re-trace PGM.
    });

    // 视图切换
    UI.viewToggles.forEach(btn => {
        btn.addEventListener('click', () => {
            UI.viewToggles.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const mode = btn.dataset.view;
            appState.viewMode = mode;

            // Toggle classes on container
            UI.previewContainer.className = 'preview-container'; // reset
            if (mode === 'split') UI.previewContainer.classList.add('split-mode');

            // Toggle visibility
            const layerOriginal = UI.previewContainer.querySelector('.original');
            const layerVector = UI.previewContainer.querySelector('.vector');

            if (mode === 'original') {
                layerOriginal.style.display = 'flex';
                layerVector.style.display = 'none';
            } else if (mode === 'vector') {
                layerOriginal.style.display = 'none';
                layerVector.style.display = 'flex';
            } else { // split
                layerOriginal.style.display = 'flex';
                layerVector.style.display = 'flex';
            }
        });
    });

    // Zoom Controls
    UI.btnZoomOut = document.querySelector('.zoom-controls button:first-child');
    UI.btnZoomIn = document.querySelector('.zoom-controls button:last-child');
    UI.zoomLabel = document.querySelector('.zoom-level');

    // 保存按钮
    UI.btnSave.addEventListener('click', saveCurrentFile);

    // 初始化 Zoom/Pan
    initZoomPanControls();
}

function initZoomPanControls() {
    // State for Transform
    let transform = { x: 0, y: 0, scale: 1 };
    let isDragging = false;
    let startX, startY;

    const updateTransformUI = () => {
        const style = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;

        // Apply to both images inside the layers
        const targets = [
            UI.previewContainer.querySelector('.original img'),
            UI.svgContainer
            // Note: svgContainer contains the svg, usually better to transform the container or the svg itself?
            // CSS selector .preview-layer svg matches the SVG inside.
            // Let's target the immediate child of vector layer which is #svg-container
        ];

        targets.forEach(el => {
            if (el) el.style.transform = style;
        });

        // Also target the SVG element itself if it exists inside container
        const svgEl = UI.svgContainer.querySelector('svg');
        if (svgEl) svgEl.style.transform = style;

        UI.zoomLabel.textContent = `${Math.round(transform.scale * 100)}%`;
    };

    // 1. Wheel Zoom (Mouse & Trackpad)
    UI.previewContainer.addEventListener('wheel', (e) => {
        e.preventDefault();

        // Check if it's a pinch (ctrlKey) or just wheel
        // For convenience, we map standard wheel to zoom as requested
        const delta = -e.deltaY * 0.001;
        const newScale = Math.min(Math.max(0.1, transform.scale + delta), 10);

        transform.scale = newScale;
        updateTransformUI();
    }, { passive: false });

    // 2. Drag Pan
    UI.previewContainer.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - transform.x;
        startY = e.clientY - transform.y;
        UI.previewContainer.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        transform.x = e.clientX - startX;
        transform.y = e.clientY - startY;
        updateTransformUI();
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
        UI.previewContainer.style.cursor = 'default';
        // Restore 'grab' for layers via CSS, but container overrides
        // Actually best to remove inline style
        UI.previewContainer.style.cursor = '';
    });

    // 3. Buttons
    UI.btnZoomIn.addEventListener('click', () => {
        transform.scale = Math.min(transform.scale + 0.2, 10);
        updateTransformUI();
    });

    UI.btnZoomOut.addEventListener('click', () => {
        transform.scale = Math.max(transform.scale - 0.2, 0.1);
        updateTransformUI();
    });
}

async function initPlugin() {
    addLog('⚡️ v1.4 Loaded. Ready.');
    await refreshSelectedItems();
}

// ========================================
// 3. Core Logic: File Selection & Preprocessing
// ========================================
async function refreshSelectedItems() {
    try {
        const result = await eagleAdapter.getSelectedItems();
        if (!result.success || !result.items) {
            UI.fileList.innerHTML = '<div class="empty-state">获取文件失败</div>';
            return;
        }

        appState.selectedFiles = result.items.filter(item => {
            const ext = path.extname(item.filePath).toLowerCase();
            return ['.png', '.jpg', '.jpeg', '.bmp', '.tif'].includes(ext);
        });

        UI.fileCount.textContent = appState.selectedFiles.length;
        renderFileList();

        if (appState.selectedFiles.length > 0) {
            selectFile(appState.selectedFiles[0]);
        }
    } catch (err) {
        addLog(`❌ 获取文件失败: ${err.message}`);
    }
}

function renderFileList() {
    UI.fileList.innerHTML = '';

    if (appState.selectedFiles.length === 0) {
        UI.fileList.innerHTML = '<div class="empty-state">请在 Eagle 中选择图片</div>';
        return;
    }

    appState.selectedFiles.forEach(file => {
        const el = document.createElement('div');
        el.className = 'file-item';
        // el.classList.toggle('active', file.id === appState.currentFileId);
        el.dataset.id = file.id;
        el.innerHTML = `
            <span class="file-name">${path.basename(file.filePath)}</span>
        `;
        el.addEventListener('click', () => selectFile(file));
        UI.fileList.appendChild(el);
    });
}

/**
 * 选中文件 -> 触发 Stage A (Preprocess)
 */
async function selectFile(file) {
    appState.currentFileId = file.id;

    // Update UI highlight
    document.querySelectorAll('.file-item').forEach(el => {
        el.classList.toggle('active', el.dataset.id === file.id);
    });

    // Load Original Image for Preview
    UI.imgOriginal.src = `file://${file.filePath}`;
    UI.btnSave.disabled = true; // Disable save until trace is done

    addLog(`📂 选中: ${path.basename(file.filePath)}`);

    // Check Cache
    if (appState.pgmCache.has(file.filePath)) {
        addLog(`⚡️ 使用缓存 PGM`);
        updatePreview();
        return;
    }

    // Run Preprocess (Stage A)
    setLoading(true);
    try {
        addLog(`Processing Image (Resizing & Normalizing)...`);
        const result = await pipeline.preprocessImage(file.filePath);

        // Cache result
        appState.pgmCache.set(file.filePath, result);

        // Immediately run Trace (Stage B)
        updatePreview();

    } catch (err) {
        addLog(`❌ 预处理失败: ${err.message}`);
        setLoading(false);
    }
}

// ========================================
// 4. Core Logic: Tracing (Preview)
// ========================================
/**
 * 触发 Stage B (Trace)
 */
async function updatePreview() {
    const file = appState.selectedFiles.find(f => f.id === appState.currentFileId);
    if (!file) return;

    const cache = appState.pgmCache.get(file.filePath);
    if (!cache) return; // Should not happen if selectFile works

    setLoading(true);

    try {
        // Run Trace (Fast)
        // 注意：我们这里不传入 outputPath，让它返回 SVG 内容字符串
        const traceResult = await pipeline.tracePgm(cache.pgmPath, appState.params, null);

        if (traceResult.success) {
            appState.currentSvgContent = traceResult.svgContent;
            UI.svgContainer.innerHTML = traceResult.svgContent;

            // Adjust SVG size to fit container
            const svgEl = UI.svgContainer.querySelector('svg');
            if (svgEl) {
                svgEl.style.width = '100%';
                svgEl.style.height = '100%';
            }
            UI.btnSave.disabled = false;
        }
    } catch (err) {
        addLog(`❌ 预览失败: ${err.message}`);
    } finally {
        setLoading(false);
    }
}

// ========================================
// 5. Saving (Commit)
// ========================================
async function saveCurrentFile() {
    const file = appState.selectedFiles.find(f => f.id === appState.currentFileId);
    if (!file) return;

    setLoading(true);
    addLog(`💾 保存中...`);

    try {
        const cache = appState.pgmCache.get(file.filePath);
        const svgContent = appState.currentSvgContent;

        // Write to temp file for Import
        const tempSvgPath = cache.pgmPath.replace('.pgm', '_final.svg');
        fs.writeFileSync(tempSvgPath, svgContent);

        // Import to Eagle
        // Fix: Use correct method name and pass folderId
        await eagleAdapter.addSvgToLibrary(tempSvgPath, {
            name: path.basename(file.filePath, path.extname(file.filePath)) + '_vector',
            website: '',
            tags: ['vectorized'],
            folderId: file.folderId
        });

        addLog(`✅ 已保存到 Eagle!`);

    } catch (err) {
        addLog(`❌ 保存失败: ${err.message}`);
    } finally {
        setLoading(false);
    }
}

// ========================================
// Utilities
// ========================================
function setLoading(loading) {
    if (loading) {
        UI.loadingSpinner.classList.remove('hidden');
    } else {
        UI.loadingSpinner.classList.add('hidden');
    }
}

function addLog(msg) {
    const p = document.createElement('p');
    const time = new Date().toLocaleTimeString();
    p.textContent = `[${time}] ${msg}`;
    UI.logContainer.prepend(p);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
