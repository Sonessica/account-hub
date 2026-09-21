# ATCHOOO Space 发布说明

本文根据仓库 Git 历史回溯整理，记录各版本号对应的功能与变更。版本号以 `package.json` 为准。

产品演进主线：

| 阶段 | 包名 | 时间 |
| --- | --- | --- |
| 基于 OpenBento 起步 | `openbento` | 2026-09-16 |
| 个人中枢 Account Hub | `account-hub` | 2026-09-16 ~ 09-19 |
| 正式更名 ATCHOOO Space | `atchooo-space` | 2026-09-20 起 |

---

## 0.7.2（2026-09-21）

**Live Photo 悬停体验修复**

- 悬停事件从封面内层改挂到 `BentoCard` 外层，标题遮罩层增加 `pointer-events: none`，避免有标题的图集卡无法触发预览。
- `CoverMedia` 改为由父组件 `preview` 属性控制静音播放 / 停止，不再自行绑定指针事件。
- 仍保持约 300ms 悬停延迟；编辑模式下强制关闭媒体预览。
- 部署侧：NAS 镜像重建时 apt 使用阿里云源安装 ffmpeg，避免默认 Debian 源超时。

**数据侧（运行时，不体现在代码提交中）**

- GALLERY 作品按 NAS 文件夹批量导入卡片。
- Live Photo 卡片中与封面内容重复的静图项已清理，灯箱内 live 封面与视频合并为同一项。

---

## 0.7.1（2026-09-20）

**版本号在 `855f9f0` 从 0.7.0 升至 0.7.1；同日后续提交仍处于 0.7.1。**

### 功能与交互

- **图片 / Live Photo / 视频支持**（`f8d43ce`）
  - 上传接口支持「照片 + 同名视频」配对，识别为 live-photo。
  - 图片压缩为 WebP；视频经 FFmpeg 转 H.264/AAC MP4；纯视频自动抽帧生成封面。
  - 图片上限 20MB，视频上限 200MB，兼容 `.mov`。
  - 媒体访问支持 `.webp` / `.mp4`，视频支持 Range（HTTP 206）。
  - 封面卡片悬停可静音预览 live / 视频，角标显示 `LIVE` 或 `▶ VIDEO`。
- **画布缩放并入设置**（`bac97c0`）
  - 缩放控制迁移到设置面板。
  - 保存指示改为透明样式，减少对画布的遮挡。
- **卡片菜单与 Space 定位修复**（`855f9f0`）
  - 统一卡片菜单交互。
  - 补充取消隐藏开关。
  - 修复 Space 居中定位问题。

### 品牌与文档

- 产品更名为 **ATCHOOO Space**（`380aace`）：包名、环境变量、Compose、README、第三方声明等同步调整。
- 补充 LICENSE、上游 OpenBento 归属说明（`12c1320`）。
- 更新示例页面与功能文档（`018dbd2`、`d0ee80d`）。

### 构建与 NAS 部署

- `next.config.ts` 开启 `output: "standalone"`（`24cef21`）。
- Dockerfile 调整依赖安装顺序，降低 NAS 上并行构建压力（`5281d5f`）。
- 运行时镜像安装 ffmpeg；Compose 增加 `HOSTNAME: 0.0.0.0`（`23c8b2c`）。

---

## 0.7.0（2026-09-19）

**个人中枢成型：多 Space、轮盘导航、全画布可编辑**（`a665842` 等）

- 产品形态从「单画布编辑器」演进为个人空间中枢。
- 引入 **HOME / NOTES / GALLERY / BOOKMARKS** 四个独立 Space，各自保存卡片布局、平移与缩放。
- **Radial Navigation 2.0**：右下角磨砂玻璃轮盘；滚轮预选、约 650ms 确认；支持键盘操作与 View Transition。
- 开屏黄蓝渐变动画；经轮盘切换 Space 时不重复播放。
- 各画布分区均可编辑；根路径即编辑器。
- 编辑器数据继续落在 NAS SQLite，按 Space 隔离快照。

---

## 0.6.2（2026-09-18）

**图集稳定性**

- 页面切到后台时暂停封面轮播，避免无效计时与耗电（`49a3915`）。
- 接受 hash 风格媒体文件名；历史图集规格统一到可兼容尺寸（`12705f1`）。
- 画布布局平衡，修复尺寸调整时的碰撞（`43049dd`）。
- 为内容页增加径向导航雏形（`8d8a2a7`）。

