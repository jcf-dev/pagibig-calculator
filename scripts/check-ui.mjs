import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const baseURL =
  process.env.CALCULATOR_TEST_URL ??
  "http://127.0.0.1:3101/labs/pagibig-calculator";
const output = path.resolve(process.env.UI_REVIEW_DIR ?? ".impeccable/review");
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
try {
  for (const size of [
    { name: "desktop", width: 1440, height: 1000, colorScheme: "light" },
    { name: "mobile", width: 390, height: 844, colorScheme: "dark" },
  ]) {
    const context = await browser.newContext({
      viewport: size,
      colorScheme: size.colorScheme,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("dialog", (dialog) => dialog.accept());
    const button = (name) => page.getByRole("button", { name, exact: true });
    async function shot(name) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({
        path: path.join(output, size.name + "-" + name + ".png"),
        fullPage: true,
      });
      const dimensions = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      assert.ok(
        dimensions.scroll <= dimensions.width + 1,
        "Page must not scroll sideways: " + name,
      );
    }
    await page.goto(baseURL);
    await page
      .getByRole("heading", { name: "Your goal", exact: true })
      .waitFor();
    if (size.colorScheme === "light") {
      await page
        .getByRole("button", { name: "Toggle theme", exact: true })
        .first()
        .click();
      await page.locator("html.light").waitFor();
    }
    await shot("goal");
    await button("Start my estimate").click();
    await button("Next").click();
    assert.equal(
      await page
        .getByLabel("Amount to borrow", { exact: true })
        .getAttribute("aria-invalid"),
      "true",
    );
    await button("Back").click();
    await button("Try an example").click();
    await shot("loan");
    await button("Next").click();
    await button("Next").click();
    await page.getByLabel("Extra each month", { exact: true }).fill("5000");
    await page.getByLabel("Extra each year", { exact: true }).fill("12000");
    await page.getByLabel("One-time extra", { exact: true }).fill("30000");
    await page
      .getByLabel("Month of the one-time payment", { exact: true })
      .fill("12");
    await button("Next").click();
    await page
      .getByRole("heading", { name: "Check your inputs", exact: true })
      .waitFor();
    await shot("review");
    await button("Show my estimate").click();
    await page
      .getByRole("heading", { name: "Your estimate", exact: true })
      .waitFor();
    await shot("result");
    await page
      .getByText("Charts, payment schedule, and export", { exact: true })
      .click();
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV", exact: true }).click();
    const download = await downloadEvent;
    const file = await download.path();
    const csv = await readFile(file, "utf8");
    assert.ok(
      csv.includes("EXAMPLE") &&
        csv.includes("total_outflow") &&
        csv.includes("Initial annual rate"),
    );
    await page.getByRole("tab", { name: "Annual", exact: true }).click();
    await page
      .getByRole("heading", { name: "Your estimate", exact: true })
      .waitFor();
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    await page.emulateMedia({ media: "print" });
    assert.ok(
      await page
        .getByText("Example estimate · Contains sample values.", {
          exact: true,
        })
        .isVisible(),
    );
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await button("Advanced").click();
    await page.getByRole("tab", { name: "Rates", exact: true }).click();
    await page
      .getByRole("heading", { name: "Rates and assumptions", exact: true })
      .waitFor();
    await page.getByRole("tab", { name: "Financing", exact: true }).click();
    await button("Simple · step by step").click();
    await page
      .getByRole("heading", { name: "Check your inputs", exact: true })
      .waitFor();
    await page.reload();
    await page
      .getByRole("heading", { name: "Check your inputs", exact: true })
      .waitFor();
    await button("Start again").click();
    await button("Compare refinancing").click();
    await button("Try an example").click();
    for (let index = 0; index < 3; index += 1) await button("Next").click();
    await button("Pay now").click();
    await button("Next").click();
    await page.getByLabel("Extra each year", { exact: true }).fill("12000");
    await button("Next").click();
    await button("Show my estimate").click();
    await page
      .getByRole("heading", { name: "Your comparison", exact: true })
      .waitFor();
    await shot("refinance");
    await context.close();
    console.log(
      size.name +
        ": new loan, refinance, errors, modes, reload, CSV, print, and page width passed",
    );
  }
  assert.deepEqual(errors, [], "Browser errors");
} finally {
  await browser.close();
}
console.log("Screenshots: " + output);
