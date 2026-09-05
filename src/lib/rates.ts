import type { RateOption } from "./mortgage";

export const DEFAULT_LOAN_CEILING = 10_000_000;
export const RATE_ASSUMPTIONS_EFFECTIVE_DATE = "July 1, 2023";
export const RATE_ASSUMPTIONS_REVIEWED_DATE = "September 5, 2026";

export const DEFAULT_RATE_OPTIONS: RateOption[] = [
  { id: "fixing-1", label: "1 year fixing", fixingYears: 1, annualRate: 5.75 },
  { id: "fixing-3", label: "3 years fixing", fixingYears: 3, annualRate: 6.25 },
  { id: "fixing-5", label: "5 years fixing", fixingYears: 5, annualRate: 6.5 },
  { id: "fixing-10", label: "10 years fixing", fixingYears: 10, annualRate: 7.125 },
  { id: "fixing-15", label: "15 years fixing", fixingYears: 15, annualRate: 7.75 },
  { id: "fixing-20", label: "20 years fixing", fixingYears: 20, annualRate: 8.5 },
  { id: "fixing-25", label: "25 years fixing", fixingYears: 25, annualRate: 9.125 },
  { id: "fixing-30", label: "30 years fixing", fixingYears: 30, annualRate: 9.75 },
  { id: "4ph", label: "Expanded 4PH / eligible socialized housing", fixingYears: 30, annualRate: 3 },
];

export const RATE_SOURCES = [
  {
    label: "Pag-IBIG Fund presentation: rates effective July 1, 2023",
    href: "https://www.pagba.com/wp-content/uploads/2024/04/5-PAG-IBIG-FUND.pdf",
  },
  {
    label: "Pag-IBIG Fund release: Expanded 4PH rates and P10M ceiling",
    href: "https://pia.gov.ph/press-release/pag-ibig-housing-loans-post-double-digit-growth-in-h1-socialized-housing-financing-more-than-doubles-under-marcos-expanded-4ph/",
  },
  {
    label: "Philippine government release: 2026 promotional rates",
    href: "https://pia.gov.ph/news/marcos-administration-pushes-more-affordable-homeownership-through-pag-ibig/",
  },
];
