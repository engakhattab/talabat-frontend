# FoodDash UI Alignment Prompt — Phase 9

You are a senior Angular 22 frontend engineer correcting the visual implementation of Talabat Customer Phase 9.

The Phase 9 checkout functionality is already implemented.

Your task is NOT to redesign the application from your own preferences.
Your task is to bring the Phase 9 UI back into strict alignment with the repository's existing FoodDash design system and Phase 5 visual foundation.

Do not begin Phase 10.
Do not change backend behavior.
Do not change Phase 9 business behavior unless a UI defect makes the existing behavior inaccessible.
Do not run broad test suites before understanding the current UI.
Do not reset, revert, checkout, clean, or discard the working tree.

## Project root

```text
D:\link-dev\talabat-frontend\talabat-web
```

## Primary source of truth

Locate and fully read the repository's canonical FoodDash design document:

- `fooddash-DESIGN.md`
- or the actual repository path containing that file.

Search the repository if its location is not immediately known.

Also read:

- `talabat-angular-plan-v2.md`
- `talabat-angular-roadmap-phases-5-to-completion.md`
- the Phase 5 design-system implementation guide/report
- the Phase 9 specification, plan, tasks, quickstart, and implementation artifacts
- `projects/customer/src/styles.css`
- all existing `shared-ui` public components and tokens
- existing customer shell, catalog, menu, and cart implementations

Source-of-truth priority:

1. `fooddash-DESIGN.md`
2. Existing Phase 5 tokens and shared-ui primitives
3. Project architecture documents
4. Phase 9 functional specification
5. Existing UI code

Do not use personal design preferences, generic dashboard templates, Angular Material styling, Bootstrap styling, or another design system.

If `fooddash-DESIGN.md` cannot be found, stop and report that the required design source is missing.
Do not recreate FoodDash from memory.

## Observed problem

Phase 9 functionality was completed, but a later UI correction produced a visually different and inconsistent design.

Current symptoms include:

- pages no longer look like one coherent FoodDash application;
- button placement and alignment appear arbitrary;
- primary and secondary actions do not follow a consistent hierarchy;
- spacing, cards, form controls, summaries, and page widths are inconsistent;
- some Phase 9 components appear to use custom one-off styling instead of the existing shared design foundation;
- the checkout, address modal, order confirmation, cart handoff, and shell do not feel visually connected;
- later UI edits may have changed files beyond what was required.

You have full repository access, so inspect the actual implementation and identify the exact inconsistencies.

## Important Git condition

Phase 9 files may still be untracked or uncommitted, and later UI edits may be mixed into the same working tree.

Therefore:

- do not use `git reset`;
- do not use `git restore`;
- do not use `git checkout --`;
- do not delete untracked files;
- do not assume HEAD represents the completed Phase 9 baseline;
- do not blindly revert entire files.

Use read-only Git inspection:

```powershell
git status --short
git diff --stat HEAD
git diff --name-status HEAD
git diff HEAD
git diff --cached
git ls-files --others --exclude-standard
```

Preserve the completed Phase 9 functionality while correcting only the visual implementation.

## Files and screens to inspect

Inspect at minimum:

- `projects/customer/src/styles.css`
- customer shell/layout and navigation
- persistent cart FAB
- shared-ui button
- shared-ui card
- shared-ui input
- shared-ui radio/selection control
- shared-ui modal or sheet
- shared-ui spinner
- shared-ui error state
- shared-ui empty state
- `features/cart/pages/cart.page.ts`
- `features/checkout/pages/checkout.page.ts`
- `features/checkout/components/address-selector.component.ts`
- `features/checkout/components/checkout-summary.component.ts`
- `features/checkout/components/address-form-modal.component.ts`
- `features/orders/pages/order-confirmation.page.ts`
- any CSS files, host classes, inline templates, or utility classes used by those components
- relevant specs only when visual structure or accessibility behavior is tested

Also inspect all files changed after the Phase 9 completion work, especially files containing:

- new custom CSS values;
- arbitrary Tailwind values;
- duplicated button styles;
- duplicated card styles;
- inline layout hacks;
- absolute positioning;
- fixed widths/heights;
- inconsistent margins;
- decorative use of primary red;
- native controls replacing an existing shared-ui primitive;
- new components that duplicate an existing shared-ui responsibility.

## Stage 1 — Create a focused UI audit

Before editing, compare every Phase 9 screen against FoodDash.

Create a concise internal matrix:

| Screen/component | FoodDash requirement | Existing Phase 5 pattern | Current deviation | Required correction |
|---|---|---|---|---|

Audit:

