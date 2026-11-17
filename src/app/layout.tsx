import type { Metadata, Viewport } from "next";
import { Mukta, Teko } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { Footer } from "@/ui/shell/Footer";
import { Header } from "@/ui/shell/Header";
import { SkipLink } from "@/ui/shell/SkipLink";
import { SITE_URL } from "@/ui/site";
import "./globals.css";

// Self-hosted at build time, so no request to Google at runtime. Both faces cover Latin and Devanagari.
const body = Mukta({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});
const display = Teko({
  subsets: ["latin", "devanagari"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Saans · Breathe easier through Delhi's winter smog", template: "%s · Saans" },
  description:
    "A GenAI assistant that turns today's Delhi-NCR air into a low-emission daily routine, indoor air hacks and greener travel for your household, and shows the impact of each choice.",
  applicationName: "Saans",
};

export const viewport: Viewport = {
  themeColor: "#b3411a",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  // Reading request headers renders every page per request, so each gets its own CSP nonce.
  await headers();
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body>
        <SkipLink />
        <Header />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
