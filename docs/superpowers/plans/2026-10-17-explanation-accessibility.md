# Explanation Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the first wave of Xila Explanation pages easier for humans to understand while preserving technical depth, Diátaxis boundaries, and direct access to precise Rustdoc/source references.

**Architecture:** Use progressive disclosure in Explanation pages: mental model and system relationships first, concrete but non-procedural journeys second, implementation detail later. Extend the existing Rustdoc reference components with an optional associated-item anchor using a small pure URL/path helper that can be tested with Node's built-in test runner and reused by both reference viewers.

**Tech Stack:** VitePress, Vue 3, Mermaid, JavaScript/ES modules, Node.js built-in `node:test`, Markdown, generated Rustdoc.

**Spec:** `docs/superpowers/specs/2026-10-17-explanation-accessibility-design.md`

## Global Constraints

- Preserve Diátaxis: Explanation explains concepts, relationships, rationale, and trade-offs; procedures remain in Tutorial/How-to; exhaustive lookup data remains in Reference/Rustdoc.
- Preserve useful technical information from existing Explanation pages; move implementation detail lower rather than deleting it unless an existing Reference/Rustdoc source already owns the fact.
- The first 30–60 seconds of a rewritten page must establish the component's purpose, place in Xila, and main design idea before internal Rust collections/locks are introduced.
- Introductory Mermaid diagrams teach one concept at a time, normally with 4–7 primary nodes and human-readable labels.
- Explanation pages must remain understandable without following Rustdoc links.
- `member` is an optional raw Rustdoc anchor string such as `method.open`; the website must not create its own taxonomy of Rustdoc associated items.
- The Rustdoc fragment must remain inside the encoded `path` query parameter until the host/guest iframe URL is built.
- Existing crate-only and top-level `kind` + `symbol` links must remain backward compatible.
- Do not add a third-party test framework or new runtime dependency for this work.
- Do not change Xila Core behavior or generated Rustdoc output.
- Final repository validation is `npm ci`, `npm run check`, and `git diff --check`.

## File Structure

- `.vitepress/theme/utilities/reference-path.mjs` - pure, runtime-agnostic Rustdoc target/viewer/iframe path construction and argument validation; directly testable by Node.
- `.vitepress/theme/utilities/reference.ts` - retain reference enums/display-name behavior and delegate top-level Rustdoc page-path construction to the pure helper where appropriate.
- `.vitepress/theme/components/Reference.vue` - consume the pure path helper and accept the optional `member` prop.
- `.vitepress/theme/components/HostReference.vue` - forward optional `member` to `Reference.vue`.
- `.vitepress/theme/components/GuestReference.vue` - forward optional `member` to `Reference.vue`.
- `src/reference/host.md` / `src/reference/guest.md` - build iframe URLs through the same pure helper so encoded Rustdoc fragments survive the outer reference page.
- `tests/reference-path.test.mjs` - deterministic URL/path tests with `node:test`; no network.
- `package.json` - add the narrow reference-path test command and include it in `check`.
- `src/explanation/index.md` - human-oriented Explanation landing page.
- `src/explanation/architecture/index.md` - global Xila architecture mental model and conceptual system map.
- `src/explanation/architecture/components.md` - discovery map oriented around reader questions and system relationships rather than an inventory alone.
- `src/explanation/architecture/modules/index.md` - module-level mental model and reading map.
- `src/explanation/architecture/modules/task.md` - progressive Task explanation.
- `src/explanation/architecture/modules/memory.md` - progressive Memory explanation.
- `src/explanation/architecture/modules/network.md` - progressive Network explanation.
- `src/explanation/architecture/modules/virtual_file_system.md` - progressive VFS explanation.
- `src/how-to/write-documentation.md` - concise Explanation-specific authoring rules and `member` link usage.

## Review Focus

