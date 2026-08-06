# FoodDash UI Consistency Repair Report

Audit and repair of the Talabat customer application UI so every implemented page follows the existing FoodDash design system. All changes are uncommitted and left for review.

## Visual problems found

From the observed screenshots and a full static audit of the running routes:

- Header compressed into the top-left, not aligned with the content container; nav, greeting, and sign-out crowded together.
- Page titles used `text-2xl` (24px) instead of the FoodDash h1 scale (28/34px) and no consistent eyebrow/heading rhythm.
- A second fixed bottom bar ("Ordering cart" + "View cart") duplicated the cart count shown in the header badge, making the persistent cart entry feel detached from the shell.
- Restaurant cards: `aspect-video` hero image dominated the card; description had no clamp; content section had no padding.
- Menu product cards: name at 14px, description and price at 12px (smallest style), tiny 48px image, low-contrast tertiary add button; busy/unavailable states looked like flat pills.
- Cart item rows: `−` `+` `Remove` all crammed into one `gap-1` group, producing merged text like `7+Remove`; unit price and line total were both tiny; quantity, totals, and actions were cramped.
- Checkout and confirmation totals used small text; submit button not visually dominant; "Placed on" timestamp used 12px (smallest style).
- Profile rendered as a raw `dl` with tiny uppercase labels and 14px values; a redundant sign-out duplicated the header's.
- Dialogs each hand-rolled `p-6` with no shared card padding/width.
- Onboarding/auth pages duplicated the shell's `<main>` container + padding (nested `<main>` inside the shell's `<main>`), causing double padding and narrow columns with large unused white space.
- Several anchors were hand-built button look-alikes with inconsistent radius/height instead of using `tal-button`.
- The nav could overflow at 320px; no intentional mobile wrap.

## Root causes

1. Each page wrapped itself in its own `<main class="mx-auto w-full max-w-6xl px-3 py-6…">` inside the shell's `<main>`, duplicating container, padding, and page-top spacing and creating offset/narrow columns.
2. The cart count existed in two competing places (header badge + bottom bar badge).
3. Shared primitives lacked needed variants: `tal-button` had no size/fluid variant; no shared dialog card class.
4. Feature components used arbitrary one-off values (12px prices, `text-2xl` titles, `aspect-video`, `p-6`, hand-rolled button classes) instead of the FoodDash scale and `tal-button`.
5. The header had no responsive wrap strategy and compressed touch targets.

## Files changed (this task)

### Shared primitives
- `talabat-web/projects/shared-ui/src/lib/button/button.component.ts` — added a `size` input (`md` | `lg`), mapping to `tal-button--size-lg`.
- `talabat-web/projects/customer/src/styles.css` — added `tal-button--size-lg` (50px height, 1rem font), `tal-button--fluid` (full-width host + inner button), destructive hover state, and a shared `.tal-dialog-card` class (width + 24px padding).

### Shell and layout
- `layout/header.component.ts` — redesigned header: 64px header, `text-xl` brand, 42px touch-target nav with rounded hover, pill focus rings, `routerLinkActive` active state, greeting truncated, single sign-in/sign-out, intentional `flex-wrap` for mobile, removed the duplicate in-header cart badge/link.
- `layout/cart-entry-bar.component.ts` — rewritten from a fixed bottom bar into a persistent floating cart button (bottom-end FAB) with cart icon, count badge hidden at 0, safe-area insets, and a descriptive `aria-label`.
- `layout/customer-shell.component.ts` — kept one `<main id="main-content">`; reduced bottom padding to clear the compact FAB.
- `layout/header.component.spec.ts` — updated (cart count moved out of header).
- `layout/cart-entry-bar.component.spec.ts` — new (cart count + link).
- `layout/customer-shell.component.spec.ts` — new (skip link, single main landmark, header, cart entry).

### Catalog
- `features/catalog/pages/restaurant-list.page.ts`, `features/catalog/pages/restaurant-menu.page.ts` — removed nested `<main>` wrappers; consistent page-heading rhythm.
- `features/catalog/components/restaurant-card.component.ts` — balanced 160px media strip (no dominant `aspect-video`), `line-clamp-2` description, `p-4` content, status chip.
- `features/catalog/components/menu-product-card.component.ts` — 18px name, `line-clamp-2` description, prominent bold price with muted currency, larger 80px image area, full-width `tal-button--fluid size=lg` add CTA with busy state, secondary disabled "Unavailable" state.
- `features/catalog/components/restaurant-card.component.spec.ts` — hardened the click test against a RouterLink teardown rejection (wildcard route + `whenStable`).

