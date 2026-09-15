# Account Hub

Account Hub V1.0.0 是一个单用户、自托管的手工账号中心，用于整理个人在不同平台上的数字身份、主页和登录入口。

## 安全边界

- 不保存平台密码、TOTP、Passkey 或 Cookie。
- 不调用 Vaultwarden API；`vaultItemHint` 只是便于查找的纯文本提示。
- V1 不连接平台 API，也不会声称账号状态已被远程验证。
- 邮箱和手机号在普通界面默认遮罩。

## 功能

- Google、Microsoft、Apple、X、小红书、知乎、QQ、Bilibili 和通用平台
- 同平台多账号、标签、收藏、搜索和分类
- 主页、登录及管理入口
- 本地管理员登录，密码使用 Argon2id
- JSON 数据导出、审计记录、浅色/深色自适应
- PostgreSQL 持久化与 Docker Compose 部署

## QNAP / Docker Compose 部署

1. 复制环境文件并生成长随机数据库密码：

   ```sh
   cp .env.example .env
   ```

2. 启动：

   ```sh
   docker compose up -d --build
   ```

3. 默认只监听 `127.0.0.1:3100`，用于反向代理。若需先在局域网测试，把 `.env` 中的 `ACCOUNT_HUB_BIND_ADDRESS` 改为 NAS 的局域网 IP，并临时设置 `COOKIE_SECURE=false`，然后打开 `http://NAS-IP:3100`。首次访问会要求创建管理员。

生产环境应通过 QNAP 反向代理提供 HTTPS，并使用 `COOKIE_SECURE=true`；不要将 PostgreSQL 端口映射到宿主机。

## 本地开发

```sh
pnpm install
pnpm prisma generate
pnpm dev
```

需要在 `.env` 中提供可用的 PostgreSQL `DATABASE_URL`，然后执行：

```sh
pnpm prisma migrate deploy
pnpm db:seed
```

## 验证

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 备份与恢复

需要备份两个对象：`.env` 与 PostgreSQL 数据。推荐使用逻辑备份：

```sh
docker compose exec -T postgres pg_dump -U account_hub account_hub > account-hub.sql
```

恢复到空数据库：

```sh
docker compose exec -T postgres psql -U account_hub account_hub < account-hub.sql
```

升级前先备份，然后执行：

```sh
git pull
docker compose up -d --build
```

容器启动时会自动执行数据库迁移与平台种子更新。
