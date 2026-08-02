# @talabat/api-customer@1.0.0

Generated Angular client for the customer API. Do not edit generated files directly; update the OpenAPI contract and run `npm run api:gen` from the workspace root.

OpenAPI document version: 1.0.0

## Consuming in Talabat

This Angular 22 client uses standalone services with `providedIn: 'root'`. Import generated services and types from `@talabat/api-customer`:

```typescript
import { CatalogApiService, RestaurantSummaryDto } from '@talabat/api-customer';
```

`BASE_PATH` is configured later by `core-config` during Phase 3. Consumers should not provide a base URL directly or use Angular module-based setup.
