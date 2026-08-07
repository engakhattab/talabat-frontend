---
name: phase-implementation-documenter
description: >
  Produces comprehensive, beginner-friendly implementation learning guides
  from uncommitted Git changes. Use after completing a project phase and
  before staging or committing the changes. Inspects tracked, untracked,
  modified, deleted, renamed, and staged files; compares them with HEAD;
  explains every new or changed code block; maps the implementation to
  specifications, tasks, and existing test evidence; and creates documentation
  without modifying application source code or executing any tests.
---

# Phase Implementation Documenter

## Purpose

Create a technically accurate, comprehensive, and beginner-friendly Markdown
learning guide for a completed implementation phase by analysing the current
Git working tree against the current HEAD commit.

This skill is intended to be used after completing a project phase and before
running `git add` or `git commit`.

The actual implementation and Git differences are the source of truth for what
was changed.

Specifications, plans, checklists, roadmaps, and task files explain the intended
behaviour, but they must not be treated as proof that the corresponding code was
actually implemented.

---

## Mandatory Operating Mode

This is a read-only implementation-analysis and documentation task.

Do not modify, fix, refactor, format, rename, move, or delete application source
files.

Do not implement missing requirements.

Do not start the next project phase.

Never run any of the following commands:

- `git add`
- `git commit`
- `git reset`
- `git restore`
- `git checkout`
- `git clean`
- `git stash`
- `git rebase`
- `git merge`
- `git cherry-pick`
- any destructive or history-changing Git command

Only create or update the documentation file explicitly requested by the user.

### Absolute test-execution prohibition

This skill is documentation-only. The implementation is expected to have been
tested before this skill is invoked.

Never execute tests of any kind, including but not limited to:

- `npm test`
- `ng test`
- `npx ng test`
- `vitest`
- `jest`
- `dotnet test`
- `pytest`
- `playwright test`
- `cypress`
- end-to-end tests
- integration tests
- unit tests
- component tests
- contract tests
- test scripts exposed through `package.json`, solution files, Makefiles, or CI helpers

Do not execute a test even when:

- the working tree looks suspicious
- a requirement appears unverified
- an existing test file was modified
- a previous report says tests passed
- a test would be quick
- running the test would make the report more certain

Instead:

- inspect test source code statically when it helps explain coverage
- inspect existing test-result artifacts or reports if they already exist
- clearly label test execution as `NOT RUN BY THIS SKILL`
- distinguish static test-code evidence from previously recorded runtime results
- never claim a test passed based only on reading its source code

Do not update:

- implementation source files
- test files
- Spec Kit task checkboxes
- requirements checklists
- specification files
- planning files
- package files
- generated files

unless the user explicitly identifies one of them as the output documentation
file.

---

## Source-of-Truth Rules

Use the following priority order:

1. Current source-code contents
2. Git differences between HEAD and the working tree
3. Test implementation and pre-existing test results already available before this skill runs
4. Phase specification and tasks
5. Architecture plans, constitution, and roadmap
6. Previous phase reports

Do not claim that a requirement was implemented merely because:

- it appears in `spec.md`
- it appears in `plan.md`
- its task checkbox is marked complete
- a previous agent said it was implemented
- a checklist passed
- a test file exists

Verify the behaviour from the actual implementation.

Do not describe unchanged code from before the current phase as code introduced
by the current phase.

Clearly distinguish between:

- code added during the current phase
- code modified during the current phase
- code deleted during the current phase
- code renamed or moved during the current phase
- pre-existing unchanged code used by the new implementation
- generated code
- documentation-only changes
- test-only changes
- configuration changes

---

## Required Project Context

Before analysing the implementation, inspect all relevant project instructions
and phase artifacts supplied by the user or present in the repository.

These can include:

- `AGENTS.md`
- `.specify/memory/constitution.md`
- the phase `spec.md`
- the phase `plan.md`
- the phase `tasks.md`
- phase checklists
- the project roadmap
- previous phase implementation reports
- root and nested `package.json` files
- `angular.json`
- TypeScript configuration files
- workspace instructions
- API-generation instructions
- relevant README files

Read only the files that are relevant to understanding the current phase.

Planning documents explain why a change was intended. The Git working tree
explains what was actually changed.

Report any difference between the intended plan and the implementation.

---

## Git Baseline Inspection

Always establish the exact Git baseline before analysing files.

Run the following safe, read-only commands where supported:

```bash
git status --short
git status
git branch --show-current
git rev-parse HEAD
git log -5 --oneline
git diff --stat HEAD
git diff --name-status HEAD
git diff --summary HEAD
git diff --numstat HEAD
git diff --find-renames HEAD
git diff --check HEAD
git diff HEAD
git diff --cached
git ls-files --others --exclude-standard
```

