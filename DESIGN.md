---
name: Pag-IBIG Housing Loan Calculator
description: A clear loan form with shared Simple and Advanced views.
colors:
  background: "oklch(1 0 0)"
  foreground: "oklch(0.145 0 0)"
  card: "oklch(1 0 0)"
  muted: "oklch(0.97 0 0)"
  muted-foreground: "oklch(0.556 0 0)"
  border: "oklch(0.922 0 0)"
  input: "oklch(0.922 0 0)"
  ring: "oklch(0.708 0 0)"
  destructive: "oklch(0.577 0.245 27.325)"
  dark-background: "oklch(0.145 0 0)"
  dark-foreground: "oklch(0.985 0 0)"
  dark-card: "oklch(0.205 0 0)"
  dark-muted: "oklch(0.269 0 0)"
  dark-muted-foreground: "oklch(0.708 0 0)"
  dark-border: "oklch(1 0 0 / 10%)"
  dark-input: "oklch(1 0 0 / 15%)"
  dark-ring: "oklch(0.556 0 0)"
  dark-destructive: "oklch(0.704 0.191 22.216)"
  brand-rose: "#ff2357"
  brand-blue: "#3080ff"
  action-blue: "oklch(48.8% 0.243 264.376)"
  action-blue-hover: "oklch(42.4% 0.199 265.638)"
  action-text: "#ffffff"
typography:
  headline:
    fontFamily: "Lexend, Arial, Helvetica, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: "2rem"
    letterSpacing: "normal"
  headline-wide:
    fontFamily: "Lexend, Arial, Helvetica, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: "2.5rem"
    letterSpacing: "normal"
  step-title-wide:
    fontFamily: "Lexend, Arial, Helvetica, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: "2.25rem"
  title:
    fontFamily: "Lexend, Arial, Helvetica, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: "1.5rem"
  body:
    fontFamily: "Lexend, Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.5rem"
  label:
    fontFamily: "Lexend, Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: "1.25rem"
  note:
    fontFamily: "Lexend, Arial, Helvetica, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1rem"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.625rem"
  xl: "0.875rem"
spacing:
  "1": "0.25rem"
  "2": "0.5rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
  "7": "1.75rem"
  "8": "2rem"
  "12": "3rem"
components:
  button-primary:
    backgroundColor: "{colors.action-blue}"
    textColor: "{colors.action-text}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "2.75rem"
    padding: "0.5rem 1rem"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "2.75rem"
    padding: "0.5rem 1rem"
  button-ghost:
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    height: "2.75rem"
    padding: "0.5rem 1rem"
  input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "2.5rem"
    padding: "0.5rem 0.75rem"
  guided-input:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    height: "3rem"
    padding: "0.5rem 0.75rem 0.5rem 2.25rem"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
  goal-choice:
    rounded: "{rounded.xl}"
    padding: "1.25rem"
  report-dialog:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "1rem"
---

# Design System: Pag-IBIG Housing Loan Calculator

## Overview

The calculator uses a calm loan form with small field groups and local help.
Simple and Advanced share the same type, controls, colors, and values.
This records the existing app. It does not set a new brand theme.

**Key Characteristics:**

- Neutral light and dark surfaces.
- Lexend text with clear size and weight changes.
- Solid blue main actions and neutral secondary controls.
- Thin borders, short field help, and clear sample labels.
- Open result sections with aligned numbers.

The source is `src/app/globals.css`, `src/app/calculator.tsx`,
`src/components/calculator/simple-calculator.tsx`, and the shared UI components.
The task flow is recorded in `.impeccable/surfaces/src-app-calculator-tsx.md`.

## Colors

Neutral surfaces carry the form. Solid blue marks main actions. Rose and blue remain small brand details.

### Primary

Action blue fills main buttons. Its darker hover value keeps white button text clear.
Brand rose and brand blue appear in the thin line below the page title.

### Secondary

Destructive color marks errors.
An error also has text that explains what to fix.

### Neutral

Background, foreground, card, muted, border, input, and ring are semantic CSS tokens.
The dark theme changes their values through the `.dark` class.
Dark is the app's default theme.
Use the live CSS tokens so controls follow either theme.

**The Theme Rule.** Use semantic surface and text tokens in both modes.

## Typography

Lexend is the main typeface.
Arial, Helvetica, and sans-serif are its fallbacks.
The font scale uses small changes in size and weight.
Headings keep normal letter spacing.

