# Contributing Guidelines

## Branch Model
- `main` stays deployable; protect it with required review before merge.
- Name long-lived work using prefixes:
  - `feature/<scope>` for product work
  - `release/<version>` when preparing a cut
  - `hotfix/<ticket>` for urgent fixes against `main`
- Keep branches focused; prefer closing and reopening over continually rebasing large efforts.

## Merge Expectations
- Sync from `origin/main` before every pull request to avoid stale diffs.
- Run `npm test` and `npm run type-check` locally; add linting once the ESLint v9 config is restored.
- Squash merge user-facing work; fast-forward merges are fine for housekeeping.

## Branch Hygiene
- Weekly, run `git fetch --all --prune` and `git branch --merged main` to spot branches ready for removal.
- Tag historical work you need to keep (e.g. `git tag archive/<branch> <sha>`) before deleting the branch.
- Remove local branches with `git branch -D <name>` and remote branches with `git push origin --delete <name>` once archived.
- Surface the merged-branch report in CI so stale branches are highlighted automatically.

