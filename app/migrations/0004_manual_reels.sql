-- Reels/Story-Videos, die Nikita selbst mit Trend-Sound in der Instagram-App postet
ALTER TABLE posts ADD COLUMN manual INTEGER NOT NULL DEFAULT 0;
