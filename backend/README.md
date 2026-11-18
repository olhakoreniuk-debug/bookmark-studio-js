# Bookmark Studio backend (Node.js)

The API uses PostgreSQL in production and a local JSON file when `DATABASE_URL` is not set.

## Local run

```powershell
cd backend
npm install
npm test
npm start
```

The API starts at `http://localhost:8000`. Local data is written to `bookmarks.json`, which is ignored by Git.

Copy `.env.example` to `.env` only as a reference. Node does not load `.env` automatically; set the values in PowerShell or in VS Code's launch configuration. Never commit real secrets.

## Environment variables

- `DATABASE_URL` — PostgreSQL connection URL used on Render;
- `ALLOWED_ORIGIN` — comma-separated frontend origins;
- `GOOGLE_CLIENT_ID` — Google OAuth web client ID;
- `OWNER_EMAIL` — the only Google account allowed to modify bookmarks;
- `HOST` — defaults to `0.0.0.0`;
- `PORT` — defaults to `8000`.

## Endpoints

- `GET /api/health` — database health check;
- `GET /api/me` — validate owner authentication;
- `GET /api/bookmarks` — public list, newest first;
- `POST /api/bookmarks` — owner-only create/update;
- `DELETE /api/bookmarks/:id` — owner-only delete.

The JSON fallback is for local development only. Use PostgreSQL on Render.


