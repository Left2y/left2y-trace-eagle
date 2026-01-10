/**
 * ========================================
 * 🦅 eagleAdapter.js - Eagle API 适配器
 * ========================================
 * 
 * 🧠 核心知识点：Eagle 插件 API
 * 
 * Eagle 插件运行在 Chromium + Node.js 环境中，
 * 可以直接访问 Eagle 提供的全局 API 对象。
 * 
 * 主要 API：
 * - eagle.item.getSelected() - 获取选中的素材项
 * - eagle.item.addFromPath() - 从本地路径导入文件
 * - item.save() - 保存素材修改
 * 
 * 官方文档：https://developer.eagle.cool/
 */

// ========================================
// 支持的图片格式
// ========================================
const SUPPORTED_FORMATS = ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'tiff'];

// ========================================
// 获取选中的素材项
// ========================================
/**
 * 获取 Eagle 中当前选中的素材项
 * 
 * @returns {Promise<{success: boolean, items?: Array, error?: string}>}
 * 
 * 🗺️ 逻辑思路：
 * 1. 调用 eagle.item.getSelected() 获取选中项
 * 2. 过滤出支持的图片格式
 * 3. 返回格式化的结果
 */
async function getSelectedItems() {
    try {
        // 调用 Eagle API 获取选中项
        // getSelected() 返回一个数组，包含所有选中的 item 对象
        const selectedItems = await eagle.item.getSelected();

        if (!selectedItems || selectedItems.length === 0) {
            return {
                success: true,
                items: [],
                message: '没有选中任何素材'
            };
        }

        // 过滤出支持的图片格式
        const imageItems = selectedItems.filter(item => {
            // item.ext 是文件扩展名（不含点）
            const ext = (item.ext || '').toLowerCase();
            return SUPPORTED_FORMATS.includes(ext);
        });

        // 格式化返回数据（只保留需要的字段）
        const formattedItems = imageItems.map(item => ({
            id: item.id,                    // 素材唯一 ID
            name: item.name,                // 素材名称
            ext: item.ext,                  // 扩展名
            filePath: item.filePath,        // 本地文件路径
            width: item.width,              // 图片宽度
            height: item.height,            // 图片高度
            fileSize: item.size,            // 文件大小（字节）
            tags: item.tags || [],          // 标签
            folderId: item.folderId         // 所在文件夹 ID
        }));

        return {
            success: true,
            items: formattedItems,
            total: selectedItems.length,        // 总选中数
            supported: formattedItems.length,   // 支持转换的数量
            skipped: selectedItems.length - formattedItems.length  // 跳过的数量
        };

    } catch (error) {
        console.error('[eagleAdapter] getSelectedItems 失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ========================================
// 导入 SVG 到 Eagle 资源库
// ========================================
/**
 * 将生成的 SVG 文件导入到 Eagle 资源库
 * 
 * @param {string} svgPath - SVG 文件的本地路径
 * @param {object} options - 导入选项
 * @param {string} options.name - 素材名称
 * @param {string[]} options.tags - 标签数组
 * @param {string} options.folderId - 目标文件夹 ID
 * @param {string} options.annotation - 备注/注释
 * @returns {Promise<{success: boolean, itemId?: string, error?: string}>}
 */
async function addSvgToLibrary(svgPath, options = {}) {
    try {
        // 构建导入选项
        const addOptions = {
            name: options.name || undefined,    // 如果不指定，Eagle 会用文件名
            tags: options.tags || ['vectorized', 'potrace'],  // 默认标签
            folderId: options.folderId || undefined,  // 目标文件夹
            annotation: options.annotation || undefined  // 备注
        };

        console.log('[eagleAdapter] 导入 SVG:', svgPath);
        console.log('[eagleAdapter] 选项:', JSON.stringify(addOptions));

        // 调用 Eagle API 导入文件
        // 注意：API 可能返回 item 对象，也可能直接返回 item.id (字符串)
        const result = await eagle.item.addFromPath(svgPath, addOptions);

        let itemId;
        let itemObj;

        // 兼容处理返回值
        if (typeof result === 'string') {
            itemId = result;
        } else if (result && result.id) {
            itemId = result.id;
            itemObj = result;
        }

        if (itemId) {
            console.log('[eagleAdapter] 导入成功，ID:', itemId);
            return {
                success: true,
                itemId: itemId,
                item: itemObj
            };
        } else {
            return {
                success: false,
                error: '导入返回了无效的结果: ' + JSON.stringify(result)
            };
        }

    } catch (error) {
        console.error('[eagleAdapter] addSvgToLibrary 失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ========================================
// 更新素材元数据
// ========================================
/**
 * 更新素材的标签、备注等元数据
 * 
 * @param {object} item - Eagle item 对象
 * @param {object} updates - 要更新的字段
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function updateItem(item, updates = {}) {
    try {
        // 更新指定字段
        if (updates.tags) {
            item.tags = updates.tags;
        }
        if (updates.annotation) {
            item.annotation = updates.annotation;
        }
        if (updates.name) {
            item.name = updates.name;
        }

        // 保存更改
        // item.save() 会将修改写入 Eagle 数据库
        await item.save();

        console.log('[eagleAdapter] 更新成功:', item.id);
        return { success: true };

    } catch (error) {
        console.error('[eagleAdapter] updateItem 失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// ========================================
// 生成 SVG 文件名
// ========================================
/**
 * 根据原始文件名生成 SVG 文件名
 * 
 * @param {string} originalName - 原始文件名
 * @returns {string} - 新的 SVG 文件名
 */
function generateSvgName(originalName) {
    // 去掉原始扩展名，添加 -vector 后缀
    const baseName = originalName.replace(/\.[^.]+$/, '');
    return `${baseName}-vector`;
}

// ========================================
// 导出模块
// ========================================
module.exports = {
    getSelectedItems,
    addSvgToLibrary,
    updateItem,
    generateSvgName,
    SUPPORTED_FORMATS
};
