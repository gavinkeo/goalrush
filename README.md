# European Goal Rush v10

Clean rebuild of the workplace European Goal Rush website.

## Important
Upload **all files in this ZIP together** to the GitHub repository root and replace the old versions.

Files:
- index.html
- styles.css
- app.js
- competition.json
- crest-placeholder.svg
- favicon.svg

The HTML/CSS/JS URLs include `?v=10` cache-busting so GitHub Pages and browsers do not mix old assets with this build.

## Layout
- compact brand + automatic UCL/UEL next/live matchday chips
- compact top-three podium
- standings immediately below
- two lines per manager: UCL then UEL
- eight fixtures visible on each line
- dedicated mobile cards

## Data
Edit `competition.json` to add manager names, teams, crests, fixtures and scores.


## v10.1 bottom explainer cards

Restored three compact rule cards below the standings:
- Every goal counts
- 16 matches each
- Live standings


## v11 cache fix

Bumped CSS/JS/data asset versions so GitHub Pages and browser caches cannot serve the pre-card stylesheet. Bottom rule cards are now explicitly styled as three polished panels on desktop and one-column cards on mobile.


## v12 prize pot

36 entrants × €20 = €720 total prize fund.

Prize split:
- 1st: €400
- 2nd: €200
- 3rd: €120


## v13 live-dashboard refinements

- Combined entrant score is now a dedicated far-right column spanning both UCL and UEL rows.
- UCL and UEL row totals remain as smaller team subtotals.
- Prize money appears directly on the podium cards: €400 / €200 / €120.
- Desktop column headings are sticky while scrolling.
- Fixtures support richer objects: `{"code":"RMA","venue":"H","status":""}`.
- Fixture tiles automatically dim past matchdays and highlight the current/next matchday.
- Optional `previousRank` supports ▲ / ▼ ranking movement indicators once historical rankings are supplied.


## v14 polish

- Renamed the team subtotal header to `TEAMS`.
- Widened the far-right combined score column.
- Removed the repeated `MANAGER` label from every entrant row.
- Softened the upcoming-matchday gold fixture highlight.


## v15 header correction

Desktop leaderboard headers are now:

`MANAGER | TEAMS | FIXTURES | GF+GA | COMBINED`


## v16 total column cleanup

- Renamed the far-right `COMBINED` header to `TOTAL`.
- Removed the smaller repeated `TOTAL` label above each entrant's score.


## v17 heading cleanup

Replaced `FRONT RUNNERS / The podium` with the single heading:

`AS IT STANDS`


## v18 dashboard optimisation

- Brand changed to `EURO GOAL RUSH 26/27`.
- Removed `WORKPLACE EUROPEAN FOOTBALL`.
- Removed the large `AS IT STANDS` heading.
- Replaced it with a tiny `TOP 3` label.
- Tightened the overall header and podium spacing.
- Changed `72 CLUBS` to `72 TEAMS`.


## v19 rules/footer cleanup

- Removed the `Updated ...` timestamp completely.
- Removed `36 ENTRANTS · 72 TEAMS` from above the standings.
- Rebuilt the bottom explainer into three fuller cards:
  - Format: 36 entrants, 72 teams, one UCL + one UEL team each, 16 fixtures total.
  - Scoring: GF + GA for both teams; highest combined total wins.
  - Prize pot: €720 total, split €400 / €200 / €120.


## v20 heading refinement

- Changed the small podium label from `TOP 3` to `LIVE STANDINGS`.
- Simplified the main table heading from `Live standings` to `Standings`.


## v21 realistic preview

- Removed the `Standings` heading entirely; the table card now opens directly with the search bar.
- Filled the leaderboard with realistic dummy manager names, clubs, fixture abbreviations and scores.
- Added a few sample rank-movement indicators near the top so the live-ranking behaviour can be previewed.


## v22 heading placement

- Removed the `LIVE STANDINGS` label from above the podium.
- Restored `LIVE STANDINGS` as the main heading above the table.


## v23 automatic club crests

