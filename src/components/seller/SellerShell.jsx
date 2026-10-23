import { useConvexAuth } from "convex/react";
import { useState, useCallback, useEffect } from "react";
import * as m from "@/paraglide/messages";
import { Button } from "@/components/ui";
import { ToastProvider } from "@/components/admin/ui";

// Seller pages draw inside the public frame (PublicShell: header, bell, bottom
// bar), so moving between Home and the dashboard never rebuilds the header.
// This only holds the page until the Convex websocket is authenticated — the
// login check itself is the route's beforeLoad (requireSeller). The
// `seller-root` class turns on the seller colour tokens in globals.css.
export default function SellerShell({ children }) {
  // Authed queries must wait for this, otherwise they run during the handshake,
  // throw "Not authenticated", and crash the page.
  const { isAuthenticated } = useConvexAuth();
  const [authTimedOut, setAuthTimedOut] = useState(false);

  // If the websocket hasn't (re)authenticated after a grace period — usually a
  // bad connection — offer a reload. Never clear the session cookie here: a
  // network problem must not log the seller out.
  useEffect(() => {
    if (isAuthenticated) {
      setAuthTimedOut(false);
      return;
    }

    const timeout = window.setTimeout(() => setAuthTimedOut(true), 8000);
    return () => window.clearTimeout(timeout);
  }, [isAuthenticated]);

  const handleAuthReset = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div className="seller-root">
      {isAuthenticated ? <ToastProvider>{children}</ToastProvider> : authTimedOut ? (
        <div className="max-w-md mx-auto py-20 text-center space-y-4">
          <p className="text-sm font-semibold text-[var(--color-ink)]">{m.connectionLost()}</p>
          <Button variant="ink" size="sm" onClick={handleAuthReset}>
            {m.tryAgain()}
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-center py-24">
          <div className="w-9 h-9 border-2 border-[var(--color-ember-200)] border-t-[var(--color-ember-500)] rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