- **Encoded fragments:** `method.open` must arrive at the Rustdoc iframe as `#method.open`, not become the fragment of `/reference/host` or `/reference/guest`; Task 1 tests this directly.
- **Backward compatibility:** crate-only links and existing `kind` + `symbol` links must generate the same viewer targets as before; Task 1 pins both cases.
- **Invalid reference combinations:** `member` without `kind` + `symbol`, `kind` without `symbol`, and `symbol` without `kind` must fail deterministically instead of generating malformed links; Task 1 tests all three.
- **Diátaxis drift:** rewritten pages must not introduce numbered procedures, exhaustive API inventories, or task completion instructions into Explanation; Tasks 2–4 each include an editorial boundary review.
- **Technical fact loss:** current implementation details such as locks, maps, runner/waker behavior, reference counting, and allocator boundaries must either remain under deeper sections or be deliberately replaced by an authoritative Reference/Rustdoc link; Tasks 3–4 compare rewritten pages against their pre-change versions before commit.

---

### Task 1: Add precise, testable Rustdoc member links

**Files:**

- Create: `.vitepress/theme/utilities/reference-path.mjs`
- Create: `tests/reference-path.test.mjs`
- Modify: `.vitepress/theme/utilities/reference.ts`
- Modify: `.vitepress/theme/components/Reference.vue`
- Modify: `.vitepress/theme/components/HostReference.vue`
- Modify: `.vitepress/theme/components/GuestReference.vue`
- Modify: `src/reference/host.md`
- Modify: `src/reference/guest.md`
- Modify: `package.json`

**Interfaces:**

- Consumes: existing `ReferenceArchitecture`, `ReferenceKind`, `getReferenceDisplayName(...)`, `HostReference`, and `GuestReference` usage.
- Produces: `getReferenceTargetPath(crateName, kind, symbol, member) -> string`, `getReferenceViewerHref(architecture, targetPath) -> string`, and `getReferenceIframeSrc(architecture, targetPath) -> string`; `HostReference`/`GuestReference` accept optional `member: String`.

- [ ] **Step 1: Write the failing Node tests for existing and new reference behavior**

Create `tests/reference-path.test.mjs` using `node:test` and `node:assert/strict`. Cover these exact assertions:

```js
assert.equal(getReferenceTargetPath("task"), "task/index.html");
assert.equal(
  getReferenceTargetPath("virtual_file_system", "struct", "File"),
  "virtual_file_system/struct.File.html",
);
assert.equal(
  getReferenceTargetPath(
    "virtual_file_system",
    "struct",
    "File",
    "method.open",
  ),
  "virtual_file_system/struct.File.html#method.open",
);
assert.equal(
  getReferenceViewerHref(
    "host",
    "virtual_file_system/struct.File.html#method.open",
  ),
  "/reference/host?path=virtual_file_system%2Fstruct.File.html%23method.open",
);
assert.equal(
  getReferenceIframeSrc("guest", "wasm/struct.Example.html#method.run"),
  "https://documentation.xila.dev/guest/wasm/struct.Example.html#method.run",
);
```

Also assert that `getReferenceTargetPath(...)` throws for: `member` without `kind` + `symbol`, `kind` without `symbol`, and `symbol` without `kind`.

- [ ] **Step 2: Run the new test file and verify RED**

Run: `node --test tests/reference-path.test.mjs`

Expected: FAIL because `.vitepress/theme/utilities/reference-path.mjs` does not exist yet.

- [ ] **Step 3: Implement the pure reference path helper**

Create `.vitepress/theme/utilities/reference-path.mjs` with these exports:

```js
export function getReferencePagePath(kind, symbol) {}
export function getReferenceTargetPath(crateName, kind, symbol, member) {}
export function getReferenceViewerHref(architecture, targetPath) {}
export function getReferenceIframeSrc(architecture, targetPath) {}
```

Requirements:

- no `kind` and no `symbol` means `index.html`;
- exactly one of `kind`/`symbol` is invalid;
- `member` requires both `kind` and `symbol`;
- `member`, when present, is appended as `#${member}` before URL encoding;
- `getReferenceViewerHref` uses `encodeURIComponent(targetPath)`;
- iframe URLs append the already-decoded `targetPath` unchanged after the host/guest prefix.

- [ ] **Step 4: Run the helper tests and verify GREEN**

Run: `node --test tests/reference-path.test.mjs`

Expected: all tests PASS with no network access.

- [ ] **Step 5: Wire the helper into the Vue reference components without changing existing display behavior**

Update `reference.ts` so existing `getReferencePath(kind, symbol)` behavior delegates to or re-exports `getReferencePagePath(kind, symbol)` without changing callers.

