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
