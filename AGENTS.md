# Rules

## Common rules

1. Inspect the existing repository and all applicable `AGENTS.md` files before making changes.
2. Follow the existing NestJS, TypeORM, Zod validation, DTO, Swagger/OpenAPI, authorization, migration, exception-handling, and testing conventions.
3. Use `pnpm` only.

   * Do not use `npm`.
   * Do not use `npx`; use `pnpm exec` when a binary must be invoked directly.
4. Use the `@/` alias for imports from `src`.
5. Implement only the requested scope or work package.

   * Do not implement later backlog items pre-emptively.
   * Do not introduce abstractions solely for hypothetical future requirements.
6. Preserve existing public API behavior unless changing that behavior is explicitly part of the task.
7. Prefer small, domain-focused changes over broad refactorings unrelated to the requested work.

## Source code documentation

Keep source code documentation concise and meaningful.

1. Document non-obvious business rules, security assumptions, invariants, algorithms, and workarounds.
2. Add concise TSDoc to exported helpers or services when their purpose, parameters, return value, or side effects are not obvious from their name and type signature.
3. Do not add comments that merely restate the code.
4. Do not add TSDoc to every trivial NestJS controller/service method solely for documentation coverage.
5. HTTP API documentation belongs primarily in Swagger/OpenAPI decorators and DTO metadata.
6. When behavior exposed through the HTTP API changes, update the corresponding Swagger/OpenAPI documentation as part of the same change.

## Code complexity metrics

Use Cyclomatic Complexity and Halstead Volume as maintainability signals, not as absolute pass/fail quality scores.

### Cyclomatic Complexity

Prefer these limits:

* Below `10` for a single function or method.
* A function above `10` should be reviewed for extraction.
* A function above `15` should normally be refactored before adding more behavior.
* Do not add new branches to an already high-complexity function without first considering extraction.

Prefer these backend extraction patterns when complexity becomes too high:

* Extract request validation into the appropriate Zod schema.
* Extract reusable domain rules into focused domain services or pure helper functions.
* Extract lifecycle/state-transition logic into dedicated services.
* Extract authorization decisions into guards or named authorization helpers.
* Extract entity-to-response conversion into mappers.
* Extract repeated persistence operations into focused private methods or domain services.
* Split a service when it is responsible for multiple distinct aggregates or workflows.
* Keep controllers thin; do not move domain complexity into controllers to reduce service metrics.

### Halstead Volume

Use these values as guidance:

* Below `1000`: usually fine.
* `1000–3000`: acceptable, but review if the file changes frequently.
* `3000–6000`: likely contains multiple responsibilities; consider extraction.
* Above `6000`: strong refactoring candidate, especially when Cyclomatic Complexity is also high.

Do not chase lower metrics by creating tiny artificial files or unnecessary indirection.

Prioritize refactoring when all three are true:

1. Halstead Volume is high.
2. Cyclomatic Complexity is high.
3. The file is frequently changed, difficult to test, or bug-prone.

### When not to refactor

Do not refactor only to satisfy a metric when:

* the code is clear and stable;
* the file is generated;
* the change would make navigation harder;
* extraction would create unnecessary indirection;
* the relevant code is outside the requested scope;
* tests are missing and the refactoring would be risky;
* the code is about to be replaced by planned work.

## NestJS architecture

### Controllers

Controllers are responsible for HTTP concerns and orchestration at the API boundary.

When creating or modifying a controller:

1. Keep controllers thin.
2. Delegate business logic and persistence to services.
3. Use the existing guards for authentication and authorization.
4. Use `ZodValidationPipe` with the appropriate Zod schema for request validation.
5. Use NestJS HTTP exceptions or exceptions produced by the service layer consistently with existing endpoints.
6. Keep route structure, status codes, and error behavior consistent with neighboring controllers.
7. Add or update Swagger decorators for:

   * operation description;
   * authentication;
   * path/query parameters;
   * success responses;
   * relevant error responses.
8. Do not duplicate domain validation in a controller if it belongs in a Zod schema or service.

### Services

Services contain application and domain behavior.

When creating or modifying a service:

