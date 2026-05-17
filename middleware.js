import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const ADMIN_EMAILS = ["karokh.saman.aziz@gmail.com", "soma.karam.a@gmail.com"];

const isPublicRoute = createRouteMatcher([
  "/",
  "/products(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
]);

const isSellerRoute = createRouteMatcher(["/seller(.*)"]);
const isAdminRoute = createRouteMatcher(["/admin(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return NextResponse.next();

  if (isAdminRoute(req)) {
    const { userId, sessionClaims } = await auth();
    if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url));

    const email = sessionClaims?.email ?? sessionClaims?.["https://clerk.dev/email"];
    if (!ADMIN_EMAILS.includes(email)) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (isSellerRoute(req)) {
    const { userId } = await auth();
    if (!userId) return NextResponse.redirect(new URL("/sign-in", req.url));
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
