# FoodDash UI Consistency Repair Prompt

You are a senior Angular UI architect, design-system engineer, accessibility specialist, and frontend reviewer.

Your task is to audit and repair the current Talabat customer application's UI so that all implemented pages consistently follow the existing FoodDash design system.

The application already uses FoodDash colors, but the current layout is visually inconsistent, cramped, misaligned, and not production-ready. Do not invent a new visual language. Read the real FoodDash design source and apply it correctly to the existing Angular implementation.

You must independently inspect the repository, diagnose the root causes, decide the correct implementation, and make the smallest coherent set of UI changes. This prompt gives constraints and evidence, not a file-by-file solution.

---

## Observed visual problems

Use the supplied screenshots as visual evidence. The visible problems include:

- the header is compressed into the top-left and does not align with page content
- navigation, user information, and sign-out actions are too close together
- typography is too small and lacks hierarchy
- content containers are too narrow or incorrectly offset
- large unused white areas surround the actual content
- the persistent cart control feels detached from the shell
- cart count information appears in competing locations
- restaurant image placeholders dominate the cards
- menu product cards have weak hierarchy
- quantity controls and remove actions overlap or appear merged
- cart rows, totals, and actions are cramped
- profile data looks like raw text rather than a designed account view
- spacing, radius, shadow, padding, and button sizing are inconsistent
- desktop views look like stretched or misplaced mobile layouts
- some controls may not meet minimum touch-target requirements

Treat these as starting observations, not a complete diagnosis. Inspect the running application and identify any additional layout, design-token, responsiveness, or accessibility problems.

---

## Core objective

Make the implemented customer application feel like one coherent FoodDash product.

The result must:

- preserve the existing FoodDash design language
- use the existing design tokens rather than adding a competing theme
- establish consistent shell, containers, spacing, typography, cards, and actions
- provide intentional mobile, tablet, and desktop layouts
- integrate header, navigation, content, and persistent cart access
- make restaurant, menu, cart, checkout, profile, and order pages visually consistent
- preserve all business behaviour
- remain accessible and keyboard usable
- avoid unrelated architectural changes

Do not redesign the product from scratch.

Do not replace FoodDash with Angular Material, Bootstrap, PrimeNG, or another UI system.

---

## Mandatory repository investigation

Before editing code, inspect all relevant sources, including:

- `AGENTS.md`, if present
- `.specify/memory/constitution.md`
- `talabat-angular-plan-v2.md`
- `talabat-angular-foundation-guide-phases-1-4.md`
- `docs/talabat-angular-roadmap-phases-5-to-completion.md`
- the original FoodDash design document or token source
- the Phase 5 FoodDash foundation guide or implementation report
- relevant Phase 6–9 reports, learning guides, and Spec Kit artifacts
- `projects/customer/src/styles.css`
- all FoodDash token definitions and CSS custom properties
- Tailwind CSS-first theme configuration
- `projects/shared-ui`
- `projects/shared-util`
- the customer shell and layout
- all implemented routes, pages, components, templates, and styles
- package.json, Angular workspace configuration, and relevant tests
- current Git status and diff

Treat the FoodDash design source and existing project tokens as authoritative.

Treat screenshots and the running application as evidence of the current rendering.

Treat planning documents as intent, not proof that the code follows them.

---

## Skill discovery and usage

Before beginning, inspect all project-local and permitted global OpenCode skills, including:

- `.opencode/skills/`
- `.agents/skills/`
- other skill locations exposed by OpenCode
- skill references in `AGENTS.md`

Independently load and use every relevant skill that materially improves the result.

Relevant areas may include:

- Angular components and templates
- Angular application shells and routing
- Angular signals
- Angular CDK
- accessibility
- responsive design
- Tailwind CSS v4
- CSS architecture
- design systems
- Vitest and Angular testing
- TypeScript
- visual review

Do not assume skill names. Inspect actual descriptions first.

The constitution, FoodDash source, installed Angular version, approved architecture, and repository code override generic skill advice.

At completion report which skills were discovered, loaded, used, rejected, and why.

---

## Git and safety rules

Before editing, run safe inspection commands such as:

```powershell
git status --short
git branch --show-current
git log -5 --oneline
git diff --stat
git diff
```

Determine whether the working tree contains unrelated uncommitted work. If safe attribution is impossible, stop and report the issue.

Do not run:

- `git add`
- `git commit`
- `git reset`
- `git restore`
- `git checkout`
- `git clean`
- `git stash`
- destructive Git commands

Leave all UI changes uncommitted for review.

---

## Audit before implementation

Audit every currently implemented customer route, including where available:

- `/restaurants`
- `/restaurants/:restaurantId`
- `/cart`
- `/checkout`
- `/profile`
- `/orders`
- order confirmation/detail
- onboarding
- loading, error, empty, and not-found states

Review each route at:

- 320px
- 375px
- 768px
- 1024px
- 1280px
- wide desktop
- 200% zoom

Also inspect:

