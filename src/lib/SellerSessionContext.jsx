import { createContext, useContext, useMemo, useState } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

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

  const seller = useQuery(
    api.users.getCurrentSeller,
    isAuthenticated ? {} : "skip",
  );

  // Live answer once we know the auth state and (if authenticated) the query resolved.
  const liveReady = !isLoading && (!isAuthenticated || seller !== undefined);
  const ready = liveReady || initial !== undefined;
  const sellerId = liveReady ? (seller?._id ?? null) : (initial?._id ?? null);

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
