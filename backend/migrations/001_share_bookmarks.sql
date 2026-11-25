BEGIN;
ALTER TABLE bookmarks_js ADD COLUMN IF NOT EXISTS share_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS bookmarks_js_share_token_idx
  ON bookmarks_js (share_token) WHERE share_token IS NOT NULL;
COMMIT;
