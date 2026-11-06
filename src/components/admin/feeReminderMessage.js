import { messageLocale, renderTemplate } from "@/components/admin/messageTemplates";

// WhatsApp reminder to a seller about the service fees they owe, sent by the
// admin from the Fees page. The wording is in messageTemplates.js.

// Where sellers send their service fees (Super Qi, FIB or FastPay).
export const FEE_PAYMENT_NUMBER = "07724944244";

// Invisible left-to-right marks keep the number and amount in order inside a
// right-to-left line.
const LRM = "\u200E";
// The payment number sits alone on its own plain line (not bold, not in the
// quote), so WhatsApp makes it tappable and it can be copied by itself. A
// leading right-to-left mark keeps that line right-aligned like the rest.
const RLM = "\u200F";

const ITEM_WORDS = {
  ckb: { item: "کاڵای", fee: "کرێ", currency: "دینار" },
  ar: { item: "المنتج", fee: "الرسوم", currency: "دينار" },
};

/**
 * `total` is the formatted amount, e.g. "15,000"; `items` the sold items, each
 * `{ code, fee }` with the fee formatted ("26-0096", "5,000"), one line each.
 */
export function feeReminderMessage(total, items = []) {
  const { item, fee, currency } = ITEM_WORDS[messageLocale()];
  // Each line opens with a word, not the code: WhatsApp picks a line's
  // direction from its first letter, and a leading code turned the line
  // left-to-right and scrambled the fee.
  const lines = items
    .map((it) => `🏷️ ${item} ${it.code ? `*${LRM}#${it.code}${LRM}*` : "—"} · ${fee}: *${it.fee} ${currency}*`)
    .join("\n");
  return renderTemplate("feeReminder", {
    items: lines || null,
    total: `${LRM}${total}${LRM}`,
    number: `${RLM}${FEE_PAYMENT_NUMBER}`,
  });
}
