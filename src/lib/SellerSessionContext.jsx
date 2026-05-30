import { createContext, useCallback, useContext, useState, useEffect } from "react";
import { useAuth } from "@clerk/tanstack-react-start";

const SellerSessionCtx = createContext({
  sellerId: null,
  setSellerId: () => {},
  ready: false,
  authError: null,
  refreshSellerSession: () => {},
});

export function SellerSessionProvider({ children }) {
  const [sellerId, setSellerId] = useState(null);
  const [ready, setReady]       = useState(false);
  const [authError, setAuthError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const { isLoaded, isSignedIn } = useAuth();
  const refreshSellerSession = useCallback(() => {
    setRefreshKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setSellerId(null);
      setAuthError(null);
      setReady(true);
      return;
    }

    let cancelled = false;
    setReady(false);
    setAuthError(null);
    fetch("/api/seller/me", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return;
        setSellerId(d.sellerId ?? null);
        setAuthError(d.error ?? null);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setAuthError("seller_session_failed");
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, refreshKey]);

  useEffect(() => {
    if (!isSignedIn) return;

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") refreshSellerSession();
    };

    window.addEventListener("focus", refreshSellerSession);
    document.addEventListener("visibilitychange", refreshIfVisible);
    return () => {
      window.removeEventListener("focus", refreshSellerSession);
      document.removeEventListener("visibilitychange", refreshIfVisible);
    };
  }, [isSignedIn, refreshSellerSession]);

  return (
    <SellerSessionCtx.Provider
      value={{ sellerId, setSellerId, ready, authError, refreshSellerSession }}
    >
      {children}
    </SellerSessionCtx.Provider>
  );
}

export function useGlobalSellerSession() {
  return useContext(SellerSessionCtx);
}
