import type { RateOption } from "./mortgage";

export const DEFAULT_LOAN_CEILING = 10_000_000;

export const DEFAULT_RATE_OPTIONS: RateOption[] = [
  { id: "fixing-1", label: "1 year fixing", fixingYears: 1, annualRate: 5.75 },
  { id: "fixing-3", label: "3 years fixing", fixingYears: 3, annualRate: 6.25 },
  { id: "fixing-5", label: "5 years fixing", fixingYears: 5, annualRate: 6.5 },
  { id: "fixing-10", label: "10 years fixing", fixingYears: 10, annualRate: 7.125 },
  { id: "fixing-15", label: "15 years fixing", fixingYears: 15, annualRate: 7.75 },
  { id: "fixing-20", label: "20 years fixing", fixingYears: 20, annualRate: 8.5 },
  { id: "fixing-25", label: "25 years fixing", fixingYears: 25, annualRate: 9.125 },
  { id: "fixing-30", label: "30 years fixing", fixingYears: 30, annualRate: 9.75 },
  { id: "4ph", label: "4PH / socialized default", fixingYears: 30, annualRate: 3 },
];

export const RATE_SOURCES = [
  {
    label: "PIA: Pag-IBIG now offers P10M housing loan cap",
    href: "https://pia.gov.ph/news/pag-ibig-now-offers-p10m-housing-loan-cap/",
  },
  {
    label: "GMA: Pag-IBIG hikes max housing loan amount to P10M",
    href: "https://www.gmanetwork.com/news/money/personalfinance/989313/pag-ibig-hikes-maximum-housing-loan-amount-to-p10m-per-borrower/story/",
  },
  {
    label: "Inquirer: Pag-IBIG lowers home loan rates",
    href: "https://business.inquirer.net/411246/pag-ibig-fund-lowers-home-loan-rates",
  },
  {
    label: "Karl's Mortgage Calculator reference",
    href: "https://www.drcalculator.com/mortgage/old/instructions.html",
  },
];
