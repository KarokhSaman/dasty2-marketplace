import { useState } from "react";
import { useMutation, useQuery, useConvexAuth } from "convex/react";
import { Link } from "@tanstack/react-router";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import { getLocale } from "@/paraglide/runtime";
import { getCityOptions, getCityLabel } from "@/lib/cities";
import { formatNumberLocale, localDigits } from "@/lib/utils";
import { getLocale as currentLocale } from "@/paraglide/runtime";
import { todayBaghdad } from "@/convex/discount";
import CustomSelect from "@/components/ui/CustomSelect";
import ChangePhoneModal from "@/components/seller/ChangePhoneModal";
import { FEE_PAYMENT_NUMBER } from "@/pages/seller-dashboard";
import { Panel, btn, useCopy, useToast, IconCopy, IconChevron, IconWhatsApp } from "@/components/admin/ui";

const FEE_TIERS = [
  ["5,000 – 9,000", "2,000"], ["10,000 – 29,000", "3,000"], ["30,000 – 49,000", "4,000"],
  ["50,000 – 99,000", "5,000"], ["100,000 – 199,000", "10,000"], ["200,000 – 299,000", "15,000"],
  ["300,000 – 399,000", "20,000"], ["400,000 – 499,000", "25,000"], ["500,000 – 1,000,000", "30,000"], ["1,000,000+", "35,000"],
];
const CONTACT_WHATSAPP = "9647509717177";

const sectionLabel = "text-[11px] font-bold uppercase tracking-[0.06em] rtl:tracking-normal text-adm-fade mb-2";
const card = "rounded-2xl border border-adm-line bg-adm-surface";
const field = "w-full h-12 rounded-[13px] border-[1.5px] border-adm-line bg-adm-surface px-3.5 text-[15px] outline-none focus:border-adm-fade";

const Icon = ({ d, className = "" }) => (
  <svg className={`w-[18px] h-[18px] ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);

function MenuRow({ icon, label, sub, onClick, href, danger, chevron = true, iconTone, children }) {
  const inner = (
    <>
      <span className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${danger ? "bg-st-rejected-bg text-st-rejected" : iconTone ?? "bg-adm-sunk text-adm-soft"}`}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className={`block text-[14.5px] font-semibold ${danger ? "text-st-rejected" : ""}`}>{label}</span>
        {sub && <span className="block text-[12px] text-adm-fade mt-0.5 truncate">{sub}</span>}
      </span>
      {chevron && <IconChevron className="w-4 h-4 text-adm-fade rtl:rotate-180" />}
    </>
  );
  const cls = "w-full flex items-center gap-3 px-4 py-3 text-start hover:bg-adm-sunk";
  return (
    <div className="border-t border-adm-line first:border-t-0">
      {href ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
        : <button type="button" onClick={onClick} className={cls}>{inner}</button>}
      {children}
    </div>
  );
}

const num = (v) => formatNumberLocale(v, currentLocale());

function feeDealText(source) {
  if (source?.feeMode === "flat") return m.feeDealFlat({ amount: num(source.feeValue) });
  if (source?.feeMode === "percentage") return m.feeDealPercent({ percent: num(source.feeValue) });
  if (source?.feeMode === "none") return m.adminOffersNoFeeLabel();
  return m.feeDealTable();
}

function offerText(offer) {
  const amount = offer.maxPrice ? num(offer.maxPrice) : null;
  if (offer.type === "free") return amount ? m.offerTickerNoFeeUnder({ amount }) : m.offerNoFeeNote();
  return amount ? m.offerTickerFlatUnder({ fee: num(offer.flatFeeAmount), amount }) : m.offerFlatFeeNote({ amount: num(offer.flatFeeAmount) });
}

