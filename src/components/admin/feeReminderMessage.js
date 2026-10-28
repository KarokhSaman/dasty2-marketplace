import { getLocale } from "@/paraglide/runtime";

// WhatsApp reminder to a seller about the service fees they owe, sent by the
// admin from the Fees page. Arabic when the admin uses the site in Arabic,
// Kurdish otherwise (English included), like the approval message.

// Where sellers send their service fees (Super Qi, FIB or FastPay).
export const FEE_PAYMENT_NUMBER = "07724944244";

// Invisible left-to-right marks keep the number and amount in order inside a
// right-to-left line.
const LRM = "\u200E";
const RLM = "\u200F";

const MESSAGES = {
  ckb: (total, number, items) => `*سڵاو گیان* 👋
سوپاس بۆ هەڵبژاردنی *«منداڵان»* 🤍

🧾 *کرێی خزمەتگوزاری بۆ فرۆشتنەکانت*
${items("دینار")}💰 کۆی گشتی: *${total} دینار*

> 💳 دەتوانیت لە ڕێگەی *Super Qi* یان *FIB* یان *FastPay* پارەکە بنێریت بۆ ئەم ژمارەیە:
> *${number}*

لەگەڵ ڕێزماندا،
تیمی *منداڵان* 🧸`,
  ar: (total, number, items) => `*مرحباً عزيزي* 👋
شكراً لاختيارك *Mndallan* 🤍

🧾 *رسوم الخدمة لمبيعاتك*
${items("دينار")}💰 المجموع: *${total} دينار*

> 💳 يمكنك الدفع عبر *Super Qi* أو *FIB* أو *FastPay* على هذا الرقم:
> *${number}*

مع خالص التحيات،
فريق *Mndallan* 🧸`,
};

/**
 * `total` is the formatted amount, e.g. "15,000"; `items` the sold items, each
 * `{ code, fee }` with the fee formatted ("26-0096", "5,000"), one line each.
 */
export function feeReminderMessage(total, items = []) {
  const build = getLocale() === "ar" ? MESSAGES.ar : MESSAGES.ckb;
  const lines = (currency) => items
    // RLM after the code ends its left-to-right part, so the fee and currency
    // read in the line's own order (fee, then دینار).
    .map((it) => `🏷️ ${it.code ? `*${LRM}#${it.code}${LRM}*` : "—"}${RLM} · ${it.fee} ${currency}\n`)
    .join("");
  return build(`${LRM}${total}${LRM}`, `${LRM}${FEE_PAYMENT_NUMBER}${LRM}`, lines);
}
