import { createApiClient } from "./api.js";

function safeWebUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function renderBookmark(bookmark) {
  const category = document.querySelector("#shared-category");
  category.textContent = bookmark.category || "";
  category.hidden = !bookmark.category;
  document.querySelector("#shared-title").textContent = bookmark.title;
  document.querySelector("#shared-description").textContent = bookmark.description;
  document.querySelector("#shared-note").textContent = bookmark.note;
  document.querySelector(".card-note").hidden = !bookmark.note;

  const tags = document.querySelector(".tag-list");
  for (const tag of bookmark.tags || []) {
    const label = document.createElement("span");
    label.className = "tag";
    label.textContent = `# ${tag}`;
    tags.append(label);
  }

  const source = safeWebUrl(bookmark.url);
  const link = document.querySelector(".source-link");
  if (source) {
    link.href = source;
    link.textContent = bookmark.url;
    link.hidden = false;
  }
  const cover = /^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z0-9+/=]+$/i.test(bookmark.cover)
    ? bookmark.cover
    : safeWebUrl(bookmark.cover);
  const image = document.querySelector("#shared-cover");
  if (cover) {
    image.addEventListener("error", () => { image.hidden = true; }, { once: true });
    image.alt = `Cover image: ${bookmark.title}`;
    image.hidden = false;
    image.src = cover;
  }
  document.querySelector("article").hidden = false;
}

const status = document.querySelector("#share-status");
const token = new URLSearchParams(window.location.search).get("token");
if (!token || !/^[a-f0-9]{64}$/.test(token)) {
  status.textContent = "This share link is invalid.";
} else {
  try {
    renderBookmark(await createApiClient().getSharedBookmark(token));
    status.textContent = "";
  } catch (error) {
    status.textContent = error.status === 404
      ? "This shared bookmark is unavailable."
      : "Could not load the shared bookmark. Please try again.";
  }
}