Update `Reference.vue` to accept optional `member`, derive the target with `getReferenceTargetPath(...)`, and derive `href` with `getReferenceViewerHref(...)`. Remove duplicated argument validation from the component when the helper now owns it.

Update `HostReference.vue` and `GuestReference.vue` to accept optional `member` and forward it unchanged.

- [ ] **Step 6: Make host and guest reference viewers use the shared iframe helper**

In both `src/reference/host.md` and `src/reference/guest.md`, import `getReferenceIframeSrc` from the theme utility, keep their existing default iframe URLs, and use the helper only when a `path` query parameter exists.

The path returned by `URLSearchParams.get("path")` is already decoded; pass it directly to `getReferenceIframeSrc(...)` so `#method.open` becomes the iframe fragment.

- [ ] **Step 7: Add the reference test command to repository validation**

Add:

```json
"test:reference": "node --test tests/reference-path.test.mjs"
```

and make `check` run `npm run test:reference` before formatting/build/validation.

- [ ] **Step 8: Run the focused and full validation**

Run:

```sh
npm run test:reference
npm run check
```

Expected: both PASS; existing crate/symbol reference links continue to build.

- [ ] **Step 9: Commit the reference-link infrastructure**

```sh
git add .vitepress/theme src/reference tests/reference-path.test.mjs package.json
git commit -m "feat: support precise Rustdoc member references"
```

---

### Task 2: Rework Explanation entry points around human mental models

**Files:**

- Modify: `src/explanation/index.md`
- Modify: `src/explanation/architecture/index.md`
- Modify: `src/explanation/architecture/components.md`
- Modify: `src/explanation/architecture/modules/index.md`

**Interfaces:**

- Consumes: the progressive-disclosure and diagram rules from the spec; existing navigation paths remain unchanged.
- Produces: a coherent top-down reading path from Explanation → Architecture → component/module maps that later module-page rewrites can reference.

- [ ] **Step 1: Rewrite the Explanation landing page as an orientation page**

Keep it short. Explain what readers learn in Explanation, distinguish it from task/reference content in prose, and organize links around questions such as overall architecture, runtime/targets, persistence, execution, and graphics boundaries. Do not add procedures.

- [ ] **Step 2: Replace the architecture overview's current crate/module relationship diagram with a system-level conceptual map**

The first diagram should show the human-visible layers and assembly relationship, approximately:

```text
Applications / executables
        ↓
Xila services / modules
        ↓
Drivers and platform adapters
        ↓
Hardware / native host / browser
```

Also explain that the final binary assembles managers, drivers, and applications; keep explicit-manager ownership and remaining process-global boundaries in a later `Under the hood`/implementation section.

- [ ] **Step 3: Reframe the component map around discovery rather than inventory**

Keep links to Modules, Crates, Drivers, and Executables, but introduce each category in plain language and retain the cross-component journeys only where they explain relationships. Avoid duplicating exact API/reference facts.

- [ ] **Step 4: Rework the modules index into a mental model plus reading map**

Explain the difference between foundation services, runtime services, and interop/execution boundaries before listing modules. Replace the current generic three-box Mermaid with a more informative dependency/relationship diagram using human-readable labels.

- [ ] **Step 5: Review Diátaxis and technical preservation for all four pages**

Check that none of the pages contains a procedure, exhaustive API table, or implementation inventory before the mental model. Compare the architecture page against its previous version to ensure explicit final-binary assembly and global-boundary caveats remain present.

- [ ] **Step 6: Format and validate this editorial slice**

Run:

```sh
npx prettier --write src/explanation/index.md src/explanation/architecture/index.md src/explanation/architecture/components.md src/explanation/architecture/modules/index.md
npm run docs:build
npm run docs:validate
```

Expected: build and documentation validation PASS.

- [ ] **Step 7: Commit the entry-point rewrite**

```sh
git add src/explanation/index.md src/explanation/architecture/index.md src/explanation/architecture/components.md src/explanation/architecture/modules/index.md
git commit -m "docs: make architecture explanations easier to enter"
```

---

### Task 3: Rewrite Task and Memory with progressive disclosure

**Files:**

- Modify: `src/explanation/architecture/modules/task.md`
- Modify: `src/explanation/architecture/modules/memory.md`

**Interfaces:**

