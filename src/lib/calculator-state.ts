import type {
  CostRule,
  ExtraPaymentMode,
  InterestOnlyPeriod,
  InterestRatePeriod,
  RateOption,
  SolveTarget,
  ExtraPaymentRule,
} from "./mortgage";
import { DEFAULT_LOAN_CEILING, DEFAULT_RATE_OPTIONS } from "./rates";
import { solvePrincipal } from "./mortgage";

export type FinancingState = {
  principal: number;
  termYears: number;
  solveTarget: SolveTarget;
  targetPayment: number;
  selectedRateId: string;
  customRate: number;
  useCustomRate: boolean;
  startDate: string;
  monthlyExtra: number;
  annualExtra: number;
  oneTimeMonth: number;
  oneTimeExtra: number;
  rangeStartMonth: number;
  rangeEndMonth: number;
  rangeExtra: number;
  extraPaymentMode: ExtraPaymentMode;
  ratePeriods: InterestRatePeriod[];
  interestOnlyPeriods: InterestOnlyPeriod[];
  costs: CostRule[];
  scheduleView: "monthly" | "annual" | "payments";
};

export type RefinanceState = {
  currentBalance: number;
  currentMonthlyDue: number;
  currentAnnualRate: number;
  remainingYears: number;
  newTermYears: number;
  selectedRateId: string;
  customRate: number;
  useCustomRate: boolean;
  refinanceCosts: number;
  feeTreatment: "financed" | "upfront";
  annualExtra: number;
  oneTimeMonth: number;
  oneTimeExtra: number;
  startDate: string;
  monthlyExtra: number;
  extraPaymentMode: ExtraPaymentMode;
  newRatePeriods: InterestRatePeriod[];
  newInterestOnlyPeriods: InterestOnlyPeriod[];
  newCosts: CostRule[];
  scheduleView: "monthly" | "annual" | "payments";
};

export type StoredState = {
  rates: RateOption[];
  loanCeiling: number;
  financing: FinancingState;
  refinance: RefinanceState;
  guide: GuideState;
};

const today = new Date().toISOString().slice(0, 10);
export const STORAGE_KEY = "pagibig-calculator:v1";

export const defaultFinancing: FinancingState = {
  principal: NaN,
  termYears: 30,
  solveTarget: "payment",
  targetPayment: NaN,
  selectedRateId: "fixing-5",
  customRate: NaN,
  useCustomRate: true,
  startDate: today,
  monthlyExtra: 0,
  annualExtra: 0,
  oneTimeMonth: 24,
  oneTimeExtra: 0,
  rangeStartMonth: 13,
  rangeEndMonth: 36,
  rangeExtra: 0,
  extraPaymentMode: "reduce-term",
  ratePeriods: [],
  interestOnlyPeriods: [],
  costs: [],
  scheduleView: "monthly",
};

export const defaultRefinance: RefinanceState = {
  currentBalance: NaN,
  currentMonthlyDue: NaN,
  currentAnnualRate: NaN,
  remainingYears: NaN,
  newTermYears: NaN,
  selectedRateId: "fixing-5",
  customRate: NaN,
  useCustomRate: true,
  refinanceCosts: 0,
  feeTreatment: "financed",
  annualExtra: 0,
  oneTimeMonth: 12,
  oneTimeExtra: 0,
  startDate: today,
  monthlyExtra: 0,
  extraPaymentMode: "reduce-term",
  newRatePeriods: [],
  newInterestOnlyPeriods: [],
  newCosts: [],
  scheduleView: "monthly",
};
export type Task = "financing" | "refinance";
export type GuideState = {
  mode: "simple" | "advanced";
  task: Task;
  step: number;
  samples: string[];
};
export const defaultGuide: GuideState = {
  mode: "simple",
  task: "financing",
  step: 0,
  samples: [],
};
export const stepsFor = (task: Task) =>
  task === "financing"
    ? [
        "Your goal",
        "Loan details",
        "Rate and date",
        "Extra payments",
        "Check your inputs",
        "Your estimate",
      ]
    : [
        "Your goal",
        "Current loan",
        "Current terms",
        "New loan",
        "Fees and date",
        "Extra payments",
        "Check your inputs",
        "Your comparison",
      ];

