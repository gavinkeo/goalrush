const DATA_URL = "competition.json?v=121";
const PLACEHOLDER_CREST = "crest-placeholder.svg?v=86";

const $ = (sel) => document.querySelector(sel);
const bodyEl = $("#standings-body");
const mobileEl = $("#mobile-standings");
const searchEl = $("#search");
const teamModalEl = $("#team-modal");
const teamModalContentEl = $("#team-modal-content");
const managerModalEl = $("#manager-modal");
const managerModalContentEl = $("#manager-modal-content");
const matchCentreTeaserEl = $("#match-centre-teaser");
const matchCentreBoardEl = $("#match-centre-board");
const matchCentreKickerEl = $("#match-centre-kicker");
const matchCentreTitleEl = $("#match-centre-title");
const matchCentreSubtitleEl = $("#match-centre-subtitle");
const headerTodayCountEl = $("#header-today-count");
const headerLiveCountEl = $("#header-live-count");
const teaserLiveCountEl = $("#teaser-live-count");
const compactTodayEl = $("#compact-today");
const compactTodayListEl = $("#compact-today-list");
const compactTodaySummaryEl = $("#compact-today-summary");

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
  "Dinamo Zagreb":"DIN",
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
  "NEC Nijmegen":"NEC",
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
  "RB Salzburg":"RBS",
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
  "Union SG":"USG",
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
  if (item?.placeholderScore) return item.placeholderScore;
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
  NEC:"NEC Nijmegen",
  OFI:"OFI Crete",
  OLY:"Olympiacos",
  OMO:"Omonia",
  PLZ:"Viktoria Plzen",
  POR:"Porto",
  PSG:"Paris Saint-Germain",
  PSV:"PSV Eindhoven",
  RBL:"RB Leipzig",
  RBS:"RB Salzburg",
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
  USG:"Union SG",
  VIL:"Villarreal"
};

const CLUB_COUNTRIES = {
  "AC Milan": { code:"IT", name:"Italy" },
  "AEK Athens": { code:"GR", name:"Greece" },
  "AZ Alkmaar": { code:"NL", name:"Netherlands" },
  "Anderlecht": { code:"BE", name:"Belgium" },
  "Ararat-Armenia": { code:"AM", name:"Armenia" },
  "Arsenal": { code:"ENG", name:"England" },
  "Aston Villa": { code:"ENG", name:"England" },
  "Atletico Madrid": { code:"ES", name:"Spain" },
  "Barcelona": { code:"ES", name:"Spain" },
  "Bayer Leverkusen": { code:"DE", name:"Germany" },
  "Bayern Munich": { code:"DE", name:"Germany" },
  "Benfica": { code:"PT", name:"Portugal" },
  "Besiktas": { code:"TR", name:"Turkey" },
  "Bodo/Glimt": { code:"NO", name:"Norway" },
  "Borussia Dortmund": { code:"DE", name:"Germany" },
  "Bournemouth": { code:"ENG", name:"England" },
  "Celje": { code:"SI", name:"Slovenia" },
  "Celta Vigo": { code:"ES", name:"Spain" },
  "Celtic": { code:"SCO", name:"Scotland" },
  "Club Brugge": { code:"BE", name:"Belgium" },
  "Como": { code:"IT", name:"Italy" },
  "Crystal Palace": { code:"ENG", name:"England" },
  "Crvena Zvezda": { code:"RS", name:"Serbia" },
  "Dinamo Zagreb": { code:"HR", name:"Croatia" },
  "Fenerbahce": { code:"TR", name:"Turkey" },
  "Ferencvaros": { code:"HU", name:"Hungary" },
  "Feyenoord": { code:"NL", name:"Netherlands" },
  "GNK Dinamo": { code:"HR", name:"Croatia" },
  "Galatasaray": { code:"TR", name:"Turkey" },
  "Hapoel Beer-Sheva": { code:"IL", name:"Israel" },
  "Hoffenheim": { code:"DE", name:"Germany" },
  "Inter Milan": { code:"IT", name:"Italy" },
  "Jagiellonia": { code:"PL", name:"Poland" },
  "Juventus": { code:"IT", name:"Italy" },
  "LASK": { code:"AT", name:"Austria" },
  "Lech Poznan": { code:"PL", name:"Poland" },
  "Lens": { code:"FR", name:"France" },
  "Levski Sofia": { code:"BG", name:"Bulgaria" },
  "Lille": { code:"FR", name:"France" },
  "Lillestrom": { code:"NO", name:"Norway" },
  "Liverpool": { code:"ENG", name:"England" },
  "Lyon": { code:"FR", name:"France" },
  "Manchester City": { code:"ENG", name:"England" },
  "Manchester United": { code:"ENG", name:"England" },
  "Marseille": { code:"FR", name:"France" },
  "NEC Nijmegen": { code:"NL", name:"Netherlands" },
  "Napoli": { code:"IT", name:"Italy" },
  "OFI Crete": { code:"GR", name:"Greece" },
  "Olympiacos": { code:"GR", name:"Greece" },
  "Omonia": { code:"CY", name:"Cyprus" },
  "PSV Eindhoven": { code:"NL", name:"Netherlands" },
  "Paris Saint-Germain": { code:"FR", name:"France" },
  "Porto": { code:"PT", name:"Portugal" },
  "RB Leipzig": { code:"DE", name:"Germany" },
  "Real Betis": { code:"ES", name:"Spain" },
  "Real Madrid": { code:"ES", name:"Spain" },
  "Real Sociedad": { code:"ES", name:"Spain" },
  "RB Salzburg": { code:"AT", name:"Austria" },
  "Rennes": { code:"FR", name:"France" },
  "Roma": { code:"IT", name:"Italy" },
  "Sabah": { code:"AZ", name:"Azerbaijan" },
  "Shakhtar Donetsk": { code:"UA", name:"Ukraine" },
  "Slavia Prague": { code:"CZ", name:"Czech Republic" },
  "Slovan Bratislava": { code:"SK", name:"Slovakia" },
  "Sparta Prague": { code:"CZ", name:"Czech Republic" },
  "Sporting CP": { code:"PT", name:"Portugal" },
  "Sturm Graz": { code:"AT", name:"Austria" },
  "Stuttgart": { code:"DE", name:"Germany" },
  "Sunderland": { code:"ENG", name:"England" },
  "Torreense": { code:"PT", name:"Portugal" },
  "Trabzonspor": { code:"TR", name:"Turkey" },
  "Union SG": { code:"BE", name:"Belgium" },
  "Viking": { code:"NO", name:"Norway" },
  "Viktoria Plzen": { code:"CZ", name:"Czech Republic" },
  "Villarreal": { code:"ES", name:"Spain" },
  "Young Boys": { code:"CH", name:"Switzerland" },
  "Maccabi Tel Aviv": { code:"IL", name:"Israel" }
};