- Consumes: Task 1's precise `HostReference member="..."` support and Task 2's architecture/module mental model.
- Produces: two exemplar Explanation pages that preserve advanced implementation detail while establishing the human-first pattern for later modules.

- [ ] **Step 1: Rewrite Task opening, mental model, and introductory diagram**

Explain first that Xila maintains logical task identity/metadata independently from the executor that runs the future. Use the spec's conceptual diagram shape (`Executable → Task manager → Executor/spawner → Async task`, plus identity/metadata consumers) with human-readable labels.

- [ ] **Step 2: Add a descriptive Task journey and contextual Rustdoc links**

Describe what conceptually happens when code asks Xila to spawn a task; do not make it a numbered how-to. Link the small set of public abstractions that embody task identity/management inline with `HostReference`, using `member` only when a specific method materially improves the explanation.

- [ ] **Step 3: Move Task implementation details below the conceptual sections**

Preserve the existing `RwLock`, `BTreeMap`, metadata, spawner-selection, cooperative scheduling, cleanup, and current limitation facts under implementation/trade-off sections. Consolidate purely lookup-style error inventories instead of leading with them.

- [ ] **Step 4: Rewrite Memory opening, mental model, and introductory diagram**

Explain first that Xila separates allocation consumers from allocator/backend policy through an allocation contract and also bridges that contract into Rust's global allocation path. The first diagram should distinguish callers, the memory abstraction, Rust allocation integration, and platform allocator/backend without showing mutex/cache internals.

- [ ] **Step 5: Add contextual Memory Rustdoc links and preserve backend details deeper in the page**

Link `ManagerTrait`, `Manager`, or the most relevant public symbols inline where they illuminate the architecture. Keep capabilities, cache/page hooks, ABI serialization, null/failure semantics, and backend-specific behavior under deeper implementation/trade-off sections.

- [ ] **Step 6: Perform technical-fact and Diátaxis review**

Diff both files against their pre-change versions. For every removed technical statement, confirm it is either rephrased elsewhere in the page or intentionally replaced by an authoritative Rustdoc/Reference link. Confirm no procedural steps were introduced.

- [ ] **Step 7: Format and validate the two pages**

Run:

```sh
npx prettier --write src/explanation/architecture/modules/task.md src/explanation/architecture/modules/memory.md
npm run check
```

Expected: reference tests, formatting, build, and docs validation all PASS.

- [ ] **Step 8: Commit the Task/Memory rewrite**

```sh
git add src/explanation/architecture/modules/task.md src/explanation/architecture/modules/memory.md
git commit -m "docs: clarify task and memory architecture"
```

---

### Task 4: Rewrite Network and VFS around request/data journeys

**Files:**

- Modify: `src/explanation/architecture/modules/network.md`
- Modify: `src/explanation/architecture/modules/virtual_file_system.md`

**Interfaces:**

- Consumes: Task 1 Rustdoc member links and the human-first page pattern established in Tasks 2–3.
- Produces: two more complex exemplar pages showing how to use conceptual diagrams plus non-procedural sequence diagrams without crossing into How-to.

- [ ] **Step 1: Rewrite Network opening and first diagram around interface ownership**

Explain first that an interface combines a protocol stack with a platform device, applications receive typed sockets, and control operations are exposed through the VFS. Use the spec's human-level diagram (`Executable → Socket → Network manager → Interface stack → Platform driver → hardware`, with VFS control device feeding the manager).

- [ ] **Step 2: Add a descriptive Network data/control journey**

Use prose and, where useful, one `sequenceDiagram` to show how a socket operation reaches the interface/driver and how VFS control reaches network configuration. Do not provide setup commands or a configuration procedure.

- [ ] **Step 3: Preserve Network internals under `Under the hood` and trade-offs**

Retain `StackInner`, `SocketSet`, runner polling, wake signal, manager/per-stack synchronization, cooperative progress, VFS device control, and backend capability variation after the conceptual sections. Inline-link only the Rust APIs that materially anchor the model.

- [ ] **Step 4: Rewrite VFS opening around the path-router/policy mental model**

Explain first that callers address a single namespace while the VFS resolves the owning mount, evaluates Xila access policy, and delegates to a file-system/device backend. Use the spec's introductory conceptual diagram before showing registries/reference counts.