### Cart
- `features/cart/pages/cart.page.ts` — h1 scale; `size=lg` primary checkout; clear-cart stays secondary (destructive action does not compete).
- `features/cart/components/cart-item-row.component.ts` — restructured: name + unit price left, line total right; a separated quantity stepper group (`role="group"`, round 42px buttons, 16px quantity) and a distinct remove button on the bottom row — no more `7+Remove` merge.
- `features/cart/components/cart-item-row.component.spec.ts` — new (labels, emissions, busy-disabled).
- `features/cart/components/cart-summary.component.ts` — order-total heading and total bumped to readable hierarchy.
- `features/cart/components/clear-cart-dialog.component.ts`, `cross-restaurant-dialog.component.ts` — use shared `.tal-dialog-card`.

### Checkout (Phase 9 UI only)
- `features/checkout/pages/checkout.page.ts` — h1 scale; `size=lg` Place Order; no-address card heading hierarchy.
- `features/checkout/components/checkout-summary.component.ts` — heading + grand-total hierarchy, consistent with cart.
- `features/checkout/components/address-form-modal.component.ts` — shared dialog card padding.

### Orders and confirmation
- `features/orders/pages/orders.page.ts` — h1 scale; `tal-button` primary CTA; updated copy to present tense.
- `features/orders/pages/order-confirmation.page.ts` — h1 scale; "Placed …" time promoted out of the smallest style; address heading + total hierarchy; mono order ID retained.

### Profile
- `features/profile/pages/profile.page.ts` — deliberate account card: distinct labels (muted, 14px) vs values (semibold, 16px), muted "Not provided" phone treatment, single primary "Browse restaurants" action, and no redundant sign-out (the header owns it).
- `features/profile/pages/profile.page.spec.ts` — new (label/value rendering, not-provided state, no sign-out).

### Onboarding / auth / not-found
- `features/onboarding/pages/onboarding.page.ts`, `features/auth/auth-check.page.ts`, `features/auth/pages/profile-unavailable.page.ts` — removed nested `<main>`; h1 scale; readable lead text.
- `features/onboarding/components/onboarding-form.component.ts` — inputs now use the shared `tal-input`; removed the duplicate spinner next to the busy submit button; h1-consistent submit sizing.
- `features/not-found/not-found.page.ts` — `tal-button` primary CTA instead of a hand-rolled anchor.

## Shared versus page-specific fixes

Shared (fixed once, reused everywhere):
- `tal-button` `size=lg` + `tal-button--fluid` — used by menu cards, cart checkout, checkout submit, onboarding, profile, orders, not-found, profile-unavailable.
- `.tal-dialog-card` — used by both cart dialogs and the address-form modal.
- One shell `<main>` container — removed nested wrappers from 4 pages at once.
- Single cart count location (the FAB) — removed the header badge and bottom bar.

Page-specific:
- Restaurant card media ratio, menu product-card hierarchy, cart item-row layout, profile card, confirmation/checkout total hierarchy, header nav wrap.

## FoodDash tokens and patterns applied

- Colors: existing `--color-food-*` tokens only (`food-primary`, `food-primary-hover`, `food-ink`, `food-muted`, `food-tint`, `food-subtle`, `food-success`, `food-error`, `food-border`); no new palette. Primary red used only for actions, never decoratively.
- Typography: `font-display` for page titles/brand; h1 `text-[1.75rem] leading-[2.125rem]` (28/34); card titles 18/24; body 14px; **prices/totals at 16–18px bold, never the smallest style**; order ID in `font-mono`.
- Spacing: existing `gap-*`/`mt-*` on the 6px scale (12/18/24/36); logical utilities (`ps`, `pe`, `ms`, `start/end`) used for padding and the FAB position.
- Radii/elevation: `rounded-food*` and `shadow-food-*` tokens.
- Touch targets: 42px minimum everywhere (nav links, qty steppers, remove, buttons), 48px FAB, 50px `size=lg` buttons.
- Focus rings: consistent `focus-visible:ring-2 … ring-food-primary` on all interactive controls; `--tal-focus-ring` in the shared token system.

