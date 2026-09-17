# Account Hub

自托管的单用户 Bento 编辑器 / 个人主页，面向 NAS 或私有网络。基于 OpenBento，持久化改为本地 SQLite。

## 这是什么

- 主入口：`/bento/editor`
- **公开可访问**，无密码门禁；默认只读浏览，页脚「编辑」进入编辑
- 数据落在本地 SQLite（`node:sqlite`），不依赖 Supabase
- 首屏 ATCHOOO Splash；图片存 WebP 媒体目录
- 页脚设置：个人资料、导出/导入

## 环境要求

- **Node.js 22+**（依赖内置 `node:sqlite`，更低版本无法启动）
- 推荐 Docker + Docker Compose 部署

## 快速开始（Docker）

```bash
cd /path/to/account-hub   # 例如 /share/Container/account-hub

# 在 docker-compose.yml 旁创建不入库的 .env
cat > .env <<'EOF'
ACCOUNT_HUB_ADMIN_PASSWORD=change-me
ACCOUNT_HUB_SESSION_SECRET=change-me-to-a-long-random-string-at-least-32-chars
EOF

docker compose up -d --build
```

浏览器访问你配置的域名（compose 默认 `NEXT_PUBLIC_APP_URL=https://account.atchooo.com:2096`）。

> **访问地址必须与 `NEXT_PUBLIC_APP_URL` 完全一致**（协议 + 域名 + 端口），否则登录会因 Origin 校验返回 403。

## 环境变量

见 [`.env.example`](./.env.example)。`ACCOUNT_HUB_ADMIN_PASSWORD` 与 `ACCOUNT_HUB_SESSION_SECRET` 为必填。不要提交 `.env` 或 `data/`。

## 本地开发

```bash
npm install
ACCOUNT_HUB_ADMIN_PASSWORD=dev-password \
ACCOUNT_HUB_SESSION_SECRET=dev-session-secret-at-least-32-characters-long \
ACCOUNT_HUB_DB_PATH=./data/account-hub.sqlite \
NEXT_PUBLIC_APP_URL=http://localhost:3000 \
npm run dev
```

`/` 与 `/editor` 会跳转到 `/bento/editor`。

## 数据与备份

- 宿主机路径 `./data/account-hub.sqlite`，挂载到容器 `/app/data`
- 备份时包含可能存在的 `-wal` / `-shm`
- 优先停容器或使用 SQLite online backup 再拷贝
- 备份请放在 `data/` 目录之外

详见 [docs/NAS_SQLITE_PERSISTENCE.md](./docs/NAS_SQLITE_PERSISTENCE.md)。

## 遗留说明

Supabase 相关 API / 多用户 store 仍在代码中，**当前单用户编辑器不会使用**。历史设计对比文档在 `docs/archive/`。

## License

MIT（上游声明 MIT；若对外分发请自行补充 `LICENSE` 文件）。
