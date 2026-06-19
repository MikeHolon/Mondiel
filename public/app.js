// ===== מצב גלובלי =====
const state = {
  token: localStorage.getItem("mondiel_token") || null,
  me: null,
  matches: [],
  board: [],
  tab: "matches",
  teams: [],
  es: null,
  lastBoard: {}, // id -> points (לאנימציית עליה)
};

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const el = (html) => { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const fmt = (ts) => new Date(ts).toLocaleString("he-IL", { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });

// ===== API =====
async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (state.token) headers.Authorization = "Bearer " + state.token;
  const res = await fetch(path, { ...opts, headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.error || "אירעה שגיאה. נסו שוב.");
  return data;
}

// ===== Toast =====
let toastT;
function toast(msg, type = "ok") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = `toast show ${type}`;
  clearTimeout(toastT);
  toastT = setTimeout(() => (t.className = "toast hidden"), 2600);
}

// ===== דגלים (תמונה עם נפילה לאימוג'י) =====
function flag(team) {
  const safeEmoji = (team.emoji || "⚽").replace(/'/g, "");
  if (!team.iso) return `<span class="flag">${team.emoji || "⚽"}</span>`;
  return `<span class="flag"><img src="https://flagcdn.com/w80/${team.iso}.png" alt="${team.name}" loading="lazy"
    onerror="this.parentNode.textContent='${safeEmoji}'"></span>`;
}

// ===== אימות =====
function showAuth() {
  $("#auth").classList.remove("hidden");
  $("#app").classList.add("hidden");
}
function showApp() {
  $("#auth").classList.add("hidden");
  $("#app").classList.remove("hidden");
}

$$("[data-auth-tab]").forEach((b) =>
  b.addEventListener("click", () => {
    $$("[data-auth-tab]").forEach((x) => x.classList.toggle("active", x === b));
    const t = b.dataset.authTab;
    $("#join-form").classList.toggle("hidden", t !== "join");
    $("#create-form").classList.toggle("hidden", t !== "create");
  })
);

$("#create-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    const data = await api("/api/groups", { method: "POST", body: { name: f.name.value, adminName: f.adminName.value } });
    saveSession(data.token);
    await boot();
    toast(`התחרות "${data.group.name}" נפתחה! הקוד: ${data.group.code}`);
    state.tab = "admin";
    renderApp();
  } catch (err) { toast(err.message, "err"); }
});

$("#join-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.target;
  try {
    const data = await api("/api/join", { method: "POST", body: { code: f.code.value, name: f.name.value } });
    saveSession(data.token);
    await boot();
    toast(`ברוך הבא, ${data.user.name}! 🎉`);
  } catch (err) { toast(err.message, "err"); }
});

function saveSession(t) {
  state.token = t;
  localStorage.setItem("mondiel_token", t);
}
$("#logout").addEventListener("click", () => {
  localStorage.removeItem("mondiel_token");
  state.token = null; state.me = null;
  if (state.es) state.es.close();
  showAuth();
});

// ===== ניווט טאבים =====
$$(".main-tabs .tab").forEach((b) =>
  b.addEventListener("click", () => { state.tab = b.dataset.tab; renderApp(); })
);

$("#comp-code").addEventListener("click", () => {
  if (!state.me) return;
  navigator.clipboard?.writeText(state.me.group.code).then(() => toast("הקוד הועתק! שתפו עם החברים 📋"));
});

// ===== טעינה ראשונית =====
async function boot() {
  try {
    const me = await api("/api/me");
    state.me = me;
    state.teams = me.user.isAdmin ? await api("/api/admin/teams") : [];
    showApp();
    await Promise.all([loadMatches(), loadBoard()]);
    renderApp();
    connectStream();
  } catch (err) {
    localStorage.removeItem("mondiel_token");
    state.token = null;
    showAuth();
  }
}

async function loadMatches() { state.matches = await api("/api/matches"); }
async function loadBoard() { state.board = await api("/api/leaderboard"); }

