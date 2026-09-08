const DATA_URL = "competition.json?v=124";
const PLACEHOLDER_CREST = "crest-placeholder.svg?v=86";

const state = {
  entries: [],
  fixtures: [],
  filters: {
    view: "ALL",
    comp: "ALL",
    md: "ALL"
  }
};

const viewButtons = [
  { value: "TODAY", label: "Today's games" },
  { value: "ALL", label: "Full schedule" }
];
const compButtons = [
  { value: "ALL", label: "All competitions" },
  { value: "UCL", label: "Champions League" },
  { value: "UEL", label: "Europa League" }
];
const mdButtons = [
  { value: "ALL", label: "All matchdays" },
  ...Array.from({ length: 8 }, (_, index) => ({ value: String(index + 1), label: `MD${index + 1}` }))
];

function $(selector) { return document.querySelector(selector); }
function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function clubKey(name) { return String(name || "").trim().toLowerCase(); }

const LIVE_SCORE_POLL_MS = 30000;
const ESPN_SCOREBOARD = {
  UCL: "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.champions/scoreboard",
  UEL: "https://site.api.espn.com/apis/site/v2/sports/soccer/uefa.europa/scoreboard"
};
const LIVE_NAME_ALIASES = {
  "inter milan": ["internazionale", "inter", "fc internazionale milano"],
  "atletico madrid": ["atletico de madrid"],
  "bayern munich": ["bayern munchen", "fc bayern munich", "fc bayern munchen"],
  "paris saint germain": ["psg", "paris sg"],
  "porto": ["fc porto"],
  "sporting cp": ["sporting lisbon", "sporting clube de portugal"],
  "union sg": ["union saint gilloise", "union st gilloise", "union st.-gilloise", "royale union saint gilloise"],
  "rb salzburg": ["red bull salzburg", "fc salzburg", "salzburg"],
  "sparta prague": ["sparta praha", "ac sparta praha"],
  "slavia prague": ["slavia praha", "sk slavia praha"],
  "viktoria plzen": ["fc viktoria plzen"],
  "fenerbahce": ["fenerbahce sk"],
  "besiktas": ["besiktas jk"],
  "omonia": ["omonia nicosia", "ac omonia"],
  "lillestrom": ["lillestrom sk"],
  "hapoel beer sheva": ["hapoel be'er sheva", "hapoel beersheba"],
  "hoffenheim": ["tsg hoffenheim", "1899 hoffenheim"],
  "marseille": ["olympique de marseille"],
  "lens": ["rc lens"],
  "rennes": ["stade rennais", "stade rennais fc"],
  "ofi crete": ["ofi", "ofi fc"],
  "torreense": ["scu torreense", "sc torreense"],
  "nec nijmegen": ["nec", "n.e.c."],
  "como": ["como 1907"],
  "celje": ["nk celje"],
  "viking": ["viking fk"],
  "sabah": ["sabah fk"],
  "jagiellonia": ["jagiellonia bialystok"],
  "bodo glimt": ["bodo/glimt", "fk bodo glimt"],
  "psv eindhoven": ["psv"],
  "stuttgart": ["vfb stuttgart"],
  "anderlecht": ["rsc anderlecht"],
  "shakhtar donetsk": ["shakhtar", "fc shakhtar donetsk"],
  "dinamo zagreb": ["gnk dinamo zagreb"],
  "ferencvaros": ["ferencvarosi tc", "ferencvaros tc"],
  "olympiacos": ["olympiacos fc", "olympiakos"],
  "slovan bratislava": ["sk slovan bratislava"],
  "sturm graz": ["sk sturm graz"],
  "lech poznan": ["kks lech poznan"],
  "lask": ["lask linz"],
  "real betis": ["real betis balompie"],
  "celtic": ["celtic fc"],
  "liverpool": ["liverpool fc"],
  "aston villa": ["aston villa fc"],
  "manchester city": ["man city"],
  "manchester united": ["man united", "man utd"],
  "real sociedad": ["real sociedad san sebastian"],
  "ararat armenia": ["fc ararat armenia"]
};
function liveClubKey(name) {
  return String(name || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/&/g, " and ").replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(fc|cf|sc|ac|afc|fk|sk|rc|sv|vfb|nk|gnk|kks|rsc|jk)\b/g, " ")
    .replace(/\s+/g, " ").trim();
}
function liveClubKeys(name) {
  const base = liveClubKey(name);
  return new Set([base, ...(LIVE_NAME_ALIASES[base] || []).map(liveClubKey)].filter(Boolean));
}
function liveSameClub(a, b) {
  const aKeys = liveClubKeys(a), bKeys = liveClubKeys(b);
  for (const key of aKeys) if (bKeys.has(key)) return true;
  return false;
}
function espnScoreValue(competitor) {
  const raw = competitor?.score?.displayValue ?? competitor?.score?.value ?? competitor?.score;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
function parseEspnEvent(event, comp) {
  const competition = event?.competitions?.[0];
  const competitors = competition?.competitors || [];
  const home = competitors.find(item => item?.homeAway === "home");
  const away = competitors.find(item => item?.homeAway === "away");
  if (!home || !away) return null;
  const type = competition?.status?.type || event?.status?.type || {};
  const stateValue = String(type.state || "").toLowerCase();
  const completed = Boolean(type.completed) || stateValue === "post";
  const live = !completed && (stateValue === "in" || stateValue === "live" || stateValue === "inprogress");
  return {
    comp,
    home: home?.team?.displayName || home?.team?.shortDisplayName || home?.team?.name || "",
    away: away?.team?.displayName || away?.team?.shortDisplayName || away?.team?.name || "",
    homeScore: espnScoreValue(home), awayScore: espnScoreValue(away),
    status: completed ? "ft" : live ? "live" : "upcoming"
  };
}
function currentCompactDate(iso) { return String(iso || "").replaceAll("-", ""); }
function firstFixtureDate() {
  const dates = state.entries.flatMap(entry => [entry?.ucl, entry?.uel])
    .flatMap(team => Array.isArray(team?.fixtures) ? team.fixtures : [])
    .map(item => String(item?.date || "")).filter(Boolean).sort();
  return dates[0] || currentIsoDate();
}
async function fetchEspnScoreboard(comp, startIso, endIso = startIso) {
  const dates = startIso === endIso ? currentCompactDate(startIso) : `${currentCompactDate(startIso)}-${currentCompactDate(endIso)}`;
  const response = await fetch(`${ESPN_SCOREBOARD[comp]}?dates=${encodeURIComponent(dates)}&limit=500`, { cache: "no-store" });
  if (!response.ok) throw new Error(`ESPN ${comp} HTTP ${response.status}`);
  const payload = await response.json();
  return (Array.isArray(payload?.events) ? payload.events : []).map(event => parseEspnEvent(event, comp)).filter(Boolean);
}
function reverseScore(score) {
  const parts = String(score || "").split(/[-–—]/).map(value => value.trim());
  return parts.length === 2 ? `${parts[1]}-${parts[0]}` : String(score || "");
}
function homeOrientedScore(fixture) {
  const raw = String(fixture?.score || "").trim();
  if (!raw) return "";
  return String(fixture?.venue || "").toUpperCase() === "A" ? reverseScore(raw) : raw;
}
function recalculateTeamTotals(team) {
  let goalsFor = 0, goalsAgainst = 0, played = 0;
  (Array.isArray(team?.fixtures) ? team.fixtures : []).forEach(item => {
    const parts = String(item?.score || "").split(/[-–—]/).map(value => Number(String(value).trim()));
    if (parts.length !== 2 || parts.some(value => !Number.isFinite(value))) return;
    goalsFor += parts[0]; goalsAgainst += parts[1];
    if (["played", "finished", "ft"].includes(String(item?.status || "").toLowerCase())) played += 1;
  });
  team.goalsFor = goalsFor; team.goalsAgainst = goalsAgainst; team.played = played;
}
function applyLiveFeed(feedMatches) {
  let changed = false;
  state.entries.forEach(entry => {
    [["UCL", entry?.ucl], ["UEL", entry?.uel]].forEach(([comp, team]) => {
      if (!team?.club || !Array.isArray(team?.fixtures)) return;
      team.fixtures.forEach(fixture => {
        const pair = fixturePairing(team, fixture);
        const match = feedMatches.find(candidate => candidate.comp === comp && liveSameClub(candidate.home, pair.home) && liveSameClub(candidate.away, pair.away));
        if (!match) return;
        const nextStatus = match.status === "live" ? "live" : match.status === "ft" ? "played" : "";
        let nextScore = "";
        if ((match.status === "live" || match.status === "ft") && match.homeScore !== null && match.awayScore !== null) {
          const teamIsHome = liveSameClub(team.club, match.home);
          nextScore = teamIsHome ? `${match.homeScore}-${match.awayScore}` : `${match.awayScore}-${match.homeScore}`;
        }
        if (String(fixture.status || "") !== nextStatus || String(fixture.score || "") !== nextScore) {
          fixture.status = nextStatus; fixture.score = nextScore; changed = true;
        }
      });
      recalculateTeamTotals(team);
    });
  });
  return changed;
}
let liveScorePollingStarted = false;
async function refreshLiveFeed(matchdays, history = false) {
  const today = currentIsoDate();
  const start = history ? firstFixtureDate() : today;
  const results = await Promise.allSettled([
    fetchEspnScoreboard("UCL", start, today),
    fetchEspnScoreboard("UEL", start, today)
  ]);
  const feed = results.flatMap(result => result.status === "fulfilled" ? result.value : []);
  results.filter(result => result.status === "rejected").forEach(result => console.warn("Live score feed:", result.reason));
  if (applyLiveFeed(feed)) {
    state.fixtures = flattenFixtures();
    renderHeaderMatchdays(matchdays || {});
    renderAll();
  }
}
function startLiveScorePolling(matchdays) {
  if (liveScorePollingStarted) return;
  liveScorePollingStarted = true;
  refreshLiveFeed(matchdays, true);
  window.setInterval(() => refreshLiveFeed(matchdays, false), LIVE_SCORE_POLL_MS);
}
function parseDate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}
function currentIsoDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function displayEntrantName(name) {
  return name === "Danielle Neville" ? "Brian Clarke" :
    name === "Bob" ? "Bob O'Neill" :
    name === "Ger O'Brien" ? "Geraldo" :
    name === "Gary Corcoran 🦊" ? "Gary 🦊 Corcoran" :
    name === "John Tierney" ? "Eric Trihy" : name;
}
function ownerForClub(club) {
  const wanted = clubKey(club);
  const entry = state.entries.find(entry => clubKey(entry?.ucl?.club) === wanted || clubKey(entry?.uel?.club) === wanted);
  return entry ? displayEntrantName(entry.entrant) : "";
}
function teamForClub(club) {
  const wanted = clubKey(club);
  for (const entry of state.entries) {
    if (clubKey(entry?.ucl?.club) === wanted) return entry.ucl;
    if (clubKey(entry?.uel?.club) === wanted) return entry.uel;
  }
  return null;
}
function crestForTeam(team) { return team?.crest || PLACEHOLDER_CREST; }
function fixtureKickoffDate(fixture) {
  if (!fixture?.date) return null;
  const [y, m, d] = String(fixture.date).split("-").map(Number);
  const match = String(fixture.kickoff || fixture.time || "00:00").match(/^(\d{1,2}):(\d{2})/);
  const hour = match ? Number(match[1]) : 0;
  const minute = match ? Number(match[2]) : 0;
  return new Date(y, (m || 1) - 1, d || 1, hour, minute, 0, 0);
}
function kickoffText(fixture) {
  const raw = String(fixture?.kickoff || fixture?.time || "").trim();
  const match = raw.match(/(\d{1,2}:\d{2})/);
  return match ? match[1] : (raw || "TBC");
}
function fixtureStatus(fixture) {
  const raw = String(fixture?.status || "").toLowerCase();
  if (raw === "live") return "live";
  if (raw === "played" || raw === "finished" || raw === "ft") return "ft";
  if (String(fixture?.score || "").trim()) return "ft";
  return "upcoming";
}
function fixturePairing(team, fixture) {
  const opponent = fixture?.opponent || fixture?.code || "TBC";
  const venue = String(fixture?.venue || "").toUpperCase();
  const home = venue === "A" ? opponent : team?.club || "";
  const away = venue === "A" ? team?.club || "" : opponent;
  return { home, away };
}
function flattenFixtures() {
  const map = new Map();

  state.entries.forEach(entry => {
    [["UCL", entry?.ucl], ["UEL", entry?.uel]].forEach(([comp, team]) => {
      const fixtures = Array.isArray(team?.fixtures) ? team.fixtures : [];
      fixtures.forEach((fixture, index) => {
        if (!fixture?.date || !(fixture?.opponent || fixture?.code)) return;
        const pair = fixturePairing(team, fixture);
        const key = [comp, index + 1, fixture.date, kickoffText(fixture), clubKey(pair.home), clubKey(pair.away)].join("|");
        const candidate = {
          comp,
          md: index + 1,
          date: fixture.date,
          kickoff: kickoffText(fixture),
          timestamp: fixtureKickoffDate(fixture)?.getTime() ?? Number.POSITIVE_INFINITY,
          status: fixtureStatus(fixture),
          score: homeOrientedScore(fixture),
          home: pair.home,
          away: pair.away,
          homeOwner: ownerForClub(pair.home),
          awayOwner: ownerForClub(pair.away),
          homeTeam: teamForClub(pair.home),
          awayTeam: teamForClub(pair.away),
          stadium: fixture?.stadium || fixture?.ground || ""
        };

        const existing = map.get(key);
        if (!existing) {
          map.set(key, candidate);
          return;
        }
        if (!existing.score && candidate.score) existing.score = candidate.score;
        if (existing.status !== "live" && candidate.status === "live") existing.status = "live";
        if (existing.status === "upcoming" && candidate.status === "ft") existing.status = "ft";
        if (!existing.stadium && candidate.stadium) existing.stadium = candidate.stadium;
      });
    });
  });

  return [...map.values()].sort((a, b) => a.timestamp - b.timestamp || a.comp.localeCompare(b.comp) || a.home.localeCompare(b.home));
}
function dateLabel(iso) {
  return parseDate(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}
function compLabel(comp) {
  return comp === "UCL" ? "Champions League" : "Europa League";
}
function statusMarkup(match) {
  if (match.status === "live") return { text: "LIVE", cls: "live" };
  if (match.status === "ft") return { text: match.score ? match.score.replaceAll("-", "–") : "FT", cls: "ft" };
  return { text: match.kickoff || "TBC", cls: "upcoming" };
}
function fixtureMatchesFilters(match) {
  const today = currentIsoDate();
  if (state.filters.view === "TODAY" && !(match.status === "live" || match.date === today)) return false;
  if (state.filters.comp !== "ALL" && match.comp !== state.filters.comp) return false;
  if (state.filters.md !== "ALL" && Number(match.md) !== Number(state.filters.md)) return false;
  return true;
}
function filteredFixtures() { return state.fixtures.filter(fixtureMatchesFilters); }
function groupedFixtures(list) {
  const groups = [];
  let current = null;
  list.forEach(match => {
    if (!current || current.date !== match.date) {
      current = { date: match.date, matches: [] };
      groups.push(current);
    }
    current.matches.push(match);
  });
  return groups;
}
function renderButtonGroup(containerSelector, buttons, activeValue, onClick) {
  const container = $(containerSelector);
  container.innerHTML = buttons.map(button => `
    <button class="filter-btn ${button.value === activeValue ? "is-active" : ""}" type="button" data-value="${esc(button.value)}">${esc(button.label)}</button>`).join("");
  container.querySelectorAll(".filter-btn").forEach(btn => btn.addEventListener("click", () => onClick(btn.dataset.value)));
}
function renderFilters() {
  renderButtonGroup("#view-filter-row", viewButtons, state.filters.view, value => { state.filters.view = value; renderAll(); });
  renderButtonGroup("#comp-filter-row", compButtons, state.filters.comp, value => { state.filters.comp = value; renderAll(); });
  renderButtonGroup("#md-filter-row", mdButtons, state.filters.md, value => { state.filters.md = value; renderAll(); });
}
function renderSummary(list) {
  const live = list.filter(match => match.status === "live").length;
  const completed = list.filter(match => match.status === "ft").length;
  const upcoming = list.filter(match => match.status === "upcoming").length;
  const summary = [
    { label: "Fixtures shown", value: list.length },
    { label: "Live now", value: live, cls: "live" },
    { label: "Champions League", value: list.filter(match => match.comp === "UCL").length, cls: "ucl" },
    { label: "Europa League", value: list.filter(match => match.comp === "UEL").length, cls: "uel" }
  ];
  if (state.filters.view !== "TODAY") summary[1] = { label: "Upcoming", value: upcoming };
  if (state.filters.view !== "TODAY") summary[3] = { label: "Completed", value: completed };

  $("#summary-grid").innerHTML = summary.map(item => `
    <article class="summary-chip ${item.cls || ""}">
      <span>${esc(item.label)}</span>
      <strong>${esc(item.value)}</strong>
    </article>`).join("");
}
function fixtureCard(match) {
  const status = statusMarkup(match);
  const homeImg = crestForTeam(match.homeTeam);
  const awayImg = crestForTeam(match.awayTeam);
  const dividerMain = match.status === "ft" && match.score ? match.score.replaceAll("-", "–") : match.status === "live" && match.score ? match.score.replaceAll("-", "–") : "v";
  const dividerSub = match.status === "upcoming" ? "kick-off" : match.status === "live" ? "score" : "full time";
  return `
    <article class="fixture-card ${match.status === "live" ? "is-live" : ""}">
      <div class="fixture-card-top">
        <div class="fixture-meta">
          <span class="comp-pill ${match.comp.toLowerCase()}">${esc(compLabel(match.comp))}</span>
          <span class="md-pill">MD${match.md}</span>
        </div>
        <span class="status-pill ${status.cls}">${esc(status.text)}</span>
      </div>
      <div class="fixture-main">
        <div class="match-team home">
          <img src="${esc(homeImg)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
          <span class="match-team-name">${esc(match.home)}</span>
        </div>
        <div class="match-divider">
          <strong>${esc(dividerMain)}</strong>
          <small>${esc(dividerSub)}</small>
        </div>
        <div class="match-team away">
          <span class="match-team-name">${esc(match.away)}</span>
          <img src="${esc(awayImg)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
        </div>
      </div>
      <div class="owners-row">
        <span class="owner">${esc(match.homeOwner || "Unassigned")}</span>
        <span class="versus">owners</span>
        <span class="owner away">${esc(match.awayOwner || "Unassigned")}</span>
      </div>
    </article>`;
}
function renderFixtures() {
  const list = filteredFixtures();
  renderSummary(list);

  const empty = $("#empty-state");
  const scheduleCard = $("#schedule-card");
  const groupsEl = $("#schedule-groups");
  if (!list.length) {
    empty.hidden = false;
    scheduleCard.hidden = true;
    $("#empty-message").textContent = state.filters.view === "TODAY"
      ? "There are no fixtures scheduled today under the current filters. Switch to the full schedule to browse upcoming matchdays."
      : "No fixtures match the selected combination of competition and matchday.";
    return;
  }

  empty.hidden = true;
  scheduleCard.hidden = false;

  const groups = groupedFixtures(list);
  groupsEl.innerHTML = groups.map(group => `
    <section class="date-group">
      <div class="date-head">
        <h2>${esc(dateLabel(group.date))}</h2>
        <span>${group.matches.length} ${group.matches.length === 1 ? "fixture" : "fixtures"}</span>
      </div>
      <div class="fixture-list">
        ${group.matches.map(fixtureCard).join("")}
      </div>
    </section>`).join("");
}

function headerMatchdayTiming(comp, md) {
  const fixtures = state.fixtures.filter(match => match.comp === comp && Number(match.md) === Number(md?.md));
  const kickoffTimes = fixtures.map(match => match.timestamp).filter(Number.isFinite);

  if (!kickoffTimes.length) {
    const firstKickoff = parseDate(md?.start || "");
    const finalWindowEnd = parseDate(md?.end || md?.start || "");
    finalWindowEnd.setHours(23, 59, 59, 999);
    return { firstKickoff, finalWindowEnd, fixtures };
  }

  const firstKickoff = new Date(Math.min(...kickoffTimes));
  const lastKickoff = new Date(Math.max(...kickoffTimes));
  const finalWindowEnd = new Date(lastKickoff.getTime() + (2 * 60 + 15) * 60000);
  return { firstKickoff, finalWindowEnd, fixtures };
}
function relevantHeaderMatchday(comp, schedule) {
  const now = Date.now();
  for (const md of schedule || []) {
    const timing = headerMatchdayTiming(comp, md);
    const explicitLive = timing.fixtures.some(match => match.status === "live");
    if (now < timing.firstKickoff.getTime()) return { md, state: "NEXT", timing };
    if (explicitLive || now <= timing.finalWindowEnd.getTime()) return { md, state: "LIVE", timing };
  }
  return schedule?.length
    ? { md: schedule[schedule.length - 1], state: "COMPLETE", timing: headerMatchdayTiming(comp, schedule[schedule.length - 1]) }
    : null;
}
function formatHeaderMatchday(md) {
  const a = parseDate(md.start);
  const b = parseDate(md.end);
  const am = a.toLocaleString("en-GB", { month: "short" }).toUpperCase();
  const bm = b.toLocaleString("en-GB", { month: "short" }).toUpperCase();
  if (md.start === md.end) return `MD${md.md} · ${a.getDate()} ${am}`;
  if (am === bm) return `MD${md.md} · ${a.getDate()}–${b.getDate()} ${am}`;
  return `MD${md.md} · ${a.getDate()} ${am}–${b.getDate()} ${bm}`;
}
function headerCountdown(kickoffDate) {
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
function renderHeaderMatchday(comp, schedule) {
  const key = comp.toLowerCase();
  const result = relevantHeaderMatchday(comp, schedule);
  const chip = $(`#mc-${key}-matchday`);
  const stateEl = $(`#mc-${key}-state`);
  const dateEl = $(`#mc-${key}-date`);
  if (!result || !chip || !stateEl || !dateEl) return;
  stateEl.textContent = result.state === "NEXT" ? headerCountdown(result.timing.firstKickoff) : result.state;
  dateEl.textContent = formatHeaderMatchday(result.md);
  chip.classList.toggle("is-live", result.state === "LIVE");
}
function renderHeaderMatchdays(matchdays) {
  renderHeaderMatchday("UCL", Array.isArray(matchdays?.ucl) ? matchdays.ucl : []);
  renderHeaderMatchday("UEL", Array.isArray(matchdays?.uel) ? matchdays.uel : []);
}

function renderAll() {
  renderFilters();
  renderFixtures();
}
function applyQueryDefaults() {
  const params = new URLSearchParams(location.search);
  const requestedView = String(params.get("view") || "").toUpperCase();
  const comp = String(params.get("comp") || "").toUpperCase();
  const md = String(params.get("md") || "");

  if (comp === "UCL" || comp === "UEL") state.filters.comp = comp;
  if (/^[1-8]$/.test(md)) state.filters.md = md;

  if (requestedView === "TODAY" || requestedView === "ALL") {
    state.filters.view = requestedView;
    return;
  }

  const hasToday = state.fixtures.some(match => match.status === "live" || match.date === currentIsoDate());
  state.filters.view = hasToday && !comp && !md ? "TODAY" : "ALL";
}
async function init() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`competition.json HTTP ${response.status}`);
    const data = await response.json();
    state.entries = Array.isArray(data.entries) ? data.entries : [];
    state.fixtures = flattenFixtures();
    renderHeaderMatchdays(data.matchdays || {});
    window.setInterval(() => renderHeaderMatchdays(data.matchdays || {}), 30000);
    applyQueryDefaults();
    renderAll();
    startLiveScorePolling(data.matchdays || {});
  } catch (error) {
    console.error(error);
    $("#empty-state").hidden = false;
    $("#schedule-card").hidden = true;
    $("#empty-message").textContent = "The match centre could not load competition data. Upload matches.html, matches.js and competition.json together.";
  }
}
init();
