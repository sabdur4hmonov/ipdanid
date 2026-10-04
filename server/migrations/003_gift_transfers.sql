ALTER TABLE gifts ADD COLUMN id TEXT;
ALTER TABLE gifts ADD COLUMN request_key TEXT;
ALTER TABLE gifts ADD COLUMN status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','redeemed','cancelled','expired'));
ALTER TABLE gifts ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX gift_identity ON gifts(id);
CREATE UNIQUE INDEX gift_request ON gifts(buyer_id,request_key);
INSERT INTO migrations VALUES(3,datetime('now'));
