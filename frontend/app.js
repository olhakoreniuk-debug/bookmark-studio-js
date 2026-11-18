/** Bookmark Studio entry point. Feature logic lives in focused ES modules. */
import { createApiClient } from "./api.js";
import { createAuthentication } from "./auth.js";
import { createCategories } from "./categories.js";
import { createBookmarks } from "./bookmarks.js";
import { createBookmarkForm } from "./bookmark-form.js";

let auth;
let form;
let bookmarks;

const api = createApiClient({ getToken: () => auth?.getToken() });
const categories = createCategories({ onFilter: () => bookmarks?.render() });

bookmarks = createBookmarks({
  api,
  categories,
  isSignedIn: () => auth?.isSignedIn() || false,
  onEdit: (bookmark) => form.edit(bookmark),
});

form = createBookmarkForm({
  save: bookmarks.save,
  refreshCategories: categories.refreshSelect,
  isSignedIn: () => auth?.isSignedIn() || false,
});

auth = createAuthentication({
  verifyOwner: api.verifyOwner,
  onChange: async (signedIn) => {
    bookmarks.render();
    if (signedIn) {
      try {
        await bookmarks.load();
      } catch (error) {
        form.setMessage("Could not load bookmarks: " + error.message);
      }
    }
  },
});

form.initialize();
auth.initialize();
bookmarks.load().catch((error) => {
  console.error("Could not load public bookmarks:", error);
  form.setMessage("Could not load bookmarks: " + error.message);
});
