"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Info,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber, formatPeso } from "@/lib/utils";
import {
  defaultFinancing,
  defaultRefinance,
  resolveRate,
  stepsFor,
  validateScenario,
  activeSamples,
  type FinancingState,
  type RefinanceState,
  type GuideState,
  type Task,
} from "@/lib/calculator-state";
import type {
  LoanScenarioResult,
  RateOption,
  RefinanceComparison,
} from "@/lib/mortgage";

type Result<T> = { error: string; data: T | null };
type Props = {
  financing: FinancingState;
  refinance: RefinanceState;
  setFinancing: Dispatch<SetStateAction<FinancingState>>;
  setRefinance: Dispatch<SetStateAction<RefinanceState>>;
  guide: GuideState;
  setGuide: Dispatch<SetStateAction<GuideState>>;
  rates: RateOption[];
  loanCeiling: number;
  financingResult: Result<LoanScenarioResult>;
  baseline: LoanScenarioResult | null;
  refinanceComparison: Result<RefinanceComparison>;
  details: ReactNode;
};

type Field = {
  key: string;
  label: string;
  help: string;
  unit?: string;
  sample?: number;
  date?: boolean;
};

function groupsFor(
  task: Task,
  financing: FinancingState,
  refinance: RefinanceState,
): Field[][] {
  const date: Field = {
    key: "startDate",
    label: "First payment date",
    help: "Use the first due date on your loan offer. For a future plan, choose a date. This sets the dates in the schedule.",
    date: true,
  };
  const rate: Field = {
    key: "customRate",
    label:
      task === "refinance"
        ? "New annual interest rate"
        : "Annual interest rate",
    unit: "% per year",
    sample: 6.5,
    help: "Find this on your loan offer or rate notice. Enter 6.5 for 6.5%, not 0.065. An example rate is not an offer.",
  };
  const term: Field = {
    key: "termYears",
    label: "Loan term",
    unit: "years",
    help: "How long you plan to repay the loan. A longer term can lower each payment but increase total interest.",
  };
  const state = task === "financing" ? financing : refinance;
  const extras: Field[] = [
    {
      key: "monthlyExtra",
      label: "Extra each month",
      unit: "₱",
      help: "Paid on top of your regular payment, starting in month 1. Enter 0 for none.",
    },
    {
      key: "annualExtra",
      label: "Extra each year",
      unit: "₱",
      help: "Paid in months 12, 24, and every 12 months after that. Enter 0 for none.",
    },
    {
      key: "oneTimeExtra",
      label: "One-time extra",
      unit: "₱",
      help: "One extra payment, such as part of a bonus. Enter 0 for none.",
    },
    ...(state.oneTimeExtra > 0
      ? [
          {
            key: "oneTimeMonth",
            label: "Month of the one-time payment",
            unit: "month",
            help: "Count from your first payment. Month 12 is the twelfth payment, not December.",
          },
        ]
      : []),
  ];
  if (task === "financing")
    return [
      [],
      [
        financing.solveTarget === "principal"
          ? {
              key: "targetPayment",
              label: "Monthly loan budget",
              unit: "₱",
              sample: 25000,
              help: "The amount for principal and interest only. Leave room for insurance, fees, and any extra payments.",
            }
          : {
              key: "principal",
              label: "Amount to borrow",
              unit: "₱",
              sample: 3500000,
              help: "Use the loan amount on your offer. This is the amount borrowed, not the property price or down payment.",
            },
        ...(financing.solveTarget === "term" ? [] : [term]),
        ...(["term", "rate"].includes(financing.solveTarget)
          ? [
              {
                key: "targetPayment",
                label: "Target monthly payment",
                unit: "₱",
                sample: 25000,
                help: "Advanced is solving for your term or rate using this payment. Change that target in Advanced.",
              },
            ]
          : []),
      ],
      [...(financing.solveTarget === "rate" ? [] : [rate]), date],
      extras,
    ];
  return [
    [],
    [
      {
        key: "currentBalance",
        label: "Current loan balance",
        unit: "₱",
        sample: 3000000,
        help: "Use the unpaid principal from your latest statement. Enter settlement charges separately under fees.",
      },
      {
        key: "currentMonthlyDue",
        label: "Current monthly loan payment",
        unit: "₱",
        sample: 28000,
        help: "Use the principal-and-interest payment on your statement. Leave out insurance, penalties, and other fees.",
      },
    ],
    [
      {
        key: "currentAnnualRate",
        label: "Current annual interest rate",
        unit: "% per year",
        sample: 8.5,
        help: "Use the rate on your latest loan statement or rate notice. Enter the percentage per year.",
      },
      {
        key: "remainingYears",
        label: "Years left on the current loan",
        unit: "years",
        help: "Find the remaining term on your statement. The model uses your actual payment to estimate when this loan ends.",
      },
    ],
    [
      {
        key: "newTermYears",
        label: "New loan term",
        unit: "years",
        help: "Use the term in the new offer. A longer term can lower the payment but cost more overall.",
      },
      rate,
    ],
    [
      {
        key: "refinanceCosts",
        label: "Total refinance fees",
        unit: "₱",
        sample: 75000,
        help: "Ask for a written list of closing charges from both lenders. Include taxes, processing fees, and any settlement fees.",
      },
      date,
    ],
    extras,
  ];
}

