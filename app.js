const DATA_URL = "competition.json";
const PLACEHOLDER_CREST = "crest-placeholder.svg";

const state = {
  competition: null,
  entries: [],
};

const podiumEl = document.querySelector("#podium");
const bodyEl = document.querySelector("#standings-body");
const mobileStandingsEl = document.querySelector("#mobile-standings");
const searchEl = document.querySelector("#search");
const updatedEl = document.querySelector("#updated-at");
const uclMatchdayEl = document.querySelector("#ucl-matchday");
const uelMatchdayEl = document.querySelector("#uel-matchday");
const uclStateEl = document.querySelector("#ucl-state");
const uelStateEl = document.querySelector("#uel-state");
const uclDateEl = document.querySelector("#ucl-date");
const uelDateEl = document.querySelector("#uel-date");

function clubScore(team) {
  return Number(team?.goalsFor || 0) + Number(team?.goalsAgainst || 0);
}

function scoreOf(entry) {
  return clubScore(entry.ucl) + clubScore(entry.uel);
}

function rankEntries(entries) {
  return [...entries].sort((a, b) => {
    return (
      scoreOf(b) - scoreOf(a) ||
      clubScore(b.ucl) - clubScore(a.ucl) ||
      Number(b.ucl?.goalsFor || 0) + Number(b.uel?.goalsFor || 0) -
        (Number(a.ucl?.goalsFor || 0) + Number(a.uel?.goalsFor || 0)) ||
      String(a.entrant).localeCompare(String(b.entrant))
    );
  });
}

function getCrest(team) {
  return team?.crest || PLACEHOLDER_CREST;
}

function teamPair(entry) {
  return `
    <div class="team-pair">
      <div class="pair-crests" aria-hidden="true">
        <img class="pair-crest ucl-crest" src="${getCrest(entry.ucl)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
        <img class="pair-crest uel-crest" src="${getCrest(entry.uel)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
      </div>
      <div class="pair-names">
        <span class="pair-ucl"><b>UCL</b> ${escapeHtml(entry.ucl.club)}</span>
        <span class="pair-uel"><b>UEL</b> ${escapeHtml(entry.uel.club)}</span>
      </div>
    </div>
  `;
}

function podiumCard(entry, rank) {
  const classes = ["first", "second", "third"];
  const labels = ["LEADER", "2ND PLACE", "3RD PLACE"];
  const total = scoreOf(entry);
  const uclTotal = clubScore(entry.ucl);
  const uelTotal = clubScore(entry.uel);

  return `
    <article class="podium-card ${classes[rank - 1]}">
      <div class="podium-topline">
        <span class="medal">${labels[rank - 1]}</span>
        <span class="podium-rank">0${rank}</span>
      </div>

      <h3 class="podium-entrant">${escapeHtml(entry.entrant)}</h3>

      ${teamPair(entry)}

      <div class="podium-breakdown">
        <span class="ucl-breakdown">UCL <b>${uclTotal}</b></span>
        <span class="plus-sign">+</span>
        <span class="uel-breakdown">UEL <b>${uelTotal}</b></span>
      </div>

      <div class="podium-score">
        <strong>${total}</strong>
        <span>${entry.ucl.played + entry.uel.played}/16 played<br>combined goal score</span>
      </div>
    </article>
  `;
}

function fixtureGrid(team, competition) {
  const fixtures = Array.isArray(team?.fixtures) ? team.fixtures.slice(0, 8) : [];
  while (fixtures.length < 8) fixtures.push("TBD");

  return `
    <div class="fixture-grid ${competition.toLowerCase()}-fixtures">
      ${fixtures.map((fixture, index) => {
        const value = typeof fixture === "string" ? fixture : (fixture.code || "TBD");
        const status = typeof fixture === "object" ? (fixture.status || "") : "";
        const statusClass = status === "live" ? " live" : status === "played" ? " played" : "";
        return `<span class="fixture-chip${statusClass}" title="${competition} match ${index + 1}">${escapeHtml(value)}</span>`;
      }).join("")}
    </div>
  `;
}

