export class PostgresBookmarkStore {
  constructor(pool) {
    this.pool = pool;
  }

  async initialize() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS bookmarks_js (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        cover TEXT NOT NULL DEFAULT '',
        note TEXT NOT NULL DEFAULT '',
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at BIGINT NOT NULL,
        category TEXT NOT NULL DEFAULT ''
      )
    `);
    await this.pool.query(
      "ALTER TABLE bookmarks_js ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT ''",
    );
  }

  static #fromRow(row) {
    return {
      id: row.id,
      url: row.url,
      title: row.title,
      description: row.description,
      cover: row.cover,
      note: row.note,
      tags: row.tags,
      createdAt: Number(row.created_at),
      category: row.category,
      example: false,
    };
  }

  async list() {
    const { rows } = await this.pool.query(
      "SELECT * FROM bookmarks_js ORDER BY created_at DESC",
    );
    return rows.map(PostgresBookmarkStore.#fromRow);
  }

  async upsert(bookmark) {
    const values = [
      bookmark.id, bookmark.url, bookmark.title, bookmark.description,
      bookmark.cover, bookmark.note, JSON.stringify(bookmark.tags),
      bookmark.createdAt, bookmark.category,
    ];
    await this.pool.query(
      `INSERT INTO bookmarks_js
        (id, url, title, description, cover, note, tags, created_at, category)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
        url = EXCLUDED.url, title = EXCLUDED.title,
        description = EXCLUDED.description, cover = EXCLUDED.cover,
        note = EXCLUDED.note, tags = EXCLUDED.tags,
        created_at = EXCLUDED.created_at, category = EXCLUDED.category`,
      values,
    );
    return bookmark;
  }

  async delete(id) {
    const result = await this.pool.query("DELETE FROM bookmarks_js WHERE id = $1", [id]);
    return result.rowCount > 0;
  }

  async share(id, candidate) {
    const { rows } = await this.pool.query(
      `UPDATE bookmarks_js SET share_token = COALESCE(share_token, $2)
       WHERE id = $1 RETURNING share_token`,
      [id, candidate],
    );
    return rows[0]?.share_token;
  }

  async findShared(token) {
    const { rows } = await this.pool.query(
      "SELECT title, description, cover, url, note, tags, category FROM bookmarks_js WHERE share_token = $1",
      [token],
    );
    return rows[0];
  }

  async health() {
    await this.pool.query("SELECT 1");
  }
}
