# Bookmark Studio frontend

The frontend is the public interface for the Bookmark Studio resource catalog. Readers can browse the full collection, filter bookmarks by category, and open an individual bookmark through a Share link. One administrator signs in with Google to manage the collection.

## Structure

```text
frontend/
├── index.html   # Public collection and administrator form
├── share.html   # Public page for one shared bookmark
├── styles.css   # Styles for both pages
└── *.js         # Entry point and focused modules in this directory
```

### Module responsibilities

| File | Responsibility |
| --- | --- |
| `app.js` | Initializes and connects the collection, form, category filters, API client, and sign-in. |
| `config.js` | Selects the local or Render API and supplies the public Google client ID. |
| `api.js` | Sends HTTP requests, adds the Google credential when available, and handles API responses. |
| `auth.js` | Initializes Google sign-in and asks the API to verify that the account is the administrator. |
| `bookmarks.js` | Loads and saves bookmarks, coordinates collection updates, and builds Share URLs from API tokens. |
| `bookmark-cards.js` | Renders collection cards and wires their edit, delete, and Share controls, including link copying. |
| `bookmark-form.js` | Handles add and edit forms, link previews, category creation, and the bookmarklet handoff. |
| `categories.js` | Builds category choices and filters the visible collection. |
| `bookmarklet.js` | Builds the browser bookmarklet for passing a page URL and title to the form. |
| `share.js` | Reads the URL token, requests one bookmark, and renders its details or an error. |

## What works

- browse the collection and filter it by category without signing in;
- sign in with Google as the administrator to add, edit, delete, and share bookmarks;
- open a website in the **New link** form with its URL and title prefilled using the Chrome bookmarklet;
- preview a URL and enter a title, description, optional cover image, notes, and tags;
- create custom categories and assign bookmarks to them;
- copy a link that opens a single bookmark with its source link and saved details.

Custom category names are stored in the current browser. Once a bookmark is saved with a category, that category is stored with the bookmark and appears in the collection's category choices. Tags are shown on entries. The homepage's filter buttons use categories.

## Save from Chrome

1. Open Bookmark Studio in Chrome. If the bookmarks bar is hidden, press `Ctrl+Shift+B` on Windows or `Cmd+Shift+B` on Mac.
2. In **Save from Chrome**, drag **Save to Bookmark Studio** onto the bookmarks bar.
3. Open a regular website you want to save and click the bookmarklet on the bar. Bookmark Studio opens in a new tab with the page URL and title prefilled in the **New link** form.
4. If prompted, sign in with the administrator's Google account. Review the prefilled details, add any notes, tags, or category, and click **Save bookmark**. The saved page then appears in the collection.

The bookmarklet works on regular HTTP and HTTPS pages. Chrome internal pages such as `chrome://settings` are excluded.

## How the pages communicate with the API

The collection loads with `GET /api/bookmarks`. After Google sign-in, the frontend asks the API to verify administrator access before showing management controls. The backend independently checks authorization for write requests.

When the administrator clicks **Share**, the frontend sends `POST /api/bookmarks/:id/share` and builds a URL in the form `share.html?token=…`. The share page calls `GET /api/shared/:token` without requiring sign-in. It displays the title, description, cover, source URL, notes, tags, and category when available. Saved edits appear at the same URL. Deleting the bookmark makes the URL unavailable.

## Run locally

Start the API using the instructions in the [backend README](../backend/README.md). From the repository root, open a second terminal and serve the frontend over HTTP.

```powershell
cd frontend
python -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080). The frontend uses the local API at `http://localhost:8000`. VS Code Live Server on port 5500 also works with the default backend CORS settings. For administrator actions, the frontend origin must be authorized for the Google web client.

## Accessibility and manual checks

The bookmark form associates labels with inputs, including a visually hidden label for the URL field. Category buttons expose their selected state through `aria-pressed`.

1. Open the collection without signing in. Switch categories and return to **All**.
2. Sign in as the administrator. Use a test bookmark with a cover image, notes, tags, and a category. Click **Share** and copy the URL.
3. Open the URL in a private window and confirm that it shows one bookmark, its saved details, and a working source link. Check it at a narrow viewport.
4. Use the bookmarklet from a regular website while signed out. Sign in with Google, confirm the page URL and title in the form, and save the bookmark. Check that it appears in the collection.
5. Tab through the form and category controls to check that they can be reached and operated by keyboard.
