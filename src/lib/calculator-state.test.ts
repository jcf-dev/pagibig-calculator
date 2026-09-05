import { describe, expect, it } from "vitest";
import {
  buildExtraRules,
  freshState,
  readStoredState,
  stepsFor,
  validateScenario,
  STORAGE_KEY,
} from "./calculator-state";

describe("saved calculator state", () => {
  const storage = (value: unknown) => ({
    getItem: (key: string) =>
      key === STORAGE_KEY ? JSON.stringify(value) : null,
  });

  it("starts in Simple with blank personal amounts and no extra payments", () => {
    const state = readStoredState(storage(null));
    expect(state.guide.mode).toBe("simple");
    expect(state.financing.principal).toBeNaN();
    expect(state.financing.customRate).toBeNaN();
    expect(state.financing.monthlyExtra).toBe(0);
    expect(state.refinance.refinanceCosts).toBe(0);
  });

  it("keeps old inputs and advanced settings while adding financed fee treatment", () => {
    const state = readStoredState(
      storage({
        financing: {
          principal: 1234567,
          ratePeriods: [{ id: "rate-1", startMonth: 61, annualRate: 8 }],
        },
        refinance: { currentBalance: 2345678, refinanceCosts: 60000 },
      }),
    );
    expect(state.financing.principal).toBe(1234567);
    expect(state.financing.ratePeriods[0].annualRate).toBe(8);
    expect(state.refinance.currentBalance).toBe(2345678);
    expect(state.refinance.refinanceCosts).toBe(60000);
    expect(state.refinance.feeTreatment).toBe("financed");
  });

  it("keeps mode, task, sample labels, and progress but requires review after reload", () => {
    const draft = freshState();
    draft.guide = {
      mode: "advanced",
      task: "refinance",
      step: 7,
      samples: ["refinance.customRate"],
    };
    const state = readStoredState(storage(draft));
    expect(state.guide).toEqual({
      ...draft.guide,
      step: stepsFor("refinance").length - 2,
    });
    expect(state.financing.principal).toBeNaN();
  });

  it("recovers from broken JSON, blocked storage, and invalid saved shapes", () => {
    for (const source of [
      { getItem: () => "{" },
      {
        getItem: () => {
          throw new Error("blocked");
        },
      },
      storage({
        rates: [null],
        financing: {
          costs: [null],
          ratePeriods: "bad",
          solveTarget: "unknown",
        },
        guide: { step: -5, samples: [null, 42] },
      }),
    ]) {
      const state = readStoredState(source);
      expect(state.rates.length).toBeGreaterThan(0);
      expect(state.financing.costs).toEqual([]);
      expect(state.guide.step).toBe(0);
    }
  });

  it("marks legacy default amounts as possible examples instead of treating them as confirmed data", () => {
    const state = readStoredState(
      storage({ financing: { principal: 3500000, monthlyExtra: 5000 } }),
    );
    expect(state.guide.samples).toContain("financing.principal");
    expect(state.guide.samples).toContain("financing.monthlyExtra");
  });
});

describe("input checks", () => {
  it("accepts zero interest and zero extras but rejects missing amounts", () => {
    const state = freshState();
    state.financing.principal = 100000;
    state.financing.customRate = 0;
    expect(
      validateScenario(
        "financing",
        state.financing,
        state.refinance,
        state.rates,
        state.loanCeiling,
      ),
    ).toEqual({});
    state.financing.principal = NaN;
    expect(
      validateScenario(
        "financing",
        state.financing,
        state.refinance,
        state.rates,
        state.loanCeiling,
      ),
    ).toHaveProperty("principal");
  });

  it("flags a loan above the configured ceiling without changing it", () => {
    const state = freshState();
    state.financing.principal = 12000000;
    const errors = validateScenario(
      "financing",
      state.financing,
      state.refinance,
      state.rates,
      state.loanCeiling,
    );
    expect(errors.principal).toBeTruthy();
    expect(state.financing.principal).toBe(12000000);
  });

  it("requires the budget, not a loan amount, when solving principal", () => {
    const state = freshState();
    state.financing.solveTarget = "principal";
    state.financing.targetPayment = 10000;
    state.financing.customRate = 6;
    expect(
      validateScenario(
        "financing",
        state.financing,
        state.refinance,
        state.rates,
        state.loanCeiling,
      ),
    ).toEqual({});
  });

  it("validates dates and active advanced rules", () => {
    const state = freshState();
    state.financing.startDate = "";
    state.financing.ratePeriods = [
      { id: "bad", startMonth: 24, endMonth: 12, annualRate: 7 },
    ];
    const errors = validateScenario(
      "financing",
      state.financing,
      state.refinance,
      state.rates,
      state.loanCeiling,
    );
    expect(errors.startDate).toBeTruthy();
    expect(errors.advanced).toBeTruthy();
  });

  it("keeps all three extra-payment rules for either loan path", () => {
    const rules = buildExtraRules({
      monthlyExtra: 1000,
      annualExtra: 10000,
      oneTimeExtra: 20000,
      oneTimeMonth: 8,
    });
    expect(rules).toEqual([
      { type: "monthly", amount: 1000, startMonth: 1 },
      { type: "annual", amount: 10000, startMonth: 12 },
      { type: "oneTime", amount: 20000, month: 8 },
    ]);
  });
});
