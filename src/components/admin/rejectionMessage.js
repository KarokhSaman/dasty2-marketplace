import * as m from "@/paraglide/messages";
import { codeOf } from "@/components/admin/approvalMessage";
import { messageLocale, renderTemplate, templateText } from "@/components/admin/messageTemplates";

// WhatsApp message to a seller once their post is rejected, sent by the admin
// from their own WhatsApp: which post, why, and how to fix it. The wording is
// in messageTemplates.js.

// For each ready reason: the same reason in Arabic (it is saved in Kurdish) and
// the message line saying what the seller should do. `link: false` when editing
// the post can't help.
const REASONS = [
  { reason: m.rejectReasonPhotos, fix: "fixPhotos" },
  { reason: m.rejectReasonCategory, fix: "fixCategory" },
  { reason: m.rejectReasonPrice, fix: "fixPrice" },
  { reason: m.rejectReasonDetails, fix: "fixDetails" },
  { reason: m.rejectReasonOwnPhoto, fix: "fixOwnPhoto" },
  { reason: m.rejectReasonDuplicate, fix: "fixDuplicate" },
  { reason: m.rejectReasonNotBaby, fix: "fixNotBaby", link: false },
];

// Several reasons are saved together in the post's notes with this between them.
export const REASON_SEPARATOR = " · ";

const list = (lines) => (lines.length === 1 ? lines[0] : lines.map((l) => `• ${l}`).join("\n"));

export function rejectionMessage(product, reason) {
  const locale = messageLocale();
  const parts = reason.split(REASON_SEPARATOR).map((text) => ({
    text: text.trim(),
    known: REASONS.find((r) => r.reason({}, { locale: "ckb" }) === text.trim()),
  }));
  // Fixing anything else can't help a post that can't be published at all.
  const noFix = parts.find((x) => x.known?.link === false);
  const shown = noFix ? [noFix] : parts;
  const reasons = shown.map((x) => (x.known ? x.known.reason({}, { locale }) : x.text));
  return renderTemplate(noFix ? "rejectionNoFix" : "rejection", {
    title: product.title,
    code: codeOf(product),
    // several reasons start on their own line, under the heading
    reason: reasons.length > 1 ? `\n${list(reasons)}` : reasons[0],
    fix: list(shown.map((x) => templateText(x.known?.fix ?? (shown.length > 1 ? "fixOtherToo" : "fixOther"), locale))),
    // No links in messages: the template says where to tap instead. A saved
    // wording that still has {link} drops that line.
    link: null,
    button: m.editProductBtn({}, { locale }),
  });
}