const descriptionFor = (task: Task, step: number) =>
  task === "financing"
    ? [
        "Choose what you want to understand. We will explain each number as you go.",
        "Start with what you know. We will calculate the other amount.",
        "Use your loan offer, or try a clearly marked example.",
        "See what happens when you pay more than the regular amount. This step is optional.",
        "Check these numbers before you use the result.",
        "Here is what your inputs mean for your loan.",
      ][step]
    : [
        "Choose what you want to understand. We will explain each number as you go.",
        "Have your latest loan statement ready.",
        "These numbers describe the loan you have today.",
        "Use the terms in your new loan offer.",
        "Fees can change the full cost of switching loans.",
        "These payments apply to the new loan. They are optional.",
        "Check both loans and all costs before you compare.",
        "Compare monthly payments, full costs, and time to repay.",
      ][step];

export function SimpleCalculator(props: Props) {
  const {
    financing,
    refinance,
    setFinancing,
    setRefinance,
    guide,
    setGuide,
    rates,
    loanCeiling,
    financingResult,
    baseline,
    refinanceComparison,
    details,
  } = props;
  const { task, step } = guide;
  const state = task === "financing" ? financing : refinance;
  const steps = stepsFor(task);
  const reviewStep = steps.length - 2;
  const extraStep = reviewStep - 1;
  const isReview = step === reviewStep;
  const isResult = step === steps.length - 1;
  const groups = groupsFor(task, financing, refinance);
  const fields = groups[step] ?? [];
  const [attempted, setAttempted] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const errors = validateScenario(
    task,
    financing,
    refinance,
    rates,
    loanCeiling,
  );
  const calculationError =
    task === "financing" ? financingResult.error : refinanceComparison.error;
  const sampleKeys = activeSamples(guide.samples, task, financing, refinance);
  const rate = resolveRate(
    rates,
    state.selectedRateId,
    state.customRate,
    state.useCustomRate,
  );
  const costRules = task === "financing" ? financing.costs : refinance.newCosts;
  const periods =
    task === "financing" ? financing.ratePeriods : refinance.newRatePeriods;
  const interestOnly =
    task === "financing"
      ? financing.interestOnlyPeriods
      : refinance.newInterestOnlyPeriods;
  const hasAdvanced =
    periods.length > 0 ||
    interestOnly.length > 0 ||
    costRules.length > 0 ||
    (task === "financing" &&
      (financing.rangeExtra > 0 ||
        ["term", "rate"].includes(financing.solveTarget)));

  useEffect(() => {
    heading.current?.focus();
  }, [step, task]);

  function go(next: number) {
    setAttempted(false);
    setGuide((g) => ({ ...g, step: next }));
  }
  function patch(values: Record<string, number | string | boolean>) {
    if (task === "financing") setFinancing((s) => ({ ...s, ...values }));
    else setRefinance((s) => ({ ...s, ...values }));
  }
  function read(field: Field): number | string {
    if (field.key === "customRate") return rate;
    return state[field.key as keyof typeof state] as number | string;
  }
  function change(field: Field, value: number | string, sample = false) {
    patch({
      [field.key]: value,
      ...(field.key === "customRate" ? { useCustomRate: true } : {}),
    });
    const key = task + "." + field.key;
    setGuide((g) => ({
      ...g,
      samples: [
        ...g.samples.filter((item) => item !== key),
        ...(sample ? [key] : []),
      ],
    }));
  }
  function example() {
    const values: Record<string, number | string | boolean> =
      task === "financing"
        ? {
            principal: 3500000,
            targetPayment: 25000,
            termYears: 30,
            customRate: 6.5,
            useCustomRate: true,
            solveTarget: "payment",
          }
        : {
            currentBalance: 3000000,
            currentMonthlyDue: 28000,
            currentAnnualRate: 8.5,
            remainingYears: 20,
            newTermYears: 25,
            customRate: 6.5,
            useCustomRate: true,
            refinanceCosts: 75000,
          };
    patch(values);
    const keys = Object.entries(values)
      .filter(([, value]) => typeof value === "number")
      .map(([key]) => task + "." + key);
    setGuide((g) => ({
      ...g,
      step: 1,
      samples: [...new Set([...g.samples, ...keys])],
    }));
    setAttempted(false);
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    setAttempted(true);
    const blocked = isReview
      ? Object.keys(errors).length > 0 || !!calculationError
      : fields.some((field) => errors[field.key]);
    if (blocked) {
      requestAnimationFrame(() => {
        const invalid = form.current?.querySelector<HTMLElement>(
          '[aria-invalid="true"]',
        );
        (
          invalid ?? form.current?.querySelector<HTMLElement>('[role="alert"]')
        )?.focus();
      });
      return;
    }
    go(step + 1);
  }
  function openAdvanced() {
    setGuide((g) => ({
      ...g,
      mode: "advanced",
      step: Math.min(step, reviewStep),
    }));
  }
  function clearTask() {
    if (!window.confirm("Clear this estimate and start again?")) return;
    if (task === "financing") setFinancing({ ...defaultFinancing });
    else setRefinance({ ...defaultRefinance });
    setGuide((g) => ({
      ...g,
      step: 0,
      samples: g.samples.filter((key) => !key.startsWith(task + ".")),
    }));
    setAttempted(false);
  }
  const errorMessage = isReview
    ? Object.values(errors)[0] || calculationError
    : fields.map((f) => errors[f.key]).find(Boolean);

  return (
    <div className="guided-calculator mx-auto max-w-5xl">
      <nav aria-label="Estimate progress" className="calculator-controls mb-7">
        <div className="mb-3 flex items-center justify-between gap-4 text-sm">
          <p>
            Step {step + 1} of {steps.length}{" "}
            <span className="text-muted-foreground">
              · {task === "financing" ? "New loan" : "Refinance"}
            </span>
          </p>
          {step > 0 && (
            <Button variant="ghost" size="sm" onClick={clearTask}>
              Start again
            </Button>
          )}
        </div>
        <ol className="flex gap-1.5">
          {steps.map((name, index) => (
            <li
              key={name}
              className="flex-1"
              aria-current={index === step ? "step" : undefined}
            >
              <span
                className={
                  index <= step
                    ? "block h-1 rounded-full bg-foreground"
                    : "block h-1 rounded-full bg-muted"
                }
              />
              <span className="sr-only">
                {name}
                {index < step ? ", complete" : ""}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-12">
        <section className="min-w-0">
          <h2
            ref={heading}
            tabIndex={-1}
            className="text-balance text-2xl font-semibold outline-none sm:text-3xl"
          >
            {steps[step]}
          </h2>
          <p className="mt-3 max-w-prose text-sm leading-6 text-muted-foreground">
            {descriptionFor(task, step)}
          </p>
          <form
            ref={form}
            noValidate
            onSubmit={submit}
            className="mt-8 space-y-7"
          >
            {step === 0 && (
              <fieldset className="space-y-3">
                <legend className="sr-only">
                  What do you want to calculate?
                </legend>
                <GoalChoice
                  selected={task === "financing"}
                  onClick={() => {
                    setGuide((g) => ({ ...g, task: "financing", step: 0 }));
                    setAttempted(false);
                  }}
                  title="Plan a new loan"
                  detail="Find a monthly payment or a loan amount that fits your loan budget."
                />
                <GoalChoice
                  selected={task === "refinance"}
                  onClick={() => {
                    setGuide((g) => ({ ...g, task: "refinance", step: 0 }));
                    setAttempted(false);
                  }}
                  title="Compare refinancing"
                  detail="See how replacing your current loan could change your payments and total cost."
                />
              </fieldset>
            )}

            {task === "financing" && step === 1 && (
              <fieldset className="space-y-3">
                <legend className="mb-3 text-sm font-medium">
                  What do you know?
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Choice
                    selected={financing.solveTarget === "payment"}
                    onClick={() => patch({ solveTarget: "payment" })}
                  >
                    My loan amount
                  </Choice>
                  <Choice
                    selected={financing.solveTarget === "principal"}
                    onClick={() => patch({ solveTarget: "principal" })}
                  >
                    My monthly budget
                  </Choice>
                </div>
                {["term", "rate"].includes(financing.solveTarget) && (
                  <p className="text-sm">
                    Advanced is solving for your {financing.solveTarget}. Keep
                    that setting, choose a starting point above, or{" "}
                    <button
                      type="button"
                      onClick={openAdvanced}
                      className="underline"
                    >
                      edit it in Advanced
                    </button>
                    .
                  </p>
                )}
              </fieldset>
            )}

            {fields.map((field) => (
              <GuideField
                key={field.key}
                field={field}
                value={read(field)}
                sample={sampleKeys.includes(task + "." + field.key)}
                error={attempted ? errors[field.key] : undefined}
                onChange={(value) => change(field, value)}
                onExample={
                  field.sample === undefined
                    ? undefined
                    : () => change(field, field.sample!, true)
                }
              />
            ))}

            {task === "refinance" && step === 4 && (
              <fieldset>
                <legend className="mb-3 text-sm font-medium">
                  How will you pay these fees?
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Choice
                    selected={refinance.feeTreatment === "upfront"}
                    onClick={() => patch({ feeTreatment: "upfront" })}
                  >
                    Pay now
                  </Choice>
                  <Choice
                    selected={refinance.feeTreatment === "financed"}
                    onClick={() => patch({ feeTreatment: "financed" })}
                  >
                    Add to the new loan
                  </Choice>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {refinance.feeTreatment === "upfront"
                    ? "These fees count as money paid before the first payment. They do not increase the loan balance."
                    : "These fees increase the new loan balance. You also pay interest on them. Confirm that your lender allows this."}
                </p>
              </fieldset>
            )}

            {step === extraStep && (
              <fieldset>
                <legend className="mb-3 text-sm font-medium">
                  What should extra payments do in this estimate?
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Choice
                    selected={state.extraPaymentMode === "reduce-term"}
                    onClick={() => patch({ extraPaymentMode: "reduce-term" })}
                  >
                    Pay off sooner
                  </Choice>
                  <Choice
                    selected={state.extraPaymentMode === "reduce-payment"}
                    onClick={() =>
                      patch({ extraPaymentMode: "reduce-payment" })
                    }
                  >
                    Reduce later payments
                  </Choice>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {state.extraPaymentMode === "reduce-term"
                    ? "Keep the regular payment and use extras to finish earlier."
                    : "This model spreads the lower balance across the time left. Later regular payments can fall."}{" "}
                  These are model choices. Ask the lender to confirm how extra
                  payments go to principal and when payments can change.
                </p>
              </fieldset>
            )}

            {(isReview || isResult) && (
              <>
                {isReview && (
                  <EstimateNotes
                    task={task}
                    financing={financing}
                    refinance={refinance}
                    rates={rates}
                    samples={guide.samples}
                  />
                )}
                {isResult && sampleKeys.length > 0 && (
                  <p className="rounded-lg border bg-muted/25 p-3 text-sm font-medium">
                    Example estimate · Contains sample values.
                  </p>
                )}
                {isReview && (
                  <div className="divide-y border-y">
                    {groups.slice(1).map((group, index) => (
                      <section key={index} className="py-5">
                        <div className="mb-3 flex items-center justify-between gap-4">
                          <h3 className="font-medium">{steps[index + 1]}</h3>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => go(index + 1)}
                            aria-label={"Edit " + steps[index + 1]}
                          >
                            <Pencil className="size-3.5" />
                            Edit
                          </Button>
                        </div>
                        <dl className="space-y-3 text-sm">
                          {group.map((field) => (
                            <div
                              key={field.key}
                              className="flex flex-wrap justify-between gap-x-5 gap-y-1"
                            >
                              <dt className="text-muted-foreground">
                                {field.label}
                              </dt>
                              <dd className="text-right font-medium tabular-nums">
                                {displayValue(field, read(field))}
                                {sampleKeys.includes(
                                  task + "." + field.key,
                                ) && (
                                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                                    (example)
                                  </span>
                                )}
                                {errors[field.key] && (
                                  <span className="block text-destructive">
                                    {errors[field.key]}
                                  </span>
                                )}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        {task === "refinance" && index + 1 === 4 && (
                          <p className="mt-3 text-sm">
                            Fees:{" "}
                            {refinance.feeTreatment === "upfront"
                              ? "paid now"
                              : "added to the new loan"}
                            .
                          </p>
                        )}
                        {index + 1 === extraStep && (
                          <p className="mt-3 text-sm">
                            Extra payments:{" "}
                            {state.extraPaymentMode === "reduce-term"
                              ? "pay off sooner"
                              : "reduce later payments"}
                            .
                          </p>
                        )}
                      </section>
                    ))}
                  </div>
                )}
                {isResult && (
                  <>
                    <SimpleResults
                      task={task}
                      financing={financing}
                      refinance={refinance}
                      financingResult={financingResult}
                      baseline={baseline}
                      comparison={refinanceComparison}
                    />
                    <EstimateNotes
                      task={task}
                      financing={financing}
                      refinance={refinance}
                      rates={rates}
                      samples={guide.samples}
                    />
                  </>
                )}
              </>
            )}

            {hasAdvanced && step > 0 && (
              <details
                open={isReview || isResult}
                className="rounded-lg border px-4 py-3 text-sm"
              >
                <summary className="cursor-pointer py-1 font-medium">
                  Active settings from Advanced
                </summary>
                <div className="mt-3 space-y-3 leading-6">
                  {task === "financing" &&
                    ["term", "rate"].includes(financing.solveTarget) && (
                      <p>
                        Solving for {financing.solveTarget} with a target
                        payment of {formatPeso(financing.targetPayment)}.
                      </p>
                    )}
                  {task === "financing" && financing.rangeExtra > 0 && (
                    <p>
                      Extra {formatPeso(financing.rangeExtra)} each month from
                      month {financing.rangeStartMonth} to{" "}
                      {financing.rangeEndMonth}.
                    </p>
                  )}
                  {periods.map((p) => (
                    <p key={p.id}>
                      Rate: {p.annualRate}% from month {p.startMonth}{" "}
                      {p.endMonth ? "to " + p.endMonth : "onward"}.
                    </p>
                  ))}
                  {interestOnly.map((p) => (
                    <p key={p.id}>
                      Interest only: months {p.startMonth}–{p.endMonth}. Extra
                      principal payments pause during these months.
                    </p>
                  ))}
                  {costRules.map((c) => (
                    <p key={c.id}>
                      {c.label}: {formatPeso(c.amount)},{" "}
                      {c.type === "oneTime"
                        ? "once in month " + c.month
                        : c.type +
                          " from month " +
                          c.startMonth +
                          (c.endMonth ? " to " + c.endMonth : " until payoff")}
                      .
                    </p>
                  ))}
                  <Button
                    variant="outline"
                    type="button"
                    onClick={openAdvanced}
                  >
                    Edit in Advanced
                  </Button>
                </div>
              </details>
            )}

            {attempted && errorMessage && (
              <div
                role="alert"
                tabIndex={-1}
                className="rounded-lg border border-destructive/40 p-4 text-sm text-destructive"
              >
                <p>{errorMessage}</p>
                {isReview && (
                  <p className="mt-2">
                    Use the Edit links to check your inputs.
                    {errors.advanced && (
                      <button
                        type="button"
                        className="ml-1 underline"
                        onClick={openAdvanced}
                      >
                        Open Advanced.
                      </button>
                    )}
                  </p>
                )}
              </div>
            )}

            <div className="calculator-controls flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              {step > 0 ? (
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => go(step - 1)}
                >
                  <ArrowLeft />
                  {isResult ? "Edit inputs" : "Back"}
                </Button>
              ) : (
                <Button variant="outline" type="button" onClick={example}>
                  <FileText />
                  Try an example
                </Button>
              )}
              {!isResult && (
                <Button type="submit" className="ml-auto">
                  {step === 0
                    ? "Start my estimate"
                    : isReview
                      ? "Show my estimate"
                      : "Next"}
                  <ArrowRight />
                </Button>
              )}
            </div>
          </form>
        </section>

        <aside className="guide-help border-t pt-6 text-sm lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
          <div className="flex items-center gap-2 font-medium">
            <Info className="size-4" />
            {step === 0 ? "Before you start" : "Good to know"}
          </div>
          <p className="mt-3 leading-6 text-muted-foreground">
            {step === 0
              ? "Have your loan offer nearby. For refinancing, also get your latest statement and a list of fees."
              : step === extraStep
                ? "Principal means the amount you still owe. Extra payments in this tool go straight to that amount."
                : isResult
                  ? "Use this estimate to prepare questions for your lender. It is not a loan approval or a promise of savings."
                  : "Use your own figures when you have them. You can go back and change any answer."}
          </p>
          <p className="mt-4 leading-6 text-muted-foreground">
            Missing a number? Try an example. We will keep sample figures marked
            so you can replace them later.
          </p>
          <p className="mt-4 leading-6 text-muted-foreground">
            Inputs are saved in this browser when storage is available. No
            account is needed.
          </p>
          <a
            className="mt-5 inline-flex min-h-11 items-center underline underline-offset-4"
            href="https://www.pagibigfund.gov.ph/FAQ_HL.html"
            target="_blank"
            rel="noreferrer"
          >
            Pag-IBIG housing loan help
            <ArrowRight className="ml-2 size-3.5" />
          </a>
        </aside>
      </div>

      {isResult && (
        <details className="report-details mt-10 border-t pt-5">
          <summary className="calculator-controls flex min-h-11 cursor-pointer items-center gap-2 font-medium">
            <ChevronDown className="size-4" />
            Charts, payment schedule, and export
          </summary>
          <div className="mt-5">{details}</div>
        </details>
      )}
    </div>
  );
}

function Choice({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={
        "flex min-h-12 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 " +
        (selected
          ? "border-foreground bg-muted font-medium"
          : "hover:bg-muted/50")
      }
    >
      {children}
      {selected && <Check className="size-4 shrink-0" />}
    </button>
  );
}

function GoalChoice({
  selected,
  onClick,
  title,
  detail,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  detail: string;
}) {
  return (
    <button
      type="button"
      aria-label={title}
      aria-pressed={selected}
      onClick={onClick}
      className={
        "flex w-full items-start gap-4 rounded-xl border p-5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 " +
        (selected ? "border-foreground bg-muted/40" : "hover:bg-muted/30")
      }
    >
      <span
        className={
          "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border " +
          (selected
            ? "border-foreground bg-foreground text-background"
            : "border-input")
        }
      >
        {selected && <Check className="size-3" />}
      </span>
      <span>
        <span className="block font-medium">{title}</span>
        <span className="mt-2 block text-sm leading-6 text-muted-foreground">
          {detail}
        </span>
      </span>
    </button>
  );
}

function GuideField({
  field,
  value,
  sample,
  error,
  onChange,
  onExample,
}: {
  field: Field;
  value: number | string;
  sample: boolean;
  error?: string;
  onChange: (value: number | string) => void;
  onExample?: () => void;
}) {
  const id = "guide-" + field.key;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {field.label}
        </label>
        {sample && (
          <span className="rounded border px-2 py-0.5 text-xs">
            Example value
          </span>
        )}
      </div>
      <p
        id={id + "-help"}
        className="max-w-prose text-sm leading-6 text-muted-foreground"
      >
        {field.help}
      </p>
      <div className="relative">
        <Input
          id={id}
          type={field.date ? "date" : "number"}
          step="any"
          inputMode={field.date ? undefined : "decimal"}
          value={
            typeof value === "number" && !Number.isFinite(value) ? "" : value
          }
          aria-invalid={!!error}
          aria-describedby={id + "-help" + (error ? " " + id + "-error" : "")}
          onChange={(e) =>
            onChange(
              field.date
                ? e.target.value
                : e.target.value === ""
                  ? NaN
                  : Number(e.target.value),
            )
          }
          className={
            "h-12 text-base tabular-nums md:text-base " +
            (field.unit ? "pr-28" : "")
          }
        />
        {field.unit && (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-muted-foreground">
            {field.unit}
          </span>
        )}
      </div>
      {error && (
        <p id={id + "-error"} className="text-sm text-destructive">
          {error}
        </p>
      )}
      {onExample && (
        <button
          type="button"
          onClick={onExample}
          className="calculator-controls inline-flex min-h-11 items-center text-sm underline underline-offset-4"
        >
          Use example:{" "}
          {field.unit === "₱" ? formatPeso(field.sample!) : field.sample + "%"}
        </button>
      )}
    </div>
  );
}

function displayValue(field: Field, value: number | string) {
  if (typeof value === "string") return value || "Not entered";
  if (!Number.isFinite(value)) return "Not entered";
  return field.unit === "₱"
    ? formatPeso(value)
    : formatNumber(value) + " " + (field.unit ?? "");
}

export function EstimateNotes({
  task,
  financing,
  refinance,
  rates,
  samples,
}: Pick<Props, "financing" | "refinance" | "rates"> & {
  task: Task;
  samples: string[];
}) {
  const state = task === "financing" ? financing : refinance;
  const periods =
    task === "financing" ? financing.ratePeriods : refinance.newRatePeriods;
  const example = activeSamples(samples, task, financing, refinance).length > 0;
  const rate = resolveRate(
    rates,
    state.selectedRateId,
    state.customRate,
    state.useCustomRate,
  );
  return (
    <div className="estimate-notes mb-5 space-y-2 rounded-lg border bg-muted/25 p-4 text-sm leading-6">
      {example && (
        <p className="font-medium">
          Example estimate · Some inputs are sample values. Replace them before
          using this result for your own loan.
        </p>
      )}
      <p>
        {periods.length
          ? "This estimate includes the future rate changes shown under Advanced settings."
          : "This estimate keeps the entered rate for the full loan. It does not predict future rate changes."}{" "}
        {task === "financing" && financing.solveTarget === "rate"
          ? "The base rate is calculated from your target payment."
          : Number.isFinite(rate) && (
              <>The entered base rate is {formatNumber(rate)}% per year.</>
            )}
      </p>
      <p>
        First payment: {state.startDate || "not entered"}.{" "}
        {task === "financing"
          ? financing.solveTarget === "principal"
            ? "Monthly loan budget: " + formatPeso(financing.targetPayment)
            : "Amount to borrow: " + formatPeso(financing.principal)
          : "Current balance: " + formatPeso(refinance.currentBalance)}
        .{" "}
        {task === "financing" && financing.solveTarget === "term"
          ? "The term is calculated from your target payment."
          : `Planned term: ${task === "financing" ? financing.termYears : refinance.newTermYears} years.`}
      </p>
      <p>
        Only entered costs are included. Insurance, taxes, and other charges are
        excluded unless you add them. A loan amount based on your budget does
        not check income or loan eligibility.
      </p>
      <p className="text-muted-foreground">
        Extra payments assume direct payment to principal. Confirm the lender’s
        rules and your final figures. This is not an official Pag-IBIG
        computation or financial advice.
      </p>
    </div>
  );
}

function SimpleResults({
  task,
  financing,
  refinance,
  financingResult,
  baseline,
  comparison,
}: Pick<Props, "financing" | "refinance" | "financingResult" | "baseline"> & {
  task: Task;
  comparison: Result<RefinanceComparison>;
}) {
  const data =
    task === "financing" ? financingResult.data : comparison.data?.refinance;
  if (!data)
    return (
      <p role="alert">
        We could not calculate this estimate. Go back and check your inputs.
      </p>
    );
  const first = data.rows[0];
  const amount = first
    ? first.endingBalance + first.principal + first.extraPrincipal
    : 0;
  const paymentLabel =
    task === "financing" && financing.solveTarget === "principal"
      ? "Estimated loan amount"
      : "Regular monthly loan payment";
  return (
    <div className="space-y-7">
      <section className="border-y py-6">
        <h3 className="text-base font-medium">{paymentLabel}</h3>
        <p className="mt-3 break-words text-3xl font-semibold tabular-nums sm:text-4xl">
          {formatPeso(
            paymentLabel === "Estimated loan amount"
              ? amount
              : data.monthlyPayment,
          )}
        </p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {paymentLabel === "Estimated loan amount"
            ? "This is a model estimate from your monthly budget, rate, and term. It is not the amount a lender has approved."
            : "Principal and interest only. Extra payments and costs are separate below. Your actual bill may differ."}
        </p>
      </section>
      <section>
        <h3 className="mb-4 font-medium">Your first payment month</h3>
        <dl className="divide-y text-sm">
          <ResultRow
            label="Principal and interest"
            value={formatPeso(
              (first?.payment ?? 0) - (first?.extraPrincipal ?? 0),
            )}
          />
          <ResultRow
            label="Extra principal payment"
            value={formatPeso(first?.extraPrincipal ?? 0)}
          />
          <ResultRow
            label="Entered costs for this month"
            value={formatPeso(first?.costs ?? 0)}
          />
          <ResultRow
            label="Total for this month"
            value={formatPeso(first?.totalOutflow ?? 0)}
            strong
          />
        </dl>
        <p className="mt-3 text-sm text-muted-foreground">
          Later months can differ because of yearly payments, one-time payments,
          or rate changes.
        </p>
      </section>
      {task === "financing" ? (
        <section>
          <h3 className="mb-4 font-medium">The full picture</h3>
          <dl className="divide-y text-sm">
            <ResultRow
              label="Total interest"
              value={formatPeso(data.totalInterest)}
            />
            <ResultRow
              label="Total entered costs"
              value={formatPeso(data.totalCosts)}
            />
            <ResultRow
              label="Total paid, including extras and costs"
              value={formatPeso(data.totalOutflow)}
              strong
            />
            <ResultRow
              label="Estimated final payment"
              value={data.payoffDate + " · " + data.payoffMonth + " months"}
            />
            {baseline && (
              <>
                <ResultRow
                  label="Cost difference versus no extras"
                  value={
                    formatPeso(baseline.totalOutflow - data.totalOutflow) +
                    " less"
                  }
                />
                <ResultRow
                  label="Time saved versus no extras"
                  value={
                    Math.max(0, baseline.payoffMonth - data.payoffMonth) +
                    " months"
                  }
                />
              </>
            )}
          </dl>
        </section>
      ) : (
        comparison.data && (
          <section>
            <h3 className="mb-4 font-medium">Current loan or new loan?</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Loan comparison, including all entered costs
                </caption>
                <thead>
                  <tr className="border-b">
                    <th className="py-3 font-medium">Compare</th>
                    <th className="px-3 py-3 text-right font-medium">
                      Current
                    </th>
                    <th className="py-3 text-right font-medium">New</th>
                  </tr>
                </thead>
                <tbody>
                  <ComparisonRow
                    label="Regular monthly payment"
                    current={formatPeso(comparison.data.current.monthlyPayment)}
                    next={formatPeso(data.monthlyPayment)}
                  />
                  <ComparisonRow
                    label="Fees paid now"
                    current={formatPeso(0)}
                    next={formatPeso(comparison.data.upfrontCosts)}
                  />
                  <ComparisonRow
                    label="Total remaining cost"
                    current={formatPeso(comparison.data.current.totalOutflow)}
                    next={formatPeso(comparison.data.refinanceTotalOutflow)}
                  />
                  <ComparisonRow
                    label="Months to repay"
                    current={String(comparison.data.current.payoffMonth)}
                    next={String(data.payoffMonth)}
                  />
                  <ComparisonRow
                    label="Final payment date"
                    current={comparison.data.current.payoffDate}
                    next={data.payoffDate}
                  />
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-sm leading-6">
              The new loan has{" "}
              {comparison.data.monthlySavings >= 0 ? "a lower" : "a higher"}{" "}
              regular monthly payment by{" "}
              {formatPeso(Math.abs(comparison.data.monthlySavings))}. Its full
              estimated cost is{" "}
              {formatPeso(Math.abs(comparison.data.totalSavings))}{" "}
              {comparison.data.totalSavings >= 0 ? "lower" : "higher"}.
            </p>
            {comparison.data.monthlySavings > 0 &&
              comparison.data.totalSavings < 0 && (
                <p className="mt-3 text-sm font-medium">
                  A smaller monthly payment does not mean a cheaper loan. This
                  new loan costs more overall.
                </p>
              )}
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {refinance.feeTreatment === "financed"
                ? "Refinance fees are included in the new balance and earn interest."
                : "The full cost includes refinance fees paid before the first payment."}{" "}
              The current-loan projection uses the entered payment and rate
              until payoff. It may differ from the remaining term on your
              statement.
            </p>
            {baseline && (
              <dl className="mt-5 divide-y text-sm">
                <ResultRow
                  label="Cost saved by extras on the new loan"
                  value={formatPeso(baseline.totalOutflow - data.totalOutflow)}
                />
                <ResultRow
                  label="Time saved by extras on the new loan"
                  value={
                    Math.max(0, baseline.payoffMonth - data.payoffMonth) +
                    " months"
                  }
                />
              </dl>
            )}
          </section>
        )
      )}
      <section className="border-t pt-5">
        <h3 className="font-medium">What to check next</h3>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Ask your lender to confirm the rate, when it can change, insurance and
          fees, and how extra payments are applied. Use the schedule below to
          compare this estimate with their figures.
        </p>
      </section>
    </div>
  );
}

function ResultRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={
        "flex flex-wrap justify-between gap-x-5 gap-y-1 py-3 " +
        (strong ? "font-semibold" : "")
      }
    >
      <dt>{label}</dt>
      <dd className="text-right tabular-nums">{value}</dd>
    </div>
  );
}
function ComparisonRow({
  label,
  current,
  next,
}: {
  label: string;
  current: string;
  next: string;
}) {
  return (
    <tr className="border-b">
      <th scope="row" className="py-3 font-normal">
        {label}
      </th>
      <td className="px-3 py-3 text-right tabular-nums">{current}</td>
      <td className="py-3 text-right tabular-nums">{next}</td>
    </tr>
  );
}
