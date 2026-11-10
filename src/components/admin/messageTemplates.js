import { getLocale } from "@/paraglide/runtime";

// Every WhatsApp message the admin sends, in one list, with its original
// wording. The admin can reword them on the Message templates page; what they
// changed is saved in Convex and put on top of these with setMessageTemplates.
// Arabic when the admin uses the site in Arabic, Kurdish otherwise (English
// included).
//
// {name} is filled in when the message is made. A line whose value doesn't
// exist (null) is left out, like the code line on a post with no code.

const LRM = "‎";
const RLM = "‏";

const SAMPLE = {
  title: "Chicco Stroller",
  code: `*${LRM}#26-0095${LRM}*`,
  price: `${LRM}150,000${LRM}`,
  items: `• *${LRM}#26-0095${LRM}* · Chicco Stroller\n• *${LRM}#26-0090${LRM}* · IKEA Crib`,
  feeItems: `🏷️ کاڵای *${LRM}#26-0095${LRM}* · کرێ: *5,000 دینار*\n🏷️ کاڵای *${LRM}#26-0090${LRM}* · کرێ: *10,000 دینار*`,
  total: `${LRM}15,000${LRM}`,
  number: `${RLM}07724944244`,
  sellerPhone: `${RLM}07701234567`,
  buyer: `📞 07507654321`,
  reason: "پۆلەکە هەڵەیە",
  fix: "پۆلی دروستی کاڵاکە هەڵبژێرن.",
  link: "https://mndallan.com/seller/products/…/edit",
  button: "دووبارە ناردن",
};

const V = {
  title: { name: "title", hint: "Post name" },
  code: { name: "code", hint: "Post code" },
  price: { name: "price", hint: "Price" },
  items: { name: "items", hint: "List of the posts" },
  total: { name: "total", hint: "Total amount" },
  number: { name: "number", hint: "Payment number" },
  sellerPhone: { name: "sellerPhone", hint: "Seller's number" },
  buyer: { name: "buyer", hint: "Buyer's number or name" },
  reason: { name: "reason", hint: "Rejection reason" },
  fix: { name: "fix", hint: "How to fix it" },
  link: { name: "link", hint: "Link to the post" },
  button: { name: "button", hint: "Button name" },
};

const fixLine = (key, title, ckb, ar) => ({
  key, group: "fixes", title, when: "A line in the rejection message", vars: [], required: [], ckb, ar,
});

export const TEMPLATE_GROUPS = [
  { key: "posts", title: "Approved and rejected posts" },
  { key: "sold", title: "Sold items and fees" },
  { key: "buyers", title: "Connecting a buyer" },
  { key: "fixes", title: "How to fix it: one line per rejection reason" },
];

