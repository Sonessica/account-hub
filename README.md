# Account Hub

基于 [OpenBento](https://github.com/bravohenry/openbento) 改造的自托管个人 Bento 页面。当前产品是**单页、共享数据**的版本：访客和编辑者访问同一个画布，卡片、个人资料与站点设置保存在 NAS 的 SQLite 中，而非浏览器本地或 Supabase。
<img width="3840" height="1907" alt="image" src="https://github.com/user-attachments/assets/1803e637-843a-487f-8f68-24904eb4971e" />

## 当前功能

- 无限画布：平移、拖动卡片、碰撞排位、交换/推挤和「自动布局」；仅渲染视口附近的卡片。
- 卡片：链接、图片（一组图集最多 9 张：固定/随机封面，多种切换特效，查看页双击浏览）、文字、地图、分区标题；支持尺寸与内容编辑。图片可批量上传，查看模式下可打开大图并切换。
- 页脚「编辑 / 完成」切换模式；编辑模式下单击选择、双击打开编辑面板，底部工具栏添加卡片。
- 修改自动保存到 SQLite；保存中显示动画，失败可重试，跨浏览器旧版本写入会提示冲突。
- 首次遇到空数据库时，可选择导入当前浏览器遗留的 OpenBento 卡片，或从空白开始。导入不会删除原浏览器数据。
- 设置面板可修改个人资料、头像；其中的 JSON 导入/导出**仅包含个人资料，不是完整卡片备份**。

主入口是 `/`；旧路径 `/bento/editor` 和 `/editor` 会跳转到这里。现行编辑器及其读写 API **没有密码门禁**：能访问该站点的人也能修改共享页面。仓库中仍保留旧版 Supabase 多用户页面/API 与会话接口，但它们不是当前编辑器的数据通道。不要把旧登录页面或 `.env` 中的管理密码理解为当前编辑器的访问保护。

## 技术与数据

Next.js 16、React 19、TypeScript；服务端使用 Node.js 22 的 `node:sqlite`，图片由 `sharp` 转为 WebP。Docker Compose 将宿主机的 `./data` 挂载到容器 `/app/data`：

| 内容 | 默认位置 |
| --- | --- |
| 页面快照 | `./data/account-hub.sqlite` |
| 上传图片 | `./data/media/` |
| 浏览器旧卡片 | 浏览器 localStorage，仅用于首次迁移 |

页面快照请求上限为 20 MB，单张上传图片上限为 20 MB。SQLite 采用 WAL 模式，运行时可能出现 `-wal`、`-shm` 文件。详细备份与恢复见 [NAS 数据说明](docs/NAS_SQLITE_PERSISTENCE.md)。

## NAS / Docker 部署

需要 Docker Compose、可用的 `nas-frontend` Docker 网络，以及可写的 `data/` 目录。当前 `docker-compose.yml` 针对 `https://account.atchooo.com:2096` 配置；换域名时须同时检查 Compose、Dockerfile 中的 `NEXT_PUBLIC_APP_URL`，以及反向代理配置。

```bash
cp .env.example .env
# 编辑 .env，设置 ACCOUNT_HUB_ADMIN_PASSWORD（至少 6 字符）
# 与 ACCOUNT_HUB_SESSION_SECRET（至少 32 字符）
docker compose up -d --build
docker compose logs --tail=50 openbento-review
```

这两个变量是**当前 Compose 启动所要求的值**，旧会话接口会使用它们；设置它们不会给当前 `/bento/editor` 加密码。不要提交 `.env`、`data/` 或备份。部署更新前先做一致性数据库备份，且不要使用 `docker compose down -v` 删除卷。首次部署如无 `nas-frontend` 网络，需先建立网络或调整 Compose；公网访问还依赖现有反向代理，并非 Compose 自动配置。

## 本地开发

需要 Node.js 22+。在 Windows PowerShell 中：

```powershell
npm ci
$env:ACCOUNT_HUB_DB_PATH = (Join-Path (Get-Location) 'data/account-hub.sqlite')
$env:ACCOUNT_HUB_MEDIA_PATH = (Join-Path (Get-Location) 'data/media')
$env:NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
npm run dev
```

打开 `http://localhost:3000`。`data/` 不入库；需要调试旧版会话接口时，再按 [.env.example](.env.example) 配置其密码和密钥。

提交前可运行：

```bash
npm run typecheck
npm run lint
npm run test:canvas
npm run build
```

构建脚本使用 Webpack。`npm run migrate:images` 是针对旧快照中内嵌 base64 图片的**一次性、会修改数据库的迁移脚本**，不是常规启动步骤；运行前请先备份。

## 代码与文档入口

| 路径 | 作用 |
| --- | --- |
| `src/app/page.tsx` | 当前页面入口（复用 Bento 编辑页） |
| `src/bento/editor/` | 无限画布、交互、编辑器、自动保存 |
| `src/bento/widgets/` | 卡片类型与渲染 |
| `src/app/api/private/`、`src/lib/server/` | 当前 SQLite 快照与图片接口 |
| `src/app/auth/`、`src/app/api/auth/`、`src/lib/supabase/` | 保留的旧版多用户路径；不驱动当前编辑器 |
| `docs/NAS_SQLITE_PERSISTENCE.md` | 数据、备份、恢复与迁移 |
| `docs/LOCATION_SEARCH.md` | 地图位置搜索的当前实现 |

各模块的 `.folder.md` 是开发时使用的局部代码地图；维护约定见 [FRACTAL_DOCS.md](FRACTAL_DOCS.md)。以实际代码为准，改动架构时同步更新对应文档。

## 许可证

`package.json` 标注为 MIT，但仓库当前没有独立的 `LICENSE` 文件；对外再分发前应核实上游及本项目的许可文本。
