/** Card presentation only; actions are supplied by the bookmark controller. */
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

function domainFromUrl(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

function createCard(bookmark, { signedIn, onEdit, onDelete, onShare }) {
  const card = document.querySelector("#bookmark-template").content.cloneNode(true);
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
  (bookmark.tags || []).forEach((tag) => {
    const element = document.createElement("span");
    element.className = "tag";
    element.textContent = `# ${tag}`;
    tags.appendChild(element);
  });

  const edit = card.querySelector(".edit-bookmark");
  const remove = card.querySelector(".delete-bookmark");
  const share = card.querySelector(".share-bookmark");
  edit.hidden = remove.hidden = share.hidden = Boolean(bookmark.example) || !signedIn;
  if (!share.hidden) {
    edit.addEventListener("click", () => onEdit(bookmark));
    remove.addEventListener("click", () => onDelete(bookmark, remove));
    const field = card.querySelector(".share-url");
    const status = card.querySelector(".share-status");
    share.addEventListener("click", async () => {
      share.disabled = true;
      status.textContent = "Preparing link…";
      try {
        field.value = await onShare(bookmark);
        try {
          await navigator.clipboard.writeText(field.value);
          field.hidden = true;
          status.textContent = "Link copied.";
        } catch {
          field.hidden = false;
          field.focus();
          field.select();
          status.textContent = "Copy the selected link manually.";
        }
      } catch {
        status.textContent = "Could not create the share link. Please try again.";
      } finally {
        share.disabled = false;
      }
    });
  }
  const source = card.querySelector(".source-link");
  source.href = bookmark.url;
  source.setAttribute("aria-label", `Open source: ${bookmark.title}`);
  return card;
}

export function renderBookmarkCards({ bookmarks, show, signedIn, onEdit, onDelete, onShare }) {
  const all = [...bookmarks].sort((a, b) => b.createdAt - a.createdAt);
  all.push(exampleBookmark);
  const visible = all.filter(show);
  const cards = visible.map((bookmark) => createCard(bookmark, {
    signedIn, onEdit, onDelete, onShare,
  }));
  document.querySelector("#bookmark-list").replaceChildren(...cards);
  document.querySelector("#bookmark-count").textContent = String(all.length);
  document.querySelector("#bookmark-word").textContent = all.length === 1 ? "bookmark" : "bookmarks";
}