function countryCodeToFlag(code) {
  const cc = String(code || "").trim().toUpperCase();

  // Football-association flags for UK home nations.
  // These are Unicode subdivision flags rather than the generic UK flag.
  if (cc === "ENG") return "🏴󠁧󠁢󠁥󠁮󠁧󠁿";
  if (cc === "SCO") return "🏴󠁧󠁢󠁳󠁣󠁴󠁿";
  if (cc === "WAL") return "🏴󠁧󠁢󠁷󠁬󠁳󠁿";

  if (!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map(ch => 127397 + ch.charCodeAt(0)));
}

function clubCountryInfo(club) {
  const data = CLUB_COUNTRIES[String(club || "").trim()];
  if (!data?.code) return null;
  return { ...data, flag: countryCodeToFlag(data.code) };
}

function fixtureOpponentCountryInfo(item) {
  const opponent = fixtureOpponentTeam(item);
  return clubCountryInfo(opponent?.club || item?.opponent || opponentFullName(item?.code));
}

function countryFlagMarkup(info, extraClass = "") {
  if (!info?.flag) return "";
  const cls = extraClass ? ` class="fixture-flag ${extraClass}"` : ' class="fixture-flag"';
  return `<span${cls} title="${esc(info.name)}">${esc(info.flag)}</span>`;
}

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
  // Tooltips removed in favour of the richer inline / modal fixture views.
  hideFixtureTooltip();
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

function rankingRows(list) {
  const ranked = sortedEntries(list);
  const rows = [];
  let previousTotal = null;
  let previousRank = null;

  ranked.forEach((entry, index) => {
    const total = totalScore(entry);
    const rank =
      previousTotal !== null && total === previousTotal
        ? previousRank
        : index + 1;

    const tied =
      (index > 0 && totalScore(ranked[index - 1]) === total) ||
      (index < ranked.length - 1 && totalScore(ranked[index + 1]) === total);

    rows.push({
      entry,
      total,
      rank,
      rankLabel: tied ? `T${rank}` : String(rank),
      position: index + 1,
      prizeValue: 0,
      prizeLabel: ""
    });

    previousTotal = total;
    previousRank = rank;
  });

  // Dead-heat rule: entrants tied on the same total share equally the
  // prize money attached to every finishing position occupied by that tie.
  // Example: tied 3rd/4th => (€120 + €0) / 2 = €60 each.
  for (let start = 0; start < rows.length; ) {
    let end = start;
    while (end + 1 < rows.length && rows[end + 1].total === rows[start].total) {
      end += 1;
    }

    const groupSize = end - start + 1;
    let groupPrize = 0;

    for (let position = start + 1; position <= end + 1; position += 1) {
      groupPrize += basePrizeValue(position);
    }

    const share = groupPrize > 0 ? groupPrize / groupSize : 0;
    const label = share > 0 ? formatPrize(share) : "";

    for (let i = start; i <= end; i += 1) {
      rows[i].prizeValue = share;
      rows[i].prizeLabel = label;
    }

    start = end + 1;
  }

  return rows;
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
  "union sg": ["Union SG", "Union Saint-Gilloise"],
  "union saint-gilloise": ["Union SG", "Union Saint-Gilloise"],
  "rb leipzig": ["RB Leipzig", "Leipzig"],
  "rb salzburg": ["RB Salzburg", "Red Bull Salzburg", "Salzburg"],
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
  "nec nijmegen": ["NEC Nijmegen", "N.E.C. Nijmegen", "N.E.C.", "NEC"],
  "n.e.c. nijmegen": ["NEC Nijmegen", "N.E.C. Nijmegen", "N.E.C.", "NEC"],
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
  if (state.state === "COMPLETE" && index === mdIndex) return " past";
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
            ${opponent ? `
              <button class="fixture-crest-plate fixture-crest-button team-fixture-trigger"
                      type="button"
                      data-team="${esc(opponent.club)}"
                      data-comp="${esc(comp)}"
                      aria-label="View ${esc(opponent.club)} fixtures">
                <img class="fixture-opponent-crest"
                     data-club-key="${esc(clubKey(opponentKey))}"
                     src="${esc(fixtureOpponentCrest(item))}"
                     alt=""
                     onerror="this.src='${PLACEHOLDER_CREST}'">
              </button>` : `
              <span class="fixture-crest-plate">
                <img class="fixture-opponent-crest"
                     data-club-key="${esc(clubKey(opponentKey))}"
                     src="${esc(fixtureOpponentCrest(item))}"
                     alt=""
                     onerror="this.src='${PLACEHOLDER_CREST}'">
              </span>`}
            <span class="fixture-score">${esc(scoreText || "–")}</span>
          </span>
        </span>`;
    }).join("")
  }</div>`;
}

