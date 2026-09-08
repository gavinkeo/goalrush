const DATA_URL = "competition.json?v=119";
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
          score: String(fixture?.score || "").trim(),
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
  const heroNote = $("#hero-note");

  heroNote.textContent = state.filters.view === "TODAY"
    ? "Today's live and upcoming fixtures are shown below. Use the filters to jump to a specific competition or matchday."
    : "Browse the full league-phase schedule, or narrow the page to a single competition and matchday.";

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
    applyQueryDefaults();
    renderAll();
  } catch (error) {
    console.error(error);
    $("#empty-state").hidden = false;
    $("#schedule-card").hidden = true;
    $("#empty-message").textContent = "The match centre could not load competition data. Upload matches.html, matches.js and competition.json together.";
  }
}
init();
