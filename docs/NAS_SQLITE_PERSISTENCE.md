# NAS SQLite persistence

The deployed `/bento/editor` is a single-user editor. It requires
`ACCOUNT_HUB_ADMIN_PASSWORD` (at least 16 characters) in an untracked `.env` next
to `docker-compose.yml`. The database lives at `./data/account-hub.sqlite` on
the NAS and is bind-mounted into `/app/data`. Never commit `.env` or `data/`.
The storage layer uses Node 22's built-in `node:sqlite` module; no native npm
SQLite package is needed. Node currently marks this module experimental.

Run `docker compose up -d --build` from `/share/Container/account-hub` to deploy.
The first authenticated browser may import its existing OpenBento localStorage
cards if the database is empty. Once a snapshot exists, the database is the
source of truth in every browser. Saving uses a revision number and rejects
stale writes with HTTP 409.

To back up without stopping the app, use SQLite's online backup mechanism or
stop the app container and copy the full `data/` directory (including `-wal`
and `-shm` files if present). Backups should be kept outside this directory.
Restoring requires stopping the app first and restoring a consistent backup.

The original OpenBento Supabase API routes remain in the codebase but are not
used by this single-user editor. They should be removed or integrated in a
later product-hardening phase.
