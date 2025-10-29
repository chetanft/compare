<!-- 5c692cb4-328a-459c-95a1-980ecbc34ea0 c2d63848-4972-4207-8b49-be1d80b6f6d5 -->
# Repo Cleanup Plan

## Branch Actions

- Review `feature/expansion-roadmap` diff versus `main`, run smoke tests, and fast-forward merge once validated.
- Confirm whether Netlify deployment history (`clean-deploy`, `netlify-deploy`, `netlify-deploy-clean`) is still required; if not, tag their heads and delete the branches locally and remotely.
- Drop the orphaned `ui-modernization-safe` branch (remote already deleted) after double-checking for unmerged work.

## Process Improvements

- Establish a branch naming policy (feature/, release/, hotfix/) and document merge expectations in `docs/CONTRIBUTING.md`.
- Automate branch hygiene checks (e.g., weekly `git branch --merged`) and fold them into CI notifications.

### To-dos

- [x] Diff and test `feature/expansion-roadmap` against `main`, then prepare merge approval
- [x] Decide whether to archive or delete Netlify-era branches (`clean-deploy`, `netlify-deploy`, `netlify-deploy-clean`) and execute the cleanup steps
- [x] Verify remaining commits on `ui-modernization-safe`, tag if needed, and delete the branch locally and remotely
- [x] Add branch policy and hygiene workflow to repo docs once branch cleanup completes
