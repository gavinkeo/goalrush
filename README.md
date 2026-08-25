# Champions League Goal Rush

A responsive leaderboard for a 36-person workplace competition based on the UEFA Champions League league phase.

## Competition rule

Each entrant is assigned one Champions League club.

**Score = Goals For + Goals Against** across that club's eight league-phase fixtures.

Highest total score wins.

## Files

- `index.html` — page structure
- `styles.css` — all styling/responsive design
- `app.js` — ranking, podium, search and rendering logic
- `competition.json` — entrants, clubs, crests and scores
- `crest-placeholder.svg` — temporary crest
- `favicon.svg` — site icon

## Preview

Because the site loads `competition.json`, use a small local web server rather than opening `index.html` directly.

### Python

```bash
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

For a populated design preview, use:

```text
http://localhost:8000/?demo=1
```

The demo values exist only in the browser and do not alter the JSON file.

## GitHub Pages

This starter is fully compatible with GitHub Pages.

1. Create a repository.
2. Upload the contents of this folder to the repository root.
3. In GitHub, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`.
6. Save.

## Updating entrants later

Edit `competition.json`.

Each row looks like:

```json
{
  "id": 1,
  "entrant": "Person Name",
  "club": "Arsenal",
  "crest": "https://example.com/arsenal.png",
  "fixtures": ["RMA", "PSG", "INT", "BAY", "ATM", "BVB", "JUV", "BEN"],
  "played": 2,
  "goalsFor": 5,
  "goalsAgainst": 3
}
```

The website calculates the competition score automatically.

## Next phase: live data

The intended production architecture is:

```text
Football live-score API
        ↓
Small serverless function
        ↓
Competition mapping (club → entrant)
        ↓
Website leaderboard
```

Do **not** put a paid football API key directly in `app.js` in a public GitHub repository.

A serverless function on Cloudflare Workers, Vercel, Netlify or similar can keep the key secret and return only the fields the website needs.

## Tie-breaking

The current starter sorts tied scores by:
1. Higher competition score
2. Higher goals scored
3. Entrant name alphabetically

This can be changed once the competition's official tie-break rule is decided.
