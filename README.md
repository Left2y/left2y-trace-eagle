# Eagle Raster to Vector (Left2y-tracer)

![Icon](assets/icon.png)

当前版本：**v1.2**（内置 macOS arm64 & Windows x64 二进制，自动按平台选择，免安装依赖；mac 用 sips，Windows 内置 PowerShell/.NET 转 BMP）

一个将位图 (PNG, JPG, BMP) 转换为矢量 SVG 的 **Eagle** 插件。特别适合将 Logo、手绘草图、扫描件快速矢量化。

## ✨ 功能特点

- **极速转换**：基于 `potrace` 算法，毫秒级转换速度。
- **批量处理**：支持多选图片批量转换，带进度条和取消功能。
- **智能预设**：
  - `Logo / 图标`：自动平滑曲线，去噪，适合清晰图形。
  - `手绘 / 扫描稿`：保留更多笔触细节，还原手绘质感。
- **反相模式**：支持“白底黑字”与“黑底白字”的一键切换。
- **无缝集成**：转换后的 SVG 自动导入到 Eagle 当前文件夹，保留原图信息。
- **本地运行**：无需上传服务器，所有处理均在本地完成，隐私安全。

> v1.2 起：
> - 内置 macOS arm64 与 Windows x64 的 `potrace`/`mkbitmap`，自动按平台选择。
> - macOS 继续用系统 sips 转 BMP；Windows 使用内置 PowerShell/.NET 进行 PNG/JPG→BMP 转换，无需额外安装。

## 📦 安装方法

1.  访问 [GitHub Releases](https://github.com/Left2y/left2y-trace-eagle/releases) 页面。
2.  下载对应平台的 `Raster_to_Vector_mac_v*.eagleplugin` 或 `Raster_to_Vector_win_v*.eagleplugin`。
3.  双击运行该文件，或将其拖入 Eagle 窗口即可自动安装。

> 如果你想手动安装源代码：
> 1. 下载本仓库源码。
> 2. 打开 Eagle "插件中心" > "开发者选项"。
> 3. 点击 "加载未打包的插件..." 并选择源码目录。

## 🖥 使用指南

1.  在 Eagle 中选中一张或多张图片（支持 PNG/JPG）。
2.  点击插件图标打开面板。
3.  在下拉框选择模式（Logo 或 手绘）。
4.  如果是白底黑字的图片，请取消勾选“反相”（默认不勾选提取黑色）。
5.  点击 **"开始转换"**。
6.  稍等片刻，生成的 SVG 会自动出现在原图旁边。

## 🛠 开发构建

本插件基于 Eagle Plugin API 开发，使用 Node.js / Electron 技术栈。

### 目录结构

```
.
├── assets/          # 静态资源 (图标)
├── bin/             # 二进制可执行文件 (potrace/mkbitmap)
│   ├── darwin-arm64/
│   └── win32-x64/
├── src/
│   ├── adapters/    # Eagle API 与文件系统适配器
│   ├── core/        # 核心逻辑 (pipeline, potrace 封装)
│   └── ui/          # 界面逻辑 (设置面板)
├── index.html       # 主界面
├── main.js          # 插件入口与主控逻辑
└── manifest.json    # 插件清单
```

### 依赖说明

- **potrace/mkbitmap**: 自带 macOS arm64 与 Windows x64 版本 (GPLv2)，无外部 dylib/DLL 依赖。
- **sips**: macOS 内置图像处理工具（用于格式转换）。
- **Windows BMP 转换**: 内置 PowerShell/.NET 脚本，无需额外安装。

## 📝 版本记录

- **v1.2**: 内置 Windows x64 `potrace`/`mkbitmap`，BMP 转换自动区分 mac sips 与 Windows PowerShell/.NET；manifest 支持 mac+win。
- **v1.1**: 内置静态编译的 macOS `potrace`，解决 Homebrew dylib 依赖。
- **v1.0**: 初始公开版本。

## 📄 License

MIT License
