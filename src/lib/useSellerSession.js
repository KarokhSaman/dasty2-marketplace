import { useEffect } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { useRouter } from "@tanstack/react-router";
import { api } from "@/convex/_generated/api";

// Seller session over the VerifySpeed JWT connection. Reads the seller doc via
// the authenticated Convex query and bounces to login when there's no session
// or no seller record for the identity.
export function useSellerSession() {
  const router = useRouter();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const seller = useQuery(
    api.users.getCurrentSeller,
    isAuthenticated ? {} : "skip",
  );

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated || seller === null) {
      router.navigate({ to: "/seller/login", replace: true });
    }
  }, [isLoading, isAuthenticated, seller, router]);

  const loading = isLoading || (isAuthenticated && seller === undefined);
  return { seller: seller ?? null, loading };
}

export async function clearSellerSession() {
  await fetch("/api/auth/logout", { method: "POST" });
}
