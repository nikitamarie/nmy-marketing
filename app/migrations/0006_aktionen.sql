-- Eigene Aktionen (z. B. Black Friday): einmalig oder täglich wiederholt
CREATE TABLE aktionen (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  kind TEXT NOT NULL,           -- story | post | reel
  content TEXT NOT NULL,        -- bild | video | text
  start_date TEXT NOT NULL,     -- YYYY-MM-DD (Ortszeit)
  end_date TEXT NOT NULL,
  time TEXT NOT NULL,           -- HH:MM (Ortszeit)
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
ALTER TABLE posts ADD COLUMN aktion_id TEXT;
