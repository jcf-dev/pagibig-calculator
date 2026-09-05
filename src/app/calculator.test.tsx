// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { PagibigCalculator } from "./calculator";
import { freshState, STORAGE_KEY } from "@/lib/calculator-state";

vi.mock("recharts", () => ({
  Area: () => null,
  AreaChart: () => null,
  CartesianGrid: () => null,
  Line: () => null,
  LineChart: () => null,
  ResponsiveContainer: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const click = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
const change = (name: string, value: string) =>
  fireEvent.change(screen.getByLabelText(name), { target: { value } });
async function start() {
  render(<PagibigCalculator />);
  await screen.findByRole("heading", { name: "Your goal" });
}
async function loadExample() {
  await start();
  click("Try an example");
}

describe("guided calculator", () => {
  it("requires valid inputs and does not show results before review", async () => {
    await start();
    click("Start my estimate");
    click("Next");
    expect(
      screen
        .getByRole("textbox", { name: "Amount to borrow" })
        .getAttribute("aria-invalid"),
    ).toBe("true");
    expect(screen.queryByText("Regular monthly loan payment")).toBeNull();
    change("Amount to borrow", "1000000");
    click("Next");
    change("Annual interest rate", "6");
    click("Next");
    expect(
      screen.getByLabelText("Extra each month").getAttribute("value"),
    ).toBe("0");
    click("Next");
    expect(
      screen.getByRole("heading", { name: "Check your inputs" }),
    ).toBeTruthy();
    expect(screen.queryByText("Regular monthly loan payment")).toBeNull();
    click("Show my estimate");
    expect(screen.getByRole("heading", { name: "Your estimate" })).toBeTruthy();
    expect(screen.getAllByText("₱5,995.51").length).toBeGreaterThan(0);
  });

  it("shows a left peso mark and grouped digits in money fields", async () => {
    await start();
    click("Start my estimate");
    change("Amount to borrow", "1234567.89");
    const amount = screen.getByLabelText("Amount to borrow");
    expect(amount.getAttribute("value")).toBe("1,234,567.89");
    expect(amount.parentElement?.textContent).toContain("₱");
  });

  it("keeps example labels through review and result, including a review edit", async () => {
    await loadExample();
    click("Next");
    click("Next");
    click("Next");
    click("Edit Loan details");
    change("Amount to borrow", "2000000");
    click("Next");
    click("Next");
    click("Next");
    click("Show my estimate");
    expect(screen.getAllByText(/Example estimate/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Your estimate" })).toBeTruthy();
  });

  it("solves a loan amount from a monthly budget", async () => {
    await start();
    click("Start my estimate");
    click("My monthly budget");
    change("Monthly loan budget", "15000");
    click("Next");
    change("Annual interest rate", "6");
    click("Next");
    click("Next");
    click("Show my estimate");
    expect(
      screen.getByRole("heading", { name: "Estimated loan amount" }),
    ).toBeTruthy();
  });

  it("shares values across modes and preserves active advanced settings", async () => {
    const state = freshState();
    state.financing = {
      ...state.financing,
      principal: 1500000,
      customRate: 6,
      ratePeriods: [{ id: "r", startMonth: 61, annualRate: 8 }],
    };
    state.guide.step = 1;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render(<PagibigCalculator />);
    await screen.findByLabelText("Amount to borrow");
    expect(screen.getByText("Active settings from Advanced")).toBeTruthy();
    change("Amount to borrow", "1700000");
    click("Advanced");
    expect(screen.getByLabelText("Loan amount").getAttribute("value")).toBe(
      "1,700,000",
    );
    click("Simple · step by step");
    expect(
      screen.getByLabelText("Amount to borrow").getAttribute("value"),
    ).toBe("1,700,000");
    expect(screen.getByText("Rate: 8% from month 61 onward.")).toBeTruthy();
  });

  it("guides refinancing with cash fees and all extra payment patterns", async () => {
    await start();
    click("Compare refinancing");
    click("Try an example");
    click("Next");
    click("Next");
    click("Next");
    click("Pay now");
    click("Next");
    change("Extra each year", "12000");
    change("One-time extra", "30000");
    change("Month of the one-time payment", "12");
    click("Reduce later payments");
    click("Next");
    expect(screen.getByText("Fees: paid now.")).toBeTruthy();
    click("Show my estimate");
    expect(
      screen.getByRole("heading", { name: "Your comparison" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("table", {
        name: "Loan comparison, including all entered costs",
      }),
    ).toBeTruthy();
  });

  it("shows a calculation error without crashing for a payment below interest", async () => {
    const state = freshState();
    state.financing = {
      ...state.financing,
      principal: 1000000,
      customRate: 12,
      targetPayment: 100,
      solveTarget: "term",
    };
    state.guide.step = 4;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render(<PagibigCalculator />);
    await screen.findByRole("heading", { name: "Check your inputs" });
    click("Show my estimate");
    expect(screen.getByRole("alert").textContent).toContain("too low");
  });

  it("continues to work when storage writes fail", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("full");
    });
    await start();
    await waitFor(() =>
      expect(screen.getByText(/cannot save your inputs/)).toBeTruthy(),
    );
    click("Start my estimate");
    expect(screen.getByLabelText("Amount to borrow")).toBeTruthy();
  });

  it("opens the graph and full schedule in dialogs", async () => {
    await loadExample();
    click("Next");
    click("Next");
    click("Next");
    click("Show my estimate");
    fireEvent.click(
      screen.getByText("Charts, payment schedule, and export"),
    );
    expect(screen.getByText(/Preview only/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "View full schedule" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Show all" })).toBeNull();

    click("Expand graph");
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Loan balance and interest graph",
      }),
    ).toBeTruthy();
    click("Close expanded view");

    click("View full schedule");
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Amortization schedule" }),
    ).toBeTruthy();
    expect(screen.getByText("Showing all months.")).toBeTruthy();
  });

  it.each(["term", "rate"] as const)("does not label a saved %s output as an assumption", async (solveTarget) => {
    const state = freshState();
    state.financing = {
      ...state.financing,
      principal: 1000000,
      customRate: 6,
      termYears: 30,
      targetPayment: 10000,
      solveTarget,
    };
    state.guide.step = 4;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    render(<PagibigCalculator />);
    await screen.findByRole("heading", { name: "Check your inputs" });
    const note = solveTarget === "term"
      ? /The term is calculated from your target payment/
      : /The base rate is calculated from your target payment/;
    expect(screen.getByText(note)).toBeTruthy();
    expect(screen.queryByText(solveTarget === "term" ? /Planned term: 30/ : /The entered base rate is 6%/)).toBeNull();
    click("Show my estimate");
    expect(screen.getByText(note)).toBeTruthy();
    expect(screen.getByText(/This schedule uses the rates you entered/)).toBeTruthy();
  });
});
