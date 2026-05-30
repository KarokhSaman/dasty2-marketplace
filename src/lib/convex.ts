/// <reference types="vite/client" />

// The Convex deployment URL is public — the browser uses the same value via
// VITE_CONVEX_URL. Source it from Vite's build-time inlined value so server
// functions always have it, independent of the Worker's runtime env.
// (Mirrors how the psoola app wires its Convex URL.)
export function convexServerOptions(token?: string | null) {
  const url = import.meta.env.VITE_CONVEX_URL;

  return {
    ...(url ? { url } : {}),
    ...(token ? { token } : {}),
  };
}
