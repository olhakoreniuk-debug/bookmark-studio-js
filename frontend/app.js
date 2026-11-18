let googleIdToken = null;
const STORAGE_KEY = "bookmark-studio:bookmarks";

const DELETED_KEY = "bookmark-studio:deleted-ids";
const CATEGORIES_KEY = "bookmark-studio:categories";

const DEFAULT_CATEGORIES = [
  "JOB SEARCH",
  "WORK",
  "TECH",
  "MUSIC",
  "HOME"
];
const API_URL = window.BOOKMARK_API_URL || "http://localhost:8000/api/bookmarks";

const exampleBookmark = {
  id: "example-barcelona",
  url: "https://www.barcelonaturisme.com/wv3/en/",
  title: "Barcelona beyond the postcards: architecture, sea and quiet squares",
  description: "A practical city guide, from modernist neighbourhoods to local markets and walks along the sea.",
  cover: "https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80",
  note: "Revisit before the trip, especially the route through Gràcia and the list of smaller museums.",
  tags: ["Barcelona", "travel", "architecture"],
  createdAt: 0,
  example: true,
};
let publicBookmarks = [];
let activeCategory = "All";
let editingBookmark = null;
const form = document.querySelector("#bookmark-form");

// The Chrome bookmarklet opens this page with ?url=...&title=...
const incoming = new URLSearchParams(window.location.search);
const incomingUrl = incoming.get("url");
if (incomingUrl) {
  try {
    const parsed = new URL(incomingUrl);
    if (["https:", "http:"].includes(parsed.protocol)) {
      form.elements.url.value = parsed.href;
      form.elements.title.value = (incoming.get("title") || "").slice(0, 300);
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
      window.addEventListener("load", () => document.querySelector("#composer-title").scrollIntoView({block:"start"}));
    }
  } catch { /* Ignore invalid incoming URLs. */ }
}

const list = document.querySelector("#bookmark-list");
const template = document.querySelector("#bookmark-template");
const previewButton = document.querySelector("#preview-button");
const previewPanel = document.querySelector("#preview-panel");
const formMessage = document.querySelector("#form-message");

const validationMessages = {
  url: "Enter a complete URL, including https://",
  title: "Add a title for this bookmark.",
};

Object.entries(validationMessages).forEach(([fieldName, message]) => {
  const field = form.elements[fieldName];
  field.addEventListener("invalid", () => field.setCustomValidity(message));
  field.addEventListener("input", () => field.setCustomValidity(""));
});

function readCategories() {
  try {
    const saved = JSON.parse(localStorage.getItem(CATEGORIES_KEY));

    if (Array.isArray(saved)) {
      return saved;
    }
  } catch (error) {
    console.error("Could not read categories:", error);
  }

  return [...DEFAULT_CATEGORIES];
}

function saveCategories(categories) {
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
}
function populateCategorySelect() {
  const select = document.querySelector("#category");
  const selectedCategory = select.value;

  select.replaceChildren(new Option("Uncategorized", ""));

  readCategories().forEach((category) => {
    select.add(new Option(category, category));
  });

  select.value = selectedCategory;
}
function renderCategoryFilters() {
  const container = document.querySelector("#category-filters");
  if (!container) return;

  container.replaceChildren();

  const categories = ["All", ...new Set([...readCategories(), ...publicBookmarks.map((b) => b.category).filter(Boolean)])];

  categories.forEach((category) => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "category-filter";
    button.textContent = category;

    button.addEventListener("click", () => {
      container.querySelectorAll(".category-filter").forEach((btn) => {
        btn.classList.remove("active");
      });

      button.classList.add("active");
      activeCategory = category;
render();
    });

    if (category === "All") {
      button.classList.add("active");
    }

    container.appendChild(button);
  });
}
function readBookmarks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function deletedIds() {
  try { return new Set(JSON.parse(localStorage.getItem(DELETED_KEY)) || []); }
  catch { return new Set(); }
}
function saveDeletedId(id) {
  const ids = deletedIds();
  ids.add(id);
  localStorage.setItem(DELETED_KEY, JSON.stringify([...ids]));
}
function saveLocalBookmarks(bookmarks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

async function requestApi(path = "", options = {}) {
  if (!googleIdToken && options.method && options.method !== "GET") throw new Error("Sign in with Google first.");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(googleIdToken ? { "Authorization": `Bearer ${googleIdToken}` } : {}), ...options.headers },
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "The bookmark API returned an error.");
  return payload;
}

async function syncWithBackend() {
  // Never silently publish browser-only bookmarks or overwrite local data.
  try {
    publicBookmarks = await requestApi();
    renderCategoryFilters();
    render();
  } catch (error) {
    formMessage.textContent = "Could not load bookmarks: " + error.message;
  }
}

