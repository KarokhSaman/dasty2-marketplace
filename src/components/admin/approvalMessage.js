import { getLocale } from "@/paraglide/runtime";

// WhatsApp message to a seller once their post is approved, sent by the admin
// from their own WhatsApp (prefilled with the item code). Arabic when the admin
// uses the site in Arabic, Kurdish otherwise (English included). Later this can
// be sent automatically through Pixelence.

// Invisible left-to-right marks keep the code reading "#26-0096" inside a
// right-to-left line (otherwise the # jumps to the other end).
const LRM = "‎";
const codeOf = (product) => (product.seq ? `*${LRM}#${product.seq}${LRM}*` : "");

const MESSAGES = {
  ckb: (code) => `*سڵاو و ڕێز* 👋
سوپاس بۆ هەڵبژاردنی *«منداڵان»* بۆ فرۆشتنی کاڵاکانتان 🤍

✅ پۆستەکەتان بە سەرکەوتوویی قبووڵ کرا و بڵاوکرایەوە.
${code ? `🏷️ کۆدی کاڵاکەتان: ${code}\n` : ""}🔒 ژمارەکەتان لە ماڵپەڕەکەدا نیشان نادرێت؛ کاتێک کڕیارێک پەیوەندیمان پێوە دەکات، ژمارەکەتانی پێ دەدەین.

> 📌 *تێبینییەکی گرنگ*
> هەر کاتێک کاڵاکەتان بەردەست نەما یان لە ڕێگەی ترەوە فرۆشرا، تکایە ڕاستەوخۆ پۆستەکە بسڕنەوە، یاخود لە ڕێگەی واتسئاپ یان ئینستاگرامەوە ئاگادارمان بکەنەوە.

لەگەڵ ڕێزماندا،
تیمی ماڵپەڕی منداڵان 🧸`,
  ar: (code) => `*مرحباً وتحية طيبة* 👋
شكراً لاختياركم *Mndallan* لبيع منتجاتكم 🤍

✅ تمت الموافقة على منشوركم ونشره بنجاح.
${code ? `🏷️ رمز المنتج: ${code}\n` : ""}🔒 رقمكم لا يظهر على الموقع؛ عندما يتواصل معنا مشترٍ، نشارك رقمكم معه.

> 📌 *ملاحظة مهمة*
> عند عدم توفر المنتج أو بيعه بطريقة أخرى، يُرجى حذف المنشور مباشرةً، أو إبلاغنا عبر الواتساب أو الإنستغرام.

مع خالص التحيات،
فريق موقع Mndallan 🧸`,
};

export function approvalMessage(product) {
  return (getLocale() === "ar" ? MESSAGES.ar : MESSAGES.ckb)(codeOf(product));
}
