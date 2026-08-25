const DATA_URL = "competition.json?v=20";
const PLACEHOLDER_CREST = "crest-placeholder.svg?v=20";

const $ = (sel) => document.querySelector(sel);
const podiumEl = $("#podium");
const bodyEl = $("#standings-body");
const mobileEl = $("#mobile-standings");
const searchEl = $("#search");

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

function sortedEntries(list) {
  return [...list].sort((a, b) =>
    totalScore(b) - totalScore(a) ||
    clubScore(b.ucl) - clubScore(a.ucl) ||
    (Number(b.ucl?.goalsFor || 0) + Number(b.uel?.goalsFor || 0)) -
      (Number(a.ucl?.goalsFor || 0) + Number(a.uel?.goalsFor || 0)) ||
    String(a.entrant).localeCompare(String(b.entrant))
  );
}

function crest(team) {
  return team?.crest || PLACEHOLDER_CREST;
}

function fixtureValues(team) {
  const source = Array.isArray(team?.fixtures) ? team.fixtures.slice(0, 8) : [];
  const values = source.map(item => {
    if (typeof item === "string") return { code: item, venue: "", status: "" };
    return {
      code: item?.code || "TBD",
      venue: item?.venue || "",
      status: item?.status || ""
    };
  });

  while (values.length < 8) values.push({ code: "TBD", venue: "", status: "" });
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

      const venue = item.venue === "H" || item.venue === "A"
        ? `<small class="venue ${item.venue.toLowerCase()}">${item.venue}</small>`
        : "";

      return `
        <span class="fixture${statusClass}${fixtureTemporalClass(index, comp)}" title="${comp} Matchday ${index + 1}">
          <b>${esc(item.code)}</b>${venue}
        </span>`;
    }).join("")
  }</div>`;
}

function teamCell(team, comp) {
  const c = comp.toLowerCase();
  return `
    <div class="team-cell">
      <img class="crest" src="${crest(team)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
      <div class="team-meta">
        <span class="tag ${c}">${comp}</span>
        <span class="team-name">${esc(team.club)}</span>
      </div>
    </div>`;
}

function rankMovement(entry, rank) {
  const prev = Number(entry.previousRank);
  if (!Number.isFinite(prev) || prev <= 0) return "";

  const delta = prev - rank;
  if (delta > 0) return `<span class="rank-move up">▲${delta}</span>`;
  if (delta < 0) return `<span class="rank-move down">▼${Math.abs(delta)}</span>`;
  return `<span class="rank-move same">—</span>`;
}

function desktopRows(entry, rank) {
  return `
    <tr class="ucl-row">
      <td class="manager-cell" rowspan="2">
        <div class="manager-wrap">
          <div class="rank-stack">
            <span class="rank ${rank <= 3 ? "top" : ""}">${rank}</span>
            ${rankMovement(entry, rank)}
          </div>
          <div>
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
        <img class="crest" src="${crest(team)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
        <strong>${esc(team.club)}</strong>
        <span class="mobile-total">${clubScore(team)}</span>
      </div>
      ${fixtureGrid(team, comp)}
    </div>`;

  return `
    <article class="mobile-card">
      <div class="mobile-head">
        <div class="rank-stack">
          <span class="rank ${rank <= 3 ? "top" : ""}">${rank}</span>
          ${rankMovement(entry, rank)}
        </div>
        <div>
          <span class="mobile-manager-name">${esc(entry.entrant)}</span>
        </div>
        <div class="mobile-combined">
          <span>COMBINED</span>
          <strong>${totalScore(entry)}</strong>
        </div>
      </div>
      ${row(entry.ucl, "UCL")}
      ${row(entry.uel, "UEL")}
    </article>`;
}

function podiumCard(entry, rank) {
  const labels = ["LEADER", "2ND PLACE", "3RD PLACE"];
  const prizes = ["€400", "€200", "€120"];
  const klass = rank === 1 ? " first" : rank === 2 ? " second" : " third";

  return `
    <article class="podium-card${klass}">
      <div class="podium-top">
        <div class="podium-place">
          <span class="medal">${labels[rank - 1]}</span>
          <span class="podium-prize">${prizes[rank - 1]}</span>
        </div>
        <span class="podium-rank">0${rank}</span>
      </div>
      <h3 class="podium-name">${esc(entry.entrant)}</h3>
      <div class="podium-teams">
        <div class="pair-crests">
          <img src="${crest(entry.ucl)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
          <img src="${crest(entry.uel)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
        </div>
        <div class="podium-team-names">
          <span class="ucl"><b>UCL</b>${esc(entry.ucl.club)}</span>
          <span class="uel"><b>UEL</b>${esc(entry.uel.club)}</span>
        </div>
      </div>
      <div class="podium-bottom">
        <span class="podium-breakdown"><span class="u">UCL ${clubScore(entry.ucl)}</span> + <span class="e">UEL ${clubScore(entry.uel)}</span></span>
        <strong class="podium-score">${totalScore(entry)}</strong>
      </div>
    </article>`;
}

function render() {
  const ranked = sortedEntries(entries);
  const q = searchEl.value.trim().toLowerCase();

  podiumEl.innerHTML = ranked.slice(0, 3).map((e, i) => podiumCard(e, i + 1)).join("");

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

function setMatchday(kind, schedule) {
  const result = relevantMatchday(schedule);
  currentMatchdayState[kind] = result;

  if (!result) return;

  const chip = $(`#${kind}-matchday`);
  $(`#${kind}-state`).textContent = result.state;
  $(`#${kind}-date`).textContent = formatMD(result.md);
  chip.classList.toggle("is-live", result.state === "LIVE");
}

async function init() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`competition.json HTTP ${response.status}`);
    const data = await response.json();

    entries = Array.isArray(data.entries) ? data.entries : [];
    $("#brand-name").textContent = data.brandName || "EURO GOAL RUSH 26/27";

    setMatchday("ucl", data.matchdays?.ucl);
    setMatchday("uel", data.matchdays?.uel);

    render();
  } catch (err) {
    console.error(err);
    podiumEl.innerHTML = "";
    bodyEl.innerHTML = `<tr><td colspan="5">Could not load competition.json. Make sure all v13 files were uploaded together.</td></tr>`;
    mobileEl.innerHTML = `<div class="mobile-card"><div class="mobile-head">Could not load competition data.</div></div>`;
  }
}

searchEl.addEventListener("input", render);
init();
