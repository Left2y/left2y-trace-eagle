# left2y-trace_prd

# ① 开发需求文档（PRD）

## 1. 文档信息

- 项目名：Eagle Raster → Vector（Logo / Icon）插件
- 版本：v0.1（MVP）
- 插件类型：Window Plugin（带 UI 面板与进度显示）
- 运行环境：Chromium 107 + Node 16，且不受 CORS 限制（可用 Node 原生 API / 第三方模块）

## 2. 背景与目标

### 背景

在 Eagle 里整理 Logo / 图标素材时，经常需要把 PNG/JPG 转为可编辑的 SVG，以便后续在设计工具里修改、放大不糊、统一风格。

### 目标

- 对 **选中的图片资源（PNG/JPG/BMP/PNM 等）** 一键生成 **边缘干净的 SVG**（更偏 Logo/图标风格，而不是照片矢量化）。
- 提供少量但关键的参数控制（阈值、锐角/平滑、去噪、放大倍数），并提供可用的默认预设。
- 生成的 SVG 自动回写到 Eagle 资源库，保持可追溯（tag/注释/命名规则）。

## 3. 用户与使用场景

- 用户：个人设计师 / 视觉开发者（你自己 + 开源社区用户）
- 场景：
    1. 选中一批 Logo PNG → 批量转 SVG
    2. 某个图标边缘锯齿明显 → 调阈值与角点阈值重新输出
    3. 透明底黑色图标 → 直接输出干净轮廓 SVG

## 4. 范围（In Scope）

### 输入

- Eagle 中当前选中的 items（图片类资源为主）。
- Item 的 `filePath` 作为本地源文件路径（只读）。

### 处理链路（固定）

1. mkbitmap：将彩色/灰度图 → 高分辨率二值图（PBM）
    - mkbitmap 的处理顺序：反相 → 高通滤波 → 缩放 → 阈值化，可分别开关。
    - mkbitmap 的默认预设选项：`f 4 -s 2 -3 -t 0.45`（可通过 `x` 关闭默认预设）。
2. potrace：将 PBM → SVG
    - potrace 输入期望黑白位图；其自身灰度阈值转换较粗糙，官方也建议用 mkbitmap 做更好的阈值化与插值放大。

### 输出

- 每个输入图片生成一个 SVG 文件（保存到临时目录或插件工作目录）。
- 使用 Eagle 插件 API 将 SVG 导入资源库：`eagle.item.addFromPath(svgPath, options)`
- 允许为导入的 SVG 自动添加 tags / annotation / name（可选）。

## 5. 不在范围（Out of Scope）

- 照片级彩色矢量化、渐变/多色分层重建（Potrace 体系不擅长，后续版本再考虑）。
- 在线云端处理（完全本地）。
- 生成 AI 重绘、风格化（与本插件目标不一致）。

## 6. 核心体验与交互

### 用户主流程（MVP）

1. 用户在 Eagle 选择 1~N 张图片
2. 打开插件窗口 → 显示选中数量与文件列表
3. 选择/调整参数预设（例如：图标-硬边 / Logo-平滑 / 扫描稿-去噪）
4. 点击「开始转换」
5. 显示总进度 + 当前文件进度（逐个处理）
6. 完成后：把 SVG 自动导入 Eagle，并提示结果/失败列表

### UI（MVP 必备）

- 预设：
    - **Icon Hard（硬边锐角）**：更尖锐的角点、更少平滑
    - **Logo Smooth（平滑顺滑）**：更圆润、更易编辑
    - **Scan Cleanup（去噪增强）**：更强去噪/滤波
- 参数区（建议只保留“最影响边缘”的 6 个）
    - mkbitmap：Invert、Filter radius、Blur、Scale、Threshold、Interpolation（linear/cubic）
    - potrace：alphamax（角点阈值）、opttolerance（曲线优化容差）、turdsize（去小斑点）、tight（裁白边）、blacklevel（仅当直接喂灰度时才用；本方案主要由 mkbitmap 负责）

## 7. 参数设计（建议默认值）

### mkbitmap（预处理）

- `-scale`：默认 2（官方推荐用于 potrace 输入；1 会丢细节，≥3 可能“发明细节”影响追踪）。
- `-threshold`：默认 0.45（mkbitmap 默认预设之一）。
- 插值：默认 cubic（`3/--cubic` 为默认）。
- `-filter`：默认 4（默认预设）。
- `-blur`：默认 0（关闭；用户可开到 1 处理噪点）。
- `-invert`：默认 false（遇到白线黑底再开）。

### potrace（追踪）

- 输出：`-svg`
- `-turdsize`（去噪点像素阈值）：默认 2~10（视图标尺寸）。
- `-alphamax`（角点阈值）：默认 1；越小角越尖，0=多边形；>4/3 角点会被抑制更平滑。
- `-opttolerance`：默认 0.2（值越大曲线合并更多但损失精度）。
- `-tight`：默认开启（去掉外围空白）。

## 8. 数据与回写策略

- 读取：`eagle.item.getSelected()` 获取选中 items。
- 性能：当只需要少数字段（如 `id`,`filePath`,`name`）时，使用 `fields` 参数减少返回数据量。
- 新增：`eagle.item.addFromPath(svgPath, options)` 导入 SVG。
- 修改元数据：修改 item 属性后需 `item.save()` 保存（且不建议直接改库内文件）。

## 9. 失败处理与验收标准

### 常见失败

- 输入文件不是位图或路径无效
- mkbitmap / potrace 执行失败（未找到二进制、权限不足、参数非法）
- 生成 SVG 为空或严重失真（阈值/滤波不合适）

### 验收标准（MVP）

- 选中 1 张图：能生成 SVG 并自动导入 Eagle（成功率 > 95%）
- 选中 20 张 512×512 图标：串行处理可完成，UI 不冻结（显示进度与可取消）
- 调整阈值/alphamax/opttolerance/turdsize 后，输出结果能明显变化且符合预期（边缘更硬/更平滑/更干净）
- 所有临时文件可清理（成功后清理或保留“导出目录”）

## 10. 开源与许可证

- mkbitmap / potrace 均为 GPL（mkbitmap man page 明确为 GPLv2 或更高版本）。
- 插件计划开源：建议仓库包含 `COPYING`、第三方许可说明（THIRD_PARTY_NOTICES），并在 README 声明二进制来源与构建方式。