Use additional safe Git commands when needed, including:

```bash
git show HEAD:<relative-file-path>
git diff HEAD -- <relative-file-path>
git diff --cached -- <relative-file-path>
git ls-files --deleted
git ls-files --modified
```

Do not rely only on `git diff`.

Normal `git diff` output does not include untracked files. Every untracked path
must therefore be discovered using:

```bash
git ls-files --others --exclude-standard
```

For each untracked text file:

- read the full file
- treat every line as newly added
- include it in the changed-file inventory
- explain its complete contents when relevant

For each tracked modified file:

- inspect its current contents
- inspect its version at HEAD
- identify exact additions, removals, and replacements
- explain only the changed parts as current-phase changes

For deleted files:

- retrieve the previous contents from HEAD when possible
- explain what responsibility was removed
- explain whether another file replaced it

For renamed or moved files:

- identify both the old and new paths
- explain whether the move also changed behaviour
- do not treat an unchanged move as entirely new code

For binary files such as images, fonts, or compiled assets:

- identify the path
- report its file type
- report its approximate size
- find where it is referenced
- explain why it was added or changed
- do not pretend to perform line-by-line source analysis

---

## Complete Change Inventory

Build a complete inventory of all differences between HEAD and the current
working tree.

Group paths into:

1. New files
2. Modified files
3. Deleted files
4. Renamed or moved files
5. Staged files
6. Unstaged files
7. Untracked files
8. Generated files
9. Source-code files
10. Test files
11. Route files
12. Configuration files
13. Styling files
14. Assets
15. Documentation and specification files

Do not omit small or apparently mechanical files, including:

- route definitions
- `public-api.ts`
- index or barrel files
- exports
- tokens
- interfaces
- helper functions
- test fixtures
- mocks
- stylesheets
- configuration changes
- package-lock changes
- type declarations
- asset references
- test setup files

For every changed path, report:

- full relative path
- Git change type
- staged, unstaged, or untracked status
- architectural owner
- file category
- primary responsibility
- requirement or task that caused the change
- files it depends on
- files that depend on it

---

## File-Level Explanation

Create a dedicated section for every changed, added, removed, renamed, or moved
file.

For every file, explain the following.

### File Identity

- Full relative path
- Git change type
- Whether it is staged, unstaged, or untracked
- File category
- Architectural owner
- Main responsibility
- Why the file belongs in its current folder
- Why the responsibility was not placed in another app, feature, core library,
  shared library, or generated library

### Problem Solved

Explain:

- what was missing before the change
- which user journey the file enables
- which requirement or task it addresses
- what would remain broken or incomplete if the file did not exist

### Dependencies and Relationships

Explain:

- what the file imports
- why each important import is needed
- what imports or calls this file
- what services, stores, signals, resources, routes, guards, components, APIs,
  or utilities it interacts with
- the runtime flow entering and leaving the file
- whether the dependency direction follows project rules

### Behavioural Effect

Explain:

- compile-time effects
- runtime effects
- routing effects
- state-management effects
- HTTP effects
- security effects
- UI and accessibility effects
- test effects

---

## Code-Diff Explanation Rules

For tracked modified files:

- compare the current file with its HEAD version
- explain only additions, deletions, and changed blocks
- include enough unchanged surrounding context to make each change understandable
- never present pre-existing unchanged code as a current-phase addition

For new or untracked files:

- treat the entire file as newly introduced
- explain the complete file
- do not skip imports, exports, templates, styles, or tests

For deleted files:

- show the relevant previous code from HEAD
- explain why it was removed
- explain what replaces its behaviour, if anything
- explain the consequences of the deletion

For replaced blocks:

1. Show the previous code.
2. Show the current code.
3. Explain the behavioural difference.
4. Explain why the previous approach was insufficient.
5. Classify the change as one of:
   - feature implementation
   - architecture correction
   - bug fix
   - refactor
   - configuration change
   - test update
   - accessibility improvement
   - security improvement
   - performance improvement

Do not treat removed code as unimportant.

---

## Line-by-Line Explanation Standard

Explain every meaningful source-code line added or materially changed by the
current phase.

For each meaningful line or small contiguous block, include:

- current file line number or line range
- exact code
- what the syntax means
- why the code was added
- its compile-time effect
- its runtime effect
- what other symbols depend on it
- what would happen if it were removed or implemented incorrectly
- which requirement or task it supports

Use a table when practical:

