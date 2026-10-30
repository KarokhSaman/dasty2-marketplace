import { getLocale } from "@/paraglide/runtime";

// WhatsApp reminder to a seller about the service fees they owe, sent by the
// admin from the Fees page. Arabic when the admin uses the site in Arabic,
// Kurdish otherwise (English included), like the approval message.

// Where sellers send their service fees (Super Qi, FIB or FastPay).
export const FEE_PAYMENT_NUMBER = "07724944244";

// Invisible left-to-right marks keep the number and amount in order inside a
// right-to-left line.
const LRM = "\u200E";
// A leading right-to-left mark keeps a line that holds only digits (the
// payment number) right-to-left, like the rest of the message.
const RLM = "\u200F";

const MESSAGES = {
  ckb: (total, number, items) => `*سڵاو گیان* 👋
پیرۆزە کاڵاکەت فرۆشرا 🤍

🧾 *کرێی خزمەتگوزاری بۆ فرۆشتنەکانت*
${items("کاڵای", "کرێ", "دینار")}💰 کۆی گشتی: *${total} دینار*

> 💳 دەتوانیت لە ڕێگەی *Super Qi* یان *FIB* یان *FastPay* پارەکە بنێریت بۆ ئەم ژمارەیە:
> *${number}*

لەگەڵ ڕێزماندا،
تیمی ماڵپەڕی منداڵان 🧸`,
  ar: (total, number, items) => `*مرحباً عزيزي* 👋
مبروك، تم بيع منتجك 🤍

🧾 *رسوم الخدمة لمبيعاتك*
${items("المنتج", "الرسوم", "دينار")}💰 المجموع: *${total} دينار*

> 💳 يمكنك الدفع عبر *Super Qi* أو *FIB* أو *FastPay* على هذا الرقم:
> *${number}*

مع خالص التحيات،
فريق موقع Mndallan 🧸`,
};

/**
 * `total` is the formatted amount, e.g. "15,000"; `items` the sold items, each
 * `{ code, fee }` with the fee formatted ("26-0096", "5,000"), one line each.
 */
export function feeReminderMessage(total, items = []) {
  const build = getLocale() === "ar" ? MESSAGES.ar : MESSAGES.ckb;
  // Each line opens with a word, not the code: WhatsApp picks a line's
  // direction from its first letter, and a leading code turned the line
  // left-to-right and scrambled the fee.
  const lines = (item, fee, currency) => items
    .map((it) => `🏷️ ${item} ${it.code ? `*${LRM}#${it.code}${LRM}*` : "—"} · ${fee}: *${it.fee} ${currency}*\n`)
    .join("");
  return build(`${LRM}${total}${LRM}`, `${RLM}${FEE_PAYMENT_NUMBER}`, lines);
}
