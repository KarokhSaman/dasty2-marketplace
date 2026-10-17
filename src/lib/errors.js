// Text to show for a failed Convex call. Errors the server throws on purpose
// (ConvexError) carry their message in `data` and reach the browser in
// production; anything else is redacted there, so fall back to a generic line.
export function errorMessage(err, fallback = "Something went wrong") {
  if (typeof err?.data === "string" && err.data) return err.data;
  const fromServer = err?.message?.split("\n")[0].replace(/^.*Uncaught (?:Convex)?Error:\s*/, "");
  return fromServer && !/Server Error/.test(fromServer) ? fromServer : fallback;
}
