# Backlog

## Current baseline

Release **1.0.0** has already been created.

The release happened earlier than originally planned. Therefore, work that was previously described as required for the "first release" must no longer be treated as a prerequisite for Release 1.0.0.

Unfinished requirements remain unfinished and are tracked as post-1.0.0 work.

---

## Completed post-1.0.0 work

### WP-E — Revision history and comparison
Status: **Completed**

Covers the frontend part of revision/version history, especially US-VER-002, on top of the already existing backend revision functionality.

Implemented:

- Revision history is shown inside the existing requirement detail page.
- Revision history includes:
  - revision number;
  - change type;
  - change reason;
  - actor;
  - timestamp.
- Revision 1 is displayed as **Requirement created**.
- The current revision is indicated through the normal selected-row highlight rather than a textual "Current" marker.
- Revision-producing frontend mutations invalidate the revision-history cache.
- Revision comparison uses the backend `/revisions/compare` functionality.
- Comparison is opened through the requirement ActionBar.
- The Compare action is available only when at least two revisions exist.
- Revision comparison is displayed in a dialog.
- Two revisions can be selected in the comparison dialog.
- The description is displayed using a Git-style diff through `@git-diff-view/react`.
- Other changed fields are displayed with a changed-field background.
- The comparison defaults to changed fields only and can be toggled to show all fields.

### WP-E3 — Interactive revision browsing and comparison selection
Status: **Completed**

Follow-up usability work for WP-E.

Implemented:

- Clicking a revision in the revision-history list selects it.
- The selected revision is highlighted.
- The requirement detail panel above the history displays the selected historical snapshot.
- Selecting the current revision restores the current requirement representation.
- Historical revisions are read-only and do not replace or mutate the current requirement entity.
- `Ctrl + left click` can be used to select two revisions.
- At most two comparison revisions are selected at once.
- Right-clicking one of two selected revisions opens a context menu.
- The context menu contains **Compare revisions**.
- The existing comparison dialog opens with those two revisions preselected.
- Comparison order is normalized from older revision to newer revision.
- The normal ActionBar Compare action remains available.

---

## Next work package

# WP-F — Metrics and related requirement functionality

The next product area is Metrics.

The original WP-F1 scope was too large to implement safely as one increment. It was therefore split into smaller cumulative packages.

WP-F1 is complete through WP-F1.5.

---

## WP-F1 — Metrics

### Agreed product decisions

These decisions apply to all WP-F1 sub-packages.

#### Metric identity

- Metrics belong to a project.
- Metric-key uniqueness is **project-scoped**.
- Metric keys are generated automatically by the backend.
- Key format:

  `MET-0001`

- Metric keys are immutable after creation.
- Metrics also have an immutable internal ID.
- Relations use internal IDs rather than the human-readable metric key.

#### Metric content

A metric has at least:

- internal ID;
- project ID;
- immutable generated key;
- non-empty string value;
- description;
- active/deactivated state.

Metric values are intentionally stored as a single non-empty string.

Examples:

- `2000 ms`
- `99.9 %`
- `50 requests/s`

The value and unit are not split into separate fields in WP-F1.

#### Permissions

Requirements Engineer:

- create metrics;
- edit metric value;
- edit metric description;
- deactivate metrics;
- read metrics.

Developer:

- read metrics.

Viewer:

- read metrics.

Administrator:

- no project-content access, consistent with the existing project-content authorization model.

#### Deactivation

Metrics are deactivated rather than physically deleted.

- Existing requirement references to a metric remain valid after deactivation.
- Existing requirements continue to render the metric.
- Historical revisions remain valid.
- A deactivated metric cannot be introduced as a new reference.
- Re-saving an existing requirement containing an already established reference to a subsequently deactivated metric must not destroy that relation merely because the metric is now inactive.

#### Requirement placeholder syntax

Metric references use:

`[~MET-0001]`

Rules:

- The raw placeholder remains stored in the current requirement description.
- The backend does not replace the stored current requirement description with the metric value.
- Syntactically valid metric placeholders are parsed and resolved.
- Duplicate occurrences of the same metric in one requirement create only one logical relationship.
- Editing a requirement recalculates its metric relationships.
- Malformed metric-like text is not silently corrected.

A syntactically valid but missing key such as:

`[~MET-9999]`

is treated as an unresolved metric reference.

Text such as:

`[~UNKNOWN]`

does not match the metric-key grammar and should not automatically become a metric reference.

#### Approval validation

A requirement with an unresolved syntactically valid metric reference cannot be approved.

Existing references to metrics that were later deactivated remain valid and do not become unresolved merely because of the deactivation.

#### Current rendering

Current requirement views resolve `[~MET-####]` using the metric's current value.

Rendered metric references should:

