import { useState, useEffect } from "react";
import { useUser, useClerk, SignIn } from "@clerk/tanstack-react-start";
import { useNavigate } from "@tanstack/react-router";
import { useConvexAuth } from "convex/react";
import * as m from "@/paraglide/messages";
import { sellerClerkSyncFn } from "@/lib/clerk-seller";
import { useGlobalSellerSession } from "@/lib/SellerSessionContext";
import { clearLocalClerkAuth } from "@/lib/clerkAuthReset";

// ── Fee tiers ─────────────────────────────────────────────
const FEE_TIERS = [
  { range: "5,000 – 9,000",       fee: "2,000" },
  { range: "10,000 – 29,000",     fee: "3,000" },
  { range: "30,000 – 49,000",     fee: "4,000" },
  { range: "50,000 – 99,000",     fee: "5,000" },
  { range: "100,000 – 199,000",   fee: "10,000" },
  { range: "200,000 – 299,000",   fee: "15,000" },
  { range: "300,000 – 399,000",   fee: "20,000" },
  { range: "400,000 – 499,000",   fee: "25,000" },
  { range: "500,000 – 1,000,000", fee: "30,000" },
];

const STEP_ICONS = [
  <svg key="1" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>,
  <svg key="2" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  <svg key="3" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>,
  <svg key="4" className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
];

const CONVEX_AUTH_ERROR_MESSAGE =
  "We could not connect your sign-in. Reload and try again. If the problem persists, contact support.";

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

