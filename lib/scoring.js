// חוקי הניקוד של מערכת הניחושים (בסגנון טוטו / 365):
//   ניחוש מדויק (תוצאה מדויקת)            => 5 נקודות
//   כיוון נכון + הפרש שערים נכון           => 3 נקודות
//   כיוון נכון בלבד (מנצחת/תיקו)           => 1 נקודה
//   ניחוש שגוי                              => 0 נקודות
export const POINTS = {
  EXACT: 5,
  DIFF: 3,
  DIRECTION: 1,
  WRONG: 0,
};

export const SCORING_RULES = [
  { label: "ניחוש מדויק", desc: "התוצאה המדויקת של שני הצדדים", points: POINTS.EXACT },
  { label: "כיוון + הפרש", desc: "ניחשת נכון מי ניצח/תיקו וגם את הפרש השערים", points: POINTS.DIFF },
  { label: "כיוון נכון", desc: "ניחשת נכון מי ניצח או תיקו", points: POINTS.DIRECTION },
  { label: "החטאה", desc: "כיוון שגוי", points: POINTS.WRONG },
];

function sign(a, b) {
  if (a > b) return 1;
  if (a < b) return -1;
  return 0;
}

// מחזיר את הניקוד לניחוש בודד מול תוצאה אמיתית
export function scorePrediction(pred, match) {
  if (
    match == null ||
    match.homeScore == null ||
    match.awayScore == null ||
    pred == null ||
    pred.home == null ||
    pred.away == null
  ) {
    return 0;
  }
  const exact = pred.home === match.homeScore && pred.away === match.awayScore;
  if (exact) return POINTS.EXACT;

  const sameDirection = sign(pred.home, pred.away) === sign(match.homeScore, match.awayScore);
  if (!sameDirection) return POINTS.WRONG;

  const sameDiff = pred.home - pred.away === match.homeScore - match.awayScore;
  if (sameDiff) return POINTS.DIFF;

  return POINTS.DIRECTION;
}
