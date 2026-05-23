const cache = new Map();

export function setProductCache(product) {
  if (product?._id) cache.set(product._id, product);
}

export function getProductCache(id) {
  return id ? cache.get(id) ?? null : null;
}

export function seedProductCache(list) {
  if (!list) return;
  for (const p of list) setProductCache(p);
}
