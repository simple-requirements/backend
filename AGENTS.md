Inspect the existing repository and all applicable `AGENTS.md` files first.

Follow the existing NestJS, TypeORM, DTO, migration, exception-handling,
Swagger, and test conventions.

Implement only the scope of this work package. Do not implement later
work packages pre-emptively.

Use pnpm only. Do not use npm or npx.

Add or update tests for every acceptance criterion.

Use vitest for unit/integration tests.

Use Playwright for API tests.

Run the relevant commands, including:

- pnpm lint
- pnpm format
- pnpm build
- pnpm test:unit:coverage
- pnpm test:e2e

Do not claim success when a command fails. Fix failures caused by this
implementation and report unrelated pre-existing failures.

At the end, report:

1. files changed;
2. migrations added;
3. tests added;
4. commands run and their results;
5. assumptions made.