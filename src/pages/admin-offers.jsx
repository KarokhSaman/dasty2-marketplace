import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import * as m from "@/paraglide/messages";
import BottomSheet from "@/components/ui/BottomSheet";

function formatDate(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function OfferTypeBadge({ type }) {
  return type === "free"
    ? <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{m.adminOffersBadgeNoFee()}</span>
    : <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{m.adminOffersBadgeFlatFee()}</span>;
}

export default function AdminOffersPage() {
  const allOffers   = useQuery(api.offers.getAll);
  const activeOffer = useQuery(api.offers.getActive);
  const createOffer     = useMutation(api.offers.create);
  const deactivateOffer = useMutation(api.offers.deactivate);
  const reactivateOffer = useMutation(api.offers.reactivate);
  const deleteOffer     = useMutation(api.offers.deleteOffer);
  const createLog       = useMutation(api.adminLogs.create);

  const today = new Date().toISOString().slice(0, 10);

  const [title,              setTitle]              = useState("");
  const [description,        setDescription]        = useState("");
  const [type,               setType]               = useState("free");
  const [flatFeeAmount,      setFlatFeeAmount]      = useState("");
  const [startDate,          setStartDate]          = useState(today);
  const [endDate,            setEndDate]            = useState("");
  const [submitting,         setSubmitting]         = useState(false);
  const [success,            setSuccess]            = useState(false);
  const [confirmDelete,      setConfirmDelete]      = useState(null);
  const [confirmDeactivate,  setConfirmDeactivate]  = useState(null);
  const [confirmReactivate,  setConfirmReactivate]  = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;
    setSubmitting(true);
    await createOffer({
      title:         title.trim(),
      description:   description.trim(),
      type,
      flatFeeAmount: type === "flat_fee" ? Number(flatFeeAmount) : undefined,
      startDate,
      endDate,
    });
    await createLog({
      action: "offer_created",
      notes: title.trim(),
    });
    setTitle(""); setDescription(""); setFlatFeeAmount(""); setEndDate("");
    setType("free");
    setSubmitting(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-[var(--color-ink)]">{m.adminOffersTitle()}</h1>

      {/* ── Active offer ── */}
      {activeOffer ? (
        <div className="bg-gradient-to-br from-green-500 to-emerald-400 rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 end-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 pointer-events-none"/>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">{m.adminOffersActiveNow()}</span>
              </div>
              <h2 className="text-xl font-bold">{activeOffer.title}</h2>
              {activeOffer.description && <p className="text-green-100 text-sm mt-0.5">{activeOffer.description}</p>}
              <p className="text-green-100 text-xs mt-2">
                {activeOffer.type === "free"
                  ? m.adminOffersNoFeeDesc()
                  : m.adminOffersFlatFeeDesc({ amount: activeOffer.flatFeeAmount?.toLocaleString() })}
              </p>
              <p className="text-green-100 text-xs mt-1">
                {formatDate(activeOffer.startDate)} → {formatDate(activeOffer.endDate)}
              </p>
            </div>
            <button
              onClick={() => setConfirmDeactivate(activeOffer._id)}
              className="shrink-0 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
            >
              {m.adminOffersDeactivate()}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 rounded-2xl px-5 py-4 text-sm text-[var(--color-ink-fade)] flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          {m.adminOffersNoActive()}
        </div>
      )}

      {/* ── Create new offer ── */}
      <div className="bg-white rounded-2xl border border-[var(--color-hairline)] shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-800 mb-5">{m.adminOffersCreateTitle()}</h2>

        {success && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
            {m.adminOffersSuccess()}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">{m.adminOffersLabelTitle()} <span className="text-rose-500">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              placeholder={m.adminOffersPlaceholderTitle()}
              className="w-full border border-[var(--color-hairline)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ember-300"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">{m.adminOffersLabelDesc()}</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder={m.adminOffersPlaceholderDesc()}
              className="w-full border border-[var(--color-hairline)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ember-300"/>
          </div>

          {/* Fee type toggle */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-ink)] mb-2">{m.adminOffersFeeType()} <span className="text-rose-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: "free",     label: m.adminOffersNoFeeLabel(), sub: m.adminOffersNoFeeSub() },
                { val: "flat_fee", label: m.adminOffersFlatLabel(),  sub: m.adminOffersFlatSub() },
              ].map(opt => (
                <button
                  key={opt.val} type="button"
                  onClick={() => setType(opt.val)}
                  className={`text-start p-3.5 rounded-xl border-2 transition-colors ${
                    type === opt.val
                      ? "border-rose-500 bg-[var(--color-ember-50)]"
                      : "border-[var(--color-hairline)] hover:border-rose-300"
                  }`}
                >
                  <p className={`text-sm font-semibold ${type === opt.val ? "text-rose-700" : "text-gray-800"}`}>{opt.label}</p>
                  <p className="text-xs text-[var(--color-ink-fade)] mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {type === "flat_fee" && (
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">{m.adminOffersFlatAmount()} <span className="text-rose-500">*</span></label>
              <input
                type="number" min={0} value={flatFeeAmount}
                onChange={e => setFlatFeeAmount(e.target.value)}
                placeholder="2000" required
                className="w-full border border-[var(--color-hairline)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ember-300" dir="ltr"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">{m.adminOffersStartDate()} <span className="text-rose-500">*</span></label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                className="w-full border border-[var(--color-hairline)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ember-300"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-ink)] mb-1.5">{m.adminOffersEndDate()} <span className="text-rose-500">*</span></label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required min={startDate}
                className="w-full border border-[var(--color-hairline)] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ember-300"/>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-xs text-amber-700">{m.adminOffersNote()}</p>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full bg-[var(--color-ember-600)] hover:bg-[var(--color-ember-700)] text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
            {submitting ? m.adminOffersSubmitting() : m.adminOffersSubmit()}
          </button>
        </form>
      </div>

      {/* ── Past offers ── */}
      {allOffers && allOffers.length > 0 && (
        <div className="bg-white rounded-2xl border border-[var(--color-hairline)] shadow-sm overflow-hidden">
          <p className="text-xs font-semibold text-[var(--color-ink-fade)] uppercase tracking-widest px-5 py-3 border-b border-[var(--color-hairline)]">
            {m.adminOffersAllTitle()}
          </p>
          <div className="divide-y divide-gray-50">
            {allOffers.map(offer => {
              const today = new Date().toISOString().slice(0, 10);
              const isCurrent = offer.isActive && offer.startDate <= today && offer.endDate >= today;
              return (
                <div key={offer._id} className="px-5 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-800">{offer.title}</p>
                      <OfferTypeBadge type={offer.type} />
                      {isCurrent && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{m.adminOffersBadgeLive()}</span>}
                      {!offer.isActive && <span className="text-[10px] font-bold bg-gray-100 text-[var(--color-ink-fade)] px-1.5 py-0.5 rounded-full">{m.adminOffersBadgeInactive()}</span>}
                    </div>
                    {offer.description && <p className="text-xs text-[var(--color-ink-fade)] mt-0.5">{offer.description}</p>}
                    <p className="text-xs text-[var(--color-ink-fade)] mt-1">
                      {offer.type === "free" ? m.adminOffersNoFeeShort() : `${offer.flatFeeAmount?.toLocaleString()} IQD`}
                      {" · "}{formatDate(offer.startDate)} → {formatDate(offer.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {offer.isActive ? (
                      <button onClick={() => setConfirmDeactivate(offer._id)}
                        className="text-xs text-[var(--color-ink-fade)] hover:text-red-500 border border-[var(--color-hairline)] hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors">
                        {m.adminOffersDeactivate()}
                      </button>
                    ) : (
                      <button onClick={() => setConfirmReactivate(offer._id)}
                        className="text-xs text-[var(--color-ink-fade)] hover:text-green-600 border border-[var(--color-hairline)] hover:border-green-200 px-3 py-1.5 rounded-lg transition-colors">
                        {m.adminOffersReactivate()}
                      </button>
                    )}
                    <button onClick={() => setConfirmDelete(offer._id)}
                      className="text-xs text-gray-300 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-50">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Deactivate confirmation */}
      {confirmDeactivate && (
        <BottomSheet open={true} onClose={() => setConfirmDeactivate(null)}>
          <div className="p-4 sm:p-3">
            <p className="text-[13px] font-semibold text-[var(--color-ink)] mb-1">
              Deactivate this offer?
            </p>
            <p className="text-xs text-[var(--color-ink-fade)] mb-3">
              The offer will be deactivated and sellers will no longer see it.
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const offer = allOffers?.find(o => o._id === confirmDeactivate);
                  await deactivateOffer({ id: confirmDeactivate });
                  await createLog({
                    action: "offer_deactivated",
                    notes: offer?.title || undefined,
                  });
                  setConfirmDeactivate(null);
                }}
                className="flex-1 text-sm bg-[var(--color-ember-600)] hover:bg-[var(--color-ember-700)] text-white font-semibold py-2.5 rounded-xl transition-colors">
                Deactivate
              </button>
              <button
                onClick={() => setConfirmDeactivate(null)}
                className="flex-1 text-sm bg-[var(--color-cream-deep)] hover:bg-[var(--color-hairline)] text-[var(--color-ink)] py-2.5 rounded-xl transition-colors">
                {m.adminCancel()}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Reactivate confirmation */}
      {confirmReactivate && (
        <BottomSheet open={true} onClose={() => setConfirmReactivate(null)}>
          <div className="p-4 sm:p-3">
            <p className="text-[13px] font-semibold text-[var(--color-ink)] mb-1">
              Reactivate this offer?
            </p>
            <p className="text-xs text-[var(--color-ink-fade)] mb-3">
              The offer will be reactivated and sellers will see it again.
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const offer = allOffers?.find(o => o._id === confirmReactivate);
                  await reactivateOffer({ id: confirmReactivate });
                  await createLog({
                    action: "offer_reactivated",
                    notes: offer?.title || undefined,
                  });
                  setConfirmReactivate(null);
                }}
                className="flex-1 text-sm bg-[var(--color-ember-600)] hover:bg-[var(--color-ember-700)] text-white font-semibold py-2.5 rounded-xl transition-colors">
                Reactivate
              </button>
              <button
                onClick={() => setConfirmReactivate(null)}
                className="flex-1 text-sm bg-[var(--color-cream-deep)] hover:bg-[var(--color-hairline)] text-[var(--color-ink)] py-2.5 rounded-xl transition-colors">
                {m.adminCancel()}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <BottomSheet open={true} onClose={() => setConfirmDelete(null)}>
          <div className="p-4 sm:p-3">
            <p className="text-[13px] font-semibold text-[var(--color-ink)] mb-1">
              Delete this offer?
            </p>
            <p className="text-xs text-[var(--color-ink-fade)] mb-3">
              This action cannot be undone. The offer will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const offer = allOffers?.find(o => o._id === confirmDelete);
                  await deleteOffer({ id: confirmDelete });
                  await createLog({
                    action: "offer_deleted",
                    notes: offer?.title || undefined,
                  });
                  setConfirmDelete(null);
                }}
                className="flex-1 text-sm bg-[var(--color-ember-600)] hover:bg-[var(--color-ember-700)] text-white font-semibold py-2.5 rounded-xl transition-colors">
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 text-sm bg-[var(--color-cream-deep)] hover:bg-[var(--color-hairline)] text-[var(--color-ink)] py-2.5 rounded-xl transition-colors">
                {m.adminCancel()}
              </button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
