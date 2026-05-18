import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { VALID_LOCALES, DEFAULT_LOCALE } from "./lib/i18n/translations";

const isPublicPath = (pathname) =>
  pathname === "/" ||
  pathname.startsWith("/products") ||
  pathname.startsWith("/sign-in") ||
  pathname.startsWith("/sign-up") ||
  pathname === "/seller/login" ||
  pathname === "/admin/login" ||
  pathname.startsWith("/api/seller/") ||
  pathname.startsWith("/api/admin/");

const isSellerPath = (pathname) =>
  pathname.startsWith("/seller") && pathname !== "/seller/login";

const isAdminPath = (pathname) =>
  pathname.startsWith("/admin") && pathname !== "/admin/login";

function localeHeaders(req) {
  const cookie = req.cookies.get("dasty2-lang")?.value;
  const locale  = VALID_LOCALES.includes(cookie) ? cookie : DEFAULT_LOCALE;
  const h = new Headers(req.headers);
  h.set("x-locale", locale);
  return h;
}

export default clerkMiddleware(async (_auth, req) => {
  const headers  = localeHeaders(req);
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next({ request: { headers } });
  }

  if (isAdminPath(pathname)) {
    const adminCookie = req.cookies.get("dasty2-admin")?.value;
    if (!adminCookie) {
      return NextResponse.redirect(new URL("/admin/login", req.url));
    }
    return NextResponse.next({ request: { headers } });
  }

  if (isSellerPath(pathname)) {
    const sellerCookie = req.cookies.get("dasty2-seller")?.value;
    if (!sellerCookie) {
      return NextResponse.redirect(new URL("/seller/login", req.url));
    }
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next({ request: { headers } });
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
