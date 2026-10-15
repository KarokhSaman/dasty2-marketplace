import * as m from "@/paraglide/messages";
import CustomSelect from "@/components/ui/CustomSelect";

const inputCls =
  "w-full rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-2.5 min-h-11 text-sm text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-ember-300)] focus:ring-4 focus:ring-[var(--color-ember-100)]/50 transition";

function StockInput({ stock, onStockChange }) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-[var(--color-ink)] mb-1.5">{m.fieldStock()}</label>
      <input
        type="number"
        inputMode="numeric"
        min="1"
        max="9999"
        value={stock}
        onChange={(e) => onStockChange(e.target.value)}
        placeholder="1"
        dir="ltr"
        className={inputCls}
      />
    </div>
  );
}

// Renders nothing for normal sellers. A store-owner account (lockedStore) sees its
// linked store fixed in place; a managing seller picks from their stores.
export default function StoreStockFields({ stores, lockedStore, storeId, onStoreChange, stock, onStockChange }) {
  if (lockedStore) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[13px] font-semibold text-[var(--color-ink)] mb-1.5">{m.fieldStore()}</label>
          <div className="w-full rounded-xl border border-[var(--color-hairline)] bg-[var(--color-cream)] px-4 py-2.5 min-h-11 text-sm font-semibold text-[var(--color-ink)] flex items-center">
            {lockedStore.name}
          </div>
        </div>
        <StockInput stock={stock} onStockChange={onStockChange} />
      </div>
    );
  }

  if (!stores || stores.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-[13px] font-semibold text-[var(--color-ink)] mb-1.5">{m.fieldStore()}</label>
        <CustomSelect
          value={storeId}
          onChange={(id) => {
            onStoreChange(id);
            if (!id) onStockChange("");
          }}
          placeholder={m.fieldStoreNone()}
          options={[
            { value: "", label: m.fieldStoreNone() },
            ...stores.map((st) => ({ value: st._id, label: st.name })),
          ]}
        />
      </div>
      {storeId && <StockInput stock={stock} onStockChange={onStockChange} />}
    </div>
  );
}