export default function SellerAccountPage() {
  const locale = getLocale();
  const copy = useCopy();
  const toast = useToast();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const seller = useQuery(api.users.getCurrentSeller, isAuthenticated ? {} : "skip");
  const activeOffer = useQuery(api.offers.getActive);
  const linkedStore = useQuery(api.stores.getLinked, seller ? {} : "skip");
  const managedStores = useQuery(api.stores.listMine, seller ? {} : "skip");
  const products = useQuery(api.products.getBySeller, seller ? {} : "skip");
  const updateProfile = useMutation(api.users.updateProfile);

  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(null); // "fees" | "how" | "about"
  const [showChangePhone, setShowChangePhone] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  if (isLoading || !seller) {
    return (
      <div className="max-w-lg mx-auto space-y-3 animate-pulse">
        <div className="h-28 bg-adm-sunk rounded-2xl" />
        <div className="h-24 bg-adm-sunk rounded-2xl" />
        <div className="h-40 bg-adm-sunk rounded-2xl" />
      </div>
    );
  }

  function startEdit() {
    setName(seller.name); setCity(seller.city ?? "Erbil"); setAddress(seller.address ?? ""); setEditing(true);
  }
  async function save(e) {
    e.preventDefault();
    setSaving(true);
    try { await updateProfile({ name: name.trim(), city, address: address.trim() }); setEditing(false); }
    catch { toast(m.errorGeneral(), "error"); }
    finally { setSaving(false); }
  }
  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  }

  const stores = [...(linkedStore ? [linkedStore] : []), ...(managedStores ?? [])];
  const isDefault = !seller.feeMode || seller.feeMode === "default";
  const today = todayBaghdad();
  const toggle = (k) => setOpen((v) => (v === k ? null : k));

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-8">
      {/* Profile */}
      <div className={`${card} p-4`}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-ember-500)] text-white grid place-items-center text-[22px] font-bold shrink-0">
            {seller.name?.[0]?.toUpperCase() ?? "S"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[17px] font-bold truncate">{seller.name}</h1>
            <p className="text-[13px] text-adm-soft tabular-nums" dir="ltr" style={{ textAlign: locale === "en" ? "left" : "right" }}>{seller.phone}</p>
          </div>
          <button type="button" onClick={startEdit} className={btn("dark", "sm")}>{m.editProfileBtn()}</button>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-adm-line text-[13px]">
          <span className="text-adm-fade">{m.registerCityLabel()}</span><span className="font-semibold">{getCityLabel(seller.city, locale)}</span>
          {seller.address && <><span className="text-adm-fade">{m.registerAddressLabel()}</span><span className="font-semibold">{seller.address}</span></>}
          {seller.email && <><span className="text-adm-fade">Email</span><span className="font-semibold truncate" dir="ltr">{seller.email}</span></>}
        </div>
      </div>

      {/* Fee */}
      <section>
        <p className={sectionLabel}>{m.yourServiceFee()}</p>
        <div className={`${card} p-4 space-y-3`}>
          <div>
            <p className="text-[15px] font-bold">{feeDealText(seller)}</p>
            <p className="text-[12.5px] text-adm-soft mt-0.5">{m.acctSellerFeesNote()}</p>
          </div>
          {isDefault && activeOffer && (
            <p className="rounded-xl bg-st-approved-bg text-st-approved px-3 py-2 text-[13px] font-bold">{m.offerTag()}: {offerText(activeOffer)}</p>
          )}
          {isDefault && (
            <>
              <button type="button" onClick={() => toggle("fees")} className="w-full flex items-center justify-between text-[13px] font-semibold text-adm-accent">
                {m.loginFeesViewFull()}
                <IconChevron className={`w-4 h-4 transition-transform ${open === "fees" ? "rotate-90" : "rtl:rotate-180"}`} />
              </button>
              {open === "fees" && (
                <div>
                  <div className="rounded-xl overflow-hidden border border-[var(--color-hairline)]">
                    <div className="grid grid-cols-2 bg-[var(--color-cream-deep)] px-3 py-2">
                      <p className="text-xs font-semibold text-[var(--color-ink-soft)]">{m.acctFeesPriceCol()}</p>
                      <p className="text-xs font-semibold text-[var(--color-ink-soft)] text-end">{m.acctFeesFeeCol()}</p>
                    </div>
                    {FEE_TIERS.map(([range, fee], i) => (
                      <div key={range} className={`grid grid-cols-2 px-3 py-2 ${i % 2 === 0 ? "bg-white" : "bg-[var(--color-cream)]"}`}>
                        <p className="text-xs text-[var(--color-ink-soft)] font-mono">{localDigits(range, locale)}</p>
                        <p className="text-xs font-bold text-rose-600 text-end">{localDigits(fee, locale)} IQD</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* How to pay */}
      <section>
        <p className={sectionLabel}>{m.howToPayFees()}</p>
        <div className={`${card} p-3 ps-4 flex items-center gap-3`}>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-adm-fade">{m.payFeesVia()}</p>
            <p className="text-[17px] font-bold tabular-nums" dir="ltr" style={{ textAlign: locale === "en" ? "left" : "right" }}>{FEE_PAYMENT_NUMBER}</p>
          </div>
          <button type="button" onClick={() => copy(`‎${FEE_PAYMENT_NUMBER}`, m.numberCopied())} className={btn("outline", "sm")}>
            <IconCopy className="w-4 h-4" /> {m.copyNumber()}
          </button>
        </div>
      </section>

      {/* Stores */}
      {stores.length > 0 && (
        <section>
          <p className={sectionLabel}>{m.yourStore()}</p>
          <div className="space-y-2">
            {stores.map((st) => {
              const count = (products ?? []).filter((p) => p.storeId === st._id && p.status === "approved").length;
              const discount = st.discountPercent && st.discountEnd >= today ? m.storeDiscountUntil({ percent: st.discountPercent, date: st.discountEnd }) : null;
              return (
                <div key={st._id} className={`${card} p-3.5 flex items-center gap-3`}>
                  <span className="w-11 h-11 rounded-xl bg-adm-sunk text-adm-navy grid place-items-center shrink-0">
                    <Icon d={<path d="M3 9l1-5h16l1 5M3 9v11h18V9M3 9h18M9 20v-6h6v6" />} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14.5px] font-bold flex items-center gap-1.5">{st.name}
                      <span className="h-[18px] px-1.5 rounded-[5px] text-[10px] font-bold bg-adm-navy text-white inline-flex items-center">{m.storeFlag()}</span>
                    </p>
                    <p className="text-[12.5px] text-adm-soft">{[discount, m.storeProductsCount({ count: num(count) })].filter(Boolean).join(" · ")}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Menu */}
      <div className={`${card} overflow-hidden`}>
        <Link to="/seller" className="w-full flex items-center gap-3 px-4 py-3 text-start hover:bg-adm-sunk">
          <span className="w-9 h-9 rounded-xl grid place-items-center bg-adm-sunk text-adm-soft shrink-0"><Icon d={<path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />} /></span>
          <span className="flex-1 min-w-0"><span className="block text-[14.5px] font-semibold">{m.sellerMyProducts()}</span><span className="block text-[12px] text-adm-fade mt-0.5">{m.acctMyProductsSub()}</span></span>
          <IconChevron className="w-4 h-4 text-adm-fade rtl:rotate-180" />
        </Link>
        <MenuRow label={m.changePhoneTitle()} sub={<span dir="ltr">{seller.phone}</span>} onClick={() => setShowChangePhone(true)}
          icon={<Icon d={<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />} />} />
        <MenuRow label={m.acctHowItWorks()} sub={m.acctStepByStep()} onClick={() => toggle("how")} iconTone="bg-blue-50 text-blue-500"
          icon={<Icon d={<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>} />}>
          {open === "how" && (
            <div className="px-4 pb-4 space-y-3">
              {[[m.loginStep1T(), m.loginStep1D()], [m.loginStep2T(), m.loginStep2D()], [m.loginStep3T(), m.loginStep3D()], [m.loginStep4T(), m.loginStep4D()]].map(([t, d], i) => (
                <div key={t} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-adm-accent-soft text-adm-accent text-[12px] font-bold grid place-items-center shrink-0">{i + 1}</span>
                  <div><p className="text-[13.5px] font-semibold">{t}</p><p className="text-[12.5px] text-adm-soft mt-0.5">{d}</p></div>
                </div>
              ))}
            </div>
          )}
        </MenuRow>
        <MenuRow label={m.acctAboutTitle()} sub={m.acctAboutMarketplace()} onClick={() => toggle("about")}
          icon={<Icon d={<path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />} />}>
          {open === "about" && <p className="px-4 pb-4 text-[13px] text-adm-soft leading-relaxed">{m.acctAppDesc()}</p>}
        </MenuRow>
        <MenuRow label={m.acctContactTitle()} sub={m.acctContactSub()} href={`https://wa.me/${CONTACT_WHATSAPP}`}
          icon={<span className="text-adm-wa"><IconWhatsApp /></span>} />
        <MenuRow label={m.accountSignOut()} onClick={signOut} danger chevron={false}
          icon={<Icon d={<path d="M15 17l5-5-5-5M20 12H9M12 21H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h7" />} />} />
      </div>

      <p className="text-center text-[12px] text-adm-fade">{m.acctFooter()}</p>

      <Panel open={editing} onClose={() => setEditing(false)} title={m.accountUpdateTitle()} short>
        <form onSubmit={save} className="space-y-3">
          <div>
            <label htmlFor="acct-name" className="block text-[12px] font-semibold text-adm-fade mb-1">{m.registerNameLabel()}</label>
            <input id="acct-name" required dir="auto" value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </div>
          <div>
            <p className="block text-[12px] font-semibold text-adm-fade mb-1">{m.registerCityLabel()}</p>
            <CustomSelect inline listClassName="max-h-56" value={city} onChange={setCity} options={getCityOptions(locale)} />
          </div>
          <div>
            <label htmlFor="acct-addr" className="block text-[12px] font-semibold text-adm-fade mb-1">{m.registerAddressLabel()} <span className="text-[var(--color-ember-500)]">*</span></label>
            <input id="acct-addr" required dir="auto" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={m.registerAddressPlaceholder()} className={field} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => setEditing(false)} className={`${btn("outline", "lg")} flex-1`}>{m.adminCancel()}</button>
            <button type="submit" disabled={saving} className={`${btn("primary", "lg")} flex-1`}>{saving ? m.accountSaving() : m.accountSaveBtn()}</button>
          </div>
        </form>
      </Panel>

      {showChangePhone && (
        <ChangePhoneModal currentPhone={seller.phone} onClose={() => setShowChangePhone(false)}
          onSuccess={() => { setShowChangePhone(false); window.location.reload(); }} />
      )}
    </div>
  );
}
