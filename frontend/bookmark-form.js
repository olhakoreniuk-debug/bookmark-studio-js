/** Form validation, preview, bookmark editing, and the Chrome bookmarklet handoff. */
export function createBookmarkForm({ save, refreshCategories, isSignedIn }) {
  const form = document.querySelector("#bookmark-form");
  const message = document.querySelector("#form-message");
  const panel = document.querySelector("#preview-panel");
  const button = document.querySelector("#save-bookmark-button");
  const cancel = document.querySelector("#cancel-edit");
  let editing = null;

  function reset() {
    editing = null;
    form.reset();
    panel.classList.add("is-hidden");
    document.querySelector("#composer-title").textContent = "New link";
    button.lastChild.textContent = " Save bookmark";
    cancel.hidden = true;
  }

  function edit(bookmark) {
    editing = bookmark;
    for (const key of ["url", "title", "description", "cover", "note", "category"]) {
      form.elements[key].value = bookmark[key] || "";
    }
    form.elements.tags.value = (bookmark.tags || []).join(", ");
    document.querySelector("#composer-title").textContent = "Edit bookmark";
    button.lastChild.textContent = " Save changes";
    cancel.hidden = false;
    panel.classList.add("is-hidden");
    message.textContent = "";
    document.querySelector("#composer-title").scrollIntoView({ behavior: "smooth" });
    form.elements.title.focus({ preventScroll: true });
  }

  function preview() {
    if (!form.elements.url.reportValidity()) return;
    const url = form.elements.url.value.trim();
    const domain = new URL(url).hostname.replace(/^www\./, "");
    document.querySelector("#preview-domain").textContent = domain;
    document.querySelector("#preview-copy").textContent =
      form.elements.title.value.trim() || "Add a title, description and your own note below.";
    const cover = form.elements.cover.value.trim();
    document.querySelector("#preview-cover").style.backgroundImage = cover
      ? `linear-gradient(#17332733, #17332766), url("${cover.replaceAll('"', "%22")}")`
      : "";
    panel.classList.remove("is-hidden");
    if (!form.elements.title.value.trim()) {
      form.elements.title.value = domain.charAt(0).toUpperCase() + domain.slice(1);
      form.elements.title.focus();
      form.elements.title.select();
    }
  }

  function formData() {
    return {
      id: editing ? editing.id : crypto.randomUUID(),
      url: form.elements.url.value.trim(),
      title: form.elements.title.value.trim(),
      description: form.elements.description.value.trim(),
      cover: form.elements.cover.value.trim(),
      note: form.elements.note.value.trim(),
      tags: form.elements.tags.value.split(",").map((tag) => tag.trim()).filter(Boolean),
      category: form.elements.category.value,
      createdAt: editing ? editing.createdAt : Date.now(),
      example: false,
    };
  }

  async function submit(event) {
    event.preventDefault();
    if (!isSignedIn() || !form.reportValidity()) return;
    const wasEditing = Boolean(editing);
    button.disabled = true;
    try {
      await save(formData());
      reset();
      message.textContent = wasEditing ? "Bookmark updated successfully." : "Bookmark saved to your library.";
      refreshCategories();
      document.querySelector("#library-title").scrollIntoView({ behavior: "smooth" });
    } catch (error) {
      message.textContent = "Could not save bookmark: " + error.message;
    } finally {
      button.disabled = false;
    }
  }

  function acceptBookmarklet() {
    const params = new URLSearchParams(window.location.search);
    const incoming = params.get("url");
    if (!incoming) return;
    try {
      const url = new URL(incoming);
      if (!["http:", "https:"].includes(url.protocol)) return;
      form.elements.url.value = url.href;
      form.elements.title.value = (params.get("title") || "").slice(0, 300);
      window.history.replaceState(null, "", window.location.pathname + window.location.hash);
      window.addEventListener("load", () => {
        document.querySelector("#composer-title").scrollIntoView({ block: "start" });
      });
    } catch { /* Ignore malformed URLs. */ }
  }

  function initialize() {
    for (const [key, text] of Object.entries({
      url: "Enter a complete URL, including https://",
      title: "Add a title for this bookmark.",
    })) {
      const input = form.elements[key];
      input.addEventListener("invalid", () => input.setCustomValidity(text));
      input.addEventListener("input", () => input.setCustomValidity(""));
    }
    form.addEventListener("submit", submit);
    document.querySelector("#preview-button").addEventListener("click", preview);
    cancel.addEventListener("click", () => { reset(); message.textContent = ""; });
    document.querySelectorAll("[data-focus-form]").forEach((element) => {
      element.addEventListener("click", () => {
        document.querySelector("#composer-title").scrollIntoView({ behavior: "smooth" });
        window.setTimeout(() => form.elements.url.focus(), 400);
      });
    });
    acceptBookmarklet();
  }

  return { initialize, edit, setMessage: (text) => { message.textContent = text; } };
}
