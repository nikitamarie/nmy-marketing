-- Story-Reposts eigener Beiträge
ALTER TABLE posts ADD COLUMN repost_of TEXT;   -- Instagram-Media-ID des geteilten Beitrags
