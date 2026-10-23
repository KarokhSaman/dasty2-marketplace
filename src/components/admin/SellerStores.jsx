import { useState, useRef, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import CustomSelect from "@/components/ui/CustomSelect";
import SearchableSelect from "@/components/ui/SearchableSelect";
import BottomSheet from "@/components/ui/BottomSheet";
import { useIsDesktop } from "@/components/ui/useMediaQuery";
import { todayBaghdad } from "@/convex/discount";
import { IRAQ_CITIES } from "@/lib/cities";
import { errorMessage } from "@/lib/errors";
import FlipPanel from "@/components/ui/FlipPanel";

const FEE_MODES = [
  { value: "default", label: "Default pricing table" },
  { value: "flat", label: "Flat fee per product" },
  { value: "percentage", label: "Percentage of price" },
  { value: "none", label: "No service fee" },
];

export function feeLabel({ feeMode, feeValue }) {
  if (feeMode === "flat") return `Flat fee ${Number(feeValue).toLocaleString("en-US")} IQD`;
  if (feeMode === "percentage") return `${feeValue}% of price`;
  if (feeMode === "none") return "No service fee";
  return "Default pricing table";
}

const inputCls =
  "w-full border border-[var(--color-hairline)] rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-ember-300)]";

function StoreForm({ initial, submitLabel, onSubmit, onCancel, sellerOptions }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [feeMode, setFeeMode] = useState(initial?.feeMode ?? "default");
  const [feeValue, setFeeValue] = useState(initial?.feeValue != null ? String(initial.feeValue) : "");
  const [linkedUserId, setLinkedUserId] = useState(initial?.linkedUserId ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const needsValue = feeMode === "flat" || feeMode === "percentage";

  async function submit() {
    if (!name.trim()) return setError("Enter the store name");
    const num = Number(feeValue);
    if (needsValue && (!feeValue || !Number.isFinite(num) || num <= 0)) {
      return setError(feeMode === "flat" ? "Enter the flat fee in IQD" : "Enter a percentage between 0 and 100");
    }
    setSaving(true);
    setError("");
    try {
      await onSubmit({ name: name.trim(), feeMode, feeValue: needsValue ? num : undefined, linkedUserId: linkedUserId || undefined, city: city || undefined });
    } catch (err) {
      setError(errorMessage(err, "Could not save"));
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2 bg-[var(--color-cream)] rounded-xl p-3">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Store name" className={inputCls} />
      <CustomSelect
        value={feeMode}
        onChange={(mode) => { setFeeMode(mode); setError(""); }}
        options={FEE_MODES}
      />
      {needsValue && (
        <div className="relative">
          <input
            type="number" inputMode="decimal" min="0" dir="ltr" value={feeValue}
            onChange={(e) => setFeeValue(e.target.value)}
            placeholder={feeMode === "flat" ? "e.g. 3000" : "e.g. 10"}
            className={`${inputCls} pe-14`}
          />
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--color-ink-fade)]">
            {feeMode === "flat" ? "IQD" : "%"}
          </span>
        </div>
      )}
      <div>
        <p className="text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide mb-1">Store owner account</p>
        <SearchableSelect
          inline
          value={linkedUserId}
          onChange={(id) => {
            setLinkedUserId(id);
            setError("");
            const owner = sellerOptions.find((o) => o.value === id);
            if (owner?.city && !city) setCity(owner.city);
          }}
          placeholder="No linked account"
          searchPlaceholder="Search by name or phone"
          options={[{ value: "", label: "No linked account" }, ...sellerOptions]}
        />
        <p className="text-[11px] text-[var(--color-ink-fade)] mt-1">
          This account sees the store's products and fees in its dashboard, and its own listings are locked to this store.
        </p>
      </div>
      <div>
        <p className="text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide mb-1">Store city</p>
        <CustomSelect
          inline
          listClassName="max-h-56"
          value={city}
          onChange={setCity}
          placeholder="Use the posting seller's city"
          options={[{ value: "", label: "Use the posting seller's city" }, ...IRAQ_CITIES.map((c) => ({ value: c, label: c }))]}
        />
        <p className="text-[11px] text-[var(--color-ink-fade)] mt-1">
          Products of this store show this city, whoever posts them. Changing it updates the store's existing products too.
        </p>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving}
          className="flex-1 text-sm bg-[var(--color-ember-600)] hover:bg-[var(--color-ember-700)] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors">
          {submitLabel}
        </button>
        <button onClick={onCancel}
          className="flex-1 text-sm bg-[var(--color-cream-deep)] hover:bg-[var(--color-hairline)] text-[var(--color-ink)] py-2.5 rounded-xl transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

function addDays(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// "10% off · 17 Oct → 20 Oct (Active)" for a store's discount, or null.
function discountSummary(store) {
  if (!store.discountPercent || !store.discountStart || !store.discountEnd) return null;
  const today = todayBaghdad();
  const state = today < store.discountStart ? "Scheduled" : today > store.discountEnd ? "Ended" : "Active";
  return { text: `${store.discountPercent}% off · ${store.discountStart} → ${store.discountEnd}`, state };
}

const inputCls2 =
  "w-full border border-[var(--color-hairline)] rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-ember-300)]";

// "⋮" menu for one store — same pattern as the seller menu: a dropdown on
// desktop, a bottom sheet on mobile. Choosing Discount or Delete swaps the menu
// for that panel; Edit opens the store form in the list.
function StoreMenu({ store, sellerOptions, onSave, onDelete }) {
  const setDiscount = useMutation(api.stores.setDiscount);
  const isDesktop = useIsDesktop();
  const ref = useRef();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState("menu"); // menu | edit | discount | delete
  const [percent, setPercent] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const hasDiscount = !!store.discountPercent;

  const close = () => { setOpen(false); setView("menu"); setError(""); };

  useEffect(() => {
    if (!open || !isDesktop || view !== "menu") return;
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) close(); }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, isDesktop, view]);

  function openDiscount() {
    const today = todayBaghdad();
    setPercent(store.discountPercent ? String(store.discountPercent) : "");
    setStart(store.discountStart ?? today);
    setEnd(store.discountEnd ?? addDays(today, 7));
    setError("");
    setView("discount");
  }

  async function save(clear) {
    setError("");
    const num = Number(percent);
    if (!clear && (!percent || !Number.isFinite(num) || num <= 0 || num > 90)) {
      setError("Enter a percentage between 1 and 90");
      return;
    }
    if (!clear && (!start || !end)) { setError("Choose a start and an end date"); return; }
    if (!clear && end < start) { setError("The end date must not be before the start date"); return; }
    setSaving(true);
    try {
      await setDiscount(clear ? { id: store._id } : { id: store._id, percent: num, start, end });
      close();
    } catch (err) {
      setError(errorMessage(err, "Could not save"));
    } finally {
      setSaving(false);
    }
  }

  const rowCls = "flex items-center gap-3 w-full px-4 py-3 sm:py-2.5 text-[15px] sm:text-sm text-start transition-colors";

  const panel =
    view === "edit" ? (
      <div className="p-4">
        <StoreForm
          initial={store}
          sellerOptions={sellerOptions}
          submitLabel="Save"
          onCancel={() => setView("menu")}
          onSubmit={async (vals) => { await onSave(vals); close(); }}
        />
      </div>
    ) : view === "discount" ? (
      <div className="p-4">
        <p className="text-[13px] font-semibold text-[var(--color-ink)] mb-1">Discount for {store.name}</p>
        <p className="text-xs text-[var(--color-ink-fade)] mb-3">
          Applies to every product of this store between the two dates. The service fee is worked out on the discounted price.
        </p>
        <div className="space-y-2 mb-3">
          <div className="relative" dir="ltr">
            <input type="number" inputMode="decimal" min="1" max="90" value={percent}
              onChange={(e) => { setPercent(e.target.value); setError(""); }}
              placeholder="e.g. 10" className={`${inputCls2} pe-10`} />
            <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[var(--color-ink-fade)]">%</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide mb-1">Starts</p>
              <input type="date" dir="ltr" value={start} onChange={(e) => { setStart(e.target.value); setError(""); }} className={inputCls2} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide mb-1">Ends</p>
              <input type="date" dir="ltr" value={end} onChange={(e) => { setEnd(e.target.value); setError(""); }} className={inputCls2} />
            </div>
          </div>
        </div>
        {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
        <div className="flex gap-2">
          <button onClick={() => save(false)} disabled={saving}
            className="flex-1 text-sm bg-[var(--color-ember-600)] hover:bg-[var(--color-ember-700)] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors">Save</button>
          <button onClick={() => setView("menu")}
            className="flex-1 text-sm bg-[var(--color-cream-deep)] hover:bg-[var(--color-hairline)] text-[var(--color-ink)] py-2.5 rounded-xl transition-colors">Cancel</button>
        </div>
        {hasDiscount && (
          <div className="mt-4 pt-4 border-t border-[var(--color-hairline)]">
            <button onClick={() => save(true)} disabled={saving}
              className="w-full flex items-center justify-center gap-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 disabled:opacity-60 font-semibold py-2.5 rounded-xl transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4h6v3" />
              </svg>
              Remove discount
            </button>
          </div>
        )}
      </div>
    ) : view === "delete" ? (
      <div className="p-4">
        <p className="text-[13px] font-semibold text-[var(--color-ink)] mb-1">Delete store "{store.name}"?</p>
        <p className="text-xs text-[var(--color-ink-fade)] mb-3">Its products stay on sale but are no longer part of this store. Their fees don't change.</p>
        <div className="flex gap-2">
          <button onClick={async () => { await onDelete(); close(); }}
            className="flex-1 text-sm bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-xl transition-colors">Delete</button>
          <button onClick={() => setView("menu")}
            className="flex-1 text-sm bg-[var(--color-cream-deep)] hover:bg-[var(--color-hairline)] text-[var(--color-ink)] py-2.5 rounded-xl transition-colors">Cancel</button>
        </div>
      </div>
    ) : (
      <div className="py-1">
        <button onClick={() => setView("edit")} className={`${rowCls} text-[var(--color-ink)] hover:bg-[var(--color-cream)]`}>
          <svg className="w-5 h-5 text-[var(--color-ink-fade)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit store
        </button>
        <button onClick={openDiscount} className={`${rowCls} text-[var(--color-ink)] hover:bg-[var(--color-cream)]`}>
          <svg className="w-5 h-5 text-[var(--color-ink-fade)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5a1.99 1.99 0 011.414.586l7 7a2 2 0 010 2.828l-5 5a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
          </svg>
          {hasDiscount ? "Change discount" : "Add discount"}
        </button>
        <div className="border-t border-[var(--color-hairline)] mx-2 my-1" />
        <button onClick={() => setView("delete")} className={`${rowCls} text-red-500 hover:bg-red-50`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete store
        </button>
      </div>
    );

  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => { setOpen((v) => !v); setView("menu"); }} aria-label="Store actions"
        className="p-1.5 text-[var(--color-ink-fade)] hover:text-[var(--color-ink)] hover:bg-[var(--color-cream-deep)] rounded-lg transition-colors">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>
      {open && isDesktop && view === "menu" && (
        <FlipPanel gap="1" height={240} className="end-0 bg-white border border-[var(--color-hairline)] rounded-xl shadow-[0_18px_44px_-20px_rgba(11,12,15,0.28)] z-20 overflow-hidden min-w-[170px]">
          {panel}
        </FlipPanel>
      )}
      {open && (!isDesktop || view !== "menu") && (
        <BottomSheet open onClose={close} title={store.name}>
          {panel}
        </BottomSheet>
      )}
    </div>
  );
}

export default function SellerStores({ seller, stores, sellers }) {
  const sellerOptions = (sellers ?? [])
    .filter((u) => u._id !== seller._id)
    .map((u) => ({ value: u._id, label: `${u.name || "Unnamed"} · ${u.phone ?? ""}`, city: u.city }));
  const linkedName = (id) => sellerOptions.find((o) => o.value === id)?.label;
  const createStore = useMutation(api.stores.create);
  const updateStore = useMutation(api.stores.update);
  const removeStore = useMutation(api.stores.remove);
  const [adding, setAdding] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide">Stores</p>
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-xs font-semibold text-[var(--color-ember-600)] hover:underline">
            + Add store
          </button>
        )}
      </div>

      {stores.length === 0 && !adding && (
        <p className="text-xs text-[var(--color-ink-fade)]">No stores. Products use this seller's own fee.</p>
      )}

      <div className="space-y-2">
        {stores.map((store) => (
            <div key={store._id} className="flex items-center gap-2 border border-[var(--color-hairline)] rounded-xl px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-ink)] truncate">{store.name}</p>
                <p className="text-xs text-[var(--color-ink-fade)]">{feeLabel(store)}{store.city ? ` · ${store.city}` : ""}</p>
                {discountSummary(store) && (
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-ember-600)]">
                    <span className="bg-[var(--color-ember-50)] rounded-full px-2 py-0.5">{discountSummary(store).text}</span>
                    <span className="text-[var(--color-ink-fade)] font-medium">{discountSummary(store).state}</span>
                  </p>
                )}
                {store.linkedUserId && linkedName(store.linkedUserId) && (
                  <p className="text-xs text-[var(--color-ink-fade)] truncate">Owner account: {linkedName(store.linkedUserId)}</p>
                )}
              </div>
              <StoreMenu
                store={store}
                sellerOptions={sellerOptions}
                onSave={(vals) => updateStore({ id: store._id, ...vals })}
                onDelete={() => removeStore({ id: store._id })}
              />
            </div>
        ))}
        {adding && (
          <StoreForm
            sellerOptions={sellerOptions}
            submitLabel="Add store"
            onCancel={() => setAdding(false)}
            onSubmit={async (vals) => { await createStore({ sellerId: seller._id, ...vals }); setAdding(false); }}
          />
        )}
      </div>
    </div>
  );
}
