-- Kommentare unter eigenen Beiträgen + automatische Antworten
CREATE TABLE ig_comments (
  id TEXT PRIMARY KEY,
  media_id TEXT,
  username TEXT,
  text TEXT,
  ts TEXT,
  status TEXT NOT NULL,      -- neu | beantwortet | pruefen | spam | alt | eigener | fehler | geloescht
  reply_text TEXT,
  reply_id TEXT,
  replied_at TEXT
);
