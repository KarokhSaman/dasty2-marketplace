import { createContext, useContext, useMemo, useRef, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { hasSessionToken, useKeepConvexAuth } from "@/lib/session";

// Global seller session, now sourced from the VerifySpeed JWT session over the
// authenticated Convex connection (no more Clerk hook or /api/seller/me fetch).
// `sellerId` is derived from the live `getCurrentSeller` query — it stays in sync
// reactively. The setter/refresh are compatibility no-ops kept so existing call
// sites don't break; login/logout do a hard navigation, re-running the query with
// the fresh cookie.
const SellerSessionCtx = createContext({
  sellerId: null,
  setSellerId: () => {},
  ready: false,
  authError: null,
  refreshSellerSession: () => {},
});

// `initialSeller` is what the server found while rendering the page ({_id},
// null for "not a seller", undefined if unknown). It is used until the live
// query answers, so the header knows the seller from the first paint.
export function SellerSessionProvider({ children, initialSeller }) {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [initial] = useState(initialSeller);
  useKeepConvexAuth();

  const seller = useQuery(
    api.users.getCurrentSeller,
    isAuthenticated ? {} : "skip",
  );

  // The server's answer for a logged-in tab.
  const live = isAuthenticated && seller !== undefined;
  // Logged out for real: auth settled and this tab holds no session.
  const signedOut = !isLoading && !isAuthenticated && !hasSessionToken();
  // While Convex is (re)connecting or recovering a dropped login, keep the
  // last seller we knew, so the header and bottom bar don't flip to the
  // visitor version and back.
  const lastSeller = useRef(initial?._id ?? null);
  if (live) lastSeller.current = seller?._id ?? null;
  const ready = live || signedOut || initial !== undefined;
  const sellerId = live ? (seller?._id ?? null) : signedOut ? null : lastSeller.current;

  const value = useMemo(
    () => ({
      sellerId,
      setSellerId: () => {},
      ready,
      authError: null,
      refreshSellerSession: () => {},
    }),
    [sellerId, ready],
  );

  return (
    <SellerSessionCtx.Provider value={value}>
      {children}
    </SellerSessionCtx.Provider>
  );
}

export function useGlobalSellerSession() {
  return useContext(SellerSessionCtx);
}
