import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
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
