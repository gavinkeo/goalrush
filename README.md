# European Goal Rush

A responsive live leaderboard for a 36-person workplace European football competition.

## Format

Each of the 36 entrants is assigned:

- 1 Champions League club
- 1 Europa League club

Each club plays eight league-phase fixtures, so every entrant has **16 matches** contributing to their score.

## Scoring

**Total = UCL goals for + UCL goals against + UEL goals for + UEL goals against**

Every goal counts, regardless of which end it goes in.

## Data structure

All competition data is stored in `competition.json`.

Example entrant:

```json
{
  "id": 1,
  "entrant": "Person Name",
  "ucl": {
    "club": "Arsenal",
    "crest": "https://example.com/arsenal.png",
    "played": 2,
    "goalsFor": 5,
    "goalsAgainst": 3,
    "fixtures": ["BAY", "PSG", "INT", "ATM", "BEN", "PSV", "BVB", "RMA"]
  },
  "uel": {
    "club": "Roma",
    "crest": "https://example.com/roma.png",
    "played": 2,
    "goalsFor": 4,
    "goalsAgainst": 4,
    "fixtures": ["LYO", "BET", "FEN", "PAO", "CEL", "FEY", "RBL", "GEN"]
  }
}
```

The website calculates both club subtotals and the combined total automatically.

## Preview

Run:

```bash
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

For a populated visual demo:

```text
http://localhost:8000/?demo=1
```

## GitHub Pages

Upload all files to the repository root, then enable:

**Settings → Pages → Deploy from a branch → main → / (root)**

## Live-score phase

The planned production setup remains:

```text
Football data API
        ↓
Serverless function
        ↓
UCL + UEL club mapping
        ↓
European Goal Rush leaderboard
```

Keep API keys out of public front-end JavaScript.


## Leaderboard layout

Each entrant is displayed as a two-row block:

```text
MANAGER        UCL TEAM    FIX1 FIX2 FIX3 FIX4 FIX5 FIX6 FIX7 FIX8    TOTAL
               UEL TEAM    FIX1 FIX2 FIX3 FIX4 FIX5 FIX6 FIX7 FIX8    TOTAL
```

The UCL row uses blue/cyan styling. The UEL row uses orange/gold styling.


## v0.5 mobile layout

On screens 700px wide or smaller, the desktop table is replaced by dedicated entrant cards:
- manager + combined total in the header
- UCL row with all 8 fixtures in a 4x2 grid
- UEL row with all 8 fixtures in a 4x2 grid
- no horizontal scrolling required
- compact podium and hero


## v0.6 desktop density

Desktop/laptop view is now deliberately compact:
- reduced hero height and decorative dead space
- much smaller podium cards
- tighter leaderboard header
- denser two-row manager entries
- designed to surface the podium and several leading entrants without unnecessary scrolling


## v0.7 standings-first layout

The large hero title, format explanation and rule card have been removed from the top of the page.

The page now opens:
1. compact brand/status bar
2. podium
3. live standings

The competition explanation and scoring rule are shown in a compact section at the bottom.


## v0.8 cleanup

Removed the standalone scoring rule box. The bottom section is now just a lightweight format reminder.


## v0.9 automatic matchday dates

The top bar now shows a UCL and UEL matchday chip.

Each chip automatically:
- shows `NEXT` and the next league-phase matchday before it begins
- switches to `LIVE` when the current date falls within that matchday
- advances to the following matchday after the window ends
- shows `COMPLETE` after Matchday 8

Official 2026/27 league-phase date windows are stored in `competition.json`.