1. Page container width and horizontal padding.
2. Typography hierarchy.
3. 6px-based spacing scale.
4. Surface/card treatment.
5. Border radius.
6. Elevation/shadows.
7. Primary, secondary, destructive, and text action hierarchy.
8. Button heights and touch targets.
9. Form control sizing and label/error spacing.
10. Radio/address selection states.
11. Loading/error/empty states.
12. Modal/sheet structure and action footer.
13. Mobile safe-area handling.
14. Responsive stacking.
15. Keyboard focus.
16. Disabled and busy states.
17. Price and total typography.
18. Logical RTL-safe spacing properties.
19. Persistent cart access.
20. Consistency with catalog, menu, profile, and cart screens.

Do not spend time writing a large separate audit document.
Use the matrix to guide the implementation and summarize it in the final response.

## FoodDash non-negotiable rules

Follow the actual design file. At minimum, preserve these project rules unless the file states something more specific:

- Tailwind v4 CSS-first tokens are the styling foundation.
- Use the existing FoodDash CSS variables and token utilities.
- Do not introduce Angular Material.
- Do not install a UI library.
- Do not install a new icon package.
- Customer primary/accent is the existing FoodDash red.
- Primary red is for meaningful interaction, not decoration.
- Primary hover state must use the existing token.
- Use the established neutral, success, warning, error, and info tokens.
- Use the existing 6px spacing scale.
- Use the existing typography tokens.
- Prices, totals, and delivery-related values must not use small typography.
- Customer touch targets must be at least 42px.
- Primary CTA height should follow the established customer FoodDash token, approximately 50px where applicable.
- Use the established radii and elevations.
- Use CSS logical properties and logical Tailwind utilities.
- Avoid left/right-specific layout utilities where logical equivalents exist.
- Respect `prefers-reduced-motion`.
- Maintain visible keyboard focus.
- Do not communicate state by color alone.
- Customer pages must work at 320px, 768px, and 1280px.
- Avoid horizontal overflow.
- Bottom actions and the persistent cart control must respect safe-area spacing.

## Shared component requirements

Reuse the existing Phase 5 design system instead of recreating styles locally.

Prefer existing shared primitives such as:

- Button
- Card
- Input
- Radio or selectable control
- Spinner
- EmptyState
- ErrorState
- Modal
- Sheet
- StatusChip

First inspect which components actually exist and what their public APIs are.
Do not assume an API that is not implemented.

Rules:

- Do not duplicate shared button CSS inside Phase 9 pages.
- Do not duplicate shared input CSS inside the address form.
- Do not duplicate modal focus/backdrop/escape logic.
- Do not put checkout-specific domain behavior inside `shared-ui`.
- Shared-ui components remain domain-free.
- Customer-specific compositions remain in the customer app.
- Do not add app-specific variant inputs to shared-ui merely to solve one checkout layout.
- Extend an existing primitive only when the extension is genuinely generic and consistent with FoodDash.

## Phase 9 screen expectations

Preserve existing behavior while applying FoodDash consistently.

### Checkout page

The checkout page must visibly communicate:

1. Page identity and heading.
2. Delivery-address selection.
3. Cart/order summary from server data.
4. Server-authoritative total.
5. One clear primary Place Order action.
6. Secondary navigation or recovery actions.
7. Pending, validation, unavailable, network, and general error states.

Correct UI issues such as:

- detached buttons with no visual relationship to their section;
- primary CTA placed beside unrelated controls;
- inconsistent card widths;
- excessive empty space;
- summary content that is visually weaker than secondary content;
- totals rendered with small or muted text;
- desktop-only layouts that break on mobile;
- mobile CTAs that are difficult to reach;
- controls that shift unexpectedly between states.

Derive the final placement from FoodDash and existing application patterns.
Do not invent a new checkout visual language.

### Address selector

Ensure that:

- each address behaves as a real radio option;
- selected, focus, hover, disabled, and error states follow FoodDash;
- selected state is not communicated by color alone;
- address text remains readable at narrow widths;
- default-address status is clear;
- the Add Address action follows secondary-action hierarchy;
- cards and radios do not use conflicting click targets;
- the entire option is keyboard accessible where appropriate.

### Address form modal/sheet

Use the existing FoodDash modal or sheet behavior.

Ensure:

- consistent title/header;
- correct field spacing;
- visible labels;
- accessible validation messages;
- sensible mobile stacking;
- predictable action footer;
- primary submit and secondary cancel hierarchy;
- busy/disabled submit behavior;
- focus handling and restoration;
- escape and backdrop behavior according to the existing shared primitive;
- no arbitrary fixed width that overflows small screens.

### Checkout summary

Ensure:

- product lines are readable and aligned;
- quantity, unit price, line total, and server total have a clear hierarchy;
- total is visually prominent;
- no client-side recalculated value is introduced;
- long product names wrap safely;
- currency presentation uses the existing shared utility;
- summary card spacing and elevation match FoodDash.

### Cart to checkout handoff

The cart page's Proceed to Checkout action must visually belong to the cart summary and follow the same primary CTA pattern used by checkout.

Do not redesign cart functionality.
Do not add new Phase 9 behavior to cart.

