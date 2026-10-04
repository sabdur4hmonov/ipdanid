ALTER TABLE jobs ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX IF NOT EXISTS active_sequence_job ON jobs(user_id,sequence_hash) WHERE status IN ('reserved','succeeded');
INSERT INTO migrations VALUES(2,datetime('now'));
