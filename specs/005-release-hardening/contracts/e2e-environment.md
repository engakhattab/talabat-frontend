# Live E2E Environment Contract

## Fixed service topology

| Service | Required URL | Readiness proof |
|---|---|---|
| Customer SPA | `http://localhost:4200` | `/assets/config.json` returns valid allowed public config |
| Identity | `https://localhost:7237` | `/.well-known/openid-configuration` returns metadata for this authority |
| Customer API | `https://localhost:7056` | `/health` returns healthy; public catalog returns fixture |

Playwright may ignore certificate errors only for the exact loopback HTTPS Identity/API origins in this contract. Any remote environment requires trusted TLS.

## Secret inputs

- `E2E_CUSTOMER_EMAIL`
- `E2E_CUSTOMER_PASSWORD`

Optional non-secret portability inputs may describe the expected synthetic display name/address marker, but service origins default to and must be validated against the fixed topology. Secrets are never committed, echoed, embedded in config.json, saved as Playwright storage state, or uploaded as artifacts.

## Required persistent baseline

- Dedicated non-personal Identity user able to complete the real customer SPA authorization-code + PKCE flow.
- Customer profile with a synthetic display name.
- At least one saved default address.
- One active marker-owned E2E restaurant created or repaired by `prepare`.
- One marker-owned happy-path product initially available.
- One distinct marker-owned negative-path product initially available.

The E2E catalog records may coexist with normal Development catalog data, but provisioning operations modify only records identified by the approved E2E marker. The browser receives their real IDs from `prepare` metadata and never hardcodes or toggles shared developer restaurant/product rows.
- Cumulative order history is permitted.

## Required transient setup capability against the real database

Before automated E2E is enabled, a backend-approved Development/CI-only startup seeder or CLI must operate against the real local Development/CI SQL Server database and provide idempotent operations to:

1. provision/repair the dedicated user, profile, and default address;
2. clear/reset the dedicated user's active cart;
3. set the marker-owned negative product returned by `prepare.catalog.negativeProduct` available at run start;
4. set that same product unavailable after it has been added to the cart; and
5. restore that same product in `finally` and at the next run start.

This capability prepares only the dedicated synthetic records; it does not mock, replace, or bypass EF Core persistence. It must be disabled outside Development/CI test environments, use domain/application/infrastructure behavior where available, and expose no production HTTP endpoint. The frontend plan does not authorize direct database mutation or backend source changes on the backend's active remediation branch.

## Provisioner handoff contract

### Ownership and executable

The backend owner extends the existing `src/Talabat/Talabat.Identity/Talabat.Identity.csproj` host with an early-exit `--e2e-provision <operation> --output json` mode. No new project is required: that host already configures `UserManager<User>`, Identity roles, `TalabatDbContext`, and the same real SQL Server connection used by the live Identity and Customer API services.

The frontend must invoke a backend-supplied wrapper or the built executable with fixed arguments equivalent to:

```text
dotnet run --project src/Talabat/Talabat.Identity/Talabat.Identity.csproj --no-launch-profile -- --e2e-provision prepare --output json
```

The command is an operator/CI setup process, never an HTTP route. The backend build/wrapper is responsible for suppressing build/server noise so the final stdout line is one JSON result. The frontend executes the configured executable path with fixed argument tokens; it must not interpolate a shell command, issue SQL, or receive database credentials.

### Environment guard and inputs

The command must refuse execution before connecting or writing unless all conditions hold:

1. `ASPNETCORE_ENVIRONMENT` is `Development` or `E2E` (case-insensitive); `Production` is always refused even if other flags are set.
2. An explicit non-secret enable flag such as `E2E__Provisioning__Enabled=true` is present.
3. `E2E_CUSTOMER_EMAIL` and `E2E_CUSTOMER_PASSWORD` are supplied by local/CI secret configuration; neither is printed or persisted by the tool.
4. The configured SQL Server connection succeeds and the database has no pending EF Core migrations.

