# Phase 11 Data Model

Phase 11 adds no production domain entity or database migration. These are test/release artifacts and state contracts only.

## VerificationStage

| Field | Type | Rules |
|---|---|---|
| `id` | string | Stable stage name such as `customer-unit` or `production-build` |
| `command` | string | One independently executable command |
| `budgetSeconds` | positive integer | Hard stage ceiling from the verification contract |
| `startedAt` / `finishedAt` | timestamp | CI/local evidence only |
| `durationSeconds` | number | Derived from timestamps |
| `exitCode` | integer | Zero is pass; non-zero is failure |
| `logReference` | string | CI step/log or local evidence location; no secrets |

State: `pending -> running -> passed | failed | timed-out`. One stage failure does not erase output from other stages.

## TestIdentity

| Field | Type | Rules |
|---|---|---|
| `email` | secret string | Dedicated automation account; environment secret only |
| `password` | secret string | Never logged, committed, screenshotted in plain text, or stored in Playwright state |
| `expectedDisplayName` | string | Synthetic marker used by preflight |
| `profilePresent` | boolean | Must be true before ordering tests |
| `defaultAddressMarker` | string | Identifies one baseline saved/default address |
| `environment` | enum | `local-e2e` or approved CI test environment only |

Relationship: one TestIdentity owns one persistent profile, one or more baseline addresses, zero or more carts over time, and cumulative orders.

## CatalogFixture

| Field | Type | Rules |
|---|---|---|
| `restaurantId` | positive integer | Existing deterministic active restaurant |
| `happyProductId` | positive integer | Available product used by happy path |
| `negativeProductId` | positive integer | Distinct product used for availability transition |
| `expectedName` | string | Stable user-facing selector/preflight assertion |
| `initiallyAvailable` | boolean | Must be true at run start |
| `originalAvailability` | boolean | Captured before mutation and restored in `finally` |

The browser never mutates catalog through a production endpoint. An approved Development/CI-only backend setup capability owns reset/toggle operations.

## E2ERun

| Field | Type | Rules |
|---|---|---|
| `runId` | string | CI run/attempt or local UUID; contains no account secret |
| `identity` | TestIdentity reference | Exactly one dedicated identity |
| `baselineOrderIds` | set of positive integers | Captured before negative checkout |
| `createdOrderId` | positive integer or null | Dynamic ID from happy-path response navigation |
| `cartState` | enum | `reset`, `populated`, `emptied-after-order`, `preserved-after-rejection` |
| `negativeProductState` | enum | `available`, `unavailable-for-checkout`, `restored` |
| `result` | enum | `passed`, `failed`, `blocked-preflight` |

Happy state transition: `reset -> populated -> submitted -> emptied-after-order`, with `createdOrderId` then verified by reload-safe GET.

Negative state transition: `reset/available -> populated -> unavailable-for-checkout -> rejected/preserved -> restored`. The order-ID set must remain unchanged.

## BundleEvidence

| Field | Type | Rules |
|---|---|---|
| `initialBytes` | non-negative integer | Angular build raw initial total |
| `mainBytes` | non-negative integer | Main JS raw size |
| `stylesBytes` | non-negative integer | Global CSS raw size |
| `featureInputsInMain` | string array | Must be empty for `projects/customer/src/app/features/**` |
| `largestInputs` | array | Diagnostic only; relative path and bytes |
| `budgetWarnings` | string array | Must be empty at exit |

Current baseline: initial 425.38 kB, main 391.22 kB, styles 34.16 kB, no customer feature input in main.

## ManualAcceptanceRecord

| Field | Type | Rules |
|---|---|---|
| `environment` | string | Host/build/backend ref description |
| `browser` | string | Browser/version used |
| `checkId` | string | Stable quickstart checklist ID |
| `result` | enum | `pass`, `fail`, `blocked` |
| `evidence` | string | Concise observation; no token, password, raw PII, or stack trace |
| `reviewedAt` | timestamp | Required for exit evidence |

No acceptance record can turn a failed automated gate into a pass.
