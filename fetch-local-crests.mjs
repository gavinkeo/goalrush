#!/usr/bin/env node

/**
 * Euro Goal Rush - one-time local club crest cache
 *
 * Reads the current 36 UCL + 36 UEL teams from competition.json,
 * resolves each crest through TheSportsDB, downloads a small/crisp
 * local copy into club-crests/, then rewrites each team.crest to the
 * local GitHub Pages path.
 *
 * Safe to run repeatedly:
 * - Existing local crest files are skipped by default.
 * - Set FORCE_CRESTS=1 to refresh everything.
 */

import fs from "node:fs/promises";
import path from "node:path";

const DATA_FILE = path.resolve("competition.json");
const OUT_DIR = path.resolve("club-crests");
const API_BASE = "https://www.thesportsdb.com/api/v1/json/123";
const FORCE = ["1", "true", "yes"].includes(
  String(process.env.FORCE_CRESTS || "").toLowerCase()
);

// The live site previously used ~2.4s to stay below the free API ceiling.
// Keep the same conservative throttle for the one-time build.
const SEARCH_DELAY_MS = 2400;
let lastSearchAt = 0;

const ALIASES = {
  "psv eindhoven": ["PSV", "PSV Eindhoven"],
  "sporting cp": ["Sporting Lisbon", "Sporting CP"],
  "bodo/glimt": ["Bodo Glimt", "Bodø/Glimt"],
  "rb leipzig": ["RB Leipzig", "Leipzig"],
  "bayer leverkusen": ["Bayer Leverkusen", "Leverkusen"],
  "shakhtar donetsk": ["Shakhtar Donetsk", "Shakhtar"],
  "slavia prague": ["Slavia Prague", "Slavia Praha"],
  "fenerbahce": ["Fenerbahce", "Fenerbahçe"],
  "besiktas": ["Besiktas", "Beşiktaş"],
  "az alkmaar": ["AZ Alkmaar", "AZ"],
  "red bull salzburg": ["Red Bull Salzburg", "RB Salzburg", "Salzburg"],
  "galatasaray": ["Galatasaray", "Galatasaray SK"],
  "club brugge": ["Club Brugge", "Club Brugge KV"],
  "lille": ["Lille OSC", "LOSC Lille", "Lille"],
  "ac milan": ["AC Milan", "Milan"],
  "inter milan": ["Inter Milan", "Internazionale", "Inter"],
  "paris saint-germain": ["Paris Saint-Germain", "PSG"],
  "manchester united": ["Manchester United", "Man United"],
  "manchester city": ["Manchester City", "Man City"],
  "real sociedad": ["Real Sociedad", "Sociedad"],
  "ferencvaros": ["Ferencvaros", "Ferencváros"],
  "viktoria plzen": ["Viktoria Plzen", "Viktoria Plzeň"],
  "gnk dinamo": ["Dinamo Zagreb", "GNK Dinamo Zagreb", "Dinamo"],
  "viking": ["Viking FK", "Viking"],
  "ararat-armenia": ["FC Ararat-Armenia", "Ararat-Armenia"],
  "n.e.c. nijmegen": ["NEC Nijmegen", "N.E.C.", "NEC"],
  "lask": ["LASK Linz", "LASK"],
  "torreense": ["SCU Torreense", "Torreense"],
  "slovan bratislava": ["Slovan Bratislava", "ŠK Slovan Bratislava"],
  "lillestrom": ["Lillestrøm SK", "Lillestrom SK", "Lillestrøm", "Lillestrom"],
  "hapoel beer-sheva": [
    "Hapoel Be'er Sheva",
    "Hapoel Be'er Sheva FC",
    "Hapoel Beer Sheva",
    "Hapoel Beer Sheva FC"
  ]
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function key(value) {
  return String(value || "").trim().toLowerCase();
}

function normalise(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function searchCandidates(club) {
  const aliases = ALIASES[key(club)] || [];
  const simplified = String(club)
    .replace(/\b(FC|CF|AC|SC|AFC|CP|KV|BSC|GNK|SK)\b/gi, "")
    .replace(/[\/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return [...new Set([club, ...aliases, simplified].filter(Boolean))];
}

async function throttledTeamSearch(query) {
  const elapsed = Date.now() - lastSearchAt;
  if (elapsed < SEARCH_DELAY_MS) {
    await sleep(SEARCH_DELAY_MS - elapsed);
  }

  const url = `${API_BASE}/searchteams.php?t=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "EuroGoalRush-CrestCache/1.0" }
  });
  lastSearchAt = Date.now();

  if (!response.ok) {
    throw new Error(`TheSportsDB HTTP ${response.status} for ${query}`);
  }

  const payload = await response.json();
  return (payload.teams || []).filter(team => team.strSport === "Soccer");
}

async function resolveBadge(club) {
  const wanted = normalise(club);

  for (const query of searchCandidates(club)) {
    const teams = await throttledTeamSearch(query);
    if (!teams.length) continue;

    const exact = teams.find(team => normalise(team.strTeam) === wanted);
    if (exact?.strBadge) return exact.strBadge;

    const contained = teams.find(team => {
      const candidate = normalise(team.strTeam);
      return candidate.includes(wanted) || wanted.includes(candidate);
    });
    if (contained?.strBadge) return contained.strBadge;

    // Alias query fallback: first soccer match is normally the intended club.
    if (query !== club && teams[0]?.strBadge) {
      return teams[0].strBadge;
    }
  }

  return null;
}

async function downloadBadge(url, destination) {
  // 250px is far more than enough for the 30-50px UI crests and is
  // much lighter than the original artwork.
  const candidates = [`${url}/small`, url];

  let lastError;
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        headers: { "User-Agent": "EuroGoalRush-CrestCache/1.0" }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 100) throw new Error("Image response was unexpectedly small");

      await fs.writeFile(destination, bytes);
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Could not download badge");
}

async function fileExists(filename) {
  try {
    await fs.access(filename);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const data = JSON.parse(raw);

  await fs.mkdir(OUT_DIR, { recursive: true });

  const uniqueTeams = new Map();

  for (const entry of data.entries || []) {
    for (const comp of ["ucl", "uel"]) {
      const team = entry?.[comp];
      if (!team?.club) continue;

      const teamKey = key(team.club);
      if (!uniqueTeams.has(teamKey)) {
        uniqueTeams.set(teamKey, {
          club: team.club,
          refs: []
        });
      }
      uniqueTeams.get(teamKey).refs.push(team);
    }
  }

  console.log(`Found ${uniqueTeams.size} unique competition teams.`);

  const missing = [];
  let completed = 0;
  let downloaded = 0;

  for (const { club, refs } of uniqueTeams.values()) {
    const filename = `${slug(club)}.png`;
    const diskPath = path.join(OUT_DIR, filename);
    const webPath = `club-crests/${filename}`;

    if (!FORCE && await fileExists(diskPath)) {
      for (const ref of refs) ref.crest = webPath;
      completed++;
      console.log(`[${completed}/${uniqueTeams.size}] cached: ${club}`);
      continue;
    }

    try {
      // If competition.json already has a usable remote crest URL,
      // use it directly before making a search API call.
      const knownRemote = refs
        .map(ref => ref.crest)
        .find(value => /^https?:\/\//i.test(String(value || "")));

      const badge = knownRemote || await resolveBadge(club);
      if (!badge) throw new Error("No badge match returned");

      await downloadBadge(badge, diskPath);

      for (const ref of refs) ref.crest = webPath;
      downloaded++;
      completed++;
      console.log(`[${completed}/${uniqueTeams.size}] downloaded: ${club}`);
    } catch (error) {
      completed++;
      missing.push(`${club}: ${error.message || error}`);
      console.warn(`[${completed}/${uniqueTeams.size}] FAILED: ${club} — ${error.message || error}`);
    }
  }

  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");

  console.log(`\nDownloaded/refreshed ${downloaded} crest(s).`);
  console.log(`competition.json now points matched teams at club-crests/.`);

  if (missing.length) {
    console.log(`\n${missing.length} crest(s) still need attention:`);
    missing.forEach(item => console.log(` - ${item}`));
    console.log("\nThe website will retain its existing online fallback for any unmatched crest.");
  } else {
    console.log("\nAll competition crests are now local.");
  }
}

main().catch(error => {
  console.error("\nLocal crest cache build failed:");
  console.error(error);
  process.exit(1);
});
