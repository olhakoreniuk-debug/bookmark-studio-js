/** Public bookmark collection and owner-only card actions. */
import { renderBookmarkCards } from "./bookmark-cards.js";

export function createBookmarks({ api, categories, isSignedIn, onEdit }) {
  let bookmarks = [];

  function render() {
    renderBookmarkCards({
      bookmarks,
      show: categories.show,
      signedIn: isSignedIn(),
      onEdit,
      onDelete: deleteBookmark,
      onShare: shareBookmark,
    });
  }

  async function load() {
    bookmarks = await api.getBookmarks();
    categories.setBookmarks(bookmarks);
    render();
  }

  async function shareBookmark(bookmark) {
    const { token } = await api.shareBookmark(bookmark.id);
    const url = new URL("./share.html", window.location.href);
    url.searchParams.set("token", token);
    return url.href;
  }

  async function deleteBookmark(bookmark, button) {
    if (!window.confirm(`Delete "${bookmark.title}" permanently?`)) return;
    button.disabled = true;
    try {
      await api.deleteBookmark(bookmark.id);
      bookmarks = bookmarks.filter((item) => item.id !== bookmark.id);
      categories.setBookmarks(bookmarks);
      render();
    } catch (error) {
      button.disabled = false;
      window.alert("Could not delete bookmark: " + error.message);
    }
  }

  async function save(bookmark) {
    await api.saveBookmark(bookmark);
    try {
      await load();
    } catch {
      // The save succeeded; keep the latest item visible during a transient read error.
      bookmarks = bookmarks.filter((item) => item.id !== bookmark.id).concat(bookmark);
      categories.setBookmarks(bookmarks);
      render();
    }
  }

  return { render, load, save };
}
