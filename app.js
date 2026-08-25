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

function scoreOf(entry) {
  return Number(entry.goalsFor || 0) + Number(entry.goalsAgainst || 0);
}

function rankEntries(entries) {
  return [...entries].sort((a, b) => {
    return (
      scoreOf(b) - scoreOf(a) ||
      Number(b.goalsFor || 0) - Number(a.goalsFor || 0) ||
      String(a.entrant).localeCompare(String(b.entrant))
    );
  });
}

function getCrest(entry) {
  return entry.crest || PLACEHOLDER_CREST;
}

function podiumCard(entry, rank) {
  const classes = ["first", "second", "third"];
  const labels = ["LEADER", "2ND PLACE", "3RD PLACE"];
  const total = scoreOf(entry);

  return `
    <article class="podium-card ${classes[rank - 1]}">
      <div class="podium-topline">
        <span class="medal">${labels[rank - 1]}</span>
        <span class="podium-rank">0${rank}</span>
      </div>
      <div class="podium-team">
        <img class="crest" src="${getCrest(entry)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
        <div>
          <h3>${escapeHtml(entry.entrant)}</h3>
          <p>${escapeHtml(entry.club)}</p>
        </div>
      </div>
      <div class="podium-score">
        <strong>${total}</strong>
        <span>${entry.goalsFor} GF + ${entry.goalsAgainst} GA<br>${entry.played}/8 played</span>
      </div>
    </article>
  `;
}


function fixtureGrid(entry) {
  const fixtures = Array.isArray(entry.fixtures) ? entry.fixtures.slice(0, 8) : [];
  while (fixtures.length < 8) fixtures.push("TBD");

  return `
    <div class="fixture-grid">
      ${fixtures.map((fixture, index) => {
        const value = typeof fixture === "string" ? fixture : (fixture.code || "TBD");
        const status = typeof fixture === "object" ? (fixture.status || "") : "";
        const statusClass = status === "live" ? " live" : status === "played" ? " played" : "";
        return `<span class="fixture-chip${statusClass}" title="Match ${index + 1}">${escapeHtml(value)}</span>`;
      }).join("")}
    </div>
  `;
}

function row(entry, rank) {
  const topClass = rank <= 3 ? "top" : "";
  return `
    <tr>
      <td><span class="rank ${topClass}">${rank}</span></td>
      <td><span class="entrant-name">${escapeHtml(entry.entrant)}</span></td>
      <td>
        <div class="team-cell">
          <img class="crest" src="${getCrest(entry)}" alt="" onerror="this.src='${PLACEHOLDER_CREST}'">
          <span class="team-name">${escapeHtml(entry.club)}</span>
        </div>
      </td>
      <td class="fixtures-col">${fixtureGrid(entry)}</td>
      <td class="number-col"><span class="stat">${entry.played}</span></td>
      <td class="number-col optional-col"><span class="stat">${entry.goalsFor}</span></td>
      <td class="number-col optional-col"><span class="stat">${entry.goalsAgainst}</span></td>
      <td class="number-col"><span class="score">${scoreOf(entry)}</span></td>
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
      entry.club.toLowerCase().includes(query)
    );
  });

  if (!filtered.length) {
    bodyEl.innerHTML = `<tr class="no-results"><td colspan="8">No entrant or club matches that search.</td></tr>`;
    return;
  }

  bodyEl.innerHTML = filtered
    .map(entry => row(entry, ranked.indexOf(entry) + 1))
    .join("");
}

function applyDemoData(entries) {
  // Deterministic mock values for design preview only.
  return entries.map((entry, index) => {
    const played = 1 + (index % 4);
    const goalsFor = (index * 3 + 2) % 10;
    const goalsAgainst = (index * 5 + 1) % 9;
    return { ...entry, played, goalsFor, goalsAgainst };
  });
}

function setCompetitionMeta(data) {
  document.querySelector("#competition-title").innerHTML =
    `${escapeHtml(data.titleLine1)}<br><span>${escapeHtml(data.titleLine2)}</span>`;
  document.querySelector("#brand-name").textContent = data.brandName || "GOAL RUSH";

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
        <td colspan="8">
          Data failed to load. If opening locally, run a small web server instead of double-clicking index.html.
        </td>
      </tr>`;
  }
}

searchEl.addEventListener("input", render);
init();
