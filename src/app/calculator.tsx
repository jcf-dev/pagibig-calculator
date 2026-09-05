"use client";

import { useEffect, useId, useMemo, useState, type SetStateAction } from "react";
import {
  Calculator,
  Download,
  Info,
  PiggyBank,
  Printer,
  RefreshCcw,
  RotateCcw,
  Settings2,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  calculateAnnualSummary,
  calculateAmortization,
  compareRefinance,
  rowsToCsv,
  type CostRule,
  type ExtraPaymentRule,
  type InterestOnlyPeriod,
  type InterestRatePeriod,
  type RateOption,
  type SolveTarget,
} from "@/lib/mortgage";
import {
  DEFAULT_LOAN_CEILING,
  DEFAULT_RATE_OPTIONS,
  RATE_ASSUMPTIONS_EFFECTIVE_DATE,
  RATE_ASSUMPTIONS_REVIEWED_DATE,
  RATE_SOURCES,
} from "@/lib/rates";
import { formatNumber, formatPeso } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { defaultFinancing, defaultRefinance, defaultGuide, readStoredState, STORAGE_KEY, resolveRate, buildExtraRules, validateScenario, stepsFor, type FinancingState, type RefinanceState, type StoredState, type GuideState } from "@/lib/calculator-state";
import { SimpleCalculator, EstimateNotes } from "@/components/calculator/simple-calculator";
import { activeSamples } from "@/lib/calculator-state";

