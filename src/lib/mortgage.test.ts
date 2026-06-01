import { describe, expect, it } from "vitest";
import {
  calculateAnnualSummary,
  calculateAmortization,
  calculateMonthlyPayment,
  compareRefinance,
  extraPaymentForMonth,
  solveAnnualRate,
  solvePrincipal,
  solveTerm,
} from "./mortgage";

describe("mortgage calculations", () => {
  it("calculates a standard monthly payment", () => {
    const payment = calculateMonthlyPayment(1_000_000, 6, 360);
    expect(payment).toBeCloseTo(5995.51, 2);
  });

  it("supports zero-interest loans", () => {
    const payment = calculateMonthlyPayment(120_000, 0, 12);
    expect(payment).toBe(10_000);
  });

  it("adjusts the final payment to close the balance", () => {
    const result = calculateAmortization({
      principal: 100_000,
      annualRate: 5,
      termMonths: 12,
      startDate: "2026-06-01",
      extraPayments: [],
      extraPaymentMode: "reduce-term",
    });

    expect(result.rows.at(-1)?.endingBalance).toBe(0);
    expect(result.rows).toHaveLength(12);
  });

  it("shortens the term when extra principal is applied", () => {
    const baseline = calculateAmortization({
      principal: 500_000,
      annualRate: 7,
      termMonths: 120,
      startDate: "2026-06-01",
      extraPayments: [],
      extraPaymentMode: "reduce-term",
    });
    const accelerated = calculateAmortization({
      principal: 500_000,
      annualRate: 7,
      termMonths: 120,
      startDate: "2026-06-01",
      extraPayments: [{ type: "monthly", amount: 5_000, startMonth: 1 }],
      extraPaymentMode: "reduce-term",
    });

    expect(accelerated.payoffMonth).toBeLessThan(baseline.payoffMonth);
    expect(accelerated.totalInterest).toBeLessThan(baseline.totalInterest);
  });

  it("combines recurring and one-time extra payment rules", () => {
    const extra = extraPaymentForMonth(
      [
        { type: "monthly", amount: 1_000, startMonth: 1 },
        { type: "annual", amount: 5_000, startMonth: 12 },
        { type: "oneTime", amount: 10_000, month: 12 },
      ],
      12,
    );

    expect(extra).toBe(16_000);
  });

  it("rejects current payments that cannot amortize the loan", () => {
    expect(() =>
      calculateAmortization({
        principal: 1_000_000,
        annualRate: 12,
        termMonths: 120,
        startDate: "2026-06-01",
        extraPayments: [],
        extraPaymentMode: "reduce-term",
        fixedMonthlyPayment: 1_000,
      }),
    ).toThrow("too low");
  });

  it("recommends refinance when full cost savings and break-even are favorable", () => {
    const comparison = compareRefinance({
      currentBalance: 2_000_000,
      currentMonthlyDue: 22_000,
      currentAnnualRate: 9,
      remainingMonths: 180,
      newAnnualRate: 6,
      newTermMonths: 180,
      refinanceCosts: 20_000,
      startDate: "2026-06-01",
      extraPayments: [],
      extraPaymentMode: "reduce-term",
    });

    expect(comparison.recommendation).toBe("refinance");
    expect(comparison.totalSavings).toBeGreaterThan(1_000);
    expect(comparison.breakEvenMonth).not.toBeNull();
  });

  it("applies future interest rate periods and recalculates payment", () => {
    const result = calculateAmortization({
      principal: 1_000_000,
      annualRate: 5,
      termMonths: 120,
      startDate: "2026-06-01",
      extraPayments: [],
      extraPaymentMode: "reduce-term",
      ratePeriods: [{ id: "repricing", startMonth: 13, annualRate: 8 }],
    });

    expect(result.rows[0].annualRate).toBe(5);
    expect(result.rows[12].annualRate).toBe(8);
    expect(result.rows[12].scheduledPayment).toBeGreaterThan(result.rows[0].scheduledPayment);
  });

  it("supports interest-only periods", () => {
    const result = calculateAmortization({
      principal: 1_000_000,
      annualRate: 6,
      termMonths: 120,
      startDate: "2026-06-01",
      extraPayments: [],
      extraPaymentMode: "reduce-term",
      interestOnlyPeriods: [{ id: "io", startMonth: 1, endMonth: 3 }],
    });

    expect(result.rows[0].principal).toBe(0);
    expect(result.rows[1].principal).toBe(0);
    expect(result.rows[2].principal).toBe(0);
    expect(result.rows[3].principal).toBeGreaterThan(0);
  });

  it("adds monthly, annual, and one-time costs to total outflow", () => {
    const result = calculateAmortization({
      principal: 100_000,
      annualRate: 0,
      termMonths: 12,
      startDate: "2026-06-01",
      extraPayments: [],
      extraPaymentMode: "reduce-term",
      costs: [
        { id: "monthly", label: "MRI", type: "monthly", amount: 100, startMonth: 1 },
        { id: "annual", label: "Insurance", type: "annual", amount: 1_200, startMonth: 12 },
        { id: "one", label: "Fee", type: "oneTime", amount: 500, month: 1 },
      ],
    });

    expect(result.totalCosts).toBe(2_900);
    expect(result.totalOutflow).toBeCloseTo(result.totalPaid + 2_900, 2);
  });

  it("creates annual summaries that match monthly totals", () => {
    const result = calculateAmortization({
      principal: 240_000,
      annualRate: 0,
      termMonths: 24,
      startDate: "2026-01-01",
      extraPayments: [],
      extraPaymentMode: "reduce-term",
      costs: [{ id: "monthly", label: "Cost", type: "monthly", amount: 100, startMonth: 1 }],
    });
    const summary = calculateAnnualSummary(result.rows);

    expect(summary).toHaveLength(2);
    expect(summary.reduce((total, row) => total + row.totalOutflow, 0)).toBeCloseTo(result.totalOutflow, 2);
  });

  it("solves principal, term, and annual rate from a target payment", () => {
    const payment = calculateMonthlyPayment(1_000_000, 6, 360);

    expect(solvePrincipal(payment, 6, 360)).toBeCloseTo(1_000_000, 0);
    expect(solveTerm(1_000_000, 6, payment)).toBe(360);
    expect(solveAnnualRate(1_000_000, 360, payment)).toBeCloseTo(6, 3);
  });
});
