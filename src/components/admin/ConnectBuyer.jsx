import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getCityLabel } from "@/lib/cities";
import { errorMessage } from "@/lib/errors";
import { buyerIntroMessage, sellerHeadsUpMessage } from "@/components/admin/buyerMessages";
import {
  Panel, StatusChip, Code, Thumb, btn, fmtIQD, inputCls, labelCls, useToast, waLink, fmtPhone, waUsername, IconWhatsApp,
} from "@/components/admin/ui";

const daysAgo = (iso) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)) : null);

// Buyers already connected for a product, newest first: when, the number if
// one was entered (tap to message them), and which admin.
export function BuyerLeads({ productId, total }) {
  const leads = useQuery(api.leads.listForProduct, productId ? { id: productId } : "skip");
  if (!leads?.length) return null;
  const day = (iso) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return (
    <>
    {total > leads.length && <p className="mt-1 text-[11.5px] text-adm-fade">Latest {leads.length} of {total}</p>}
    <ul className="mt-1.5 space-y-1">
      {leads.map((l) => (
        <li key={l._id} className="flex items-center gap-2 text-[12px]">
          <span className="text-adm-fade w-12 shrink-0">{day(l.createdAt)}</span>
          {waUsername(l.buyerPhone) ? (
            <span className="inline-flex items-center gap-1 font-semibold text-adm-ink" dir="ltr">{waUsername(l.buyerPhone)}</span>
          ) : l.buyerPhone ? (
            <a href={waLink(l.buyerPhone)} target="_blank" rel="noopener noreferrer" dir="ltr"
              className="inline-flex items-center gap-1 font-semibold text-adm-wa tabular-nums">
              <IconWhatsApp className="w-3.5 h-3.5" /> {fmtPhone(l.buyerPhone)}
            </a>
          ) : (
            <span className="text-adm-fade">no number entered</span>
          )}
          <span className="ms-auto text-adm-fade truncate">{l.adminName}</span>
        </li>
      ))}
    </ul>
    </>
  );
}

// The code the buyer sent, in any form ("0096", "#26-0096", "26 0096"), turned
// into a product code like "26-0096". A bare number gets this year's prefix.
function normalizeCode(raw) {
  const d = String(raw ?? "").replace(/[٠-٩]/g, (c) => "٠١٢٣٤٥٦٧٨٩".indexOf(c)).replace(/\D/g, "");
  if (!d) return "";
  if (d.length > 4) return `${d.slice(0, -4)}-${d.slice(-4)}`;
  return `${String(new Date().getFullYear()).slice(2)}-${d.padStart(4, "0")}`;
}