function teamCell(team, comp) {
  return `
    <div class="team-cell">
      <button class="team-crest-button team-fixture-trigger"
              type="button"
              data-team="${esc(team.club)}"
              data-comp="${esc(comp)}"
              aria-label="View ${esc(team.club)} fixtures">
        <img class="crest team-main-crest"
             data-club-key="${esc(clubKey(team.club))}"
             src="${crest(team)}"
             alt=""
             onerror="this.src='${PLACEHOLDER_CREST}'">
      </button>
      <div class="team-meta">
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




function desktopManagerNameParts(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: "", last: "" };
  if (parts.length === 1) return { first: "", last: parts[0] };

  let suffix = "";
  const finalToken = parts[parts.length - 1];
  if (!/[\p{L}\p{N}]/u.test(finalToken)) {
    suffix = ` ${parts.pop()}`;
  }

  const last = `${parts.pop() || ""}${suffix}`;
  const first = parts.join(" ");
  return { first, last };
}

function basePrizeValue(position) {
  const prizes = { 1: 400, 2: 200, 3: 120 };
  return prizes[position] || 0;
}

function formatPrize(value) {
  if (!value) return "";
  const rounded = Math.round(value * 100) / 100;
  return `€${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(2)}`;
}

function rankBlock(rank, rankLabel = String(rank), prizeLabel = "") {
  return `
    <div class="rank-box ${rank <= 3 ? `rank-box-${rank}` : ""}">
      <span class="rank-number">${esc(rankLabel)}</span>
      ${prizeLabel ? `<span class="rank-prize">${esc(prizeLabel)}</span>` : ""}
    </div>`;
}

function desktopRows(entry, rank, rankLabel = String(rank), prizeLabel = "") {
  const managerName = desktopManagerNameParts(entry.entrant);
  return `
    <tr class="ucl-row">
      <td class="manager-cell" rowspan="2">
        <div class="manager-wrap">
          <div class="rank-spot">
            ${rankBlock(rank, rankLabel, prizeLabel)}
          </div>
          <div class="manager-name-wrap">
            <button class="manager-name manager-name-button"
                    type="button"
                    data-entrant="${esc(entry.entrant)}"
                    aria-label="View ${esc(entry.entrant)} summary">
              ${managerName.first ? `<span class="manager-first-name">${esc(managerName.first)}</span>` : ""}
              <span class="manager-surname-row">
                <span class="manager-surname">${esc(managerName.last)}</span>
                <span class="manager-open-icon" aria-hidden="true">↗</span>
              </span>
            </button>
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
      const opponent = item?.opponent || opponentFullName(item?.code);
      const countryInfo = fixtureOpponentCountryInfo(item);
      const dateText = formatFixtureListDate(comp, index, item);
      const kickoffText = fixtureKickoffText(item);
      const venueCode = String(item?.venue || "").toUpperCase();
      const venueText = venueCode === "H" ? "H" : venueCode === "A" ? "A" : "–";
      const ariaText = `${team?.club || "Team"} vs ${opponent}. MD${index + 1}. ${dateText}. ${kickoffText}. ${venueCode === "H" ? "Home" : venueCode === "A" ? "Away" : "Venue TBC"}. ${scoreText || "Score TBC"}`;

      return `
        <div class="fixture mobile-fixture-row${statusClass}${fixtureTemporalClass(index, comp)}"
             aria-label="${esc(ariaText)}">
          <span class="mobile-fixture-md">MD${index + 1}</span>
          <span class="mobile-fixture-date">${esc(dateText)}</span>
          <span class="mobile-fixture-time">${esc(kickoffText)}</span>
          <span class="mobile-fixture-opponent-wrap">
            <span class="mobile-fixture-opponent">${countryFlagMarkup(countryInfo, "mobile-opponent-flag")}<span class="mobile-fixture-opponent-text">${esc(opponent)}</span></span>
            ${scoreText ? `<span class="mobile-list-score">${esc(scoreText)}</span>` : ""}
          </span>
          <span class="mobile-fixture-venue ${venueCode === "H" ? "home" : venueCode === "A" ? "away" : ""}"
                title="${venueCode === "H" ? "Home" : venueCode === "A" ? "Away" : "Venue TBC"}">${venueText}</span>
        </div>`;
    }).join("")
  }</div>`;
}

function mobileCard(entry, rank, rankLabel = String(rank), prizeLabel = "") {
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
          ${rankBlock(rank, rankLabel, prizeLabel)}
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
    const countryInfo = fixtureOpponentCountryInfo(item);
    const statusClass = item.status === "live" ? " live" : item.status === "played" ? " played" : "";
    const scoreText = fixtureScoreText(team, item, index) || "–";
    const dateText = formatFixtureListDate(comp, index, item);
    const kickoffText = fixtureKickoffText(item);
    const venueCode = String(item?.venue || "").toUpperCase();
    const venueLabel = venueCode === "H" ? "H" : venueCode === "A" ? "A" : "–";
    const venueWord = venueCode === "H" ? "Home" : venueCode === "A" ? "Away" : "Venue TBC";

    return `
      <div class="team-modal-fixture${statusClass}${fixtureTemporalClass(index, comp)}">
        <span class="team-modal-md">MD${index + 1}</span>
        <span class="team-modal-date">${esc(dateText)}</span>
        <span class="team-modal-time">${esc(kickoffText)}</span>
        <span class="team-modal-venue ${venueCode === "H" ? "home" : venueCode === "A" ? "away" : ""}" title="${venueWord}">${venueLabel}</span>
        <span class="team-modal-opponent">
          ${opponent ? `
            <button class="team-modal-opponent-crest-button team-fixture-trigger"
                    type="button"
                    data-team="${esc(opponent.club)}"
                    data-comp="${esc(comp)}"
                    aria-label="View ${esc(opponent.club)} fixtures">
              <img data-club-key="${esc(clubKey(opponentKey))}"
                   src="${esc(crest(opponent))}"
                   alt=""
                   onerror="this.src='${PLACEHOLDER_CREST}'">
            </button>` : `
            <img data-club-key="${esc(clubKey(opponentKey))}"
                 src="${PLACEHOLDER_CREST}"
                 alt=""
                 onerror="this.src='${PLACEHOLDER_CREST}'">`}
          ${countryFlagMarkup(countryInfo, "team-modal-flag")}
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
    const teamButton = event.target.closest?.(".team-name-button, .team-fixture-trigger");
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


