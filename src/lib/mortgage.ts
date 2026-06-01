export type RateOption = {
  id: string;
  label: string;
  fixingYears: number;
  annualRate: number;
};

export type ExtraPaymentRule =
  | { type: "monthly"; amount: number; startMonth: number; endMonth?: number }
  | { type: "annual"; amount: number; startMonth: number; endMonth?: number }
  | { type: "oneTime"; amount: number; month: number };

export type ExtraPaymentMode = "reduce-term" | "reduce-payment";

export type InterestRatePeriod = {
  id: string;
  startMonth: number;
  endMonth?: number;
  annualRate: number;
};

export type InterestOnlyPeriod = {
  id: string;
  startMonth: number;
  endMonth: number;
};

export type CostRule =
  | { id: string; label: string; type: "monthly"; amount: number; startMonth: number; endMonth?: number }
  | { id: string; label: string; type: "annual"; amount: number; startMonth: number; endMonth?: number }
  | { id: string; label: string; type: "oneTime"; amount: number; month: number };

export type SolveTarget = "payment" | "principal" | "term" | "rate";

export type LoanScenarioInput = {
  principal: number;
  annualRate: number;
  termMonths: number;
  startDate: string;
  extraPayments: ExtraPaymentRule[];
  extraPaymentMode: ExtraPaymentMode;
  fixedMonthlyPayment?: number;
  ratePeriods?: InterestRatePeriod[];
  interestOnlyPeriods?: InterestOnlyPeriod[];
  costs?: CostRule[];
  solveTarget?: SolveTarget;
  targetPayment?: number;
};

export type AmortizationRow = {
  month: number;
  date: string;
  annualRate: number;
  scheduledPayment: number;
  payment: number;
  principal: number;
  interest: number;
  extraPrincipal: number;
  costs: number;
  totalOutflow: number;
  endingBalance: number;
  cumulativeInterest: number;
  cumulativePayment: number;
  cumulativeCosts: number;
  cumulativeOutflow: number;
};

export type LoanScenarioResult = {
  monthlyPayment: number;
  rows: AmortizationRow[];
  totalInterest: number;
  totalPaid: number;
  totalCosts: number;
  totalOutflow: number;
  payoffMonth: number;
  payoffDate: string;
};

export type RefinanceInput = {
  currentBalance: number;
  currentMonthlyDue: number;
  currentAnnualRate: number;
  remainingMonths: number;
  newAnnualRate: number;
  newTermMonths: number;
  refinanceCosts: number;
  extraPayments: ExtraPaymentRule[];
  startDate: string;
  extraPaymentMode: ExtraPaymentMode;
  currentRatePeriods?: InterestRatePeriod[];
  newRatePeriods?: InterestRatePeriod[];
  currentCosts?: CostRule[];
  newCosts?: CostRule[];
  currentInterestOnlyPeriods?: InterestOnlyPeriod[];
  newInterestOnlyPeriods?: InterestOnlyPeriod[];
};

export type RefinanceComparison = {
  current: LoanScenarioResult;
  refinance: LoanScenarioResult;
  monthlySavings: number;
  interestSavings: number;
  totalSavings: number;
  breakEvenMonth: number | null;
  recommendation: "refinance" | "do-not-refinance" | "close-call";
  reason: string;
};

const EPSILON = 0.005;

export function monthlyRate(annualRate: number) {
  return annualRate / 100 / 12;
}

export function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number,
) {
  if (principal <= 0 || termMonths <= 0) return 0;
  const rate = monthlyRate(annualRate);
  if (rate === 0) return principal / termMonths;
  return (principal * rate) / (1 - (1 + rate) ** -termMonths);
}

export function extraPaymentForMonth(rules: ExtraPaymentRule[], month: number) {
  return rules.reduce((total, rule) => {
    if (rule.amount <= 0) return total;

    if (rule.type === "oneTime") {
      return rule.month === month ? total + rule.amount : total;
    }

    const starts = month >= rule.startMonth;
    const beforeEnd = rule.endMonth ? month <= rule.endMonth : true;
    if (!starts || !beforeEnd) return total;

    if (rule.type === "monthly") return total + rule.amount;
    return (month - rule.startMonth) % 12 === 0 ? total + rule.amount : total;
  }, 0);
}

