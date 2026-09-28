import { LAB_URL } from "@/config/site";

export function StructuredData() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Pag-IBIG Loan Calculator",
    applicationCategory: "FinanceApplication",
    operatingSystem: "Web",
    url: LAB_URL,
    description:
      "Estimate Pag-IBIG housing loan payments, refinancing, and Multi-Purpose Loan amounts and monthly payments.",
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
