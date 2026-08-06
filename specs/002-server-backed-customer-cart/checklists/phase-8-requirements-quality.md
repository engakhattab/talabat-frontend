# Requirements Quality Checklist: Server-Backed Customer Cart (Phase 8)

**Purpose**: Validate specification, plan, research, data model, and API contract quality, completeness, clarity, consistency, and testability before task generation (`/speckit-tasks`).  
**Created**: 2026-08-06  
**Feature Branch**: `002-server-backed-customer-cart`  
**Reference Artifacts**:
- [spec.md](../spec.md)
- [plan.md](../plan.md)
- [research.md](../research.md)
- [data-model.md](../data-model.md)
- [contracts/cart-api-contract.md](../contracts/cart-api-contract.md)
- [quickstart.md](../quickstart.md)
- [.specify/memory/constitution.md](../../.specify/memory/constitution.md)

---

## 1. Requirement Completeness & Coverage

- [x] CHK001 - Are all primary user journeys (viewing cart, adding items, updating quantities, removing items, clearing cart, shell badge sync) covered with explicit acceptance criteria? [Completeness, Spec §User Scenarios]
- [x] CHK002 - Are empty cart, loading, populated, and retryable error state presentation requirements defined for the `/cart` page? [Completeness, Spec §FR-008, Plan §Route & Component Boundaries]
- [x] CHK003 - Are session termination and logout state cleanup requirements specified for in-memory cart signals? [Completeness, Spec §FR-010, Plan §Data & State Flows]
- [x] CHK004 - Are cross-restaurant conflict resolution choices ("Clear & Add" vs "Keep Current") explicitly documented? [Completeness, Spec §FR-005, Plan §Architecture Decisions]
- [x] CHK005 - Are product unavailability bounds and disabled state requirements defined for catalog menu items? [Completeness, Spec §FR-009, Plan §Data Model]

---

## 2. Requirement Clarity & Unambiguous Semantics

- [x] CHK006 - Is the `GET /api/me/cart` response HTTP status (`200 OK`) and body payload (`status: "Empty"`, `items: []`) for customers without an active cart explicitly specified without 404 ambiguity? [Clarity, Spec §Clarifications, Plan §Baseline]
- [x] CHK007 - Is the `DELETE /api/me/cart` HTTP status (`204 No Content`) and state transition behavior specified without expecting a response body? [Clarity, Spec §Clarifications, Plan §Baseline, Contract §4]
- [x] CHK008 - Are typed backend domain error codes (`CrossRestaurantCart`, `ProductUnavailable`, `CartExpired`, `InvalidQuantity`, `CartItemNotFound`) explicitly mapped in `AppErrorCode`? [Clarity, Spec §Clarifications, Plan §Architecture Decisions]
- [x] CHK009 - Is client-side sum calculation explicitly prohibited in favor of server total authority? [Clarity, Spec §FR-002, Plan §Summary, Constitution §I]

---

## 3. Requirement Consistency & Architectural Boundaries

- [x] CHK010 - Do the spec, plan, and data model align on the single-restaurant aggregate domain constraint enforced by the backend? [Consistency, Spec §FR-004, Data Model §4]
- [x] CHK011 - Does the plan adhere strictly to the workspace dependency hierarchy (app-level `CartStore` provided in root, no feature-to-feature imports)? [Consistency, Plan §Constitution Check, Constitution §III]
- [x] CHK012 - Are route guards configured in the mandatory order (`authGuard` before `profileGuard`) on the `/cart` route? [Consistency, Plan §Project Structure, Constitution §IV]
- [x] CHK013 - Are all HTTP interactions routed through generated `CartApiService` without direct `HttpClient` usage? [Consistency, Plan §Technical Context, Constitution §II & §VII]

---

## 4. Non-Functional & Quality Attributes

- [x] CHK014 - Are minimum touch target height requirements (at least 42px for customer app) specified for all interactive cart controls? [Non-Functional, Spec §FR-015, Plan §Accessibility Strategy, Constitution §VIII]
- [x] CHK015 - Are keyboard navigation, visible focus ring (`--tal-focus-ring`), and ARIA label requirements specified for quantity controls and dialogs? [Non-Functional, Spec §FR-013, Plan §Accessibility Strategy]
- [x] CHK016 - Are responsive design targets (320px, 768px, 1280px viewports and 200% browser zoom) documented? [Non-Functional, Spec §FR-014, Plan §Accessibility Strategy]
- [x] CHK017 - Are concurrency control requirements (busy state locking and request serialization) specified to prevent out-of-order state corruptions? [Non-Functional, Spec §FR-011, Plan §Concurrency Strategy]

---

## 5. Scope Boundary & Exclusion Integrity

- [x] CHK018 - Is Phase 9 checkout behavior (order submission, address selection, payment gateway, coupons) strictly excluded from Phase 8 requirements and plan? [Scope, Spec §Explicit Exclusions, Plan §Summary]
- [x] CHK019 - Are guest cart persistence and offline storage in `localStorage`/`sessionStorage` explicitly excluded in compliance with security guidelines? [Scope, Spec §Explicit Exclusions, Constitution §VI]

---

## 6. Measurability & Testability of Exit Criteria

- [x] CHK020 - Are success criteria SC-001 through SC-006 measurable, technology-agnostic, and testable via automated Vitest unit tests and build verification gates? [Measurability, Spec §Success Criteria, Plan §Exit Criteria]
- [x] CHK021 - Is runnable verification coverage established in `quickstart.md` for shell sync, cross-restaurant conflict, cart page adjustments, clear cart confirmation, and logout reset? [Testability, Quickstart §3]
