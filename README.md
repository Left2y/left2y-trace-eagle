# Eagle Raster to Vector (Left2y-tracer)

![Icon](assets/icon.png)

当前版本：**v1.3**（内置 macOS arm64 & Windows x64 二进制，自动按平台选择；mac 用 sips，Windows 自带便携版 ImageMagick 转 BMP，无需额外安装）

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

> v1.3 起：
> - Windows 内置便携版 ImageMagick，PNG/JPG→BMP 全本地，无需 .NET 或额外安装。
> - 保留 macOS sips 路径，自动按平台选择对应二进制。

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
├── bin/             # 二进制可执行文件 (potrace/mkbitmap + ImageMagick)
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
- **ImageMagick portable**: Windows 内置便携版 `magick.exe`，用于 PNG/JPG → BMP 转换，无需用户安装。

## 📝 版本记录

- **v1.3**: Windows 转换链改为内置 ImageMagick（全自包含，无需 .NET/PowerShell 依赖）；版本号 1.3.0。
- **v1.2**: 内置 Windows x64 `potrace`/`mkbitmap`，manifest 支持 mac+win，PowerShell 转 BMP。
- **v1.1**: 内置静态编译的 macOS `potrace`，解决 Homebrew dylib 依赖。
- **v1.0**: 初始公开版本。

## 📄 License

MIT License
