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
  const scenario = {
    principal: 3500000, annualRate: 6.5, termMonths: 360, startDate: "2026-06-01",
    extraPayments: [], extraPaymentMode: "reduce-term" as const,
  };
  const refinanceInput = {
    currentBalance: 1000000, currentMonthlyDue: 12000, currentAnnualRate: 8,
    remainingMonths: 120, newAnnualRate: 6, newTermMonths: 120,
    refinanceCosts: 50000, startDate: "2026-06-01", extraPayments: [],
    extraPaymentMode: "reduce-term" as const,
  };

  it("ignores a hidden target payment when solving the monthly payment", () => {
    const result = calculateAmortization({ ...scenario, solveTarget: "payment", targetPayment: 25000 });
    expect(result.monthlyPayment).toBeCloseTo(22122.38, 2);
    expect(result.payoffMonth).toBe(360);
  });

  it("still solves a loan amount from the monthly budget", () => {
    const result = calculateAmortization({ ...scenario, solveTarget: "principal", targetPayment: 25000 });
    expect(result.monthlyPayment).toBe(25000);
    const first = result.rows[0];
    expect(first.endingBalance + first.principal).toBeCloseTo(solvePrincipal(25000, 6.5, 360), 2);
  });

  it("rejects a missing number instead of returning an empty or infinite result", () => {
    expect(() => calculateAmortization({ ...scenario, principal: NaN })).toThrow("valid loan");
  });

  it("keeps month-end payments in their correct calendar months", () => {
    const result = calculateAmortization({ ...scenario, startDate: "2028-01-31" });
    expect(result.rows[1].date).toBe("2028-02-29");
    expect(result.rows[2].date).toBe("2028-03-31");
  });

  it("counts upfront fees once without adding them to the loan balance", () => {
    const result = compareRefinance({ ...refinanceInput, feeTreatment: "upfront" });
    expect(result.refinance.monthlyPayment).toBeCloseTo(calculateMonthlyPayment(1000000, 6, 120), 2);
    expect(result.upfrontCosts).toBe(50000);
    expect(result.refinanceTotalOutflow).toBe(result.refinance.totalOutflow + 50000);
    expect(result.totalSavings).toBe(result.current.totalOutflow - result.refinanceTotalOutflow);
    expect(result.breakEvenMonth).toBeGreaterThan(1);
  });

  it("keeps legacy fees financed and includes their interest", () => {
    const result = compareRefinance(refinanceInput);
    expect(result.upfrontCosts).toBe(0);
    expect(result.refinance.monthlyPayment).toBeCloseTo(calculateMonthlyPayment(1050000, 6, 120), 2);
    expect(result.refinanceTotalOutflow).toBe(result.refinance.totalOutflow);
  });

  it("can lower the monthly payment while increasing the full cost", () => {
    const result = compareRefinance({ ...refinanceInput, newTermMonths: 360, newAnnualRate: 8 });
    expect(result.monthlySavings).toBeGreaterThan(0);
    expect(result.totalSavings).toBeLessThan(0);
  });

  it("returns no cash-flow crossing when refinancing always costs more", () => {
    const result = compareRefinance({ ...refinanceInput, newAnnualRate: 12, refinanceCosts: 500000, feeTreatment: "upfront" });
    expect(result.breakEvenMonth).toBeNull();
  });

  it("applies yearly and one-time extras to the refinance loan", () => {
    const baseline = compareRefinance(refinanceInput);
    const result = compareRefinance({ ...refinanceInput, extraPayments: [
      { type: "annual", amount: 30000, startMonth: 12 },
      { type: "oneTime", amount: 20000, month: 12 },
    ] });
    expect(result.refinance.rows[11].extraPrincipal).toBe(50000);
    expect(result.refinance.payoffMonth).toBeLessThan(baseline.refinance.payoffMonth);
  });

  it("reduces later payments when that extra-payment effect is selected", () => {
    const result = calculateAmortization({ ...scenario, extraPaymentMode: "reduce-payment", extraPayments: [{ type: "oneTime", amount: 500000, month: 1 }] });
    expect(result.rows[1].scheduledPayment).toBeLessThan(result.rows[0].scheduledPayment);
    expect(result.payoffMonth).toBe(360);
  });
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
