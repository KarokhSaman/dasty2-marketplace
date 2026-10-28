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
${code ? `🏷️ کۆدی کاڵاکەتان: ${code}\n` : ""}📲 ئەگەر کڕیار هەبێت، ڕاستەوخۆ لە ڕێگەی ئەم ژمارەی واتسئاپەوە پەیوەندیتان پێوە دەکات.

> 📌 *تێبینییەکی گرنگ*
> هەر کاتێک کاڵاکەتان فرۆشرا یان بەردەست نەما، تکایە ڕاستەوخۆ پۆستەکە بسڕنەوە، یاخود لە ڕێگەی واتسئاپ یان ئینستاگرامەوە ئاگادارمان بکەنەوە.

لەگەڵ ڕێزماندا،
تیمی *منداڵان* 🧸`,
  ar: (code) => `*مرحباً وتحية طيبة* 👋
شكراً لاختياركم *Mndallan* لبيع منتجاتكم 🤍

✅ تمت الموافقة على منشوركم ونشره بنجاح.
${code ? `🏷️ رمز المنتج: ${code}\n` : ""}📲 إذا كان هناك مشترٍ، سيتواصل معكم مباشرةً عبر رقم الواتساب هذا.

> 📌 *ملاحظة مهمة*
> عند بيع المنتج أو عدم توفره، يُرجى حذف المنشور مباشرةً، أو إبلاغنا عبر الواتساب أو الإنستغرام.

مع خالص التحيات،
فريق *Mndallan* 🧸`,
};

export function approvalMessage(product) {
  return (getLocale() === "ar" ? MESSAGES.ar : MESSAGES.ckb)(codeOf(product));
}
