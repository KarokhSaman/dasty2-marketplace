import { useEffect } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "@tanstack/react-router";
import { api } from "@/convex/_generated/api";

// Seller session over the VerifySpeed JWT connection. Reads the seller doc via
// the authenticated Convex query. It only bounces to login when Convex has
// confirmed the identity and there's no seller record for it — a websocket that
// is briefly unauthenticated (reconnect, phone waking up) is not a logout, and
// SellerShell already holds the page until auth is back.
export function useSellerSession() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const seller = useQuery(
    api.users.getCurrentSeller,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    if (seller === null) {
      router.navigate({ to: "/seller/login", replace: true });
    }
  }, [isLoading, isAuthenticated, seller, router]);

  const loading = isLoading || (isAuthenticated && seller === undefined);
  return { seller: seller ?? null, loading };
}

export async function clearSellerSession() {
  await fetch("/api/auth/logout", { method: "POST" });
}