1. Keep each service focused on a coherent domain or workflow.
2. Preserve domain invariants in the service layer rather than relying on clients to enforce them.
3. Prefer named helper methods or dedicated services over deeply nested conditionals.
4. Use dependency injection rather than manually constructing repositories or dependent services.
5. Return response DTOs or mapped domain results where that is the established convention.
6. Do not expose TypeORM entities directly through an API merely because it is convenient.
7. Use transactions when an operation must update multiple pieces of persistent state atomically.
8. Keep external side effects explicit and testable.

### Modules

1. Register new controllers, services, entities, configuration, and exports in the relevant feature module.
2. Prefer extending an existing domain module when the functionality belongs there.
3. Create a new module only when it represents a distinct feature/domain boundary.
4. Do not use a module as a dumping ground for unrelated providers.

## DTOs and request validation

The backend uses DTO classes for the API contract and Zod schemas for runtime request validation. Keep both representations synchronized.

When changing an API request or response:

1. Update the relevant DTO.
2. Update its Swagger decorators and examples.
3. Update the corresponding Zod schema when request validation is affected.
4. Update Zod schema tests when validation behavior changes.
5. Update controller Swagger response declarations when response behavior changes.
6. Update unit and E2E tests covering the contract.

Validation rules should:

* normalize user input only when normalization is intentional and tested;
* reject invalid input with stable, meaningful messages;
* validate the complete business constraint rather than only the TypeScript shape;
* avoid duplicating the same rule across controller, service, and schema layers.

Keep API error behavior deliberate. Do not accidentally change status codes or established error messages without adjusting the corresponding tests and consumers.

## Authorization and authentication

Authorization is a security boundary.

1. Use the existing session, administrator, and project authorization guards.
2. Keep project-scoped authorization in `src/auth/authorization`.
3. Do not duplicate authorization rules ad hoc inside controllers.
4. Service-level ownership or invariant checks are still required when they protect domain integrity rather than merely route access.
5. When adding an endpoint, explicitly determine:

   * whether authentication is required;
   * whether Administrator access is sufficient;
   * whether a project membership is required;
   * which project permission is required.
6. Add tests for both allowed and denied access when authorization behavior changes.
7. Never weaken authorization merely to simplify a test.
8. Do not trust actor/user information supplied by request bodies when authenticated server-side identity is available.
9. Preserve audit/revision actor attribution when modifying authenticated workflows.

Changes involving sessions, password reset, registration, bootstrap, email verification, account status, or authorization require particular care. Prefer explicit tests for security-sensitive edge cases rather than relying only on happy-path coverage.

## TypeORM entities and persistence

When changing persistent data:

1. Keep entity definitions and migrations consistent.
2. Define database constraints for invariants that must remain true regardless of application code.
3. Preserve existing foreign-key and cascading behavior unless the task explicitly requires changing it.
4. Avoid loading substantially more data than an operation needs.
5. Keep persistence queries readable; extract complicated query construction when it obscures domain behavior.
6. Consider transaction boundaries whenever several writes form one logical operation.
7. Do not use TypeORM schema synchronization as a replacement for migrations.

## Database migrations

Every schema change must have an explicit TypeORM migration.

1. Add a new migration for a new schema change.
2. Do not rewrite an older migration merely to make the current schema look cleaner.
3. Implement both `up` and `down` whenever the change can reasonably be reversed.
4. Make data migrations deterministic.
5. Preserve existing data unless data deletion or transformation is explicitly required.
6. When transforming existing data:

   * handle legacy rows explicitly;
   * maintain referential integrity;
   * fail clearly rather than silently producing invalid data.
7. Keep entity definitions synchronized with the resulting schema.
8. Test both the application behavior that depends on the migration and unusual legacy-data cases when applicable.
9. When practical, verify new migrations with:

   * `pnpm migration:run`;
   * `pnpm migration:revert`;
   * `pnpm migration:run`.

Do not add a migration when no persistent schema or persisted-data transformation is required.

## Requirements and revision history

Requirement lifecycle and revision history are domain-critical behavior.

When modifying requirements:

1. Preserve the lifecycle constraints represented by `RequirementStatus` and the lifecycle service.
2. Do not implement status transitions directly in unrelated controllers or helpers.
3. Preserve revision history for operations that currently produce revisions.
4. Keep revision actor, change type, change reason, and snapshots trustworthy.
5. User-edit operations that require an explicit change reason must continue to require one.
6. Lifecycle operations with deterministic server-generated reasons should not require clients to invent a reason.
7. Changes to implementation-ticket behavior must consider their effect on requirement revision history.
8. Add tests for invalid state transitions as well as successful transitions.