export function resolveRate(
  rates: RateOption[],
  id: string,
  customRate: number,
  useCustomRate: boolean,
) {
  return useCustomRate
    ? customRate
    : (rates.find((rate) => rate.id === id)?.annualRate ?? customRate);
}

export function activeSamples(
  samples: string[],
  task: Task,
  financing: FinancingState,
  refinance: RefinanceState,
) {
  const state = task === "financing" ? financing : refinance;
  return samples.filter((key) => {
    if (!key.startsWith(task + ".")) return false;
    const field = key.slice(task.length + 1);
    if (field === "customRate" && !state.useCustomRate) return false;
    if (task === "financing") {
      if (field === "principal" && financing.solveTarget === "principal")
        return false;
      if (field === "targetPayment" && financing.solveTarget === "payment")
        return false;
      if (field === "customRate" && financing.solveTarget === "rate")
        return false;
      if (field === "termYears" && financing.solveTarget === "term")
        return false;
    }
    return true;
  });
}

export function buildExtraRules(
  state: Pick<
    FinancingState,
    "monthlyExtra" | "annualExtra" | "oneTimeMonth" | "oneTimeExtra"
  >,
): ExtraPaymentRule[] {
  const rules: ExtraPaymentRule[] = [];
  if (state.monthlyExtra > 0)
    rules.push({ type: "monthly", amount: state.monthlyExtra, startMonth: 1 });
  if (state.annualExtra > 0)
    rules.push({ type: "annual", amount: state.annualExtra, startMonth: 12 });
  if (state.oneTimeExtra > 0)
    rules.push({
      type: "oneTime",
      amount: state.oneTimeExtra,
      month: state.oneTimeMonth,
    });
  return rules;
}

