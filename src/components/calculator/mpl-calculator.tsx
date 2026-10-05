"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoneyInput, formatPeso, parseMoneyInput } from "@/lib/utils";
import {
  availableMplAmount,
  calculateMplEstimate,
  MPL_TERMS,
  type MplInputs,
  type MplTerm,
} from "@/lib/mpl";

const STORAGE_KEY = "pagibig-calculator:mpl:v1";
const emptyInputs: MplInputs = {
  regularSavings: NaN,
  existingShortTermBalance: 0,
  requestedAmount: NaN,
  termMonths: 24,
};

function readInputs(): MplInputs {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyInputs;
  const saved: unknown = JSON.parse(raw);
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return emptyInputs;
  const data = saved as Record<string, unknown>;
  return {
    regularSavings: typeof data.regularSavings === "number" && Number.isFinite(data.regularSavings) ? data.regularSavings : NaN,
    existingShortTermBalance: typeof data.existingShortTermBalance === "number" && Number.isFinite(data.existingShortTermBalance) ? data.existingShortTermBalance : 0,
    requestedAmount: typeof data.requestedAmount === "number" && Number.isFinite(data.requestedAmount) ? data.requestedAmount : NaN,
    termMonths: MPL_TERMS.includes(data.termMonths as MplTerm) ? data.termMonths as MplTerm : 24,
  };
}

