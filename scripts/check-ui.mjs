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
    { name: "user-1567", width: 1567, height: 908, colorScheme: "dark" },
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
    const layout = await page.evaluate(() => {
      const elements = [
        document.querySelector("h1"),
        document.querySelector('[aria-label="Calculator mode"]'),
        document.querySelector('nav[aria-label="Estimate progress"]'),
        document.querySelector("h2"),
      ];
      const leftEdges = elements.map((element) =>
        element.getBoundingClientRect().left,
      );
      return {
        leftEdges,
        shellWidth: document
          .querySelector("h1")
          .closest(".max-w-6xl")
          .getBoundingClientRect().width,
        gradientButtons: [...document.querySelectorAll("button")]
          .filter(
            (element) => getComputedStyle(element).backgroundImage !== "none",
          )
          .map((element) => element.textContent.trim()),
      };
    });
    assert.ok(
      Math.max(...layout.leftEdges) - Math.min(...layout.leftEdges) <= 1,
      "Title, mode, progress, and form must share one left edge",
    );
    assert.ok(layout.shellWidth <= 1152, "Desktop shell must stay within 72rem");
    assert.deepEqual(layout.gradientButtons, [], "Buttons must not use gradients");
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
    const amountInput = page.getByLabel("Amount to borrow", { exact: true });
    assert.equal(await amountInput.inputValue(), "3,500,000");
    assert.ok(
      (await amountInput.locator("..").textContent()).includes("₱"),
      "Money fields must show the peso mark on the left",
    );
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
    await button("Expand graph").click();
    await page
      .getByRole("dialog")
      .getByRole("heading", {
        name: "Loan balance and interest graph",
        exact: true,
      })
      .waitFor();
    await page.screenshot({
      path: path.join(output, size.name + "-graph-dialog.png"),
    });
    await button("Close expanded view").click();
    if (size.width < 640) {
      for (const [tabName, headingName] of [
        ["Annual", "Annual summary"],
        ["Payments", "Monthly payments"],
      ]) {
        await page.getByRole("tab", { name: tabName, exact: true }).click();
        const card = page
          .getByRole("heading", { name: headingName, exact: true })
          .locator("xpath=ancestor::div[contains(@class, 'rounded-lg')][1]");
        const mobileLayout = await card.evaluate((element) => ({
          hasMobileCards:
            element.querySelector("[data-mobile-schedule]")?.checkVisibility() ??
            false,
          wideVisibleAreas: [...element.querySelectorAll(".overflow-auto")]
            .filter((area) => area.checkVisibility())
            .filter((area) => area.scrollWidth > area.clientWidth + 1).length,
        }));
        assert.ok(
          mobileLayout.hasMobileCards,
          tabName + " must use cards on a phone",
        );
        assert.equal(
          mobileLayout.wideVisibleAreas,
          0,
          tabName + " must not need sideways drag on a phone",
        );
      }
      await page.getByRole("tab", { name: "Monthly", exact: true }).click();
    }
    await button("Expand schedule").click();
    await page
      .getByRole("dialog")
      .getByRole("heading", { name: "Amortization schedule", exact: true })
      .waitFor();
    assert.ok(
      await page
        .getByRole("dialog")
        .getByText("Showing all months.", { exact: true })
        .isVisible(),
    );
    await page.screenshot({
      path: path.join(output, size.name + "-schedule-dialog.png"),
    });
    await button("Close expanded view").click();
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
    if (size.width < 640) {
      assert.equal(
        await page
          .locator("details")
          .filter({ hasText: "Estimate assumptions" })
          .getAttribute("open"),
        null,
        "Mobile assumptions must start closed",
      );
    }
    await shot("advanced");
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
        ": money fields, report dialogs, mobile layout, core flows, and page width passed",
    );
  }
  assert.deepEqual(errors, [], "Browser errors");
} finally {
  await browser.close();
}
console.log("Screenshots: " + output);