---

## 0.6.1（2026-09-18）

**封面特效与图集上限**（`1b71ac4`）

- 新增封面切换特效：Crossfade、景深模糊、方向漂移、Ken Burns、遮罩 Reveal、快门闪光、每次随机。
- 单卡图集最多 **9** 张。
- 可配置封面切换间隔与特效。

---

## 0.6.0（2026-09-18）

**图集封面与灯箱浏览**（`0021292`）

- 图片卡片支持多图 gallery，可固定封面或随机轮播。
- 双击进入 Lightbox；支持方向键、滚轮、缩略图切换。
- 媒体文件名与图集数据规范化。

相关同日迭代：

- 灯箱弹簧动画与粒子点缀后又移除浮动粒子，保持界面干净（`725573c`、`7ef834d`）。
- 补充图片展示能力（`a4ad122`）。

---

## 0.5.4 ~ 0.5.8（2026-09-18）

**画布布局与拖拽体验**

| 版本 | 提交 | 变更 |
| --- | --- | --- |
| 0.5.8 | `725573c` | 灯箱弹簧动画与粒子效果 |
| 0.5.7 | `62373ba` | 多卡推挤；搜索框格子预留 |
| 0.5.5 | `dd1176e` | 多格落点打包；随机自动布局 |
| 0.5.4 | `4912467` | 拖放交换位置、自动布局、图片灯箱 |

- 修复多格拖放重叠（`a242b11`）。
- 更新项目说明文档（`3b649a7`）。

---

## 0.5.3（2026-09-17）

**画布修复与构建清理**（`8f232f8` 等）

- 稳定画布坐标修复、视口裁剪、外部单列表编辑。
- Docker 构建排除 NAS 部份备份目录（`4a700e3`）。
- 构建校验与交互稳定（`da32a99`）。

---

## 0.5.0 ~ 0.5.2（2026-09-17）

**无限画布「艺术墙」**

- **0.5.0**（`161803f`）：无限画布 + 居中卡片搜索框；按标题 / URL / 文字 / 类型即时筛选。
- **0.5.1**（`f2dc14c`）：弹簧拖拽手感打磨。
- **0.5.2**（`41966dc`）：恢复单击选中、双击编辑。

---

## 0.4.1 ~ 0.4.6（2026-09-17）

**链接卡片视觉与编辑器能力**

| 版本 | 要点 |
| --- | --- |
| 0.4.6 | 组件数量上限提升至 10000（`7c4c3bb`） |
| 0.4.5 | 链接卡媒体满幅展示；不同尺寸底栏适配（`f69cd2b`） |
| 0.4.4 | 对齐 Uiverse 链接悬停显现效果（`6e16fce`） |
| 0.4.3 | 恢复链接卡尺寸，修复悬停可靠性（`05b24e9`） |
| 0.4.2 | 链接卡按 Uiverse cowardly-newt 风格重绘（`ec30014`） |
| 0.4.1 | 界面移除快捷导航入口（`68491a1`） |

---

## 0.4.0（2026-09-17）

**设置与访问模型**（`9df8e7e`）

- 新增设置面板、视图模式。
- 取消演示种子数据，默认空白画布。
- 产品对外访问更接近「个人公开主页」。

---

## 0.3.0 ~ 0.3.1（2026-09-17）

**公开访问与开屏**

- **0.3.0**（`d4e8fce`）：公开访问；ATCHOOO 开屏介绍。
- **0.3.1**（`557a29c`）：开屏统一为单线几何 Logo。

---

## 0.2.0 ~ 0.2.4（2026-09-17）

**编辑器交互与视觉清理**

| 版本 | 变更 |
| --- | --- |
| 0.2.4 | 编辑器页脚移除 Discord 图标（`38635eb`） |
| 0.2.3 | 移除页脚硬编码浏览量（`e582e14`） |
| 0.2.2 | 单击显示尺寸浮层，双击打开编辑面板（`25c9570`） |
| 0.2.1 | 去掉图片预览交互提示文案（`aea65ab`） |
| 0.2.0 | 图片卡片编辑器改为居中弹窗（`48f1636`） |

---

## 0.1.0 ~ 0.1.1（2026-09-16 ~ 09-17）

**Account Hub 基座**

### 0.1.0（`01caaa6` 起）

