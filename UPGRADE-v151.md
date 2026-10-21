# Euro Goal Rush v151

- Mobile rows show rank, entrant and total; team totals and fixtures remain inside the expanded row. Today's Games stays expanded.
- Expanded entries, keyboard focus and the visible mobile row survive score repaints.
- My Entry remembers a selection in that browser and links to its detailed view.
- History reconstructs cumulative standings and round gains from fixture scores. Movement is shown only when both the current and previous rounds are complete. Current/incomplete rounds are explicitly provisional.
- Save Image exports the current table or selected historical round as a 1800-pixel-wide PNG with its timestamp and result status.
- The homepage and match centre share score persistence, recovery and date handling. Only confirmed full-time scores persist; transient empty/upcoming feeds cannot erase them. Final-score corrections remain supported.
- Requests time out after 12 seconds, with four concurrent historical requests maximum. Missing dates are retried, full history is rechecked every five minutes, polling pauses in hidden tabs, and it resumes on return/online.
- LIVE means a match is actually in progress. ROUND indicates a matchday window between games.

## Data recovery

`results.json` is a shared fallback snapshot of confirmed results at release time. It is not a second live provider. The browser refreshes from ESPN and stores newer confirmed results on that device. A new visitor during an ESPN outage will have only the bundled snapshot, and the page reports missing results. ESPN remains the live source.

To refresh the shared fallback, run `node scripts/save-results.cjs` from the repository root, review `results.json`, and commit it. The script preserves old results if requests fail. No new credentials or scheduled workflows are required.

## Validation

Run `node --test tests/*.test.cjs` and `node --check` on the changed JavaScript files. No installation or build step is required. Preview with a static server; opening HTML directly as a file is unsupported because it fetches JSON.
