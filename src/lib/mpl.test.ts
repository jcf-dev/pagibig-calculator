import { describe, expect, it } from "vitest";
import { availableMplAmount, calculateMplEstimate } from "./mpl";

describe("Multi-Purpose Loan estimates", () => {
  const inputs = {
    regularSavings: 100_000,
    existingShortTermBalance: 10_000,
    requestedAmount: 50_000,
    termMonths: 24 as const,
  };

  it("uses 90% of savings less existing short-term balances", () => {
    expect(availableMplAmount(100_000, 10_000)).toBe(80_000);
    expect(availableMplAmount(10_000, 20_000)).toBe(0);
  });

  it("includes two months of grace interest and reconciles payment totals", () => {
    const result = calculateMplEstimate(inputs);
    expect(result.availableAmount).toBe(80_000);
    expect(result.graceInterest).toBe(1458.33);
    expect(result.monthlyPayment).toBeGreaterThan(2_000);
    expect(result.totalRepayment).toBeCloseTo(result.monthlyPayment * 24, 2);
    expect(result.totalInterest).toBeCloseTo(result.totalRepayment - 50_000, 2);
    expect(calculateMplEstimate({ ...inputs, termMonths: 12 }).monthlyPayment)
      .toBeGreaterThan(result.monthlyPayment);
    expect(calculateMplEstimate({ ...inputs, termMonths: 36 }).totalInterest)
      .toBeGreaterThan(result.totalInterest);
  });

  it("rejects amounts above the estimate and invalid inputs", () => {
    expect(() => calculateMplEstimate({ ...inputs, requestedAmount: 80_001 }))
      .toThrow("exceeds");
    expect(() => calculateMplEstimate({ ...inputs, requestedAmount: 0 }))
      .toThrow("Enter an amount");
    expect(() => availableMplAmount(-1, 0)).toThrow("valid");
  });
});
