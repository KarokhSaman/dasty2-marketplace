import { btn, Code, Thumb, waLink, IconWhatsApp } from "@/components/admin/ui";

export const DAY = 86400000;
export const ago = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / DAY);

// A live post nobody has confirmed with the seller for this long shows under
// Products → "Not checked", to ask the seller if it is still for sale.
export const UNCHECKED_DAYS = 60;
export const lastChecked = (p) => [p.approvedAt ?? p.dateAdded, p.availabilityCheckedAt].filter(Boolean).sort().pop();
export const isUnchecked = (p) => {
  if (p.status !== "approved") return false;
  const last = lastChecked(p);
  return !!last && ago(last) >= UNCHECKED_DAYS;
};

// A follow-up row: the product, why it is here, and its quick actions.
export function FollowRow({ product: p, note, onOpen, children }) {
  return (
    <div className="rounded-2xl border border-adm-line bg-adm-surface p-2.5 mb-2">
      <button type="button" onClick={() => onOpen(p)} className="flex gap-3 items-center w-full text-start">
        <Thumb src={p.photos?.[p.mainPhotoIndex ?? 0]} size={52} />
        <span className="flex-1 min-w-0">
          <span className="block text-[13.5px] font-semibold truncate">{p.title}</span>
          <span className="flex items-center gap-1.5 text-[11.5px] text-adm-soft"><Code>{p.seq}</Code> {note}</span>
        </span>
      </button>
      {/* Two even columns on phones, so four buttons make two tidy rows. */}
      <div className="grid grid-cols-2 gap-1.5 mt-2.5 sm:flex sm:flex-wrap">{children}</div>
    </div>
  );
}

// Group a list of posts by their seller, keeping the order they came in.
export function groupBySeller(list) {
  const groups = new Map();
  for (const p of list) {
    const g = groups.get(p.sellerId);
    if (g) g.push(p);
    else groups.set(p.sellerId, [p]);
  }
  return [...groups.values()];
}

// A seller's posts in a follow-up list. When they have more than one, the posts
// sit in one box under a single "Ask seller" button that sends one message
// listing them all — so the seller isn't messaged once per item. `children` is
// given `many` so each row can drop its own Ask seller button when grouped.
export function SellerBlock({ group, message, children }) {
  const many = group.length > 1;
  return (
    <div className={many ? "rounded-2xl border border-adm-line p-1.5 mb-2" : ""}>
      {many && (
        <div className="flex items-center gap-2 px-1.5 py-1.5">
          <span className="text-[11.5px] font-semibold text-adm-soft flex-1 min-w-0">{group.length} items from one seller</span>
          <a href={waLink(group[0].sellerPhone, message(group))} target="_blank" rel="noopener noreferrer" className={btn("wa", "sm")}>
            <IconWhatsApp className="w-3.5 h-3.5" /> Ask seller
          </a>
        </div>
      )}
      {children(many)}
    </div>
  );
}
