import { renderTemplate } from "@/components/admin/messageTemplates";

// WhatsApp message to a seller once their post is approved, sent by the admin
// from their own WhatsApp (prefilled with the item code). The wording is in
// messageTemplates.js. Later this can be sent automatically through Pixelence.

// Invisible left-to-right marks keep the code reading "#26-0096" inside a
// right-to-left line (otherwise the # jumps to the other end).
const LRM = "‎";
export const codeOf = (product) => (product.seq ? `*${LRM}#${product.seq}${LRM}*` : "");

export function approvalMessage(product) {
  return renderTemplate("approval", { code: codeOf(product) || null });
}

// One post gets the usual message; more than one get the list.
export function combinedApprovalMessage(products) {
  if (products.length === 1) return approvalMessage(products[0]);
  const items = products.map((p) => `• ${[codeOf(p), p.title].filter(Boolean).join(" · ")}`).join("\n");
  return renderTemplate("approvalMany", { items });
}