## Accessibility improvements

- One clear `<main id="main-content">` landmark with a working skip link (shell test added).
- Cart FAB has a descriptive `aria-label` with live item count; count badge is decorative (`aria-hidden`).
- Quantity controls have distinct accessible names ("Decrease/Increase quantity of …"), a labelled `role="group"`, `aria-live` quantity, and 42px hit areas; remove is a separate real button.
- Active nav route indicated via `routerLinkActive` (color + weight, not color alone).
- All hand-rolled anchors replaced with `tal-button` for consistent disabled/busy/focus behavior.
- `aria-invalid`/`aria-describedby` retained on onboarding and address forms; busy states keep spinner + label.
- Visible focus restored everywhere; reduced-motion handled by the existing global rule.
- Heading order: page h1 → card h2 (restaurant) / h3 (product, per design) → section headings.

## Responsive improvements

- Header: `flex-wrap` container + wrapping nav so 320px never overflows; brand and nav reflow into stacked rows instead of clipping.
- Grids: 1 → 2 → 3 columns across 375/768/1024/1280.
- Cart/checkout/profile/orders/onboarding use a single justified width (`max-w-2xl`/`max-w-lg`) inside the shell container, ending the "stretched mobile" look.
- FAB uses `bottom/end` with `env(safe-area-inset-*)`, never covers content (shell keeps `pb-16`).
- Quantity stepper and actions stack on mobile; totals stay aligned on desktop.

## Routes and widths reviewed

Routes: `/restaurants`, `/restaurants/:restaurantId`, `/cart`, `/checkout`, `/profile`, `/orders`, order confirmation, `/onboarding`, auth-check, profile-unavailable, not-found.

Widths: 320, 375, 768, 1024, 1280, and wide desktop analyzed at code level (header wrap, grid columns, FAB placement, dialog width). 200% zoom: relies on wrapping + token sizes; no fixed-pixel layouts were introduced.

## Tests and results

Added/updated:
- `customer-shell.component.spec.ts` — skip link, single main landmark, header + cart entry present.
- `cart-entry-bar.component.spec.ts` — absolute `/cart` link, count badge reactive, hidden at 0.
- `cart-item-row.component.spec.ts` — labels, group label, emissions, busy-disabled.
- `profile.page.spec.ts` — label/value rendering, not-provided phone, no redundant sign-out.
- `header.component.spec.ts` — updated for the new nav (cart count moved to FAB).
- `restaurant-card.component.spec.ts` — click test hardened against a RouterLink teardown rejection (`Injector has already been destroyed`).

Results:
- `npx ng test customer --watch=false` → 30 files, 181 tests, all passed, no unhandled errors.
- `npx ng test shared-ui --watch=false` → 1 file, 5 tests, all passed.
- `git diff --check` → clean (only LF/CRLF notices).

## Build result

- `npx ng build customer --configuration=production` → success (`dist/customer`, 104 kB initial transfer).

## Remaining limitations

- I could not visually inspect the supplied screenshots or run the app in a browser in this environment, so the responsive/visual pass is code-level static analysis; a manual visual pass across the listed routes and widths is still recommended.
- The persistent cart FAB keeps the existing `tal-cart-entry-bar` selector (renaming would be an unrelated refactor).
- Pre-existing uncommitted Phase 9 work (checkout/orders features, `cart.store.ts`, routes, guards, core-http, `.specify/feature.json`) remains in the working tree; this task only layered UI edits on top and did not revert or restage it.

## Behaviour intentionally unchanged

- No generated API files, backend contracts, guards, or business rules were modified.
- `CartStore`/`CheckoutStore`/`ProfileStore`/`AuthStore` logic untouched (except pre-existing Phase 9 changes already present).
- No `HttpClient` introduced; `shared-ui` stays domain-neutral.
- No unsupported feature (profile editing, address management, tracking, statuses) was added; only fields supported by the generated contracts are displayed.

## Skills used

Loaded and used: `angular-component`, `angular-signals`, `angular-routing`, `angular-testing`, `angular-tooling`.
Rejected (not applicable to a UI-only consistency repair): `angular-di`, `angular-http`, `angular-directives`, `speckit-*`.

## Confirmations

- Generated API files were not edited.
- Backend and business logic were not changed.
- `git add` and `git commit` were not run; all changes remain uncommitted for review.
