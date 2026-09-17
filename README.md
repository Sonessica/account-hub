# Account Hub

Self-hosted personal account / Bento editor for a single trusted environment (NAS or private network). Based on [OpenBento](https://github.com/Sonessica/account-hub) with local SQLite persistence.

## What this is

- Single-user Bento editor at `/bento/editor`
- **Public, no password**; default view mode, footer "编辑" enters edit
- Data stored in local SQLite (`node:sqlite`), not Supabase
- ATCHOOO splash intro; images as WebP under `data/media`
- Footer settings: profile, export/import

## Requirements

- **Node.js 22+** (uses built-in `node:sqlite`; lower versions will fail to start)
- Docker + Docker Compose (recommended for NAS deploy)

## Quick start (Docker)

```bash
cd /path/to/account-hub   # e.g. /share/Container/account-hub

# Create untracked env file next to docker-compose.yml
cat > .env <<'EOF'
ACCOUNT_HUB_ADMIN_PASSWORD=change-me
ACCOUNT_HUB_SESSION_SECRET=change-me-to-a-long-random-string-at-least-32-chars
EOF

docker compose up -d --build
```

Open the URL you set in reverse proxy / `NEXT_PUBLIC_APP_URL` (default in compose: `https://account.atchooo.com:2096`).

> **访问入口必须与 `NEXT_PUBLIC_APP_URL` 完全一致**（协议 + 域名 + 端口），否则登录接口会因 Origin 校验失败而 403。若通过反代访问，请保证该变量与浏览器地址栏一致。

## Environment variables

See [`.env.example`](./.env.example).

| Variable | Required | Description |
|---|---|---|
| `ACCOUNT_HUB_ADMIN_PASSWORD` | yes | Admin password, ≥ 6 characters |
| `ACCOUNT_HUB_SESSION_SECRET` | yes | HMAC session secret, ≥ 32 characters |
| `ACCOUNT_HUB_DB_PATH` | no | SQLite path (default `/app/data/account-hub.sqlite`) |
| `NEXT_PUBLIC_APP_URL` | recommended | Public origin used for same-origin checks and share links |

Runtime secrets live in compose `environment` (`.env` beside `docker-compose.yml`). Never commit `.env` or `data/`.

## Local development

```bash
npm install
# Node 22+
ACCOUNT_HUB_ADMIN_PASSWORD=dev-password \
ACCOUNT_HUB_SESSION_SECRET=dev-session-secret-at-least-32-characters-long \
ACCOUNT_HUB_DB_PATH=./data/account-hub.sqlite \
NEXT_PUBLIC_APP_URL=http://localhost:3000 \
npm run dev
```

`/` and `/editor` redirect to `/bento/editor`.

## Data & backup

- Database file: `./data/account-hub.sqlite` on the host, bind-mounted to `/app/data`
- WAL files (`-wal`, `-shm`) may exist; include them when copying
- Prefer stopping the container (or using SQLite online backup) before copying `data/`
- Keep backups **outside** the `data/` directory

Details: [docs/NAS_SQLITE_PERSISTENCE.md](./docs/NAS_SQLITE_PERSISTENCE.md)

## Project layout

```
src/app/bento/editor/     # Deployed editor UI
src/bento/                # Card / grid / widgets
src/lib/server/           # Session auth + SQLite store
docs/                     # Setup & persistence notes
docs/archive/             # Historical design-comparison notes
```

## Legacy notes

- Supabase auth/layout API routes and multi-user stores remain in the tree but are **not used** by this single-user editor. See `SUPABASE_SETUP.md` / `ENV_SETUP.md` (legacy).
- Upstream OpenBento docs: `FRACTAL_DOCS.md`, `README.zh.md`.

## License

MIT (upstream project declared MIT; add a `LICENSE` file if you redistribute).
