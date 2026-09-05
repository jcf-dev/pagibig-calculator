---
version: 1
slug: "src-app-calculator-tsx"
primary_target: "src/app/calculator.tsx"
related_targets: ["src/components/calculator/simple-calculator.tsx", "/labs/pagibig-calculator"]
---

# Guided calculator

## Scope and mode

Operate: help people enter loan details and understand an estimate.
Keep the current calculator as Advanced. Make Simple the first view.

## Audience and task

People who need help with loan terms can use small groups of fields.
New loans can start from a loan amount or a monthly budget.
Refinancing compares the current loan with a new loan.

## Direction

Keep the existing light and dark themes and Lexend type.
Use solid blue main buttons and neutral secondary controls.
Keep rose-blue color in small brand details, not buttons.
Align the full page to one 72rem desktop shell.
Show the goal first, then fields, a review, and the result.
Use short help text beside each input. Keep all values when modes change.
Show active Advanced rules in Simple. Let people edit them in Advanced.

## Content and trust

Mark sample values in fields, review, results, print, and CSV.
State all cost and rate limits. Show fee treatment and extra-payment effects.
Explain refinance tradeoffs without choosing for the user.
Do not present a budget-based loan amount as an eligibility check.
Results are estimates, not official Pag-IBIG computations.

## Constraints

Review comes before results. Keep progress and inputs in namespaced storage.
Keep the permanent lab path and hard-load return link.
Support small screens, keyboard use, reduced motion, and print.
Use one calculation model for both modes. Reject invalid values safely.

## Open decisions

None for this release. Publishing is a separate step.