| Line(s) | Code | Syntax and meaning | Why it was added | Dependencies and effects |
|---|---|---|---|---|

Do not skip:

- imports
- exported symbols
- interfaces
- type aliases
- injection tokens
- decorators
- providers
- dependency injection
- signal declarations
- private writable signals
- public readonly signals
- computed signals
- effects
- resources
- guards
- route definitions
- route parameters
- form models
- validation rules
- error mapping
- retry behaviour
- templates
- `@if`
- `@for`
- `@switch`
- `track` expressions
- input and output bindings
- event handlers
- accessibility attributes
- ARIA relationships
- focus behaviour
- CSS selectors
- Tailwind utilities
- safe-area styles
- tests
- test setup
- fakes
- mocks
- stubs
- spies
- assertions
- exports from public API files

Consecutive mechanical lines may be grouped only when they perform one
indivisible operation.

When grouping lines:

- display the entire grouped block
- explain every meaningful part
- do not hide logic behind a high-level summary

Avoid vague explanations such as:

- “This import is needed.”
- “This handles the logic.”
- “This displays the component.”
- “This calls the API.”
- “This validates the form.”
- “This test checks the result.”

Instead explain:

- exactly what was imported
- which symbol uses it
- what data enters the code
- what state changes
- what output is produced
- what condition causes each branch
- what observable user behaviour results
- what failure the test prevents

---

## Architecture Explanation

After the file-by-file walkthrough, explain the architecture produced by the
current phase.

Base this explanation on the actual implementation, not only on the phase plan.

Cover all relevant concepts, including:

- application shell
- layout ownership
- route ownership
- lazy-loading boundaries
- public and protected routes
- route guard order
- functional guards
- `UrlTree` redirects
- authentication state
- profile or account state
- session-level caching
- request deduplication
- server-resource loading
- mutation boundaries
- app-owned state versus shared infrastructure
- presentational components versus orchestration pages
- generated API-client boundaries
- error handling
- form architecture
- responsive design
- accessibility
- phase-scope boundaries

Use Mermaid diagrams where they improve understanding.

Include at least:

- a dependency diagram
- a route-flow diagram
- a state or runtime-flow diagram when relevant

Do not create diagrams that describe planned behaviour which is absent from the
actual code.

---

## Runtime Flow Explanations

Describe important user journeys step by step.

For each flow, explain:

1. Initial user action
2. Route matching
3. Lazy-loaded code involved
4. Guards involved
5. Services or stores involved
6. API request involved
7. Signals or resources updated
8. Template state rendered
9. Error and retry behaviour
10. Final navigation or state

Relevant flows can include:

- anonymous access to a public page
- anonymous access to a protected page
- authentication redirect and callback
- authenticated user with missing profile
- authenticated user with an existing profile
- form submission success
- form submission validation failure
- server validation failure
- network failure
- route parameter changes
- resource cancellation or stale-response prevention
- loading, error, empty, not-found, and populated states
- product or item selection
- dialog or sheet interaction
- logout
- session change
- state reset

Explain only flows supported by the actual implementation.

If a required flow is absent or incomplete, report that explicitly.

---

## Test Explanation

This section is based on **static inspection only**. Do not execute tests.

For every added or modified test file, explain:

- production behaviour protected
- test classification:
  - unit
  - component
  - integration
  - route-level
  - contract
  - end-to-end
- test setup
- providers
- fake implementations
- mocks
- stubs
- spies
- fixtures
- Arrange step
- Act step
- Assert step
- why each expectation is meaningful
- which regression the test prevents
- whether the test uses generated API contracts correctly
- important missing test coverage

Explain every meaningful test case.

Do not claim behaviour is covered merely because:

- a test file exists
- the test renders the component
- the test checks static text
- a task claims testing was completed

Create a test-coverage matrix:

| Requirement | Production file | Test file | Test case | Coverage status |
|---|---|---|---|---|

Allowed coverage statuses:

- Fully covered
- Partially covered
- Production code exists but no test
- Test exists but does not prove requirement
- Not implemented
- Unable to verify
- Not applicable

---

## Requirement and Task Traceability

Read the phase requirements and task files.

Create a traceability matrix:

| Requirement or task | Implementing file(s) | Relevant symbol(s) | Test evidence | Verification evidence | Status |
|---|---|---|---|---|---|

Allowed statuses:

- Implemented and tested
- Implemented but not tested
- Partially implemented
- Planned but not implemented
- Unable to verify
- Not applicable

Verify task completion from source code and any pre-existing test evidence already
available in the repository or supplied by the user. Never run tests to create new
verification evidence.

