---
name: coverage-recovery
description: Use this skill when coverage is below target or when uncovered validator, predicate, runner, or build-related paths must be analyzed and resolved with minimal artificial tests.
---

# Coverage Recovery

## When To Use
Use this skill when the user asks to:
- increase test coverage;
- analyze uncovered lines or branches;
- explain why specific uncovered paths remain;
- improve confidence around assertions, predicates, runners, or validation edge cases.

## Source Of Truth
- `AGENTS.md`
- `vitest.config.ts`
- `package.json`
- `coverage/` HTML reports

## Principles
- Coverage is a quality signal, not a vanity metric.
- Start from real public API behavior.
- Prefer fixing architecture or removing dead code over adding synthetic tests for impossible paths.
- Defensive branches should be tested with controlled failure scenarios.
- Keep type-level and runtime behavior aligned; run `yarn typecheck` together with coverage work when typings are touched.

## Workflow
1. Collect facts:
```bash
yarn test:coverage
```
2. Read uncovered details, not only percentages.
Use:
- `coverage/index.html`
- `coverage/lcov-report/index.html` if present
3. Classify uncovered paths:
- `real usage gap` - missed public scenario,
- `defensive path` - malformed input or runtime failure,
- `dead/redundant path` - likely removable,
- `architecture smell` - design makes real testing awkward.
4. Resolve in this order:
- add or adjust tests for real public API scenarios,
- add controlled break/failure tests for defensive branches,
- simplify or remove dead branches,
- propose architecture refactor for smell cases.
5. Re-run checks:
```bash
yarn lint
yarn typecheck
yarn test:coverage
```

## Controlled Failure Patterns
- Invalid values passed into assertions or runners.
- Rejected async assertions.
- Unsupported object/array shapes for recursive validators.
- Type guard mismatches between runtime checks and declared narrowing.
- Export or build-path regressions surfaced only after refactors.

## Stop Condition
If progress stalls after reasonable attempts:
1. Stop brute-force test additions.
2. Report exact uncovered locations and why they are hard or non-natural.
3. Offer concrete options:
- accept remaining defensive uncovered paths,
- refactor the implementation to make behavior testable,
- remove redundant branches if behavior is impossible by construction.
