# Product backlog: current not fully covered requirements

## Scope

This backlog was revised against the latest uploaded frontend and backend on 2026-09-12 and updated after lifecycle/revision conformance work. It reflects the current source tree rather than older backend-only inspection notes. The requirements catalogue remains authoritative; this file tracks only work that is still incomplete or intentionally deferred.

The current implemented scope is:

- local account registration, verification, bootstrap Administrator registration, login, logout, password reset, memory-only SPA session handling, backend session hashing/expiry, user/session administration, existing project membership administration, and demo/E2E seed accounts;
- Administrator project administration;
- project-scoped Requirements Engineer, Developer, and Viewer authorization;
- basic projects, categories, requirements, review comments/replies/resolution, approval/rejection, obsolescence UI, implementation tickets, and sidebar/action-bar/account-menu UI.

The current source tree does **not** implement a metrics subsystem, requirement-link subsystem, export/import subsystem, traceability matrix, baselines, attachments, tags, verification criteria, requirement-change requests, personal review-task assignment, or the frontend revision-history/diff view. The backend does expose finalized revision-history and revision-comparison endpoints.

## Role summary

| Role                  | Scope                 | Required privileges                                                                                                                                                                                                                                                                                                             |
| --------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Administrator         | Global administrative | Target model: dedicated administration-only account role. Manages users, sessions, projects, memberships and administrative project settings; sees only project name, category names/counts, requirement count, memberships and administrative settings. Never becomes a project member and never accesses requirement content. |
| Requirements Engineer | Project-scoped        | Single fixed account role used for every project membership. Can read assigned project content; create/edit categories and requirements; review/comment/resolve; perform lifecycle transitions; and manage implementation tickets according to lifecycle rules.                                                                 |
| Developer             | Project-scoped        | Single fixed account role used for every project membership. Can read assigned project content and create/update/remove implementation tickets while requirements are approved; cannot edit requirements/categories, review, or change lifecycle state.                                                                         |
| Viewer                | Project-scoped        | Single fixed account role used for every project membership. Read-only access to assigned project content, including lifecycle metadata, reviews, tickets and revisions.                                                                                                                                                        |

## High-priority implementation mismatches

The previously listed lifecycle/revision P0 mismatches and the Administrator architecture migration have been resolved in the current source. The remaining high-priority work is first-release functional completion plus final release verification:

- requirement deletion/recycle-bin behavior is no longer exposed by the current backend;
- rejected requirements are terminal/read-only in the backend;
- draft requirements intentionally cannot become obsolete; drafts may only be approved or rejected;
- implementation-ticket create/update/remove intentionally creates a requirement revision and ticket snapshots remain part of revision history/comparison;
- finalized revision actor/change-type/change-reason metadata and clean `/revisions` plus `/revisions/compare` backend endpoints exist;
- substantive requirement content/metadata/category/owner edits require an explicit non-empty user-entered `changeReason`, while lifecycle and ticket operations use deterministic server-derived reasons.

The Administrator architecture defined by WP2-WP6 is implemented: one-account/one-role authorization, Administrator membership prohibition, content denial, dedicated Administrator APIs/workspace, and removal of the obsolete mixed-workspace navigation are present. Revision work is now limited to the frontend history/diff presentation and generated-client synchronization when OpenAPI generation is available.

## Recently covered / remove from old backlog

| Requirement(s)                                        | Current status                                   | Reason                                                                                                                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| US-WF-001, US-REQ-003C/003D/003E                      | Covered for current lifecycle scope              | Requirements are retained, rejected requirements are terminal/read-only, drafts approve/reject only, and obsolescence is limited to approved/implemented requirements.                            |
| US-VER-001 revision core                              | Covered for current backend scope                | Current-plus-archive storage, trusted revision actor metadata, explicit edit reasons, ticket-driven revisions/snapshots, and ordered history are implemented.                                     |
| US-VER-002 backend endpoints                          | Covered for backend stages                       | `/revisions` and `/revisions/compare` exist; frontend history/diff presentation remains.                                                                                                          |
| US-SEC-001, US-SEC-002, US-SEC-005 through US-SEC-012 | Covered for current architecture scope           | One-account/one-role enforcement, Administrator membership prohibition, administration-only visibility, dedicated Administrator APIs/workspace, and project-scoped authorization are implemented. |
| User administration frontend                          | Covered                                          | User/session administration is hosted in the dedicated Administrator workspace and uses the one-account/one-role model.                                                                           |
| Project membership administration frontend            | Covered                                          | Membership management is under Administrator `Projects`, excludes Administrator accounts, and uses each account's fixed project role.                                                             |
| Public account UI shell                               | Covered by new US-UI-001/002 scope               | Login, registration, and reset pages now share spacing/button/link behavior.                                                                                                                      |
| Account menu UI shell                                 | Covered                                          | Cog-wheel menu and Logout exist; Administrator navigation is provided exclusively by the dedicated workspace.                                                                                     |
| US-CAT-005                                            | Partially covered, no longer 0%                  | Category edit endpoint and frontend edit UI exist. Remaining concern is whether category key/type edits should be controlled after use.                                                           |
| US-PRJ-001/002                                        | Covered for current project-administration scope | Administrator project management uses summary-only dedicated APIs/workspace while project-scoped accounts remain membership-filtered.                                                             |

