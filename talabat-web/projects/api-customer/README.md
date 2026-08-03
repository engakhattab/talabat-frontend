# api-customer - GENERATED, DO NOT EDIT

`src/` is generated from the single `openapi/customer-api.json` document by the custom
`talabat-typescript-angular` generator. Any manual edit under `src/` will be overwritten.

From the `talabat-web` workspace root:

```bash
npm run api:generator:build
npm run api:gen:customer
npm run api:verify
npx ng build api-customer
```

Change the OpenAPI contract or generator/template sources instead of generated files. The guarded
generation launcher cleans only this library's `src/` directory; `ng-package.json`, this README,
and the library TypeScript configuration remain intact.

Generated services live under `src/api/<operation-tag>/`. Generated models live under
`src/model/<domain>/`, where the domain is calculated from all directly and transitively
referencing operation tags. Models referenced by multiple domains are emitted once under
`src/model/shared/`.
