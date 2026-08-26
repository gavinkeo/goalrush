const DATA_URL = "competition.json?v=49";
const PLACEHOLDER_CREST = "crest-placeholder.svg?v=49";

const $ = (sel) => document.querySelector(sel);
const bodyEl = $("#standings-body");
const mobileEl = $("#mobile-standings");
const searchEl = $("#search");

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

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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


function setAnthemButtonState(btn, playing) {
  if (!btn) return;
  btn.classList.toggle("is-playing", !!playing);
  btn.querySelector(".anthem-icon").textContent = playing ? "❚❚" : "▶";
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
  "tottenham hotspur": ["Tottenham Hotspur", "Tottenham"]
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
      venue: item?.venue || "",
      status: item?.status || "",
      score: item?.score || ""
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

      return `
        <span class="fixture${statusClass}${fixtureTemporalClass(index, comp)}" title="${comp} Matchday ${index + 1}">
          <b>${esc(item.code)}</b>
          ${scoreText ? `<span class="fixture-score">${esc(scoreText)}</span>` : ""}
        </span>`;
    }).join("")
  }</div>`;
}

function teamCell(team, comp) {
  const c = comp.toLowerCase();
  return `
    <div class="team-cell">
      <img class="crest" data-club-key="${esc(clubKey(team.club))}" src="${crest(team)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
      <div class="team-meta">
        <span class="tag ${c}">${comp}</span>
        <span class="team-name">${esc(team.club)}</span>
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

function mobileCard(entry, rank) {
  const row = (team, comp) => `
    <div class="mobile-comp ${comp.toLowerCase()}">
      <div class="mobile-team">
        <span class="mobile-badge ${comp.toLowerCase()}">${comp}</span>
        <img class="crest" data-club-key="${esc(clubKey(team.club))}" src="${crest(team)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
        <strong>${esc(team.club)}</strong>
        <span class="mobile-total">${clubScore(team)}</span>
      </div>
      ${fixtureGrid(team, comp)}
    </div>`;

  const compactClub = (team, comp) => `
    <span class="mobile-mini-team ${comp.toLowerCase()}">
      <img class="crest mini-crest" data-club-key="${esc(clubKey(team.club))}" src="${crest(team)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
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

function populateCombinedMatchdayHeaders(matchdays) {
  const ucl = Array.isArray(matchdays?.ucl) ? matchdays.ucl : [];
  const uel = Array.isArray(matchdays?.uel) ? matchdays.uel : [];
  for (let md = 1; md <= 8; md += 1) {
    const uclMd = ucl.find(item => Number(item.md) === md);
    const uelMd = uel.find(item => Number(item.md) === md);
    const starts = [uclMd?.start, uelMd?.start].filter(Boolean).sort();
    const ends = [uclMd?.end, uelMd?.end].filter(Boolean).sort();
    const label = $(`#md-window-${md}`);
    if (label && starts.length && ends.length) {
      label.textContent = formatCombinedMatchdayWindow(starts[0], ends[ends.length - 1]);
    }
  }
}

function getMatchdayCountdownParts(md) {
  const [y, m, d] = md.start.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const diff = start.getTime() - Date.now();

  if (diff <= 0) {
    return {
      short: "LIVE",
      detailed: "Live now"
    };
  }

  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  let short;
  if (days >= 1) short = `${days}D ${hours}H`;
  else if (hours >= 1) short = `${hours}H ${minutes}M`;
  else short = `${Math.max(1, minutes)}M`;

  const pieces = [];
  if (days > 0) pieces.push(`${days} day${days === 1 ? "" : "s"}`);
  if (hours > 0 || days > 0) pieces.push(`${hours} hour${hours === 1 ? "" : "s"}`);
  if (days === 0 && minutes > 0) pieces.push(`${minutes} minute${minutes === 1 ? "" : "s"}`);

  return {
    short,
    detailed: `Next in ${pieces.join(" ")}`
  };
}

function setMatchday(kind, schedule) {
  const result = relevantMatchday(schedule);
  currentMatchdayState[kind] = result;

  if (!result) return;

  const chip = $(`#${kind}-matchday`);
  const stateEl = $(`#${kind}-state`);
  const countdownEl = $(`#${kind}-countdown`);
  const countdown = getMatchdayCountdownParts(result.md);

  stateEl.textContent =
    result.state === "NEXT" ? countdown.short : result.state;

  stateEl.setAttribute(
    "aria-label",
    result.state === "NEXT"
      ? `Countdown to next ${kind.toUpperCase()} matchday`
      : result.state
  );

  if (countdownEl) {
    countdownEl.textContent =
      result.state === "NEXT"
        ? countdown.detailed
        : result.state === "LIVE"
          ? "Live now"
          : result.state;
  }

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
init();