export const TEMPLATES = [
  {
    key: "approval", group: "posts", title: "Post approved",
    when: "After you approve one post", vars: [V.code], required: [],
    ckb: `*سڵاو و ڕێز* 👋
سوپاس بۆ هەڵبژاردنی *«منداڵان»* بۆ فرۆشتنی کاڵاکانتان 🤍

✅ پۆستەکەتان بە سەرکەوتوویی قبووڵ کرا و بڵاوکرایەوە.
🏷️ کۆدی کاڵاکەتان: {code}
🔒 ژمارەکەتان لە ماڵپەڕەکەدا نیشان نادرێت؛ کاتێک کڕیارێک پەیوەندیمان پێوە دەکات، ژمارەکەتانی پێ دەدەین.

> 📌 *تێبینییەکی گرنگ*
> هەر کاتێک کاڵاکەتان بەردەست نەما یان لە ڕێگەی ترەوە فرۆشرا، تکایە ڕاستەوخۆ پۆستەکە بسڕنەوە، یاخود لە ڕێگەی واتسئاپ یان ئینستاگرامەوە ئاگادارمان بکەنەوە.

لەگەڵ ڕێزماندا،
تیمی ماڵپەڕی منداڵان 🧸`,
    ar: `*مرحباً وتحية طيبة* 👋
شكراً لاختياركم *Mndallan* لبيع منتجاتكم 🤍

✅ تمت الموافقة على منشوركم ونشره بنجاح.
🏷️ رمز المنتج: {code}
🔒 رقمكم لا يظهر على الموقع؛ عندما يتواصل معنا مشترٍ، نشارك رقمكم معه.

> 📌 *ملاحظة مهمة*
> عند عدم توفر المنتج أو بيعه بطريقة أخرى، يُرجى حذف المنشور مباشرةً، أو إبلاغنا عبر الواتساب أو الإنستغرام.

مع خالص التحيات،
فريق موقع Mndallan 🧸`,
  },
  {
    key: "approvalMany", group: "posts", title: "Several posts approved",
    when: "When 2 or more posts from one seller are approved in one Review", vars: [V.items], required: ["items"],
    ckb: `*سڵاو و ڕێز* 👋
سوپاس بۆ هەڵبژاردنی *«منداڵان»* بۆ فرۆشتنی کاڵاکانتان 🤍

✅ پۆستەکانتان بە سەرکەوتوویی قبووڵ کران و بڵاوکرانەوە.
🏷️ کاڵاکانتان:
{items}

🔒 ژمارەکەتان لە ماڵپەڕەکەدا نیشان نادرێت؛ کاتێک کڕیارێک پەیوەندیمان پێوە دەکات، ژمارەکەتانی پێ دەدەین.

> 📌 *تێبینییەکی گرنگ*
> هەر کاتێک کاڵایەکتان بەردەست نەما یان لە ڕێگەی ترەوە فرۆشرا، تکایە ڕاستەوخۆ پۆستەکەی بسڕنەوە، یاخود لە ڕێگەی واتسئاپ یان ئینستاگرامەوە ئاگادارمان بکەنەوە.

لەگەڵ ڕێزماندا،
تیمی ماڵپەڕی منداڵان 🧸`,
    ar: `*مرحباً وتحية طيبة* 👋
شكراً لاختياركم *Mndallan* لبيع منتجاتكم 🤍

✅ تمت الموافقة على منشوراتكم ونشرها بنجاح.
🏷️ منتجاتكم:
{items}

🔒 رقمكم لا يظهر على الموقع؛ عندما يتواصل معنا مشترٍ، نشارك رقمكم معه.

> 📌 *ملاحظة مهمة*
> عند عدم توفر أي منتج أو بيعه بطريقة أخرى، يُرجى حذف منشوره مباشرةً، أو إبلاغنا عبر الواتساب أو الإنستغرام.

مع خالص التحيات،
فريق موقع Mndallan 🧸`,
  },
  {
    key: "rejection", group: "posts", title: "Post rejected",
    when: "After you reject a post the seller can fix", vars: [V.title, V.code, V.reason, V.fix, V.button, V.link], required: ["title", "reason", "fix", "link"],
    ckb: `*سڵاو و ڕێز* 👋
سوپاس بۆ ناردنی پۆستەکەتان بۆ *«منداڵان»* 🤍

❌ پۆستی *{title}* · {code} قبووڵ نەکرا.
📝 *هۆکار:* {reason}

🛠️ *چۆن چاکی بکەن:*
{fix}

🔗 لەم لینکەوە پۆستەکە بکەنەوە، چاکی بکەن و دوگمەی «{button}» دابگرن:
{link}

> پاش ئەوە دووبارە سەیری دەکەینەوە و ئاگادارتان دەکەینەوە.

لەگەڵ ڕێزماندا،
تیمی ماڵپەڕی منداڵان 🧸`,
    ar: `*مرحباً وتحية طيبة* 👋
شكراً لإرسال منشوركم إلى *Mndallan* 🤍

❌ لم تتم الموافقة على منشور *{title}* · {code}.
📝 *السبب:* {reason}

🛠️ *كيفية الإصلاح:*
{fix}

🔗 افتحوا المنشور من هذا الرابط، أصلحوه واضغطوا زر «{button}»:
{link}

> بعد ذلك سنراجعه مرة أخرى ونبلغكم.

مع خالص التحيات،
فريق موقع Mndallan 🧸`,
  },
  {
    key: "rejectionNoFix", group: "posts", title: "Post rejected, can't be fixed",
    when: "After you reject a post as not a baby product (no link)", vars: [V.title, V.code, V.reason, V.fix], required: ["title", "reason", "fix"],
    ckb: `*سڵاو و ڕێز* 👋
سوپاس بۆ ناردنی پۆستەکەتان بۆ *«منداڵان»* 🤍

❌ پۆستی *{title}* · {code} قبووڵ نەکرا.
📝 *هۆکار:* {reason}

📌 *تێبینی:*
{fix}

لەگەڵ ڕێزماندا،
تیمی ماڵپەڕی منداڵان 🧸`,
    ar: `*مرحباً وتحية طيبة* 👋
شكراً لإرسال منشوركم إلى *Mndallan* 🤍

❌ لم تتم الموافقة على منشور *{title}* · {code}.
📝 *السبب:* {reason}

📌 *ملاحظة:*
{fix}

مع خالص التحيات،
فريق موقع Mndallan 🧸`,
  },
  {
    key: "soldFollowUp", group: "sold", title: "Was it sold?",
    when: "To do: asking the seller after a buyer was connected", vars: [V.title, V.code], required: ["title"],
    ckb: `*سڵاو گیان* 👋
کاڵای *{title}* · {code} فرۆشرا؟ 🤍
ئەگەر فرۆشرا، تکایە نرخی فرۆشتنەکەمان پێ بڵێن.

> 📌 بۆیە ئەپرسینەوە بۆ ئەوەی ژمارەکەت بە کەسی تر نەدەین.

تیمی ماڵپەڕی منداڵان 🧸`,
    ar: `*مرحباً عزيزي* 👋
هل تم بيع *{title}* · {code}؟ 🤍
إذا تم بيعه، يُرجى إخبارنا بسعر البيع.

> 📌 نسأل حتى لا نعطي رقمك لشخص آخر.

فريق موقع Mndallan 🧸`,
  },
  {
    key: "soldFollowUpMany", group: "sold", title: "Was it sold? (several items)",
    when: "To do: asking the seller about several of their posts in one message", vars: [V.items], required: ["items"], sample: { items: SAMPLE.items },
    ckb: `*سڵاو گیان* 👋
ئەم کاڵایانەتان فرۆشران؟ 🤍
{items}
ئەگەر هەریەکێکیان فرۆشرا، تکایە نرخی فرۆشتنەکەی پێمان بڵێن.

> 📌 بۆیە ئەپرسینەوە بۆ ئەوەی ژمارەکەت بە کەسی تر نەدەین.

تیمی ماڵپەڕی منداڵان 🧸`,
    ar: `*مرحباً عزيزي* 👋
هل تم بيع هذه المنتجات؟ 🤍
{items}
إذا تم بيع أيٍّ منها، يُرجى إخبارنا بسعر بيعه.

> 📌 نسأل حتى لا نعطي رقمك لشخص آخر.

فريق موقع Mndallan 🧸`,
  },
  {
    key: "soldFollowUpStock", group: "sold", title: "How many were sold?",
    when: "The same follow-up, for a post with more than one piece", vars: [V.title, V.code], required: ["title"],
    ckb: `*سڵاو گیان* 👋
چەند دانە لە *{title}* · {code} فرۆشران؟ 🤍
تکایە ژمارەی فرۆشراوەکان و نرخی فرۆشتنەکەمان پێ بڵێن.

تیمی ماڵپەڕی منداڵان 🧸`,
    ar: `*مرحباً عزيزي* 👋
كم قطعة بعت من *{title}* · {code}؟ 🤍
يُرجى إخبارنا بعدد القطع المباعة وسعر البيع.

فريق موقع Mndallan 🧸`,
  },
  {
    key: "stillForSale", group: "sold", title: "Still for sale?",
    when: "To do: asking about an old post", vars: [V.title, V.code], required: ["title"],
    ckb: `*سڵاو گیان* 👋
کاڵای *{title}* · {code} هێشتا بەردەستە؟ 🤍
ئەگەر فرۆشرا یان نەما، ئاگادارمان بکەنەوە تا لە ماڵپەڕەکە لای ببەین.

تیمی ماڵپەڕی منداڵان 🧸`,
    ar: `*مرحباً عزيزي* 👋
هل *{title}* · {code} ما زال متوفراً؟ 🤍
إذا تم بيعه أو لم يعد متوفراً، أبلغنا لنزيله من الموقع.

فريق موقع Mndallan 🧸`,
  },
  {
    key: "stillForSaleMany", group: "sold", title: "Still for sale? (several items)",
    when: "To do: asking about several old posts from one seller in one message", vars: [V.items], required: ["items"], sample: { items: SAMPLE.items },
    ckb: `*سڵاو گیان* 👋
ئەم کاڵایانەتان هێشتا بەردەستن؟ 🤍
{items}
ئەگەر هەریەکێکیان فرۆشرا یان نەما، ئاگادارمان بکەنەوە تا لە ماڵپەڕەکە لای ببەین.

تیمی ماڵپەڕی منداڵان 🧸`,
    ar: `*مرحباً عزيزي* 👋
هل ما زالت هذه المنتجات متوفرة؟ 🤍
{items}
إذا تم بيع أيٍّ منها أو لم يعد متوفراً، أبلغنا لنزيله من الموقع.

فريق موقع Mndallan 🧸`,
  },
  {
    key: "feeReminder", group: "sold", title: "Fee reminder",
    when: "Fees page: the Send reminder button", vars: [V.items, V.total, V.number, V.link], required: ["items", "total", "number"], sample: { items: SAMPLE.feeItems, link: "https://mndallan.com/seller" },
    ckb: `*سڵاو گیان* 👋
پیرۆزە کاڵاکەتان فرۆشرا 🤍

🧾 *کرێی خزمەتگوزاری بۆ فرۆشتنەکانت*
{items}
💰 کۆی گشتی: *{total} دینار*

> 💳 دەتوانیت لە ڕێگەی *Super Qi* یان *FIB* یان *FastPay* پارەکە بنێریت بۆ ئەم ژمارەیە:
{number}

📎 *پاش پارەدان:* بچۆ ناو هەژمارەکەت، لە داشبۆرد دوگمەی «ناردنی وەسڵی پارەدان» دابگرە و وێنەی وەسڵەکە بنێرە:
{link}

لەگەڵ ڕێزماندا،
تیمی ماڵپەڕی منداڵان 🧸`,
    ar: `*مرحباً عزيزي* 👋
مبروك، تم بيع منتجك 🤍

🧾 *رسوم الخدمة لمبيعاتك*
{items}
💰 المجموع: *{total} دينار*

> 💳 يمكنك الدفع عبر *Super Qi* أو *FIB* أو *FastPay* على هذا الرقم:
{number}

📎 *بعد الدفع:* ادخل إلى حسابك، واضغط زر «إرسال إيصال الدفع» في لوحة التحكم وأرسل صورة الإيصال:
{link}

مع خالص التحيات،
فريق موقع Mndallan 🧸`,
  },
  {
    key: "buyerIntro", group: "buyers", title: "To the buyer",
    when: "Connect buyer: gives the buyer the seller's number", vars: [V.title, V.code, V.price, V.sellerPhone], required: ["sellerPhone"],
    ckb: `*سڵاو گیان* 👋
سوپاس بۆ پەیوەندیکردن بە *«منداڵان»*ەوە 🤍

🏷️ کاڵا: *{title}* · {code}
💰 نرخ: *{price} دینار*
📞 ژمارەی فرۆشیار:
{sellerPhone}

> 📌 ئەگەر کڕیت، تکایە ئاگادارمان بکەنەوە.

تیمی ماڵپەڕی منداڵان 🧸`,
    ar: `*مرحباً عزيزي* 👋
شكراً لتواصلك مع *Mndallan* 🤍

🏷️ المنتج: *{title}* · {code}
💰 السعر: *{price} دينار*
📞 رقم البائع:
{sellerPhone}

> 📌 إذا اشتريته، يُرجى إبلاغنا.

فريق موقع Mndallan 🧸`,
  },
  {
    key: "sellerHeadsUp", group: "buyers", title: "To the seller",
    when: "Connect buyer: tells the seller a buyer is coming", vars: [V.title, V.code, V.buyer], required: ["title"],
    ckb: `*سڵاو گیان* 👋
کڕیارێک داوای کاڵاکەتانی کرد 🤍

🏷️ *{title}* · {code}
{buyer}
📲 بەم زووانە پەیوەندیتان پێوە دەکات.

> 📌 کاتێک فرۆشرا، تکایە ئاگادارمان بکەنەوە.

تیمی ماڵپەڕی منداڵان 🧸`,
    ar: `*مرحباً عزيزي* 👋
مشترٍ سأل عن منتجك 🤍

🏷️ *{title}* · {code}
{buyer}
📲 سيتواصل معك قريباً.

> 📌 عند بيعه، يُرجى إبلاغنا.

فريق موقع Mndallan 🧸`,
  },
  fixLine("fixPhotos", "Photos aren't clear",
    "وێنەی ڕوون و لە شوێنێکی ڕووناکدا بگرن و لە جێی وێنەکانی ئێستا دایبنێن.",
    "التقطوا صوراً واضحة في مكان جيد الإضاءة وضعوها مكان الصور الحالية."),
  fixLine("fixCategory", "Wrong category",
    "پۆلی دروستی کاڵاکە هەڵبژێرن.",
    "اختاروا الفئة الصحيحة للمنتج."),
  fixLine("fixPrice", "Price looks wrong",
    "نرخەکە بپشکنن و نرخی دروست بنووسن.",
    "راجعوا السعر واكتبوا السعر الصحيح."),
  fixLine("fixDetails", "Needs more details",
    "زانیاری زیاتر لەسەر کاڵاکە بنووسن، وەک براند، قەبارە و باری کاڵاکە.",
    "أضيفوا معلومات أكثر عن المنتج، مثل العلامة التجارية والمقاس والحالة."),
  fixLine("fixOwnPhoto", "Photos from the internet",
    "خۆتان وێنەی کاڵاکە بگرن و لە جێی وێنەکانی ئینتەرنێت دایبنێن.",
    "التقطوا صوراً للمنتج بأنفسكم وضعوها مكان صور الإنترنت."),
  fixLine("fixDuplicate", "Already posted",
    "ئەم کاڵایە پێشتر بڵاوکراوەتەوە، بۆیە پێویست بە پۆستێکی تر ناکات. ئەگەر کاڵایەکی جیاوازە، جیاوازییەکەی لە وەسفەکەدا بنووسن.",
    "هذا المنتج منشور من قبل، فلا حاجة لمنشور آخر. إذا كان منتجاً مختلفاً، اكتبوا الفرق في الوصف."),
  fixLine("fixNotBaby", "Not a baby product",
    "لە ماڵپەڕەکەدا تەنها کاڵای منداڵان بڵاو دەکەینەوە، بۆیە ئەم کاڵایە ناتوانرێت بڵاوبکرێتەوە. ئەگەر پێتان وایە هەڵەیەک هەیە، وەڵامی ئەم نامەیە بدەنەوە.",
    "ننشر منتجات الأطفال فقط على الموقع، لذا لا يمكن نشر هذا المنتج. إذا كنتم تعتقدون أن هناك خطأ، ردوا على هذه الرسالة."),
  fixLine("fixOther", "A reason you typed",
    "ئەو خاڵەی سەرەوە لە پۆستەکەدا چاک بکەن.",
    "صححوا النقطة المذكورة أعلاه في المنشور."),
  fixLine("fixOtherToo", "A reason you typed, next to a ready one",
    "خاڵەکەی تری سەرەوەش چاک بکەن.",
    "صححوا النقطة الأخرى المذكورة أعلاه أيضاً."),
];

