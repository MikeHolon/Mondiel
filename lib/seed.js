// נבחרות (שם בעברית, קוד ISO לדגל, וגם אימוג'י כגיבוי ללא רשת)
export const TEAMS = {
  ARG: { name: "ארגנטינה", iso: "ar", emoji: "🇦🇷" },
  BRA: { name: "ברזיל", iso: "br", emoji: "🇧🇷" },
  FRA: { name: "צרפת", iso: "fr", emoji: "🇫🇷" },
  ENG: { name: "אנגליה", iso: "gb-eng", emoji: "🏴" },
  ESP: { name: "ספרד", iso: "es", emoji: "🇪🇸" },
  GER: { name: "גרמניה", iso: "de", emoji: "🇩🇪" },
  POR: { name: "פורטוגל", iso: "pt", emoji: "🇵🇹" },
  NED: { name: "הולנד", iso: "nl", emoji: "🇳🇱" },
  BEL: { name: "בלגיה", iso: "be", emoji: "🇧🇪" },
  CRO: { name: "קרואטיה", iso: "hr", emoji: "🇭🇷" },
  USA: { name: 'ארה"ב', iso: "us", emoji: "🇺🇸" },
  MEX: { name: "מקסיקו", iso: "mx", emoji: "🇲🇽" },
  CAN: { name: "קנדה", iso: "ca", emoji: "🇨🇦" },
  URU: { name: "אורוגוואי", iso: "uy", emoji: "🇺🇾" },
  ISR: { name: "ישראל", iso: "il", emoji: "🇮🇱" },
  MAR: { name: "מרוקו", iso: "ma", emoji: "🇲🇦" },
  JPN: { name: "יפן", iso: "jp", emoji: "🇯🇵" },
  KOR: { name: "דרום קוריאה", iso: "kr", emoji: "🇰🇷" },
  SEN: { name: "סנגל", iso: "sn", emoji: "🇸🇳" },
  AUS: { name: "אוסטרליה", iso: "au", emoji: "🇦🇺" },
  ITA: { name: "איטליה", iso: "it", emoji: "🇮🇹" },
  COL: { name: "קולומביה", iso: "co", emoji: "🇨🇴" },
};

// תבנית משחקים שמשוכפלת לכל קבוצה חדשה. השעות יחסיות למועד יצירת הקבוצה
// כדי שתמיד יהיו משחקים "פתוחים לניחוש" וכמה "שהסתיימו" להדגמה.
// hoursFromNow שלילי = משחק שכבר היה. אפשר לערוך הכל מסך הניהול.
const FIXTURES = [
  { stage: "שלב הבתים · בית A", home: "MEX", away: "ISR", hoursFromNow: -2 },
  { stage: "שלב הבתים · בית A", home: "USA", away: "AUS", hoursFromNow: -1 },
  { stage: "שלב הבתים · בית B", home: "ARG", away: "KOR", hoursFromNow: 3 },
  { stage: "שלב הבתים · בית B", home: "BRA", away: "JPN", hoursFromNow: 6 },
  { stage: "שלב הבתים · בית C", home: "FRA", away: "SEN", hoursFromNow: 24 },
  { stage: "שלב הבתים · בית C", home: "ENG", away: "MAR", hoursFromNow: 27 },
  { stage: "שלב הבתים · בית D", home: "ESP", away: "URU", hoursFromNow: 30 },
  { stage: "שלב הבתים · בית D", home: "GER", away: "CAN", hoursFromNow: 48 },
  { stage: "שלב הבתים · בית E", home: "POR", away: "COL", hoursFromNow: 51 },
  { stage: "שלב הבתים · בית E", home: "NED", away: "ITA", hoursFromNow: 54 },
  { stage: "שלב הבתים · בית F", home: "BEL", away: "CRO", hoursFromNow: 72 },
];

let _seq = 0;
function uid(prefix) {
  _seq += 1;
  return `${prefix}_${Date.now().toString(36)}_${_seq.toString(36)}`;
}

// יוצר רשומות משחקים לקבוצה נתונה לפי התבנית
export function seedMatchesForGroup(groupId) {
  const now = Date.now();
  return FIXTURES.map((f, idx) => {
    const kickoff = now + f.hoursFromNow * 3600 * 1000;
    const finished = f.hoursFromNow < 0;
    return {
      id: uid("m"),
      groupId,
      order: idx,
      stage: f.stage,
      homeTeam: f.home,
      awayTeam: f.away,
      kickoff,
      homeScore: finished ? randScore() : null,
      awayScore: finished ? randScore() : null,
      status: finished ? "finished" : "scheduled", // scheduled | live | finished
      createdAt: now,
    };
  });
}

function randScore() {
  const r = Math.random();
  if (r < 0.4) return 0;
  if (r < 0.75) return 1;
  if (r < 0.92) return 2;
  return 3;
}

export { uid };
