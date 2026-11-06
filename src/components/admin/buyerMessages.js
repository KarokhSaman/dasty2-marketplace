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

// One line per post in a combined message: "• *#26-0095* · Chicco Stroller".
const itemList = (list) => list.map((p) => `• ${code(p)} · ${p.title}`.replace(/ · $/, "")).join("\n");

// Takes one product or a list of a seller's products. For 2+ it sends a single
// message that lists them all, so the seller isn't messaged once per item.
export function soldFollowUpMessage(input) {
  const list = Array.isArray(input) ? input : [input];
  if (list.length > 1) return renderTemplate("soldFollowUpMany", { items: itemList(list) });
  const p = list[0];
  // a stocked product sells unit by unit: ask how many
  return renderTemplate((p.stock ?? 1) > 1 ? "soldFollowUpStock" : "soldFollowUp", { title: p.title, code: code(p) });
}

export function stillForSaleMessage(input) {
  const list = Array.isArray(input) ? input : [input];
  if (list.length > 1) return renderTemplate("stillForSaleMany", { items: itemList(list) });
  return renderTemplate("stillForSale", { title: list[0].title, code: code(list[0]) });
}
