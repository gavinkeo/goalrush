const DATA_URL = "competition.json?v=86";
const PLACEHOLDER_CREST = "crest-placeholder.svg?v=86";

const $ = (sel) => document.querySelector(sel);
const bodyEl = $("#standings-body");
const mobileEl = $("#mobile-standings");
const searchEl = $("#search");
const teamModalEl = $("#team-modal");
const teamModalContentEl = $("#team-modal-content");

const uclAnthemBtn = $("#ucl-anthem-btn");
const uelAnthemBtn = $("#uel-anthem-btn");

// Audio players are created directly in JavaScript.
// Files should sit in the repository root beside index.html.
const uclAnthemAudio = new Audio("ucl-anthem.mp3");
const uelAnthemAudio = new Audio("uel-anthem.mp3");
uclAnthemAudio.preload = "metadata";
uelAnthemAudio.preload = "metadata";

const anthemPairs = [
  { btn: uclAnthemBtn, audio: uclAnthemAudio, label: "UCL anthem", missingFile: "ucl-anthem.mp3" },
  { btn: uelAnthemBtn, audio: uelAnthemAudio, label: "UEL anthem", missingFile: "uel-anthem.mp3" }
];


let entries = [];
let currentMatchdayState = { ucl: null, uel: null };
const combinedMatchdayWindows = Array(9).fill("");
const competitionMatchdays = { ucl: [], uel: [] };


function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const TEAM_ABBR = {
  "AC Milan":"MIL",
  "AEK Athens":"AEK",
  "AZ Alkmaar":"AZA",
  "Anderlecht":"AND",
  "Ararat-Armenia":"ARA",
  "Arsenal":"ARS",
  "Aston Villa":"AVL",
  "Atletico Madrid":"ATM",
  "Barcelona":"BAR",
  "Bayer Leverkusen":"LEV",
  "Bayern Munich":"BAY",
  "Benfica":"BEN",
  "Besiktas":"BES",
  "Bodo/Glimt":"BOD",
  "Borussia Dortmund":"BVB",
  "Bournemouth":"BOU",
  "Celje":"CEJ",
  "Celta Vigo":"CLV",
  "Celtic":"CEL",
  "Club Brugge":"BRU",
  "Como":"COM",
  "Crystal Palace":"CRY",
  "Fenerbahce":"FEN",
  "Ferencvaros":"FER",
  "Feyenoord":"FEY",
  "GNK Dinamo":"DIN",
  "Galatasaray":"GAL",
  "Hapoel Beer-Sheva":"HBS",
  "Hoffenheim":"HOF",
  "Inter Milan":"INT",
  "Jagiellonia":"JAG",
  "Juventus":"JUV",
  "LASK":"LAS",
  "Lech Poznan":"LPO",
  "Lens":"LEN",
  "Levski Sofia":"LSO",
  "Lille":"LIL",
  "Lillestrom":"LST",
  "Liverpool":"LIV",
  "Lyon":"LYO",
  "Manchester City":"MCI",
  "Manchester United":"MUN",
  "Marseille":"MAR",
  "N.E.C. Nijmegen":"NEC",
  "Napoli":"NAP",
  "OFI Crete":"OFI",
  "Olympiacos":"OLY",
  "Omonia":"OMO",
  "PSV Eindhoven":"PSV",
  "Paris Saint-Germain":"PSG",
  "Porto":"POR",
  "RB Leipzig":"RBL",
  "Real Betis":"BET",
  "Real Madrid":"RMA",
  "Real Sociedad":"RSO",
  "Red Bull Salzburg":"RBS",
  "Rennes":"REN",
  "Roma":"ROM",
  "Sabah":"SAB",
  "Shakhtar Donetsk":"SHA",
  "Slavia Prague":"SLA",
  "Slovan Bratislava":"SBR",
  "Sparta Prague":"SPA",
  "Sporting CP":"SCP",
  "Sturm Graz":"STG",
  "Stuttgart":"STU",
  "Sunderland":"SUN",
  "Torreense":"TOR",
  "Union Saint-Gilloise":"USG",
  "Viking":"VIK",
  "Viktoria Plzen":"PLZ",
  "Villarreal":"VIL"
};

function teamAbbr(team) {
  return team?.abbr || TEAM_ABBR[team?.club] || String(team?.club || "").replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
}

function competitionTeams() {
  return entries.flatMap(entry => [entry?.ucl, entry?.uel]).filter(team => team?.club);
}

function competitionTeamByClub(name) {
  const wanted = clubKey(name);
  if (!wanted) return null;
  return competitionTeams().find(team => clubKey(team.club) === wanted) || null;
}

function competitionTeamByCode(code) {
  const wanted = String(code || "").trim().toUpperCase();
  if (!wanted) return null;
  return competitionTeams().find(team => teamAbbr(team) === wanted) || null;
}

function fixtureOpponentTeam(item) {
  return competitionTeamByClub(item?.opponent) || competitionTeamByCode(item?.code);
}

function fixtureOpponentCrest(item) {
  const opponent = fixtureOpponentTeam(item);
  return opponent ? crest(opponent) : PLACEHOLDER_CREST;
}

function clubScore(team) {
  return Number(team?.goalsFor || 0) + Number(team?.goalsAgainst || 0);
}

function totalScore(entry) {
  return clubScore(entry.ucl) + clubScore(entry.uel);
}

const generatedFixtureScores = new Map();