// ===== עדכונים חיים (SSE) =====
function connectStream() {
  if (state.es) state.es.close();
  const es = new EventSource(`/api/stream?token=${encodeURIComponent(state.token)}`);
  state.es = es;
  es.addEventListener("leaderboard", (e) => {
    state.board = JSON.parse(e.data);
    if (state.tab === "board") renderBoard();
    pulseDot();
  });
  es.addEventListener("matches", async () => {
    await loadMatches();
    if (state.tab === "matches") renderMatches();
    if (state.tab === "admin") renderAdmin();
    pulseDot();
  });
  es.onerror = () => {}; // EventSource מתחבר מחדש לבד
}
function pulseDot() {
  const ball = $(".comp-ball");
  if (!ball) return;
  ball.style.transition = "transform .3s";
  ball.style.transform = "scale(1.35)";
  setTimeout(() => (ball.style.transform = ""), 300);
}

// ===== רינדור ראשי =====
function renderApp() {
  if (!state.me) return;
  $("#comp-name").textContent = state.me.group.name;
  $("#comp-code").textContent = "קוד: " + state.me.group.code;
  $("#who-name").textContent = state.me.user.name;
  $("#who-meta").textContent = `${state.me.members} משתתפים`;
  $$(".admin-only").forEach((x) => x.classList.toggle("hidden", !state.me.user.isAdmin));

  $$(".main-tabs .tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === state.tab));
  $("#view-matches").classList.toggle("hidden", state.tab !== "matches");
  $("#view-board").classList.toggle("hidden", state.tab !== "board");
  $("#view-admin").classList.toggle("hidden", state.tab !== "admin");

  if (state.tab === "matches") renderMatches();
  else if (state.tab === "board") renderBoard();
  else if (state.tab === "admin") renderAdmin();
}

// ===== תצוגת משחקים =====
function ptsClass(p) { return p === 5 ? "p5" : p === 3 ? "p3" : p === 1 ? "p1" : "p0"; }
function ptsLabel(p) { return p === 5 ? "ניחוש מדויק! +5" : p === 3 ? "כיוון+הפרש +3" : p === 1 ? "כיוון נכון +1" : "0 נק'"; }

function renderMatches() {
  const root = $("#view-matches");
  if (!state.matches.length) {
    root.innerHTML = `<div class="empty"><div class="em-ico">📅</div><b>אין עדיין משחקים</b><p>${state.me.user.isAdmin ? "עברו לטאב הניהול כדי להוסיף משחקים." : "מנהל התחרות עדיין לא הוסיף משחקים."}</p></div>`;
    return;
  }
  let html = "";
  let curStage = null;
  for (const m of state.matches) {
    if (m.stage !== curStage) { curStage = m.stage; html += `<div class="stage-head">${m.stage}</div>`; }
    html += matchCard(m);
  }
  root.innerHTML = html;

  // חיווט שמירת ניחוש
  $$(".match", root).forEach((card) => {
    const id = card.dataset.id;
    const m = state.matches.find((x) => x.id === id);
    if (!m || m.locked) return;
    const save = debounce(async () => {
      const home = card.querySelector('[data-side="home"]').value;
      const away = card.querySelector('[data-side="away"]').value;
      if (home === "" || away === "") return;
      try {
        await api("/api/predictions", { method: "POST", body: { matchId: id, home: Number(home), away: Number(away) } });
        flashSaved(card);
        m.prediction = { home: Number(home), away: Number(away), points: 0 };
      } catch (err) { toast(err.message, "err"); }
    }, 700);
    $$(".score-input", card).forEach((inp) => { inp.addEventListener("input", save); inp.addEventListener("change", save); });
  });

  $$(".js-detail", root).forEach((b) =>
    b.addEventListener("click", () => openMatchPredictions(b.dataset.id))
  );
}

function matchCard(m) {
  const live = m.status === "live";
  const done = m.status === "finished";
  const badge = live
    ? `<span class="badge badge-live"><span class="dot"></span>חי</span>`
    : done
    ? `<span class="badge badge-done">הסתיים</span>`
    : m.locked
    ? `<span class="badge badge-locked">נעול</span>`
    : `<span class="badge badge-open">פתוח לניחוש</span>`;

  let center;
  if (done || live) {
    const hw = m.homeScore > m.awayScore, aw = m.awayScore > m.homeScore;
    center = `<div class="score-area">
        <span class="score-final ${hw ? "win" : aw ? "lose" : ""}">${m.homeScore ?? "-"}</span>
        <span class="score-sep">:</span>
        <span class="score-final ${aw ? "win" : hw ? "lose" : ""}">${m.awayScore ?? "-"}</span>
      </div>`;
  } else if (m.locked) {
    const p = m.prediction;
    center = `<div class="score-area" title="המשחק ננעל">
        <span class="score-final lose">${p ? p.home : "-"}</span><span class="score-sep">:</span><span class="score-final lose">${p ? p.away : "-"}</span>
      </div>`;
  } else {
    const p = m.prediction || {};
    center = `<div class="score-area">
        <input class="score-input" data-side="home" type="number" min="0" max="30" inputmode="numeric" value="${p.home ?? ""}" />
        <span class="score-sep">:</span>
        <input class="score-input" data-side="away" type="number" min="0" max="30" inputmode="numeric" value="${p.away ?? ""}" />
      </div>`;
  }

  // שורת תחתית
  let foot = "";
  const p = m.prediction;
  if (done && p) {
    foot = `<div class="match-foot">
      <span class="pred-tag">הניחוש שלך: <b>${p.home}:${p.away}</b></span>
      <span class="pts ${ptsClass(p.points)}">${ptsLabel(p.points)}</span></div>`;
  } else if (done && !p) {
    foot = `<div class="match-foot"><span class="pred-tag">לא ניחשת את המשחק הזה 🙈</span>
      <button class="link-btn js-detail" data-id="${m.id}">מי ניחש מה ←</button></div>`;
  } else if ((done || live) && p) {
    foot = `<div class="match-foot"><span class="pred-tag">הניחוש שלך: <b>${p.home}:${p.away}</b></span>
      <button class="link-btn js-detail" data-id="${m.id}">ניחושי הקבוצה ←</button></div>`;
  } else if (live || (m.locked && !done)) {
    foot = `<div class="match-foot"><span class="pred-tag">${p ? `הניחוש שלך: <b>${p.home}:${p.away}</b>` : "לא ניחשת 🙈"}</span>
      <button class="link-btn js-detail" data-id="${m.id}">ניחושי הקבוצה ←</button></div>`;
  } else {
    foot = `<div class="match-foot"><span class="pred-tag">${p ? `נשמר: <b>${p.home}:${p.away}</b> · אפשר לעדכן` : "הזינו ניחוש לשני הצדדים — נשמר אוטומטית"}</span>
      <span class="saved-slot"></span></div>`;
  }

  if (done && p) {
    foot = foot.replace("</div>", `<button class="link-btn js-detail" data-id="${m.id}">ניחושי הקבוצה ←</button></div>`);
  }

  return `<div class="match ${live ? "is-live" : ""}" data-id="${m.id}">
    <div class="match-top"><span class="match-time">${fmt(m.kickoff)}</span>${badge}</div>
    <div class="match-row">
      <div class="team home">${flag(m.home)}<span class="team-name">${m.home.name}</span></div>
      ${center}
      <div class="team away">${flag(m.away)}<span class="team-name">${m.away.name}</span></div>
    </div>
    ${foot}
  </div>`;
}

function flashSaved(card) {
  const slot = card.querySelector(".saved-slot");
  if (!slot) return;
  slot.innerHTML = `<span class="saved-flash">✓ נשמר</span>`;
  setTimeout(() => (slot.innerHTML = ""), 1800);
}

// ===== טבלת דירוג =====
function renderBoard() {
  const root = $("#view-board");
  const rows = state.board;
  if (!rows.length) { root.innerHTML = `<div class="empty"><div class="em-ico">🏆</div><b>הטבלה ריקה</b></div>`; return; }

  const top3 = rows.slice(0, 3);
  let podium = "";
  if (rows.length >= 2) {
    const order = [top3[1], top3[0], top3[2]]; // שני, ראשון, שלישי
    const cls = ["second", "first", "third"];
    const medal = ["🥈", "🥇", "🥉"];
    podium = `<div class="podium">` + order.map((r, i) => r
      ? `<div class="pod ${cls[i]}"><div class="medal">${medal[i]}</div><div class="pod-name">${r.name}</div><div class="pod-pts">${r.points}</div><div class="lb-stats">${r.exact} מדויקים</div></div>`
      : `<div class="pod ${cls[i]}" style="opacity:.3"><div class="medal">–</div></div>`
    ).join("") + `</div>`;
  }

  const list = rows.map((r) => {
    const me = r.id === state.me.user.id;
    const up = state.lastBoard[r.id] != null && r.points > state.lastBoard[r.id];
    const rc = r.rank === 1 ? "r1" : r.rank === 2 ? "r2" : r.rank === 3 ? "r3" : "";
    return `<div class="lb-row ${me ? "me" : ""} ${up ? "up" : ""}">
      <div class="lb-rank ${rc}">${r.rank}</div>
      <div>
        <div class="lb-name">${r.name}${me ? '<span class="you-chip">את/ה</span>' : ""}${r.isAdmin ? '<span class="admin-chip">מנהל</span>' : ""}</div>
        <div class="lb-stats">${r.played} משחקים · ${r.exact} מדויקים · ${r.hits} פגיעות</div>
      </div>
      <div class="lb-pts">${r.points}</div>
    </div>`;
  }).join("");

  root.innerHTML = `<div class="board-hero">${podium}</div>${list}`;
  state.lastBoard = Object.fromEntries(rows.map((r) => [r.id, r.points]));
}

// ===== מודאל: ניחושי הקבוצה למשחק =====
async function openMatchPredictions(matchId) {
  const m = state.matches.find((x) => x.id === matchId);
  try {
    const rows = await api(`/api/matches/${matchId}/predictions`);
    const body = rows.length
      ? rows.map((r) => `<div class="mp-row"><span>${r.name}</span><span class="mp-score">${r.home}:${r.away} ${m.status === "finished" ? `· <b class="pts ${ptsClass(r.points)}" style="padding:1px 7px">${r.points}</b>` : ""}</span></div>`).join("")
      : `<div class="empty">אף אחד לא ניחש את המשחק הזה.</div>`;
    openModal(`${m.home.name} מול ${m.away.name}`, body);
  } catch (err) { toast(err.message, "err"); }
}

function openModal(title, bodyHtml) {
  const back = el(`<div class="modal-back"><div class="modal"><h3><span>${title}</span><button class="modal-close">✕</button></h3><div class="modal-body">${bodyHtml}</div></div></div>`);
  back.addEventListener("click", (e) => { if (e.target === back || e.target.classList.contains("modal-close")) back.remove(); });
  $("#modal-root").appendChild(back);
}

// ===== ניהול =====
function teamOptions(sel) {
  return state.teams.map((t) => `<option value="${t.code}" ${t.code === sel ? "selected" : ""}>${t.name}</option>`).join("");
}

function renderAdmin() {
  const root = $("#view-admin");
  const g = state.me.group;
  const now = new Date(Date.now() + 3600 * 1000);
  const defaultKO = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

  root.innerHTML = `
    <div class="panel-card">
      <h3>🔗 הזמנת חברים</h3>
      <p class="lb-stats" style="margin-bottom:10px">שתפו את הקוד עם החברים — הם נרשמים בעצמם ומופיעים בטבלה.</p>
      <div class="share-box">
        <div class="share-code" id="share-code">${g.code}</div>
        <button class="btn btn-primary" id="copy-code">העתק</button>
        <button class="btn" id="share-code-btn">שתף</button>
      </div>
    </div>

    <div class="panel-card">
      <h3>➕ הוספת משחק</h3>
      <div class="admin-grid">
        <label>קבוצת בית<select id="add-home">${teamOptions(state.teams[0]?.code)}</select></label>
        <label>קבוצת חוץ<select id="add-away">${teamOptions(state.teams[1]?.code)}</select></label>
        <label>שלב / בית<input id="add-stage" placeholder="לדוגמה: שמינית גמר" value="שלב הבתים" /></label>
        <label>מועד פתיחה<input id="add-ko" type="datetime-local" value="${defaultKO}" /></label>
      </div>
      <button class="btn btn-primary btn-block" id="add-match" style="margin-top:12px">הוסף משחק לתחרות</button>
    </div>

    <div class="panel-card">
      <h3>⚙️ ניהול תוצאות (${state.matches.length} משחקים)</h3>
      <div id="admin-list"></div>
    </div>`;

  $("#copy-code").addEventListener("click", () => navigator.clipboard?.writeText(g.code).then(() => toast("הקוד הועתק 📋")));
  $("#share-code-btn").addEventListener("click", async () => {
    const text = `הצטרפו לתחרות הניחושים "${g.name}" למונדיאל! 🏆\nכנסו ל-${location.origin} והזינו קוד: ${g.code}`;
    if (navigator.share) { try { await navigator.share({ title: "מונדיאל ניחושים", text }); } catch {} }
    else { navigator.clipboard?.writeText(text); toast("הזמנה הועתקה ללוח 📋"); }
  });

  $("#add-match").addEventListener("click", async () => {
    const home = $("#add-home").value, away = $("#add-away").value;
    const stage = $("#add-stage").value;
    const koVal = $("#add-ko").value;
    const kickoff = koVal ? new Date(koVal).getTime() : Date.now() + 3600000;
    try {
      await api("/api/admin/matches", { method: "POST", body: { homeTeam: home, awayTeam: away, stage, kickoff } });
      await loadMatches();
      renderAdmin();
      toast("המשחק נוסף ✓");
    } catch (err) { toast(err.message, "err"); }
  });

  renderAdminList();
}

function renderAdminList() {
  const list = $("#admin-list");
  if (!list) return;
  if (!state.matches.length) { list.innerHTML = `<div class="empty">אין משחקים. הוסיפו אחד למעלה.</div>`; return; }
  list.innerHTML = state.matches.map((m) => {
    const badge = m.status === "live" ? `<span class="badge badge-live"><span class="dot"></span>חי</span>`
      : m.status === "finished" ? `<span class="badge badge-done">הסתיים</span>`
      : `<span class="badge badge-open">פתוח</span>`;
    return `<div class="admin-match" data-id="${m.id}">
      <div class="am-teams">${m.home.emoji} ${m.home.name} <span style="color:var(--muted-2)">vs</span> ${m.away.name} ${m.away.emoji}
        <div class="am-time">${fmt(m.kickoff)} · ${badge}</div></div>
      <input class="am-score" data-r="home" type="number" min="0" inputmode="numeric" value="${m.homeScore ?? ""}" placeholder="-" />
      <span class="score-sep">:</span>
      <input class="am-score" data-r="away" type="number" min="0" inputmode="numeric" value="${m.awayScore ?? ""}" placeholder="-" />
      <div class="am-actions">
        <button class="btn btn-sm" data-act="live">חי</button>
        <button class="btn btn-sm btn-primary" data-act="finish">שמור תוצאה</button>
        <button class="btn btn-sm btn-ghost" data-act="reopen">פתח</button>
        <button class="btn btn-sm btn-danger" data-act="del">✕</button>
      </div>
    </div>`;
  }).join("");

  $$(".admin-match", list).forEach((row) => {
    const id = row.dataset.id;
    const getScores = () => ({ homeScore: row.querySelector('[data-r="home"]').value, awayScore: row.querySelector('[data-r="away"]').value });
    row.querySelectorAll("[data-act]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        const act = btn.dataset.act;
        try {
          if (act === "del") {
            if (!confirm("למחוק את המשחק? כל הניחושים שלו יימחקו.")) return;
            await api(`/api/admin/matches/${id}`, { method: "DELETE" });
            toast("המשחק נמחק");
          } else {
            const { homeScore, awayScore } = getScores();
            const body = {};
            if (act === "live") { body.status = "live"; if (homeScore !== "") body.homeScore = Number(homeScore); if (awayScore !== "") body.awayScore = Number(awayScore); }
            else if (act === "finish") {
              if (homeScore === "" || awayScore === "") return toast("הזינו תוצאה לשני הצדדים", "err");
              body.status = "finished"; body.homeScore = Number(homeScore); body.awayScore = Number(awayScore);
            } else if (act === "reopen") { body.status = "scheduled"; }
            await api(`/api/admin/matches/${id}/result`, { method: "PUT", body });
            toast(act === "finish" ? "התוצאה נשמרה והניקוד עודכן ✓" : act === "live" ? "המשחק סומן כחי 🔴" : "המשחק נפתח מחדש");
          }
          await Promise.all([loadMatches(), loadBoard()]);
          renderAdminList();
        } catch (err) { toast(err.message, "err"); }
      })
    );
  });
}

// ===== עזר =====
function debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; }

// ===== הפעלה =====
if (state.token) boot(); else showAuth();
