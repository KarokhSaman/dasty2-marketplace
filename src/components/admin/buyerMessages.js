import { getLocale } from "@/paraglide/runtime";
import { localPhone, waUsername } from "@/components/admin/ui";

// WhatsApp messages for connecting a buyer with a seller and following up,
// sent by the admin from their own WhatsApp. Arabic when the admin uses the
// site in Arabic, Kurdish otherwise (English included), like the approval
// message.

const LRM = "‎";
const RLM = "‏";
const code = (p) => (p.seq ? `*${LRM}#${p.seq}${LRM}*` : "");
// A phone number alone on its own plain line (no bold, no quote), so WhatsApp
// makes it tappable and it can be copied by itself. The leading RLM keeps the
// line right-aligned in the right-to-left message.
// Iraqi numbers show the local way ("+9647724944244" → "07724944244"), with
// no spaces so the digits never reorder in right-to-left text.
const phoneLine = (phone) => `${RLM}${localPhone(phone).replace(/[\s-]+/g, "")}`;
const amount = (n) => `${LRM}${Number(n ?? 0).toLocaleString("en-US")}${LRM}`;
const ar = () => getLocale() === "ar";

export function buyerIntroMessage(p, sellerPhone) {
  return ar()
    ? `*مرحباً عزيزي* 👋
شكراً لتواصلك مع *Mndallan* 🤍

🏷️ المنتج: *${p.title}* · ${code(p)}
💰 السعر: *${amount(p.price)} دينار*
📞 رقم البائع:
${phoneLine(sellerPhone)}

> 📌 إذا اشتريته، يُرجى إبلاغنا.

فريق موقع Mndallan 🧸`
    : `*سڵاو گیان* 👋
سوپاس بۆ پەیوەندیکردن بە *«منداڵان»*ەوە 🤍

🏷️ کاڵا: *${p.title}* · ${code(p)}
💰 نرخ: *${amount(p.price)} دینار*
📞 ژمارەی فرۆشیار:
${phoneLine(sellerPhone)}

> 📌 ئەگەر کڕیت، تکایە ئاگادارمان بکەنەوە.

تیمی ماڵپەڕی منداڵان 🧸`;
}

export function sellerHeadsUpMessage(p, buyerPhone) {
  const buyer = buyerPhone?.trim();
  // a WhatsApp username instead of a number: the seller finds the buyer by it
  const username = waUsername(buyer);
  return ar()
    ? `*مرحباً عزيزي* 👋
مشترٍ سأل عن منتجك 🤍

🏷️ *${p.title}* · ${code(p)}
${username ? `👤 اسم المشتري في واتساب:\n${RLM}${username}\n` : buyer ? `📞 رقم المشتري:\n${phoneLine(buyer)}\n` : ""}📲 سيتواصل معك قريباً.\n
> 📌 عند بيعه، يُرجى إبلاغنا.

فريق موقع Mndallan 🧸`
    : `*سڵاو گیان* 👋
کڕیارێک داوای کاڵاکەتانی کرد 🤍

🏷️ *${p.title}* · ${code(p)}
${username ? `👤 ناوی کڕیار لە واتساپ:\n${RLM}${username}\n` : buyer ? `📞 ژمارەی کڕیار:\n${phoneLine(buyer)}\n` : ""}📲 بەم زووانە پەیوەندیتان پێوە دەکات.\n
> 📌 کاتێک فرۆشرا، تکایە ئاگادارمان بکەنەوە.

تیمی ماڵپەڕی منداڵان 🧸`;
}

export function soldFollowUpMessage(p) {
  // a stocked product sells unit by unit: ask how many
  if ((p.stock ?? 1) > 1) {
    return ar()
      ? `*مرحباً عزيزي* 👋
كم قطعة بعت من *${p.title}* · ${code(p)}؟ 🤍
يُرجى إخبارنا بعدد القطع المباعة وسعر البيع.

فريق موقع Mndallan 🧸`
      : `*سڵاو گیان* 👋
چەند دانە لە *${p.title}* · ${code(p)} فرۆشران؟ 🤍
تکایە ژمارەی فرۆشراوەکان و نرخی فرۆشتنەکەمان پێ بڵێن.

تیمی ماڵپەڕی منداڵان 🧸`;
  }
  return ar()
    ? `*مرحباً عزيزي* 👋
هل تم بيع *${p.title}* · ${code(p)}؟ 🤍
إذا تم بيعه، يُرجى إخبارنا بسعر البيع.

فريق موقع Mndallan 🧸`
    : `*سڵاو گیان* 👋
کاڵای *${p.title}* · ${code(p)} فرۆشرا؟ 🤍
ئەگەر فرۆشرا، تکایە نرخی فرۆشتنەکەمان پێ بڵێن.

تیمی ماڵپەڕی منداڵان 🧸`;
}

export function stillForSaleMessage(p) {
  return ar()
    ? `*مرحباً عزيزي* 👋
هل *${p.title}* · ${code(p)} ما زال متوفراً؟ 🤍
إذا تم بيعه أو لم يعد متوفراً، أبلغنا لنزيله من الموقع.

فريق موقع Mndallan 🧸`
    : `*سڵاو گیان* 👋
کاڵای *${p.title}* · ${code(p)} هێشتا بەردەستە؟ 🤍
ئەگەر فرۆشرا یان نەما، ئاگادارمان بکەنەوە تا لە ماڵپەڕەکە لای ببەین.

تیمی ماڵپەڕی منداڵان 🧸`;
}
