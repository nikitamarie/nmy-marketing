-- KI-Kennzeichnung: wurde KI für Text oder Bild verwendet?
ALTER TABLE posts ADD COLUMN ai_text INTEGER NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN ai_image INTEGER NOT NULL DEFAULT 0;
-- Bearbeitung des Fotos auf dem Handy: 'licht' | 'profi' (KI-gestützte Hautglättung)
ALTER TABLE media ADD COLUMN edit TEXT;
