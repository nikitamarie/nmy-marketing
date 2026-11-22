-- Caption wird im Hintergrund von Gemini verbessert (Upload wartet nicht auf die KI)
ALTER TABLE posts ADD COLUMN caption_job TEXT;
