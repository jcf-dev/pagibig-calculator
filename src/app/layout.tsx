import type { Metadata } from "next";
import { Doto, Lexend, Lexend_Deca } from "next/font/google";
import { ThemeProvider } from "@/components/common/theme-provider";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { StructuredData } from "@/components/seo/structured-data";
import { LAB_BASE_PATH, SITE_ORIGIN } from "@/config/site";
import "./globals.css";

const lexend = Lexend({
  variable: "--font-lexend",
  subsets: ["latin"],
});

const lexendDeca = Lexend_Deca({
  variable: "--font-lexend-deca",
  subsets: ["latin"],
  weight: "500",
});

const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
  weight: "600",
});

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
        className={`${lexend.variable} ${lexendDeca.variable} ${doto.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="relative flex min-h-screen flex-col">
            <StructuredData />
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