export function MplCalculator() {
  const [inputs, setInputs] = useState<MplInputs>(emptyInputs);
  const [hydrated, setHydrated] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setInputs(readInputs()); }
      catch { setStorageNotice("This browser cannot load saved inputs. You can still use the calculator."); }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs)); }
    catch {
      const timer = window.setTimeout(() => setStorageNotice("This browser cannot save your inputs. Keep this page open while you work."), 0);
      return () => window.clearTimeout(timer);
    }
  }, [hydrated, inputs]);

  const available = useMemo(() => {
    try { return availableMplAmount(inputs.regularSavings, inputs.existingShortTermBalance); }
    catch { return null; }
  }, [inputs.regularSavings, inputs.existingShortTermBalance]);

  const result = useMemo(() => {
    if (available === null || !Number.isFinite(inputs.requestedAmount)) return { estimate: null, error: "" };
    try { return { estimate: calculateMplEstimate(inputs), error: "" }; }
    catch (error) { return { estimate: null, error: error instanceof Error ? error.message : "Unable to calculate." }; }
  }, [available, inputs]);
  const savingsError = Number.isFinite(inputs.regularSavings) && inputs.regularSavings < 0
    ? "Enter zero or more for your Regular Savings balance." : "";
  const balanceError = Number.isFinite(inputs.existingShortTermBalance) && inputs.existingShortTermBalance < 0
    ? "Enter zero or more for your existing loan balance." : "";
  const amountError = Number.isFinite(inputs.requestedAmount)
    ? inputs.requestedAmount <= 0
      ? "Enter an amount greater than zero."
      : available !== null && inputs.requestedAmount > available
        ? `Enter ${formatPeso(available)} or less based on your savings.`
        : ""
    : "";

  function update<K extends keyof MplInputs>(key: K, value: MplInputs[K]) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  if (!hydrated) {
    return <p role="status" className="py-12 text-center text-muted-foreground">Getting your MPL calculator ready…</p>;
  }

  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,390px)_minmax(0,1fr)]">
      <section className="space-y-5" aria-labelledby="mpl-inputs-heading">
        <div>
          <h2 id="mpl-inputs-heading" className="text-lg font-semibold">Multi-Purpose Loan inputs</h2>
          <p className="mt-1 text-sm text-muted-foreground">Use your latest Pag-IBIG Regular Savings balance.</p>
        </div>

        <MoneyInput label="Regular Savings balance" help="Also called Total Accumulated Value (TAV). Include your contributions, employer contributions, and dividends, but not MP2 savings." value={inputs.regularSavings} error={savingsError} onChange={(value) => update("regularSavings", value)} />
        <MoneyInput label="Existing short-term loan balance" help="Enter other Pag-IBIG short-term loans using the same savings entitlement. Leave at zero if none. If renewing an MPL, any deduction to settle the old loan is not included." value={inputs.existingShortTermBalance} error={balanceError} onChange={(value) => update("existingShortTermBalance", value)} />

        <div className="border-y py-4" aria-live="polite">
          <p className="text-sm text-muted-foreground">Estimated available from savings</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{available === null ? "—" : formatPeso(available)}</p>
          <p className="mt-1 text-xs text-muted-foreground">90% of Regular Savings less existing short-term loan balance.</p>
        </div>

        <div className="space-y-2">
          <MoneyInput label="Amount to borrow" help="Enter the amount you want to request. This cannot exceed the savings-based estimate above." value={inputs.requestedAmount} error={amountError} onChange={(value) => update("requestedAmount", value)} />
          {available !== null && available > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => update("requestedAmount", available)}>
              Use available amount
            </Button>
          )}
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Repayment term</legend>
          <div className="inline-flex w-full rounded-md border p-1" role="group" aria-label="Repayment term">
            {MPL_TERMS.map((months) => (
              <Button key={months} type="button" variant={inputs.termMonths === months ? "secondary" : "ghost"} aria-pressed={inputs.termMonths === months} className="min-w-0 flex-1 px-2" onClick={() => update("termMonths", months)}>
                {months} months
              </Button>
            ))}
          </div>
        </fieldset>

        <Button type="button" variant="outline" onClick={() => setInputs(emptyInputs)}>
          <RotateCcw aria-hidden="true" /> Clear MPL inputs
        </Button>
        {storageNotice && <p role="status" className="text-sm text-muted-foreground">{storageNotice}</p>}
      </section>

      <section className="min-w-0 space-y-7" aria-labelledby="mpl-result-heading">
        <div>
          <h2 id="mpl-result-heading" className="text-lg font-semibold">Your MPL estimate</h2>
          <p className="mt-1 text-sm text-muted-foreground">Based on the amount and term you choose.</p>
        </div>

        {result.error && !amountError ? (
          <p role="alert" className="rounded-md border border-destructive p-4 text-sm text-destructive">{result.error}</p>
        ) : !result.estimate ? (
          <p className="rounded-md border p-5 text-sm text-muted-foreground">{savingsError || balanceError || amountError ? "Correct the highlighted input to see your estimate." : "Enter your Regular Savings and an amount to borrow to see the estimate."}</p>
        ) : (
          <>
            <div aria-live="polite" className="border-b border-t-2 border-t-brand-blue bg-brand-blue/5 px-4 py-5">
              <p className="text-sm text-muted-foreground">Estimated monthly payment</p>
              <p className="mt-1 text-3xl font-semibold leading-tight tabular-nums [overflow-wrap:anywhere] sm:text-4xl">{formatPeso(result.estimate.monthlyPayment)}</p>
              <p className="mt-2 text-sm text-muted-foreground">{inputs.termMonths} monthly payments, starting after the assumed two-month grace period.</p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div><dt className="text-sm text-muted-foreground">Total repayment</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{formatPeso(result.estimate.totalRepayment)}</dd></div>
              <div><dt className="text-sm text-muted-foreground">Estimated interest</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{formatPeso(result.estimate.totalInterest)}</dd></div>
            </dl>
            <div>
              <h3 className="text-sm font-semibold">Compare repayment terms</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs sm:text-sm" aria-label="Multi-Purpose Loan term comparison">
                  <thead className="border-b text-left text-muted-foreground"><tr><th className="py-2 font-medium">Term</th><th className="py-2 text-right font-medium">Monthly</th><th className="py-2 text-right font-medium">Total interest</th></tr></thead>
                  <tbody>
                    {MPL_TERMS.map((months) => {
                      const estimate = calculateMplEstimate({ ...inputs, termMonths: months });
                      const selected = months === inputs.termMonths;
                      return <tr key={months} className={`border-b last:border-0 ${selected ? "bg-brand-blue/10 font-semibold" : ""}`}><th className="py-3 text-left font-medium" aria-label={selected ? `Selected: ${months} months` : undefined}>{months} months</th><td className="py-3 text-right tabular-nums">{formatPeso(estimate.monthlyPayment)}</td><td className="py-3 text-right tabular-nums">{formatPeso(estimate.totalInterest)}</td></tr>;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className="border-t pt-5 text-sm leading-6 text-muted-foreground">
          <h3 className="font-semibold text-foreground">How this estimate works</h3>
          <p className="mt-2">The model uses the published 1.4583% monthly equivalent rate on a declining balance. It adds two months of simple interest before calculating equal payments. Actual Pag-IBIG payment calculations may differ.</p>
          <p className="mt-2">The savings-based amount is not an approval or capacity-to-pay check. Existing loan offsets, fees, penalties, and your actual release date may change the proceeds or payment.</p>
          <p className="mt-3 text-xs">Terms checked September 2026: <a className="underline underline-offset-2 hover:text-foreground" href="https://www.pna.gov.ph/articles/1249611" target="_blank" rel="noreferrer">Pag-IBIG MPL update</a> and <a className="underline underline-offset-2 hover:text-foreground" href="https://pia.gov.ph/enhanced-pag-ibig-multi-purpose-loan-ipatuman-sugod-mayo-16/" target="_blank" rel="noreferrer">term options</a>.</p>
        </div>
      </section>
    </div>
  );
}

function MoneyInput({ label, help, value, onChange, error = "" }: {
  label: string;
  help: string;
  value: number;
  onChange: (value: number) => void;
  error?: string;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground">₱</span>
        <Input id={id} inputMode="decimal" className="pl-9 tabular-nums" value={formatMoneyInput(value)} aria-invalid={Boolean(error)} aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`} onChange={(event) => onChange(parseMoneyInput(event.target.value))} />
      </div>
      <p id={`${id}-help`} className="text-xs leading-5 text-muted-foreground">{help}</p>
      {error && <p id={`${id}-error`} className="text-sm text-destructive" aria-live="polite">{error}</p>}
    </div>
  );
}
