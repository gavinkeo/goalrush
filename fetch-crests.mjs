#!/usr/bin/env node

/**
 * Euro Goal Rush crest importer
 *
 * Usage:
 *   API_FOOTBALL_KEY=your_key node fetch-crests.mjs
 *
 * Windows PowerShell:
 *   $env:API_FOOTBALL_KEY="your_key"
 *   node .\fetch-crests.mjs
 *
 * Optional:
 *   SEASON=2026 node fetch-crests.mjs
 *
 * What it does:
 *   1. Finds UEFA Champions League + UEFA Europa League for the season.
 *   2. Fetches all participating teams for both competitions.
 *   3. Matches those teams against competition.json.
 *   4. Writes apiTeamId, apiCode and logo URL into competition.json.
 *
 * No logo files are downloaded by default — the website uses API-Sports'
 * returned crest URL directly.
 */

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const API_KEY = process.env.API_FOOTBALL_KEY;
const SEASON = Number(process.env.SEASON || 2026);
const BASE = "https://v3.football.api-sports.io";
const DATA_FILE = path.resolve("competition.json");

if (!API_KEY) {
  console.error("Missing API_FOOTBALL_KEY environment variable.");
  console.error('PowerShell: $env:API_FOOTBALL_KEY="your_key"');
  process.exit(1);
}

const headers = {
  "x-apisports-key": API_KEY,
  "Accept": "application/json"
};

function normalise(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\b(fc|cf|ac|sc|afc|calcio|football club)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

async function api(endpoint, params = {}) {
  const url = new URL(`${BASE}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`${endpoint}: HTTP ${response.status}`);
  }

  const payload = await response.json();

  if (payload.errors && Object.keys(payload.errors).length) {
    throw new Error(`${endpoint}: ${JSON.stringify(payload.errors)}`);
  }

  return payload.response || [];
}

function scoreLeagueCandidate(item, target) {
  const name = String(item?.league?.name || "").toLowerCase();
  let score = 0;

  if (target === "ucl") {
    if (name === "uefa champions league") score += 100;
    if (name.includes("champions league")) score += 60;
    if (name.includes("uefa")) score += 20;
  } else {
    if (name === "uefa europa league") score += 100;
    if (name.includes("europa league")) score += 60;
    if (name.includes("uefa")) score += 20;
  }

  const hasSeason = (item?.seasons || []).some(s => Number(s.year) === SEASON);
  if (hasSeason) score += 25;

  return score;
}

async function findCompetition(target) {
  const search = target === "ucl" ? "Champions League" : "Europa League";
  const candidates = await api("/leagues", { search, season: SEASON });

  const ranked = [...candidates]
    .map(item => ({ item, score: scoreLeagueCandidate(item, target) }))
    .sort((a, b) => b.score - a.score);

  const best = ranked[0]?.item;
  if (!best?.league?.id) {
    throw new Error(`Could not identify ${target.toUpperCase()} competition for ${SEASON}`);
  }

  console.log(
    `${target.toUpperCase()}: ${best.league.name} (league ID ${best.league.id})`
  );

  return best.league.id;
}

async function getCompetitionTeams(leagueId) {
  const response = await api("/teams", { league: leagueId, season: SEASON });
  return response.map(item => item.team).filter(Boolean);
}

function findBestTeam(name, teams) {
  const wanted = normalise(name);

  let exact = teams.find(team => normalise(team.name) === wanted);
  if (exact) return exact;

  // Conservative fuzzy fallback: contained normalized names only.
  const contained = teams.filter(team => {
    const candidate = normalise(team.name);
    return candidate.includes(wanted) || wanted.includes(candidate);
  });

  if (contained.length === 1) return contained[0];
  return null;
}

async function main() {
  const raw = await fs.readFile(DATA_FILE, "utf8");
  const data = JSON.parse(raw);

  const uclLeagueId = await findCompetition("ucl");
  const uelLeagueId = await findCompetition("uel");

  const [uclTeams, uelTeams] = await Promise.all([
    getCompetitionTeams(uclLeagueId),
    getCompetitionTeams(uelLeagueId)
  ]);

  console.log(`Fetched ${uclTeams.length} UCL teams and ${uelTeams.length} UEL teams.`);

  const unmatched = [];
  let updated = 0;

  for (const entry of data.entries || []) {
    for (const comp of ["ucl", "uel"]) {
      const teamData = entry[comp];
      const source = comp === "ucl" ? uclTeams : uelTeams;
      const match = findBestTeam(teamData.club, source);

      if (!match) {
        unmatched.push(`${comp.toUpperCase()}: ${teamData.club}`);
        continue;
      }

      teamData.apiTeamId = match.id ?? null;
      teamData.apiCode = match.code || "";
      teamData.crest = match.logo || "";
      updated++;
    }
  }

  // Preserve a backup before writing.
  const backupFile = DATA_FILE.replace(/\.json$/i, ".before-crests.json");
  await fs.writeFile(backupFile, raw, "utf8");
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2) + "\n", "utf8");

  console.log(`\nUpdated ${updated} team assignments in competition.json.`);
  console.log(`Backup: ${path.basename(backupFile)}`);

  if (unmatched.length) {
    console.log(`\n${unmatched.length} unmatched team assignment(s):`);
    for (const item of unmatched) console.log(` - ${item}`);
    console.log("\nThis is expected if your current dummy teams are not in the actual 2026/27 field.");
  } else {
    console.log("\nAll team crests matched successfully.");
  }
}

main().catch(err => {
  console.error("\nCrest import failed:");
  console.error(err.message || err);
  process.exit(1);
});
