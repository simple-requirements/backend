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

| Role | Scope | Required privileges |
| --- | --- | --- |
| Administrator | Global administrative | Target model: dedicated administration-only account role. Manages users, sessions, projects, memberships and administrative project settings; sees only project name, category names/counts, requirement count, memberships and administrative settings. Never becomes a project member and never accesses requirement content. |
| Requirements Engineer | Project-scoped | Single fixed account role used for every project membership. Can read assigned project content; create/edit categories and requirements; review/comment/resolve; perform lifecycle transitions; and manage implementation tickets according to lifecycle rules. |
| Developer | Project-scoped | Single fixed account role used for every project membership. Can read assigned project content and create/update/remove implementation tickets while requirements are approved; cannot edit requirements/categories, review, or change lifecycle state. |
| Viewer | Project-scoped | Single fixed account role used for every project membership. Read-only access to assigned project content, including lifecycle metadata, reviews, tickets and revisions. |

## High-priority implementation mismatches

The previously listed lifecycle/revision P0 mismatches have been resolved or reclassified by the revised requirements. The remaining high-priority mismatch is the Administrator architecture migration defined by WP2-WP6:

- requirement deletion/recycle-bin behavior is no longer exposed by the current backend;
- rejected requirements are terminal/read-only in the backend;
- draft requirements intentionally cannot become obsolete; drafts may only be approved or rejected;
- implementation-ticket create/update/remove intentionally creates a requirement revision and ticket snapshots remain part of revision history/comparison;
- finalized revision actor/change-type/change-reason metadata and clean `/revisions` plus `/revisions/compare` backend endpoints exist;
- substantive requirement content/metadata/category/owner edits require an explicit non-empty user-entered `changeReason`, while lifecycle and ticket operations use deterministic server-derived reasons.

The Administrator architecture is now authoritative in the requirements but is not yet fully implemented. WP2-WP6 therefore remain high-priority architecture work. Separate revision work is primarily frontend history/diff presentation and generated-client synchronization.

## Recently covered / remove from old backlog

| Requirement(s) | Current status | Reason |
| --- | --- | --- |
| US-WF-001, US-REQ-003C/003D/003E | Covered for current lifecycle scope | Requirements are retained, rejected requirements are terminal/read-only, drafts approve/reject only, and obsolescence is limited to approved/implemented requirements. |
| US-VER-001 revision core | Covered for current backend scope | Current-plus-archive storage, trusted revision actor metadata, explicit edit reasons, ticket-driven revisions/snapshots, and ordered history are implemented. |
| US-VER-002 backend endpoints | Covered for backend stages | `/revisions` and `/revisions/compare` exist; frontend history/diff presentation remains. |
| US-SEC-001, US-SEC-002, US-SEC-005 through US-SEC-012 | Partially covered; architecture migration required | Authentication/session foundations exist, but the new one-account-one-role model, Administrator membership prohibition, administration-only visibility, and dedicated Administrator workspace still require implementation. |
| User administration frontend | Partially covered | User/session administration exists, but it must move into the dedicated Administrator workspace and adopt one-account-one-role administration. |
| Project membership administration frontend | Partially covered | Membership management exists, but must enforce one fixed project role per account, exclude Administrator accounts, and move under Administrator `Projects`. |
| Public account UI shell | Covered by new US-UI-001/002 scope | Login, registration, and reset pages now share spacing/button/link behavior. |
| Account menu UI shell | Partial | Cog-wheel menu and Logout exist. The obsolete `Administration` navigation entry must be removed when the dedicated Administrator workspace is introduced. |
| US-CAT-005 | Partially covered, no longer 0% | Category edit endpoint and frontend edit UI exist. Remaining concern is whether category key/type edits should be controlled after use. |
| US-PRJ-001/002 | Partial; architecture migration required | Project creation/listing exists, but Administrator listing must become summary-only and move to the dedicated Administrator API/workspace while project-scoped accounts remain membership-filtered. |

## Administrator architecture migration backlog

