import { useState, useEffect } from "react";
import { useUser, useClerk, SignIn } from "@clerk/tanstack-react-start";
import * as m from "@/src/paraglide/messages";
import { adminClerkVerifyFn } from "@/src/server/clerk-admin";
import { clearLocalClerkAuth } from "@/lib/clerkAuthReset";

function ErrorBox({ message }) {
  return (
    <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
      <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <p className="text-sm text-red-600">{message}</p>
    </div>
  );
}

export default function AdminLoginPage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const clerk = useClerk();
  // Start as "loading" so <SignIn /> never renders before Clerk state is known
  const [step, setStep] = useState("loading"); // loading | signin | verifying | error
  const [errorMsg, setErrorMsg] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setVerified(false);
      setStep("signin");
      return;
    }
    if (verified) return;

    async function resetStaleSession() {
      await clearLocalClerkAuth(clerk, "/api/admin/logout");
      setErrorMsg("");
      setVerified(false);
      setStep("signin");
    }

    setVerified(true);
    setStep("verifying");
    adminClerkVerifyFn().then(async res => {
      if (!res.ok) {
        if (res.error === "not_authenticated") {
          await resetStaleSession();
          return;
        }
        setErrorMsg(
          res.error === "not_admin"
            ? `${user?.primaryEmailAddress?.emailAddress ?? ""} is not an admin account.`
            : "Authentication failed."
        );
        setStep("error");
        return;
      }
      window.location.href = "/admin";
    }).catch(async () => {
      await resetStaleSession();
    });
  }, [clerk, isLoaded, isSignedIn, verified]);

  return (
    <div className="flex items-center justify-center min-h-[75vh]">
      <div className="w-full max-w-sm">

        {/* Verifying */}
        {step === "verifying" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
            <div className="w-10 h-10 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-gray-500">Verifying admin access…</p>
          </div>
        )}

        {/* Not admin error */}
        {step === "error" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 space-y-4">
            <div className="flex flex-col items-center mb-2">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">{m.adminLoginTitle()}</h1>
            </div>
            <ErrorBox message={errorMsg} />
            <button
              onClick={() => { setStep("signin"); setErrorMsg(""); setVerified(false); }}
              className="w-full border border-gray-200 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Sign in with a different account
            </button>
          </div>
        )}

        {/* Loading Clerk state */}
        {step === "loading" && (
          <div className="text-center py-12">
            <div className="w-10 h-10 border-2 border-rose-100 border-t-rose-400 rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Clerk sign-in */}
        {step === "signin" && !isSignedIn && (
          <>
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-900">{m.adminLoginTitle()}</h1>
              <p className="text-sm text-gray-500 mt-1 text-center">{m.adminEnterEmail()}</p>
            </div>
            <SignIn
              routing="hash"
              forceRedirectUrl="/admin/login"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-sm border border-gray-100 rounded-2xl",
                },
              }}
            />
          </>
        )}
      </div>
    </div>
  );
}
