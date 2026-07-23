import { createContext, useContext, useMemo } from "react";
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

export function SellerSessionProvider({ children }) {
  const { isLoading, isAuthenticated } = useConvexAuth();

  const seller = useQuery(
    api.users.getCurrentSeller,
    isAuthenticated ? {} : "skip",
  );

  // Ready once we know the auth state and (if authenticated) the query resolved.
  const ready = !isLoading && (!isAuthenticated || seller !== undefined);
  const sellerId = seller?._id ?? null;

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
