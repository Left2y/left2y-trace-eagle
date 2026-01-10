/**
 * 🚦 taskQueue.js - 串行任务队列管理器
 * 用于管理批量转换任务，支持进度反馈和中途取消
 */

class TaskQueue {
    constructor() {
        this.tasks = [];           // 任务列表 (每个任务是一个返回 Promise 的函数)
        this.isRunning = false;    // 是否运行中
        this.currentIndex = 0;     // 当前执行到的索引

        // 回调函数
        this.onProgress = null;    // (current, total, item) => {}
        this.onComplete = null;    // (results) => {}
        this.onStop = null;        // () => {}
    }

    /**
     * 添加任务
     * @param {Function} taskFn - () => Promise<any>
     * @param {Object} metadata - 关联的数据（如 item info），用于回调
     */
    addTask(taskFn, metadata = {}) {
        this.tasks.push({ fn: taskFn, meta: metadata });
    }

    /**
     * 清空队列
     */
    clear() {
        this.tasks = [];
        this.currentIndex = 0;
        this.isRunning = false;
    }

    /**
     * 停止/取消执行
     */
    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            if (this.onStop) this.onStop();
        }
    }

    /**
     * 开始执行队列
     */
    async start() {
        if (this.tasks.length === 0) return;
        if (this.isRunning) return; // 防止重复启动

        this.isRunning = true;
        this.currentIndex = 0;
        const results = {
            success: 0,
            fail: 0,
            errors: []
        };

        // 串行执行循环
        for (let i = 0; i < this.tasks.length; i++) {
            //每次循环开始前检查是否已停止
            if (!this.isRunning) {
                break;
            }

            this.currentIndex = i;
            const task = this.tasks[i];

            // 触发进度回调 (开始前)
            if (this.onProgress) {
                this.onProgress(i + 1, this.tasks.length, task.meta);
            }

            try {
                // 执行任务
                await task.fn();
                results.success++;
            } catch (error) {
                results.fail++;
                results.errors.push({
                    item: task.meta,
                    error: error.message
                });
                console.error(`[Queue] Task failed:`, error);
            }
        }

        this.isRunning = false;

        // 完成回调
        if (this.onComplete) {
            this.onComplete(results);
        }
    }
}

module.exports = TaskQueue;
