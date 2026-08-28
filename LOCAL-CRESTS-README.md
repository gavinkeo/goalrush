# Euro Goal Rush — local crest cache

This is a one-time helper pack. It does **not** contain or modify the existing `assets/` folder.

## What it does

The GitHub Action reads the current teams from `competition.json`, downloads each club badge to:

`club-crests/<team-name>.png`

and rewrites the relevant `crest` fields in `competition.json` to use those local paths.

The existing website already prefers `team.crest`, so after the action commits the files, new visitors no longer need to wait while TheSportsDB is queried one club at a time.

## Install

Upload both items from this ZIP to the repository root, preserving the `.github/workflows/` path:

- `fetch-local-crests.mjs`
- `.github/workflows/cache-club-crests.yml`

## Run it

1. Open the repository on GitHub.
2. Open **Actions**.
3. Choose **Cache club crests locally**.
4. Choose **Run workflow**.
5. Leave **Redownload crests that already exist** off for the first run.
6. Wait for the workflow to finish. It is intentionally rate-limited and may take several minutes.
7. The workflow commits `club-crests/` and the updated `competition.json` back to the branch.

After GitHub Pages redeploys, refresh the site on a device that has never visited it before. Club badges should appear immediately rather than loading every few seconds.

If one or two unusual clubs fail to match, the current website fallback remains available and they can be fixed individually later.
