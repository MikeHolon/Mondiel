import express from "express";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { db } from "./lib/db.js";
import { scorePrediction, SCORING_RULES } from "./lib/scoring.js";
import { TEAMS, seedMatchesForGroup, uid } from "./lib/seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

/* ------------------------------------------------------------------ */
/*  עוזרים                                                             */
/* ------------------------------------------------------------------ */
function token() {
  return crypto.randomBytes(24).toString("hex");
}

// קוד הצטרפות קריא (ללא תווים מבלבלים)
function joinCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 6 }, () => chars[crypto.randomInt(chars.length)]).join("");
  } while (db.all("groups").some((g) => g.code === code));
  return code;
}

function userFromReq(req) {
  const auth = req.headers.authorization || "";
  const t = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!t) return null;
  return db.all("users").find((u) => u.token === t) || null;
}

function requireUser(req, res, next) {
  const user = userFromReq(req);
  if (!user) return res.status(401).json({ error: "לא מחובר. יש להירשם מחדש." });
  req.user = user;
  req.group = db.get("groups", user.groupId);
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: "פעולה זו מותרת למנהל הקבוצה בלבד." });
  next();
}

function teamView(code) {
  const t = TEAMS[code] || { name: code, iso: "", emoji: "⚽" };
  return { code, name: t.name, iso: t.iso, emoji: t.emoji };
}

function publicMatch(m, userPred) {
  const locked = m.status !== "scheduled" || Date.now() >= m.kickoff;
  return {
    id: m.id,
    order: m.order,
    stage: m.stage,
    home: teamView(m.homeTeam),
    away: teamView(m.awayTeam),
    kickoff: m.kickoff,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
    locked, // האם נסגר לניחוש
    prediction: userPred ? { home: userPred.home, away: userPred.away, points: userPred.points } : null,
  };
}

// ניקוד מחדש של כל הניחושים למשחק נתון
function rescoreMatch(matchId) {
  const match = db.get("matches", matchId);
  if (!match) return;
  for (const p of db.all("predictions")) {
    if (p.matchId !== matchId) continue;
    p.points = scorePrediction(p, match);
    db.put("predictions", p);
  }
}

function computeLeaderboard(groupId) {
  const users = db.all("users").filter((u) => u.groupId === groupId);
  const preds = db.all("predictions");
  const matches = new Map(db.all("matches").filter((m) => m.groupId === groupId).map((m) => [m.id, m]));

  const rows = users.map((u) => {
    let pts = 0, exact = 0, hits = 0, played = 0;
    for (const p of preds) {
      if (p.userId !== u.id) continue;
      const m = matches.get(p.matchId);
      if (!m || m.homeScore == null || m.awayScore == null) continue;
      played += 1;
      pts += p.points || 0;
      if (p.points === 5) exact += 1;
      if ((p.points || 0) > 0) hits += 1;
    }
    return { id: u.id, name: u.name, isAdmin: !!u.isAdmin, points: pts, exact, hits, played };
  });

  rows.sort((a, b) => b.points - a.points || b.exact - a.exact || b.hits - a.hits || a.name.localeCompare(b.name, "he"));
  let rank = 0, prevPts = null, prevExact = null;
  rows.forEach((r, i) => {
    if (r.points !== prevPts || r.exact !== prevExact) {
      rank = i + 1;
      prevPts = r.points;
      prevExact = r.exact;
    }
    r.rank = rank;
  });
  return rows;
}

/* ------------------------------------------------------------------ */
/*  Server-Sent Events – עדכונים חיים                                  */
/* ------------------------------------------------------------------ */
const clients = new Map(); // res -> groupId

app.get("/api/stream", (req, res) => {
  const user = userFromReq(req) || (req.query.token ? db.all("users").find((u) => u.token === req.query.token) : null);
  if (!user) return res.status(401).end();
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(`retry: 3000\n\n`);
  clients.set(res, user.groupId);
  const ping = setInterval(() => res.write(`event: ping\ndata: {}\n\n`), 25000);
  req.on("close", () => {
    clearInterval(ping);
    clients.delete(res);
  });
});

