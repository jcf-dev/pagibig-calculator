export const MPL_ENTITLEMENT_RATE = 0.9;
export const MPL_EQUIVALENT_ANNUAL_RATE = 0.175;
export const MPL_GRACE_MONTHS = 2;
export const MPL_TERMS = [12, 24, 36] as const;

export type MplTerm = (typeof MPL_TERMS)[number];

export type MplInputs = {
  regularSavings: number;
  existingShortTermBalance: number;
  requestedAmount: number;
  termMonths: MplTerm;
};

export type MplEstimate = {
  availableAmount: number;
  monthlyPayment: number;
  totalRepayment: number;
  totalInterest: number;
  graceInterest: number;
};

export function availableMplAmount(regularSavings: number, existingShortTermBalance: number) {
  if (!Number.isFinite(regularSavings) || regularSavings < 0 ||
      !Number.isFinite(existingShortTermBalance) || existingShortTermBalance < 0) {
    throw new Error("Enter valid Regular Savings and existing loan balances.");
  }

  return Math.max(0, Math.round((regularSavings * MPL_ENTITLEMENT_RATE - existingShortTermBalance) * 100) / 100);
}

export function calculateMplEstimate(inputs: MplInputs): MplEstimate {
  const availableAmount = availableMplAmount(inputs.regularSavings, inputs.existingShortTermBalance);
  if (!Number.isFinite(inputs.requestedAmount) || inputs.requestedAmount <= 0) {
    throw new Error("Enter an amount to borrow.");
  }
  if (inputs.requestedAmount > availableAmount) {
    throw new Error("The amount to borrow exceeds the estimated available amount.");
  }
  if (!MPL_TERMS.includes(inputs.termMonths)) {
    throw new Error("Choose a 12, 24, or 36 month term.");
  }

  const monthlyRate = MPL_EQUIVALENT_ANNUAL_RATE / 12;
  const graceInterest = inputs.requestedAmount * monthlyRate * MPL_GRACE_MONTHS;
  const repaymentBalance = inputs.requestedAmount + graceInterest;
  const monthlyPayment = Math.round(
    (repaymentBalance * monthlyRate / (1 - (1 + monthlyRate) ** -inputs.termMonths)) * 100,
  ) / 100;
  const totalRepayment = Math.round(monthlyPayment * inputs.termMonths * 100) / 100;

  return {
    availableAmount,
    monthlyPayment,
    totalRepayment,
    totalInterest: Math.round((totalRepayment - inputs.requestedAmount) * 100) / 100,
    graceInterest: Math.round(graceInterest * 100) / 100,
  };
}