// A buyer asked about an item: find it by its code, then send the buyer the
// seller's number and tell the seller a buyer is coming. The first message
// sent records the connection, so the product comes back for a follow-up.
export default function ConnectBuyer({ products, initial, onClose, onOpenProduct }) {
  const connect = useMutation(api.leads.connectBuyer);
  const toast = useToast();
  const [codeText, setCodeText] = useState(initial?.seq ?? "");
  const [buyer, setBuyer] = useState("");
  const recorded = useRef(null);

  const wanted = normalizeCode(codeText);
  const product = useMemo(() => {
    if (!wanted) return null;
    if (initial?.seq === wanted) return initial;
    return (products ?? []).find((p) => p.seq === wanted) ?? null;
  }, [products, wanted, initial]);
  const live = product?.status === "approved";
  // A username can't open a chat by link, so "Send to buyer" opens the chat picker.
  const username = waUsername(buyer);
  const buyerNumber = username ? "" : buyer.trim();

  async function record() {
    if (!product || recorded.current === product._id) return;
    recorded.current = product._id;
    try {
      await connect({ id: product._id, buyerPhone: username ?? (buyerNumber || undefined) });
      toast("Buyer connection recorded");
    } catch (err) {
      recorded.current = null;
      toast(errorMessage(err, "Could not record the connection"), "error");
    }
  }

  const days = product ? daysAgo(product.approvedAt ?? product.dateAdded) : null;
  // What was typed stays: only the ✕ or a swipe on the handle closes it.
  return (
    <Panel open onClose={onClose} title="Connect buyer" short closeOnBackdrop={false}>
      <div className="space-y-3">
        <div>
          <label className={labelCls} htmlFor="cb-code">Item code the buyer sent</label>
          <input id="cb-code" value={codeText} onChange={(e) => { setCodeText(e.target.value); recorded.current = null; }}
            inputMode="numeric" dir="ltr" placeholder="0096 or #26-0096" autoFocus={!initial} className={inputCls} />
        </div>
        <div>
          <label className={labelCls} htmlFor="cb-buyer">Buyer's WhatsApp number or @username (optional)</label>
          <input id="cb-buyer" value={buyer} onChange={(e) => setBuyer(e.target.value)} dir="ltr" autoCapitalize="none" autoCorrect="off"
            placeholder="0750 123 4567 or @ahmed" className={inputCls} />
          <p className="text-[11.5px] text-adm-fade mt-1">
            {username
              ? "The seller gets the username to find the buyer. Send to buyer opens WhatsApp's chat list: pick the buyer's chat."
              : "Fills in the buyer's number in the message to the seller, and opens the buyer's chat directly."}
          </p>
        </div>

        {wanted && !product && (
          <p className="rounded-xl bg-adm-sunk px-3 py-2.5 text-[13px] text-adm-soft">No product with code <b dir="ltr">#{wanted}</b>.</p>
        )}

        {product && (
          <>
            <button type="button" onClick={() => onOpenProduct?.(product)}
              className="w-full flex gap-3 items-center text-start rounded-2xl border border-adm-line bg-adm-surface p-2.5">
              <Thumb src={product.photos?.[product.mainPhotoIndex ?? 0]} size={64} />
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2"><StatusChip status={product.status} /><Code>{product.seq}</Code></div>
                <p className="text-[14px] font-bold truncate" dir="auto">{product.title}</p>
                <p className="text-[12px] text-adm-soft">
                  <b className="text-adm-ink" dir="ltr">{fmtIQD(product.price)} IQD</b>
                  {product.city ? ` · ${getCityLabel(product.city, "en")}` : ""}
                  {days != null ? ` · posted ${days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} ago`}` : ""}
                </p>
              </div>
            </button>

            <div className="rounded-xl bg-adm-sunk px-3 py-2.5 text-[12.5px]">
              <b>Seller:</b> {product.sellerName}{product.storeName ? ` · ${product.storeName}` : ""} · <span dir="ltr" className="tabular-nums">{fmtPhone(product.sellerPhone)}</span>
              {product.leadCount ? <span className="block text-adm-soft">{product.leadCount} buyer{product.leadCount === 1 ? "" : "s"} connected before</span> : null}
              {product.leadCount ? <BuyerLeads productId={product._id} total={product.leadCount} /> : null}
            </div>

            {!live && (
              <p className="rounded-xl bg-st-pending-bg text-st-pending px-3 py-2.5 text-[12.5px] font-semibold">
                This item is not live ({product.status}). Check before connecting a buyer.
              </p>
            )}

            <a href={waLink(buyerNumber, buyerIntroMessage(product, product.sellerPhone))} target="_blank" rel="noopener noreferrer"
              onClick={record} className={`${btn("wa")} w-full`}>
              <IconWhatsApp className="w-4 h-4" /> Send to buyer (seller's number)
            </a>
            <a href={waLink(product.sellerPhone, sellerHeadsUpMessage(product, buyer))} target="_blank" rel="noopener noreferrer"
              onClick={record} className={`${btn("wa")} w-full`}>
              <IconWhatsApp className="w-4 h-4" /> Tell the seller a buyer is coming
            </a>
            <p className="text-[11.5px] text-adm-fade">Either message records the connection once; the item comes back in To do after 3 days to ask the seller whether it sold.</p>
          </>
        )}
      </div>
    </Panel>
  );
}