function broadcast(groupId, event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [res, gid] of clients) {
    if (gid === groupId) {
      try { res.write(payload); } catch { clients.delete(res); }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  הרשמה / קבוצות                                                     */
/* ------------------------------------------------------------------ */
app.post("/api/groups", (req, res) => {
  const name = (req.body?.name || "").trim();
  const adminName = (req.body?.adminName || "").trim();
  if (name.length < 2) return res.status(400).json({ error: "יש להזין שם תחרות (לפחות 2 תווים)." });
  if (adminName.length < 2) return res.status(400).json({ error: "יש להזין את שמך." });

  const group = {
    id: uid("g"),
    name,
    code: joinCode(),
    createdAt: Date.now(),
  };
  db.put("groups", group);

  // שכפול תבנית המשחקים לקבוצה
  for (const m of seedMatchesForGroup(group.id)) db.put("matches", m);
  // ניקוד ראשוני למשחקים שכבר הסתיימו אינו נדרש (אין עדיין ניחושים)

  const user = {
    id: uid("u"),
    groupId: group.id,
    name: adminName,
    token: token(),
    isAdmin: true,
    createdAt: Date.now(),
  };
  db.put("users", user);

  res.json({ group: { id: group.id, name: group.name, code: group.code }, user: { id: user.id, name: user.name, isAdmin: true }, token: user.token });
});

app.post("/api/join", (req, res) => {
  const code = (req.body?.code || "").trim().toUpperCase();
  const name = (req.body?.name || "").trim();
  if (!code) return res.status(400).json({ error: "יש להזין קוד הצטרפות." });
  if (name.length < 2) return res.status(400).json({ error: "יש להזין שם (לפחות 2 תווים)." });

  const group = db.all("groups").find((g) => g.code === code);
  if (!group) return res.status(404).json({ error: "קוד הצטרפות לא נמצא. בדקו עם מנהל התחרות." });

  const exists = db.all("users").find((u) => u.groupId === group.id && u.name.trim() === name);
  if (exists) return res.status(409).json({ error: "השם הזה כבר תפוס בתחרות. בחרו שם אחר." });

  const user = {
    id: uid("u"),
    groupId: group.id,
    name,
    token: token(),
    isAdmin: false,
    createdAt: Date.now(),
  };
  db.put("users", user);
  broadcast(group.id, "leaderboard", computeLeaderboard(group.id));

  res.json({ group: { id: group.id, name: group.name, code: group.code }, user: { id: user.id, name: user.name, isAdmin: false }, token: user.token });
});

app.get("/api/me", requireUser, (req, res) => {
  res.json({
    user: { id: req.user.id, name: req.user.name, isAdmin: !!req.user.isAdmin },
    group: { id: req.group.id, name: req.group.name, code: req.group.code },
    members: db.all("users").filter((u) => u.groupId === req.group.id).length,
    scoring: SCORING_RULES,
  });
});

/* ------------------------------------------------------------------ */
/*  משחקים + ניחושים                                                   */
/* ------------------------------------------------------------------ */
app.get("/api/matches", requireUser, (req, res) => {
  const matches = db.all("matches").filter((m) => m.groupId === req.group.id);
  const myPreds = new Map(
    db.all("predictions").filter((p) => p.userId === req.user.id).map((p) => [p.matchId, p])
  );
  matches.sort((a, b) => a.kickoff - b.kickoff || a.order - b.order);
  res.json(matches.map((m) => publicMatch(m, myPreds.get(m.id))));
});

app.post("/api/predictions", requireUser, (req, res) => {
  const { matchId } = req.body || {};
  const home = Number(req.body?.home);
  const away = Number(req.body?.away);
  const match = db.get("matches", matchId);
  if (!match || match.groupId !== req.group.id) return res.status(404).json({ error: "משחק לא נמצא." });
  if (!Number.isInteger(home) || !Number.isInteger(away) || home < 0 || away < 0 || home > 30 || away > 30) {
    return res.status(400).json({ error: "ניחוש לא תקין." });
  }
  if (match.status !== "scheduled" || Date.now() >= match.kickoff) {
    return res.status(403).json({ error: "המשחק נסגר לניחושים." });
  }

  let pred = db.all("predictions").find((p) => p.userId === req.user.id && p.matchId === matchId);
  if (!pred) {
    pred = { id: uid("p"), userId: req.user.id, matchId, groupId: req.group.id };
  }
  pred.home = home;
  pred.away = away;
  pred.points = 0;
  pred.updatedAt = Date.now();
  db.put("predictions", pred);

  res.json({ ok: true, prediction: { home, away } });
});

/* ------------------------------------------------------------------ */
/*  דירוג                                                              */
/* ------------------------------------------------------------------ */
app.get("/api/leaderboard", requireUser, (req, res) => {
  res.json(computeLeaderboard(req.group.id));
});

// פירוט ניחושים למשחק שכבר נסגר (מי ניחש מה)
app.get("/api/matches/:id/predictions", requireUser, (req, res) => {
  const match = db.get("matches", req.params.id);
  if (!match || match.groupId !== req.group.id) return res.status(404).json({ error: "משחק לא נמצא." });
  if (match.status === "scheduled" && Date.now() < match.kickoff) {
    return res.status(403).json({ error: "הניחושים ייחשפו עם פתיחת המשחק." });
  }
  const users = new Map(db.all("users").map((u) => [u.id, u.name]));
  const rows = db.all("predictions")
    .filter((p) => p.matchId === match.id)
    .map((p) => ({ name: users.get(p.userId) || "—", home: p.home, away: p.away, points: p.points || 0 }))
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "he"));
  res.json(rows);
});

