# Bookmark Studio backend

The backend is a Node.js HTTP API for the public bookmark catalog. It uses PostgreSQL in production and a JSON file for local development. Visitors can read the catalog and open shared bookmarks. The administrator signs in with Google to create, update, delete, and share bookmarks.

## Structure

| File | Responsibility |
| --- | --- |
| `server.js` | Initializes storage and Google authentication, then starts the HTTP server. |
| `api.js` | Defines routes and enforces administrator access where required. |
| `config.js` | Reads environment variables and supplies defaults. |
| `database.js` | Selects the JSON store or initializes a PostgreSQL connection pool. |
| `postgres.js` | Creates the base table and implements PostgreSQL storage. |
| `json-store.js` | Implements local JSON storage, including share-token persistence. |
| `token.js` | Verifies Google ID tokens and matches the verified email to the administrator account. |
| `validation.js` and `utils.js` | Validate bookmark input and handle JSON requests, responses, and CORS headers. |
| `migrations/001_share_bookmarks.sql` | Adds share-token storage and its unique index to PostgreSQL. |
| `*.test.js` | Covers HTTP routes, server startup, and PostgreSQL storage logic. |

## Run locally

Use Node.js 20 or newer. Run these commands from the repository root.

```powershell
cd backend
npm install
npm test
npm start
```

If Node.js is managed by mise, use `mise exec -- npm` in place of `npm`. The API listens at [http://localhost:8000](http://localhost:8000) by default. Leave `DATABASE_URL` unset to use the local `backend/bookmarks.json` file, which is ignored by Git. The JSON store adds a `shareToken` property when a bookmark is first shared.

Use [`.env.example`](.env.example) as a reference. The start script does not load a `.env` file, so set the variables in your shell, VS Code launch configuration, or Render service environment.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection URL. If unset, the API uses JSON storage. |
| `GOOGLE_CLIENT_ID` | Google OAuth web client ID used to verify the ID token's audience. |
| `OWNER_EMAIL` | Verified Google email allowed to perform administrator actions. |
| `ALLOWED_ORIGIN` | Comma-separated frontend origins allowed by CORS. The defaults include `http://localhost:8080` and the local Live Server origins on port 5500. |
| `HOST` | Listen address. Default `0.0.0.0`. |
| `PORT` | Listen port. Default `8000`. |
| `DATA_PATH` | Optional path to the local JSON file. Default `bookmarks.json` in the backend directory. |

For local Google sign-in, configure the frontend and backend with the same web client ID and authorize the frontend origin in the Google OAuth client. See the [frontend README](../frontend/README.md).

## PostgreSQL schema

The API stores one row per bookmark in `bookmarks_js`. On startup, it creates the base table if needed and adds `category` if an older table lacks it. The Share migration adds `share_token` separately.

| Column | PostgreSQL type | Constraints and purpose |
| --- | --- | --- |
| `id` | `TEXT` | Primary key. The API generates a UUID when the request supplies no ID. |
| `url` | `TEXT` | Required source URL. The API accepts HTTP and HTTPS. |
| `title` | `TEXT` | Required bookmark title. |
| `description` | `TEXT` | Required column with an empty-string default. |
| `cover` | `TEXT` | Cover image reference. Required column with an empty-string default. |
| `note` | `TEXT` | Saved note. Required column with an empty-string default. |
| `tags` | `JSONB` | Required column with an empty-array default. The API stores a list of tag strings. |
| `created_at` | `BIGINT` | Required timestamp in milliseconds since the Unix epoch. Exposed as `createdAt` in the API. |
| `category` | `TEXT` | Required column with an empty-string default. |
| `share_token` | `TEXT` | Nullable. Set on first share. The partial unique index `bookmarks_js_share_token_idx` covers non-null tokens. |

## API routes

Administrator routes expect `Authorization: Bearer <Google ID token>`. The API verifies the token audience, the verified email claim, and the configured owner email.

| Method and route | Access | Result |
| --- | --- | --- |
| `GET /api/health` | Public | Checks storage connectivity and identifies the active storage mode. |
| `GET /api/bookmarks` | Public | Lists bookmarks newest first. |
| `GET /api/me` | Administrator | Confirms that the signed-in Google account is authorized. |
| `POST /api/bookmarks` | Administrator | Creates a bookmark or updates the bookmark with the same ID. |
| `DELETE /api/bookmarks/:id` | Administrator | Deletes the selected bookmark. |
| `POST /api/bookmarks/:id/share` | Administrator | Creates or returns the bookmark's existing share token. |
| `GET /api/shared/:token` | Public | Returns one bookmark's public details. Invalid or unknown tokens return `404`. |

## How Share works

1. The **Share** button calls `POST /api/bookmarks/:id/share`. On first use, the API stores a token generated from 32 random bytes and encoded as 64 hexadecimal characters. Subsequent clicks return the same token.
2. The frontend copies a link to `share.html?token=…`. The share page calls `GET /api/shared/:token` and displays the title, description, cover, source URL, note, tags, and category when available.
3. Edits keep the same token and show up at the same link. Deleting the bookmark makes the shared URL return a not-found response.

The full collection is already public. Sharing provides a direct URL for one bookmark. During normal collection reads, the API omits stored share tokens.

## Apply the Share migration

The [Share migration](migrations/001_share_bookmarks.sql) runs in one transaction. It adds a nullable `share_token` column and creates a unique index for non-null tokens. Existing bookmark data is preserved. Bookmarks acquire a token when the administrator first uses **Share**. The script can be run again because both schema statements use `IF NOT EXISTS`.

- **Existing PostgreSQL database** — apply the migration before starting or redeploying the Share-enabled API. Point the PostgreSQL client at the same database the API uses. If running the command outside Render, use a connection URL reachable from that machine.
- **Empty PostgreSQL database** — start the API once to create the base table, then stop it, run the migration, and restart the API before testing Share.
- **Local JSON storage** — start the API normally. The SQL migration is for PostgreSQL.

From the repository root, with `psql` installed and a reachable connection URL set as `DATABASE_URL` in the current PowerShell session, run:

```powershell
psql --dbname="$env:DATABASE_URL" --set=ON_ERROR_STOP=1 --file="backend/migrations/001_share_bookmarks.sql"
```

After migration, open an existing bookmark as the administrator and click **Share**. Open the copied link in a private window to verify public access. Share the same bookmark again and confirm that the URL stays the same. Use a disposable bookmark to verify that deleting it invalidates its link. The health endpoint checks connectivity, so use the Share flow to verify the schema change.

## Tests

Run `npm test` in `backend/`. The automated tests cover public and administrator routes, validation, CORS, and the Share link lifecycle. PostgreSQL tests use a mocked pool. Verify the migration against a real PostgreSQL instance using the steps above.
