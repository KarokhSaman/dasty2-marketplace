import { useEffect, useState } from "react";

// Products a buyer opened, kept on their own phone (no account needed), newest
// first.
const RECENT_KEY = "mndallan-recent";
const MAX = 12;

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "") ?? fallback;
  } catch {
    return fallback;
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private mode or storage full: just don't remember
  }
}

export function rememberProduct(p) {
  if (!p?._id) return;
  const main = p.photos?.[p.mainPhotoIndex ?? 0] ?? p.photos?.[0] ?? null;
  const entry = { id: p._id, title: p.title, photo: main, price: p.price };
  const list = read(RECENT_KEY, []).filter((x) => x.id !== p._id);
  write(RECENT_KEY, [entry, ...list].slice(0, MAX));
}

export function useRecentlyViewed() {
  const [items, setItems] = useState([]);
  useEffect(() => setItems(read(RECENT_KEY, [])), []);
  return items;
}