- 以 [OpenBento](https://github.com/bravohenry/openbento) 为基座，建立 Account Hub。
- **NAS SQLite 持久化**（`21430ee`）：编辑器快照写入本地/ NAS 数据库，访客与编辑共用同一份数据。
- 管理 PIN 与会话密钥分离（`6b4b7db`）。
- 安全导入较大的本地 Bento 快照（`c372222`）。
- 保存时才显示动画加载（`b523830`）。
- 响应式组件编辑面板；编辑网格扩展至八列（`0665b24`、`0b51410`）。
- 移除独立移动端布局，统一响应式（`d1f91ea`）。
- 上传图片压缩为 WebP 存储（`0c53b2f`）。
- 行内文字编辑可持久化；地图样式可应用（`3f4955f`）。
- 修复地图经纬度输入崩溃、缩放不生效（`a443237`）。

### 0.1.1（`a443237`）

- 地图相关缺陷修复与编辑体验补丁。

---

## 提交索引（按时间倒序）

以下为仓库内完整提交主题，便于对照版本定位具体改动。

### 2026-09-20

- `23c8b2c` build: optimize NAS runtime deployment
- `24cef21` build: emit standalone production bundle
- `5281d5f` build: avoid parallel NAS dependency work
- `f8d43ce` feat: support images live photos and videos
- `bac97c0` feat: move canvas zoom into settings; transparent save indicator
- `855f9f0` fix: unified card menu, unhide toggle, and space centering → **0.7.1**
- `380aace` Rename product to ATCHOOO Space

### 2026-09-19

- `018dbd2` 示例页面更新
- `12c1320` docs: add license and upstream notices
- `d0ee80d` docs: document current features and operations
- `a665842` feat: evolve canvas into personal hub v0.7.0 → **0.7.0**
- `66a74f1` feat: redesign radial space navigation
- `06c0f78` perf: smooth wheel page transitions
- `9698a2c` fix: avoid view transition update timeout
- `9756f2b` feat: animate page transitions with wheel direction
- `6ca979e` feat: enable editing across canvas sections
- `fc30d36` fix: make root the editor and remove splash race
- `a268ad7` feat: add blank canvas sections and one-time splash
- `7607f9b` feat: match wheel navigation reference

### 2026-09-18

- `8d8a2a7` feat: add radial navigation for content pages
- `43049dd` fix: balance canvas layout and resolve resize collisions
- `49a3915` fix: pause gallery cover rotation when tab is hidden → **0.6.2**
- `12705f1` fix: accept hash media filenames and normalize galleries
- `1b71ac4` feat: gallery cover effects and max 9 images → **0.6.1**
- `0021292` feat: image gallery covers and lightbox browser → **0.6.0**
- `7ef834d` fix: remove lightbox floating sparkle particles
- `725573c` feat: animate double-click image lightbox → **0.5.8**
- `a4ad122` 添加图片展示
- `a242b11` fix: prevent overlapping multi-cell canvas drops
- `3b649a7` docs: refresh project guide
- `62373ba` fix: multi-card push and search cell reservation → **0.5.7**
- `dd1176e` fix: multi-cell drop/pack and randomized auto layout → **0.5.5**
- `4912467` feat: swap-on-drop, auto layout, and image lightbox → **0.5.4**

### 2026-09-17

- `8f232f8` fix: stabilize canvas repair, culling, external edits → **0.5.3**
- `4a700e3` fix: exclude NAS deployment backups from Docker build
- `da32a99` fix: validate builds and stabilize canvas interactions
- `41966dc` fix: restore click select and double-click edit → **0.5.2**
- `f2dc14c` polish: smooth spring drag on infinite canvas → **0.5.1**
- `161803f` feat: infinite canvas art wall with center search → **0.5.0**
- `7c4c3bb` feat: raise widget cap to 10000 → **0.4.6**
- `f69cd2b` fix: full-bleed link media and per-size bottom bar → **0.4.5**
- `6e16fce` feat: match uiverse link hover reveal → **0.4.4**
- `05b24e9` fix: restore link card size and reliable hover → **0.4.3**
- `ec30014` feat: restyle link cards after uiverse cowardly-newt → **0.4.2**
- `68491a1` style: remove quick nav from hub UI → **0.4.1**
- `9df8e7e` feat: settings, quick nav, view mode, no demo seed → **0.4.0**
- `557a29c` style: unify ATCHOOO splash as monoline geometric logo → **0.3.1**
- `d4e8fce` feat: public access and ATCHOOO splash intro → **0.3.0**
- `38635eb` style: remove Discord icon from editor footer → **0.2.4**
- `e582e14` style: remove hardcoded view count → **0.2.3**
- `25c9570` feat: single-click size overlay and double-click edit panel → **0.2.2**
- `aea65ab` style: remove image preview interaction hint → **0.2.1**
- `48f1636` feat: redesign image card editor as centered modal → **0.2.0**
- `a443237` fix: fix map lat/lng input crash and zoom → **0.1.1**
- `3f4955f` feat: persist inline text edits and apply map style
- `0c53b2f` feat: store uploaded images as compressed WebP
- `d1f91ea` refactor: remove separate mobile layout
- `0b51410` feat: expand editor grid to eight columns
- `0665b24` feat: add responsive widget editing panel
- `0545af8` docs: rewrite Account Hub setup docs
- `b523830` feat: show animated loader only while saving
- `6b4b7db` feat: support short admin PIN with separate session secret
- `c372222` fix: import large local Bento snapshots safely
- `21430ee` feat: persist Bento editor to NAS SQLite
- `01caaa6` feat: adopt OpenBento as Account Hub base → **0.1.0**

---

## 版本号变更一览

| 版本 | 日期 | 代表提交 |
| --- | --- | --- |
| 0.7.2 | 2026-09-21 | Live Photo 悬停修复（本次） |
| 0.7.1 | 2026-09-20 | `855f9f0` 卡片菜单 / 同日媒体与 NAS 构建 |
| 0.7.0 | 2026-09-19 | `a665842` 个人中枢 v0.7.0 |
| 0.6.2 | 2026-09-18 | `49a3915` 图集轮播与布局修复 |
| 0.6.1 | 2026-09-18 | `1b71ac4` 封面特效、最多 9 图 |
| 0.6.0 | 2026-09-18 | `0021292` 图集封面与灯箱 |
| 0.5.8 | 2026-09-18 | `725573c` 灯箱动画 |
| 0.5.7 | 2026-09-18 | `62373ba` 多卡推挤与搜索格预留 |
| 0.5.5 | 2026-09-18 | `dd1176e` 多格落点与自动布局 |
| 0.5.4 | 2026-09-18 | `4912467` 拖放交换与灯箱 |
| 0.5.3 | 2026-09-17 | `8f232f8` 画布修复 |
| 0.5.2 | 2026-09-17 | `41966dc` 选中与双击编辑 |
| 0.5.1 | 2026-09-17 | `f2dc14c` 弹簧拖拽 |
| 0.5.0 | 2026-09-17 | `161803f` 无限画布 + 搜索 |
| 0.4.6 | 2026-09-17 | `7c4c3bb` 组件上限 10000 |
| 0.4.5 | 2026-09-17 | `f69cd2b` 链接卡媒体与底栏 |
| 0.4.4 | 2026-09-17 | `6e16fce` 链接悬停显现 |
| 0.4.3 | 2026-09-17 | `05b24e9` 链接卡尺寸与悬停 |
| 0.4.2 | 2026-09-17 | `ec30014` 链接卡 Uiverse 风格 |
| 0.4.1 | 2026-09-17 | `68491a1` 移除快捷导航 |
| 0.4.0 | 2026-09-17 | `9df8e7e` 设置 / 视图 / 无演示数据 |
| 0.3.1 | 2026-09-17 | `557a29c` 开屏 Logo 统一 |
| 0.3.0 | 2026-09-17 | `d4e8fce` 公开访问与开屏 |
| 0.2.4 | 2026-09-17 | `38635eb` 页脚清理 |
| 0.2.3 | 2026-09-17 | `e582e14` 移除浏览量 |
| 0.2.2 | 2026-09-17 | `25c9570` 尺寸浮层与编辑面板 |
| 0.2.1 | 2026-09-17 | `aea65ab` 移除预览提示 |
| 0.2.0 | 2026-09-17 | `48f1636` 图片编辑居中弹窗 |
| 0.1.1 | 2026-09-17 | `a443237` 地图修复 |
| 0.1.0 | 2026-09-16 | `01caaa6` OpenBento 基座与 NAS SQLite |

---

*本文由仓库提交历史回溯生成，用于版本对照与变更回顾。*
