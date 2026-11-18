/** HTTP communication only: no DOM or authentication state lives here. */
const DEFAULT_URL = "http://localhost:8000/api/bookmarks";

export function createApiClient({
  baseUrl = window.BOOKMARK_API_URL || DEFAULT_URL,
  getToken = () => null,
} = {}) {
  const bookmarksUrl = baseUrl.replace(/\/$/, "");
  const apiRoot = bookmarksUrl.replace(/\/api\/bookmarks$/, "");

  async function request(url, { method = "GET", body } = {}) {
    const token = getToken();
    const response = await fetch(url, {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const payload = response.status === 204 ? null : await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || `API request failed (${response.status}).`);
    }
    return payload;
  }

  return {
    getBookmarks: () => request(bookmarksUrl),
    saveBookmark: (bookmark) => request(bookmarksUrl, { method: "POST", body: bookmark }),
    deleteBookmark: (id) => request(`${bookmarksUrl}/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
    verifyOwner: () => request(`${apiRoot}/api/me`),
    checkHealth: () => request(`${apiRoot}/api/health`),
  };
}