async function deleteBookmark(bookmark, button) {
  if (!window.confirm(`Delete "${bookmark.title}" permanently?`)) return;
  button.disabled = true;
  try {
    await requestApi("/" + encodeURIComponent(bookmark.id), { method: "DELETE" });
    saveDeletedId(bookmark.id);
    saveLocalBookmarks(readBookmarks().filter((item) => item.id !== bookmark.id));
    publicBookmarks = publicBookmarks.filter((item) => item.id !== bookmark.id);
    render();
  } catch (error) {
    button.disabled = false;
    window.alert("Could not delete bookmark: " + error.message);
  }
}

function resetEditMode() {
  editingBookmark = null;
  document.querySelector("#composer-title").textContent = "New link";
  document.querySelector("#save-bookmark-button").lastChild.textContent = " Save bookmark";
  document.querySelector("#cancel-edit").hidden = true;
  form.reset();
  previewPanel.classList.add("is-hidden");
}

function startEditing(bookmark) {
  editingBookmark = bookmark;
  form.elements.url.value = bookmark.url;
  form.elements.title.value = bookmark.title;
  form.elements.description.value = bookmark.description || "";
  form.elements.cover.value = bookmark.cover || "";
  form.elements.note.value = bookmark.note || "";
  form.elements.tags.value = (bookmark.tags || []).join(", ");
  form.elements.category.value = bookmark.category || "";
  document.querySelector("#composer-title").textContent = "Edit bookmark";
  document.querySelector("#save-bookmark-button").lastChild.textContent = " Save changes";
  document.querySelector("#cancel-edit").hidden = false;
  previewPanel.classList.add("is-hidden");
  formMessage.textContent = "";
  document.querySelector("#composer-title").scrollIntoView({ behavior: "smooth", block: "start" });
  form.elements.title.focus({ preventScroll: true });
}

document.querySelector("#cancel-edit").addEventListener("click", () => {
  resetEditMode();
  formMessage.textContent = "";
});

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

function wordForBookmarks(count) {
  return count === 1 ? "bookmark" : "bookmarks";
}

function createCard(bookmark) {
  const card = template.content.cloneNode(true);
  const image = card.querySelector("img");
  const fallback = card.querySelector(".cover-fallback");
  const badge = card.querySelector(".example-badge");

  if (bookmark.cover) {
    image.src = bookmark.cover;
    image.alt = `Cover image: ${bookmark.title}`;
    image.addEventListener("error", () => {
      image.hidden = true;
      fallback.hidden = false;
    });
    fallback.hidden = true;
  } else {
    image.hidden = true;
  }

  badge.hidden = !bookmark.example;
  card.querySelector(".card-domain").textContent = domainFromUrl(bookmark.url);
  card.querySelector("h3").textContent = bookmark.title;
  card.querySelector(".card-description").textContent = bookmark.description || "Saved link without a description.";
  card.querySelector(".card-note p").textContent = bookmark.note || "";

  const tags = card.querySelector(".tag-list");
  bookmark.tags.forEach((tag) => {
    const element = document.createElement("span");
    element.className = "tag";
    element.textContent = `# ${tag}`;
    tags.append(element);
  });

  const editButton = card.querySelector(".edit-bookmark");
  editButton.hidden = Boolean(bookmark.example) || !googleIdToken;
  if (!bookmark.example) {
    editButton.addEventListener("click", () => startEditing(bookmark));
  }
  const deleteButton = card.querySelector(".delete-bookmark");
  deleteButton.hidden = Boolean(bookmark.example) || !googleIdToken;
  if (!bookmark.example) {
    deleteButton.addEventListener("click", () => deleteBookmark(bookmark, deleteButton));
  }
  const link = card.querySelector(".source-link");
  link.href = bookmark.url;
  link.setAttribute("aria-label", `Open source: ${bookmark.title}`);
  return card;
}

function render() {
  const bookmarks = publicBookmarks.sort((a, b) => b.createdAt - a.createdAt);
  const allBookmarks = [...bookmarks, exampleBookmark];
  const visibleBookmarks = activeCategory === "All" ? allBookmarks : allBookmarks.filter((bookmark) => bookmark.category === activeCategory);
  list.replaceChildren(...visibleBookmarks.map(createCard));
  document.querySelector("#bookmark-count").textContent = allBookmarks.length;
  document.querySelector("#bookmark-word").textContent = wordForBookmarks(allBookmarks.length);
}

