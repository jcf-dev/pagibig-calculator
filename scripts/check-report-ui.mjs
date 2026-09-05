import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    await page.goto(process.env.CALCULATOR_TEST_URL ?? "http://127.0.0.1:3101/labs/pagibig-calculator");
    await page.getByRole("button", { name: "Try an example", exact: true }).click();
    for (const solveTarget of ["term", "rate"]) {
      await page.evaluate((solveTarget) => {
        const state = JSON.parse(localStorage.getItem("pagibig-calculator:v1"));
        Object.assign(state.financing, {
          principal: 1000000, customRate: 6, useCustomRate: true,
          termYears: 30, targetPayment: 10000, solveTarget,
          ratePeriods: [{ id: "future", startMonth: 13, annualRate: 8 }],
        });
        Object.assign(state.guide, { mode: "advanced", task: "financing", step: 4 });
        localStorage.setItem("pagibig-calculator:v1", JSON.stringify(state));
      }, solveTarget);
      await page.reload();
      const note = solveTarget === "term" ? "The term is calculated from your target payment." : "The base rate is calculated from your target payment.";
      await page.getByText(note, { exact: false }).waitFor();
      await page.getByRole("button", { name: "Simple · step by step", exact: true }).click();
      await page.getByRole("heading", { name: "Check your inputs", exact: true }).waitFor();
      assert.ok(await page.getByText(note, { exact: false }).isVisible());
      await page.getByRole("button", { name: "Show my estimate", exact: true }).click();
      await page.getByRole("heading", { name: "Your estimate", exact: true }).waitFor();
      await page.getByText("Charts, payment schedule, and export", { exact: true }).click();
      const downloaded = page.waitForEvent("download");
      await page.getByRole("button", { name: "Export CSV", exact: true }).click();
      const csv = await readFile(await (await downloaded).path(), "utf8");
      const initial = Number(csv.match(/Initial annual rate: ([\d.]+)/)[1]);
      const firstRow = csv.split("\n").find((line) => line.startsWith("1,"));
      assert.ok(firstRow, "CSV includes the first month");
      assert.ok(Math.abs(Number(firstRow.split(",")[8]) - initial) < 0.001);
      assert.equal(Number(csv.split("\n").find((line) => line.startsWith("13,")).split(",")[8]), 8);
      assert.ok(!csv.includes(solveTarget === "term" ? '""termYears"":30' : '""customRate"":6'));
      assert.ok(await page.getByText("This schedule uses the rates you entered. Actual future rates and payments may differ.", { exact: true }).isVisible());
      await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
      await page.emulateMedia({ media: "print" });
      assert.ok(await page.getByText(note, { exact: false }).isVisible());
      await page.emulateMedia({ media: "screen" });
      await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
      await page.screenshot({ path: `.impeccable/review/${width === 1440 ? "desktop" : "mobile"}-solve-${solveTarget}.png`, fullPage: true });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
    }
    await page.close();
  }
  console.log("Solved rate/term notes, future rates, CSV, and print pass on desktop and mobile.");
} finally {
  await browser.close();
}