export function PagibigCalculator() {
  const [rates, setRates] = useState(DEFAULT_RATE_OPTIONS);
  const [loanCeiling, setLoanCeiling] = useState(DEFAULT_LOAN_CEILING);
  const [financing, storeFinancing] = useState(defaultFinancing);
  const [refinance, storeRefinance] = useState(defaultRefinance);
  const [guide, setGuide] = useState<GuideState>(defaultGuide);
  const [storageNotice, setStorageNotice] = useState("");
  const [hydrated, setHydrated] = useState(false);

  function invalidate(next: FinancingState | RefinanceState, previous: FinancingState | RefinanceState, task: "financing" | "refinance") {
    const changed = Object.keys(next).filter((key) => key !== "scheduleView" && !Object.is(next[key as keyof typeof next], previous[key as keyof typeof previous]));
    if (changed.length) setGuide((g) => ({ ...g,
      step: Math.min(g.step, stepsFor(g.task).length - 2),
      samples: g.samples.filter((key) => !changed.some((field) => key === `${task}.${field}`)),
    }));
  }
  function setFinancing(action: SetStateAction<FinancingState>) {
    const next = typeof action === "function" ? action(financing) : action;
    invalidate(next, financing, "financing");
    storeFinancing(next);
  }
  function setRefinance(action: SetStateAction<RefinanceState>) {
    const next = typeof action === "function" ? action(refinance) : action;
    invalidate(next, refinance, "refinance");
    storeRefinance(next);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      let stored: StoredState;
      try {
        stored = readStoredState(window.localStorage);
      } catch {
        stored = { rates: DEFAULT_RATE_OPTIONS, loanCeiling: DEFAULT_LOAN_CEILING, financing: defaultFinancing, refinance: defaultRefinance, guide: defaultGuide };
        setStorageNotice("This browser cannot save your inputs. You can still use the calculator.");
      }
      setRates(stored.rates);
      setLoanCeiling(stored.loanCeiling);
      storeFinancing(stored.financing);
      storeRefinance(stored.refinance);
      setGuide(stored.guide);
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const state: StoredState = { rates, loanCeiling, financing, refinance, guide };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      const timer = window.setTimeout(() => setStorageNotice("This browser cannot save your inputs. Keep this page open while you work."), 0);
      return () => window.clearTimeout(timer);
    }
  }, [financing, hydrated, loanCeiling, refinance, rates, guide]);

  useEffect(() => {
    let opened: HTMLDetailsElement[] = [];
    const before = () => {
      opened = Array.from(document.querySelectorAll<HTMLDetailsElement>("main details:not([open])"));
      opened.forEach((element) => { element.open = true; });
    };
    const after = () => { opened.forEach((element) => { element.open = false; }); opened = []; };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => { window.removeEventListener("beforeprint", before); window.removeEventListener("afterprint", after); };
  }, []);

  const financingRate = resolveRate(rates, financing.selectedRateId, financing.customRate, financing.useCustomRate);
  const refinanceRate = resolveRate(rates, refinance.selectedRateId, refinance.customRate, refinance.useCustomRate);

  const financingRules = useMemo(() => buildFinancingRules(financing), [financing]);
  const refinanceRules = useMemo(() => buildExtraRules(refinance), [refinance]);

  const financingResult = useMemo(() => {
    try {
      const errors = validateScenario("financing", financing, defaultRefinance, rates, loanCeiling);
      if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
      return {
        error: "",
        data: calculateAmortization({
          principal: financing.principal,
          annualRate: financingRate,
          termMonths: financing.termYears * 12,
          startDate: financing.startDate,
          extraPayments: financingRules,
          extraPaymentMode: financing.extraPaymentMode,
          ratePeriods: financing.ratePeriods,
          interestOnlyPeriods: financing.interestOnlyPeriods,
          costs: financing.costs,
          solveTarget: financing.solveTarget,
          targetPayment: financing.targetPayment,
        }),
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to calculate.", data: null };
    }
  }, [financing, financingRate, financingRules, rates, loanCeiling]);

  const baseFinancingResult = useMemo(
    () => {
      try { return calculateAmortization({
        principal: financing.principal,
        annualRate: financingRate,
        termMonths: financing.termYears * 12,
        startDate: financing.startDate,
        extraPayments: [],
        extraPaymentMode: "reduce-term",
        ratePeriods: financing.ratePeriods,
        interestOnlyPeriods: financing.interestOnlyPeriods,
        costs: financing.costs,
        solveTarget: financing.solveTarget,
        targetPayment: financing.targetPayment,
      }); } catch { return null; }
    },
    [financing, financingRate],
  );

  const refinanceComparison = useMemo(() => {
    try {
      const errors = validateScenario("refinance", defaultFinancing, refinance, rates, loanCeiling);
      if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
      return {
        error: "",
        data: compareRefinance({
          currentBalance: refinance.currentBalance,
          currentMonthlyDue: refinance.currentMonthlyDue,
          currentAnnualRate: refinance.currentAnnualRate,
          remainingMonths: refinance.remainingYears * 12,
          newAnnualRate: refinanceRate,
          newTermMonths: refinance.newTermYears * 12,
          refinanceCosts: refinance.refinanceCosts,
          feeTreatment: refinance.feeTreatment,
          startDate: refinance.startDate,
          extraPayments: refinanceRules,
          extraPaymentMode: refinance.extraPaymentMode,
          newRatePeriods: refinance.newRatePeriods,
          newInterestOnlyPeriods: refinance.newInterestOnlyPeriods,
          newCosts: refinance.newCosts,
        }),
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Unable to compare refinance.", data: null };
    }
  }, [refinance, refinanceRate, refinanceRules, rates, loanCeiling]);

  const refinanceBaseline = useMemo(() => {
    try {
      return calculateAmortization({
        principal: refinance.currentBalance + (refinance.feeTreatment === "financed" ? refinance.refinanceCosts : 0),
        annualRate: refinanceRate, termMonths: refinance.newTermYears * 12, startDate: refinance.startDate,
        extraPayments: [], extraPaymentMode: "reduce-term", ratePeriods: refinance.newRatePeriods,
        interestOnlyPeriods: refinance.newInterestOnlyPeriods, costs: refinance.newCosts,
      });
    } catch { return null; }
  }, [refinance, refinanceRate]);

  function resetAll() {
    if (!window.confirm("Clear both loan estimates and start again?")) return;
    setRates(DEFAULT_RATE_OPTIONS);
    setLoanCeiling(DEFAULT_LOAN_CEILING);
    storeFinancing(defaultFinancing);
    storeRefinance(defaultRefinance);
    setGuide(defaultGuide);
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* The in-memory reset still works. */ }
  }

  return (
    <TooltipProvider>
      <main className="min-h-screen bg-background">
        <section className="border-b bg-muted/30">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-normal text-foreground sm:text-4xl">
                  Pag-IBIG Housing Loan Calculator
                </h1>
                <div className="h-[2px] w-32 bg-gradient-to-r from-brand-rose to-brand-blue" />
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  Understand your payments. Explore extra payments. Compare a new loan with the one you have.
                </p>
                <p className="max-w-4xl text-xs italic leading-5 text-muted-foreground">
                  Estimates only. This is not financial advice, loan approval, or an official Pag-IBIG computation.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="calculator-controls mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border p-1" role="group" aria-label="Calculator mode">
              {(["simple", "advanced"] as const).map((mode) => <Button key={mode} variant={guide.mode === mode ? "default" : "ghost"} aria-pressed={guide.mode === mode} onClick={() => setGuide((g) => ({ ...g, mode, step: Math.min(g.step, stepsFor(g.task).length - 2) }))}>{mode === "simple" ? "Simple · step by step" : "Advanced"}</Button>)}
            </div>
            <p className="text-xs text-muted-foreground">Your inputs stay with you when you switch.</p>
          </div>
          {storageNotice && <p role="status" className="mb-4 rounded-lg border p-3 text-sm">{storageNotice}</p>}
          {!hydrated ? <p role="status" className="py-12 text-center text-muted-foreground">Getting your calculator ready…</p> : guide.mode === "simple" ? (
            <SimpleCalculator financing={financing} refinance={refinance} setFinancing={setFinancing} setRefinance={setRefinance} guide={guide} setGuide={setGuide} rates={rates} loanCeiling={loanCeiling} financingResult={financingResult} baseline={guide.task === "financing" ? baseFinancingResult : refinanceBaseline} refinanceComparison={refinanceComparison}
              details={guide.task === "financing" ? <ResultPanel result={financingResult} baseline={baseFinancingResult} title="Payment schedule" onExport={() => exportCsv("pagibig-financing.csv", financingResult.data?.rows ?? [], reportNotes("financing"))} canRenderChart={hydrated} scheduleView={financing.scheduleView} onScheduleViewChange={(scheduleView) => setFinancing((s) => ({ ...s, scheduleView }))} /> : <RefinancePanel comparison={refinanceComparison} onExport={() => exportCsv("pagibig-refinance.csv", refinanceComparison.data?.refinance.rows ?? [], reportNotes("refinance"))} canRenderChart={hydrated} scheduleView={refinance.scheduleView} onScheduleViewChange={(scheduleView) => setRefinance((s) => ({ ...s, scheduleView }))} />}
            />
          ) : <Tabs defaultValue={guide.task} onValueChange={(value) => { if (value !== "rates") setGuide((g) => ({ ...g, task: value as "financing" | "refinance", step: value === g.task ? g.step : 0 })); }} className="w-full">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <TabsList className="grid h-auto w-full grid-cols-3 p-1 sm:w-[620px]">
                <TabsTrigger value="financing" className="min-w-0 gap-1 px-1.5 text-xs sm:gap-2 sm:px-3 sm:text-sm">
                  <Calculator className="size-3.5 shrink-0 sm:size-4" />
                  <span className="truncate">Financing</span>
                </TabsTrigger>
                <TabsTrigger value="refinance" className="min-w-0 gap-1 px-1.5 text-xs sm:gap-2 sm:px-3 sm:text-sm">
                  <RefreshCcw className="size-3.5 shrink-0 sm:size-4" />
                  <span className="truncate">Refinancing</span>
                </TabsTrigger>
                <TabsTrigger value="rates" className="min-w-0 gap-1 px-1.5 text-xs sm:gap-2 sm:px-3 sm:text-sm">
                  <Settings2 className="size-3.5 shrink-0 sm:size-4" />
                  <span className="truncate">Rates</span>
                </TabsTrigger>
              </TabsList>
              <Button variant="outline" onClick={resetAll} className="w-full sm:w-fit">
                <RotateCcw />
                Clear all inputs
              </Button>
            </div>

            <TabsContent value="financing">
              <EstimateNotes task="financing" financing={financing} refinance={refinance} rates={rates} samples={guide.samples} />
              <div className="grid gap-4 lg:grid-cols-[390px_minmax(0,1fr)]">
                <Card>
                  <CardHeader>
                    <CardTitle>Financing inputs</CardTitle>
                    <CardDescription>Monthly amortization with optional direct principal payments.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <InputGrid>
                      <MoneyField label="Loan amount" description="Principal borrowed from Pag-IBIG. The default ceiling can be edited in Rates." value={financing.principal} max={loanCeiling} onChange={(principal) => setFinancing((s) => ({ ...s, principal }))} />
                      <NumberField label="Term years" description="Total repayment term used to compute the scheduled monthly amortization." value={financing.termYears} min={1} max={30} onChange={(termYears) => setFinancing((s) => ({ ...s, termYears }))} />
                      <DateField label="Start date" description="First payment month shown in the amortization schedule." value={financing.startDate} onChange={(startDate) => setFinancing((s) => ({ ...s, startDate }))} />
                      <RatePicker description="Annual interest rate used for the financing estimate. Pick a seeded fixing period or enter a custom rate." rates={rates} selectedRateId={financing.selectedRateId} customRate={financing.customRate} useCustomRate={financing.useCustomRate} onChange={(patch) => setFinancing((s) => ({ ...s, ...patch }))} />
                      <SolvePicker solveTarget={financing.solveTarget} targetPayment={financing.targetPayment} onChange={(patch) => setFinancing((s) => ({ ...s, ...patch }))} />
                    </InputGrid>

                    <Accordion type="single" collapsible defaultValue="advanced">
                      <AccordionItem value="advanced" className="border-t">
                        <AccordionTrigger>Advanced principal payments</AccordionTrigger>
                        <AccordionContent className="space-y-4 pb-1">
                          <div className="flex items-center justify-between rounded-md border p-3">
                            <div>
                              <p className="text-sm font-medium">Reduce monthly due after extras</p>
                              <p className="text-xs text-muted-foreground">Off means extras shorten the term.</p>
                            </div>
                            <Switch aria-label="Reduce monthly due after extras" checked={financing.extraPaymentMode === "reduce-payment"} onCheckedChange={(checked) => setFinancing((s) => ({ ...s, extraPaymentMode: checked ? "reduce-payment" : "reduce-term" }))} />
                          </div>
                          <InputGrid>
                            <MoneyField label="Monthly extra" description="Additional principal paid every month from month 1 onward." value={financing.monthlyExtra} onChange={(monthlyExtra) => setFinancing((s) => ({ ...s, monthlyExtra }))} />
                            <MoneyField label="Annual extra" description="Additional principal paid once every 12 months, starting on month 12." value={financing.annualExtra} onChange={(annualExtra) => setFinancing((s) => ({ ...s, annualExtra }))} />
                            <NumberField label="One-time month" description="Schedule month when the one-time principal payment is applied." value={financing.oneTimeMonth} min={1} onChange={(oneTimeMonth) => setFinancing((s) => ({ ...s, oneTimeMonth }))} />
                            <MoneyField label="One-time amount" description="Single direct-to-principal payment applied on the selected month." value={financing.oneTimeExtra} onChange={(oneTimeExtra) => setFinancing((s) => ({ ...s, oneTimeExtra }))} />
                            <NumberField label="Range start month" description="First month of a temporary recurring extra-principal payment." value={financing.rangeStartMonth} min={1} onChange={(rangeStartMonth) => setFinancing((s) => ({ ...s, rangeStartMonth }))} />
                            <NumberField label="Range end month" description="Last month of the temporary recurring extra-principal payment." value={financing.rangeEndMonth} min={1} onChange={(rangeEndMonth) => setFinancing((s) => ({ ...s, rangeEndMonth }))} />
                            <MoneyField label="Range monthly extra" description="Monthly extra principal applied only within the selected start and end months." value={financing.rangeExtra} onChange={(rangeExtra) => setFinancing((s) => ({ ...s, rangeExtra }))} />
                          </InputGrid>
                        </AccordionContent>
                      </AccordionItem>
                      <AccordionItem value="rate-periods" className="border-t">
                        <AccordionTrigger>Future rates, costs, and interest-only months</AccordionTrigger>
                        <AccordionContent className="space-y-4 pb-1">
                          <RatePeriodsEditor value={financing.ratePeriods} onChange={(ratePeriods) => setFinancing((s) => ({ ...s, ratePeriods }))} />
                          <InterestOnlyEditor value={financing.interestOnlyPeriods} onChange={(interestOnlyPeriods) => setFinancing((s) => ({ ...s, interestOnlyPeriods }))} />
                          <CostsEditor value={financing.costs} onChange={(costs) => setFinancing((s) => ({ ...s, costs }))} />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>

                <ResultPanel
                  result={financingResult}
                  baseline={baseFinancingResult}
                  title="Financing estimate"
                  onExport={() => exportCsv("pagibig-financing.csv", financingResult.data?.rows ?? [], reportNotes("financing"))}
                  canRenderChart={hydrated}
                  scheduleView={financing.scheduleView}
                  onScheduleViewChange={(scheduleView) => setFinancing((s) => ({ ...s, scheduleView }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="refinance">
              <EstimateNotes task="refinance" financing={financing} refinance={refinance} rates={rates} samples={guide.samples} />
              <div className="grid gap-4 lg:grid-cols-[390px_minmax(0,1fr)]">
                <Card>
                  <CardHeader>
                    <CardTitle>Refinance inputs</CardTitle>
                    <CardDescription>Compare current loan against a new Pag-IBIG scenario.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <RefinanceInputGrid>
                      <MoneyField label="Current balance" description="Remaining principal or payoff amount to be refinanced." value={refinance.currentBalance} onChange={(currentBalance) => setRefinance((s) => ({ ...s, currentBalance }))} />
                      <MoneyField label="Current monthly due" description="Your current required monthly payment. Used to project the existing loan." value={refinance.currentMonthlyDue} onChange={(currentMonthlyDue) => setRefinance((s) => ({ ...s, currentMonthlyDue }))} />
                      <NumberField label="Current rate %" description="Annual interest rate of the current loan." value={refinance.currentAnnualRate} step={0.001} onChange={(currentAnnualRate) => setRefinance((s) => ({ ...s, currentAnnualRate }))} />
                      <NumberField label="Remaining years" description="Estimated years left on the current loan." value={refinance.remainingYears} min={1} max={30} onChange={(remainingYears) => setRefinance((s) => ({ ...s, remainingYears }))} />
                      <NumberField label="New term years" description="Term for the new refinance scenario." value={refinance.newTermYears} min={1} max={30} onChange={(newTermYears) => setRefinance((s) => ({ ...s, newTermYears }))} />
                      <MoneyField label="Refinance costs" description="Fees, taxes, penalties, and other closing costs. Choose how to pay them below." value={refinance.refinanceCosts} onChange={(refinanceCosts) => setRefinance((s) => ({ ...s, refinanceCosts }))} />
                      <label className="space-y-2 text-sm">How to pay fees<select className="h-11 w-full rounded-md border bg-background px-3" value={refinance.feeTreatment} onChange={(e) => setRefinance((s) => ({ ...s, feeTreatment: e.target.value as RefinanceState["feeTreatment"] }))}><option value="financed">Add to the new loan</option><option value="upfront">Pay now</option></select></label>
                      <DateField label="Start date" description="First month used for both current and refinance schedules." value={refinance.startDate} onChange={(startDate) => setRefinance((s) => ({ ...s, startDate }))} />
                      <RatePicker description="Annual interest rate used for the new Pag-IBIG refinance estimate." rates={rates} selectedRateId={refinance.selectedRateId} customRate={refinance.customRate} useCustomRate={refinance.useCustomRate} onChange={(patch) => setRefinance((s) => ({ ...s, ...patch }))} />
                      <MoneyField label="New monthly extra" description="Additional principal paid monthly on the new refinance loan." value={refinance.monthlyExtra} onChange={(monthlyExtra) => setRefinance((s) => ({ ...s, monthlyExtra }))} />
                      <MoneyField label="New yearly extra" description="Extra principal every 12 months, starting in month 12." value={refinance.annualExtra} onChange={(annualExtra) => setRefinance((s) => ({ ...s, annualExtra }))} />
                      <MoneyField label="New one-time extra" description="Extra principal paid once on the chosen month." value={refinance.oneTimeExtra} onChange={(oneTimeExtra) => setRefinance((s) => ({ ...s, oneTimeExtra }))} />
                      <NumberField label="New one-time month" min={1} value={refinance.oneTimeMonth} onChange={(oneTimeMonth) => setRefinance((s) => ({ ...s, oneTimeMonth }))} />
                      <label className="space-y-2 text-sm">Effect of extra payments<select className="h-11 w-full rounded-md border bg-background px-3" value={refinance.extraPaymentMode} onChange={(e) => setRefinance((s) => ({ ...s, extraPaymentMode: e.target.value as RefinanceState["extraPaymentMode"] }))}><option value="reduce-term">Pay off sooner</option><option value="reduce-payment">Reduce later payments</option></select></label>
                    </RefinanceInputGrid>
                    <Accordion type="single" collapsible>
                      <AccordionItem value="new-loan-advanced" className="border-t">
                        <AccordionTrigger>New-loan future rates, costs, and interest-only months</AccordionTrigger>
                        <AccordionContent className="space-y-4 pb-1">
                          <RatePeriodsEditor value={refinance.newRatePeriods} onChange={(newRatePeriods) => setRefinance((s) => ({ ...s, newRatePeriods }))} />
                          <InterestOnlyEditor value={refinance.newInterestOnlyPeriods} onChange={(newInterestOnlyPeriods) => setRefinance((s) => ({ ...s, newInterestOnlyPeriods }))} />
                          <CostsEditor value={refinance.newCosts} onChange={(newCosts) => setRefinance((s) => ({ ...s, newCosts }))} />
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                </Card>

                <RefinancePanel
                  comparison={refinanceComparison}
                  onExport={() => exportCsv("pagibig-refinance.csv", refinanceComparison.data?.refinance.rows ?? [], reportNotes("refinance"))}
                  canRenderChart={hydrated}
                  scheduleView={refinance.scheduleView}
                  onScheduleViewChange={(scheduleView) => setRefinance((s) => ({ ...s, scheduleView }))}
                />
              </div>
            </TabsContent>

            <TabsContent value="rates">
              <Card>
                <CardHeader>
                  <CardTitle>Rates and assumptions</CardTitle>
                  <CardDescription>
                    Defaults are editable because official rates, promotional terms, and eligibility can change.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                    <MoneyField label="Loan ceiling" description="Maximum loan amount used to cap the financing loan amount field." value={loanCeiling} onChange={setLoanCeiling} />
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {rates.map((rate) => (
                        <Card key={rate.id} className="p-4">
                          <Label>{rate.label}</Label>
                          <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <NumberField label="Fixing years" description="How long this rate is assumed to stay fixed before repricing." value={rate.fixingYears} min={1} onChange={(fixingYears) => setRates((items) => items.map((item) => item.id === rate.id ? { ...item, fixingYears } : item))} />
                            <NumberField label="Rate %" description="Annual interest rate used when this option is selected." value={rate.annualRate} step={0.001} onChange={(annualRate) => setRates((items) => items.map((item) => item.id === rate.id ? { ...item, annualRate } : item))} />
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Reference links used for seed assumptions</p>
                    <p className="mb-3 mt-1">
                      Standard fixing-period defaults reflect the schedule effective {RATE_ASSUMPTIONS_EFFECTIVE_DATE} and were reviewed {RATE_ASSUMPTIONS_REVIEWED_DATE}. Current promotional rates are eligibility-dependent and are not applied automatically.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {RATE_SOURCES.map((source) => (
                        <a key={source.href} href={source.href} target="_blank" rel="noreferrer" className="rounded-md border bg-background px-3 py-1 hover:bg-accent">
                          {source.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>}
        </div>

      </main>
    </TooltipProvider>
  );

  function reportNotes(task: "financing" | "refinance") {
    const state = task === "financing" ? financing : refinance;
    const result = task === "financing" ? financingResult.data : refinanceComparison.data?.refinance;
    const inputs = task === "financing" ? {
      ...financing,
      principal: financing.solveTarget === "principal" ? undefined : financing.principal,
      termYears: financing.solveTarget === "term" ? undefined : financing.termYears,
      customRate: financing.solveTarget === "rate" || !financing.useCustomRate ? undefined : financing.customRate,
      selectedRateId: financing.solveTarget === "rate" || financing.useCustomRate ? undefined : financing.selectedRateId,
      targetPayment: financing.solveTarget === "payment" ? undefined : financing.targetPayment,
    } : state;
    return [activeSamples(guide.samples, task, financing, refinance).length ? "EXAMPLE: Contains sample values. Replace these before using this estimate." : "Estimate only. Not a loan approval or official computation.",
      "Only entered fees are included. Future rates may change. Extra payments assume direct payment to principal; confirm lender rules.",
      `Initial annual rate: ${result?.rows[0]?.annualRate ?? "unavailable"}%. First payment date: ${state.startDate}.`,
      `Inputs (calculated output fields omitted): ${JSON.stringify(inputs)}`,
      `Future rates: ${JSON.stringify(task === "financing" ? financing.ratePeriods : refinance.newRatePeriods)}`,
      `Costs: ${JSON.stringify(task === "financing" ? financing.costs : refinance.newCosts)}`,
      ...(task === "refinance" ? [`Refinance fees: ${refinance.refinanceCosts}. Treatment: ${refinance.feeTreatment}. Upfront fees are separate from monthly schedule rows. Total including upfront fees: ${refinanceComparison.data?.refinanceTotalOutflow ?? "unavailable"}.`] : [])];
  }
}


function buildFinancingRules(state: FinancingState): ExtraPaymentRule[] {
  const rules: ExtraPaymentRule[] = [];
  if (state.monthlyExtra > 0) rules.push({ type: "monthly", amount: state.monthlyExtra, startMonth: 1 });
  if (state.annualExtra > 0) rules.push({ type: "annual", amount: state.annualExtra, startMonth: 12 });
  if (state.oneTimeExtra > 0) rules.push({ type: "oneTime", amount: state.oneTimeExtra, month: state.oneTimeMonth });
  if (state.rangeExtra > 0) {
    rules.push({
      type: "monthly",
      amount: state.rangeExtra,
      startMonth: state.rangeStartMonth,
      endMonth: Math.max(state.rangeStartMonth, state.rangeEndMonth),
    });
  }
  return rules;
}


function InputGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function RefinanceInputGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2 [&>div>:first-child]:min-h-11 [&>div]:min-w-0">
      {children}
    </div>
  );
}

function NumberField({
  label,
  description,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
}: {
  label: string;
  description?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const id = useId();
  return (
    <div className="space-y-2">
      <FieldLabel label={label} description={description} htmlFor={id} />
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number.isFinite(value) ? value : ""}
        onChange={(event) => onChange(event.target.value === "" ? NaN : Number(event.target.value))}
      />
    </div>
  );
}

function MoneyField(props: Omit<Parameters<typeof NumberField>[0], "step">) {
  const { label, description, value, onChange, min = 0, max } = props;
  const id = useId();
  const invalid = Number.isFinite(value) && (value < min || (max !== undefined && value > max));

  return (
    <div className="space-y-2">
      <FieldLabel label={label} description={description} htmlFor={id} />
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        aria-invalid={invalid}
        value={formatMoneyInput(value)}
        onChange={(event) => {
          const nextValue = parseMoneyInput(event.target.value);
          onChange(nextValue);
        }}
      />
      {invalid && <p className="text-xs text-destructive">Enter an amount of at least {formatPeso(min)}{max !== undefined ? " and no more than " + formatPeso(max) : ""}.</p>}
    </div>
  );
}

function formatMoneyInput(value: number) {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: 2,
  }).format(value);
}

function parseMoneyInput(value: string) {
  const normalizedValue = value.replace(/[₱,\s]/g, "");
  return normalizedValue === "" ? NaN : Number(normalizedValue);
}

function DateField({ label, description, value, onChange }: { label: string; description?: string; value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className="space-y-2">
      <FieldLabel label={label} description={description} htmlFor={id} />
      <Input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function FieldLabel({ label, description, htmlFor }: { label: string; description?: string; htmlFor?: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {description ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`${label} help`}
            >
              <Info className="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>{description}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

function RatePicker({
  description,
  rates,
  selectedRateId,
  customRate,
  useCustomRate,
  onChange,
}: {
  description?: string;
  rates: RateOption[];
  selectedRateId: string;
  customRate: number;
  useCustomRate: boolean;
  onChange: (patch: { selectedRateId?: string; customRate?: number; useCustomRate?: boolean }) => void;
}) {
  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex items-center justify-between">
        <FieldLabel label="Interest rate" description={description} />
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          Custom
          <Switch aria-label="Use a custom interest rate" checked={useCustomRate} onCheckedChange={(useCustomRate) => onChange({ useCustomRate })} />
        </div>
      </div>
      {useCustomRate ? (
        <Input aria-label="Custom annual interest rate" type="number" step="0.001" value={Number.isFinite(customRate) ? customRate : ""} onChange={(event) => onChange({ customRate: event.target.value === "" ? NaN : Number(event.target.value) })} />
      ) : (
        <Select value={selectedRateId} onValueChange={(selectedRateId) => onChange({ selectedRateId })}>
          <SelectTrigger aria-label="Interest rate fixing period">
            <SelectValue placeholder="Select fixing period" />
          </SelectTrigger>
          <SelectContent>
            {rates.map((rate) => (
              <SelectItem key={rate.id} value={rate.id}>
                {rate.label} - {formatNumber(rate.annualRate)}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

function SolvePicker({
  solveTarget,
  targetPayment,
  onChange,
}: {
  solveTarget: SolveTarget;
  targetPayment: number;
  onChange: (patch: { solveTarget?: SolveTarget; targetPayment?: number }) => void;
}) {
  const showTargetPayment = solveTarget !== "payment";

  return (
    <div className="space-y-4 rounded-md border bg-muted/20 p-3 sm:col-span-2 sm:p-4">
      <div className="space-y-2">
        <FieldLabel
          label="Solve for"
          description="Choose which loan value the calculator should derive. Payment is the standard Pag-IBIG estimate."
        />
        <p className="text-xs leading-5 text-muted-foreground">
          Select the output you want the calculator to solve. If you choose loan amount, term, or rate, enter your target monthly payment.
        </p>
      </div>
      <div className="grid gap-3">
        <div className="space-y-2">
          <FieldLabel
            label="Target"
            description="Select what the calculator should return from your inputs."
          />
          <Select value={solveTarget} onValueChange={(value) => onChange({ solveTarget: value as SolveTarget })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="payment">Monthly payment</SelectItem>
              <SelectItem value="principal">Loan amount</SelectItem>
              <SelectItem value="term">Loan term</SelectItem>
              <SelectItem value="rate">Interest rate</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {showTargetPayment ? (
          <MoneyField
            label="Target monthly payment"
            description="Used to solve the selected loan value. Costs and extra payments are applied after the base loan is solved."
            value={targetPayment}
            onChange={(nextTargetPayment) => onChange({ targetPayment: nextTargetPayment })}
          />
        ) : null}
      </div>
    </div>
  );
}

function AdvancedEditorShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-md border p-3 sm:p-4">
      <div className="space-y-1">
        <FieldLabel label={title} description={description} />
        <p className="text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function RuleCard({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 rounded-md bg-muted/20 p-3 sm:p-4">{children}</div>;
}

function RuleFieldGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 15.5rem), 1fr))" }}
    >
      {children}
    </div>
  );
}

function RatePeriodsEditor({
  value,
  onChange,
}: {
  value: InterestRatePeriod[];
  onChange: (value: InterestRatePeriod[]) => void;
}) {
  const periods = value.slice(0, 5);
  return (
    <AdvancedEditorShell
      title="Future rate periods"
      description="Optional manual estimates for repricing after the initial fixing period. These override the base rate during the months you set."
    >
      {periods.map((period, index) => (
        <RuleCard key={period.id}>
          <RuleFieldGrid>
            <NumberField
              label="Start month"
              description="First month when this repriced interest rate starts."
              value={period.startMonth}
              min={1}
              onChange={(startMonth) => onChange(updateByIndex(periods, index, { ...period, startMonth }))}
            />
            <NumberField
              label="End month"
              description="Last month for this rate. Use 0 to keep it active until another period or the loan ends."
              value={period.endMonth ?? 0}
              min={0}
              onChange={(endMonth) => onChange(updateByIndex(periods, index, { ...period, endMonth: endMonth > 0 ? endMonth : undefined }))}
            />
            <NumberField
              label="Rate %"
              description="Annual interest rate to apply during this future period."
              value={period.annualRate}
              step={0.001}
              onChange={(annualRate) => onChange(updateByIndex(periods, index, { ...period, annualRate }))}
            />
          </RuleFieldGrid>
          <Button
            variant="ghost"
            className="w-full sm:w-fit sm:justify-self-end"
            onClick={() => onChange(periods.filter((_, itemIndex) => itemIndex !== index))}
          >
            Remove
          </Button>
        </RuleCard>
      ))}
      {periods.length < 5 ? (
        <Button
          variant="outline"
          className="w-full sm:w-fit"
          onClick={() =>
            onChange([
              ...periods,
              {
                id: crypto.randomUUID(),
                startMonth: periods.at(-1)?.endMonth ? (periods.at(-1)?.endMonth ?? 0) + 1 : 61,
                annualRate: 7,
              },
            ])
          }
        >
          Add rate period
        </Button>
      ) : null}
    </AdvancedEditorShell>
  );
}

function InterestOnlyEditor({
  value,
  onChange,
}: {
  value: InterestOnlyPeriod[];
  onChange: (value: InterestOnlyPeriod[]) => void;
}) {
  const periods = value.slice(0, 3);
  return (
    <AdvancedEditorShell
      title="Interest-only periods"
      description="Optional months that cover interest only. This model pauses all extra principal payments during these months."
    >
      {periods.map((period, index) => (
        <RuleCard key={period.id}>
          <RuleFieldGrid>
            <NumberField
              label="Start month"
              description="First month when the loan is treated as interest-only."
              value={period.startMonth}
              min={1}
              onChange={(startMonth) => onChange(updateByIndex(periods, index, { ...period, startMonth }))}
            />
            <NumberField
              label="End month"
              description="Last month of the interest-only period."
              value={period.endMonth}
              min={1}
              onChange={(endMonth) => onChange(updateByIndex(periods, index, { ...period, endMonth }))}
            />
          </RuleFieldGrid>
          <Button
            variant="ghost"
            className="w-full sm:w-fit sm:justify-self-end"
            onClick={() => onChange(periods.filter((_, itemIndex) => itemIndex !== index))}
          >
            Remove
          </Button>
        </RuleCard>
      ))}
      {periods.length < 3 ? (
        <Button
          variant="outline"
          className="w-full sm:w-fit"
          onClick={() => onChange([...periods, { id: crypto.randomUUID(), startMonth: 1, endMonth: 12 }])}
        >
          Add interest-only period
        </Button>
      ) : null}
    </AdvancedEditorShell>
  );
}

function CostsEditor({
  value,
  onChange,
}: {
  value: CostRule[];
  onChange: (value: CostRule[]) => void;
}) {
  const costs = value.slice(0, 6);
  return (
    <AdvancedEditorShell
      title="Costs and fees"
      description="Optional cash-flow items such as MRI, fire insurance, taxes, association dues, processing fees, or other charges."
    >
      {costs.map((cost, index) => (
        <RuleCard key={cost.id}>
          <RuleFieldGrid>
            <div className="space-y-2">
              <FieldLabel label="Label" description="Name shown in exports and summaries for this cost." />
              <Input value={cost.label} onChange={(event) => onChange(updateByIndex(costs, index, { ...cost, label: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <FieldLabel label="Type" description="Choose whether this fee repeats monthly, repeats yearly, or happens once." />
              <Select value={cost.type} onValueChange={(type) => onChange(updateCostType(costs, index, type as CostRule["type"]))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="oneTime">One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <MoneyField
              label="Amount"
              description="Peso amount added to cash outflow. This does not reduce principal."
              value={cost.amount}
              onChange={(amount) => onChange(updateByIndex(costs, index, { ...cost, amount } as CostRule))}
            />
            {cost.type === "oneTime" ? (
              <NumberField
                label="Month"
                description="Month when this one-time cost is paid."
                value={cost.month}
                min={1}
                onChange={(month) => onChange(updateByIndex(costs, index, { ...cost, month }))}
              />
            ) : (
              <>
                <NumberField
                  label="Start month"
                  description="First month when this recurring cost is included."
                  value={cost.startMonth}
                  min={1}
                  onChange={(startMonth) => onChange(updateByIndex(costs, index, { ...cost, startMonth } as CostRule))}
                />
                <NumberField
                  label="End month"
                  description="Last month when this recurring cost is included. Use 0 to continue until payoff."
                  value={cost.endMonth ?? 0}
                  min={0}
                  onChange={(endMonth) =>
                    onChange(updateByIndex(costs, index, { ...cost, endMonth: endMonth > 0 ? endMonth : undefined } as CostRule))
                  }
                />
              </>
            )}
          </RuleFieldGrid>
          <Button
            variant="ghost"
            className="w-full sm:w-fit sm:justify-self-end"
            onClick={() => onChange(costs.filter((_, itemIndex) => itemIndex !== index))}
          >
            Remove
          </Button>
        </RuleCard>
      ))}
      {costs.length < 6 ? (
        <Button
          variant="outline"
          className="w-full sm:w-fit"
          onClick={() => onChange([...costs, { id: crypto.randomUUID(), label: "Cost", type: "monthly", amount: 0, startMonth: 1 }])}
        >
          Add cost
        </Button>
      ) : null}
    </AdvancedEditorShell>
  );
}

function updateByIndex<T>(items: T[], index: number, nextItem: T) {
  return items.map((item, itemIndex) => (itemIndex === index ? nextItem : item));
}

function updateCostType(costs: CostRule[], index: number, type: CostRule["type"]) {
  const cost = costs[index];
  const base = {
    id: cost.id,
    label: cost.label,
    amount: cost.amount,
  };
  if (type === "oneTime") return updateByIndex(costs, index, { ...base, type, month: 1 });
  return updateByIndex(costs, index, { ...base, type, startMonth: 1 });
}

function ResultPanel({
  result,
  baseline,
  title,
  onExport,
  canRenderChart,
  scheduleView,
  onScheduleViewChange,
}: {
  result: ReturnType<typeof useMemo<{ error: string; data: ReturnType<typeof calculateAmortization> | null }>>;
  baseline: ReturnType<typeof calculateAmortization> | null;
  title: string;
  onExport: () => void;
  canRenderChart: boolean;
  scheduleView: "monthly" | "annual" | "payments";
  onScheduleViewChange: (view: "monthly" | "annual" | "payments") => void;
}) {
  if (result.error || !result.data) return <ErrorCard message={result.error} />;
  const data = result.data;
  const chartData = data.rows.filter((_, index) => index % 12 === 0 || index === data.rows.length - 1).map((row) => ({
    month: row.month,
    balance: Math.round(row.endingBalance),
    interest: Math.round(row.cumulativeInterest),
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Monthly due" value={formatPeso(data.monthlyPayment)} />
        <Metric label="Total interest" value={formatPeso(data.totalInterest)} />
        <Metric label="Costs" value={formatPeso(data.totalCosts)} />
        <Metric label="Total outflow" value={formatPeso(data.totalOutflow)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Payoff" value={`${data.payoffMonth} months`} detail={data.payoffDate} />
        <Metric label="Saved vs no extras" value={baseline ? formatPeso(baseline.totalOutflow - data.totalOutflow) : "Unavailable"} />
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Balance and cumulative interest over time.</CardDescription>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={() => window.print()} aria-label="Print report">
                  <Printer />
                </Button>
                <Button variant="outline" size="icon" onClick={onExport} aria-label="Export CSV">
                  <Download />
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>Print report or export amortization schedule</TooltipContent>
          </Tooltip>
        </CardHeader>
        <CardContent>
          <div className="h-60 sm:h-72">
            {canRenderChart ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} />
                  <YAxis tickFormatter={(value) => `₱${Number(value) / 1_000_000}M`} width={52} />
                  <ChartTooltip formatter={(value) => formatPeso(Number(value))} />
                  <Area type="monotone" dataKey="balance" stroke="var(--chart-5)" fill="var(--chart-5)" fillOpacity={0.18} name="Balance" />
                  <Area type="monotone" dataKey="interest" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.18} name="Interest" />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <ScheduleViewControls value={scheduleView} onChange={onScheduleViewChange} />
      <ScheduleTable rows={data.rows} view={scheduleView} />
    </div>
  );
}

function RefinancePanel({
  comparison,
  onExport,
  canRenderChart,
  scheduleView,
  onScheduleViewChange,
}: {
  comparison: { error: string; data: ReturnType<typeof compareRefinance> | null };
  onExport: () => void;
  canRenderChart: boolean;
  scheduleView: "monthly" | "annual" | "payments";
  onScheduleViewChange: (view: "monthly" | "annual" | "payments") => void;
}) {
  if (comparison.error || !comparison.data) return <ErrorCard message={comparison.error} />;
  const data = comparison.data;
  const chartData = Array.from({ length: Math.max(data.current.rows.length, data.refinance.rows.length) }, (_, index) => ({
    month: index + 1,
    current: Math.round(data.current.rows[index]?.cumulativeOutflow ?? data.current.totalOutflow),
    refinance: Math.round((data.refinance.rows[index]?.cumulativeOutflow ?? data.refinance.totalOutflow) + data.upfrontCosts),
  })).filter((_, index, all) => index % 12 === 0 || index === all.length - 1);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="size-5" />
                Compare the two loans
              </CardTitle>
              <CardDescription className="mt-2">The new loan has {data.totalSavings >= 0 ? "lower" : "higher"} total estimated costs by {formatPeso(Math.abs(data.totalSavings))}. Compare the full cost and payoff time, not just the monthly payment.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={() => window.print()} aria-label="Print report">
                <Printer />
              </Button>
              <Button variant="outline" size="icon" onClick={onExport} aria-label="Export CSV">
                <Download />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="New monthly due" value={formatPeso(data.refinance.monthlyPayment)} />
        <Metric label="Monthly savings" value={formatPeso(data.monthlySavings)} />
        <Metric label="Total savings" value={formatPeso(data.totalSavings)} />
        <Metric label="Cash-flow crossing" value={data.breakEvenMonth ? `Month ${data.breakEvenMonth}` : "No crossing"} detail="First month cumulative payments are no higher. This may reverse later; it is not guaranteed fee recovery." />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Current vs refinance cash outflow</CardTitle>
          <CardDescription>Cumulative payments include entered costs and any fees paid now. Financed fees are repaid with the new loan.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-60 sm:h-72">
            {canRenderChart ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} />
                  <YAxis tickFormatter={(value) => `₱${Number(value) / 1_000_000}M`} width={52} />
                  <ChartTooltip formatter={(value) => formatPeso(Number(value))} />
                  <Line type="monotone" dataKey="current" stroke="var(--chart-5)" name="Current" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="refinance" stroke="var(--chart-1)" name="Refinance" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <ScheduleViewControls value={scheduleView} onChange={onScheduleViewChange} />
      <ScheduleTable rows={data.refinance.rows} view={scheduleView} />
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
    </Card>
  );
}

function ScheduleViewControls({
  value,
  onChange,
}: {
  value: "monthly" | "annual" | "payments";
  onChange: (view: "monthly" | "annual" | "payments") => void;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-medium">Schedule view</p>
      <Tabs value={value} onValueChange={(view) => onChange(view as "monthly" | "annual" | "payments")}>
        <TabsList className="grid w-full grid-cols-3 sm:w-[360px]">
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="annual">Annual</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}

function ScheduleTable({
  rows,
  view,
}: {
  rows: ReturnType<typeof calculateAmortization>["rows"];
  view: "monthly" | "annual" | "payments";
}) {
  const chunkSize = 12;
  const [visibleMonthCount, setVisibleMonthCount] = useState(chunkSize);
  if (view === "annual") return <AnnualSummaryTable rows={rows} />;
  if (view === "payments") return <PaymentScheduleTable rows={rows} />;

  const boundedVisibleCount = Math.min(visibleMonthCount, rows.length);
  const isFullyVisible = boundedVisibleCount >= rows.length;
  const shouldAppendFinalRow =
    rows.length > boundedVisibleCount && rows.at(-1)?.month !== rows[boundedVisibleCount - 1]?.month;
  const previewRows = [
    ...rows.slice(0, boundedVisibleCount),
    ...(shouldAppendFinalRow ? [rows[rows.length - 1]] : []),
  ];
  const description = isFullyVisible
    ? "Showing all months."
    : boundedVisibleCount === chunkSize
      ? "Showing first 12 months and final payment."
      : `Showing first ${boundedVisibleCount} months and final payment.`;

  function showNextChunk() {
    setVisibleMonthCount((count) => Math.min(count + chunkSize, rows.length));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Amortization preview</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="mt-3 flex gap-2 rounded-md border bg-muted/20 p-3 text-xs leading-5 text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0 text-foreground/70" />
          <p>
            This schedule uses the rates you entered. Actual future rates and payments may differ.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 sm:hidden">
          {previewRows.map((row, index) => (
            <div key={`${row.month}-mobile-${index}`} className="rounded-md border bg-muted/20 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">
                    {index === previewRows.length - 1 && row.month !== index + 1 ? `Final (${row.month})` : `Month ${row.month}`}
                  </p>
                  <p className="text-xs text-muted-foreground">{row.date}</p>
                </div>
                <p className="text-sm font-semibold">{formatPeso(row.payment)}</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <MobileAmount label="Principal" value={row.principal} />
                <MobileAmount label="Interest" value={row.interest} />
                <MobileAmount label="Extra" value={row.extraPrincipal} />
                <MobileAmount label="Balance" value={row.endingBalance} />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden sm:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Month</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Payment</TableHead>
                <TableHead className="text-right">Principal</TableHead>
                <TableHead className="text-right">Interest</TableHead>
                <TableHead className="text-right">Extra</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((row, index) => (
                <TableRow key={`${row.month}-${index}`}>
                  <TableCell>{index === previewRows.length - 1 && row.month !== index + 1 ? `Final (${row.month})` : row.month}</TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell className="text-right">{formatPeso(row.payment)}</TableCell>
                  <TableCell className="text-right">{formatPeso(row.principal)}</TableCell>
                  <TableCell className="text-right">{formatPeso(row.interest)}</TableCell>
                  <TableCell className="text-right">{formatPeso(row.extraPrincipal)}</TableCell>
                  <TableCell className="text-right">{formatPeso(row.endingBalance)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {rows.length > chunkSize ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            {!isFullyVisible ? (
              <>
                <Button variant="outline" onClick={showNextChunk} className="w-full sm:w-fit">
                  Show next 12 months
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setVisibleMonthCount(rows.length)}
                  className="w-full sm:w-fit"
                >
                  Show all
                </Button>
              </>
            ) : null}
            {boundedVisibleCount > chunkSize ? (
              <Button
                variant="ghost"
                onClick={() => setVisibleMonthCount(chunkSize)}
                className="w-full sm:w-fit"
              >
                Collapse to first 12
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AnnualSummaryTable({ rows }: { rows: ReturnType<typeof calculateAmortization>["rows"] }) {
  const summaryRows = calculateAnnualSummary(rows);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Annual summary</CardTitle>
        <CardDescription>Totals grouped by calendar year.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Year</TableHead>
              <TableHead className="text-right">Payment</TableHead>
              <TableHead className="text-right">Principal</TableHead>
              <TableHead className="text-right">Interest</TableHead>
              <TableHead className="text-right">Costs</TableHead>
              <TableHead className="text-right">Outflow</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summaryRows.map((row) => (
              <TableRow key={row.year}>
                <TableCell>{row.year}</TableCell>
                <TableCell className="text-right">{formatPeso(row.payment)}</TableCell>
                <TableCell className="text-right">{formatPeso(row.principal)}</TableCell>
                <TableCell className="text-right">{formatPeso(row.interest)}</TableCell>
                <TableCell className="text-right">{formatPeso(row.costs)}</TableCell>
                <TableCell className="text-right">{formatPeso(row.totalOutflow)}</TableCell>
                <TableCell className="text-right">{formatPeso(row.endingBalance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function PaymentScheduleTable({ rows }: { rows: ReturnType<typeof calculateAmortization>["rows"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly payments</CardTitle>
        <CardDescription>Scheduled payment, extra principal, costs, and total outflow.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Rate</TableHead>
              <TableHead className="text-right">Scheduled</TableHead>
              <TableHead className="text-right">Extra</TableHead>
              <TableHead className="text-right">Costs</TableHead>
              <TableHead className="text-right">Outflow</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={`${row.month}-payment`}>
                <TableCell>{row.month}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell className="text-right">{formatNumber(row.annualRate)}%</TableCell>
                <TableCell className="text-right">{formatPeso(row.scheduledPayment)}</TableCell>
                <TableCell className="text-right">{formatPeso(row.extraPrincipal)}</TableCell>
                <TableCell className="text-right">{formatPeso(row.costs)}</TableCell>
                <TableCell className="text-right">{formatPeso(row.totalOutflow)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function MobileAmount({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{formatPeso(value)}</p>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-brand-rose/40 bg-brand-rose/10 text-foreground">
      <CardHeader>
        <CardTitle>Calculation needs attention</CardTitle>
        <CardDescription>{message}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function exportCsv(fileName: string, rows: ReturnType<typeof calculateAmortization>["rows"], notes: string[] = []) {
  if (rows.length === 0) return;
  const report = notes.map((note) => `"${note.replaceAll('"', '""')}"`).join("\n") + "\n\n" + rowsToCsv(rows);
  const blob = new Blob([report], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}