## Administrator architecture migration backlog

| Work package | Scope                                           | Acceptance target                                                                                                                                                                                                                                            |
| ------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| WP2          | Backend role model — complete                   | Every account has exactly one role; Administrator accounts cannot have project memberships; project-scoped accounts use one fixed role for all memberships; backend authorization denies Administrator project-content access.                               |
| WP3          | Administrator REST API — complete               | Administrator-specific project summary/admin endpoints expose only project name, category names/counts, requirement count, memberships, and administrative project settings; project create/rename/delete and membership administration are available there. |
| WP4          | Administrator workspace — complete              | Administrator login opens a dedicated workspace whose initial sidebar contains `Users & Sessions` and `Projects`; project-scoped roles keep the project workspace.                                                                                           |
| WP5          | Administrator project administration — complete | `Projects` provides project creation, rename, deletion, membership administration, summary metadata, and administrative project settings without exposing requirement/category detail content.                                                               |
| WP6          | Frontend cleanup — complete                     | Remove obsolete Administration menu navigation, old mixed-workspace administration routes/components, and stale permission assumptions.                                                                                                                      |
| WP7          | Final verification                              | Regenerate derived API clients as required, run backend/frontend unit and E2E suites, verify OpenAPI contracts, migrations and authorization boundaries, and remove dead code.                                                                               |

## Remaining functional backlog

| Area                                       | Requirement keys                                                                                                                          |              Current coverage | Remaining work                                                                                                                                                                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Requirement key stability/reclassification | US-ID-002, US-ID-004, US-ID-007, US-ID-008, US-ID-009, US-ID-010                                                                          |                       Partial | Preview visible keys, controlled reclassification, permanent previous-key aliasing/search, and import/export round-trip behavior are missing.                                                                                    |
| Category lifecycle                         | US-CAT-005, US-CAT-006, US-CAT-007                                                                                                        |                       Partial | Category editing exists, but category deactivation and controlled key/type changes after use are not implemented.                                                                                                                |
| Requirement fields/search                  | US-REQ-004, US-REQ-006, US-REQ-007, US-REQ-008, US-VIEW-001, US-VIEW-002, US-VIEW-003, US-VIEW-004, US-VIEW-005, US-VIEW-006, US-VIEW-007 |                  Partial/none | Missing full-text search, category-key/priority/metric/link filters, no-owner list, criticality, tags, attachments, saved views, graph view, and document/read view.                                                             |
| Metrics                                    | US-MET-001 through US-MET-024                                                                                                             | Not covered in current source | No metric model, API, parser/linking, rendering, validation, usage view, deactivation, impact analysis, or metric export support exists in the inspected source.                                                                 |
| Requirement links                          | US-REF-001 through US-REF-016                                                                                                             | Not covered in current source | No structured requirement-link model/API/UI/export support exists in the inspected source.                                                                                                                                       |
| Review assignment/tasks                    | US-WF-006                                                                                                                                 |                   Not covered | Review comments/replies/resolution and approve/reject exist, but assigning review tasks to named users and personal pending-review lists are missing.                                                                            |
| Revision history/comparison UI             | US-VER-002                                                                                                                                |                       Partial | Backend current-plus-archive history, actor metadata, ticket snapshots, `/revisions`, and `/revisions/compare` are implemented. Remaining work is generated-client synchronization plus the frontend revision-history/diff view. |
| Change requests                            | US-VER-003, US-VER-004                                                                                                                    |                   Not covered | No controlled change-request workflow for approved requirement changes exists.                                                                                                                                                   |
| Import/export                              | US-IO-001 through US-IO-007, US-EXP-\* if retained                                                                                        | Not covered in current source | No CSV/Excel/JSON/YAML/XML/ReqIF/GitHub Markdown/AsciiDoc import/export controllers or adapters exist in the inspected source. PDF remains out of current scope unless explicitly reintroduced.                                  |
| Traceability and impact analysis           | US-TRC-001 through US-TRC-003, US-REF-013, US-MET-015, US-MET-017, US-MET-020                                                             |                   Not covered | No traceability matrix, missing-traceability analysis, link-aware impact analysis, or baseline snapshots exist.                                                                                                                  |
| Baselines/structure                        | US-STR-001 through US-STR-004                                                                                                             |                   Not covered | Parent-child hierarchy, packages/modules, baselines, and baseline comparison are missing.                                                                                                                                        |
| Verification/validation                    | US-VAL-001 through US-VAL-005                                                                                                             |                   Not covered | No verification criteria, verification status, verification evidence, test coverage model/report, or NFR-specific measurable verification criteria exists.                                                                       |
| Integrations                               | US-INT-001 through US-INT-004                                                                                                             |                   Not covered | No issue-system, commit/MR, test-management, or webhook/synchronization integration exists.                                                                                                                                      |