function gapSummary(ranked, rank, total) {
  if (!Array.isArray(ranked) || !ranked.length) return "";
  if (rank === 1) {
    const next = ranked[1];
    if (!next) return "Sole leader";
    const gap = total - totalScore(next);
    return gap > 0 ? `${gap} goal${gap === 1 ? "" : "s"} clear of 2nd` : "Level at the top";
  }

  const leaderGap = totalScore(ranked[0]) - total;
  const above = ranked[rank - 2];
  const aboveGap = above ? totalScore(above) - total : 0;
  if (aboveGap <= 0) return leaderGap > 0 ? `${leaderGap} goal${leaderGap === 1 ? "" : "s"} off the lead` : "Level with the lead";
  return `${aboveGap} goal${aboveGap === 1 ? "" : "s"} behind ${String(above.entrant).toUpperCase()}`;
}

function managerTeamCard(team, comp) {
  const info = clubCountryInfo(team?.club);
  return `
    <button class="manager-modal-team ${String(comp).toLowerCase()}"
            type="button"
            data-team="${esc(team.club)}"
            data-comp="${esc(comp)}"
            aria-label="View ${esc(team.club)} fixtures">
      <span class="manager-modal-team-top">
        <span class="manager-modal-team-badge ${String(comp).toLowerCase()}">${esc(comp)}</span>
        <span class="manager-modal-team-goals">${clubScore(team)}</span>
      </span>
      <span class="manager-modal-team-body">
        <span class="manager-modal-team-crest-wrap">
          <img class="manager-modal-team-crest" data-club-key="${esc(clubKey(team.club))}" src="${esc(crest(team))}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
        </span>
        <span class="manager-modal-team-copy">
          <span class="manager-modal-team-name-row">${countryFlagMarkup(info, "manager-modal-flag")}<strong>${esc(team.club)}</strong></span>
          <span class="manager-modal-team-sub">View 8 fixtures</span>
        </span>
      </span>
    </button>`;
}

