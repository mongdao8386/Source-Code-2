# Deployment — Hostinger VPS + Supabase

VPS IP and domain will be filled in later. Everything below is ready to run
once they exist.

## 0. Prerequisites

- A Supabase project (free tier is fine to start).
- A Hostinger VPS (Ubuntu 22.04/24.04) and a domain managed in Hostinger DNS.

## 1. Supabase

1. Create the project. Note **Project URL**, **anon key**, **service_role key**
   (Settings → API) and the **connection string** (Settings → Database).
2. Apply the schema from your machine:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push          # runs supabase/migrations/*
   psql "$SUPABASE_DB_URL" -f supabase/seed.sql
   ```
3. Create the owner (needs service_role key):
   ```bash
   OWNER_EMAIL=you@example.com OWNER_INITIAL_PASSWORD='a-long-random-string' \
   OWNER_FULL_NAME='Your Name' \
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key> \
   npm run seed:owner
   ```
4. Auth settings:
   - Enable **MFA (TOTP)**.
   - **Disable "Allow new users to sign up"** — this site has no visitor
     accounts; only the owner creates staff. Leaving signup on lets strangers
     create `auth.users` rows (they still cannot reach the CMS, but there is no
     reason to allow it).
   - Set **Site URL** to `https://<your-domain>` and add it to the redirect
     allow-list.
5. (Optional) Auth → SMTP: point at your provider so future email flows work.

## 2. VPS hardening

```bash
adduser deploy && usermod -aG sudo deploy
# copy your SSH key to /home/deploy/.ssh/authorized_keys
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
systemctl restart ssh

ufw default deny incoming && ufw default allow outgoing
ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw enable
apt-get update && apt-get install -y fail2ban

# Docker
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
```

## 3. DNS (Hostinger)

In hPanel → Domains → DNS Zone:

| Type | Name | Value            | TTL |
|------|------|------------------|-----|
| A    | @    | `<VPS_IP>`       | 300 |
| A    | www  | `<VPS_IP>`       | 300 |

Wait for propagation (`dig +short <domain>` returns the VPS IP).

## 4. App

```bash
sudo mkdir -p /opt/studio && sudo chown deploy: /opt/studio
cd /opt/studio
git clone <repo> .
cp .env.example .env
$EDITOR .env          # fill Supabase keys, SITE_DOMAIN, ACME_EMAIL, REDIS_URL=redis://redis:6379

docker compose up -d --build
docker compose logs -f caddy     # watch the certificate get issued
```

Health: `curl -fsS https://<domain>/api/health` → `{"status":"ok"}`.

## 5. Backups

```bash
cp deploy/backup.sh /opt/studio/deploy/ && chmod +x /opt/studio/deploy/backup.sh
crontab -e
# 15 3 * * *  SUPABASE_DB_URL='...' /opt/studio/deploy/backup.sh >> /var/log/studio-backup.log 2>&1
```

## 6. Updates

```bash
cd /opt/studio && git pull && docker compose up -d --build
npx supabase db push   # if migrations changed
```

## Smoke test (run after every deploy)

- `https://<domain>/vi` and `/en` render.
- `https://<domain>/vi/admin` → **404** (not a login page) when logged out.
- Sign in as owner → forced TOTP enrol → dashboard.
- Settings → set Telegram URL → reload the home page → "Đặt lịch" is enabled and
  opens that channel. (If it still reads "Sắp ra mắt", migration `0002` has not
  been applied — the public settings view would be returning zero rows.)
- `curl -sI https://<domain>` shows `strict-transport-security`,
  `content-security-policy`, `x-frame-options: DENY`.