- [ ] **Step 5: Add the `/data/config.json` conceptual journey with precise API links**

Narrate what happens when an executable opens `/data/config.json`: mount resolution, caller context/permissions, delegation through the file-system contract, returned handle. Inline-link `FileSystemOperations` and the most relevant `File`/open symbol, using `member="method.open"` when it matches generated Rustdoc.

- [ ] **Step 6: Preserve VFS internals and namespace semantics deeper in the page**

Keep longest-prefix resolution, manager dependencies, mount/device registries, reference-count protection, async locking/poll behavior, `RessourceBusy` implications, and namespace layout where they explain architecture. If the full namespace tree reads as lookup data rather than rationale, keep a short conceptual summary and link/move the exhaustive tree only if an existing authoritative Reference location is available; do not silently delete it.

- [ ] **Step 7: Perform technical-fact and Diátaxis review**

Compare both rewritten files to their pre-change versions. Confirm no runner/waker/locking/refcount fact was accidentally lost, and that sequence diagrams describe behavior rather than instructing the reader to perform a task.

- [ ] **Step 8: Format and validate the two pages**

Run:

```sh
npx prettier --write src/explanation/architecture/modules/network.md src/explanation/architecture/modules/virtual_file_system.md
npm run check
```

Expected: all repository checks PASS.

- [ ] **Step 9: Commit the Network/VFS rewrite**

```sh
git add src/explanation/architecture/modules/network.md src/explanation/architecture/modules/virtual_file_system.md
git commit -m "docs: clarify network and VFS architecture"
```

---

### Task 5: Codify the Explanation authoring pattern and perform final review

**Files:**

- Modify: `src/how-to/write-documentation.md`
- Review only: all files changed by Tasks 1–4

**Interfaces:**

- Consumes: the validated pattern embodied by the rewritten pages.
- Produces: maintainable author guidance for future human/agent edits and a fully validated first-wave branch.

- [ ] **Step 1: Add concise Explanation-specific guidance to the documentation how-to**

Under the existing page-purpose/writing guidance, add the following principles without creating a second documentation system:

- start Explanation with a mental model before internals;
- explain relationships/rationale, not procedures;
- use one-concept-at-a-time diagrams;
- use inline `HostReference` / `GuestReference` for important Rust symbols;
- document `member="method.open"` as the way to target a Rustdoc associated-item anchor;
- move exhaustive lookup facts to Reference/Rustdoc;
- keep useful implementation details in a deeper section for advanced readers.

- [ ] **Step 2: Run an editorial consistency pass over all first-wave pages**

For each rewritten page answer explicitly during review:

1. Can a new reader state the component/page purpose after the opening and first diagram?
2. Does the first diagram show responsibilities/relationships instead of Rust containers?
3. Is every concrete scenario descriptive rather than procedural?
4. Are precise API details linked rather than redundantly enumerated?
5. Are meaningful implementation details still available lower in the page?

Fix any page that fails one of these checks before continuing.

- [ ] **Step 3: Verify the reference-link behavior through the production build**

Run `npm run check` and inspect the built/reference links for at least one host member link and one guest/top-level link. Confirm the outer URL contains `%23...` inside `path` and the iframe receives the decoded `#...` fragment.

- [ ] **Step 4: Run final repository validation**

Run:

```sh
npm ci
npm run check
git diff --check
```

Expected: all commands PASS. If Core is not locally available, record the existing docs-validator message that Core source-path checks were skipped rather than claiming those paths were verified.

- [ ] **Step 5: Review final branch scope**

Run `git diff <base>...HEAD --stat` and inspect the complete diff. Confirm the branch contains only the Rustdoc reference enhancement, the eight first-wave Explanation pages, the documentation authoring guide, tests, and necessary package-script changes. No unrelated formatting or Core changes.

- [ ] **Step 6: Commit the authoring guidance/final cleanup**

```sh
git add src/how-to/write-documentation.md
git commit -m "docs: codify human-first explanation guidance"
```

- [ ] **Step 7: Prepare the implementation PR description**

Summarize:

- progressive-disclosure Explanation rewrite;
- human-first Mermaid diagrams;
- inline precise Rustdoc references with `member` support;
- first-wave pages only;
- deterministic reference-path tests;
- exact validation commands/results and any Core-source validation limitation.