/* ------------------------------------------------------------------ */
/*  ניהול (מנהל הקבוצה בלבד)                                           */
/* ------------------------------------------------------------------ */
app.get("/api/admin/teams", requireUser, requireAdmin, (req, res) => {
  res.json(Object.keys(TEAMS).map((code) => teamView(code)));
});

app.post("/api/admin/matches", requireUser, requireAdmin, (req, res) => {
  const { homeTeam, awayTeam, stage, kickoff } = req.body || {};
  if (!TEAMS[homeTeam] || !TEAMS[awayTeam]) return res.status(400).json({ error: "יש לבחור שתי נבחרות." });
  if (homeTeam === awayTeam) return res.status(400).json({ error: "אי אפשר לבחור אותה נבחרת פעמיים." });
  const ko = Number(kickoff) || Date.now() + 3600 * 1000;
  const maxOrder = Math.max(0, ...db.all("matches").filter((m) => m.groupId === req.group.id).map((m) => m.order || 0));
  const match = {
    id: uid("m"),
    groupId: req.group.id,
    order: maxOrder + 1,
    stage: (stage || "משחק").trim(),
    homeTeam, awayTeam,
    kickoff: ko,
    homeScore: null, awayScore: null,
    status: "scheduled",
    createdAt: Date.now(),
  };
  db.put("matches", match);
  broadcast(req.group.id, "matches", { reason: "added" });
  res.json(publicMatch(match, null));
});

app.put("/api/admin/matches/:id", requireUser, requireAdmin, (req, res) => {
  const match = db.get("matches", req.params.id);
  if (!match || match.groupId !== req.group.id) return res.status(404).json({ error: "משחק לא נמצא." });
  const { homeTeam, awayTeam, stage, kickoff } = req.body || {};
  if (homeTeam && TEAMS[homeTeam]) match.homeTeam = homeTeam;
  if (awayTeam && TEAMS[awayTeam]) match.awayTeam = awayTeam;
  if (typeof stage === "string" && stage.trim()) match.stage = stage.trim();
  if (kickoff) match.kickoff = Number(kickoff);
  db.put("matches", match);
  broadcast(req.group.id, "matches", { reason: "updated" });
  res.json(publicMatch(match, null));
});

// עדכון תוצאה / סטטוס משחק -> מפעיל ניקוד מחדש ועדכון חי
app.put("/api/admin/matches/:id/result", requireUser, requireAdmin, (req, res) => {
  const match = db.get("matches", req.params.id);
  if (!match || match.groupId !== req.group.id) return res.status(404).json({ error: "משחק לא נמצא." });
  const { status } = req.body || {};
  const home = req.body?.homeScore;
  const away = req.body?.awayScore;

  if (home != null && away != null) {
    const h = Number(home), a = Number(away);
    if (!Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) {
      return res.status(400).json({ error: "תוצאה לא תקינה." });
    }
    match.homeScore = h;
    match.awayScore = a;
  }
  if (status === "scheduled") {
    match.status = "scheduled";
    match.homeScore = null;
    match.awayScore = null;
  } else if (status === "live" || status === "finished") {
    match.status = status;
  }
  db.put("matches", match);
  rescoreMatch(match.id);

  broadcast(req.group.id, "matches", { reason: "result", matchId: match.id });
  broadcast(req.group.id, "leaderboard", computeLeaderboard(req.group.id));
  res.json(publicMatch(match, null));
});

app.delete("/api/admin/matches/:id", requireUser, requireAdmin, (req, res) => {
  const match = db.get("matches", req.params.id);
  if (!match || match.groupId !== req.group.id) return res.status(404).json({ error: "משחק לא נמצא." });
  for (const p of db.all("predictions").filter((p) => p.matchId === match.id)) db.remove("predictions", p.id);
  db.remove("matches", match.id);
  broadcast(req.group.id, "matches", { reason: "deleted" });
  broadcast(req.group.id, "leaderboard", computeLeaderboard(req.group.id));
  res.json({ ok: true });
});

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n  ⚽  מערכת הניחושים למונדיאל פועלת על http://localhost:${PORT}\n`);
});
