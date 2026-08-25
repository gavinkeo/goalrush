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