Crests can now be populated automatically from API-Football.

### What gets added

For each assigned UCL/UEL team the importer writes:

```json
{
  "club": "Real Madrid",
  "apiTeamId": 541,
  "apiCode": "REA",
  "crest": "https://media.api-sports.io/football/teams/541.png"
}
```

The website already renders the `crest` field, so no UI changes are required.

### Windows — easiest method

1. Install Node.js if it is not already installed.
2. Get an API-Football API key.
3. Open PowerShell in the website folder.
4. Run:

```powershell
.\fetch-crests.ps1
```

The helper asks for the key without saving it inside the repository.

Alternatively:

```powershell
$env:API_FOOTBALL_KEY="YOUR_KEY"
node .\fetch-crests.mjs
```

### How it works

The script:
1. finds the 2026/27 Champions League and Europa League IDs;
2. pulls the participant list for each competition;
3. matches the assigned club names in `competition.json`;
4. writes API team IDs, codes and crest URLs;
5. creates `competition.before-crests.json` as a backup.

With real post-draw teams this should populate essentially everything in one run. Dummy teams that are not actually in the 2026/27 competitions are deliberately reported as unmatched rather than guessed.

Never commit an API key to GitHub.


## v24 competition logos

Added a small UCL icon to the Champions League matchday chip and a small UEL icon to the Europa League chip. These are built directly into the page as inline SVGs, so no separate asset upload is required.


## v25 temporary dummy crest hydration

For the dummy-data design preview, blank crests are now progressively fetched from TheSportsDB's free public API.

- Placeholder shields render immediately.
- Real badges replace them progressively.
- Results are cached in browser `localStorage`.
- Requests are throttled to stay below the free 30 requests/minute limit.
- This is only for preview/aesthetic testing.
- The final competition should use `fetch-crests.mjs` / API-Football so the real crest URLs are stored directly in `competition.json`.

Because 72 dummy teams are being looked up under the free rate limit, the first full hydration can take roughly 2–3 minutes. The top-ranked teams are requested first.


## v26 crest matching hardening

The temporary dummy crest loader now:
- tries club aliases automatically;
- strips common club prefixes/suffixes for fallback searches;
- handles accents and punctuation more robustly;
- uses normalized-name matching before accepting a result;
- logs any remaining unmatched clubs to the browser console.

This should resolve most of the handful of dummy badges that failed to populate in v25.


## v27 Lille crest fix

Added explicit Lille aliases:
- Lille OSC
- LOSC Lille
- Lille


## v28 anthem buttons + podium crest layout

Added a play button to each top-right competition chip.

### Audio file names

Upload these files to the project root (same folder as `index.html`):

- `ucl-anthem.mp3`
- `uel-anthem.mp3`

Clicking the button:
- plays that competition anthem;
- stops the other anthem if it is already playing;
- toggles the button to pause/stop state while audio is playing.

Also changed the podium crests from overlapping to side-by-side so both badges remain clearly visible.


## v29 matchday header cleanup

- Replaced the generic `FIXTURES` column heading with eight aligned headings:
  `MD1 | MD2 | MD3 | MD4 | MD5 | MD6 | MD7 | MD8`
- Removed all rank movement arrows from desktop and mobile.
- Ranking is now shown only as the entrant's current position.


## v30 anthem playback fix

Fixed the non-working play buttons.

The previous build had two issues:
- `wireAnthemButtons()` existed but was never called.
- the expected hidden audio elements were not present in the final HTML.

v30 creates the audio players directly in JavaScript and wires the buttons on page load.

Required root filenames remain exactly:

- `ucl-anthem.mp3`
- `uel-anthem.mp3`

GitHub Pages filenames are case-sensitive, so use those exact lowercase names.


## v31 title hierarchy

- Removed the top-left `EURO GOAL RUSH 26/27` brand block and star.
- The top strip is now dedicated to the UCL / UEL matchday and anthem controls.
- Changed the main table heading from `LIVE STANDINGS` to `EURO GOAL RUSH 26/27`.


## v32 mobile readability