function hashString(value) {
  return String(value || "").split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

function scorePattern(totalGoals, seed) {
  const patterns = {
    0: ["0-0"],
    1: ["1-0", "0-1"],
    2: ["1-1", "2-0", "0-2"],
    3: ["2-1", "1-2", "3-0", "0-3"],
    4: ["2-2", "3-1", "1-3", "4-0", "0-4"],
    5: ["3-2", "2-3", "4-1", "1-4", "5-0", "0-5"]
  };

  if (!patterns[totalGoals]) {
    const left = Math.ceil(totalGoals / 2);
    const right = Math.floor(totalGoals / 2);
    return `${left}-${right}`;
  }

  const list = patterns[totalGoals];
  return list[Math.abs(seed) % list.length];
}

function generatedFixtureScoreList(team) {
  const total = clubScore(team);
  const key = `${clubKey(team?.club)}|${total}`;
  if (generatedFixtureScores.has(key)) return generatedFixtureScores.get(key);

  if (!total) {
    const blanks = Array(8).fill("");
    generatedFixtureScores.set(key, blanks);
    return blanks;
  }

  const allocation = Array(8).fill(0);
  const spreadOrder = [0, 3, 6, 1, 4, 7, 2, 5];
  for (let i = 0; i < total; i += 1) allocation[spreadOrder[i % 8]] += 1;

  const seedBase = hashString(team?.club);
  const scores = allocation.map((goals, index) => scorePattern(goals, seedBase + index));
  generatedFixtureScores.set(key, scores);
  return scores;
}

function fixtureScoreText(team, item, index) {
  if (item?.score) return item.score;
  return generatedFixtureScoreList(team)[index] || "";
}

const OPPONENT_NAMES = {
  AEK:"AEK Athens",
  AND:"Anderlecht",
  ARS:"Arsenal",
  ATM:"Atletico Madrid",
  AVL:"Aston Villa",
  AZA:"AZ Alkmaar",
  B04:"Bayer Leverkusen",
  BAR:"Barcelona",
  BAY:"Bayern Munich",
  BEN:"Benfica",
  BES:"Besiktas",
  BET:"Real Betis",
  BOD:"Bodo/Glimt",
  BOU:"Bournemouth",
  BRU:"Club Brugge",
  BVB:"Borussia Dortmund",
  CEJ:"Celje",
  CEL:"Celtic",
  CLV:"Celta Vigo",
  COM:"Como",
  CRY:"Crystal Palace",
  CRZ:"Crvena Zvezda",
  DIN:"Dinamo Zagreb",
  FEN:"Fenerbahce",
  FER:"Ferencvaros",
  FEY:"Feyenoord",
  GAL:"Galatasaray",
  HBS:"Hapoel Beer-Sheva",
  HOF:"Hoffenheim",
  INT:"Inter Milan",
  JAG:"Jagiellonia",
  JUV:"Juventus",
  LAS:"LASK",
  LEN:"Lens",
  LEV:"Levski Sofia",
  LIL:"Lille",
  LIV:"Liverpool",
  LPO:"Lech Poznan",
  LST:"Lillestrom",
  LYO:"Lyon",
  MAR:"Marseille",
  MCI:"Manchester City",
  MIL:"AC Milan",
  MUN:"Manchester United",
  NAP:"Napoli",
  NEC:"N.E.C. Nijmegen",
  OFI:"OFI Crete",
  OLY:"Olympiacos",
  OMO:"Omonia",
  PLZ:"Viktoria Plzen",
  POR:"Porto",
  PSG:"Paris Saint-Germain",
  PSV:"PSV Eindhoven",
  RBL:"RB Leipzig",
  RBS:"Red Bull Salzburg",
  REN:"Rennes",
  RMA:"Real Madrid",
  ROM:"Roma",
  RSO:"Real Sociedad",
  SAB:"Sabah",
  SBR:"Slovan Bratislava",
  SCP:"Sporting CP",
  SHA:"Shakhtar Donetsk",
  SLA:"Slavia Prague",
  SPP:"Sparta Prague",
  STG:"Sturm Graz",
  STU:"Stuttgart",
  SUN:"Sunderland",
  TOR:"Torreense",
  TRA:"Trabzonspor",
  USG:"Union Saint-Gilloise",
  VIL:"Villarreal"
};

function opponentFullName(code) {
  return OPPONENT_NAMES[String(code || "").toUpperCase()] || String(code || "TBD");
}

function reverseScoreline(score) {
  const parts = String(score || "").split(/[-–—]/).map(part => part.trim());
  return parts.length === 2 ? `${parts[1]}–${parts[0]}` : String(score || "");
}

function formatLongFixtureDate(startIso, endIso = startIso) {
  if (!startIso) return "Date TBC";
  const start = parseDate(startIso);
  const end = parseDate(endIso || startIso);
  const startMonth = start.toLocaleString("en-GB", { month:"long" });
  const endMonth = end.toLocaleString("en-GB", { month:"long" });
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();

  if (startIso === endIso) return `${start.getDate()} ${startMonth} ${startYear}`;
  if (startYear === endYear && start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${startMonth} ${startYear}`;
  }
  if (startYear === endYear) {
    return `${start.getDate()} ${startMonth}–${end.getDate()} ${endMonth} ${startYear}`;
  }
  return `${start.getDate()} ${startMonth} ${startYear}–${end.getDate()} ${endMonth} ${endYear}`;
}

function fixtureDateText(comp, index, item) {
  if (item?.date) return formatLongFixtureDate(item.date, item.date);
  const key = String(comp || "").toLowerCase();
  const md = competitionMatchdays[key]?.find(matchday => Number(matchday.md) === index + 1);
  return md ? formatLongFixtureDate(md.start, md.end) : "Date TBC";
}

function formatFixtureListDate(comp, index, item) {
  const months = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

  if (item?.date) {
    const d = parseDate(item.date);
    return `${String(d.getDate()).padStart(2, "0")} ${months[d.getMonth()]}`;
  }

  const key = String(comp || "").toLowerCase();
  const md = competitionMatchdays[key]?.find(matchday => Number(matchday.md) === index + 1);
  if (!md?.start) return "TBC";

  const start = parseDate(md.start);
  const end = parseDate(md.end || md.start);

  if (start.getFullYear() === end.getFullYear() && start.getMonth() === end.getMonth()) {
    if (start.getDate() === end.getDate()) {
      return `${String(start.getDate()).padStart(2, "0")} ${months[start.getMonth()]}`;
    }
    return `${String(start.getDate()).padStart(2, "0")}–${String(end.getDate()).padStart(2, "0")} ${months[start.getMonth()]}`;
  }

  return `${String(start.getDate()).padStart(2, "0")} ${months[start.getMonth()]}`;
}

function fixtureKickoffText(item) {
  const raw = String(item?.kickoff || item?.time || "").trim();
  if (!raw) return "TBC";
  const timeMatch = raw.match(/(?:T|\s)(\d{1,2}:\d{2})/) || raw.match(/^(\d{1,2}:\d{2})$/);
  return timeMatch ? timeMatch[1] : raw;
}

function fixtureTooltipText(team, item, index, comp) {
  const opponent = item?.opponent || opponentFullName(item?.code);
  const score = fixtureScoreText(team, item, index);
  const venueCode = String(item?.venue || "").toUpperCase();
  const venue = venueCode === "H" ? "Home" : venueCode === "A" ? "Away" : "Venue TBC";
  const date = fixtureDateText(comp, index, item);
  let scoreLine;

  if (!score) {
    scoreLine = `${team?.club || "Team"} vs ${opponent}`;
  } else if (venueCode === "A") {
    scoreLine = `${opponent} ${reverseScoreline(score)} ${team?.club || "Team"}`;
  } else {
    scoreLine = `${team?.club || "Team"} ${String(score).replaceAll("-", "–")} ${opponent}`;
  }

  const kickoff = fixtureKickoffText(item);
  return `${scoreLine}\nMD${index + 1} · ${date}${kickoff !== "TBC" ? ` · ${kickoff}` : ""} · ${venue}`;
}

let activeFixtureTooltipTarget = null;
const fixtureTooltipEl = document.createElement("div");
fixtureTooltipEl.className = "fixture-hover-tooltip";
fixtureTooltipEl.setAttribute("role", "tooltip");
fixtureTooltipEl.hidden = true;
document.body.appendChild(fixtureTooltipEl);

function fixtureTooltipOnMobile() {
  return window.matchMedia("(max-width: 700px)").matches;
}

function positionFixtureTooltip(target) {
  if (!target || fixtureTooltipEl.hidden) return;

  const rect = target.getBoundingClientRect();
  const tipRect = fixtureTooltipEl.getBoundingClientRect();
  const mobile = fixtureTooltipOnMobile();
  const pad = mobile ? 8 : 10;

  let left = rect.left + rect.width / 2 - tipRect.width / 2;
  left = Math.max(mobile ? 12 : 8, Math.min(left, window.innerWidth - tipRect.width - (mobile ? 12 : 8)));

  let top;
  if (mobile) {
    top = rect.bottom + pad;
    if (top + tipRect.height > window.innerHeight - 8) {
      top = rect.top - tipRect.height - pad;
    }
    if (top < 8) top = 8;
  } else {
    top = rect.top - tipRect.height - pad;
    if (top < 8) top = rect.bottom + pad;
  }

  fixtureTooltipEl.style.left = `${Math.round(left)}px`;
  fixtureTooltipEl.style.top = `${Math.round(top)}px`;
}

function showFixtureTooltip(target) {
  const text = target?.dataset?.tooltip;
  if (!text) return;
  activeFixtureTooltipTarget = target;
  fixtureTooltipEl.textContent = text;
  fixtureTooltipEl.hidden = false;
  fixtureTooltipEl.classList.toggle("is-mobile", fixtureTooltipOnMobile());
  positionFixtureTooltip(target);
}

function hideFixtureTooltip() {
  activeFixtureTooltipTarget = null;
  fixtureTooltipEl.hidden = true;
  fixtureTooltipEl.classList.remove("is-mobile");
}

function wireFixtureTooltips() {
  // Fixture detail bubbles are mobile-only.
  // Desktop uses the cleaner crest tiles + clickable team fixture modal.
  document.addEventListener("click", event => {
    if (!fixtureTooltipOnMobile()) return;

    const fixture = event.target.closest?.(".fixture[data-tooltip]");
    if (fixture) {
      event.preventDefault();
      if (fixture === activeFixtureTooltipTarget && !fixtureTooltipEl.hidden) {
        hideFixtureTooltip();
      } else {
        showFixtureTooltip(fixture);
      }
      return;
    }

    hideFixtureTooltip();
  });

  window.addEventListener("scroll", hideFixtureTooltip, { passive:true });
  window.addEventListener("resize", hideFixtureTooltip);
}


function setAnthemButtonState(btn, playing) {
  if (!btn) return;
  const isPlaying = !!playing;
  const name = btn.dataset.anthemName || "Competition";
  btn.classList.toggle("is-playing", isPlaying);
  btn.setAttribute("aria-pressed", String(isPlaying));
  btn.setAttribute("aria-label", `${isPlaying ? "Stop" : "Play"} ${name} anthem`);
  btn.title = isPlaying ? `Tap to stop ${name} anthem` : name;
}

function stopOtherAnthems(currentAudio) {
  anthemPairs.forEach(({ btn, audio }) => {
    if (!audio || audio === currentAudio) return;
    audio.pause();
    audio.currentTime = 0;
    setAnthemButtonState(btn, false);
  });
}

function wireAnthemButtons() {
  anthemPairs.forEach(({ btn, audio, label, missingFile }) => {
    if (!btn || !audio) return;

    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
        setAnthemButtonState(btn, false);
        return;
      }

      stopOtherAnthems(audio);

      try {
        audio.currentTime = 0;
        await audio.play();
        setAnthemButtonState(btn, true);
      } catch (error) {
        console.error(`${label} failed to play:`, error);
        setAnthemButtonState(btn, false);
        btn.classList.add("audio-error");
        setTimeout(() => btn.classList.remove("audio-error"), 1200);
        alert(`Could not play ${label}. Make sure ${missingFile} is uploaded to the repository root with that exact filename.`);
      }
    });

    audio.addEventListener("play", () => setAnthemButtonState(btn, true));
    audio.addEventListener("ended", () => {
      audio.currentTime = 0;
      setAnthemButtonState(btn, false);
    });
    audio.addEventListener("pause", () => {
      if (audio.currentTime === 0 || audio.ended) {
        setAnthemButtonState(btn, false);
      }
    });
    audio.addEventListener("error", () => {
      setAnthemButtonState(btn, false);
      console.error(`Audio file could not be loaded: ${missingFile}`);
    });
  });
}

function sortedEntries(list) {
  return [...list].sort((a, b) =>
    totalScore(b) - totalScore(a) ||
    clubScore(b.ucl) - clubScore(a.ucl) ||
    (Number(b.ucl?.goalsFor || 0) + Number(b.uel?.goalsFor || 0)) -
      (Number(a.ucl?.goalsFor || 0) + Number(a.uel?.goalsFor || 0)) ||
    String(a.entrant).localeCompare(String(b.entrant))
  );
}

const DUMMY_CREST_CACHE_KEY = "euro-goal-rush-dummy-crests-v1";
const dummyCrestCache = (() => {
  try {
    return JSON.parse(localStorage.getItem(DUMMY_CREST_CACHE_KEY) || "{}");
  } catch {
    return {};
  }
})();

function clubKey(name) {
  return String(name || "").trim().toLowerCase();
}

function crest(team) {
  if (team?.crest) return team.crest;
  return dummyCrestCache[clubKey(team?.club)] || PLACEHOLDER_CREST;
}

function saveDummyCrestCache() {
  try {
    localStorage.setItem(DUMMY_CREST_CACHE_KEY, JSON.stringify(dummyCrestCache));
  } catch {}
}

function updateRenderedCrests(club, badgeUrl) {
  const key = clubKey(club);
  document.querySelectorAll("img[data-club-key]").forEach(img => {
    if (img.dataset.clubKey === key) img.src = badgeUrl;
  });
}

const CLUB_SEARCH_ALIASES = {
  "psv eindhoven": ["PSV", "PSV Eindhoven"],
  "sporting cp": ["Sporting Lisbon", "Sporting CP"],
  "bodo/glimt": ["Bodo Glimt", "Bodø/Glimt"],
  "eintracht frankfurt": ["Eintracht Frankfurt", "Eintracht"],
  "union saint-gilloise": ["Union SG", "Union Saint-Gilloise"],
  "rb leipzig": ["RB Leipzig", "Leipzig"],
  "bayer leverkusen": ["Bayer Leverkusen", "Leverkusen"],
  "shakhtar donetsk": ["Shakhtar Donetsk", "Shakhtar"],
  "dinamo zagreb": ["Dinamo Zagreb", "GNK Dinamo Zagreb"],
  "young boys": ["Young Boys", "BSC Young Boys"],
  "slavia prague": ["Slavia Prague", "Slavia Praha"],
  "olympiacos": ["Olympiacos", "Olympiakos"],
  "fenerbahce": ["Fenerbahce", "Fenerbahçe"],
  "besiktas": ["Besiktas", "Beşiktaş"],
  "az alkmaar": ["AZ Alkmaar", "AZ"],
  "real betis": ["Real Betis", "Betis"],
  "athletic bilbao": ["Athletic Bilbao", "Athletic Club"],
  "rangers": ["Rangers", "Glasgow Rangers"],
  "ferencvaros": ["Ferencvaros", "Ferencváros"],
  "midtylland": ["Midtjylland", "FC Midtjylland"],
  "rapid wien": ["Rapid Wien", "Rapid Vienna"],
  "viktoria plzen": ["Viktoria Plzen", "Viktoria Plzeň"],
  "legia warsaw": ["Legia Warsaw", "Legia Warszawa"],
  "copenhagen": ["Copenhagen", "FC Copenhagen", "FC København"],
  "maccabi tel aviv": ["Maccabi Tel Aviv", "Maccabi TA"],
  "club brugge": ["Club Brugge", "Club Brugge KV"],
  "lille": ["Lille OSC", "LOSC Lille", "Lille"],
  "ac milan": ["AC Milan", "Milan"],
  "inter milan": ["Inter Milan", "Internazionale", "Inter"],
  "paris saint-germain": ["Paris Saint-Germain", "PSG"],
  "manchester united": ["Manchester United", "Man United"],
  "tottenham hotspur": ["Tottenham Hotspur", "Tottenham"],
  "gnk dinamo": ["Dinamo Zagreb", "GNK Dinamo Zagreb", "Dinamo"],
  "viking": ["Viking FK", "Viking"],
  "ararat-armenia": ["FC Ararat-Armenia", "Ararat-Armenia"],
  "n.e.c. nijmegen": ["NEC Nijmegen", "N.E.C.", "NEC"],
  "lask": ["LASK Linz", "LASK"],
  "torreense": ["SCU Torreense", "Torreense"],
  "slovan bratislava": ["Slovan Bratislava", "ŠK Slovan Bratislava"],
  "lillestrom": ["Lillestrøm SK", "Lillestrom SK", "Lillestrøm", "Lillestrom"],
  "hapoel beer-sheva": ["Hapoel Be'er Sheva", "Hapoel Be'er Sheva FC", "Hapoel Beer Sheva", "Hapoel Beer Sheva FC"]
};

function searchCandidatesForClub(club) {
  const key = clubKey(club);
  const aliases = CLUB_SEARCH_ALIASES[key] || [];

  const simplified = String(club)
    .replace(/\b(FC|CF|AC|SC|AFC|CP|KV|BSC|GNK)\b/gi, "")
    .replace(/[\/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return [...new Set([club, ...aliases, simplified].filter(Boolean))];
}

function normaliseTeamName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]/g, "");
}

async function searchTheSportsDb(query) {
  const url = `https://www.thesportsdb.com/api/v1/json/123/searchteams.php?t=${encodeURIComponent(query)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`TheSportsDB HTTP ${response.status}`);
  const payload = await response.json();
  return (payload.teams || []).filter(team => team.strSport === "Soccer");
}

async function fetchDummyBadge(club) {
  const wanted = normaliseTeamName(club);
  const candidates = searchCandidatesForClub(club);

  for (const query of candidates) {
    const soccerTeams = await searchTheSportsDb(query);
    if (!soccerTeams.length) continue;

    const exact = soccerTeams.find(team =>
      normaliseTeamName(team.strTeam) === wanted
    );
    if (exact?.strBadge) return exact.strBadge;

    const contained = soccerTeams.find(team => {
      const candidate = normaliseTeamName(team.strTeam);
      return candidate.includes(wanted) || wanted.includes(candidate);
    });
    if (contained?.strBadge) return contained.strBadge;

    if (query !== club && soccerTeams[0]?.strBadge) {
      return soccerTeams[0].strBadge;
    }
  }

  return null;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function hydrateDummyCrests() {
  const clubs = [];
  const seen = new Set();

  for (const entry of sortedEntries(entries)) {
    for (const team of [entry.ucl, entry.uel]) {
      if (!team?.club || team?.crest) continue;
      const key = clubKey(team.club);
      if (!key || seen.has(key) || dummyCrestCache[key]) continue;
      seen.add(key);
      clubs.push(team.club);
    }
  }

  // Free TheSportsDB tier is 30 requests/minute.
  // 2200ms keeps us safely below that ceiling.
  const stillMissing = [];

  for (const club of clubs) {
    try {
      const badge = await fetchDummyBadge(club);
      if (badge) {
        dummyCrestCache[clubKey(club)] = badge;
        saveDummyCrestCache();
        updateRenderedCrests(club, badge);
      } else {
        stillMissing.push(club);
      }
    } catch (error) {
      console.warn(`Dummy crest lookup failed for ${club}:`, error);
      stillMissing.push(club);
    }
    await wait(2400);
  }

  if (stillMissing.length) {
    console.info("Dummy crests still unmatched:", stillMissing);
  }
}

function fixtureValues(team) {
  const source = Array.isArray(team?.fixtures) ? team.fixtures.slice(0, 8) : [];
  const values = source.map(item => {
    if (typeof item === "string") return { code: item, venue: "", status: "", score: "" };
    return {
      code: item?.code || "TBD",
      opponent: item?.opponent || "",
      venue: item?.venue || "",
      status: item?.status || "",
      score: item?.score || "",
      date: item?.date || "",
      kickoff: item?.kickoff || item?.time || "",
      stadium: item?.stadium || item?.ground || ""
    };
  });

  while (values.length < 8) values.push({ code: "TBD", venue: "", status: "", score: "" });
  return values;
}

function fixtureTemporalClass(index, comp) {
  const state = currentMatchdayState[comp.toLowerCase()];
  if (!state?.md) return "";

  const mdIndex = Number(state.md.md) - 1;

  if (index < mdIndex) return " past";
  if (index === mdIndex) {
    if (state.state === "LIVE") return " current live-md";
    if (state.state === "NEXT") return " next-md";
    return " past";
  }
  return "";
}

function fixtureGrid(team, comp) {
  return `<div class="fixture-grid">${
    fixtureValues(team).map((item, index) => {
      const statusClass =
        item.status === "live" ? " live" :
        item.status === "played" ? " played" : "";
      const scoreText = fixtureScoreText(team, item, index);
      const tooltipText = fixtureTooltipText(team, item, index, comp);
      const opponent = fixtureOpponentTeam(item);
      const opponentKey = opponent?.club || item?.opponent || item?.code || "";

      return `
        <span class="fixture desktop-fixture${statusClass}${fixtureTemporalClass(index, comp)}"
              aria-label="${esc(tooltipText.replaceAll("\n", ". "))}">
          <span class="fixture-content desktop-fixture-content">
            <span class="fixture-crest-plate">
              <img class="fixture-opponent-crest"
                   data-club-key="${esc(clubKey(opponentKey))}"
                   src="${esc(fixtureOpponentCrest(item))}"
                   alt=""
                   onerror="this.src='${PLACEHOLDER_CREST}'">
            </span>
            <span class="fixture-score">${esc(scoreText || "–")}</span>
          </span>
        </span>`;
    }).join("")
  }</div>`;
}

function teamCell(team, comp) {
  const c = comp.toLowerCase();
  return `
    <div class="team-cell">
      <img class="crest team-main-crest" data-club-key="${esc(clubKey(team.club))}" src="${crest(team)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
      <div class="team-meta">
        <span class="tag ${c}">${comp}</span>
        <button class="team-name team-name-button"
                type="button"
                data-team="${esc(team.club)}"
                data-comp="${esc(comp)}"
                aria-label="View ${esc(team.club)} fixtures">
          <span>${esc(team.club)}</span>
          <span class="team-open-icon" aria-hidden="true">↗</span>
        </button>
      </div>
    </div>`;
}



function prizeAmount(rank) {
  const prizes = { 1: "€400", 2: "€200", 3: "€120" };
  return prizes[rank] || "";
}

function rankBlock(rank) {
  const prize = prizeAmount(rank);
  return `
    <div class="rank-box ${rank <= 3 ? `rank-box-${rank}` : ""}">
      <span class="rank-number">${rank}</span>
      ${prize ? `<span class="rank-prize">${prize}</span>` : ""}
    </div>`;
}

function desktopRows(entry, rank) {
  return `
    <tr class="ucl-row">
      <td class="manager-cell" rowspan="2">
        <div class="manager-wrap">
          <div class="rank-spot">
            ${rankBlock(rank)}
          </div>
          <div class="manager-name-wrap">
            <span class="manager-name">${esc(entry.entrant)}</span>
          </div>
        </div>
      </td>
      <td>${teamCell(entry.ucl, "UCL")}</td>
      <td>${fixtureGrid(entry.ucl, "UCL")}</td>
      <td class="num"><span class="line-total ucl-total">${clubScore(entry.ucl)}</span></td>
      <td class="num combined-cell" rowspan="2">
        <strong class="combined-score">${totalScore(entry)}</strong>
      </td>
    </tr>
    <tr class="uel-row">
      <td>${teamCell(entry.uel, "UEL")}</td>
      <td>${fixtureGrid(entry.uel, "UEL")}</td>
      <td class="num"><span class="line-total uel-total">${clubScore(entry.uel)}</span></td>
    </tr>`;
}

function mobileFixtureGrid(team, comp) {
  return `<div class="mobile-fixture-list">${
    fixtureValues(team).map((item, index) => {
      const statusClass =
        item.status === "live" ? " live" :
        item.status === "played" ? " played" : "";

      const scoreText = fixtureScoreText(team, item, index);
      const tooltipText = fixtureTooltipText(team, item, index, comp);
      const opponent = item?.opponent || opponentFullName(item?.code);
      const dateText = formatFixtureListDate(comp, index, item);
      const kickoffText = fixtureKickoffText(item);
      const venueCode = String(item?.venue || "").toUpperCase();
      const venueText = venueCode === "H" ? "H" : venueCode === "A" ? "A" : "–";

      return `
        <div class="fixture mobile-fixture-row${statusClass}${fixtureTemporalClass(index, comp)}"
             data-tooltip="${esc(tooltipText)}"
             aria-label="${esc(tooltipText.replaceAll("\\n", ". "))}">
          <span class="mobile-fixture-md">MD${index + 1}</span>
          <span class="mobile-fixture-date">${esc(dateText)}</span>
          <span class="mobile-fixture-time">${esc(kickoffText)}</span>
          <span class="mobile-fixture-opponent-wrap">
            <span class="mobile-fixture-opponent">${esc(opponent)}</span>
            ${scoreText ? `<span class="mobile-list-score">${esc(scoreText)}</span>` : ""}
          </span>
          <span class="mobile-fixture-venue ${venueCode === "H" ? "home" : venueCode === "A" ? "away" : ""}"
                title="${venueCode === "H" ? "Home" : venueCode === "A" ? "Away" : "Venue TBC"}">${venueText}</span>
        </div>`;
    }).join("")
  }</div>`;
}

function mobileCard(entry, rank) {
  const row = (team, comp) => `
    <div class="mobile-comp ${comp.toLowerCase()}">
      <div class="mobile-team">
        <span class="mobile-badge ${comp.toLowerCase()}">${comp}</span>
        <img class="crest" data-club-key="${esc(clubKey(team.club))}" src="${crest(team)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
        <strong>${esc(team.club)}</strong>
        <span class="mobile-total">${clubScore(team)}</span>
      </div>
      ${mobileFixtureGrid(team, comp)}
    </div>`;

  const compactClub = (team, comp) => `
    <span class="mobile-mini-team ${comp.toLowerCase()}">
      <img class="crest mini-crest" data-club-key="${esc(clubKey(team.club))}" src="${crest(team)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
      <span class="mini-team-code">${esc(teamAbbr(team))}</span>
      <span class="mini-team-score">${clubScore(team)}</span>
    </span>`;

  return `
    <details class="mobile-card" data-entrant="${esc(entry.entrant)}">
      <summary class="mobile-summary">
        <div class="rank-spot">
          ${rankBlock(rank)}
        </div>
        <div class="mobile-manager-wrap">
          <span class="mobile-manager-name">${esc(entry.entrant)}</span>
          <div class="mobile-mini-teams">
            ${compactClub(entry.ucl, "UCL")}
            <span class="mobile-pair-plus" aria-hidden="true">+</span>
            ${compactClub(entry.uel, "UEL")}
          </div>
        </div>
        <div class="mobile-combined">
          <strong>${totalScore(entry)}</strong>
        </div>
        <span class="mobile-expand" aria-hidden="true">⌄</span>
      </summary>
      <div class="mobile-details">
        ${row(entry.ucl, "UCL")}
        ${row(entry.uel, "UEL")}
      </div>
    </details>`;
}


function teamModalFixtureRows(team, comp) {
  return fixtureValues(team).map((item, index) => {
    const opponent = fixtureOpponentTeam(item);
    const opponentName = item?.opponent || opponent?.club || opponentFullName(item?.code);
    const opponentKey = opponent?.club || opponentName;
    const scoreText = fixtureScoreText(team, item, index) || "–";
    const dateText = formatFixtureListDate(comp, index, item);
    const kickoffText = fixtureKickoffText(item);
    const venueCode = String(item?.venue || "").toUpperCase();
    const venueLabel = venueCode === "H" ? "H" : venueCode === "A" ? "A" : "–";
    const venueWord = venueCode === "H" ? "Home" : venueCode === "A" ? "Away" : "Venue TBC";

    return `
      <div class="team-modal-fixture${fixtureTemporalClass(index, comp)}">
        <span class="team-modal-md">MD${index + 1}</span>
        <span class="team-modal-date">${esc(dateText)}</span>
        <span class="team-modal-time">${esc(kickoffText)}</span>
        <span class="team-modal-venue ${venueCode === "H" ? "home" : venueCode === "A" ? "away" : ""}" title="${venueWord}">${venueLabel}</span>
        <span class="team-modal-opponent">
          <img data-club-key="${esc(clubKey(opponentKey))}"
               src="${esc(opponent ? crest(opponent) : PLACEHOLDER_CREST)}"
               alt=""
               onerror="this.src='${PLACEHOLDER_CREST}'">
          <strong>${esc(opponentName)}</strong>
        </span>
        <span class="team-modal-score">${esc(scoreText)}</span>
      </div>`;
  }).join("");
}

function openTeamModal(teamName, comp) {
  const team = competitionTeamByClub(teamName);
  if (!team || !teamModalEl || !teamModalContentEl) return;

  hideFixtureTooltip();

  const c = String(comp || "").toLowerCase();
  teamModalContentEl.innerHTML = `
    <div class="team-modal-hero ${c}">
      <div class="team-modal-hero-left">
        <span class="team-modal-comp ${c}">${esc(comp)}</span>
        <span class="team-modal-main-crest">
          <img data-club-key="${esc(clubKey(team.club))}"
               src="${esc(crest(team))}"
               alt=""
               onerror="this.src='${PLACEHOLDER_CREST}'">
        </span>
        <div>
          <span class="team-modal-eyebrow">8 league-phase fixtures</span>
          <h2 id="team-modal-title">${esc(team.club)}</h2>
        </div>
      </div>
      <div class="team-modal-total ${c}">
        <span>GOALS</span>
        <strong>${clubScore(team)}</strong>
      </div>
    </div>

    <div class="team-modal-column-heads" aria-hidden="true">
      <span>MD</span>
      <span>Date</span>
      <span>KO</span>
      <span>H/A</span>
      <span>Opponent</span>
      <span>Score</span>
    </div>

    <div class="team-modal-fixtures ${c}">
      ${teamModalFixtureRows(team, comp)}
    </div>
  `;

  teamModalEl.hidden = false;
  document.documentElement.classList.add("team-modal-open");
  requestAnimationFrame(() => teamModalEl.classList.add("is-open"));
  teamModalEl.querySelector(".team-modal-close")?.focus();
}

function closeTeamModal() {
  if (!teamModalEl || teamModalEl.hidden) return;
  teamModalEl.classList.remove("is-open");
  document.documentElement.classList.remove("team-modal-open");
  window.setTimeout(() => {
    if (!teamModalEl.classList.contains("is-open")) {
      teamModalEl.hidden = true;
    }
  }, 160);
}

function wireTeamModal() {
  document.addEventListener("click", event => {
    const teamButton = event.target.closest?.(".team-name-button");
    if (teamButton) {
      event.preventDefault();
      openTeamModal(teamButton.dataset.team, teamButton.dataset.comp);
      return;
    }

    if (event.target.closest?.("[data-close-team-modal]")) {
      event.preventDefault();
      closeTeamModal();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && teamModalEl && !teamModalEl.hidden) {
      closeTeamModal();
    }
  });
}


function render() {
  const ranked = sortedEntries(entries);
  const q = searchEl.value.trim().toLowerCase();

  const filtered = ranked.filter(e =>
    !q ||
    e.entrant.toLowerCase().includes(q) ||
    e.ucl.club.toLowerCase().includes(q) ||
    e.uel.club.toLowerCase().includes(q)
  );

  if (!filtered.length) {
    bodyEl.innerHTML = `<tr><td colspan="5">No matches.</td></tr>`;
    mobileEl.innerHTML = `<div class="mobile-card"><div class="mobile-head">No matches.</div></div>`;
    return;
  }

  bodyEl.innerHTML = filtered.map(e => desktopRows(e, ranked.indexOf(e) + 1)).join("");
  mobileEl.innerHTML = filtered.map(e => mobileCard(e, ranked.indexOf(e) + 1)).join("");
}

function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dateOnly() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

function relevantMatchday(schedule) {
  const today = dateOnly();

  for (const md of schedule || []) {
    const start = parseDate(md.start);
    const end = parseDate(md.end);

    if (today >= start && today <= end) return { md, state: "LIVE" };
    if (today < start) return { md, state: "NEXT" };
  }

  return schedule?.length
    ? { md: schedule[schedule.length - 1], state: "COMPLETE" }
    : null;
}

function formatMD(md) {
  const a = parseDate(md.start);
  const b = parseDate(md.end);
  const am = a.toLocaleString("en-GB", { month: "short" }).toUpperCase();
  const bm = b.toLocaleString("en-GB", { month: "short" }).toUpperCase();

  if (md.start === md.end) return `MD${md.md} · ${a.getDate()} ${am}`;
  if (am === bm) return `MD${md.md} · ${a.getDate()}–${b.getDate()} ${am}`;
  return `MD${md.md} · ${a.getDate()} ${am}–${b.getDate()} ${bm}`;
}

function formatCombinedMatchdayWindow(startIso, endIso) {
  if (!startIso || !endIso) return "";
  const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEPT", "OCT", "NOV", "DEC"];
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const startDay = String(sd).padStart(2, "0");
  const endDay = String(ed).padStart(2, "0");
  if (sy === ey && sm === em) return `${startDay}–${endDay} ${monthNames[sm - 1]}`;
  return `${startDay} ${monthNames[sm - 1]}–${endDay} ${monthNames[em - 1]}`;
}

function formatMobileMatchdayWindow(value) {
  return String(value || "")
    .replaceAll("SEPT", "SEP")
    .replaceAll("–", "–");
}

function populateCombinedMatchdayHeaders(matchdays) {
  const ucl = Array.isArray(matchdays?.ucl) ? matchdays.ucl : [];
  const uel = Array.isArray(matchdays?.uel) ? matchdays.uel : [];
  for (let md = 1; md <= 8; md += 1) {
    const uclMd = ucl.find(item => Number(item.md) === md);
    const uelMd = uel.find(item => Number(item.md) === md);
    const starts = [uclMd?.start, uelMd?.start].filter(Boolean).sort();
    const ends = [uclMd?.end, uelMd?.end].filter(Boolean).sort();
    const value =
      starts.length && ends.length
        ? formatCombinedMatchdayWindow(starts[0], ends[ends.length - 1])
        : "";

    combinedMatchdayWindows[md] = value;

    const desktopLabel = $(`#md-window-${md}`);
    if (desktopLabel && value) desktopLabel.textContent = value;
  }
}

function countdownToMatchday(md) {
  const [y, m, d] = md.start.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const diff = start.getTime() - Date.now();

  if (diff <= 0) return "LIVE";

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days >= 1) return `${days}D ${hours}H`;
  if (hours >= 1) return `${hours}H ${minutes}M`;
  return `${Math.max(1, minutes)}M`;
}

function setMatchday(kind, schedule) {
  const result = relevantMatchday(schedule);
  currentMatchdayState[kind] = result;

  if (!result) return;

  const chip = $(`#${kind}-matchday`);
  const stateEl = $(`#${kind}-state`);

  stateEl.textContent =
    result.state === "NEXT" ? countdownToMatchday(result.md) : result.state;

  stateEl.setAttribute(
    "aria-label",
    result.state === "NEXT"
      ? `Countdown to next ${kind.toUpperCase()} matchday`
      : result.state
  );

  $(`#${kind}-date`).textContent = formatMD(result.md);
  chip.classList.toggle("is-live", result.state === "LIVE");
}

async function init() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`competition.json HTTP ${response.status}`);
    const data = await response.json();

    entries = Array.isArray(data.entries) ? data.entries : [];

    const uclSchedule = data.matchdays?.ucl || [];
    const uelSchedule = data.matchdays?.uel || [];
    competitionMatchdays.ucl = uclSchedule;
    competitionMatchdays.uel = uelSchedule;

    populateCombinedMatchdayHeaders(data.matchdays);
    setMatchday("ucl", uclSchedule);
    setMatchday("uel", uelSchedule);

    window.setInterval(() => {
      setMatchday("ucl", uclSchedule);
      setMatchday("uel", uelSchedule);
    }, 60000);

    render();

    // Temporary aesthetic preview: progressively fill blank dummy crests.
    // Real competition data will use the API-Football importer instead.
    hydrateDummyCrests();
  } catch (err) {
    console.error(err);
    bodyEl.innerHTML = `<tr><td colspan="5">Could not load competition.json. Make sure all v13 files were uploaded together.</td></tr>`;
    mobileEl.innerHTML = `<div class="mobile-card"><div class="mobile-head">Could not load competition data.</div></div>`;
  }
}

searchEl.addEventListener("input", render);
wireAnthemButtons();
wireFixtureTooltips();
wireTeamModal();
init();
