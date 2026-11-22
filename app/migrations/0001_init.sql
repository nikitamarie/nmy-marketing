-- Kundinnen-Sets: ein Upload nach einer Behandlung
CREATE TABLE sets (
  id TEXT PRIMARY KEY,
  treatment TEXT NOT NULL,
  note TEXT,
  consent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE media (
  id TEXT PRIMARY KEY,
  set_id TEXT REFERENCES sets(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,            -- photo | video
  role TEXT NOT NULL,            -- vorher | danach | abgeheilt | ergebnis | studio | video
  r2_key TEXT NOT NULL,
  mime TEXT,
  width INTEGER, height INTEGER,
  size INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX media_set ON media(set_id);

-- Beiträge (Feed-Karussell, Story, Reel)
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,            -- carousel | story | reel | image
  status TEXT NOT NULL,          -- render | geplant | veroeffentlicht | fehler | pausiert
  treatment TEXT,
  set_id TEXT,
  topic TEXT,                    -- z. B. ergebnis, wissen, ablauf, angebot, mythos
  job_json TEXT,                 -- Folien-Definition
  assets_json TEXT,              -- gerenderte R2-Keys in Reihenfolge
  video_key TEXT,
  caption TEXT,
  scheduled_at TEXT,             -- UTC ISO
  published_at TEXT,
  ig_media_id TEXT,
  ig_container TEXT,
  ig_permalink TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX posts_status ON posts(status, scheduled_at);

-- Instagram-Kennzahlen pro Beitrag (auch ältere, nicht von der App erstellte)
CREATE TABLE ig_media (
  id TEXT PRIMARY KEY,
  caption TEXT,
  media_type TEXT,
  product_type TEXT,
  permalink TEXT,
  thumb TEXT,
  ts TEXT,
  likes INTEGER, comments INTEGER,
  reach INTEGER, saved INTEGER, shares INTEGER, views INTEGER, interactions INTEGER,
  updated_at TEXT
);

-- Konto-Kennzahlen pro Tag
CREATE TABLE ig_daily (
  day TEXT PRIMARY KEY,
  followers INTEGER,
  reach INTEGER,
  profile_views INTEGER,
  link_clicks INTEGER
);

-- Klicks auf Bio-Seite / Buchungs-Buttons
CREATE TABLE clicks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  target TEXT NOT NULL,          -- bio | treatwell | whatsapp | preise
  ref TEXT,                      -- Quelle (z. B. bio, story, google)
  ts TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Buchungen (Treatwell automatisch über Gmail, WhatsApp/sonstige manuell)
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,           -- z. B. Gmail-Message-ID
  source TEXT NOT NULL,          -- treatwell | whatsapp | telefon | sonstige
  status TEXT NOT NULL DEFAULT 'gebucht', -- gebucht | storniert
  treatment TEXT,
  appointment_at TEXT,
  booked_at TEXT NOT NULL,
  subject TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Benachrichtigungen (E-Mail über Google-Apps-Script / Push)
CREATE TABLE notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT,
  url TEXT,
  sent INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trend-Radar & Analysen (Gemini)
CREATE TABLE insights (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,            -- trends | analyse
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
