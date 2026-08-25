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
