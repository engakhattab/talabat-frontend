# TalabatWeb

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.1.2.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Generated customer API client

`projects/api-customer/src` is disposable generated code. Never edit files in that directory by
hand. The source of truth is the single `openapi/customer-api.json` document, and all customer API
features remain in the single `projects/api-customer` Angular library.

Requirements:

- Node.js and npm versions supported by this Angular workspace
- Java 17 or newer
- Network access the first time the Maven Wrapper downloads Maven and Java dependencies

A system Maven installation is not required. Build and test the custom generator, regenerate, and
verify the client with:

```bash
npm run api:generator:build
npm run api:gen:customer
npm run api:verify
npx ng build api-customer
```

`npm run api:gen` first copies the current backend OpenAPI documents, then builds the custom
generator and regenerates the customer client. Use `api:gen:customer` when the checked-in customer
contract should be regenerated without copying contracts from the backend checkout.

The generator is in `tools/talabat-openapi-generator`. It extends OpenAPI Generator 7.11.0's
`typescript-angular` generator and is registered as `talabat-typescript-angular`. The launcher
safely removes only `projects/api-customer/src` before generation, preventing stale files while
preserving the Angular library scaffolding.

API services are grouped by their kebab-case OpenAPI tag. Models are grouped by business domain at
`model/<domain>/<model-file>.ts`. The generator builds a reverse schema-to-operation usage map and
follows schema references transitively; a model used by more than one operation tag is generated
once under `model/shared/`. For example, `CartResponse` is under `model/cart/`, while the
cross-domain `MoneyDto` is under `model/shared/`. No contract vendor extensions are required.

### Upgrading OpenAPI Generator

1. Update the version in both `openapitools.json` and
   `tools/talabat-openapi-generator/pom.xml`.
2. Inspect the new version's `TypeScriptAngularClientCodegen`, `apiFilename(...)`,
   `modelFilename(...)`, and template variables before changing the extension.
3. Run `npm run api:generator:build`; its regression fixture covers tag-based API paths,
   transitive model-domain classification, imports, barrels, enums, shared models, `204` responses,
   duplicates, and determinism.
4. Regenerate twice, run `npm run api:verify`, and build the Angular library before accepting the
   upgrade diff.

### Java and classpath troubleshooting

- Run `java -version`; Java must be on `PATH` and version 17 or newer.
- On Windows, the launcher uses `mvnw.cmd`; on Linux/macOS it runs `mvnw` through `sh`.
- The npm OpenAPI CLI's `--custom-generator` support constructs the classpath with `;` on Windows
  and `:` on Linux/macOS. Do not hardcode a classpath separator in package scripts.
- If Maven Wrapper download fails, check proxy/firewall access to `repo.maven.apache.org` and set
  standard `MAVEN_OPTS`/proxy settings as required by the environment.
- If generation reports a missing custom JAR, rerun `npm run api:generator:build` and confirm
  `tools/talabat-openapi-generator/target/talabat-openapi-generator-1.0.0.jar` exists.

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