## Catalogue revisions made

- Established one-account-one-role architecture: every account is exactly Administrator, Requirements Engineer, Developer, or Viewer; people needing multiple roles use separate accounts.
- Replaced Administrator global project-content read access with administration-only project-summary visibility.
- Defined the dedicated Administrator workspace (`Users & Sessions`, `Projects`) and removed the account-menu `Administration` navigation requirement.
- Clarified that Administrator accounts never receive project memberships and project-scoped accounts use one fixed role for all memberships.

- Added explicit frontend UI requirements US-UI-001 through US-UI-004 for public account forms, login links, account menu behavior, and systemwide hover styling.
- Clarified that `Project Manager` and `Tester` in story text are stakeholder personas, not current authorization roles.
- Clarified that current project creation privileges belong to Administrator.
- Added a conformance-review section to the requirements catalogue so mismatches are visible instead of hidden in backlog percentages.
- Revised lifecycle semantics so drafts may only be approved or rejected; obsolescence begins only after approval.
- Confirmed implementation-ticket changes as revision-producing operations with historical ticket snapshots.
- Finalized change-reason policy: substantive requirement edits require explicit user reasons; lifecycle and ticket reasons are derived server-side.

## Recommended next work packages

1. **Revision history/diff UI**: complete the remaining frontend stage of US-VER-002.
2. **First-release functional completion**: metrics, requirement links, search/views, review assignment tasks, and export architecture.
3. **Category/identity controls**: controlled category lifecycle and requirement reclassification/aliasing.
4. **WP7 – Final verification**: migrations, generated-client synchronization, backend/frontend unit + E2E, OpenAPI verification, authorization boundaries, and dead-code cleanup.

## WP1 status

WP1A established the new Administrator architecture. WP1B completed the catalogue/backlog consistency pass. Implementation proceeds with WP2 through WP7 as defined above.

## Continuation handoff — 2026-09-18

This section is the continuation handoff for future implementation chats. If older scheduling/status text elsewhere in this backlog conflicts with this section, use this section for execution planning while continuing to treat `work/requirements.md` as the authoritative product specification.

### Repository and delivery workflow

- Repository roots on the user's machine are `/home/node/backend` and `/home/node/frontend`.
- Every implementation delivery should use the same three filenames: `backend.patch`, `frontend.patch`, and `apply-patches.sh`.
- `apply-patches.sh` must target the repository roots above, preflight applicable patches with `git apply --check`, skip empty/already-applied patches, and avoid partial application when a preflight fails.
- Patches should be repository-relative (`src/...`, `work/...`) because the wrapper applies them with `git -C /home/node/backend` or `git -C /home/node/frontend`.
- New files must be included in Git before creating a commit diff; otherwise `git diff HEAD~1 HEAD` will not contain them. This previously caused `_Buttons.scss` and `_Icons.scss` to be omitted from a patch.
- Both repositories contain mandatory `AGENTS.md` files. Read the applicable file before modifying either repository.
- Frontend generated/derived files such as `src/api/generated`, `coverage`, Playwright reports, generated BDD tests, and `vitest-json-report.json` must not be manually edited.
- When the backend OpenAPI contract changes, regenerate the frontend API client through the normal `pnpm api:generate` workflow rather than editing generated Orval output.