The provisioner may use non-secret configuration for a synthetic display-name/address marker and catalog marker. It must reject missing/ambiguous marker configuration, missing roles, inaccessible SQL Server, missing schema/migrations, or Identity failures with a non-zero exit and a non-secret diagnostic code.

### Operations

| Operation | Real-database behavior | Idempotency / safety |
|---|---|---|
| `prepare` | Seed roles through `IdentityDataSeeder`; create or repair only the marker-owned E2E `User` with `UserManager`; reset its configured password; use `User` domain methods to ensure customer capability/profile and exactly two marker-owned addresses with one default; clear/expire only that user's active cart; create or repair a marker-owned active restaurant with distinct available happy and negative products. | Repeated calls leave one synthetic identity, exactly one known default address, one known non-default address, an empty/recoverable cart, and both products available. Historical orders remain. |
| `make-negative-product-unavailable` | Load only the marker-owned E2E restaurant with products and call `Restaurant.MarkProductUnavailable(negativeProductId)`, then persist through the real `TalabatDbContext`. | Refuses a missing/ambiguous/non-marker product; touching catalog rows not owned by the E2E marker is forbidden. The later browser checkout traverses the live Customer API, application/domain checkout logic, EF Core, and SQL Server. |
| `restore` | Load the same marker-owned restaurant, call `MarkProductAvailable`; clear/expire only the synthetic customer's active cart; repair the profile/address baseline if needed. | Safe after crashes and repeated calls; never deletes completed orders or arbitrary developer/customer/catalog records. |

Direct EF Core access is acceptable only inside this Development/E2E-only fixture utility for isolated lookup/persistence and cart cleanup. Identity creation/password reset uses `UserManager`; profile/address and availability mutations use existing `User`/`Restaurant` domain methods. No production domain invariant or customer endpoint changes.

### Machine-readable result

Every successful invocation emits one final JSON object to stdout and no secret fields. The process writes human diagnostics only to stderr and exits non-zero on any partial-preparation failure.

```json
{
  "version": 1,
  "operation": "prepare",
  "environment": "Development",
  "customer": { "email": "e2e.customer@talabat.test", "displayName": "Talabat E2E Customer" },
  "addresses": {
    "default": { "id": 0, "label": "E2E Default Address" },
    "alternate": { "id": 0, "label": "E2E Alternate Address" }
  },
  "catalog": {
    "restaurant": { "id": 0, "name": "Talabat E2E Restaurant" },
    "happyProduct": { "id": 0, "name": "E2E Happy Product", "available": true },
    "negativeProduct": { "id": 0, "name": "E2E Negative Product", "available": true }
  }
}
```

IDs shown as `0` are schema placeholders only; the provisioner returns real database IDs and the frontend consumes those returned values within the current E2E run. `prepare.catalog.happyProduct` selects the happy-path item; `prepare.catalog.negativeProduct` selects the item added before `make-negative-product-unavailable` and restored by `restore`. Passwords, access/refresh tokens, client secrets, connection strings, and raw exception details never appear in stdout, stderr, Playwright artifacts, or frontend configuration.

## Current blocker

The current backend satisfies none of the identity/profile/address provisioning operations and none of the product toggle/reset operations. It seeds roles and always-available catalog rows only. Therefore the live E2E preflight is intentionally blocked until backend owners approve and deliver the capability above.

## Isolation/cleanup

- One E2E run at a time per environment; Playwright worker count is one and CI uses a concurrency group.
- Each scenario begins with the provisioner's `prepare` operation against the real database, then observes the baseline through the real browser/API path.
- Happy checkout naturally empties the cart; created orders are not deleted.
- Negative checkout must leave the cart populated and order IDs unchanged, then restore catalog availability.
- A crashed prior run is repaired by the next preflight/run-start reset.
- Profile/address are not created or deleted by the ordering scenarios.