function showPreview() {
  const url = form.url.value.trim();
  if (!form.url.reportValidity()) return;

  const domain = domainFromUrl(url);
  document.querySelector("#preview-domain").textContent = domain;
  document.querySelector("#preview-copy").textContent = form.title.value.trim() || "Add a title, description and your own note below.";
  const cover = form.cover.value.trim();
  const previewCover = document.querySelector("#preview-cover");
  previewCover.style.backgroundImage = cover ? `linear-gradient(#17332733, #17332766), url("${cover.replaceAll('"', "%22")}")` : "";
  previewPanel.classList.remove("is-hidden");

  if (!form.title.value.trim()) {
    form.title.value = domain.charAt(0).toUpperCase() + domain.slice(1);
    form.title.focus();
    form.title.select();
  }
}

previewButton.addEventListener("click", showPreview);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!googleIdToken) return;
  if (!form.reportValidity()) return;

  const isEditing = Boolean(editingBookmark);
  const bookmark = {
    id: isEditing ? editingBookmark.id : (crypto.randomUUID ? crypto.randomUUID() : String(Date.now())),
    url: form.url.value.trim(),
    title: form.title.value.trim(),
    description: form.description.value.trim(),
    cover: form.cover.value.trim(),
    note: form.note.value.trim(),
    tags: form.tags.value.split(",").map((tag) => tag.trim()).filter(Boolean),
    category: form.elements.category.value,
    createdAt: isEditing ? editingBookmark.createdAt : Date.now(),
    example: false,
  };

  const saveButton = document.querySelector("#save-bookmark-button");
  saveButton.disabled = true;
  try {
    await requestApi("", { method: "POST", body: JSON.stringify(bookmark) });
  } catch (error) {
    formMessage.textContent = "Could not save bookmark: " + error.message;
    saveButton.disabled = false;
    return;
  }
  saveButton.disabled = false;
  try {
    publicBookmarks = await requestApi();
  } catch (error) {
    publicBookmarks = publicBookmarks.filter((item) => item.id !== bookmark.id).concat(bookmark);
  }
  resetEditMode();
  formMessage.textContent = isEditing ? "Bookmark updated successfully." : "Bookmark saved to your library.";
  renderCategoryFilters();
  render();
  document.querySelector("#library-title").scrollIntoView({ behavior: "smooth", block: "start" });
  window.setTimeout(() => { formMessage.textContent = ""; }, 5000);
});

document.querySelectorAll("[data-focus-form]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector("#composer-title").scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => form.url.focus(), 400);
  });
});
populateCategorySelect();
renderCategoryFilters();
const privateSections = [
  document.querySelector('section[aria-labelledby="chrome-title"]'),
  document.querySelector('section[aria-labelledby="composer-title"]'),
  null // Public visitors can filter bookmarks too
];
function setSignedIn(signedIn) {
  privateSections.forEach((section) => { if (section) section.hidden = !signedIn; });
  document.querySelectorAll("[data-focus-form]").forEach((button) => { button.hidden = !signedIn; });
  document.querySelector("#signout-button").hidden = !signedIn;
  document.querySelector("#google-signin").hidden = signedIn;
}
window.handleGoogleCredential = async ({ credential }) => {
  googleIdToken = credential;
  // Do not display or upload browser-stored private data before Google sign-in.
  try {
    const response = await fetch(`${API_URL.slice(0, -"/api/bookmarks".length)}/api/me`, {headers: {"Authorization": `Bearer ${googleIdToken}`}});
    if (!response.ok) throw new Error("Google account not authorized.");
  } catch (error) {
    googleIdToken = null;
    window.alert("Google account not authorized: " + error.message);
    return;
  }
  setSignedIn(true);
  render();
  await syncWithBackend();
};
document.querySelector("#signout-button").addEventListener("click", () => {
  googleIdToken = null;
  if (window.google?.accounts?.id) google.accounts.id.disableAutoSelect();
  setSignedIn(false);
  render();
});
setSignedIn(false);
render(); // Public visitors can view all server-stored bookmarks.
requestApi().then((bookmarks) => { publicBookmarks = bookmarks; renderCategoryFilters(); render(); }).catch((error) => console.error("Could not load public bookmarks:", error));
if (window.BOOKMARK_GOOGLE_CLIENT_ID && window.google?.accounts?.id) {
  google.accounts.id.initialize({
    client_id: window.BOOKMARK_GOOGLE_CLIENT_ID,
    callback: window.handleGoogleCredential,
    auto_select: false,
  });
  google.accounts.id.renderButton(document.querySelector("#google-signin"), {
    theme: "outline", size: "medium", text: "signin_with",
  });
} else {
  document.querySelector("#google-signin").textContent = "Google sign-in unavailable. Refresh the page.";
}