Do not automatically trust:

- checked task boxes
- checklist results
- prior analysis summaries
- implementation reports produced before the current Git inspection

Clearly report:

- requirements fully implemented
- requirements partially implemented
- requirements not implemented
- requirements implemented without tests
- requirements that require manual verification
- requirements that cannot be verified locally

---

## Beginner Teaching Standard

Write for a reader who is new to the framework and project architecture.

For every important technical concept:

1. Give a simple definition.
2. Explain why the project uses it.
3. Reference the actual file and symbol demonstrating it.
4. Explain how it interacts with other parts of the application.
5. Explain what common beginner mistake it prevents.

Relevant concepts can include:

- standalone components
- lazy-loaded routes
- `loadChildren`
- `loadComponent`
- functional route guards
- `CanActivateFn`
- `UrlTree`
- dependency injection
- `inject()`
- signals
- writable signals
- readonly signals
- computed signals
- effects
- resources
- `httpResource`
- route parameters
- Signal Forms
- validation schemas
- generated API services
- HTTP interceptors
- application errors
- `@if`
- `@for`
- `track`
- input signals
- output signals
- root-provided services
- CDK overlays
- dialogs
- focus trapping
- ARIA attributes
- safe-area CSS
- zoneless change detection
- Vitest tests
- fakes, mocks, and spies

Do not explain concepts that are unrelated to the actual changed code.

---

## Security Review

Inspect whether the current phase preserves the project's security boundaries.

Verify relevant rules such as:

- tokens are not stored by application code in `localStorage`
- tokens are not stored by application code in `sessionStorage`
- generated API clients were not manually modified
- bearer tokens are attached only to the configured API origin
- public routes remain public
- protected routes require authentication
- route guards do not replace backend authorization
- internal return URLs are validated
- open redirects are not introduced
- guards return `UrlTree` rather than performing unsafe imperative navigation
- raw protocol errors are not displayed
- tokens are never logged or rendered
- identity credentials are not collected by the SPA
- API URLs are not hardcoded
- client-side state is not treated as authorization authority

For every security rule, report:

- PASS
- FAIL
- PARTIAL
- NOT APPLICABLE
- UNABLE TO VERIFY

Explain the evidence supporting the result.

Do not fix violations. Document them clearly.

---

## Dependency-Boundary Review

Verify the actual dependency direction.

Check relevant project rules such as:

- core libraries do not import application features
- shared libraries remain domain-neutral
- generated API libraries depend on nothing in the application
- application features do not import another feature's internal implementation
- presentational shared components do not inject domain services
- feature code does not inject `HttpClient` directly
- generated clients are used for API communication
- runtime API configuration is used instead of hardcoded URLs
- application-owned domain state remains in the application
- writable signals are private
- public state is readonly
- later-phase behaviour was not implemented prematurely
- prices, totals, permissions, or server state are not fabricated client-side

Produce a dependency diagram using Mermaid.

Report every boundary violation with its file path and affected import.

---

## Safe Verification — Documentation-Only

This skill must not execute tests.

Use only safe, read-only inspection commands needed to understand the current
implementation and Git baseline.

Allowed examples include:

```bash
git status --short
git status
git branch --show-current
git rev-parse HEAD
git log -5 --oneline
git diff --stat HEAD
git diff --name-status HEAD
git diff --summary HEAD
git diff --numstat HEAD
git diff --find-renames HEAD
git diff --check HEAD
git diff HEAD
git diff --cached
git ls-files --others --exclude-standard
git show HEAD:<relative-file-path>
```

You may inspect project configuration and scripts to explain how the project is
normally tested or built, but do not execute test commands.

### Test evidence rules

For tests, report one of:

- `NOT RUN BY THIS SKILL — source inspected only`
- `PRE-EXISTING PASS EVIDENCE — supplied by user/repository`
- `PRE-EXISTING FAIL EVIDENCE — supplied by user/repository`
- `NO RUNTIME EVIDENCE AVAILABLE`

Never transform static inspection into a claim that a test passed.

If pre-existing test output exists, record:

- where the evidence came from
- exact command if it is recorded
- result
- whether the result predates the current documentation run
- whether the result appears relevant to the current diff

### Build execution

Do not run a build automatically as part of this documentation skill.

If build evidence already exists, report it as pre-existing evidence.

If the user explicitly asks this skill to run a build in the same request, that
permission applies only to the build and does not permit tests.

Separate verification into:

1. Statically verified from source/Git
2. Pre-existing test/build evidence
3. Manual verification evidence supplied by the user
4. Still unverified
5. Unable to verify

