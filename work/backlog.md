# Product backlog: current not fully covered requirements

## Scope

This backlog was revised from static inspection of the latest uploaded frontend and backend on 2026-09-12. It supersedes the previous backend-only backlog because the current source tree now includes completed authentication/frontend-shell work and also reveals several implementation mismatches against the requirements catalogue.

The current implemented scope is:

- local account registration, verification, bootstrap Administrator registration, login, logout, password reset, memory-only SPA session handling, backend session hashing/expiry, user/session administration, project membership administration, and demo/E2E seed accounts;
- Administrator project administration and global project read access;
- project-scoped Requirements Engineer, Developer, and Viewer authorization;
- basic projects, categories, requirements, review comments/replies/resolution, approval/rejection, obsolescence UI, implementation tickets, and sidebar/action-bar/account-menu UI.

The current source tree does **not** implement a metrics subsystem, requirement-link subsystem, export/import subsystem, traceability matrix, baselines, attachments, tags, verification criteria, requirement-change requests, personal review-task assignment, or the finalized revision-comparison endpoint.

## Role summary

| Role | Scope | Current privileges |
| --- | --- | --- |
| Administrator | Global | Can authenticate, read all projects, create/rename/delete projects, manage users, activate/deactivate accounts, revoke sessions, manage project memberships, configure project ticket URL templates, and open Administration. Does not manage requirement content, reviews, lifecycle, or tickets unless also assigned a project-scoped role. |
| Requirements Engineer | Project-scoped | Can see only assigned projects; can read assigned project details/categories/requirements/reviews/tickets/revisions; can create/edit categories and requirements; can comment/reply/resolve review comments; can approve/reject draft requirements; can mark allowed requirements obsolete; can manage implementation tickets for approved requirements; can move approved requirements to implemented when tickets exist. Cannot create projects, manage users, manage memberships, or administer sessions. |
| Developer | Project-scoped | Can see assigned projects, read project details and requirements, and create/update/remove implementation tickets while a requirement is approved. Cannot create/edit requirements, create/edit categories, review requirements, approve/reject/obsolete/implement lifecycle state, create projects, or administer users/memberships. |
| Viewer | Project-scoped | Read-only access to assigned projects and requirement details, including lifecycle metadata, reviews, tickets, and revisions. |

## High-priority implementation mismatches

These are implemented in a way that is not equal to the requirements and should be fixed before the related requirements are marked covered.

| Priority | Requirement(s) | Current implementation | Required state | Work package |
| --- | --- | --- | --- | --- |
| P0 | US-WF-001, US-REQ-003D | Backend still exposes draft deletion, recycle-bin listing, permanent purge, and clear-recycle-bin endpoints. | Requirements cannot be deleted, soft-deleted, restored, or purged. Rejected and obsolete states preserve decisions. | Remove requirement deletion/recycle-bin behavior |
| P0 | US-WF-001, US-REQ-003E | Backend only allows obsolescence from `approved` or `implemented`. | `draft`, `approved`, and `implemented` can transition to `obsolete`; `rejected` and `obsolete` are terminal. | Lifecycle alignment package |
| P0 | US-REQ-003C, US-WF-005 | Backend content-update path permits editing a rejected requirement and resets lifecycle metadata to draft. | Rejected requirements are read-only and terminal. | Rejected read-only enforcement package |
| P0 | US-IMP-001, US-VER-001, US-VER-002 | Backend creates requirement revisions on implementation-ticket create/update/delete and stores ticket snapshots in revisions. | Ticket changes do not create requirement revisions; tickets are excluded from revision comparison and historical snapshots. | Ticket/revision decoupling package |
| P0 | US-VER-001, US-SEC-007 | Revision records lack finalized `changedByUserId`, `changedByDisplayName`, `changeType`, and non-empty `changeReason` metadata. | Every revision has immutable actor UUID, display-name snapshot, timestamp, change type, and reason. | Final revision metadata package |
| P0 | US-VER-002 | Backend serves history through `?revision` / `?allrevisions`; no `/revisions` or `/revisions/compare` endpoint exists. | Provide clean history endpoint and staged comparison endpoint. | Revision history/comparison endpoint package |

## Recently covered / remove from old backlog

