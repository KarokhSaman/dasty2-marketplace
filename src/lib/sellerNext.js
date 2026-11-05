// Where a seller goes after logging in, from the `next` in the address: "add"
// (Sell now) or a seller page they were sent to login from, such as a link in a
// WhatsApp message. Only seller pages on this site, so a crafted link can't send
// someone elsewhere after login.
export function sellerNextPath(next) {
  if (next === "add") return "/seller/add";
  if (typeof next === "string" && next.startsWith("/seller/") && !/\.\.|\\|\/\//.test(next)) return next;
  return "/seller";
}
