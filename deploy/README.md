# Deploy — Hostinger VPS + Supabase

## The box

| | |
|---|---|
| Host | `srv1946746.hstgr.cloud` |
| IPv4 | `187.53.132.36` |
| IPv6 | `2a02:4780:5e:3c9a::1` |
| Plan | KVM 2 — 2 vCPU, 8 GB RAM, 100 GB NVMe, 8 TB transfer |
| OS | Ubuntu 26.04 LTS |
| Firewall | `studio-web` (id 354395) — attached |

The firewall accepts **22, 80, 443 and ICMP** and drops everything else. Add a
rule before exposing any new port; Hostinger firewalls are default-deny, so a
service on an unlisted port simply will not answer.

> Editing rules does not push them to a running VM: the group sits at
> `is_synced: false` until you hit *Synchronize* in hPanel (API: `POST
> /vps/v1/firewall/354395/sync/1946746`). It is synced as of 2026-09-01 — but
> after every rule change, check that before blaming Caddy for a connection
> that hangs on 443.

---

## 1. Supabase

Everything is in one file. Open the SQL Editor and run:

```
supabase/migrations/20260901000000_schema.sql
```

It is idempotent — schema, RLS, triggers, storage buckets, column grants and
starter data — so it is safe on an empty project and safe to re-run. Then
create the single owner account, which needs the service-role key because it
has to write an `auth.users` row:

```bash
OWNER_EMAIL=you@example.com \
OWNER_INITIAL_PASSWORD='a-long-random-string' \
OWNER_FULL_NAME='Your Name' \
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
npm run seed:owner
```

In the Supabase dashboard: enable **MFA (TOTP)**, set **Site URL** to your
domain, and **turn off email signups** — the public site has no user accounts,
so any signup that exists is only an attack surface.

**When the schema changes later**, the update path is the same paste: pull, open
the same file, run it again. Every statement is `if not exists` / `drop … create`
/ `on conflict do nothing`, so it adds what is new and leaves your content
alone. Do it *before* the deploy that needs it — the app queries `select *`, so
a column the code expects and the database lacks is a runtime error, not a
build one.

## 2. DNS

Point the domain at the VPS. Two records:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `187.53.132.36` | 300 |
| A | `www` | `187.53.132.36` | 300 |

Wait for it to resolve before starting the stack — Caddy asks Let's Encrypt for
a certificate on first boot, and that fails if the name does not yet point here:

```bash
dig +short your-domain.tld     # must print 187.53.132.36
```

## 3. Prepare the server

SSH in as root the first time, then work as `deploy`:

```bash
adduser --disabled-password --gecos "" deploy
usermod -aG sudo deploy
install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/
chown deploy:deploy /home/deploy/.ssh/authorized_keys

# Password logins off, root logins off
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh

apt-get update && apt-get install -y fail2ban
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

The Hostinger firewall already covers the network; `ufw` on top of it is
optional and easy to get wrong, so it is left out.

## 4. First deploy

As `deploy`:

```bash
sudo install -d -o deploy -g deploy /opt/studio
git clone https://github.com/mongdao8386/Source-Code-2.git /opt/studio
cd /opt/studio
cp .env.example .env
nano .env
```

Fill in `.env`. The values that matter:

| Key | Note |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://your-domain.tld`, no trailing slash |
| `SITE_DOMAIN` | the bare domain — Caddy requests the certificate for it |
| `ACME_EMAIL` | Let's Encrypt notifications |
| `NEXT_PUBLIC_ADMIN_PATH` | the CMS path, e.g. `/quan-tri-x7k2` |
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` | from Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only, never reaches the browser |
| `REDIS_URL` | `redis://redis:6379` |

Then:

```bash
docker compose up -d --build      # first build takes a few minutes on 2 vCPU
docker compose logs -f caddy      # watch the certificate get issued
```

Check it:

```bash
curl -fsS https://your-domain.tld/api/health      # {"status":"ok"}
curl -sI https://your-domain.tld | grep -i 'strict-transport\|content-security'
```

> **`NEXT_PUBLIC_*` is compiled into the bundle, not read at runtime.** Changing
> any of them — the admin path especially — means `docker compose up -d --build`
> again. Editing `.env` alone changes nothing for those keys.

## 5. Auto-deploy

`.github/workflows/deploy.yml` typechecks and lints on every push to `main`,
then SSHes in and rebuilds. Add four repository secrets under
**Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `VPS_HOST` | `187.53.132.36` |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | a **private** key whose public half is in `/home/deploy/.ssh/authorized_keys` |
| `VPS_PORT` | `22` (optional) |

Generate a key used only by CI, so it can be revoked without touching your own:

```bash
ssh-keygen -t ed25519 -f deploy_key -N "" -C "github-actions"
# public half onto the server:
ssh-copy-id -i deploy_key.pub deploy@187.53.132.36
# private half into the VPS_SSH_KEY secret, then delete both local copies
```

The workflow refuses to deploy if the working tree on the VPS is dirty, so edit
code locally and push rather than on the server. The old container keeps serving
while the new image builds; it swaps only after the build succeeds, and the job
fails loudly (with logs) if the health check never turns green.

**CI does not run `next build`.** It used to, against a placeholder Supabase
hostname that does not resolve — and since every page here prerenders from the
database, that build failed on every push, which meant the deploy job (it
`needs: check`) never ran at all. Types and lint are checked in CI; the build
that has to succeed is the one on the VPS, which has the real credentials and
is already gated by the health check. If you want the build checked in CI too,
add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as secrets
and restore the step — the workflow comment says how.

The three things that must be true before the first push deploys anything:

1. The four secrets above exist.
2. `/opt/studio` on the VPS is a clone of this repo with `.env` filled in
   (section 4), and `git -C /opt/studio status` is clean.
3. `deploy` is in the `docker` group — `ssh deploy@187.53.132.36 docker ps`
   answers without `sudo`.

Then push to `main`, or hit **Run workflow** on the Actions tab, and watch it.

### Deploying by hand

```bash
cd /opt/studio && git pull && docker compose up -d --build
```

## 6. Backups

Supabase keeps 7 days of its own. This is a second copy you control:

```bash
sudo install -d -o deploy -g deploy /opt/studio/backups
crontab -e
# 15 3 * * * SUPABASE_DB_URL='...' /opt/studio/deploy/backup.sh >> /var/log/studio-backup.log 2>&1
```

Storage objects (photos, video, brand assets) live in Supabase Storage and are
**not** covered by `pg_dump` — only the rows that reference them are.

## Smoke test after every deploy

- `https://your-domain.tld/vi` and `/en` render.
- `https://your-domain.tld/<admin-path>` → sign-in; any other path under it
  returns **404** while signed out, and `/console` returns 404 always.
- Sign in as owner → TOTP is demanded → dashboard.
- Settings → Telegram URL saved → the home page button opens that channel.
- A published model appears on `/vi/nguoi-mau`; flipping it to draft removes it.
- `curl -sI` shows `strict-transport-security` and `content-security-policy`.

## Notes on this hardware

Two vCPU is the constraint worth remembering:

- The image build is the heaviest thing that happens. It runs while the old
  container still serves, so the site stays up but feels slower for a few
  minutes. Avoid deploying during a traffic peak.
- Video is trimmed in the browser, never on the server, for the same reason.
- Video and images are served from Supabase Storage, so they bill against the
  project's **250 GB egress**, not the VPS's 8 TB. That is the limit to watch.