- Removed visible H/A badges from fixture tiles.
- Increased manager, team and fixture text sizes on mobile.
- Enlarged mobile fixture chips while keeping the 4×2 layout.
- Changed the mobile score label from `COMBINED` to `TOTAL`.
- Tightened the title/search block so the larger text still fits comfortably.


## v33 mobile polish

- Centered and balanced the UCL / UEL top boxes on mobile.
- Restored all three podium cards on mobile instead of showing only 1st place.
- Gave the `EURO GOAL RUSH 26/27` heading a brighter gradient treatment.
- Increased visual separation between mobile entrants with stronger card borders, spacing and shadows.


## v34 mobile density pass

- 1st place podium card stays full-width.
- 2nd and 3rd place now sit side-by-side beneath it.
- Removed the heavy outer container around the title/search area.
- Slightly reduced the mobile title size.
- Slimmed the search field.
- Removed the redundant `TOTAL` label inside mobile entrant cards.
- Added a subtle left accent edge to make each entrant block easier to distinguish.


## v35 mobile compression

- Reduced top control height.
- Compressed the 1st-place podium card.
- Made 2nd/3rd-place cards significantly shorter.
- Reduced the gap before the standings.
- Shrunk the mobile title slightly.
- Slimmed the search field.
- Left entrant cards unchanged.


## v36 hierarchy simplification

- Removed the podium completely.
- Moved `EURO GOAL RUSH 26/27` and search to the very top.
- UCL / UEL matchday and anthem controls now sit directly below the title/search.
- Positions 1–3 in the standings now carry the prize badges directly:
  - 1st €400
  - 2nd €200
  - 3rd €120
- This removes the duplicated top-three information and gets users into the actual standings immediately.


## v37 top/header polish

- Swapped the top order to:
  - title
  - UCL / UEL controls
  - search
  - subtle divider
- Reduced the title size slightly.
- Slimmed the search box slightly.
- Moved the 1st/2nd/3rd prize chips out of the manager name area and into the rank block.
- Reduced the visibility of the mobile accent stripe for a cleaner, less "progress bar" feel.


## v38 final mobile rank polish

- Integrated the €400 / €200 / €120 prize amounts directly into the rank box.
- Reduced the mobile manager-header padding.
- Softened the left entrant accent line further.
- Left fixture, team and total layouts unchanged.


## v39 mobile alignment polish

- Added more breathing room around the main title.
- Made the integrated rank/prize block larger and more legible.
- Centered mobile UCL / UEL row elements more consistently.
- Centered the combined total box and the per-team score pills.


## v40 live draw mode

Added `draw.html`, a presentation-focused live allocation tool.

Workflow: paste the entrant/UCL/UEL lists, then run `Draw entrant → Draw UCL team → Draw UEL team → Confirm & next`.

The selection uses `crypto.getRandomValues()`, removes each selection from its pool, autosaves in the browser, supports fullscreen and anthem playback, looks up crests, and can export CSV or a populated `competition.json`.

Open it at `/draw.html`.


## v41 mobile collapsible leaderboard

On mobile, entrant cards are now collapsed by default.

Each collapsed row shows:
- rank/prize box
- manager name
- UCL crest + UCL score
- UEL crest + UEL score
- combined total

Tapping the row expands the full UCL/UEL sections and fixture grids. This makes the leaderboard much faster to scan without losing detail.


## v42 mobile matchday control polish

- Increased the size of the UCL / UEL matchday controls on mobile.
- Enlarged the competition icons and anthem buttons slightly.
- Kept the compact collapsible leaderboard unchanged.


## v43 matchday countdown

The former `NEXT` label in the UCL and UEL header controls now shows a live countdown to the next league-phase matchday.

Examples:
- `12D 6H`
- `18H 42M`
- `37M`

During the matchday date window it switches to `LIVE`. The countdown refreshes automatically every minute.


## v44 mobile anthem button sizing
Fixed the mobile countdown layout so the play buttons retain a fixed circular size instead of being squeezed by the countdown text.