export function rateForMonth(
  baseAnnualRate: number,
  periods: InterestRatePeriod[] = [],
  month: number,
) {
  const matchingPeriod = periods
    .filter((period) => {
      const starts = month >= period.startMonth;
      const beforeEnd = period.endMonth ? month <= period.endMonth : true;
      return period.annualRate >= 0 && starts && beforeEnd;
    })
    .sort((a, b) => b.startMonth - a.startMonth)[0];

  return matchingPeriod?.annualRate ?? baseAnnualRate;
}

export function costsForMonth(rules: CostRule[] = [], month: number) {
  return rules.reduce((total, rule) => {
    if (rule.amount <= 0) return total;

    if (rule.type === "oneTime") {
      return rule.month === month ? total + rule.amount : total;
    }

    const starts = month >= rule.startMonth;
    const beforeEnd = rule.endMonth ? month <= rule.endMonth : true;
    if (!starts || !beforeEnd) return total;

    if (rule.type === "monthly") return total + rule.amount;
    return (month - rule.startMonth) % 12 === 0 ? total + rule.amount : total;
  }, 0);
}

function isInterestOnlyMonth(periods: InterestOnlyPeriod[] = [], month: number) {
  return periods.some(
    (period) =>
      period.startMonth <= month &&
      month <= period.endMonth &&
      period.endMonth >= period.startMonth,
  );
}