| Work package | Scope | Acceptance target |
| --- | --- | --- |
| WP2 | Backend role model | Every account has exactly one role; Administrator accounts cannot have project memberships; project-scoped accounts use one fixed role for all memberships; backend authorization denies Administrator project-content access. |
| WP3 | Administrator REST API | Administrator-specific project summary/admin endpoints expose only project name, category names/counts, requirement count, memberships, and administrative project settings; project create/rename/delete and membership administration are available there. |
| WP4 | Administrator workspace | Administrator login opens a dedicated workspace whose initial sidebar contains `Users & Sessions` and `Projects`; project-scoped roles keep the project workspace. |
| WP5 | Administrator project administration | `Projects` provides project creation, rename, deletion, membership administration, summary metadata, and administrative project settings without exposing requirement/category detail content. |
| WP6 | Frontend cleanup | Remove obsolete Administration menu navigation, old mixed-workspace administration routes/components, and stale permission assumptions. |
| WP7 | Final verification | Regenerate derived API clients as required, run backend/frontend unit and E2E suites, verify OpenAPI contracts, migrations and authorization boundaries, and remove dead code. |

## Remaining functional backlog

| Area | Requirement keys | Current coverage | Remaining work |
| --- | --- | ---: | --- |
| Requirement key stability/reclassification | US-ID-002, US-ID-004, US-ID-007, US-ID-008, US-ID-009, US-ID-010 | Partial | Preview visible keys, controlled reclassification, permanent previous-key aliasing/search, and import/export round-trip behavior are missing. |
| Category lifecycle | US-CAT-005, US-CAT-006, US-CAT-007 | Partial | Category editing exists, but category deactivation and controlled key/type changes after use are not implemented. |
| Requirement fields/search | US-REQ-004, US-REQ-006, US-REQ-007, US-REQ-008, US-VIEW-001, US-VIEW-002, US-VIEW-003, US-VIEW-004, US-VIEW-005, US-VIEW-006, US-VIEW-007 | Partial/none | Missing full-text search, category-key/priority/metric/link filters, no-owner list, criticality, tags, attachments, saved views, graph view, and document/read view. |
| Metrics | US-MET-001 through US-MET-024 | Not covered in current source | No metric model, API, parser/linking, rendering, validation, usage view, deactivation, impact analysis, or metric export support exists in the inspected source. |
| Requirement links | US-REF-001 through US-REF-016 | Not covered in current source | No structured requirement-link model/API/UI/export support exists in the inspected source. |
| Review assignment/tasks | US-WF-006 | Not covered | Review comments/replies/resolution and approve/reject exist, but assigning review tasks to named users and personal pending-review lists are missing. |
| Revision history/comparison UI | US-VER-002 | Partial | Backend current-plus-archive history, actor metadata, ticket snapshots, `/revisions`, and `/revisions/compare` are implemented. Remaining work is generated-client synchronization plus the frontend revision-history/diff view. |
| Change requests | US-VER-003, US-VER-004 | Not covered | No controlled change-request workflow for approved requirement changes exists. |
| Import/export | US-IO-001 through US-IO-007, US-EXP-* if retained | Not covered in current source | No CSV/Excel/JSON/YAML/XML/ReqIF/GitHub Markdown/AsciiDoc import/export controllers or adapters exist in the inspected source. PDF remains out of current scope unless explicitly reintroduced. |
| Traceability and impact analysis | US-TRC-001 through US-TRC-003, US-REF-013, US-MET-015, US-MET-017, US-MET-020 | Not covered | No traceability matrix, missing-traceability analysis, link-aware impact analysis, or baseline snapshots exist. |
| Baselines/structure | US-STR-001 through US-STR-004 | Not covered | Parent-child hierarchy, packages/modules, baselines, and baseline comparison are missing. |
| Verification/validation | US-VAL-001 through US-VAL-005 | Not covered | No verification criteria, verification status, verification evidence, test coverage model/report, or NFR-specific measurable verification criteria exists. |
| Integrations | US-INT-001 through US-INT-004 | Not covered | No issue-system, commit/MR, test-management, or webhook/synchronization integration exists. |

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

1. **WP2 – Backend role model**: enforce one account/one role, fixed project role, Administrator membership prohibition, and Administrator project-content denial.
2. **WP3 – Administrator REST API**: add summary-only project administration endpoints and move Administrator project/membership operations behind them.
3. **WP4 – Administrator workspace**: introduce dedicated Administrator routing/shell/sidebar with `Users & Sessions` and `Projects`.
4. **WP5 – Administrator project administration**: implement project create/rename/delete, memberships, summaries and administrative settings in the new workspace.
5. **WP6 – Frontend cleanup**: remove obsolete mixed-workspace administration UI and the account-menu Administration item.
6. **WP7 – Final verification**: migrations, generated-client synchronization, backend/frontend unit + E2E, OpenAPI verification, dead-code cleanup.

## WP1 status

WP1A established the new Administrator architecture. WP1B completed the catalogue/backlog consistency pass. Implementation proceeds with WP2 through WP7 as defined above.
