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
  document.querySelector("#shared-title").textContent = bookmark.title;
  document.querySelector("#shared-description").textContent = bookmark.description;
  document.querySelector("#shared-note").textContent = bookmark.note;
  document.querySelector(".card-note").hidden = !bookmark.note;

  const source = safeWebUrl(bookmark.url);
  const link = document.querySelector(".source-link");
  if (source) {
    link.href = source;
    link.hidden = false;
  }
  const cover = safeWebUrl(bookmark.cover);
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
