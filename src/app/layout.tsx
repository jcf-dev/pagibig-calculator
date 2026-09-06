import type { Metadata } from "next";
import { SiteShell } from "@joween/site-shell";
import { siteFontClassName } from "@joween/site-shell/fonts";
import { ThemeProvider } from "@joween/site-shell/theme-provider";
import { StructuredData } from "@/components/seo/structured-data";
import { LAB_BASE_PATH, SITE_ORIGIN } from "@/config/site";
import "./globals.css";

const siteUrl = new URL(SITE_ORIGIN);
const siteDescription =
  "Estimate Pag-IBIG housing loan payments, refinancing break-even, extra principal savings, future rate changes, interest-only periods, and loan costs.";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "Pag-IBIG Housing Loan Calculator",
  title: {
    default: "Pag-IBIG Housing Loan Calculator",
    template: "%s | Pag-IBIG Housing Loan Calculator",
  },
  description: siteDescription,
  keywords: [
    "Pag-IBIG calculator",
    "Pag-IBIG housing loan",
    "Philippines mortgage calculator",
    "home loan calculator",
    "refinance calculator",
    "amortization calculator",
    "extra principal payment calculator",
  ],
  authors: [{ name: "Joween Flores", url: "https://joween.dev" }],
  creator: "Joween Flores",
  publisher: "Joween Flores",
  category: "finance",
  alternates: {
    canonical: LAB_BASE_PATH,
  },
  openGraph: {
    title: "Pag-IBIG Housing Loan Calculator",
    description: siteDescription,
    url: LAB_BASE_PATH,
    siteName: "Pag-IBIG Housing Loan Calculator",
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Pag-IBIG Housing Loan Calculator",
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${siteFontClassName} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider>
          <StructuredData />
          <SiteShell zoneBasePath={LAB_BASE_PATH}>{children}</SiteShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
