"use client";
import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { useSellerSession, clearSellerSession } from "@/lib/useSellerSession";
import { useT } from "@/lib/i18n/LocaleProvider";

import { getCityOptions } from "@/lib/cities";
import CustomSelect from "@/components/ui/CustomSelect";

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

function MenuItem({ icon, label, sub, onClick, danger, chevron = true }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors text-start ${danger ? "text-red-500" : "text-gray-800"}`}
    >
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${danger ? "bg-red-50" : "bg-gray-100"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${danger ? "text-red-500" : "text-gray-800"}`}>{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {chevron && (
        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}

function SectionLabel({ label }) {
  return <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-4 pt-5 pb-1">{label}</p>;
}

export default function SellerAccountPage() {
  const router = useRouter();
  const { t, locale } = useT();
  const { seller, loading } = useSellerSession();
  const updateProfile = useMutation(api.sellers.updateProfile);

  const [editing, setEditing]   = useState(false);
  const [showHow, setShowHow]   = useState(false);
  const [showFees, setShowFees] = useState(false);

  const [name, setName]       = useState("");
  const [phone, setPhone]     = useState("");
  const [city, setCity]       = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving]   = useState(false);

  function startEdit() {
    setName(seller.name);
    setPhone(seller.phone ?? "");
    setCity(seller.city ?? "Erbil");
    setAddress(seller.address ?? "");
    setEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    await updateProfile({ id: seller._id, name: name.trim(), phone: phone.trim(), city, address: address.trim() });
    setSaving(false);
    setEditing(false);
  }

  async function handleLogout() {
    await clearSellerSession();
    window.location.href = "/";
  }

  if (loading || !seller) {
    return (
      <div className="space-y-4 animate-pulse p-4">
        <div className="h-28 bg-gray-200 rounded-2xl" />
        <div className="h-12 bg-gray-200 rounded-xl" />
        <div className="h-12 bg-gray-200 rounded-xl" />
        <div className="h-12 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  const initial = seller.name?.[0]?.toUpperCase() ?? "S";

  return (
    <div className="max-w-lg mx-auto pb-8">

      {/* ── Profile card ── */}
      <div className="bg-gradient-to-br from-rose-600 via-rose-500 to-rose-400 rounded-2xl p-6 mb-2 relative overflow-hidden">
        <div className="absolute top-0 end-0 w-40 h-40 bg-white/10 rounded-full -translate-y-16 translate-x-16 pointer-events-none" />
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
            <span className="text-2xl font-bold text-white">{initial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{seller.name}</h1>
            <p className="text-rose-200 text-sm mt-0.5">{seller.email}</p>
            <p className="text-rose-200 text-xs mt-0.5 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              {seller.city}{seller.address ? ` · ${seller.address}` : ""}
            </p>
          </div>
          <button onClick={startEdit}
            className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors shrink-0">
            {t.editBtn}
          </button>
        </div>
      </div>

      {/* ── Edit profile form ── */}
      {editing && (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 p-5 mb-2 space-y-3">
          <h2 className="text-sm font-bold text-gray-800 mb-1">{t.accountUpdateTitle}</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t.registerNameLabel}</label>
            <input value={name} onChange={e => setName(e.target.value)} required
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t.loginPhoneLabel}</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} required dir="ltr"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t.registerCityLabel}</label>
            <CustomSelect
              value={city}
              onChange={setCity}
              options={getCityOptions(locale)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t.registerAddressLabel} <span className="text-rose-500">*</span></label>
            <input value={address} onChange={e => setAddress(e.target.value)} required
              placeholder={t.registerAddressPlaceholder}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving}
              className="flex-1 bg-rose-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50">
              {saving ? t.accountSaving : t.accountSaveBtn}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="flex-1 bg-gray-100 text-gray-600 text-sm font-semibold py-2.5 rounded-xl hover:bg-gray-200 transition-colors">
              {t.adminCancel}
            </button>
          </div>
        </form>
      )}

      {/* ── Menu ── */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">

        <SectionLabel label="My Account" />

        <MenuItem
          label="My Products"
          sub="View and manage your listings"
          onClick={() => router.push("/seller")}
          icon={<svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10"/></svg>}
        />

        <div className="border-t border-gray-50" />

        {/* How it works */}
        <button onClick={() => setShowHow(v => !v)}
          className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors text-start">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">How It Works</p>
            <p className="text-xs text-gray-400 mt-0.5">Step-by-step guide</p>
          </div>
          <svg className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${showHow ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
        {showHow && (
          <div className="px-4 pb-4 space-y-3 bg-gray-50">
            {[
              { n: "1", t: "List for free", d: "Post your baby item with photos and price — no upfront cost." },
              { n: "2", t: "We review & publish", d: "Our team approves your listing, usually within a few hours." },
              { n: "3", t: "Buyers reach out", d: "Interested buyers contact you directly to arrange handover." },
              { n: "4", t: "One-time service fee", d: "A small fixed fee is deducted only after your item sells." },
            ].map(s => (
              <div key={s.n} className="flex items-start gap-3 pt-3">
                <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center shrink-0">{s.n}</div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{s.t}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-gray-50" />

        {/* Service fees */}
        <button onClick={() => setShowFees(v => !v)}
          className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors text-start">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-800">Service Fees</p>
            <p className="text-xs text-gray-400 mt-0.5">Fixed fee per sale, not a %</p>
          </div>
          <svg className={`w-4 h-4 text-gray-300 transition-transform duration-200 ${showFees ? "rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
        </button>
        {showFees && (
          <div className="px-4 pb-4 bg-gray-50">
            <div className="rounded-xl overflow-hidden border border-gray-200 mt-3">
              <div className="grid grid-cols-2 bg-gray-100 px-3 py-2">
                <p className="text-xs font-semibold text-gray-500">Item Price (IQD)</p>
                <p className="text-xs font-semibold text-gray-500 text-end">Service Fee</p>
              </div>
              {FEE_TIERS.map((tier, i) => (
                <div key={i} className={`grid grid-cols-2 px-3 py-2 ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                  <p className="text-xs text-gray-600 font-mono">{tier.range}</p>
                  <p className="text-xs font-bold text-rose-600 text-end">{tier.fee} IQD</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2 text-center">Listing is always free. Fee applies on sale only.</p>
          </div>
        )}

        <SectionLabel label="Support" />
        <div className="border-t border-gray-50" />

        <MenuItem
          label="About Dasty2 Mndalan"
          sub="Baby marketplace in Erbil, Iraq"
          onClick={() => {}}
          icon={<svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>}
        />
        <div className="border-t border-gray-50" />
        <MenuItem
          label="Contact Us"
          sub="Chat with us on WhatsApp"
          onClick={() => window.open("https://wa.me/9647509717177")}
          icon={<svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>}
        />

        <SectionLabel label="" />
        <div className="border-t border-gray-50" />

        <MenuItem
          label={t.accountSignOut}
          onClick={handleLogout}
          danger
          chevron={false}
          icon={<svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>}
        />
      </div>

      <p className="text-center text-xs text-gray-300 mt-6">Dasty2 Mndalan · Erbil, Iraq</p>
    </div>
  );
}
