# Eagle Raster to Vector (Left2y-tracer)

![Icon](assets/icon.png)

当前版本：**v1.5**（精简发布版 | 现场调参 + 轻量包体）

一个将位图 (PNG, JPG, BMP) 转换为矢量 SVG 的 **Eagle** 插件。v1.4 版本引入了专业的实时预览与参数调节功能，配合智能超采样技术，让转换质量质的飞跃。

## ✨ 核心功能 (v1.4)

### 🎛 现场调参 (Live Tuning)
告别盲猜参数！现在你可以像修图一样实时调节矢量化细节：
- **实时预览**：拖动滑块，<100ms 内即时看到矢量结果。
- **对比视图**：支持 **Split (分割对比)**、**Original (原图)**、**Vector (矢量)** 三种视图，细节差异一目了然。
- **缩放平移**：支持鼠标滚轮/触控板无级缩放与拖拽平移，像素级检查边缘质量。

### 🚀 智能画质增强
- **智能超采样 (Smart Upscaling)**：自动将低清图标放大并进行双三次插值平滑，消除锯齿，让 Potrace 追踪出更圆润的线条。
- **自动归一化 (Auto-Normalization)**：无论原图是“黑字透明底”还是“扫描件”，自动标准化为“白底黑墨水”输入，彻底解决黑底/隐形问题。

### 🔧 可调参数
- **平滑度 (Smoothness)**: 忽略噪点，让曲线更圆润。
- **拐角阈值 (Corner)**: 决定是保留尖锐棱角还是将其磨圆。
- **黑度阈值 (Threshold)**: 微调黑白识别的分界线。

### ⚡️ 极简转换链
- **Pure JavaScript**: 移除对系统命令 (sips/ImageMagick) 的依赖，全部图像处理在 Canvas 中完成，跨平台（macOS/Windows）表现一致且更稳定。

## 📦 安装方法

1.  访问 [GitHub Releases](https://github.com/Left2y/left2y-trace-eagle/releases) 页面。
2.  下载最新版本的 `.eagleplugin` 文件。
3.  双击运行该文件，或将其拖入 Eagle 窗口即可自动安装。

## 🖥 使用指南

1.  在 Eagle 中选中一张图片（支持 PNG/JPG/BMP）。
2.  点击插件图标打开面板。
3.  **调节参数**：拖动右侧滑块，观察中间的预览变化。
4.  **检查细节**：使用滚轮放大，拖拽移动画布检查边缘。
5.  **保存**：
    - 点击 **"保存当前 (Save)"**：将当前满意的结果保存到 Eagle（自动与原图保存在同一文件夹）。
    - (WIP) 点击 **"批量应用"**：将当前参数应用到所有选中图片。

## 🛠 开发构建

本插件基于 Eagle Plugin API 开发，使用 Node.js / Electron 技术栈。

### 目录结构

```
.
├── assets/          # 静态资源
├── bin/             # potrace 二进制 (Darwin/Win32)
├── src/
│   ├── adapters/    # Eagle API 适配
│   ├── core/        # 核心逻辑 (ImageConverter + Potrace)
│   └── ui/          # 界面逻辑 (Styles + HTML)
├── index.html       # 主界面 layout
├── main.js          # 主控制器 (State + Event Loop)
└── manifest.json    # 插件清单
```

### 依赖说明

- **potrace**: 自带 macOS arm64 与 Windows x64 二进制 (GPLv2)，纯本地运行。
- **Canvas API**: 使用浏览器原生 Canvas 进行图像预处理（缩放、二值化）。

## 📝 版本记录

- **v1.4**: **现场调参版**。重构核心管线，分离预处理与追踪；新增对比预览、缩放平移、智能超采样；移除外部图像工具依赖。
- **v1.3**: 修复透明背景变黑问题；优化 Windows 兼容性。
- **v1.2**: 内置 Windows x64 支持。
- **v1.0**: 初始版本。

## 📄 License

MIT License
