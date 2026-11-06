import { messageLocale, renderTemplate } from "@/components/admin/messageTemplates";
import { localPhone, waUsername } from "@/components/admin/ui";

// WhatsApp messages for connecting a buyer with a seller and following up,
// sent by the admin from their own WhatsApp. The wording is in
// messageTemplates.js.

const LRM = "\u200E";
const RLM = "\u200F";
const code = (p) => (p.seq ? `*${LRM}#${p.seq}${LRM}*` : "");
// A phone number alone on its own plain line (no bold, no quote), so WhatsApp
// makes it tappable and it can be copied by itself. The leading RLM keeps the
// line right-aligned in the right-to-left message.
// Iraqi numbers show the local way ("+9647724944244" → "07724944244"), with
// no spaces so the digits never reorder in right-to-left text.
const phoneLine = (phone) => `${RLM}${localPhone(phone).replace(/[\s-]+/g, "")}`;
const amount = (n) => `${LRM}${Number(n ?? 0).toLocaleString("en-US")}${LRM}`;

const BUYER_LABELS = {
  ckb: { username: "👤 ناوی کڕیار لە واتساپ:", phone: "📞 ژمارەی کڕیار:" },
  ar: { username: "👤 اسم المشتري في واتساب:", phone: "📞 رقم المشتري:" },
};

export function buyerIntroMessage(p, sellerPhone) {
  return renderTemplate("buyerIntro", {
    title: p.title,
    code: code(p),
    price: amount(p.price),
    sellerPhone: phoneLine(sellerPhone),
  });
}

export function sellerHeadsUpMessage(p, buyerPhone) {
  const buyer = buyerPhone?.trim();
  // a WhatsApp username instead of a number: the seller finds the buyer by it
  const username = waUsername(buyer);
  const labels = BUYER_LABELS[messageLocale()];
  return renderTemplate("sellerHeadsUp", {
    title: p.title,
    code: code(p),
    buyer: username ? `${labels.username}\n${RLM}${username}` : buyer ? `${labels.phone}\n${phoneLine(buyer)}` : null,
  });
}

export function soldFollowUpMessage(p) {
  // a stocked product sells unit by unit: ask how many
  return renderTemplate((p.stock ?? 1) > 1 ? "soldFollowUpStock" : "soldFollowUp", { title: p.title, code: code(p) });
}

export function stillForSaleMessage(p) {
  return renderTemplate("stillForSale", { title: p.title, code: code(p) });
}
