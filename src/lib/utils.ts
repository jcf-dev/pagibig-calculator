import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const percentFormatter = new Intl.NumberFormat("en-PH", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 3,
});

export function formatPeso(value: number) {
  return pesoFormatter.format(Number.isFinite(value) ? value : 0);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatMoneyInput(value: number) {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseMoneyInput(value: string) {
  const normalizedValue = value.replace(/[₱,\s]/g, "");
  if (normalizedValue === "") return NaN;
  const parsedValue = Number(normalizedValue);
  return Number.isFinite(parsedValue) ? parsedValue : NaN;
}
