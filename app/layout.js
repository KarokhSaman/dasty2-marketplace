import localFont from "next/font/local";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexClientProvider } from "@/lib/convexClient";
import { SellerSessionProvider } from "@/lib/SellerSessionContext";
import { headers } from "next/headers";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

export const metadata = {
  title: "Dasty2 Mndalan — Baby Products Erbil",
  description: "Buy and sell baby products in Erbil, Iraq",
};

export default function RootLayout({ children }) {
  const headersList = headers();
  const locale = headersList.get("x-locale") || "ckb";
  const dir = locale === "en" ? "ltr" : "rtl";

  return (
    <html lang={locale} dir={dir} data-locale={locale}>
      <body className={`${geistSans.variable} antialiased bg-gray-50 min-h-screen`}>
        <ClerkProvider>
          <ConvexClientProvider>
            <SellerSessionProvider>{children}</SellerSessionProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