### Completed correctness and architecture work

- **WP-A — Lifecycle Integrity: complete.** Generic requirement PATCH cannot approve/reject; dedicated review decisions enforce review invariants. Approved content edits remain `approved`, preserve approval metadata, and create `content_changed` revisions with explicit change reasons. Backend unit and PostgreSQL E2E tests were reported green by the user after application.
- **WP-B — Project deletion/retention semantics: complete.** Project deletion is allowed only for projects with zero requirements. Requirement-to-project deletion uses `RESTRICT`, preventing cascading destruction of retained requirement history. The frontend disables `Delete project` when `requirementCount > 0`.
- **WP-C — Domain/authorization conformance regression coverage: complete.** API-level conformance coverage was added without changing WP-B files.
- **WP-D — Administrator architecture reconciliation: complete.** One-account/one-role, Administrator membership prohibition, Administrator project-content denial, dedicated Administrator APIs/workspace, and cleanup of the old mixed Administration navigation are implemented.
- **Frontend real-backend E2E retention regression: fixed in the current handoff.** The E2E reset helper must never try to delete projects that contain retained requirements. It deletes only zero-requirement projects; scenarios that create requirements use uniquely named persistent projects and isolate themselves by the created project id. Project-list assertions tolerate unrelated retained projects. The stale user-administration E2E expectation for `@username` in the user detail view was also removed because that field was intentionally removed from the detail layout. The uploaded failing report showed 31 scenarios blocked by the prohibited project deletion and one stale user-detail assertion.
- **WP7 remains the final verification package**, not a place to defer known feature work. It must eventually cover API regeneration, backend/frontend unit + E2E, migrations, OpenAPI contracts, authorization boundaries, and dead-code cleanup.

### Administrator workspace — current behavior

- Administrator workspace navigation contains expandable `Users & Sessions` and `Projects` sections. Sidebar icons use the normal workspace sizing. Users/projects appear as children and route to their detail views.
- User overview is a full-width table showing user, status, role, creation time, email-verification time, logged-in presence, and account/session actions. Physical user deletion is intentionally absent because accounts are retained/deactivated by requirements.
- User detail no longer contains a Sessions history section or a separate role dropdown. The Role metadata value opens the role-change dialog.
- Role-change workflow: an active logged-out target account is temporarily deactivated before role editing and restored after the dialog closes; a logged-in target cannot enter that workflow and receives an error toast. A previously pending/deactivated account retains its prior state. Promotion to Administrator is blocked while project memberships exist.
- The signed-in Administrator cannot deactivate their own account or revoke their own session from administration; they must use the normal account-menu Logout action.
- Project overview is a full-width table. Project detail has separate summary, Categories, Ticket URL template, and Project memberships panels.
- Category administration summary shows each category and its requirement count.
- Project actions (`New project`, `Rename project`, conditional `Delete project`, `Add membership`) are in the shared ActionBar. `Add membership` opens a dialog. Membership removal is an icon action.

### Frontend SCSS/design-system restructuring

The frontend styling review intentionally borrows Bulma's compositional principle (base class plus stackable modifiers) without adding Bulma as a dependency; PrimeReact remains the UI component library.

Completed restructuring steps:

1. **Buttons and icons — complete.** Shared `src/styles/_Buttons.scss` and `src/styles/_Icons.scss` provide composable classes such as `ui-button`, visual modifiers (`--primary`, `--outline`, `--danger`, `--ghost`, `--transparent`), context/size modifiers (`--action`, `--dialog`, `--form`), and composition modifiers (`--icon-only`, `--with-icon`). Repeated button-style mixins were removed. `package.json` includes `test:pages` (`vitest run test/pages`).
2. **Panels and native tables — complete.** Shared `src/styles/_Panels.scss` and `src/styles/_Tables.scss` centralize panel surfaces/layout modifiers and native-table wrapper/cell/header/action patterns. Administration tables/panels, category/requirement list/form/detail panels, requirement ticket detail tables, and implementation-ticket tables are migrated to the shared classes. PrimeReact DataTable-specific mixins remain because they are a separate low-duplication integration layer.
3. **Forms and dialogs — complete.** Shared `src/styles/_Forms.scss` and `src/styles/_Dialogs.scss` now own reusable field, control, message, form-action, dialog shell/header/content/title/message/action patterns. Project/category/requirement forms and the project, membership, role, lifecycle, review, category-delete, unsaved-navigation, and implementation-ticket dialogs use the shared classes. The obsolete form/dialog mixins were removed from `_UiMixins.scss`.
4. **Public account pages — complete.** Shared `src/styles/_PublicAccount.scss` centralizes the Login/PublicAccount/Bootstrap page shell, card widths, form controls, public-account buttons/loading state, action links, validation text, and feedback messages. The old page-specific Login/PublicAccount/Bootstrap SCSS files are removed.
5. **Token cleanup — complete.** Repeated uses of the established spacing scale now use `--ui-space-*` tokens. Repeated non-spacing UI constants now have focused semantic tokens for border width, focus-ring width, button press offset, and standard control inline padding. Feature-specific widths/heights and genuinely one-off dimensions remain local instead of being promoted into global tokens.

The five-step frontend SCSS/design-system restructuring is complete. There is no remaining styling-refactor step in this sequence. Future styling work should preserve the established compositional `ui-*` primitives and only add shared tokens/classes when there is demonstrated reuse.

Do not replace feature-specific BEM classes wholesale. Shared `ui-*` classes should own reusable visual primitives; feature SCSS should retain feature-specific layout, widths, grids, and exceptional states.

### Product work still outstanding after the styling refactor

The styling work does not replace product backlog implementation. The next product packages remain:

1. **WP-E / US-VER-002 frontend stage:** revision-history and revision-comparison UI using the already implemented backend `/revisions` and `/revisions/compare` endpoints. Generated frontend API synchronization must be verified/regenerated as needed.
2. **WP-F first-release completion**, processed as independent subpackages: F1 Metrics; F2 structured Requirement Links; F3 Search/Filtering/Views; F4 Review Assignment Tasks; F5 Export architecture/formats.
3. **WP-G Category/Requirement identity controls:** category deactivation/stability, controlled reclassification, permanent previous-key aliases/search, and related identity rules.
4. **WP7 final verification** after known functionality is complete.

The earlier exploratory implementation of WP-E/F in an assistant working tree was never delivered and must **not** be treated as part of the user's source. Only applied patches/user-provided current source count as implemented.

### Validation/environment notes

- The user can run backend PostgreSQL E2E tests locally; the assistant environment generally cannot because no PostgreSQL service is available. Do not interpret unexecuted E2E as passing.
- `pnpm` may be unavailable in the assistant runtime even when the uploaded dependency tree exists. When repository binaries are available, direct execution of those exact binaries has been accepted by the user as a fallback. Never use `npm`/`npx` in the frontend repository because `AGENTS.md` forbids them.
- The frontend full Vitest suite has sometimes taken longer than the execution window even while continuously reporting passes. Distinguish targeted/build validation from complete-suite completion rather than overstating results.
- Frontend E2E fixtures run against persistent backend state. Do not restore the old destructive `resetTestBackend()` behavior: projects with requirements are intentionally undeletable. New retained-data scenarios should create a unique project and navigate/assert through its id or resolved unique name instead of assuming the database can be emptied between scenarios.
- E2E follow-up on 2026-09-18: `requirements.steps.ts` derives its project type from `createPersistentTestProject` (avoiding the `@typescript-eslint/consistent-type-imports` lint failure), and `resetTestBackend()` clears logical-to-unique project-name aliases between scenarios. An intermediate Playwright run reached 30/39 passing; after fixing stale approval/setup and user-detail assertions, the latest reported run reached 35/39. The remaining four failures were stale semantic locators: Administrator section navigation uses the expandable `Projects` button, and Administrator project rows live in the table captioned `All projects` rather than in an `Administrative project list` region. Project and membership E2E steps now target those current accessible semantics. Permission fixtures continue to use the dedicated `/review/approve` endpoint, and project administration assertions accept the post-create/post-rename project-details route. These are E2E compatibility fixes for already-intended production behavior; do not restore generic PATCH approval, the nonexistent administration-list region, or old button-based project-row locators.
- The user reported all backend unit and E2E tests green after WP-A and subsequent backend application checkpoints.