function addMonths(dateString: string, monthOffset: number) {
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setMonth(date.getMonth() + monthOffset);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateAmortization(
  input: LoanScenarioInput,
): LoanScenarioResult {
  const solvedInput = solveScenarioInput(input);
  const principal = Math.max(0, solvedInput.principal);
  const termMonths = Math.max(0, Math.round(solvedInput.termMonths));
  const annualRate = Math.max(0, solvedInput.annualRate);
  const initialRate = monthlyRate(rateForMonth(annualRate, solvedInput.ratePeriods, 1));
  const scheduledPayment =
    solvedInput.fixedMonthlyPayment ??
    solvedInput.targetPayment ??
    calculateMonthlyPayment(principal, annualRate, termMonths);

  if (principal === 0 || termMonths === 0) {
    return {
      monthlyPayment: 0,
      rows: [],
      totalInterest: 0,
      totalPaid: 0,
      totalCosts: 0,
      totalOutflow: 0,
      payoffMonth: 0,
      payoffDate: solvedInput.startDate,
    };
  }

  if (scheduledPayment <= principal * initialRate && initialRate > 0) {
    throw new Error("Monthly payment is too low to reduce the loan balance.");
  }

  const rows: AmortizationRow[] = [];
  let balance = principal;
  let currentScheduledPayment = scheduledPayment;
  let cumulativeInterest = 0;
  let cumulativePayment = 0;
  let cumulativeCosts = 0;
  let cumulativeOutflow = 0;
  let month = 1;
  const hardLimit = Math.max(termMonths * 3, termMonths + 600);
  let previousAnnualRate = rateForMonth(annualRate, solvedInput.ratePeriods, 1);

  while (balance > EPSILON && month <= hardLimit) {
    const currentAnnualRate = rateForMonth(annualRate, solvedInput.ratePeriods, month);
    const rate = monthlyRate(currentAnnualRate);
    const remainingMonths = Math.max(termMonths - month + 1, 1);

    if (month > 1 && currentAnnualRate !== previousAnnualRate) {
      currentScheduledPayment = calculateMonthlyPayment(
        balance,
        currentAnnualRate,
        remainingMonths,
      );
      previousAnnualRate = currentAnnualRate;
    }

    const interest = balance * rate;
    const interestOnly = isInterestOnlyMonth(solvedInput.interestOnlyPeriods, month);
    const regularPrincipal = interestOnly
      ? 0
      : Math.min(Math.max(currentScheduledPayment - interest, 0), balance);
    const rawExtra = interestOnly ? 0 : extraPaymentForMonth(solvedInput.extraPayments, month);
    const extraPrincipal = Math.min(rawExtra, balance - regularPrincipal);
    const payment = regularPrincipal + interest + extraPrincipal;
    const costs = costsForMonth(solvedInput.costs, month);
    const totalOutflow = payment + costs;

    balance = Math.max(0, balance - regularPrincipal - extraPrincipal);
    cumulativeInterest += interest;
    cumulativePayment += payment;
    cumulativeCosts += costs;
    cumulativeOutflow += totalOutflow;

    rows.push({
      month,
      date: addMonths(solvedInput.startDate, month - 1),
      annualRate: currentAnnualRate,
      scheduledPayment: currentScheduledPayment,
      payment,
      principal: regularPrincipal,
      interest,
      extraPrincipal,
      costs,
      totalOutflow,
      endingBalance: balance,
      cumulativeInterest,
      cumulativePayment,
      cumulativeCosts,
      cumulativeOutflow,
    });

    if (solvedInput.extraPaymentMode === "reduce-payment" && balance > EPSILON) {
      const remainingMonths = Math.max(termMonths - month, 1);
      currentScheduledPayment = calculateMonthlyPayment(
        balance,
        currentAnnualRate,
        remainingMonths,
      );
    }

    month += 1;
  }

  if (balance > EPSILON) {
    throw new Error("Loan did not amortize within the supported schedule range.");
  }

  const lastRow = rows.at(-1);
  return {
    monthlyPayment: scheduledPayment,
    rows,
    totalInterest: cumulativeInterest,
    totalPaid: cumulativePayment,
    totalCosts: cumulativeCosts,
    totalOutflow: cumulativeOutflow,
    payoffMonth: lastRow?.month ?? 0,
    payoffDate: lastRow?.date ?? solvedInput.startDate,
  };
}

export function compareRefinance(input: RefinanceInput): RefinanceComparison {
  const current = calculateAmortization({
    principal: input.currentBalance,
    annualRate: input.currentAnnualRate,
    termMonths: input.remainingMonths,
    startDate: input.startDate,
    extraPayments: [],
    extraPaymentMode: "reduce-term",
    fixedMonthlyPayment: input.currentMonthlyDue,
    ratePeriods: input.currentRatePeriods,
    costs: input.currentCosts,
    interestOnlyPeriods: input.currentInterestOnlyPeriods,
  });

  const refinance = calculateAmortization({
    principal: input.currentBalance + Math.max(0, input.refinanceCosts),
    annualRate: input.newAnnualRate,
    termMonths: input.newTermMonths,
    startDate: input.startDate,
    extraPayments: input.extraPayments,
    extraPaymentMode: input.extraPaymentMode,
    ratePeriods: input.newRatePeriods,
    costs: input.newCosts,
    interestOnlyPeriods: input.newInterestOnlyPeriods,
  });

  const monthlySavings = current.monthlyPayment - refinance.monthlyPayment;
  const interestSavings = current.totalInterest - refinance.totalInterest;
  const totalSavings = current.totalOutflow - refinance.totalOutflow;
  const breakEvenMonth = findBreakEvenMonth(current, refinance);
  const hasMeaningfulSavings = totalSavings > 1000;
  const breaksEven = breakEvenMonth !== null && breakEvenMonth < current.payoffMonth;

  let recommendation: RefinanceComparison["recommendation"] = "close-call";
  let reason =
    "The estimated total savings are small or the break-even timing is uncertain.";

  if (hasMeaningfulSavings && breaksEven) {
    recommendation = "refinance";
    reason =
      "The refinance scenario lowers estimated remaining cash outflow and reaches break-even before payoff.";
  } else if (totalSavings < -1000 || !breaksEven) {
    recommendation = "do-not-refinance";
    reason =
      "The refinance scenario does not recover costs before payoff or costs more over the remaining term.";
  }

  return {
    current,
    refinance,
    monthlySavings,
    interestSavings,
    totalSavings,
    breakEvenMonth,
    recommendation,
    reason,
  };
}

function findBreakEvenMonth(
  current: LoanScenarioResult,
  refinance: LoanScenarioResult,
) {
  const length = Math.max(current.rows.length, refinance.rows.length);

  for (let index = 0; index < length; index += 1) {
    const currentPaid = current.rows[index]?.cumulativeOutflow ?? current.totalOutflow;
    const refinancePaid =
      refinance.rows[index]?.cumulativeOutflow ?? refinance.totalOutflow;

    if (refinancePaid <= currentPaid) {
      return index + 1;
    }
  }

  return null;
}

function solveScenarioInput(input: LoanScenarioInput): LoanScenarioInput {
  if (!input.solveTarget || input.solveTarget === "payment") return input;

  if (input.solveTarget === "principal") {
    return {
      ...input,
      principal: solvePrincipal(
        input.targetPayment ?? input.fixedMonthlyPayment ?? 0,
        input.annualRate,
        input.termMonths,
      ),
      fixedMonthlyPayment: undefined,
    };
  }

  if (input.solveTarget === "term") {
    return {
      ...input,
      termMonths: solveTerm(
        input.principal,
        input.annualRate,
        input.targetPayment ?? input.fixedMonthlyPayment ?? 0,
      ),
      fixedMonthlyPayment: input.targetPayment ?? input.fixedMonthlyPayment,
    };
  }

  return {
    ...input,
    annualRate: solveAnnualRate(
      input.principal,
      input.termMonths,
      input.targetPayment ?? input.fixedMonthlyPayment ?? 0,
    ),
    fixedMonthlyPayment: input.targetPayment ?? input.fixedMonthlyPayment,
  };
}

export function solvePrincipal(payment: number, annualRate: number, termMonths: number) {
  if (payment <= 0 || termMonths <= 0) return 0;
  const rate = monthlyRate(annualRate);
  if (rate === 0) return payment * termMonths;
  return (payment * (1 - (1 + rate) ** -termMonths)) / rate;
}

export function solveTerm(principal: number, annualRate: number, payment: number) {
  if (principal <= 0 || payment <= 0) return 0;
  const rate = monthlyRate(annualRate);
  if (rate === 0) return Math.ceil(principal / payment);
  if (payment <= principal * rate) {
    throw new Error("Target payment is too low to amortize this loan.");
  }
  return Math.ceil(-Math.log(1 - (principal * rate) / payment) / Math.log(1 + rate));
}

export function solveAnnualRate(principal: number, termMonths: number, payment: number) {
  if (principal <= 0 || termMonths <= 0 || payment <= 0) return 0;
  const zeroRatePayment = principal / termMonths;
  if (Math.abs(payment - zeroRatePayment) < EPSILON) return 0;
  if (payment < zeroRatePayment) {
    throw new Error("Target payment is too low for this principal and term.");
  }

  let low = 0;
  let high = 100;
  for (let index = 0; index < 80; index += 1) {
    const mid = (low + high) / 2;
    const candidate = calculateMonthlyPayment(principal, mid, termMonths);
    if (candidate > payment) high = mid;
    else low = mid;
  }
  return (low + high) / 2;
}

export type AnnualSummaryRow = {
  year: string;
  payment: number;
  principal: number;
  interest: number;
  extraPrincipal: number;
  costs: number;
  totalOutflow: number;
  endingBalance: number;
};

export function calculateAnnualSummary(rows: AmortizationRow[]): AnnualSummaryRow[] {
  const summaries = new Map<string, AnnualSummaryRow>();

  for (const row of rows) {
    const year = row.date.slice(0, 4) || `Year ${Math.ceil(row.month / 12)}`;
    const summary =
      summaries.get(year) ??
      {
        year,
        payment: 0,
        principal: 0,
        interest: 0,
        extraPrincipal: 0,
        costs: 0,
        totalOutflow: 0,
        endingBalance: row.endingBalance,
      };

    summary.payment += row.payment;
    summary.principal += row.principal;
    summary.interest += row.interest;
    summary.extraPrincipal += row.extraPrincipal;
    summary.costs += row.costs;
    summary.totalOutflow += row.totalOutflow;
    summary.endingBalance = row.endingBalance;
    summaries.set(year, summary);
  }

  return [...summaries.values()];
}

export function rowsToCsv(rows: AmortizationRow[]) {
  const header = [
    "month",
    "date",
    "payment",
    "principal",
    "interest",
    "extra_principal",
    "costs",
    "total_outflow",
    "annual_rate",
    "ending_balance",
  ];
  const body = rows.map((row) =>
    [
      row.month,
      row.date,
      row.payment.toFixed(2),
      row.principal.toFixed(2),
      row.interest.toFixed(2),
      row.extraPrincipal.toFixed(2),
      row.costs.toFixed(2),
      row.totalOutflow.toFixed(2),
      row.annualRate.toFixed(3),
      row.endingBalance.toFixed(2),
    ].join(","),
  );

  return [header.join(","), ...body].join("\n");
}