| Requirement(s) | Current status | Reason |
| --- | --- | --- |
| US-SEC-001, US-SEC-002, US-SEC-005 through US-SEC-012 | Covered except revision-metadata details in US-SEC-007 | Local accounts, sessions, bootstrap, password reset, administration, memberships, and authorization are implemented across backend/frontend. |
| User administration frontend | Covered | Users, activation/deactivation, and session revocation are visible in Administration. |
| Project membership administration frontend | Covered | Administrator can assign, change, and remove Requirements Engineer/Developer/Viewer memberships. |
| Public account UI shell | Covered by new US-UI-001/002 scope | Login, registration, and reset pages now share spacing/button/link behavior. |
| Account menu UI shell | Covered by new US-UI-003/004 scope | Cog-wheel action-bar menu, Administrator-only Administration item, Logout, layering, icon sizing, and hover styling are implemented. |
| US-CAT-005 | Partially covered, no longer 0% | Category edit endpoint and frontend edit UI exist. Remaining concern is whether category key/type edits should be controlled after use. |
| US-PRJ-001/002 | Mostly covered | Administrator project creation/listing and membership-filtered project listing work. Requirement counts are frontend-computed. |

## Remaining functional backlog

| Area | Requirement keys | Current coverage | Remaining work |
| --- | --- | ---: | --- |
| Requirement key stability/reclassification | US-ID-002, US-ID-004, US-ID-007, US-ID-008, US-ID-009, US-ID-010 | Partial | Preview visible keys, controlled reclassification, permanent previous-key aliasing/search, and import/export round-trip behavior are missing. |
| Category lifecycle | US-CAT-005, US-CAT-006, US-CAT-007 | Partial | Category editing exists, but category deactivation and controlled key/type changes after use are not implemented. |
| Requirement fields/search | US-REQ-004, US-REQ-006, US-REQ-007, US-REQ-008, US-VIEW-001, US-VIEW-002, US-VIEW-003, US-VIEW-004, US-VIEW-005, US-VIEW-006, US-VIEW-007 | Partial/none | Missing full-text search, category-key/priority/metric/link filters, no-owner list, criticality, tags, attachments, saved views, graph view, and document/read view. |
| Metrics | US-MET-001 through US-MET-024 | Not covered in current source | No metric model, API, parser/linking, rendering, validation, usage view, deactivation, impact analysis, or metric export support exists in the inspected source. |
| Requirement links | US-REF-001 through US-REF-016 | Not covered in current source | No structured requirement-link model/API/UI/export support exists in the inspected source. |
| Review assignment/tasks | US-WF-006 | Not covered | Review comments/replies/resolution and approve/reject exist, but assigning review tasks to named users and personal pending-review lists are missing. |
| Revision storage/comparison | US-VER-001, US-VER-002 | Partial and misaligned | Current-plus-archive basics exist, but metadata, reasons/change types, ticket exclusion, clean history route, comparison endpoint, and frontend diff view remain. |
| Change requests | US-VER-003, US-VER-004 | Not covered | No controlled change-request workflow for approved requirement changes exists. |
| Import/export | US-IO-001 through US-IO-007, US-EXP-* if retained | Not covered in current source | No CSV/Excel/JSON/YAML/XML/ReqIF/GitHub Markdown/AsciiDoc import/export controllers or adapters exist in the inspected source. PDF remains out of current scope unless explicitly reintroduced. |
| Traceability and impact analysis | US-TRC-001 through US-TRC-003, US-REF-013, US-MET-015, US-MET-017, US-MET-020 | Not covered | No traceability matrix, missing-traceability analysis, link-aware impact analysis, or baseline snapshots exist. |
| Baselines/structure | US-STR-001 through US-STR-004 | Not covered | Parent-child hierarchy, packages/modules, baselines, and baseline comparison are missing. |
| Verification/validation | US-VAL-001 through US-VAL-005 | Not covered | No verification criteria, verification status, verification evidence, test coverage model/report, or NFR-specific measurable verification criteria exists. |
| Integrations | US-INT-001 through US-INT-004 | Not covered | No issue-system, commit/MR, test-management, or webhook/synchronization integration exists. |

## Catalogue revisions made

- Added explicit frontend UI requirements US-UI-001 through US-UI-004 for public account forms, login links, account menu behavior, and systemwide hover styling.
- Clarified that `Project Manager` and `Tester` in story text are stakeholder personas, not current authorization roles.
- Clarified that current project creation privileges belong to Administrator.
- Added a conformance-review section to the requirements catalogue so mismatches are visible instead of hidden in backlog percentages.

## Recommended next work packages

1. **Lifecycle alignment package**: remove requirement deletion/recycle-bin behavior, block rejected edits, and permit draft-to-obsolete.
2. **Revision metadata package**: add `changedByUserId`, `changedByDisplayName`, `changeType`, and `changeReason`; stop ticket changes from creating requirement revisions.
3. **Revision endpoint package**: add `/revisions` and `/revisions/compare` and update frontend/generated clients.
4. **Category lifecycle package**: decide whether category key/type edits are allowed after use; add deactivation if required.
5. **Search/filter package**: implement the most valuable missing first-release requirement filters before starting larger metric/link/export work.
