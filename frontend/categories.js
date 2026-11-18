/** Category choices and filtering; only custom category names use localStorage. */
const CATEGORY_KEY = "bookmark-studio:categories";
const DEFAULT_CATEGORIES = ["JOB SEARCH", "WORK", "TECH", "MUSIC", "HOME"];

export function createCategories({ onFilter }) {
  const select = document.querySelector("#category");
  const filters = document.querySelector("#category-filters");
  let active = "All";
  let allBookmarks = [];

  function savedCategories() {
    try {
      const saved = JSON.parse(localStorage.getItem(CATEGORY_KEY));
      return Array.isArray(saved) ? saved : [...DEFAULT_CATEGORIES];
    } catch {
      return [...DEFAULT_CATEGORIES];
    }
  }

  function options() {
    return [...new Set([
      ...savedCategories(),
      ...allBookmarks.map((bookmark) => bookmark.category).filter(Boolean),
    ])];
  }

  function refreshSelect() {
    const selected = select.value;
    select.replaceChildren(new Option("Uncategorized", ""));
    options().forEach((category) => select.add(new Option(category, category)));
    select.value = selected;
  }

  function refreshFilters() {
    filters.replaceChildren();
    ["All", ...options()].forEach((category) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "category-filter";
      button.textContent = category;
      button.classList.toggle("active", category === active);
      button.setAttribute("aria-pressed", String(category === active));
      button.addEventListener("click", () => {
        active = category;
        refreshFilters();
        onFilter();
      });
      filters.appendChild(button);
    });
  }

  function setBookmarks(bookmarks) {
    allBookmarks = bookmarks;
    refreshSelect();
    refreshFilters();
  }

  function show(bookmark) {
    return active === "All" || bookmark.category === active;
  }

  return { setBookmarks, show, refreshSelect, refreshFilters };
}
