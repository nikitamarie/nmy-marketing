#!/usr/bin/env bash
# Erst-Installation bzw. Update der App in Cloudflare.
# Voraussetzung: CLOUDFLARE_API_TOKEN (Rechte: Workers Scripts, D1, Workers R2 Storage, Browser Rendering – jeweils Bearbeiten; Account Settings – Lesen)
set -euo pipefail
cd "$(dirname "$0")/../app"
export WRANGLER_SEND_METRICS=false
: "${CLOUDFLARE_ACCOUNT_ID:?CLOUDFLARE_ACCOUNT_ID fehlt}"

# 1) Datenbank anlegen (einmalig) und ID in wrangler.toml eintragen
if grep -q REPLACE_D1_ID wrangler.toml; then
  ID=$(npx wrangler d1 list --json | node -e "const l=JSON.parse(require('fs').readFileSync(0));const d=l.find(x=>x.name==='nmy-marketing');if(d)console.log(d.uuid)")
  if [ -z "$ID" ]; then
    npx wrangler d1 create nmy-marketing --location weur >/dev/null
    ID=$(npx wrangler d1 list --json | node -e "const l=JSON.parse(require('fs').readFileSync(0));console.log(l.find(x=>x.name==='nmy-marketing').uuid)")
  fi
  sed -i "s/REPLACE_D1_ID/$ID/" wrangler.toml
fi

# 2) Bildspeicher (einmalig)
npx wrangler r2 bucket list 2>/dev/null | grep -q "nmy-marketing-media" || npx wrangler r2 bucket create nmy-marketing-media --location weur

# 3) Datenbank-Schema
npx wrangler d1 migrations apply nmy-marketing --remote

# 4) Code hochladen
npx wrangler deploy

# 5) Geheimnisse (nur beim ersten Mal; Passwort wird ausgegeben)
if ! npx wrangler secret list 2>/dev/null | grep -q SESSION_SECRET; then
  openssl rand -base64 32 | tr -d '\n' | npx wrangler secret put SESSION_SECRET
  PW=$(openssl rand -base64 12 | tr -dc 'A-Za-z0-9' | head -c 12)
  printf '%s' "$PW" | npx wrangler secret put APP_PASSWORD
  echo "ERSTES PASSWORT: $PW"
fi
