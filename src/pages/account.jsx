import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useConvexAuth, useQuery } from "convex/react";
import * as m from "@/paraglide/messages";
import { api } from "@/convex/_generated/api";

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
  { range: "1,000,000+",          fee: "35,000" },
];

function MenuItem({ icon, label, sub, onClick, chevron = true, iconBg = "bg-[var(--color-cream-deep)]" }) {
  return (
    <button type="button" onClick={onClick}
      className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-[var(--color-cream)] transition-colors text-start">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--color-ink)]">{label}</p>
        {sub && <p className="text-xs text-[var(--color-ink-fade)] mt-0.5">{sub}</p>}
      </div>
      {chevron && (
        <svg className="w-4 h-4 text-[var(--color-ink-fade)] shrink-0 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
        </svg>
      )}
    </button>
  );
}

function SectionLabel({ label }) {
  return <p className="text-[11px] font-bold text-[var(--color-ink-fade)] uppercase tracking-[0.16em] px-4 pt-5 pb-1.5">{label}</p>;
}

export default function BuyerAccountPage() {
  const [showHow, setShowHow]   = useState(false);
  const [showFees, setShowFees] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const { isLoading, isAuthenticated } = useConvexAuth();
  const seller = useQuery(api.users.getCurrentSeller, isAuthenticated ? {} : "skip");
  const sellerReady = !isLoading && (!isAuthenticated || seller !== undefined);
  const sellerId = seller?._id ?? null;
  // Buyers are anonymous — "signed in" here means a seller session exists.
  const isSignedIn = !!sellerId;
  const isLoaded = sellerReady;
  const email = seller?.email ?? "";
  const displayName = seller?.name || email;
  const signedInInitial = (displayName || "D").trim().charAt(0).toUpperCase();

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const howSteps = [
    { n: "1", title: m.acctHowStep1T(), desc: m.acctHowStep1D() },
    { n: "2", title: m.acctHowStep2T(), desc: m.acctHowStep2D() },
    { n: "3", title: m.acctHowStep3T(), desc: m.acctHowStep3D() },
    { n: "4", title: m.acctHowStep4T(), desc: m.acctHowStep4D() },
  ];

  return (
    <div className="max-w-lg mx-auto pb-8">

      {/* ── App header card ── */}
      <div className="surface-card p-5 mb-3">
        <div className="flex items-center gap-3.5 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-[var(--color-ember-500)] flex items-center justify-center shrink-0 shadow-[0_8px_18px_-8px_rgba(237,0,64,0.6)]">
            <span dir="ltr" className="text-xl font-display text-white">{isSignedIn ? signedInInitial : "D2"}</span>
          </div>
          <div className="min-w-0">
            <p className="font-display text-[17px] text-[var(--color-ink)] leading-tight">{isSignedIn ? (displayName || m.acctMyAccountSec()) : "Dasty2 Mndalan"}</p>
            <p className="text-[var(--color-ink-soft)] text-[12.5px] mt-0.5">{isSignedIn ? email : m.acctAppTagline()}</p>
          </div>
        </div>
        <p className="text-[var(--color-ink-soft)] text-[13.5px] leading-relaxed">{m.acctAppDesc()}</p>
      </div>

      {/* ── Menu ── */}
      <div className="bg-white rounded-2xl border border-[var(--color-hairline)] overflow-hidden">
        {isLoaded && isSignedIn && (
          <>
            <SectionLabel label={m.acctMyAccountSec()} />
            <div className="border-t border-[var(--color-hairline)]"/>

            {!sellerReady && (
              <div className="w-full flex items-center gap-4 px-4 py-3.5 text-start">
                <div className="w-9 h-9 rounded-xl bg-[var(--color-cream-deep)] flex items-center justify-center shrink-0">
                  <div className="w-4 h-4 border-2 border-rose-100 border-t-rose-500 rounded-full animate-spin" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{m.acctMyAccountSec()}</p>
                  <p className="text-xs text-[var(--color-ink-fade)] mt-0.5">{m.acctMyProductsSub()}</p>
                </div>
              </div>
            )}

            {sellerReady && sellerId && (
              <Link to="/seller" className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-[var(--color-cream)] transition-colors text-start">
                <div className="w-9 h-9 rounded-xl bg-[var(--color-ember-50)] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-[var(--color-ember-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 13h8V3H3v10zm10 8h8V3h-8v18zM3 21h8v-6H3v6z"/></svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{m.sellerDashboard()}</p>
                  <p className="text-xs text-[var(--color-ink-fade)] mt-0.5">{m.acctMyProductsSub()}</p>
                </div>
                <svg className="w-4 h-4 text-[var(--color-ink-fade)] shrink-0 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </Link>
            )}

            {sellerReady && !sellerId && (
              <Link to="/seller/login" className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-[var(--color-cream)] transition-colors text-start">
                <div className="w-9 h-9 rounded-xl bg-[var(--color-ember-50)] flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-[var(--color-ember-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{m.acctStartSelling()}</p>
                  <p className="text-xs text-[var(--color-ink-fade)] mt-0.5">{m.acctStartSellingSub()}</p>
                </div>
                <svg className="w-4 h-4 text-[var(--color-ink-fade)] shrink-0 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </Link>
            )}

            <div className="border-t border-gray-50"/>
            <MenuItem
              label={m.accountSignOut()}
              onClick={handleSignOut}
              chevron={false}
              iconBg="bg-gray-50"
              icon={<svg className="w-4 h-4 text-[var(--color-ink-soft)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H9m4 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"/></svg>}
            />
          </>
        )}

        {(!isLoaded || !isSignedIn) && (
          <>
            <SectionLabel label={m.acctSellingSec()} />
            <div className="border-t border-[var(--color-hairline)]"/>

            <Link to="/seller/login" className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-[var(--color-cream)] transition-colors text-start">
              <div className="w-9 h-9 rounded-xl bg-[var(--color-ember-50)] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[var(--color-ember-500)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--color-ink)]">{m.acctStartSelling()}</p>
                <p className="text-xs text-[var(--color-ink-fade)] mt-0.5">{m.acctStartSellingSub()}</p>
              </div>
              <svg className="w-4 h-4 text-[var(--color-ink-fade)] shrink-0 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            </Link>
          </>
        )}

        <SectionLabel label={m.acctInfoSec()} />
        <div className="border-t border-gray-50"/>

        {/* How it works */}
        <button onClick={() => setShowHow(v => !v)}
          className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-[var(--color-cream)] transition-colors text-start">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--color-ink)]">{m.acctHowItWorks()}</p>
            <p className="text-xs text-[var(--color-ink-fade)] mt-0.5">{m.acctHowItWorksSub()}</p>
          </div>
          <svg className={`w-4 h-4 text-[var(--color-ink-fade)] transition-transform duration-200 ${showHow ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
        {showHow && (
          <div className="px-4 pb-4 bg-[var(--color-cream)] space-y-3">
            {howSteps.map(s => (
              <div key={s.n} className="flex items-start gap-3 pt-3">
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center shrink-0">{s.n}</div>
                <div>
                  <p className="text-sm font-semibold text-[var(--color-ink)]">{s.title}</p>
                  <p className="text-xs text-[var(--color-ink-soft)] mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-50"/>

        {/* Service fees */}
        <button onClick={() => setShowFees(v => !v)}
          className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-[var(--color-cream)] transition-colors text-start">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--color-ink)]">{m.acctFeesSec()}</p>
            <p className="text-xs text-[var(--color-ink-fade)] mt-0.5">{m.acctFeesSub()}</p>
          </div>
          <svg className={`w-4 h-4 text-[var(--color-ink-fade)] transition-transform duration-200 ${showFees ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
        {showFees && (
          <div className="px-4 pb-4 bg-[var(--color-cream)]">
            <div className="rounded-xl overflow-hidden border border-[var(--color-hairline)] mt-3">
              <div className="grid grid-cols-2 bg-[var(--color-cream-deep)] px-3 py-2">
                <p className="text-xs font-semibold text-[var(--color-ink-soft)]">{m.acctFeesPriceCol()}</p>
                <p className="text-xs font-semibold text-[var(--color-ink-soft)] text-end">{m.acctFeesFeeCol()}</p>
              </div>
              {FEE_TIERS.map((tier, i) => (
                <div key={i} className={`grid grid-cols-2 px-3 py-2 ${i % 2 === 0 ? "bg-white" : "bg-[var(--color-cream)]"}`}>
                  <p className="text-xs text-[var(--color-ink-soft)] font-mono">{tier.range}</p>
                  <p className="text-xs font-bold text-rose-600 text-end">{tier.fee} IQD</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-[var(--color-ink-fade)] mt-2 text-center">{m.acctFeesNote()}</p>
          </div>
        )}

        <SectionLabel label={m.acctAboutSec()} />
        <div className="border-t border-gray-50"/>

        <MenuItem
          label={m.acctAboutTitle()}
          sub={m.acctAboutSub()}
          onClick={() => setShowAbout(v => !v)}
          iconBg="bg-[var(--color-cream-deep)]"
          icon={<svg className="w-4 h-4 text-[var(--color-ink-soft)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>}
        />
        {showAbout && (
          <div className="px-4 py-4 bg-[var(--color-cream)] border-t border-[var(--color-hairline)]">
            <p className="text-sm text-[var(--color-ink-soft)] leading-relaxed">{m.acctAppDesc()}</p>
          </div>
        )}
        <div className="border-t border-gray-50"/>
        <MenuItem
          label={m.acctContactTitle()}
          sub={m.acctContactSub()}
          onClick={() => window.open("https://wa.me/9647509717177")}
          iconBg="bg-green-50"
          icon={<svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>}
        />
      </div>

      <p className="text-center text-xs text-[var(--color-ink-fade)] mt-6">{m.acctFooter()}</p>
    </div>
  );
}
