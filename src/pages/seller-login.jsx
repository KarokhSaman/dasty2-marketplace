import { useState, useEffect } from "react";
import { useUser, useClerk, SignIn } from "@clerk/tanstack-react-start";
import { useNavigate } from "@tanstack/react-router";
import * as m from "@/src/paraglide/messages";
import { getLocale } from "@/src/paraglide/runtime";
import { getCityOptions } from "@/lib/cities";
import CustomSelect from "@/components/ui/CustomSelect";
import {
  sellerClerkSyncFn,
  sellerClerkRegisterFn,
} from "@/src/server/clerk-seller";
import { useGlobalSellerSession } from "@/lib/SellerSessionContext";

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
    <div className="bg-gradient-to-br from-rose-700 via-rose-600 to-rose-500 lg:min-h-screen flex flex-col justify-center px-8 py-10 lg:py-16 relative overflow-hidden">
      <div className="absolute top-0 end-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32 pointer-events-none" />
      <div className="absolute bottom-0 start-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24 pointer-events-none" />

      <div className="relative mb-8">
        <p className="text-2xl font-bold text-white tracking-tight mb-4">
          Dasty2 <span className="font-medium text-rose-200">Mndalan</span>
        </p>
        <h2 className="text-3xl font-bold text-white leading-tight">{m.loginHeroTitle()}</h2>
        <p className="text-rose-200 mt-3 text-sm leading-relaxed">{m.loginHeroSub()}</p>
      </div>

      <div className="relative mb-8">
        <p className="text-xs font-semibold text-rose-300 uppercase tracking-widest mb-4">{m.loginHowLabel()}</p>
        <div className="space-y-4">
          {steps.map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0 mt-0.5">{step.icon}</div>
              <div>
                <p className="text-white font-semibold text-sm">{step.title}</p>
                <p className="text-rose-200 text-xs mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative">
        <button onClick={() => setShowFees(v => !v)} className="flex items-center gap-2 w-full text-start mb-3">
          <p className="text-xs font-semibold text-rose-300 uppercase tracking-widest">{m.loginFeesSec()}</p>
          <svg className={`w-3.5 h-3.5 text-rose-300 transition-transform duration-200 ${showFees ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        <div className="bg-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white text-sm font-semibold">{m.loginFeesTitle()}</p>
            <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">IQD</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-rose-200 text-[10px] font-medium mb-1">{m.loginFeesUpTo9k()}</p>
              <p className="text-white font-bold text-base">2,000</p>
              <p className="text-rose-300 text-[10px]">{m.loginFeesIqdFee()}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-rose-200 text-[10px] font-medium mb-1">{m.loginFeesUpTo99k()}</p>
              <p className="text-white font-bold text-base">5,000</p>
              <p className="text-rose-300 text-[10px]">{m.loginFeesIqdFee()}</p>
            </div>
          </div>
          {showFees && (
            <div className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
              {FEE_TIERS.map((tier, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-rose-200 font-mono">{tier.range}</span>
                  <span className="text-white font-bold">{tier.fee} IQD</span>
                </div>
              ))}
              <p className="text-rose-300 text-[10px] mt-3 leading-relaxed">{m.loginFeesNote()}</p>
            </div>
          )}
          {!showFees && (
            <button onClick={() => setShowFees(true)} className="text-[10px] text-rose-300 hover:text-white transition-colors underline">
              {m.loginFeesViewFull()}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Profile completion form ───────────────────────────────
function ProfileForm() {
  const locale = getLocale();
  const { setSellerId } = useGlobalSellerSession();
  const navigate = useNavigate();
  const [name,    setName]    = useState("");
  const [phone,   setPhone]   = useState("");
  const [city,    setCity]    = useState("Erbil");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await sellerClerkRegisterFn({ data: { name, phone, city, address } });
      if (res.ok) {
        setSellerId(res.sellerId);
        navigate({ to: "/seller", replace: true });
        return;
      }
      setError(res.error ?? "unknown_error");
    } catch {
      setError("unknown_error");
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {m.registerNameLabel()} <span className="text-rose-500">*</span>
        </label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder={m.registerNamePlaceholder()} required
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {m.loginPhoneLabel()} <span className="text-rose-500">*</span>
        </label>
        <input type="tel" inputMode="numeric" value={phone}
          onChange={e => setPhone(e.target.value.replace(/\D/g, ""))}
          placeholder={m.loginPhonePlaceholder()} required dir="ltr"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
        <div className="flex items-center gap-1.5 mt-1.5">
          <svg className="w-3.5 h-3.5 text-green-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          <p className="text-[11px] text-gray-400">{m.loginPhoneHint()}</p>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{m.registerCityLabel()}</label>
        <CustomSelect value={city} onChange={setCity} options={getCityOptions(locale)} />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {m.registerAddressLabel()} <span className="text-rose-500">*</span>
        </label>
        <input type="text" value={address} onChange={e => setAddress(e.target.value)}
          placeholder={m.registerAddressPlaceholder()} required
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
      </div>
      {error && <ErrorBox message={error} />}
      <button type="submit" disabled={loading || !name.trim() || !phone.trim() || !address.trim()}
        className="w-full bg-rose-600 text-white font-semibold py-3 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50">
        {loading ? "..." : m.continueBtn()}
      </button>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────
export default function SellerLoginPage() {
  const { isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const { setSellerId } = useGlobalSellerSession();
  const navigate = useNavigate();
  // Start as "loading" so <SignIn /> never renders before Clerk state is known
  const [step, setStep] = useState("loading"); // loading | signin | syncing | profile | error
  const [errorMsg, setErrorMsg] = useState("");
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setStep("signin"); return; }
    if (synced) return;

    setSynced(true);
    setStep("syncing");
    sellerClerkSyncFn().then(async res => {
      if (!res.ok) {
        if (res.error === "account_inactive") {
          setErrorMsg("Your account has been deactivated.");
          setStep("error");
          return;
        }
        await signOut();
        return;
      }
      if (res.needsProfile) { setStep("profile"); return; }
      // Update context so SellerShell has sellerId immediately — no reload needed.
      setSellerId(res.sellerId);
      navigate({ to: "/seller", replace: true });
    }).catch(async () => {
      try { await signOut(); } catch {
        setErrorMsg("Something went wrong. Please try again.");
        setStep("error");
      }
    });
  }, [isLoaded, isSignedIn]);

  const showInfoPanel = step === "signin"

  return (
    <div className={`-mx-4 -my-6 lg:min-h-[calc(100vh-56px)] ${showInfoPanel ? "lg:grid lg:grid-cols-2" : "flex items-center justify-center bg-gray-50"}`}>
      {showInfoPanel && <InfoPanel />}

      <div className={`flex items-center justify-center px-6 py-10 ${showInfoPanel ? "bg-gray-50" : "w-full"}`}>
        <div className="w-full max-w-sm">

          {/* Syncing */}
          {step === "syncing" && (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-gray-500">...</p>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
              <ErrorBox message={errorMsg} />
            </div>
          )}

          {/* Profile completion */}
          {step === "profile" && (
            <>
              <div className="bg-gradient-to-br from-rose-700 to-rose-500 rounded-2xl p-5 mb-4">
                <p className="text-xs font-semibold text-rose-200 uppercase tracking-widest mb-4">{m.profileExplainLabel()}</p>
                <div className="space-y-3.5">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-white shrink-0 mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{m.profileExplainNameT()}</p>
                      <p className="text-rose-200 text-xs mt-0.5 leading-relaxed">{m.profileExplainNameD()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-white shrink-0 mt-0.5">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{m.profileExplainPhoneT()}</p>
                      <p className="text-rose-200 text-xs mt-0.5 leading-relaxed">{m.profileExplainPhoneD()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-white shrink-0 mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{m.profileExplainCityT()}</p>
                      <p className="text-rose-200 text-xs mt-0.5 leading-relaxed">{m.profileExplainCityD()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-white shrink-0 mt-0.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm">{m.profileExplainAddressT()}</p>
                      <p className="text-rose-200 text-xs mt-0.5 leading-relaxed">{m.profileExplainAddressD()}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-7">
                <h1 className="text-xl font-bold text-gray-900 mb-1">{m.profileStepTitle()}</h1>
                <p className="text-sm text-gray-500 mb-6">{m.profileStepSubtitle()}</p>
                <ProfileForm />
              </div>
              <p className="text-center text-xs text-gray-400 mt-5">{m.loginTermsNote()}</p>
            </>
          )}

          {/* Loading Clerk state */}
          {step === "loading" && (
            <div className="text-center py-12">
              <div className="w-10 h-10 border-2 border-rose-100 border-t-rose-400 rounded-full animate-spin mx-auto" />
            </div>
          )}

          {/* Clerk sign-in */}
          {step === "signin" && (
            <SignIn
              routing="hash"
              forceRedirectUrl="/seller/login"
              signUpForceRedirectUrl="/seller/login"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-sm border border-gray-100 rounded-2xl",
                },
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