export function freshState(): StoredState {
  const startDate = new Date().toLocaleDateString("en-CA");
  return {
    rates: DEFAULT_RATE_OPTIONS.map((rate) => ({ ...rate })),
    loanCeiling: DEFAULT_LOAN_CEILING,
    financing: { ...defaultFinancing, startDate },
    refinance: { ...defaultRefinance, startDate },
    guide: { ...defaultGuide, samples: [] },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function restoreFields<T extends object>(defaults: T, raw: unknown): T {
  if (!isRecord(raw)) return { ...defaults };
  const entries = Object.entries(defaults).map(([key, fallback]) => {
    const value = raw[key];
    if (typeof fallback === "number") {
      return [
        key,
        value === null
          ? NaN
          : typeof value === "number" && Number.isFinite(value)
            ? value
            : fallback,
      ];
    }
    if (Array.isArray(fallback)) {
      const valid =
        Array.isArray(value) &&
        value.length <= 100 &&
        value.every(
          (rule) =>
            isRecord(rule) &&
            typeof rule.id === "string" &&
            Object.entries(rule).every(([name, entry]) =>
              ["id", "label", "type"].includes(name)
                ? typeof entry === "string"
                : typeof entry === "number" && Number.isFinite(entry),
            ) &&
            (typeof rule.startMonth === "number" ||
              typeof rule.month === "number"),
        );
      return [key, valid ? value : fallback];
    }
    return [key, typeof value === typeof fallback ? value : fallback];
  });
  return Object.fromEntries(entries) as T;
}

export function readStoredState(
  storage: Pick<Storage, "getItem">,
): StoredState {
  const defaults = freshState();
  try {
    const raw: unknown = JSON.parse(storage.getItem(STORAGE_KEY) ?? "null");
    if (!isRecord(raw)) return defaults;
    const financing = restoreFields(defaults.financing, raw.financing);
    const refinance = restoreFields(defaults.refinance, raw.refinance);
    if (
      !["payment", "principal", "term", "rate"].includes(financing.solveTarget)
    )
      financing.solveTarget = "payment";
    for (const state of [financing, refinance]) {
      if (!["reduce-term", "reduce-payment"].includes(state.extraPaymentMode))
        state.extraPaymentMode = "reduce-term";
      if (!["monthly", "annual", "payments"].includes(state.scheduleView))
        state.scheduleView = "monthly";
    }
    if (!["financed", "upfront"].includes(refinance.feeTreatment))
      refinance.feeTreatment = "financed";
    const rates =
      Array.isArray(raw.rates) &&
      raw.rates.length > 0 &&
      raw.rates.length <= 30 &&
      raw.rates.every(
        (rate) =>
          isRecord(rate) &&
          typeof rate.id === "string" &&
          typeof rate.label === "string" &&
          typeof rate.annualRate === "number" &&
          Number.isFinite(rate.annualRate) &&
          rate.annualRate >= 0 &&
          typeof rate.fixingYears === "number" &&
          Number.isFinite(rate.fixingYears) &&
          rate.fixingYears > 0,
      )
        ? (raw.rates as RateOption[])
        : defaults.rates;
    const guideRaw = isRecord(raw.guide) ? raw.guide : {};
    const task = guideRaw.task === "refinance" ? "refinance" : "financing";
    const guide: GuideState = {
      mode: guideRaw.mode === "advanced" ? "advanced" : "simple",
      task,
      // A restored estimate always gets a fresh review before results.
      step:
        typeof guideRaw.step === "number" && Number.isInteger(guideRaw.step)
          ? Math.max(0, Math.min(guideRaw.step, stepsFor(task).length - 2))
          : 0,
      samples: Array.isArray(guideRaw.samples)
        ? guideRaw.samples.filter(
            (key): key is string => typeof key === "string",
          )
        : [],
    };
    // Old versions did not distinguish sample defaults from personal figures.
    if (!raw.guide) {
      const legacy = {
        financing: {
          principal: 3500000,
          targetPayment: 25000,
          customRate: 6.5,
          monthlyExtra: 5000,
        },
        refinance: {
          currentBalance: 3000000,
          currentMonthlyDue: 28000,
          currentAnnualRate: 8.5,
          customRate: 6.5,
          refinanceCosts: 75000,
        },
      };
      for (const task of ["financing", "refinance"] as const) {
        const values = raw[task];
        if (isRecord(values))
          for (const [field, sample] of Object.entries(legacy[task])) {
            if (values[field] === sample)
              guide.samples.push(task + "." + field);
          }
      }
    }
    return {
      rates,
      financing,
      refinance,
      guide,
      loanCeiling:
        typeof raw.loanCeiling === "number" &&
        Number.isFinite(raw.loanCeiling) &&
        raw.loanCeiling > 0
          ? raw.loanCeiling
          : defaults.loanCeiling,
    };
  } catch {
    return defaults;
  }
}

export type FieldErrors = Record<string, string>;

export function validateScenario(
  task: Task,
  financing: FinancingState,
  refinance: RefinanceState,
  rates: RateOption[],
  ceiling: number,
): FieldErrors {
  const errors: FieldErrors = {};
  const state = task === "financing" ? financing : refinance;
  const number = (
    key: string,
    value: number,
    label: string,
    min = 0,
    max = Number.MAX_SAFE_INTEGER,
  ) => {
    if (!Number.isFinite(value) || value < min || value > max)
      errors[key] =
        `Enter ${label} from ${min.toLocaleString("en-PH")} to ${max === Number.MAX_SAFE_INTEGER ? "a valid amount" : max.toLocaleString("en-PH")}.`;
  };
  const years = (key: string, value: number) =>
    number(key, value, "years", 1, 30);
  if (task === "financing") {
    if (financing.solveTarget !== "principal")
      number("principal", financing.principal, "a loan amount", 1, ceiling);
    if (financing.solveTarget !== "payment")
      number("targetPayment", financing.targetPayment, "a monthly budget", 1);
    if (financing.solveTarget !== "term")
      years("termYears", financing.termYears);
    if (
      financing.solveTarget === "principal" &&
      solvePrincipal(
        financing.targetPayment,
        resolveRate(
          rates,
          financing.selectedRateId,
          financing.customRate,
          financing.useCustomRate,
        ),
        financing.termYears * 12,
      ) > ceiling
    ) {
      errors.targetPayment =
        "This budget gives a loan above the configured limit. Lower the budget or edit the limit in Advanced.";
    }
  } else {
    number("currentBalance", refinance.currentBalance, "a balance", 1);
    number(
      "currentMonthlyDue",
      refinance.currentMonthlyDue,
      "a monthly payment",
      1,
    );
    number(
      "currentAnnualRate",
      refinance.currentAnnualRate,
      "an annual rate",
      0,
      100,
    );
    years("remainingYears", refinance.remainingYears);
    years("newTermYears", refinance.newTermYears);
    number("refinanceCosts", refinance.refinanceCosts, "fees", 0);
  }
  if (task === "refinance" || financing.solveTarget !== "rate") {
    number(
      "customRate",
      resolveRate(
        rates,
        state.selectedRateId,
        state.customRate,
        state.useCustomRate,
      ),
      "an annual rate",
      0,
      100,
    );
  }
  const date = new Date(state.startDate + "T00:00:00");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(state.startDate) ||
    Number.isNaN(date.getTime()) ||
    date.getFullYear() < 1900 ||
    date.getFullYear() > 2200
  ) {
    errors.startDate =
      "Enter a valid first payment date between 1900 and 2200.";
  }
  for (const key of ["monthlyExtra", "annualExtra", "oneTimeExtra"] as const)
    number(key, state[key], "an extra payment", 0);
  if (state.oneTimeExtra > 0) {
    number("oneTimeMonth", state.oneTimeMonth, "a payment month", 1, 360);
    if (!Number.isInteger(state.oneTimeMonth))
      errors.oneTimeMonth = "Enter a whole payment month.";
  }
  if (task === "financing") {
    number("rangeExtra", financing.rangeExtra, "an extra payment", 0);
    if (
      financing.rangeExtra > 0 &&
      (!Number.isInteger(financing.rangeStartMonth) ||
        !Number.isInteger(financing.rangeEndMonth) ||
        financing.rangeStartMonth < 1 ||
        financing.rangeEndMonth < financing.rangeStartMonth)
    )
      errors.advanced = "Check the extra-payment month range in Advanced.";
  }
  const periods =
    task === "financing" ? financing.ratePeriods : refinance.newRatePeriods;
  const interestOnly =
    task === "financing"
      ? financing.interestOnlyPeriods
      : refinance.newInterestOnlyPeriods;
  const costs = task === "financing" ? financing.costs : refinance.newCosts;
  const validMonth = (value: number | undefined) =>
    value !== undefined &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 1080;
  if (
    periods.some(
      (p) =>
        !validMonth(p.startMonth) ||
        (p.endMonth !== undefined &&
          (!validMonth(p.endMonth) || p.endMonth < p.startMonth)) ||
        !Number.isFinite(p.annualRate) ||
        p.annualRate < 0 ||
        p.annualRate > 100,
    ) ||
    interestOnly.some(
      (p) =>
        !validMonth(p.startMonth) ||
        !validMonth(p.endMonth) ||
        p.endMonth < p.startMonth,
    ) ||
    costs.some(
      (c) =>
        !Number.isFinite(c.amount) ||
        c.amount < 0 ||
        !["monthly", "annual", "oneTime"].includes(c.type) ||
        (c.type === "oneTime"
          ? !validMonth(c.month)
          : !validMonth(c.startMonth) ||
            (c.endMonth !== undefined &&
              (!validMonth(c.endMonth) || c.endMonth < c.startMonth))),
    )
  ) {
    errors.advanced = "Check the rates, costs, and month ranges in Advanced.";
  }
  return errors;
}