- keyboard-only navigation
- focus visibility
- reduced motion
- long text
- broken or missing images
- large cart quantities
- validation errors
- dialogs and sheets
- fixed and sticky controls
- safe-area behaviour

Before editing, identify:

- repeated shell/layout problems
- shared primitive problems
- page-specific problems
- design-token misuse
- arbitrary values bypassing the design system
- broken responsive assumptions
- accessibility problems
- duplicate controls or information
- visual hierarchy problems
- regression risks

Prefer fixing a shared root cause once rather than adding repeated page patches.

---

## Architecture boundaries

Preserve the current architecture:

- do not edit generated API files
- do not change backend code or contracts
- do not change authentication or guard behaviour
- do not change cart, checkout, profile, or order business rules
- do not introduce direct `HttpClient` usage
- do not move domain logic into `shared-ui`
- do not add a state-management library
- do not add Angular Material or another CSS framework
- do not create a second token system
- do not hardcode environment URLs
- do not perform unrelated refactors

`shared-ui` must remain domain-neutral.

Customer-specific compositions belong in the customer app.

Pages orchestrate data and state; presentational components render inputs and emit intent.

---

## FoodDash design-system rules

Read the actual FoodDash design source before choosing values.

Apply the real tokens consistently for:

- colors
- typography families and scale
- 6px-based spacing
- radii
- elevation
- focus rings
- minimum touch targets
- button heights
- status chips
- responsive containers
- logical-direction spacing
- reduced-motion behaviour

Do not use arbitrary one-off values when a token exists.

Do not use primary red decoratively.

Prices and important time values must not use the smallest text style.

Use CSS logical properties and logical Tailwind utilities rather than physical left/right assumptions.

---

## Customer shell and header

Repair the shell as one coherent layout.

The header must:

- span the intended application width
- align with the same container as page content
- provide readable brand, navigation, user, and sign-out areas
- avoid compressed text and overlapping actions
- clearly indicate the active route
- remain keyboard accessible
- use an intentional mobile navigation pattern
- avoid duplicate controls
- preserve minimum touch targets
- remain usable at 200% zoom

The persistent cart entry must:

- feel integrated with the shell
- not float awkwardly away from content
- not obscure page content
- avoid unnecessary duplication
- show the count clearly
- remain keyboard accessible
- respect safe-area spacing
- adapt intentionally between mobile and desktop

Independently decide the correct FoodDash-consistent composition from the existing requirements. Do not remove required persistent cart access.

---

## Shared layout and containers

Create one consistent page-layout system with:

- a deliberate max-width strategy
- consistent inline padding
- consistent page top/bottom spacing
- aligned headings and content
- predictable section gaps
- no accidental large blank regions
- no content hidden beneath fixed controls

Different pages may use justified content widths, but all widths must belong to one shell system. Do not force every page into the same arbitrary narrow column.

---

## Typography and hierarchy

Ensure:

- eyebrow/section labels are distinct
- page titles are prominent
- supporting text is readable
- restaurant and product names have clear hierarchy
- metadata remains readable
- prices and totals are prominent
- quantity and action text are easy to scan
- profile labels and values are distinguishable
- order IDs use mono typography where appropriate
- line heights are not cramped
- semantic heading order is correct

Do not solve layout problems by shrinking all text.

---

## Restaurant list

Repair:

- page-heading spacing
- responsive grid/list behaviour
- card width
- image ratio and fallback
- name and description hierarchy
- availability placement
- hover and focus states
- clickable area
- keyboard behaviour
- spacing
- loading, error, and empty states

Avoid image placeholders that dominate the card. Use an intentional responsive layout based on FoodDash and the content.

---

## Restaurant menu

Repair:

- restaurant heading and section spacing
- product image area
- name, description, and price hierarchy
- availability state
- Add to Cart placement
- card padding and alignment
- mobile/desktop composition
- disabled and busy states
- image fallback
- keyboard and focus treatment

Use a consistent product-card pattern that handles long content safely.

---

## Cart page

The cart must no longer display overlapping or merged actions.

Repair:

- item-row layout
- product name and unit price
- quantity display
- decrement/increment controls
- remove action
- line total
- pending and disabled states
- card spacing
- total summary
- clear-cart action
- checkout action
- mobile stacking
- desktop alignment
- long quantities and names
- errors and empty state

Quantity controls and remove must be visually distinct real buttons with accessible names and minimum touch targets.

Do not produce merged text such as `7+Remove`.

Give the total and primary checkout action clear hierarchy. The destructive clear action must not compete visually with the primary checkout action.

---

## Checkout

Audit and repair all implemented Phase 9 UI while preserving behaviour:

- server-authoritative summary
- address selection
- default selection
- no-address state
- inline address dialog/sheet
- payment method information
- submit hierarchy
- duplicate-submit busy state
- 422 unavailable-item recovery
- unknown/network errors
- confirmation rendering from supported contract fields
- refresh/deep-link states
- mobile action placement
- dialog focus management

Do not add unsupported functionality.

---

## Profile