- be visually distinguishable from ordinary description text;
- retain their relationship to the referenced metric;
- allow navigation to the metric where appropriate.

#### Historical revisions

Historical requirement revisions must **not resolve live metric data**.

When a requirement revision is created, the metric value as it exists at that time is frozen into the revision snapshot.

Example:

Current description:

`The response time shall be below [~MET-0001].`

At revision creation time:

`MET-0001 = 2000 ms`

The historical revision must retain enough snapshot information to display:

`The response time shall be below 2000 ms.`

If `MET-0001` is later changed to `1000 ms`, that old requirement revision must continue to show `2000 ms`.

Historical display therefore does not depend on the current metric record.

---

## WP-F1.1 — Metric domain and API
Status: **Complete**

Goal: establish the metric model and backend contract independently from requirement parsing.

Implement:

- Metric persistence model.
- Project ownership.
- Immutable internal metric ID.
- Project-scoped generated metric keys.
- Automatic next-key generation.
- Immutable key after creation.
- Non-empty string value.
- Description.
- Active/deactivated state.
- Database migration.
- Create metric endpoint.
- List project metrics endpoint.
- Get metric endpoint.
- Update value/description endpoint.
- Deactivate endpoint.
- Correct project-role authorization.
- OpenAPI DTOs and schema.
- Backend unit tests.
- Backend E2E tests.

Acceptance criteria:

- A Requirements Engineer can create a metric.
- The backend assigns the next project-local `MET-####` key.
- Two projects may independently contain `MET-0001`.
- The same project cannot contain duplicate metric keys.
- Clients cannot choose or change the key.
- Empty metric values are rejected.
- Value and description can be updated.
- Deactivation does not delete the record.
- Developer and Viewer can read metrics.
- Developer and Viewer cannot mutate metrics.
- Administrator cannot access project metric content.

---

## WP-F1.2 — Requirement metric references and validation
Status: **Complete**

Depends on WP-F1.1.

Implement:

- Parse `[~MET-####]` from requirement descriptions.
- Resolve references inside the same project.
- Persist requirement-to-metric relationships using internal IDs.
- Deduplicate repeated references.
- Recalculate relationships after description changes.
- Detect unresolved references.
- Preserve raw placeholders in stored requirement descriptions.
- Preserve existing references when their metric is later deactivated.
- Reject newly introduced references to deactivated metrics.
- Expose resolution information through the backend where needed.
- Block approval when unresolved references exist.
- Backend tests for parsing, linking and validation.

Acceptance criteria:

- `[~MET-0001]` resolves to the matching metric in the same project.
- The same key in another project does not resolve.
- Repeating `[~MET-0001]` several times produces one logical relation.
- Removing a placeholder removes the relation.
- Adding another placeholder adds its relation.
- Unknown valid metric keys are reported as unresolved.
- Current raw requirement text still contains the placeholder.
- Approval fails while unresolved references exist.
- Existing references remain valid after metric deactivation.
- A newly introduced reference to an already deactivated metric is rejected.

---

## WP-F1.3 — Historical metric snapshots
Status: **Complete**

Depends on WP-F1.1 and WP-F1.2.

Implement:

- Snapshot metric rendering information whenever a requirement revision is created.
- Store enough revision-local data to reproduce the metric value from that point in time.
- Historical requirement views use the revision snapshot rather than live metric data.
- Revision comparison works with the frozen historical representation.
- Ticket-driven or lifecycle-driven revisions preserve the correct metric snapshot too.
- Backend and frontend tests for historical behavior.

Acceptance criteria:

- A revision created while `MET-0001 = 2000 ms` continues to display `2000 ms`.
- Changing `MET-0001` to `1000 ms` does not alter old revisions.
- Deactivating the metric does not alter old revisions.
- Deleting/changing current requirement-to-metric links does not alter old revisions.
- The current requirement continues to resolve the current metric value.
- Revision comparison shows historically correct values.

---

## WP-F1.4 — Frontend metric management
Status: **Complete**

Depends primarily on WP-F1.1.

Implement:

- Synchronize/regenerate the frontend API contract from backend OpenAPI.
- Add a project-sidebar **Metrics** entry alongside the existing project navigation.
- Add a Metrics list page.
- Show at least:
  - key;
  - value;
  - description;
  - active/deactivated state.
- Requirements Engineer actions:
  - create;
  - edit;
  - deactivate.
- Developer/Viewer:
  - read-only list/detail behavior.
- Metric key is displayed but never editable.
- Follow existing application dialog/list styling.
- Frontend unit/component tests.
- Permission-aware E2E coverage.

Acceptance criteria:

