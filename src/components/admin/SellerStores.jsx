import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import CustomSelect from "@/components/ui/CustomSelect";
import SearchableSelect from "@/components/ui/SearchableSelect";
import { IRAQ_CITIES } from "@/lib/cities";

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
  const [showInFilter, setShowInFilter] = useState(!initial?.hideFromFilter);
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
      await onSubmit({ name: name.trim(), feeMode, feeValue: needsValue ? num : undefined, linkedUserId: linkedUserId || undefined, city: city || undefined, hideFromFilter: !showInFilter });
    } catch (err) {
      setError(err?.message?.split("\n")[0].replace(/^.*Uncaught Error:\s*/, "") || "Could not save");
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
          value={city}
          onChange={setCity}
          placeholder="Use the posting seller's city"
          options={[{ value: "", label: "Use the posting seller's city" }, ...IRAQ_CITIES.map((c) => ({ value: c, label: c }))]}
        />
        <p className="text-[11px] text-[var(--color-ink-fade)] mt-1">
          Products of this store show this city, whoever posts them. Changing it updates the store's existing products too.
        </p>
      </div>
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={showInFilter}
          onChange={(e) => setShowInFilter(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[var(--color-ember-600)]"
        />
        <span>
          <span className="block text-sm font-semibold text-[var(--color-ink)]">Show in the home page Store filter</span>
          <span className="block text-[11px] text-[var(--color-ink-fade)]">
            Turn off to keep this store out of the buyer filter list. Its products still show on the site.
          </span>
        </span>
      </label>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button onClick={submit} disabled={saving}
          className="flex-1 text-sm bg-[var(--color-ember-600)] hover:bg-[var(--color-ember-700)] disabled:opacity-60 text-white font-semibold py-2 rounded-xl transition-colors">
          {submitLabel}
        </button>
        <button onClick={onCancel}
          className="flex-1 text-sm bg-white hover:bg-[var(--color-hairline)] text-[var(--color-ink)] py-2 rounded-xl transition-colors">
          Cancel
        </button>
      </div>
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
  const [editingId, setEditingId] = useState(null);
  const [confirmDelId, setConfirmDelId] = useState(null);

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
        {stores.map((store) =>
          editingId === store._id ? (
            <StoreForm
              key={store._id}
              initial={store}
              sellerOptions={sellerOptions}
              submitLabel="Save"
              onCancel={() => setEditingId(null)}
              onSubmit={async (vals) => { await updateStore({ id: store._id, ...vals }); setEditingId(null); }}
            />
          ) : (
            <div key={store._id} className="flex items-center gap-2 border border-[var(--color-hairline)] rounded-xl px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[var(--color-ink)] truncate">{store.name}</p>
                <p className="text-xs text-[var(--color-ink-fade)]">{feeLabel(store)}{store.city ? ` · ${store.city}` : ""}{store.hideFromFilter ? " · Hidden from filter" : ""}</p>
                {store.linkedUserId && linkedName(store.linkedUserId) && (
                  <p className="text-xs text-[var(--color-ink-fade)] truncate">Owner account: {linkedName(store.linkedUserId)}</p>
                )}
              </div>
              {confirmDelId === store._id ? (
                <>
                  <button onClick={async () => { await removeStore({ id: store._id }); setConfirmDelId(null); }}
                    className="text-xs font-semibold text-red-500 hover:underline">Delete</button>
                  <button onClick={() => setConfirmDelId(null)} className="text-xs text-[var(--color-ink-fade)] hover:underline">Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={() => setEditingId(store._id)} className="text-xs font-semibold text-[var(--color-ink-soft)] hover:underline">Edit</button>
                  <button onClick={() => setConfirmDelId(store._id)} className="text-xs font-semibold text-red-500 hover:underline">Delete</button>
                </>
              )}
            </div>
          ),
        )}
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
