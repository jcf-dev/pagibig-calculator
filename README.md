# Pag-IBIG Housing Loan Calculator

A loan planning tool at `/labs/pagibig-calculator`.

## Use the calculator

Simple mode opens first. Choose a new loan or a refinance comparison. Enter your figures in small groups, check them, then show the estimate.

For a new loan, start with an amount to borrow or a monthly loan budget. The budget covers principal and interest, not insurance, fees, or extra payments.

For refinancing, use the unpaid principal and principal-and-interest payment from your latest statement. Enter the current rate, remaining term, and new offer. Add closing charges separately. Choose to pay fees now or add them to the new loan.

Both paths support monthly, yearly, and one-time extra payments. The model can shorten the term or reduce later payments. Confirm actual payment rules with your lender.

Use **Try an example** if you do not have your figures. Sample fields remain marked in the review, results, printout, and CSV export.

Advanced mode keeps the complete calculator, including future rates, costs, interest-only periods, custom payment ranges, and solving for a term or rate. Both modes share values. Simple mode shows active Advanced settings and links back to edit them.

Money fields show the peso mark on the left and group thousands with commas. Result graphs and payment schedules can open in a large view. Monthly, Annual, and Payments clearly mark their short page view as a preview. Use **View full schedule** to see every row. Phone previews use cards. Wider screens use a small key-column table with whole-peso values. The large view keeps all columns and cents.

## What an estimate means

- The rate stays constant unless a future rate rule is entered. A fixing period does not automatically predict or apply a future rate.
- Only entered costs are included. Insurance, taxes, and other charges are excluded unless added.
- A budget-based loan amount is not an eligibility or income check.
- Extra payments go directly to principal in the model. They pause during interest-only periods.
- Fees paid now count once in the full refinance cost, outside monthly schedule rows. Financed fees increase the new balance and accrue interest.
- Cash-flow crossing is the first month when cumulative payments on the new loan are no higher. That relationship can reverse. It is not guaranteed fee recovery.
- The current loan is projected using its entered payment and rate. Its model payoff date can differ from the remaining term on a statement.

Use your loan offer and statement as the source of your figures. Confirm terms with the lender. [Official Pag-IBIG housing loan help](https://www.pagibigfund.gov.ph/FAQ_HL.html) is linked in the guide. The official site may require a browser check. Existing rate assumptions remain under Advanced → Rates; no new official rate or eligibility claims were added.

## Local development

Use this app at `labs/pagibig-calculator` inside the `joween.dev` checkout.
The site and calculator share `packages/site-shell`. The calculator imports its
menu, footer, fonts, and theme. Run `pnpm update @joween/site-shell` after shared code changes.
The shell uses the site's `theme` setting. Calculator inputs keep their own key.

Compose supplies the shared package through the `site_shell` build context.
For a direct Docker build from this folder, use:

```sh
docker build --build-context site_shell=../../packages/site-shell .
```

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:3000/labs/pagibig-calculator`.

```sh
pnpm lint
pnpm test
pnpm build
```

For browser checks, run the built app on port 3101. These scripts use an isolated Chrome session and save screenshots under `.impeccable/review/`.

```sh
pnpm start --port 3101
```

In another terminal:

```sh
node scripts/check-ui.mjs
node scripts/check-report-ui.mjs
```

Set `CALCULATOR_TEST_URL` to check another local address. Chrome must be installed.

Input data, mode, progress, and sample labels use `pagibig-calculator:v1` in local browser storage. Old saved inputs remain supported. Missing fee treatment means financed fees. Reloading a completed guide returns to review. Storage failure leaves the calculator usable in memory.

The parent `joween.dev` repo owns deployment, routing, availability fallback, robots, and sitemap. Validate this app before pinning its commit in the parent. Follow the parent's `docs/labs.md` for release checks.
