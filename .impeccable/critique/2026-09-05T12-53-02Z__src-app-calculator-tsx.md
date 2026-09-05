---
target: Pag-IBIG calculator width and button polish
total_score: 32
max_score: 40
na_heuristics: ""
p0_count: 0
p1_count: 3
timestamp: 2026-09-05T12-53-02Z
slug: src-app-calculator-tsx
---
Method: dual-agent (A: critique_design · B: critique_detector)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3/4 | Export has no success note. |
| 2 | Match System / Real World | 4/4 | Loan terms are clear. |
| 3 | User Control and Freedom | 4/4 | Back, Edit, and Start again work. |
| 4 | Consistency and Standards | 3/4 | Page sections use different widths. |
| 5 | Error Prevention | 3/4 | Some optional steps look required. |
| 6 | Recognition Rather Than Recall | 4/4 | Help stays near each field. |
| 7 | Flexibility and Efficiency | 2/4 | Simple mode has six or eight steps. |
| 8 | Aesthetic and Minimalist Design | 2/4 | Mixed widths and repeated notes add noise. |
| 9 | Error Recovery | 3/4 | Most errors explain the fix. |
| 10 | Help and Documentation | 4/4 | Local help and the official link are clear. |
| **Total** | | **32/40** | **Good** |

## Design Specificity Verdict

The content feels made for Pag-IBIG users. Peso values, loan terms, fee rules, warnings, and lender checks build trust. The visual style still feels like a common web form. Rounded cards, thin borders, progress bars, and gradient buttons could fit another finance tool with little change.

The deterministic scan found zero findings in `src/app/calculator.tsx`. No false positives were present. No browser overlay was available because no connected browser was found. Existing isolated Playwright checks passed on desktop and mobile with no sideways page scroll.

## Overall Impression

The wizard is safe, clear, and useful. Its strongest moment is the clear monthly result. The biggest visual problem is the broken horizontal alignment caused by nested width limits.

## What's Working

- Honest words avoid claims of approval or official results.
- Local field help and marked examples support first-time users.
- Review, Back, Edit, Start again, and saved values give good control.

## Priority Issues

### P1: Mixed desktop widths

The hero and mode controls use `max-w-7xl`. The wizard uses `max-w-5xl`. The wizard starts farther inward and looks separate from the mode control. Use one shared page shell. Keep the form reading rail controlled inside that shell. Suggested command: `$impeccable polish`.

### P1: Repeated result warnings

The result repeats trust notes and pushes useful actions down the page. Keep one short note near the main result and put full assumptions in one place. Suggested command: `$impeccable distill`.

### P1: Long Simple path

Six new-loan steps and eight refinance steps can feel slow. Optional extras also look required. A later pass can combine related refinance steps and add a clear no-extra choice. Suggested command: `$impeccable onboard`.

### P2: Loud gradient buttons

The primary, selected mode, outline hover, and ghost hover use gradients. They compete with the loan figures. Use solid semantic colors and plain hover fills. Suggested command: `$impeccable polish`.

### P2: Result actions are too low

Print, export, and schedule details appear after long notes. A later pass can move them close to the result summary. Suggested command: `$impeccable layout`.

## Persona Red Flags

**Jordan, first-time user:** Simple mode still has six or eight steps. Optional extras can look required. Progress bars do not name all stages.

**Sam, access user:** Labels and focus are strong. Long result sections make high-zoom movement slow. Some example and error notes can give stronger live context.

**Casey, mobile user:** Saved state helps after interruption. Result pages are long. Print, export, and schedule details need much scrolling.

## Minor Observations

- New loan and Financing name the same task in two ways.
- The small title accent line is less distracting than gradient buttons.
- The desktop footer repeats a theme control.

## Questions to Consider

- Can one shared desktop rail make the page feel like one tool?
- Is Simple still simple when refinancing takes eight stages?
- Which one result should a user remember after ten seconds?