Turn the profile page from raw text into a coherent account view while preserving current scope.

Repair:

- page heading
- summary card
- label/value hierarchy
- optional phone treatment
- actions
- sign-out placement
- restaurant navigation
- missing-value presentation
- width and spacing
- focus states

Do not invent profile editing or full address management unless already implemented.

Avoid redundant sign-out actions unless the current product design explicitly needs both.

---

## Orders and confirmation

Where implemented, repair:

- order cards
- IDs
- placed date
- totals
- address snapshot
- item rows
- empty/not-found/retry states
- confirmation hierarchy
- navigation actions

Display only fields supported by the generated contract. Do not invent status, restaurant name, tracking, or unsupported actions.

---

## Shared UI primitives

Audit existing primitives such as:

- Button
- Card
- Input
- StatusChip
- Spinner
- EmptyState
- ErrorState
- Modal
- Sheet
- dialog actions
- focus helpers

Fix shared causes where appropriate while keeping primitives domain-neutral.

Ensure coherent states for primary, secondary, outline, ghost, destructive, disabled, busy, and focus-visible behaviour.

Do not add excessive variants without evidence.

---

## Responsive requirements

Verify at 320, 375, 768, 1024, 1280, and wide desktop widths.

Ensure:

- navigation remains usable
- cards reflow intentionally
- cart actions never overlap
- persistent cart access does not cover content
- dialogs fit
- forms remain readable
- long labels wrap safely
- totals remain aligned
- normal content does not require horizontal scrolling
- safe-area insets are respected
- 200% zoom remains usable

The goal is intentional responsiveness, not merely the absence of overflow.

---

## Accessibility requirements

Preserve or improve:

- semantic landmarks
- one clear main content region
- heading hierarchy
- skip link
- visible focus
- keyboard access
- active navigation state
- accessible button names
- quantity-control labels
- dialog focus trap and restoration
- error focus
- `aria-invalid`
- `aria-describedby`
- appropriate `aria-live`
- color-independent meaning
- contrast
- touch-target sizing
- reduced motion
- image alt/decorative handling

Do not remove labels or focus indicators to make the UI look cleaner.

---

## Implementation approach

Independently choose the correct sequence after the audit.

Prefer fixing:

1. genuinely incorrect global foundations
2. shell and shared layout
3. shared primitives
4. repeated feature components
5. page-specific composition
6. focused tests
7. responsive and accessibility verification

Do not follow this mechanically if the repository requires another dependency order.

Avoid:

- unnecessary rewrites
- duplicated page CSS
- giant components
- arbitrary absolute positioning
- negative-margin compensation
- desktop-only screenshot matching

---

## Testing and verification

Inspect existing tests first.

Add or update meaningful tests for behaviour such as:

- shell structure
- active navigation
- cart count
- quantity-control accessibility
- dialog focus behaviour
- disabled/busy states
- semantic labels
- profile label/value rendering
- supported order data rendering

Avoid brittle tests that only assert long class strings.

Run focused tests after each logical group.

At final verification, inspect actual scripts and run applicable commands such as:

```powershell
git diff --check
npx ng test customer --watch=false
npx ng test shared-ui --watch=false
npx ng build customer --configuration=production
```

Do not claim visual correctness from unit tests alone. Perform a manual visual pass across affected routes and widths.

---

## Acceptance criteria

The work is complete only when:

- header and content align to one coherent layout
- desktop pages no longer appear compressed inside unused space
- mobile layouts remain usable without overlap
- navigation is readable and responsive
- persistent cart access is integrated and non-obstructive
- restaurant cards have balanced image/content proportions
- menu cards have clear product, price, availability, and action hierarchy
- cart quantity and remove controls do not collide
- totals and checkout actions have clear hierarchy
- profile looks like a deliberate account view
- checkout/order pages follow the same system
- spacing, typography, cards, radius, elevation, and controls are consistent
- keyboard and focus behaviour remain usable
- affected tests pass
- production build passes
- generated and backend files remain unchanged
- business behaviour remains unchanged
- no unsupported feature is added

---

## Required report

Create:

```text
docs/fooddash-ui-consistency-repair-report.md
```

Include:

- visual problems found
- root causes
- files changed
- shared versus page-specific fixes
- FoodDash tokens/patterns applied
- accessibility improvements
- responsive improvements
- routes and widths reviewed
- tests and results
- build result
- remaining limitations
- behaviour intentionally unchanged
- skills used
- confirmation that generated files were not edited
- confirmation that backend and business logic were not changed

---

## Final console report

Report:

- files added, modified, deleted, or renamed
- shared primitives changed
- routes visually reviewed
- responsive widths checked
- accessibility checks completed
- tests run, passed, and failed
- production build result
- remaining visual issues
- skills used
- confirmation that backend code was unchanged
- confirmation that generated API code was unchanged
- confirmation that business behaviour was unchanged
- confirmation that no unsupported feature was introduced
- confirmation that `git add` and `git commit` were not run

Stop after completing the UI repair and report.

Do not begin the next phase.