// ── Info panel ────────────────────────────────────────────
function InfoPanel() {
  const [showFees, setShowFees] = useState(false);
  const steps = [
    { icon: STEP_ICONS[0], title: m.loginStep1T(), desc: m.loginStep1D() },
    { icon: STEP_ICONS[1], title: m.loginStep2T(), desc: m.loginStep2D() },
    { icon: STEP_ICONS[2], title: m.loginStep3T(), desc: m.loginStep3D() },
    { icon: STEP_ICONS[3], title: m.loginStep4T(), desc: m.loginStep4D() },
  ];

  return (
    <div className="bg-white rounded-2xl border border-[var(--color-hairline)] lg:min-h-screen flex flex-col justify-center px-8 py-10 lg:py-16 relative overflow-hidden">

      <div className="relative mb-8">
        <p className="text-2xl font-bold tracking-tight mb-4">
          <span className="font-bold text-[var(--color-ember-600)]">Dasty2</span> <span className="font-medium text-[var(--color-ink-soft)]">Mndalan</span>
        </p>
        <h2 className="text-3xl font-display text-[var(--color-ink)] leading-tight">{m.loginHeroTitle()}</h2>
        <p className="text-[var(--color-ink-soft)] mt-3 text-sm leading-relaxed">{m.loginHeroSub()}</p>
      </div>

      <div className="relative mb-8">
        <p className="text-xs font-semibold text-[var(--color-ink-fade)] uppercase tracking-widest mb-4">{m.loginHowLabel()}</p>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-[var(--color-ember-50)] flex items-center justify-center text-[var(--color-ember-600)] shrink-0 mt-0.5">{step.icon}</div>
              <div>
                <p className="text-[var(--color-ink)] font-semibold text-sm">{step.title}</p>
                <p className="text-[var(--color-ink-soft)] text-xs mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <button onClick={() => setShowFees(v => !v)} className="flex items-center gap-2 w-full text-start mb-3">
          <p className="text-xs font-semibold text-[var(--color-ink-fade)] uppercase tracking-widest">{m.loginFeesSec()}</p>
          <svg className={`w-3.5 h-3.5 text-[var(--color-ink-fade)] transition-transform duration-200 ${showFees ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="bg-[var(--color-cream)] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[var(--color-ink)] text-sm font-semibold">{m.loginFeesTitle()}</p>
            <span className="text-xs bg-[var(--color-cream-deep)] text-[var(--color-ink-soft)] px-2 py-0.5 rounded-full font-medium">IQD</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-white rounded-xl border border-[var(--color-hairline)] p-3 text-center">
              <p className="text-[var(--color-ink-soft)] text-[10px] font-medium mb-1">{m.loginFeesUpTo9k()}</p>
              <p className="text-rose-600 font-bold text-base">2,000</p>
              <p className="text-[var(--color-ink-fade)] text-[10px]">{m.loginFeesIqdFee()}</p>
            </div>
            <div className="bg-white rounded-xl border border-[var(--color-hairline)] p-3 text-center">
              <p className="text-[var(--color-ink-soft)] text-[10px] font-medium mb-1">{m.loginFeesUpTo99k()}</p>
              <p className="text-rose-600 font-bold text-base">5,000</p>
              <p className="text-[var(--color-ink-fade)] text-[10px]">{m.loginFeesIqdFee()}</p>
            </div>
          </div>
          {showFees && (
            <div className="mt-3 pt-3 border-t border-[var(--color-hairline)] space-y-1.5">
              {FEE_TIERS.map((tier, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-ink-soft)] font-mono">{tier.range}</span>
                  <span className="text-rose-600 font-bold">{tier.fee} IQD</span>
                </div>
              ))}
              <p className="text-[var(--color-ink-fade)] text-[10px] mt-3 leading-relaxed">{m.loginFeesNote()}</p>
            </div>
          )}
          {!showFees && (
            <button onClick={() => setShowFees(true)} className="text-[10px] text-[var(--color-ember-600)] hover:text-[var(--color-ember-700)] transition-colors underline">
              {m.loginFeesViewFull()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function SellerLoginPage() {
  const { isLoaded, isSignedIn } = useUser();
  const clerk = useClerk();
  const convexAuth = useConvexAuth();
  const { setSellerId } = useGlobalSellerSession();
  const navigate = useNavigate();
  // Start as "loading" so <SignIn /> never renders before Clerk state is known
  const [step, setStep] = useState("loading"); // loading | signin | syncing | error
  const [errorMsg, setErrorMsg] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  // Match Psoola's auth completion flow: wait until Convex confirms the Clerk
  // session token before running seller sync.
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setErrorMsg("");
      setStep("signin");
      return;
    }

    if (convexAuth.isLoading) {
      setErrorMsg("");
      setStep("syncing");
      return;
    }

    if (!convexAuth.isAuthenticated) {
      setErrorMsg(CONVEX_AUTH_ERROR_MESSAGE);
      setStep("error");
      return;
    }

    let cancelled = false;
    setErrorMsg("");
    setStep("syncing");

    sellerClerkSyncFn()
      .then((res) => {
        if (cancelled) return;
        if (res.ok && res.needsProfile) {
          navigate({ to: "/seller/complete-profile", replace: true });
          return;
        }
        if (res.ok && res.sellerId) {
          setSellerId(res.sellerId);
          navigate({ to: "/seller", replace: true });
          return;
        }
        setErrorMsg(
          res.error === "account_inactive"
            ? "Your account has been deactivated."
            : CONVEX_AUTH_ERROR_MESSAGE,
        );
        setStep("error");
      })
      .catch(() => {
        if (cancelled) return;
        setErrorMsg(CONVEX_AUTH_ERROR_MESSAGE);
        setStep("error");
      });

    return () => {
      cancelled = true;
    };
  }, [
    convexAuth.isAuthenticated,
    convexAuth.isLoading,
    isLoaded,
    isSignedIn,
    navigate,
    setSellerId,
    reloadKey,
  ]);

  async function handleSignOut() {
    setSellerId(null);
    await clearLocalClerkAuth(clerk, "/api/seller/logout");
    setErrorMsg("");
    setStep("signin");
  }

  function handleRetry() {
    setErrorMsg("");
    setStep("syncing");
    setReloadKey((k) => k + 1);
  }

  const showInfoPanel = step === "signin"

  return (
    <div className={`-mx-4 -my-6 lg:min-h-[calc(100vh-56px)] ${showInfoPanel ? "lg:grid lg:grid-cols-2" : "flex items-center justify-center bg-[var(--color-cream)]"}`}>
      {showInfoPanel && <InfoPanel />}

      <div className={`flex items-center justify-center px-6 py-10 ${showInfoPanel ? "bg-[var(--color-cream)]" : "w-full"}`}>
        <div className="w-full max-w-sm">

          {/* Syncing */}
          {step === "syncing" && (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-[var(--color-ink-soft)]">...</p>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="bg-white rounded-2xl border border-[var(--color-hairline)] shadow-sm p-7 space-y-4">
              <ErrorBox message={errorMsg} />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleRetry}
                  className="rounded-xl border border-[var(--color-hairline)] px-3 py-2 text-sm font-semibold text-[var(--color-ink)] hover:bg-[var(--color-cream)] transition-colors"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-xl bg-[var(--color-ink)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                >
                  Sign out
                </button>
              </div>
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
            <SignIn
              routing="virtual"
              forceRedirectUrl="/seller/login?profile=1"
              signUpForceRedirectUrl="/seller/login?profile=1"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-sm border border-[var(--color-hairline)] rounded-2xl",
                },
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
