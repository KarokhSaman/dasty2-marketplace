"use client";
import { createContext, useContext, useState, useEffect } from "react";

const SellerSessionCtx = createContext({ sellerId: null, ready: false });

export function SellerSessionProvider({ children }) {
  const [sellerId, setSellerId] = useState(null);
  const [ready, setReady]       = useState(false);

  useEffect(() => {
    fetch("/api/seller/me")
      .then(r => r.json())
      .then(d => { setSellerId(d.sellerId ?? null); setReady(true); })
      .catch(() => setReady(true));
  }, []);

  return (
    <SellerSessionCtx.Provider value={{ sellerId, setSellerId, ready }}>
      {children}
    </SellerSessionCtx.Provider>
  );
}

export function useGlobalSellerSession() {
  return useContext(SellerSessionCtx);
}
