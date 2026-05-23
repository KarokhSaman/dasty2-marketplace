import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function formatDate(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function OfferTypeBadge({ type }) {
  return type === "free"
    ? <span className="text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">No Fee</span>
    : <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Flat Fee</span>;
}

export default function AdminOffersPage() {
  const allOffers   = useQuery(api.offers.getAll);
  const activeOffer = useQuery(api.offers.getActive);
  const createOffer     = useMutation(api.offers.create);
  const deactivateOffer = useMutation(api.offers.deactivate);
  const reactivateOffer = useMutation(api.offers.reactivate);
  const deleteOffer     = useMutation(api.offers.deleteOffer);

  const [adminEmail, setAdminEmail] = useState("");
  useEffect(() => {
    fetch("/api/admin/me").then(r => r.json()).then(d => setAdminEmail(d.email ?? "admin"));
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const [title,         setTitle]         = useState("");
  const [description,   setDescription]   = useState("");
  const [type,          setType]           = useState("free");
  const [flatFeeAmount, setFlatFeeAmount]  = useState("");
  const [startDate,     setStartDate]      = useState(today);
  const [endDate,       setEndDate]        = useState("");
  const [submitting,    setSubmitting]     = useState(false);
  const [success,       setSuccess]        = useState(false);
  const [confirmDel,    setConfirmDel]     = useState(null);

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim() || !startDate || !endDate) return;
    setSubmitting(true);
    await createOffer({
      title:         title.trim(),
      adminEmail,
      description:   description.trim(),
      type,
      flatFeeAmount: type === "flat_fee" ? Number(flatFeeAmount) : undefined,
      startDate,
      endDate,
    });
    setTitle(""); setDescription(""); setFlatFeeAmount(""); setEndDate("");
    setType("free");
    setSubmitting(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Offers & Promotions</h1>

      {/* ── Active offer ── */}
      {activeOffer ? (
        <div className="bg-gradient-to-br from-green-500 to-emerald-400 rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 end-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 pointer-events-none"/>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">ACTIVE NOW</span>
              </div>
              <h2 className="text-xl font-bold">{activeOffer.title}</h2>
              {activeOffer.description && <p className="text-green-100 text-sm mt-0.5">{activeOffer.description}</p>}
              <p className="text-green-100 text-xs mt-2">
                {activeOffer.type === "free"
                  ? "No service fee for any item"
                  : `Fixed fee: ${activeOffer.flatFeeAmount?.toLocaleString()} IQD for any price range`}
              </p>
              <p className="text-green-100 text-xs mt-1">
                {formatDate(activeOffer.startDate)} → {formatDate(activeOffer.endDate)}
              </p>
            </div>
            <button
              onClick={() => deactivateOffer({ id: activeOffer._id, adminEmail })}
              className="shrink-0 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
            >
              Deactivate
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gray-100 rounded-2xl px-5 py-4 text-sm text-gray-500 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          No active offer right now.
        </div>
      )}

      {/* ── Create new offer ── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="text-base font-bold text-gray-800 mb-5">Create New Offer</h2>

        {success && (
          <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700 font-medium">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
            Offer created and all sellers notified!
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Offer Title <span className="text-rose-500">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="e.g. Ramadan Special Offer"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"/>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Short note visible to sellers (optional)"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"/>
          </div>

          {/* Fee type toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fee Type <span className="text-rose-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { val: "free",     label: "No Service Fee",   sub: "0 IQD for all items" },
                { val: "flat_fee", label: "Fixed Flat Fee",   sub: "Same amount for all prices" },
              ].map(opt => (
                <button
                  key={opt.val} type="button"
                  onClick={() => setType(opt.val)}
                  className={`text-start p-3.5 rounded-xl border-2 transition-colors ${
                    type === opt.val
                      ? "border-rose-500 bg-rose-50"
                      : "border-gray-200 hover:border-rose-300"
                  }`}
                >
                  <p className={`text-sm font-semibold ${type === opt.val ? "text-rose-700" : "text-gray-800"}`}>{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          {type === "flat_fee" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Flat Fee Amount (IQD) <span className="text-rose-500">*</span></label>
              <input
                type="number" min={0} value={flatFeeAmount}
                onChange={e => setFlatFeeAmount(e.target.value)}
                placeholder="e.g. 2000" required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" dir="ltr"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Start Date <span className="text-rose-500">*</span></label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">End Date <span className="text-rose-500">*</span></label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} required min={startDate}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"/>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <p className="text-xs text-amber-700">Creating this offer will immediately send a notification to all active sellers.</p>
          </div>

          <button type="submit" disabled={submitting}
            className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
            {submitting ? "Creating & notifying sellers…" : "Create Offer & Notify All Sellers"}
          </button>
        </form>
      </div>

      {/* ── Past offers ── */}
      {allOffers && allOffers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-5 py-3 border-b border-gray-50">
            All Offers
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
                      {isCurrent && <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">LIVE</span>}
                      {!offer.isActive && <span className="text-[10px] font-bold bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">INACTIVE</span>}
                    </div>
                    {offer.description && <p className="text-xs text-gray-400 mt-0.5">{offer.description}</p>}
                    <p className="text-xs text-gray-400 mt-1">
                      {offer.type === "free" ? "No fee" : `${offer.flatFeeAmount?.toLocaleString()} IQD`}
                      {" · "}{formatDate(offer.startDate)} → {formatDate(offer.endDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {offer.isActive ? (
                      <button onClick={() => deactivateOffer({ id: offer._id, adminEmail })}
                        className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors">
                        Deactivate
                      </button>
                    ) : (
                      <button onClick={() => reactivateOffer({ id: offer._id, adminEmail })}
                        className="text-xs text-gray-400 hover:text-green-600 border border-gray-200 hover:border-green-200 px-3 py-1.5 rounded-lg transition-colors">
                        Reactivate
                      </button>
                    )}
                    {confirmDel === offer._id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => { deleteOffer({ id: offer._id, adminEmail }); setConfirmDel(null); }}
                          className="text-xs bg-red-500 hover:bg-red-600 text-white font-semibold px-2 py-1.5 rounded-lg transition-colors">✓</button>
                        <button onClick={() => setConfirmDel(null)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1.5 rounded-lg transition-colors">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmDel(offer._id)}
                        className="text-xs text-gray-300 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-50">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
