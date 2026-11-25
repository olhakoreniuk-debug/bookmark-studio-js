# Bookmark Studio

Bookmark Studio is a public resource catalog curated by a single administrator. Web bookmarks are its first type of entry. Each entry can include a source link, title, description, cover image, notes, tags, and a category. Readers can browse the entire catalog or open an individual entry through a Share link.

[Open the live catalog](https://bookmark-studio-olha.onrender.com/)

## Structure

```text
bookmark-studio-js/
├── frontend/   # Catalog interface and individual bookmark pages
└── backend/    # Node.js HTTP API, PostgreSQL and local JSON storage
```

- [Frontend README](frontend/README.md) — interface, Chrome bookmarklet, and local setup.
- [Backend README](backend/README.md) — API, PostgreSQL schema, and Share migration.

## What works

- add a URL with a link preview;
- manually edit the title, description and optional cover image;
- add notes and tags to bookmarks;
- create categories and organize bookmarks by category;
- browse the public catalog and filter bookmarks by category without signing in;
- sign in with Google as the administrator to add, edit, delete and share bookmarks;
- use the Chrome bookmarklet to open a page in the bookmark form. See [Save from Chrome](frontend/README.md#save-from-chrome);
- share an individual bookmark through a dedicated public link that includes its notes and original source;
- save bookmarks through the API in PostgreSQL, with a JSON file for local development;
- show the newest bookmarks first;
- use the catalog on mobile screens.

## Run locally

Use Node.js 20 or newer. On Windows, open two terminals in the project folder.

**Terminal 1 — API**

```powershell
cd backend
mise exec -- npm install
mise exec -- npm test
mise exec -- npm start
```

The API runs at `http://localhost:8000` by default. Leave `DATABASE_URL` unset to use the local JSON store. The [backend README](backend/README.md) covers PostgreSQL and local Google sign-in configuration.

**Terminal 2 — frontend**

```powershell
cd frontend
python -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080). If you use VS Code Live Server instead, open the address it shows. Stop each local server with `Ctrl+C`.

## Future Development

Bookmark Studio is designed to evolve into an extensible resource management platform.

For a detailed overview of future development directions, planned functionality, architectural considerations and the development roadmap, see [Project Development](PROJECT_DEVELOPMENT.md).
