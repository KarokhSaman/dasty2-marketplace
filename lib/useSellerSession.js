import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useRouter } from "@tanstack/react-router";
import { api } from "@/convex/_generated/api";

export function useSellerSession() {
  const router = useRouter();
  const [sellerId, setSellerId] = useState(undefined);

  useEffect(() => {
    // Cookie is HttpOnly so we read it via a lightweight API ping instead
    fetch("/api/seller/me")
      .then((r) => r.json())
      .then((d) => setSellerId(d.sellerId ?? null))
      .catch(() => setSellerId(null));
  }, []);

  const seller = useQuery(
    api.sellers.getById,
    sellerId ? { id: sellerId } : "skip"
  );

  useEffect(() => {
    if (sellerId === undefined) return;
    if (sellerId === null) { router.navigate({ to: "/seller/login", replace: true }); return; }
    if (seller === null) router.navigate({ to: "/seller/login", replace: true });
  }, [sellerId, seller, router]);

  const loading = sellerId === undefined || (sellerId && seller === undefined);
  return { seller: seller ?? null, loading };
}

export async function clearSellerSession() {
  await fetch("/api/seller/logout", { method: "POST" });
}