function teamCell(team, competition) {
  const className = competition.toLowerCase();
  return `
    <div class="team-cell ${className}-team">
      <img class="crest" src="${getCrest(team)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
      <div class="club-stack">
        <span class="competition-tag ${className}-tag">${competition}</span>
        <span class="team-name">${escapeHtml(team.club)}</span>
      </div>
    </div>
  `;
}

function entryRows(entry, rank) {
  const topClass = rank <= 3 ? "top" : "";
  const combined = scoreOf(entry);

  return `
    <tr class="entry-row ucl-row">
      <td class="manager-cell" rowspan="2">
        <div class="manager-wrap">
          <span class="rank ${topClass}">${rank}</span>
          <div>
            <span class="manager-label">MANAGER</span>
            <span class="entrant-name">${escapeHtml(entry.entrant)}</span>
            <span class="combined-total">Combined: ${combined}</span>
          </div>
        </div>
      </td>
      <td>${teamCell(entry.ucl, "UCL")}</td>
      <td class="fixtures-col">${fixtureGrid(entry.ucl, "UCL")}</td>
      <td class="number-col"><span class="line-total ucl-line-total">${clubScore(entry.ucl)}</span></td>
    </tr>
    <tr class="entry-row uel-row">
      <td>${teamCell(entry.uel, "UEL")}</td>
      <td class="fixtures-col">${fixtureGrid(entry.uel, "UEL")}</td>
      <td class="number-col"><span class="line-total uel-line-total">${clubScore(entry.uel)}</span></td>
    </tr>
  `;
}


function mobileEntryCard(entry, rank) {
  const topClass = rank <= 3 ? "top" : "";
  const combined = scoreOf(entry);

  return `
    <article class="mobile-entry-card">
      <header class="mobile-entry-header">
        <div class="mobile-rank ${topClass}">${rank}</div>
        <div class="mobile-manager">
          <span class="manager-label">MANAGER</span>
          <strong>${escapeHtml(entry.entrant)}</strong>
        </div>
        <div class="mobile-combined">
          <span>COMBINED</span>
          <strong>${combined}</strong>
        </div>
      </header>

      <div class="mobile-comp-row mobile-ucl-row">
        <div class="mobile-team-line">
          <span class="mobile-comp-badge ucl-badge">UCL</span>
          <img class="mobile-crest" src="${getCrest(entry.ucl)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
          <strong>${escapeHtml(entry.ucl.club)}</strong>
          <span class="mobile-line-total ucl-mobile-total">${clubScore(entry.ucl)}</span>
        </div>
        ${fixtureGrid(entry.ucl, "UCL")}
      </div>

      <div class="mobile-comp-row mobile-uel-row">
        <div class="mobile-team-line">
          <span class="mobile-comp-badge uel-badge">UEL</span>
          <img class="mobile-crest" src="${getCrest(entry.uel)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
          <strong>${escapeHtml(entry.uel.club)}</strong>
          <span class="mobile-line-total uel-mobile-total">${clubScore(entry.uel)}</span>
        </div>
        ${fixtureGrid(entry.uel, "UEL")}
      </div>
    </article>
  `;
}

function render() {
  const ranked = rankEntries(state.entries);
  const query = searchEl.value.trim().toLowerCase();

  podiumEl.innerHTML = ranked.slice(0, 3).map((entry, i) => podiumCard(entry, i + 1)).join("");

  const filtered = ranked.filter(entry => {
    if (!query) return true;
    return (
      entry.entrant.toLowerCase().includes(query) ||
      entry.ucl.club.toLowerCase().includes(query) ||
      entry.uel.club.toLowerCase().includes(query)
    );
  });

  if (!filtered.length) {
    bodyEl.innerHTML = `<tr class="no-results"><td colspan="4">No manager or club matches that search.</td></tr>`;
    mobileStandingsEl.innerHTML = `<div class="mobile-no-results">No manager or club matches that search.</div>`;
    return;
  }

  bodyEl.innerHTML = filtered
    .map(entry => entryRows(entry, ranked.indexOf(entry) + 1))
    .join("");

  mobileStandingsEl.innerHTML = filtered
    .map(entry => mobileEntryCard(entry, ranked.indexOf(entry) + 1))
    .join("");
}

