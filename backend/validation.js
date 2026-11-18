import { randomUUID } from "node:crypto";

export function validateBookmark(payload = {}) {
  const url = String(payload.url || "").trim();
  const title = String(payload.title || "").trim();
  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Enter a complete URL using http:// or https://.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol) || !parsedUrl.hostname) {
    throw new Error("Enter a complete URL using http:// or https://.");
  }
  if (!title) throw new Error("A bookmark title is required.");
  if (!Array.isArray(payload.tags ?? [])) throw new Error("Tags must be a list.");

  const createdAt = Number(payload.createdAt || Date.now());
  if (!Number.isFinite(createdAt)) throw new Error("createdAt must be a number.");

  return {
    id: String(payload.id || randomUUID()),
    url,
    title,
    description: String(payload.description || "").trim(),
    cover: String(payload.cover || "").trim(),
    note: String(payload.note || "").trim(),
    tags: (payload.tags || []).map((tag) => String(tag).trim()).filter(Boolean),
    createdAt: Math.trunc(createdAt),
    category: String(payload.category || "").trim(),
    example: false,
  };
}
