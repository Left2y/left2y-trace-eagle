/**
 * 🎛️ settingsPanel.js - 设置面板 UI 逻辑
 */

/**
 * 绑定设置面板相关的 UI 事件
 */
function initSettingsPanel() {
    const modal = document.getElementById('settings-modal');
    const btnOpen = document.getElementById('btn-settings');
    const btnClose = document.getElementById('btn-close-settings');

    // 打开面板
    btnOpen.addEventListener('click', () => {
        modal.classList.remove('hidden');
    });

    // 关闭面板
    btnClose.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // 点击蒙层关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

module.exports = { initSettingsPanel };