function applyDemoData(entries) {
  return entries.map((entry, index) => {
    const uclPlayed = 1 + (index % 4);
    const uelPlayed = 1 + ((index + 2) % 4);

    return {
      ...entry,
      ucl: {
        ...entry.ucl,
        played: uclPlayed,
        goalsFor: (index * 3 + 4) % 11,
        goalsAgainst: (index * 5 + 2) % 9,
        fixtures: ["RMA", "PSG", "INT", "BAY", "ATM", "BVB", "BEN", "PSV"]
      },
      uel: {
        ...entry.uel,
        played: uelPlayed,
        goalsFor: (index * 4 + 3) % 10,
        goalsAgainst: (index * 2 + 5) % 8,
        fixtures: ["ROM", "LYO", "BET", "FEN", "PAO", "CEL", "FEY", "RBL"]
      }
    };
  });
}


function localDateOnly(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatMatchdayRange(item) {
  const start = parseLocalDate(item.start);
  const end = parseLocalDate(item.end);
  const month = end.toLocaleString("en-GB", { month: "short" }).toUpperCase();

  if (item.start === item.end) {
    return `MD${item.md} · ${start.getDate()} ${month}`;
  }

  const startMonth = start.toLocaleString("en-GB", { month: "short" }).toUpperCase();
  if (startMonth === month) {
    return `MD${item.md} · ${start.getDate()}–${end.getDate()} ${month}`;
  }

  return `MD${item.md} · ${start.getDate()} ${startMonth}–${end.getDate()} ${month}`;
}

function getRelevantMatchday(schedule, today = localDateOnly()) {
  if (!Array.isArray(schedule) || !schedule.length) return null;

  for (const item of schedule) {
    const start = parseLocalDate(item.start);
    const end = parseLocalDate(item.end);

    if (today >= start && today <= end) {
      return { item, state: "LIVE" };
    }

    if (today < start) {
      return { item, state: "NEXT" };
    }
  }

  return { item: schedule[schedule.length - 1], state: "COMPLETE" };
}

function renderMatchdayChip(schedule, chipEl, stateEl, dateEl) {
  const relevant = getRelevantMatchday(schedule);
  if (!relevant) {
    chipEl.hidden = true;
    return;
  }

  chipEl.classList.toggle("is-live", relevant.state === "LIVE");
  chipEl.classList.toggle("is-complete", relevant.state === "COMPLETE");
  stateEl.textContent = relevant.state;
  dateEl.textContent = formatMatchdayRange(relevant.item);
}

function renderMatchdayStrip(data) {
  renderMatchdayChip(data.matchdays?.ucl, uclMatchdayEl, uclStateEl, uclDateEl);
  renderMatchdayChip(data.matchdays?.uel, uelMatchdayEl, uelStateEl, uelDateEl);
}

function setCompetitionMeta(data) {
  document.querySelector("#competition-title").innerHTML =
    `${escapeHtml(data.titleLine1)}<br><span>${escapeHtml(data.titleLine2)}</span>`;
  document.querySelector("#brand-name").textContent = data.brandName || "EUROPEAN GOAL RUSH";

  renderMatchdayStrip(data);

  const updated = data.lastUpdated ? new Date(data.lastUpdated) : new Date();
  updatedEl.textContent = `Last updated ${updated.toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function init() {
  try {
    const response = await fetch(DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    state.competition = data;
    state.entries = data.entries;

    const demo = new URLSearchParams(location.search).get("demo") === "1";
    if (demo) {
      state.entries = applyDemoData(state.entries);
      data.statusLabel = "DEMO MODE";
    }

    setCompetitionMeta(data);
    render();
  } catch (error) {
    console.error(error);
    updatedEl.textContent = "Could not load competition data";
    bodyEl.innerHTML = `
      <tr class="no-results">
        <td colspan="4">
          Data failed to load. If opening locally, run a small web server instead of double-clicking index.html.
        </td>
      </tr>`;
  }
}

searchEl.addEventListener("input", render);
init();
