#!/usr/bin/env bash
# Nightly logical backup of the Supabase Postgres database.
# Supabase already keeps its own automated backups — this is a second copy you
# control. Wire it to cron, e.g.:
#   15 3 * * *  /opt/studio/deploy/backup.sh >> /var/log/studio-backup.log 2>&1
set -euo pipefail

: "${SUPABASE_DB_URL:?set SUPABASE_DB_URL}"
BACKUP_DIR="${BACKUP_DIR:-/opt/studio/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$BACKUP_DIR/db-$STAMP.sql.gz"

echo "[$(date -u)] dumping to $OUT"
pg_dump --no-owner --no-privileges "$SUPABASE_DB_URL" | gzip -9 > "$OUT"

# prune
find "$BACKUP_DIR" -name 'db-*.sql.gz' -mtime "+$RETENTION_DAYS" -delete
echo "[$(date -u)] done; kept last $RETENTION_DAYS days"

# Optional: push offsite (uncomment + configure)
# rclone copy "$OUT" remote:studio-backups/