The absence of newly executed tests is expected behavior for this skill and must
not be treated as a defect in the documentation process.

## Quality and Risk Review

Inspect changed code for:

- runtime bugs
- compile-time issues
- redirect loops
- race conditions
- duplicate requests
- stale responses
- missing request cancellation
- missing session reset
- state leaking between users
- unsafe casts
- use of `any`
- non-null assertions
- manual subscriptions in components
- direct `HttpClient` usage
- duplicated generated DTOs
- hardcoded URLs
- incorrect error-code handling
- raw HTTP-status branching
- inaccessible controls
- missing labels
- broken ARIA relationships
- missing focus handling
- missing keyboard interaction
- touch targets that are too small
- mobile overflow
- safe-area problems
- phase-scope leakage
- client-authoritative server data
- missing tests
- weak tests
- unused imports
- dead code
- duplicated logic
- TODO comments
- FIXME comments
- skipped or disabled tests
- configuration mistakes

Classify every finding as:

- Critical
- High
- Medium
- Low
- Informational

For each finding, include:

- ID
- severity
- affected file and symbol
- explanation
- evidence
- user or technical impact
- recommended future action

Do not modify source code to resolve findings during this documentation task.

---

## Documentation Output Standard

Create or update only the Markdown output file specified by the user.

The report should normally include:

# Phase Implementation Learning Guide

## 1. Purpose of the Phase
## 2. Starting Point Before the Phase
## 3. Git Baseline and Analysis Method
## 4. Complete Change Summary
## 5. New Files
## 6. Modified Files
## 7. Deleted, Renamed, or Moved Files
## 8. File-by-File Detailed Walkthrough
## 9. Line-by-Line Code Explanation
## 10. Application Architecture After the Phase
## 11. Routing and Navigation
## 12. State and Data Flow
## 13. Forms and Validation
## 14. User Interface Implementation
## 15. Error and Async States
## 16. Accessibility and Responsive Design
## 17. Runtime User Flows
## 18. Test Code and What Each Test Is Intended to Prove
## 19. Requirement and Task Traceability
## 20. Security Boundary Review
## 21. Dependency Boundary Review
## 22. Static Verification and Pre-existing Evidence
## 23. Problems, Risks, and Missing Coverage
## 24. Manual Testing Guide
## 25. Concepts a Beginner Must Learn
## 26. Final Phase Result
## 27. What the Next Phase Will Add
## 28. Appendix A — Full Changed-File Inventory
## 29. Appendix B — Git Diff Statistics
## 30. Appendix C — Symbols Added or Changed
## 31. Appendix D — Unverified Assumptions

Adapt section names to the specific phase without reducing the required depth.

Include tables, Mermaid diagrams, code snippets, and file references where they
improve understanding.

---

## Writing Style

Write in clear English unless the user requests another language.

Assume the reader is a complete beginner, but preserve technically accurate
terminology.

For each technical term:

1. Explain its simple meaning.
2. Explain why it is used in this project.
3. Reference the actual file and symbol.
4. Explain how it interacts with the rest of the application.

Do not write a shallow summary.

Do not omit code merely because it looks repetitive.

Do not hide:

- pre-existing failed test evidence
- incomplete requirements
- missing manual verification
- architecture deviations
- security issues
- undocumented assumptions
- untracked files
- deleted code

Avoid unsupported praise such as:

- “The implementation is perfect.”
- “Everything is fully compliant.”
- “All requirements are complete.”

Use evidence-based language such as:

- “The code implements…”
- “The test verifies…”
- “This could not be verified because…”
- “The specification requires…, but the implementation currently…”
- “The production build passed using…”
- “Manual browser verification is still required for…”

---

## Final Console Summary

After writing the requested Markdown document, print a concise summary containing:

- report file path
- current branch
- baseline HEAD commit
- number of new files
- number of modified files
- number of deleted files
- number of renamed or moved files
- number of staged files
- number of unstaged files
- number of untracked files
- total added lines
- total deleted lines
- read-only inspection commands run
- test execution: `NOT RUN BY THIS SKILL`
- pre-existing test evidence found, if any
- pre-existing build evidence found, if any
- requirements fully implemented
- requirements partially implemented
- requirements not implemented
- requirements unable to verify
- findings by severity
- confirmation that no application source file was modified
- confirmation that no destructive Git command was run
- confirmation that `git add` was not run
- confirmation that `git commit` was not run
- confirmation that no tests were executed
- confirmation that no build was executed unless explicitly requested by the user
- confirmation that the next project phase was not started

Stop after producing the documentation file and console summary.
