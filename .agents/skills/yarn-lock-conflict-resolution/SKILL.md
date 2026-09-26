---
name: yarn-lock-conflict-resolution
description: Use this skill when resolving merge or rebase conflicts in yarn.lock. It standardizes taking yarn.lock from the target branch as source of truth, then running yarn install, and reusing the previous successful resolution as the base for repeated conflict rounds.
---

# Yarn.lock Conflict Resolution

## When To Use
Use this skill when:
- `yarn.lock` has merge or rebase conflicts;
- conflict resolution must follow repository policy;
- the same conflict has to be resolved multiple times during one rebase chain.

## Source Of Truth Policy
- During rebase, always take `yarn.lock` from the branch you rebase onto.
- During merge, always take `yarn.lock` from the current target branch (`HEAD`).
- After taking that baseline, run:
```bash
yarn install
```

## Required Rules
- Do not manually edit conflict markers in `yarn.lock`.
- Resolve by replacing the whole `yarn.lock` file from the selected baseline.
- For repeated conflict rounds, use the previous successful `yarn.lock` resolution as the new base.
- If the current change intentionally updated dependencies, replay that dependency intent after conflict resolution and recreate a dedicated `chore: Updated yarn.lock` commit.

## Workflow
1. Ensure the conflict exists:
```bash
git status --short
```
2. Resolve first conflict round during rebase:
```bash
ONTO=$(cat .git/rebase-merge/onto 2>/dev/null || cat .git/rebase-apply/onto)
git show "$ONTO:yarn.lock" > yarn.lock
yarn install
git add yarn.lock
cp yarn.lock .git/yarn-lock-resolution-base
```
3. Resolve first conflict round during merge:
```bash
git show "HEAD:yarn.lock" > yarn.lock
yarn install
git add yarn.lock
cp yarn.lock .git/yarn-lock-resolution-base
```
4. Resolve repeated conflict rounds in the same sequence:
```bash
cp .git/yarn-lock-resolution-base yarn.lock
yarn install
git add yarn.lock
cp yarn.lock .git/yarn-lock-resolution-base
```
5. Continue the operation:
```bash
git rebase --continue
# or
git merge --continue
```
6. Cleanup after completion:
```bash
rm -f .git/yarn-lock-resolution-base
```

## Validation
- `git status --short` must not show conflict markers for `yarn.lock`.
- `yarn.lock` must be staged before `--continue`.
- The resolution must follow the source-of-truth policy above.