const BY_KEY = Object.fromEntries(TEMPLATES.map((t) => [t.key, t]));

let saved = new Map();
const savedId = (key, locale) => `${key}:${locale}`;

// What the admin has reworded, from Convex (see AdminShell).
export function setMessageTemplates(rows) {
  saved = new Map((rows ?? []).map((r) => [savedId(r.key, r.locale), r.body]));
}

export const messageLocale = () => (getLocale() === "ar" ? "ar" : "ckb");
export const originalText = (key, locale) => BY_KEY[key][locale];
export const isEdited = (key, locale) => saved.has(savedId(key, locale));
export const templateText = (key, locale = messageLocale()) => saved.get(savedId(key, locale)) ?? originalText(key, locale);

const PLACEHOLDER = /\{(\w+)\}/g;

export function fillTemplate(text, values) {
  const lines = text.split("\n").filter((line) =>
    ![...line.matchAll(PLACEHOLDER)].some(([, name]) => values[name] === null));
  return lines.join("\n")
    .replace(PLACEHOLDER, (all, name) => (name in values ? values[name] : all))
    // an empty value leaves nothing to separate, or a space at the line's end
    .replace(/ · (?=[ \n.؟]|$)/gm, "")
    .replace(/ +\n/g, "\n");
}

export const renderTemplate = (key, values) => fillTemplate(templateText(key), values);

export const sampleMessage = (template, text) => fillTemplate(text, { ...SAMPLE, ...template.sample });

// What's wrong with a reworded message: a {name} we can't fill, or one that has
// to stay. The message can't be saved until these are fixed.
export function templateProblems(template, text) {
  const used = [...text.matchAll(PLACEHOLDER)].map(([, name]) => name);
  const known = template.vars.map((x) => x.name);
  return {
    unknown: [...new Set(used.filter((name) => !known.includes(name)))],
    missing: template.required.filter((name) => !used.includes(name)),
  };
}
