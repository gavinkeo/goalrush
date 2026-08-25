const DATA_URL = "competition.json";
const PLACEHOLDER_CREST = "crest-placeholder.svg";

const state = {
  competition: null,
  entries: [],
};

const podiumEl = document.querySelector("#podium");
const bodyEl = document.querySelector("#standings-body");
const searchEl = document.querySelector("#search");
const updatedEl = document.querySelector("#updated-at");
const livePillEl = document.querySelector("#live-pill");
const liveTextEl = document.querySelector("#live-text");

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

function teamPair(entry, compact = false) {
  const sizeClass = compact ? " compact" : "";
  return `
    <div class="team-pair${sizeClass}">
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

function clubCell(team, competition) {
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

function row(entry, rank) {
  const topClass = rank <= 3 ? "top" : "";
  return `
    <tr>
      <td><span class="rank ${topClass}">${rank}</span></td>
      <td><span class="entrant-name">${escapeHtml(entry.entrant)}</span></td>

      <td>${clubCell(entry.ucl, "UCL")}</td>
      <td class="fixtures-col">${fixtureGrid(entry.ucl, "UCL")}</td>
      <td class="number-col"><span class="subscore ucl-subscore">${clubScore(entry.ucl)}</span></td>

      <td>${clubCell(entry.uel, "UEL")}</td>
      <td class="fixtures-col">${fixtureGrid(entry.uel, "UEL")}</td>
      <td class="number-col"><span class="subscore uel-subscore">${clubScore(entry.uel)}</span></td>

      <td class="number-col"><span class="score total-score">${scoreOf(entry)}</span></td>
    </tr>
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
    bodyEl.innerHTML = `<tr class="no-results"><td colspan="9">No entrant or club matches that search.</td></tr>`;
    return;
  }

  bodyEl.innerHTML = filtered
    .map(entry => row(entry, ranked.indexOf(entry) + 1))
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

function setCompetitionMeta(data) {
  document.querySelector("#competition-title").innerHTML =
    `${escapeHtml(data.titleLine1)}<br><span>${escapeHtml(data.titleLine2)}</span>`;
  document.querySelector("#brand-name").textContent = data.brandName || "EUROPEAN GOAL RUSH";

  const isLive = Boolean(data.isLive);
  livePillEl.classList.toggle("is-live", isLive);
  liveTextEl.textContent = isLive ? "LIVE NOW" : (data.statusLabel || "PRE-SEASON");

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
        <td colspan="9">
          Data failed to load. If opening locally, run a small web server instead of double-clicking index.html.
        </td>
      </tr>`;
  }
}

searchEl.addEventListener("input", render);
init();