## Exceptions and error handling

1. Use NestJS HTTP exceptions consistently with the existing API.
2. Use `BadRequestException` for invalid operations or invalid domain input where appropriate.
3. Use `NotFoundException` when a requested resource in the applicable scope does not exist.
4. Use authorization guards/exceptions for authentication and permission failures.
5. Do not leak database errors, secrets, password hashes, tokens, or internal implementation details to clients.
6. Preserve stable API error behavior where existing E2E tests depend on it.

## Creating unit tests

Unit tests use Vitest and are colocated with the source as `*.spec.ts`.

When changing business logic:

1. Add or update tests for every changed rule and acceptance criterion.
2. Keep unit tests isolated.
3. Mock repositories, external delivery mechanisms, clocks, randomness, or other infrastructure when appropriate.
4. Prefer testing public behavior over private implementation details.
5. Cover relevant failure paths and boundary conditions, not only the happy path.
6. Add regression tests when fixing a bug.
7. If Vitest reports a test as unusually slow, investigate it when doing so is reasonable.
8. Do not weaken assertions merely to make a failing test pass.

Aim for at least `75%` unit-test coverage of code that is included in the configured coverage calculation.

If coverage is below that level:

* determine whether meaningful tests can reasonably improve it;
* add them when they protect useful behavior;
* do not create meaningless tests solely to increase the percentage;
* report the remaining coverage gap at the end of the work.

## Creating API/E2E tests

API E2E tests use Playwright and `*.e2e-spec.ts`.

1. E2E tests must exercise the real NestJS HTTP API.
2. Do not mock the backend in backend E2E tests.
3. Use the existing E2E fixtures, helpers, seed data, and authentication headers where applicable.
4. Test the observable HTTP contract:

   * status code;
   * response body;
   * persisted result;
   * authorization behavior;
   * important validation/error behavior.
5. Use unique test data when creating persistent resources.
6. Do not make E2E execution parallel unless test-data and database isolation have first been made safe for parallel execution.
7. Keep E2E tests deterministic and independent of execution order wherever practical.
8. When an endpoint changes, check all E2E specs that use that endpoint for stale expectations.

Prefer unit tests for detailed branching and domain behavior, and E2E tests for API contracts and cross-layer behavior.

## OpenAPI compatibility

The OpenAPI document is consumed by the frontend and therefore forms part of the backend's public contract.

When changing an endpoint, DTO, parameter, status code, or response:

1. Check whether the generated OpenAPI schema changes.
2. Ensure Swagger decorators correctly describe the actual runtime behavior.
3. Avoid accidental contract changes.
4. Treat renamed fields, removed fields, type changes, changed nullability, changed enum values, and changed status codes as compatibility-sensitive changes.
5. If a breaking contract change is explicitly required, report it clearly at the end of the work so the frontend client can be regenerated or updated.

## Do not touch

Do not manually modify:

* `./coverage`
* `./dist`
* `./playwright-report`
* `./test-results`
* `./vitest-json-report.json`

Also do not modify generated or ignored build/test output that may appear locally.

Do not rewrite existing database migrations unless the requested task specifically concerns repairing migration history and the consequences have been considered explicitly.

## Finish work rules

After implementation is complete:

1. Run the formatter:
   `pnpm format`
2. Run the linter:
   `pnpm lint`
3. Build the application:
   `pnpm build`
4. Run unit tests with coverage:
   `pnpm test:unit:coverage`
5. Run API/E2E tests:
   `pnpm test:e2e`
6. If a database migration was added and a suitable database is available, verify migration apply/revert/apply behavior.
7. Calculate or inspect these code-complexity metrics for materially changed production code and report noteworthy regressions:

   * Cyclomatic Complexity;
   * Halstead Volume.
8. If any formatter, linter, build, or test command modifies files, rerun the affected validation commands.
9. Do not claim success when a command fails.

   * Fix failures caused by the implementation.
   * Clearly report unrelated pre-existing failures.

At the end, report:

1. files changed;
2. migrations added or changed;
3. tests added or updated;
4. API/OpenAPI contract changes;
5. commands run and their results;
6. noteworthy complexity changes;
7. assumptions or unresolved concerns.
