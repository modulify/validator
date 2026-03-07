# AGENTS.md

## Goals
- Avoid clarification loops by proposing a concrete interpretation when details are missing.
- Default to the language of the user's initial message unless they explicitly request a different language.
- Match the tone and formality of the user's initial message unless they explicitly ask for a change.
- Treat a language switch in the user's message as an explicit request to respond in that language.
- If a message is mixed-language, reply in the dominant language unless the user specifies otherwise.
- Run `yarn lint` before handoff or commit preparation when changed files include code covered by eslint rules.
- Run `yarn typecheck` before handoff or commit preparation when changed files can affect TypeScript types or module resolution.
- Run `yarn test` before handoff or commit preparation when changed files can affect runtime behavior.
- Run `yarn build` before handoff or commit preparation when changed files can affect package exports, bundling, or generated declarations.
- Do not run the full code check pipeline for markdown-only changes unless the user explicitly asks for it.
- Do not edit generated artifacts under `dist/` or reports under `coverage/` unless the task explicitly requires it.

## Reporting
- Keep handoff reports natural and outcome-focused: describe what was done.
- Do not proactively list skipped optional checks unless the user explicitly asks.
- Always mention blockers, failed required checks, or other omissions that can affect correctness, safety, or reproducibility.

## Purpose
This file defines practical instructions for working in the `modulify/validator` repository, with a focus on validation-library development, checks, and local project skills.

## Repository Structure
- This project is a single-package TypeScript library.
- Package name: `@modulify/validator`.
- Main source directories:
  - `src/` - runtime implementation
  - `src/runners/` - recursive validation runners
  - `tests/` - vitest test suite
  - `types/` - public type declarations and shared typing surface
- Build output directory: `dist/`.
- Coverage output directory: `coverage/`.

## Local Environment Prerequisites
- CI runs on Node `22.x` and `24.x`; prefer Node `22+` locally.
- Install dependencies with:
```bash
yarn install
```

## Running Checks

### Main Scripts
- Lint:
```bash
yarn lint
```
- Type check:
```bash
yarn typecheck
```
- Test:
```bash
yarn test
```
- Coverage:
```bash
yarn test:coverage
```
- Build:
```bash
yarn build
```

### Suggested Validation Order For Code Changes
```bash
yarn lint
yarn typecheck
yarn test
yarn build
```

## Important Project Rules
- Commit messages follow Conventional Commits.
- Before creating any commit, always reread `skills/commit-workflow/SKILL.md` and follow it as the source of truth for commit splitting, wording, scopes, and lockfile policy.
- Getter/helper functions must be free of side effects. Side effects are allowed only by prior agreement and only when there are strong, explicit reasons.

## Local Skills
- `skills/commit-workflow/SKILL.md` - rules for splitting changes into commits and writing changelog-friendly Conventional Commit messages.
- `skills/coverage-recovery/SKILL.md` - workflow for analyzing uncovered code paths and improving test coverage without adding artificial tests.
- `skills/yarn-lock-conflict-resolution/SKILL.md` - safe procedure for resolving `yarn.lock` conflicts during merge or rebase.