function openManagerModal(entrantName) {
  if (!managerModalEl || !managerModalContentEl) return;

  const ranked = sortedEntries(entries);
  const ranking = rankingRows(entries);
  const rankingRow = ranking.find(item => String(item.entry.entrant) === String(entrantName));
  if (!rankingRow) return;

  const entry = rankingRow.entry;
  hideFixtureTooltip();
  const rank = rankingRow.rank;
  const rankLabel = rankingRow.rankLabel;
  const position = rankingRow.position;
  const total = totalScore(entry);
  const prize = rankingRow.prizeLabel;
  const gapText = gapSummary(ranked, position, total);

  managerModalContentEl.innerHTML = `
    <div class="manager-modal-hero">
      <div>
        <span class="manager-modal-eyebrow">Entrant summary</span>
        <h2 id="manager-modal-title">${esc(String(entry.entrant).toUpperCase())}</h2>
        <p class="manager-modal-subhead">${rankLabel.startsWith("T") ? `${esc(rankLabel)} · TIED` : (rank === 1 ? "1st place" : `${rank}${rank === 2 ? "nd" : rank === 3 ? "rd" : "th"} place`)} · ${esc(gapText)}</p>
      </div>
      <div class="manager-modal-rank-box">
        <span>RANK</span>
        <strong>${esc(rankLabel)}</strong>
      </div>
    </div>

    <div class="manager-modal-pair-grid">
      ${managerTeamCard(entry.ucl, "UCL")}
      ${managerTeamCard(entry.uel, "UEL")}
    </div>

    <div class="manager-modal-summary-row">
      <div class="manager-modal-summary-card">
        <span>TOTAL</span>
        <strong>${total}</strong>
      </div>
      <div class="manager-modal-summary-card">
        <span>GOALS SPLIT</span>
        <strong>${clubScore(entry.ucl)} + ${clubScore(entry.uel)}</strong>
      </div>
      <div class="manager-modal-summary-card ${prize ? "is-prize" : ""}">
        <span>${prize ? "PRIZE" : "STATUS"}</span>
        <strong>${prize || esc(gapText)}</strong>
      </div>
    </div>
  `;

  managerModalEl.hidden = false;
  document.documentElement.classList.add("manager-modal-open");
  requestAnimationFrame(() => managerModalEl.classList.add("is-open"));
  managerModalEl.querySelector(".manager-modal-close")?.focus();
}

function closeManagerModal() {
  if (!managerModalEl || managerModalEl.hidden) return;
  managerModalEl.classList.remove("is-open");
  document.documentElement.classList.remove("manager-modal-open");
  window.setTimeout(() => {
    if (!managerModalEl.classList.contains("is-open")) {
      managerModalEl.hidden = true;
    }
  }, 160);
}

function wireManagerModal() {
  document.addEventListener("click", event => {
    const managerButton = event.target.closest?.(".manager-name-button");
    if (managerButton) {
      event.preventDefault();
      openManagerModal(managerButton.dataset.entrant);
      return;
    }

    const managerTeamButton = event.target.closest?.(".manager-modal-team");
    if (managerTeamButton) {
      event.preventDefault();
      closeManagerModal();
      window.setTimeout(() => openTeamModal(managerTeamButton.dataset.team, managerTeamButton.dataset.comp), 90);
      return;
    }

    if (event.target.closest?.("[data-close-manager-modal]")) {
      event.preventDefault();
      closeManagerModal();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && managerModalEl && !managerModalEl.hidden) {
      closeManagerModal();
    }
  });
}

function render() {
  const ranking = rankingRows(entries);
  const q = searchEl.value.trim().toLowerCase();

  const filtered = ranking.filter(({ entry }) =>
    !q ||
    entry.entrant.toLowerCase().includes(q) ||
    entry.ucl.club.toLowerCase().includes(q) ||
    entry.uel.club.toLowerCase().includes(q)
  );

  if (!filtered.length) {
    bodyEl.innerHTML = `<tr><td colspan="5">No matches.</td></tr>`;
    mobileEl.innerHTML = `<div class="mobile-card"><div class="mobile-head">No matches.</div></div>`;
    return;
  }

  bodyEl.innerHTML = filtered
    .map(({ entry, rank, rankLabel, prizeLabel }) =>
      desktopRows(entry, rank, rankLabel, prizeLabel)
    )
    .join("");

  mobileEl.innerHTML = filtered
    .map(({ entry, rank, rankLabel, prizeLabel }) =>
      mobileCard(entry, rank, rankLabel, prizeLabel)
    )
    .join("");
}