The page title grows from headline to headline-wide at the small breakpoint.
Step titles grow from headline to step-title-wide there.
Key result numbers grow from step-title-wide to headline-wide.
Card titles use semibold text at the title size.
Field labels use the label role.
Help text uses the body role.
Small sample tags and secondary notes use the note role.
Some notes use a taller line height for full sentences.

Guided inputs use base-size text (1rem).
Money values and number fields use tabular numbers.
This gives each digit the same width.
Money fields place the peso mark on the left and group thousands with commas.

**The Number Rule.** Align result values to the right and use tabular numbers.

## Layout

The header, title, mode controls, progress, and calculator share a maximum width of 72rem.
Its side padding grows from 1rem to 1.5rem at 40rem, then to 2rem at 64rem.
The header is 3.5rem tall and stays at the top when the page scrolls.

At widths below 64rem, help follows the form.
At 64rem and above, help sits in a 14rem side column.
The column gap grows from 2rem to 3rem.
A thin border separates help from the form.

Field groups use 1.75rem vertical gaps.
Label, help, and input groups use 0.5rem gaps.
Paired choices use two columns from 40rem.
Controls can wrap on small screens.

Advanced uses a 390px input column beside flexible results from 64rem.
Its smaller grids use the same spacing and controls.
Wide tables scroll inside their own container.
Result rows wrap when their labels and values need more room.
On small screens, Advanced estimate notes start closed.
Schedule tabs use short previews and phone cards.
The page shows three early rows and the final row.
Large graph and schedule views stay inside a scrollable dialog.

Print uses a white page and dark text.
It hides controls, the header, the footer, and side help.
It expands report details and keeps estimate notes together where possible.

## Elevation & Depth

Forms use borders and muted fills for depth.
Cards have no shadow by default.
Main buttons and active tabs use the small shadow.
Outline buttons use the extra-small shadow.
The exact shadow values live in the sidecar.

The header gains a translucent background and blur after scrolling.
Hover and focus change controls without moving the layout.
Normal control transitions last 150ms.
The header transition lasts 300ms.
Reduced-motion settings shorten animations and transitions and stop smooth scrolling.

## Shapes

Inputs and buttons use the medium radius.
Cards and mode groups use the large radius.
Goal choices use the extra-large radius.
Round markers show goal selection and progress.

Borders are thin (1px).
Focus outlines remain distinct from borders.
Icons use simple SVG line shapes beside text or in labeled controls.

## Components

### Buttons

The primary button uses a solid blue fill and a darker blue hover fill.
Outline and ghost buttons handle other actions.
Their hover state uses the neutral accent fill.
Normal buttons are 2.75rem tall.
Large buttons are 3rem tall.
Icon buttons have the same width and height as normal buttons.
Disabled buttons reduce opacity and stop pointer use.
Focus adds a visible ring and outline.

### Inputs / Fields

Inputs use the current background and input border tokens.
Guided fields are taller than the shared base input.
Each guided field keeps its label, help, unit, sample label, and error nearby.
Money fields keep the peso mark inside the left side of the field.
Focus adds a ring.
Errors use descriptive text.
Disabled inputs use lower opacity and a blocked cursor.

### Cards / Containers

Advanced cards use flat surfaces with thin borders.
Their padding grows from 1rem to 1.25rem at 40rem.
Guided review and results use dividers between sections.
Estimate notes use a bordered, lightly muted box.

### Navigation

The mode group shows Simple and Advanced at all steps.
The selected mode uses the neutral secondary button treatment.
Advanced tabs use a muted track and a raised active tab.
Guided progress uses a row of short bars with a text step count.
Completed and current bars use foreground; later bars use muted.

### Choices and sample labels

Goal choices use full-width bordered buttons.
Selected choices add a check and muted fill.
Smaller choices use the same check and border language.
Sample tags are plain bordered labels.
Review and results also name sample values in text.

### Results

The main estimate uses a large number below a clear label.
Supporting values use divided rows.
Loan comparisons use a table with right-aligned numbers.
Notes state what the estimate includes.
Charts, schedules, and export remain in an expandable report section.
Graphs and full schedules open in a large dialog with a clear close button.
Annual and Payments use stacked cards instead of wide tables on small screens.

## Do's and Don'ts

### Do:

- Do use the same type and controls in Simple and Advanced.
- Do keep field help next to the field.
- Do mark sample values in text.
- Do use semantic colors for both themes.
- Do keep number columns aligned.
- Do group thousands in money fields.
- Do retain focus, reduced-motion, and print support.

### Don't:

- Don't add gradients to buttons or their hover states.
- Don't use color alone to mark errors or selected choices.
- Don't hide estimate limits behind a tooltip.
