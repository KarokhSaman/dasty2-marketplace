import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import BottomSheet from "@/components/ui/BottomSheet";
import CustomSelect from "@/components/ui/CustomSelect";
import { CATEGORY_CONFIG } from "@/lib/categories";
import { getAllBrands } from "@/lib/brands";
import { errorMessage } from "@/lib/errors";

const inputCls =
  "w-full rounded-xl border border-[var(--color-hairline)] bg-white px-4 py-2.5 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ember-300)]";
const labelCls = "block text-[11px] font-semibold text-[var(--color-ink-fade)] uppercase tracking-wide mb-1";

const CONDITIONS = [
  { value: "new", label: () => m.conditionNew() },
  { value: "likenew", label: () => m.conditionLikeNew() },
  { value: "used", label: () => m.conditionUsed() },
];

// Admin dialog to edit a product's title, category, brand, condition and
// description at any status. Store products are always "New".
export default function ProductDetailsDialog({ product, onClose, onSaved }) {
  const save = useMutation(api.products.adminUpdateDetails);
  const [title, setTitle] = useState(product.title);
  const [category, setCategory] = useState(product.category);
  const [brand, setBrand] = useState(product.brand ?? "");
  const [condition, setCondition] = useState(product.storeId ? "new" : product.condition);
  const [description, setDescription] = useState(product.description ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    const next = { title: title.trim(), category, brand: brand || undefined, condition, description: description.trim() };
    try {
      await save({ id: product._id, ...next });
      await onSaved?.(next);
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Could not save"));
      setSaving(false);
    }
  }

  return (
    <BottomSheet open onClose={onClose} title={product.seq ? `Edit ${product.seq}` : "Edit product"}>
      <div className="p-4 space-y-3">
        <div>
          <label className={labelCls}>{m.fieldTitle()}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>{m.fieldCategory()}</label>
            <CustomSelect
              inline
              listClassName="max-h-56"
              value={category}
              onChange={setCategory}
              options={CATEGORY_CONFIG.filter((c) => c.value !== "all").map((c) => ({ value: c.value, label: c.value }))}
            />
          </div>
          <div>
            <label className={labelCls}>{m.fieldBrand()}</label>
            <CustomSelect
              inline
              listClassName="max-h-56"
              value={brand}
              onChange={setBrand}
              placeholder="None"
              options={[
                { value: "", label: "None" },
                ...getAllBrands().map((b) => ({ value: b, label: b })),
                { value: "Other", label: "Other" },
              ]}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>{m.fieldCondition()}</label>
          <div className="flex gap-1.5">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                disabled={!!product.storeId}
                onClick={() => setCondition(c.value)}
                className={`flex-1 h-10 px-3 text-xs font-medium rounded-xl border transition-colors disabled:opacity-50 ${
                  condition === c.value
                    ? "bg-[var(--color-ember-500)] text-white border-[var(--color-ember-500)]"
                    : "border-[var(--color-hairline)] text-[var(--color-ink)] hover:bg-[var(--color-cream)]"
                }`}
              >
                {c.label()}
              </button>
            ))}
          </div>
          {product.storeId && (
            <p className="text-[11px] text-[var(--color-ink-fade)] mt-1">Store products are always New.</p>
          )}
        </div>

        <div>
          <label className={labelCls}>{m.fieldDescription()}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={`${inputCls} resize-none`}
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}
        <div className="flex gap-2 pt-1">
          <button onClick={submit} disabled={saving}
            className="flex-1 text-sm bg-[var(--color-ember-600)] hover:bg-[var(--color-ember-700)] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors">
            Save
          </button>
          <button onClick={onClose}
            className="flex-1 text-sm bg-[var(--color-cream-deep)] hover:bg-[var(--color-hairline)] text-[var(--color-ink)] py-2.5 rounded-xl transition-colors">
            {m.adminCancel()}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