- Metrics can be opened from the project sidebar.
- A Requirements Engineer can create a metric from the Metrics UI.
- The generated key appears after creation.
- Value and description can be edited.
- Key cannot be edited.
- Metric can be deactivated.
- Developer and Viewer see metric data without mutation controls.
- Administrator cannot access the project Metrics page.

---

## WP-F1.5 — Requirement rendering, metric navigation and integration
Status: **Complete**

Depends on WP-F1.1 through WP-F1.4.

Implement:

- Render current requirement metric placeholders with current metric values.
- Visually distinguish rendered metric values.
- Show unresolved metric references clearly.
- Allow navigation from a rendered metric reference to its metric.
- Metric detail shows:
  - key;
  - value;
  - description;
  - active state;
  - referencing requirements;
  - usage count.
- Navigation from metric usage entries back to requirements.
- Review UI exposes unresolved-reference state.
- Final integration/E2E coverage.
- Backlog update marking WP-F1 complete.

Acceptance criteria:

- A requirement containing `[~MET-0001]` displays the metric's current value.
- Updating the metric value updates current requirement rendering.
- Raw requirement text still contains `[~MET-0001]`.
- Metric references are visually distinct.
- Clicking/opening a metric reference navigates to that metric.
- Unknown references are highlighted.
- Review clearly shows unresolved metric references.
- Metric detail lists every requirement referencing it.
- Usage count matches the number of distinct referencing requirements.
- Deactivated metrics already referenced by requirements continue to render.
- Historical revisions use their frozen values from WP-F1.3.

---

## Deferred metric-related work

### WP-F3 — Search / filtering / views
Status: **Planned**

Metric-related search/filter functionality belongs here rather than WP-F1.

Includes, among other search/filter requirements:

- filtering requirements that contain unresolved metric references;
- broader requirement filtering/search functionality described by the relevant US-MET/search stories.

### WP-F5 — Export
Status: **Planned**

Metric rendering in exports belongs here rather than WP-F1.

Exports must eventually use the appropriate resolved/frozen representation required by the export and baseline semantics.

---

## Later WP-F packages

### WP-F2 — Requirement links / traceability
Status: **Implemented — validation pending**

Implements the first-release requirement-link stories independently from metric references (US-REF-001, US-REF-002, US-REF-003, US-REF-004, US-REF-006, US-REF-007, US-REF-008, US-REF-009, US-REF-010, US-REF-011, and US-REF-012). Requirement-link export remains in WP-F5; broader search/filter work remains in WP-F3.

Implemented:

- project-scoped structured requirement-link records using internal source/target IDs;
- fixed relationship type `references`;
- many-to-many outgoing/incoming links across FR/NFR requirements and categories;
- target selection by visible requirement key;
- duplicate, unknown-target, cross-project, and self-link protection;
- create, correct, list, and remove API operations;
- Requirements Engineer mutation access; Developer/Viewer read access; Administrator denied project content;
- incoming/outgoing requirement-detail overview with source/target key, linked requirement type, category, and status;
- navigation between linked requirements;
- source/target key filtering in the link overview;
- requirement links remain independent from description text and do not create requirement revisions;
- backend unit/E2E and frontend API/E2E coverage.

Acceptance criteria:

- A Requirements Engineer can create a structured link from one project requirement to another by visible key.
- The stored link uses immutable internal source and target IDs and the fixed relationship type `references`.
- One requirement can reference many requirements and can be referenced by many requirements.
- Duplicate links, self-links, unknown targets, and cross-project targets are rejected.
- Mentioning a visible requirement key in description text does not create a structured link.
- Editing description text does not silently remove structured links.
- Authorized users can correct or remove outgoing links without changing either requirement.
- Requirement detail shows grouped outgoing and incoming links with source/target keys and linked requirement metadata.
- Linked requirements can be opened from the overview.
- The overview can be filtered by source or target key.
- Developer and Viewer can read link data without mutation controls.
- Administrator has no project-content access.

### WP-F3 — Search / filtering / views
Status: **Planned**

### WP-F4 — Review assignment tasks
Status: **Planned**

### WP-F5 — Export
Status: **Planned**

---

## WP-G — Identity / access-control follow-up
Status: **Planned**

Identity and access-control work that is not already covered by the current project-role model remains a later package.

---

## Recommended implementation order

Proceed in this order:

1. WP-F1.1 — Metric domain and API
2. WP-F1.2 — Requirement metric references and validation
3. WP-F1.3 — Historical metric snapshots
4. WP-F1.4 — Frontend metric management
5. WP-F1.5 — Requirement rendering/navigation/integration
6. WP-F2 — Requirement links / traceability
7. WP-F3 — Search / filtering / views
8. WP-F4 — Review assignment tasks
9. WP-F5 — Export
10. WP-G — remaining identity/access-control work

The immediate next step is **WP-F2 validation**. After it is green, the next implementation package is **WP-F3**.