function parseDate(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function fixtureKickoffDate(fixture) {
  if (!fixture?.date) return null;

  const [y, m, d] = String(fixture.date).split("-").map(Number);
  if (![y, m, d].every(Number.isFinite)) return null;

  const kickoffMatch = String(fixture.kickoff || "00:00").match(/^(\d{1,2}):(\d{2})/);
  const hour = kickoffMatch ? Number(kickoffMatch[1]) : 0;
  const minute = kickoffMatch ? Number(kickoffMatch[2]) : 0;

  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

function fixturesInsideMatchday(kind, md) {
  if (!md?.start || !md?.end) return [];

  return entries.flatMap(entry => {
    const fixtures = entry?.[kind]?.fixtures;
    if (!Array.isArray(fixtures)) return [];

    return fixtures.filter(fixture =>
      fixture?.date &&
      fixture.date >= md.start &&
      fixture.date <= md.end
    );
  });
}

function matchdayTiming(kind, md) {
  const fixtures = fixturesInsideMatchday(kind, md);
  const kickoffTimes = fixtures
    .map(fixtureKickoffDate)
    .filter(Boolean)
    .map(date => date.getTime());

  if (!kickoffTimes.length) {
    const fallbackStart = parseDate(md.start);
    const fallbackEnd = parseDate(md.end);
    fallbackEnd.setHours(23, 59, 59, 999);

    return {
      firstKickoff: fallbackStart,
      finalWindowEnd: fallbackEnd,
      fixtures
    };
  }

  const firstKickoff = new Date(Math.min(...kickoffTimes));
  const lastKickoff = new Date(Math.max(...kickoffTimes));

  // Covers normal match time plus stoppage / a small buffer.
  const finalWindowEnd = new Date(lastKickoff.getTime() + (2 * 60 + 15) * 60000);

  return { firstKickoff, finalWindowEnd, fixtures };
}

function relevantMatchday(kind, schedule) {
  const now = Date.now();

  for (const md of schedule || []) {
    const timing = matchdayTiming(kind, md);
    const explicitLive = timing.fixtures.some(
      fixture => String(fixture?.status || "").toLowerCase() === "live"
    );

    if (now < timing.firstKickoff.getTime()) {
      return { md, state: "NEXT", timing };
    }

    if (explicitLive || now <= timing.finalWindowEnd.getTime()) {
      return { md, state: "LIVE", timing };
    }
  }

  return schedule?.length
    ? {
        md: schedule[schedule.length - 1],
        state: "COMPLETE",
        timing: matchdayTiming(kind, schedule[schedule.length - 1])
      }
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

function countdownToKickoff(kickoffDate) {
  const diff = kickoffDate.getTime() - Date.now();

  if (diff <= 0) return "LIVE";

  const totalMinutes = Math.max(0, Math.floor(diff / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days >= 1) return `${days}D ${hours}H`;
  if (hours >= 1) return `${hours}H ${minutes}M`;
  return `${Math.max(1, minutes)}M`;
}

function setMatchday(kind, schedule) {
  const result = relevantMatchday(kind, schedule);
  currentMatchdayState[kind] = result;

  if (!result) return;

  const chip = $(`#${kind}-matchday`);
  const stateEl = $(`#${kind}-state`);

  stateEl.textContent =
    result.state === "NEXT"
      ? countdownToKickoff(result.timing.firstKickoff)
      : result.state;

  stateEl.setAttribute(
    "aria-label",
    result.state === "NEXT"
      ? `Countdown to first kickoff of ${kind.toUpperCase()} matchday ${result.md.md}`
      : result.state === "LIVE"
        ? `${kind.toUpperCase()} matchday ${result.md.md} is live`
        : result.state
  );

  $(`#${kind}-date`).textContent = formatMD(result.md);
  chip.classList.toggle("is-live", result.state === "LIVE");
}


function ownerForClub(club) {
  const wanted = clubKey(club);
  if (!wanted) return "";
  const entry = entries.find(entry => clubKey(entry?.ucl?.club) === wanted || clubKey(entry?.uel?.club) === wanted);
  return entry?.entrant || "";
}

function fixtureStatus(item) {
  const raw = String(item?.status || "").toLowerCase();
  if (raw === "live") return "live";
  if (raw === "played" || raw === "finished" || raw === "ft") return "ft";
  if (String(item?.score || "").trim()) return "ft";
  return "upcoming";
}

function fixtureDateTimeValue(item) {
  const value = fixtureKickoffDate(item);
  return value ? value.getTime() : Number.POSITIVE_INFINITY;
}

function fixturePairing(team, item) {
  const opponentName = item?.opponent || opponentFullName(item?.code);
  const venue = String(item?.venue || "").toUpperCase();
  const home = venue === "A" ? opponentName : team?.club || "";
  const away = venue === "A" ? team?.club || "" : opponentName;
  return { home, away, venue };
}

function allCompetitionFixtures() {
  const map = new Map();

  entries.forEach(entry => {
    [["UCL", entry?.ucl], ["UEL", entry?.uel]].forEach(([comp, team]) => {
      fixtureValues(team).forEach((item, index) => {
        if (!item?.date || !(item?.opponent || item?.code)) return;

        const pairing = fixturePairing(team, item);
        const key = [comp, index + 1, item.date, fixtureKickoffText(item), clubKey(pairing.home), clubKey(pairing.away)].join("|");
        const status = fixtureStatus(item);
        const existing = map.get(key);

        const base = {
          comp,
          md: index + 1,
          date: item.date,
          kickoff: fixtureKickoffText(item),
          timestamp: fixtureDateTimeValue(item),
          status,
          score: String(item?.score || "").trim(),
          home: pairing.home,
          away: pairing.away,
          homeOwner: ownerForClub(pairing.home),
          awayOwner: ownerForClub(pairing.away),
          homeTeam: competitionTeamByClub(pairing.home),
          awayTeam: competitionTeamByClub(pairing.away),
          stadium: item?.stadium || ""
        };

        if (!existing) {
          map.set(key, base);
          return;
        }

        if (!existing.score && base.score) existing.score = base.score;
        if (existing.status !== "live" && base.status === "live") existing.status = "live";
        if (existing.status === "upcoming" && base.status === "ft") existing.status = "ft";
        if (!existing.stadium && base.stadium) existing.stadium = base.stadium;
        if (!existing.homeTeam && base.homeTeam) existing.homeTeam = base.homeTeam;
        if (!existing.awayTeam && base.awayTeam) existing.awayTeam = base.awayTeam;
        if (!existing.homeOwner && base.homeOwner) existing.homeOwner = base.homeOwner;
        if (!existing.awayOwner && base.awayOwner) existing.awayOwner = base.awayOwner;
      });
    });
  });

  return [...map.values()].sort((a, b) =>
    a.timestamp - b.timestamp ||
    a.comp.localeCompare(b.comp) ||
    a.home.localeCompare(b.home)
  );
}

function fixtureDateHeading(isoDate) {
  if (!isoDate) return "Date TBC";
  const date = parseDate(isoDate);
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }).toUpperCase();
}

function teaserStatusLabel(match) {
  if (match.status === "live") return { text: "LIVE", className: "live" };
  if (match.status === "ft") return { text: match.score ? match.score.replaceAll("-", "–") : "FT", className: "ft" };
  return { text: match.kickoff || "TBC", className: "upcoming" };
}

function teaserTeamMarkup(club, team, align = "home") {
  const image = team ? crest(team) : PLACEHOLDER_CREST;
  return `
    <span class="teaser-team ${align}">
      ${align === "away" ? `<span class="teaser-team-name">${esc(club)}</span>` : ""}
      <img src="${esc(image)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
      ${align === "home" ? `<span class="teaser-team-name">${esc(club)}</span>` : ""}
    </span>`;
}

function fixtureClusterMarkup(comp, fixtures, mode = "today") {
  const compName = comp === "UCL" ? "Champions League" : "Europa League";
  const md = fixtures[0]?.md || 1;
  const countText = fixtures.length === 1 ? "1 fixture" : `${fixtures.length} fixtures`;
  const headText = mode === "today" ? fixtureDateHeading(fixtures[0]?.date) : `MD${md} · ${fixtureDateHeading(fixtures[0]?.date)}`;
  const visible = fixtures.slice(0, 4);
  const more = fixtures.length - visible.length;

  return `
    <article class="fixture-cluster ${comp.toLowerCase()}">
      <div class="fixture-cluster-head">
        <div class="fixture-cluster-label">
          <span class="fixture-cluster-pill">${comp}</span>
          <div class="fixture-cluster-meta">
            <strong>${compName}</strong>
            <span>${esc(headText)}</span>
          </div>
        </div>
        <span class="fixture-cluster-count">${esc(countText)}</span>
      </div>
      <div class="fixture-cluster-list">
        ${visible.map(match => {
          const status = teaserStatusLabel(match);
          const ownerHome = match.homeOwner ? esc(match.homeOwner) : "Unassigned";
          const ownerAway = match.awayOwner ? esc(match.awayOwner) : "Unassigned";
          return `
            <div class="teaser-fixture">
              <div class="teaser-fixture-time"><span class="teaser-status ${status.className}">${esc(status.text)}</span></div>
              <div class="teaser-fixture-body">
                <div class="teaser-teams">
                  ${teaserTeamMarkup(match.home, match.homeTeam, "home")}
                  <span class="teaser-score-sep">v</span>
                  ${teaserTeamMarkup(match.away, match.awayTeam, "away")}
                </div>
                <div class="teaser-owners">
                  <span class="teaser-owner">${ownerHome}</span>
                  <span class="teaser-owner away">${ownerAway}</span>
                </div>
              </div>
              <a class="match-centre-mini-link" href="matches.html?comp=${comp}&md=${match.md}">MD${match.md}</a>
            </div>`;
        }).join("")}
        ${more > 0 ? `<div class="fixture-cluster-empty">+${more} more in the full match centre.</div>` : ""}
      </div>
    </article>`;
}

function updateMatchCentreNavBadges(fixtures = allCompetitionFixtures()) {
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todayCount = fixtures.filter(match => match.status === "live" || match.date === todayIso).length;
  const liveCount = fixtures.filter(match => match.status === "live").length;

  if (headerTodayCountEl) headerTodayCountEl.textContent = `${todayCount} TODAY`;

  [headerLiveCountEl, teaserLiveCountEl].forEach(el => {
    if (!el) return;
    el.textContent = `${liveCount} LIVE`;
    el.classList.toggle("is-live", liveCount > 0);
  });
}

function compactFixtureStatus(match) {
  if (match.status === "live") return { text: "LIVE", className: "live" };
  if (match.status === "ft") return { text: match.score ? match.score.replaceAll("-", "–") : "FT", className: "ft" };
  return { text: match.kickoff || "TBC", className: "upcoming" };
}

function compactTeamMarkup(club, team, side) {
  const image = team ? crest(team) : PLACEHOLDER_CREST;
  return `
    <span class="compact-team ${side}">
      ${side === "away" ? `<span class="compact-team-name">${esc(club)}</span>` : ""}
      <img src="${esc(image)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
      ${side === "home" ? `<span class="compact-team-name">${esc(club)}</span>` : ""}
    </span>`;
}

function renderCompactToday() {
  const fixtures = allCompetitionFixtures();
  updateMatchCentreNavBadges(fixtures);
  if (!compactTodayEl || !compactTodayListEl) return;

  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const todaysFixtures = fixtures.filter(match => match.status === "live" || match.date === todayIso);

  if (!todaysFixtures.length) {
    compactTodayEl.hidden = true;
    compactTodayListEl.innerHTML = "";
    return;
  }

  const uclCount = todaysFixtures.filter(match => match.comp === "UCL").length;
  const uelCount = todaysFixtures.filter(match => match.comp === "UEL").length;
  if (compactTodaySummaryEl) {
    const bits = [];
    if (uclCount) bits.push(`<span class="ucl">UCL ${uclCount}</span>`);
    if (uelCount) bits.push(`<span class="uel">UEL ${uelCount}</span>`);
    bits.push(`<span>${todaysFixtures.length} ${todaysFixtures.length === 1 ? "FIXTURE" : "FIXTURES"}</span>`);
    compactTodaySummaryEl.innerHTML = bits.join(" · ");
  }

  compactTodayListEl.innerHTML = todaysFixtures.map(match => {
    const status = compactFixtureStatus(match);
    return `
      <a class="compact-fixture" href="matches.html?comp=${match.comp}&md=${match.md}" aria-label="${esc(match.home)} v ${esc(match.away)} in the match centre">
        <span class="compact-fixture-status ${status.className}">${esc(status.text)}</span>
        <span class="compact-comp ${match.comp.toLowerCase()}">${match.comp}</span>
        <span class="compact-teams">
          ${compactTeamMarkup(match.home, match.homeTeam, "home")}
          <span class="compact-v">v</span>
          ${compactTeamMarkup(match.away, match.awayTeam, "away")}
        </span>
      </a>`;
  }).join("");

  compactTodayEl.hidden = false;
}

function renderMatchCentreTeaser() {
  const fixtures = allCompetitionFixtures();
  updateMatchCentreNavBadges(fixtures);

  if (!matchCentreTeaserEl || !matchCentreBoardEl) return;
  const now = Date.now();
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const liveOrToday = fixtures.filter(match => match.status === "live" || match.date === todayIso);
  const teaserMode = liveOrToday.length ? "today" : "next";

  const title = teaserMode === "today" ? "Today's live and upcoming fixtures" : "Next scheduled fixtures";
  const subtitle = teaserMode === "today"
    ? "Quick access to today’s schedule across both competitions. Open the full match centre for every fixture and live status update."
    : "No fixtures are scheduled today. The next games below show the upcoming matchday in each competition.";

  if (matchCentreKickerEl) matchCentreKickerEl.textContent = teaserMode === "today" ? "TODAY'S GAMES" : "NEXT GAMES";
  if (matchCentreTitleEl) matchCentreTitleEl.textContent = title;
  if (matchCentreSubtitleEl) matchCentreSubtitleEl.textContent = subtitle;

  const sections = ["UCL", "UEL"].map(comp => {
    const compFixtures = fixtures.filter(match => match.comp === comp);

    let relevant = [];
    if (teaserMode === "today") {
      relevant = compFixtures.filter(match => match.status === "live" || match.date === todayIso);
    } else {
      relevant = compFixtures.filter(match => Number.isFinite(match.timestamp) && match.timestamp >= now);
      if (relevant.length) {
        const md = relevant[0].md;
        relevant = relevant.filter(match => match.md === md);
      }
    }

    if (!relevant.length) {
      return `
        <article class="fixture-cluster ${comp.toLowerCase()}">
          <div class="fixture-cluster-head">
            <div class="fixture-cluster-label">
              <span class="fixture-cluster-pill">${comp}</span>
              <div class="fixture-cluster-meta">
                <strong>${comp === "UCL" ? "Champions League" : "Europa League"}</strong>
                <span>No fixtures available</span>
              </div>
            </div>
          </div>
          <div class="fixture-cluster-empty">No scheduled fixtures found for this competition.</div>
        </article>`;
    }

    return fixtureClusterMarkup(comp, relevant, teaserMode);
  });

  matchCentreBoardEl.innerHTML = sections.join("");
  matchCentreTeaserEl.hidden = false;
}

async function init() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`competition.json HTTP ${response.status}`);
    const data = await response.json();

    entries = Array.isArray(data.entries)
      ? data.entries.map(entry => ({
          ...entry,
          entrant:
            entry?.entrant === "Danielle Neville" ? "Brian Clarke" :
            entry?.entrant === "Bob" ? "Bob O'Neill" :
            entry?.entrant === "Ger O'Brien" ? "Geraldo" :
            entry?.entrant === "Gary Corcoran 🦊" ? "Gary 🦊 Corcoran" :
            entry?.entrant === "John Tierney" ? "Eric Trihy" :
            entry?.entrant
        }))
      : [];


    const uclSchedule = data.matchdays?.ucl || [];
    const uelSchedule = data.matchdays?.uel || [];
    competitionMatchdays.ucl = uclSchedule;
    competitionMatchdays.uel = uelSchedule;

    populateCombinedMatchdayHeaders(data.matchdays);
    setMatchday("ucl", uclSchedule);
    setMatchday("uel", uelSchedule);
    renderCompactToday();

    window.setInterval(() => {
      setMatchday("ucl", uclSchedule);
      setMatchday("uel", uelSchedule);
      renderCompactToday();
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
wireManagerModal();
init();