### Order confirmation

Ensure that the confirmation page:

- clearly communicates success;
- uses the FoodDash success semantic token;
- does not turn the entire page decorative red or green;
- presents the order ID using the established mono style where available;
- displays only data supported by the API;
- provides a clear primary next action and a visually secondary alternative;
- is reload-safe exactly as currently implemented;
- works at mobile and desktop widths;
- does not claim payment, tracking, delivery status, or unsupported features.

### Error and unavailable states

Keep all existing Phase 9 behavior:

- HTTP 201 success.
- HTTP 422 unavailable-item recovery.
- network/ambiguous timeout warning.
- empty cart.
- missing address.
- invalid address.
- closed/inactive restaurant.
- expired or inactive cart.
- authorization/session failure.
- unknown error fallback.

Only correct their visual presentation and accessibility unless a UI wiring defect is proven.

Do not alter error contracts or API parsing merely to simplify the template.

## Architecture and behavior constraints

Do not change:

- generated API code;
- API request shapes;
- checkout state transitions;
- duplicate-submission protection;
- server-authoritative total handling;
- 422 parsing;
- cart invalidation after success;
- order confirmation reload behavior;
- guards;
- auth behavior;
- route URLs;
- interceptor behavior;
- form data model;
- Signal Forms implementation;
- store public API;
- order ID route binding;
- Phase 9 feature scope.

Do not:

- edit `projects/api-customer`;
- inject `HttpClient` into a feature;
- calculate an authoritative total on the client;
- add payment UI;
- add tracking UI;
- add coupons, tips, delivery ETA, or notifications;
- add a second address implementation;
- introduce NgModules;
- use `BehaviorSubject` for component state;
- replace Signal Forms with Reactive Forms;
- make an unrelated formatting sweep;
- modify backend files.

Use Angular 22 patterns:

- standalone components;
- `input()`, `output()`, and signals;
- `@if`, `@for`, and `@switch`;
- `inject()`;
- zoneless-safe updates;
- no new manual component subscriptions;
- no `any`;
- no unsafe non-null assertions on API data.

## Implementation approach

1. Read the canonical design file and existing token implementation.
2. Inspect the current working-tree diff.
3. Identify which later UI edits conflict with FoodDash.
4. Preserve the Phase 9 functional code.
5. Remove or replace one-off styling only where it conflicts with the established design system.
6. Reuse shared-ui components.
7. Keep page-specific layout in Phase 9 feature components.
8. Make the smallest coherent set of changes.
9. Check the result in the browser.
10. Run only focused verification.

## Browser verification

If browser tooling is available, inspect and compare these routes:

- cart;
- checkout with saved addresses;
- checkout with zero addresses;
- add-address modal/sheet;
- checkout submission pending state;
- checkout validation/error state;
- checkout 422 unavailable state;
- order confirmation;
- narrow mobile layout;
- desktop layout.

Capture before/after screenshots if supported.

Check:

- 320px width;
- 768px width;
- 1280px width;
- keyboard navigation;
- focus visibility;
- 200% zoom;
- long product/address text;
- mobile action placement;
- modal overflow;
- no horizontal scrolling;
- no content hidden behind the cart FAB or bottom actions.

## Testing limits

Do not start by running all 168 customer tests.

First run only tests directly affected by the UI changes, such as:

- checkout page spec;
- address selector spec;
- checkout summary spec;
- address form modal spec;
- order confirmation page spec;
- cart page spec only if its CTA markup changed;
- shared-ui specs only if a shared primitive changed.

Example:

```powershell
npx ng test customer --include="**/features/checkout/**/*.spec.ts" --watch=false
npx ng test customer --include="**/features/orders/**/*.spec.ts" --watch=false
```

If the include pattern is unsupported, run the equivalent focused Vitest files directly.

After focused tests pass, run one production build:

```powershell
npx ng build customer --configuration=production
```

Do not run:

- API regeneration;
- OpenAPI tooling tests;
- all library suites;
- e2e;
- backend tests;
- Phase 10 tests;
- the entire repository suite;

unless a directly affected shared component requires one additional focused suite.

## Final report

At completion, report:

1. The canonical FoodDash design file used.
2. The exact UI inconsistencies found.
3. Which later changes conflicted with FoodDash.
4. Every modified file.
5. For every file, distinguish:
   - visual-only changes;
   - accessibility changes;
   - shared-component changes;
   - any unavoidable behavioral change.
6. Which existing shared-ui primitives were reused.
7. Any duplicated styling removed.
8. Responsive behavior at 320px, 768px, and 1280px.
9. Focus/keyboard/modal behavior checked.
10. Focused tests run and results.
11. Production build result.
12. Remaining manual visual checks.

Do not commit, stage, reset, or discard changes.
Do not begin Phase 10.
Stop after the FoodDash visual correction is implemented and verified.
