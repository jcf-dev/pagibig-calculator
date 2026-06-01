const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://joween.dev";

export function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Pag-IBIG Housing Loan Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description:
      "Estimate Pag-IBIG housing loan payments, refinancing break-even, extra principal savings, future rate changes, interest-only periods, and loan costs.",
    creator: {
      "@type": "Person",
      name: "Joween Flores",
      url: "https://joween.dev",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "PHP",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
