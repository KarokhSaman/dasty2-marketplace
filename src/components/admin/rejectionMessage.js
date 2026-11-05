import { getLocale } from "@/paraglide/runtime";
import * as m from "@/paraglide/messages";
import { codeOf } from "@/components/admin/approvalMessage";

// WhatsApp message to a seller once their post is rejected, sent by the admin
// from their own WhatsApp: which post, why, and how to fix it. Arabic when the
// admin uses the site in Arabic, Kurdish otherwise, like the approval message.

// For each ready reason: the same reason in Arabic (it is saved in Kurdish) and
// what the seller should do. `link: false` when editing the post can't help.
const REASONS = [
  { reason: m.rejectReasonPhotos,
    ckb: "وێنەی ڕوون و لە شوێنێکی ڕووناکدا بگرن و لە جێی وێنەکانی ئێستا دایبنێن.",
    ar: "التقطوا صوراً واضحة في مكان جيد الإضاءة وضعوها مكان الصور الحالية." },
  { reason: m.rejectReasonCategory,
    ckb: "پۆلی دروستی کاڵاکە هەڵبژێرن.",
    ar: "اختاروا الفئة الصحيحة للمنتج." },
  { reason: m.rejectReasonPrice,
    ckb: "نرخەکە بپشکنن و نرخی دروست بنووسن.",
    ar: "راجعوا السعر واكتبوا السعر الصحيح." },
  { reason: m.rejectReasonDetails,
    ckb: "زانیاری زیاتر لەسەر کاڵاکە بنووسن، وەک براند، قەبارە و باری کاڵاکە.",
    ar: "أضيفوا معلومات أكثر عن المنتج، مثل العلامة التجارية والمقاس والحالة." },
  { reason: m.rejectReasonOwnPhoto,
    ckb: "خۆتان وێنەی کاڵاکە بگرن و لە جێی وێنەکانی ئینتەرنێت دایبنێن.",
    ar: "التقطوا صوراً للمنتج بأنفسكم وضعوها مكان صور الإنترنت." },
  { reason: m.rejectReasonDuplicate,
    ckb: "ئەم کاڵایە پێشتر بڵاوکراوەتەوە، بۆیە پێویست بە پۆستێکی تر ناکات. ئەگەر کاڵایەکی جیاوازە، جیاوازییەکەی لە وەسفەکەدا بنووسن.",
    ar: "هذا المنتج منشور من قبل، فلا حاجة لمنشور آخر. إذا كان منتجاً مختلفاً، اكتبوا الفرق في الوصف." },
  { reason: m.rejectReasonNotBaby, link: false,
    ckb: "لە ماڵپەڕەکەدا تەنها کاڵای منداڵان بڵاو دەکەینەوە، بۆیە ئەم کاڵایە ناتوانرێت بڵاوبکرێتەوە. ئەگەر پێتان وایە هەڵەیەک هەیە، وەڵامی ئەم نامەیە بدەنەوە.",
    ar: "ننشر منتجات الأطفال فقط على الموقع، لذا لا يمكن نشر هذا المنتج. إذا كنتم تعتقدون أن هناك خطأ، ردوا على هذه الرسالة." },
];
const OTHER = { ckb: "ئەو خاڵەی سەرەوە لە پۆستەکەدا چاک بکەن.", ar: "صححوا النقطة المذكورة أعلاه في المنشور." };
// A reason the admin typed, next to ready ones.
const OTHER_TOO = { ckb: "خاڵەکەی تری سەرەوەش چاک بکەن.", ar: "صححوا النقطة الأخرى المذكورة أعلاه أيضاً." };

// Several reasons are saved together in the post's notes with this between them.
export const REASON_SEPARATOR = " · ";

const list = (lines) => (lines.length === 1 ? lines[0] : lines.map((l) => `• ${l}`).join("\n"));

const MESSAGES = {
  ckb: ({ title, code, reason, fix, url, button }) => `*سڵاو و ڕێز* 👋
سوپاس بۆ ناردنی پۆستەکەتان بۆ *«منداڵان»* 🤍

❌ پۆستی *${title}*${code ? ` · ${code}` : ""} قبووڵ نەکرا.
📝 *هۆکار:*${reason.includes("\n") ? "\n" : " "}${reason}

${url ? "🛠️ *چۆن چاکی بکەن:*" : "📌 *تێبینی:*"}
${fix}
${url ? `\n🔗 لەم لینکەوە پۆستەکە بکەنەوە، چاکی بکەن و دوگمەی «${button}» دابگرن:\n${url}\n\n> پاش ئەوە دووبارە سەیری دەکەینەوە و ئاگادارتان دەکەینەوە.\n` : ""}
لەگەڵ ڕێزماندا،
تیمی ماڵپەڕی منداڵان 🧸`,
  ar: ({ title, code, reason, fix, url, button }) => `*مرحباً وتحية طيبة* 👋
شكراً لإرسال منشوركم إلى *Mndallan* 🤍

❌ لم تتم الموافقة على منشور *${title}*${code ? ` · ${code}` : ""}.
📝 *السبب:*${reason.includes("\n") ? "\n" : " "}${reason}

${url ? "🛠️ *كيفية الإصلاح:*" : "📌 *ملاحظة:*"}
${fix}
${url ? `\n🔗 افتحوا المنشور من هذا الرابط، أصلحوه واضغطوا زر «${button}»:\n${url}\n\n> بعد ذلك سنراجعه مرة أخرى ونبلغكم.\n` : ""}
مع خالص التحيات،
فريق موقع Mndallan 🧸`,
};

export function rejectionMessage(product, reason) {
  const locale = getLocale() === "ar" ? "ar" : "ckb";
  const parts = reason.split(REASON_SEPARATOR).map((text) => ({
    text: text.trim(),
    known: REASONS.find((r) => r.reason({}, { locale: "ckb" }) === text.trim()),
  }));
  // Fixing anything else can't help a post that can't be published at all.
  const noFix = parts.find((x) => x.known?.link === false);
  const shown = noFix ? [noFix] : parts;
  const path = `${locale === "ar" ? "/ar" : ""}/seller/products/${product.id ?? product._id}/edit?from=rejection`;
  return MESSAGES[locale]({
    title: product.title,
    code: codeOf(product),
    reason: list(shown.map((x) => (x.known ? x.known.reason({}, { locale }) : x.text))),
    fix: list(shown.map((x) => (x.known ?? (shown.length > 1 ? OTHER_TOO : OTHER))[locale])),
    url: noFix ? null : `${window.location.origin}${path}`,
    button: m.editProductBtn({}, { locale }),
  });
}
