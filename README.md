# Euro Goal Rush v55

- Desktop UCL/UEL logos enlarged.
- Desktop search moved into the top header row between the title and tournament boxes.
- Mobile layout unchanged: logos flank the title and search stays below the tournament boxes.


## v56 updates
- Desktop UCL/UEL boxes moved to a 3-line layout.
- Desktop UCL/UEL logos increased again.
- Added a more prominent detailed countdown line for the next matchday.
- Mobile layout unchanged.


## v57 updates
- Added combined UCL-to-UEL date ranges beneath MD1–MD8 on desktop.
- Date ranges are generated from the earliest UCL/UEL start and latest UCL/UEL finish for that matchday.
- Upgraded Live Draw crest matching with the same aliases and fallback matching used on the main leaderboard.
- Live Draw now shares the main leaderboard crest cache.


## v58 desktop cleanup

- Removed the third `Next in ...` line from desktop UCL/UEL matchday cards.
- Short countdown now sits on the same top line as UCL/UEL and is centred with it.
- Matchday/date remains on line two.
- Opponent code + score is wrapped as one centred unit inside every fixture tile.
- Live dots are absolutely positioned so they no longer shift fixture text off-centre.
- MD1–MD8 combined date-window subheadings and the v57 Draw-page crest fixes are retained.


## v59 desktop header scaling
- Reduced UCL/UEL label size on desktop.
- Reduced matchday/date typography.
- Reduced matchday card height and play-button size.
- Kept countdown clear but less dominant.
- Mobile unchanged.


## v60 polish

- Desktop UCL/UEL two-line text blocks are vertically centred against their PNG logos.
- Fixture opponent + score pairs now use equal-width columns for exact visual centring.
- Added a compact, horizontally scrollable MD1–MD8 date-window calendar on mobile.
- The mobile date windows are populated from the same UCL/UEL schedule data as the desktop headers.
- Draw-page crest fixes from v57 remain intact.


## v61 desktop chip alignment

- UCL/UEL now starts on the exact same left edge as the `MD1 · date` line beneath.
- Countdown remains on the right side of the top row.
- No mobile or leaderboard layout changes.


## v62 mobile MD placement

- Removed the MD1–MD8 strip from the mobile page header.
- The MD1–MD8 date-window strip now lives inside each entrant's expanded details.
- It is therefore visible only after the entrant card is tapped open.
- It sits immediately above that entrant's UCL and UEL fixture sections.
- Collapsed mobile leaderboard remains as compact as before.


## v63 mobile fixture headers

- Removed the standalone mobile MD strip.
- Each mobile fixture now carries its own MD/date heading directly above it.
- Example: `MD1 / 08–17 SEP` sits directly over `MON 1-2`, and the same MD1/date sits directly over `LYO 1-1` in the UEL section.
- MD5–MD8 naturally align over the second row of four fixtures.
- Date windows are populated from the same combined UCL→UEL schedule used by desktop.


## v64 countdown spacing
- Pulled the countdown closer to the UCL/UEL label on both desktop and mobile.
- Tightened the tournament boxes so they read more compactly and neatly on desktop.
- Kept the play button clear while reducing dead space between label and countdown.


## v65 mobile countdown alignment
- Aligned the mobile countdown vertically with the UCL/UEL label.
- Switched the mobile top line to baseline alignment for a cleaner header look.


## v66 rules copy and prize styling

- Updated Format copy with the Monday night, 7 September draw date and September–January league-phase window.
- Updated Scoring copy to note that scores and standings update in real time.
- Removed the brown/gold Prize Pot card treatment so it uses the same dark-blue visual language as the Format and Scoring cards.


## v67 entrant names

Replaced the 36 dummy entrant names with the supplied real entrant list, preserving the current dummy UCL/UEL assignments and scores for layout testing.


## v68 projected teams

Updated all 36 UCL and 36 UEL team slots using current projected 2026/27 entrants.
- UCL list uses the current UEFA provisional league-phase teams plus seven projected play-off winners.
- UEL list uses the current UEFA provisional league-phase teams plus projected play-off qualifiers / likely transfers.

Entrant names remain the real 36-name list from v67.


## v69 fixture hover details

- Hovering a fixture score now shows full team names, the scoreline, matchday/date and Home/Away venue.
- Away fixtures reverse both team order and scoreline in the tooltip so the home side is displayed first.
- Exact `fixture.date` values will automatically be used later; until then the tooltip shows the relevant UCL/UEL matchday date window.


## v70 crest fixes + refreshed fake fixtures

- Added explicit TheSportsDB aliases for Lillestrøm/Lillestrom and Hapoel Beer-Sheva on both the main site and draw page.
- Rebuilt every dummy UCL fixture using only the current projected 36 UCL clubs.
- Rebuilt every dummy UEL fixture using only the current projected 36 UEL clubs.
- Dummy schedules are symmetric: if Club A has Club B in a given MD, Club B also has Club A in that MD with the opposite venue.
- Fixture objects now store the full opponent name as well as the compact three-letter display code, improving hover details.


## v71 mobile tap tooltips

- Fixture detail tooltips now work on mobile by tapping a score tile.
- Tap a tile once to open the detail card; tap the same tile again or tap elsewhere to close it.
- Desktop hover behavior remains unchanged.


## v72 clean footer
- Removed the Live Draw link and “Unofficial competition” text from the bottom of the main page.


## v73 meta description
- Replaced the old meta description with: “European football goals competition for the 2026/27 season.”


## v74 meta description
- Updated site description to: “Champions League and Europa League goals buster for the 2026/27 season.”
