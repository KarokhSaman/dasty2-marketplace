import { useEffect } from "react";
import { useQuery, useConvexAuth } from "convex/react";
import { useRouter } from "@tanstack/react-router";
import { useAuth } from "@clerk/tanstack-react-start";
import { api } from "@/convex/_generated/api";

export function useSellerSession() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  // Seller pages render inside SellerShell, which already waits for the Convex
  // websocket auth — but gate here too so the authed query never runs during the
  // handshake (which would throw "Not authenticated").
  const { isAuthenticated } = useConvexAuth();

  // Read the seller directly over the authenticated Convex connection instead of
  // a /api/seller/me REST round-trip — that fetch re-ran on every seller-tab
  // mount, adding a waterfall before the page's own queries. `getCurrent`
  // returns the seller doc (incl `_id`) or null when there's no record.
  const seller = useQuery(
    api.sellers.getCurrent,
    isSignedIn && isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.navigate({ to: "/seller/login", replace: true });
      return;
    }
    // Authenticated but no seller record for this identity → back to login.
    if (isAuthenticated && seller === null) {
      clearSellerSession().finally(() =>
        router.navigate({ to: "/seller/login", replace: true }),
      );
    }
  }, [isLoaded, isSignedIn, isAuthenticated, seller, router]);

  const loading =
    !isLoaded || (isSignedIn && (!isAuthenticated || seller === undefined));
  return { seller: seller ?? null, loading };
}

export async function clearSellerSession() {
  await fetch("/api/seller/logout", { method: "POST" });
}
