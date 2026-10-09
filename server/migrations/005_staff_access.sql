BEGIN IMMEDIATE;
CREATE TABLE IF NOT EXISTS staff_access(
 id TEXT PRIMARY KEY,
 name TEXT NOT NULL,
 role TEXT NOT NULL CHECK(role IN ('catalog','support','fulfillment','finance','codes','manager')),
 token_hash TEXT UNIQUE NOT NULL,
 expires_at INTEGER NOT NULL,
 revoked INTEGER NOT NULL DEFAULT 0 CHECK(revoked IN (0,1)),
 created_at TEXT NOT NULL
);
INSERT OR IGNORE INTO migrations VALUES(5,datetime('now'));
COMMIT;
