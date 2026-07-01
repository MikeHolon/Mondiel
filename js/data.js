/* ===== נתונים: קטגוריות, יחידות, קטלוג מוצרים ומחירי הדגמה ===== */

const CATEGORIES = [
  { id: 'produce',   name: 'ירקות ופירות',      icon: '🥬' },
  { id: 'dairy',     name: 'חלב וביצים',         icon: '🥛' },
  { id: 'meat',      name: 'בשר ודגים',          icon: '🥩' },
  { id: 'bakery',    name: 'לחם ומאפים',         icon: '🍞' },
  { id: 'dry',       name: 'מזווה ויבשים',       icon: '🍝' },
  { id: 'frozen',    name: 'קפואים',             icon: '🧊' },
  { id: 'drinks',    name: 'שתייה',              icon: '🧃' },
  { id: 'snacks',    name: 'חטיפים ומתוקים',     icon: '🍫' },
  { id: 'cleaning',  name: 'ניקיון וחד־פעמי',    icon: '🧼' },
  { id: 'toiletries',name: 'טיפוח והיגיינה',     icon: '🧴' },
  { id: 'baby',      name: 'תינוקות',            icon: '🍼' },
  { id: 'other',     name: 'שונות',              icon: '🛍️' },
];

/* יחידות מידה — לכל סוג מוצר היחידה המתאימה */
const UNITS = [
  { id: 'unit',  name: 'יח\'',    step: 1 },
  { id: 'kg',    name: 'ק"ג',    step: 0.5 },
  { id: 'gram',  name: 'גרם',    step: 100 },
  { id: 'liter', name: 'ליטר',   step: 1 },
  { id: 'ml',    name: 'מ"ל',    step: 100 },
  { id: 'pack',  name: 'אריזה',  step: 1 },
  { id: 'bag',   name: 'שקית',   step: 1 },
  { id: 'bottle',name: 'בקבוק',  step: 1 },
  { id: 'box',   name: 'קופסה',  step: 1 },
  { id: 'six',   name: 'שישייה', step: 1 },
];

/* מילות מפתח ליחידות בזיהוי טקסט חופשי */
const UNIT_KEYWORDS = {
  'ק"ג': 'kg', 'קג': 'kg', 'קילו': 'kg', 'קילוגרם': 'kg',
  'גרם': 'gram', "גר'": 'gram', 'גר': 'gram',
  'ליטר': 'liter', "ל'": 'liter',
  'מ"ל': 'ml', 'מל': 'ml', 'מיליליטר': 'ml',
  "יח'": 'unit', 'יחידות': 'unit', 'יחידה': 'unit',
  'אריזה': 'pack', 'אריזות': 'pack', 'מארז': 'pack', 'מארזים': 'pack',
  'שקית': 'bag', 'שקיות': 'bag',
  'בקבוק': 'bottle', 'בקבוקים': 'bottle',
  'קופסה': 'box', 'קופסאות': 'box', 'קופסא': 'box',
  'שישייה': 'six', 'שישיות': 'six', 'שישיה': 'six',
};

/* הרשתות להשוואת מחירים */
const CHAINS = [
  { id: 'shufersal', name: 'שופרסל' },
  { id: 'ramilevy',  name: 'רמי לוי' },
  { id: 'victory',   name: 'ויקטורי' },
  { id: 'yohananof', name: 'יוחננוף' },
  { id: 'osherad',   name: 'אושר עד' },
];

/*
 * קטלוג מוצרים נפוצים בישראל.
 * barcode — ברקוד אמיתי/מייצג לזיהוי בסריקה.
 * prices — מחירי הדגמה (₪) לפי רשת; מחירים אמיתיים משתנים בין סניפים ותאריכים.
 * keywords — מילים נוספות לזיהוי בהקלדה חופשית.
 */
const CATALOG = [
  // ירקות ופירות (נמכרים לרוב במשקל)
  { name: 'עגבניות', cat: 'produce', unit: 'kg', keywords: ['עגבניה', 'עגבנייה'], prices: { shufersal: 6.9, ramilevy: 4.9, victory: 5.9, yohananof: 5.5, osherad: 4.8 } },
  { name: 'מלפפונים', cat: 'produce', unit: 'kg', keywords: ['מלפפון'], prices: { shufersal: 5.9, ramilevy: 3.9, victory: 4.9, yohananof: 4.5, osherad: 3.8 } },
  { name: 'בצל', cat: 'produce', unit: 'kg', prices: { shufersal: 4.9, ramilevy: 3.5, victory: 4.2, yohananof: 3.9, osherad: 3.4 } },
  { name: 'תפוחי אדמה', cat: 'produce', unit: 'kg', keywords: ['תפוח אדמה', 'תפו"א', 'תפוא'], prices: { shufersal: 5.5, ramilevy: 3.9, victory: 4.9, yohananof: 4.4, osherad: 3.9 } },
  { name: 'גזר', cat: 'produce', unit: 'kg', prices: { shufersal: 4.9, ramilevy: 3.9, victory: 4.5, yohananof: 4.2, osherad: 3.7 } },
  { name: 'פלפל אדום', cat: 'produce', unit: 'kg', keywords: ['פלפל'], prices: { shufersal: 9.9, ramilevy: 7.9, victory: 8.9, yohananof: 8.5, osherad: 7.5 } },
  { name: 'בננות', cat: 'produce', unit: 'kg', keywords: ['בננה'], prices: { shufersal: 7.9, ramilevy: 5.9, victory: 6.9, yohananof: 6.5, osherad: 5.8 } },
  { name: 'תפוחים', cat: 'produce', unit: 'kg', keywords: ['תפוח', 'תפוח עץ'], prices: { shufersal: 9.9, ramilevy: 7.9, victory: 8.9, yohananof: 8.9, osherad: 7.7 } },
  { name: 'אבוקדו', cat: 'produce', unit: 'kg', prices: { shufersal: 14.9, ramilevy: 11.9, victory: 12.9, yohananof: 12.9, osherad: 11.5 } },
  { name: 'לימונים', cat: 'produce', unit: 'kg', keywords: ['לימון'], prices: { shufersal: 6.9, ramilevy: 4.9, victory: 5.9, yohananof: 5.5, osherad: 4.9 } },
  { name: 'חסה', cat: 'produce', unit: 'unit', prices: { shufersal: 7.9, ramilevy: 5.9, victory: 6.9, yohananof: 6.5, osherad: 5.9 } },
  { name: 'פטרוזיליה', cat: 'produce', unit: 'unit', prices: { shufersal: 3.9, ramilevy: 2.5, victory: 3, yohananof: 2.9, osherad: 2.5 } },

  // חלב וביצים
  { name: 'חלב 3% בקרטון', cat: 'dairy', unit: 'liter', barcode: '7290004131074', keywords: ['חלב'], prices: { shufersal: 6.28, ramilevy: 6.28, victory: 6.28, yohananof: 6.28, osherad: 6.28 } },
  { name: 'ביצים L (תבנית 12)', cat: 'dairy', unit: 'pack', keywords: ['ביצים', 'ביצה'], prices: { shufersal: 13.1, ramilevy: 12.9, victory: 13.1, yohananof: 13.1, osherad: 12.8 } },
  { name: 'קוטג׳ 5% תנובה', cat: 'dairy', unit: 'unit', barcode: '7290110115586', keywords: ['קוטג', "קוטג'"], prices: { shufersal: 5.9, ramilevy: 5.5, victory: 5.7, yohananof: 5.6, osherad: 5.4 } },
  { name: 'גבינה לבנה 5%', cat: 'dairy', unit: 'unit', keywords: ['גבינה לבנה'], prices: { shufersal: 5.5, ramilevy: 4.9, victory: 5.2, yohananof: 5.1, osherad: 4.8 } },
  { name: 'גבינה צהובה עמק פרוס', cat: 'dairy', unit: 'gram', barcode: '7290000110387', keywords: ['גבינה צהובה', 'עמק'], prices: { shufersal: 15.9, ramilevy: 13.9, victory: 14.9, yohananof: 14.5, osherad: 13.5 } },
  { name: 'יוגורט דנונה', cat: 'dairy', unit: 'unit', keywords: ['יוגורט'], prices: { shufersal: 3.9, ramilevy: 3.2, victory: 3.5, yohananof: 3.4, osherad: 3.1 } },
  { name: 'חמאה 100 גרם', cat: 'dairy', unit: 'unit', keywords: ['חמאה'], prices: { shufersal: 5.9, ramilevy: 5.5, victory: 5.8, yohananof: 5.7, osherad: 5.4 } },
  { name: 'שמנת מתוקה', cat: 'dairy', unit: 'unit', keywords: ['שמנת'], prices: { shufersal: 6.9, ramilevy: 5.9, victory: 6.4, yohananof: 6.2, osherad: 5.8 } },

  // בשר ודגים
  { name: 'חזה עוף טרי', cat: 'meat', unit: 'kg', keywords: ['חזה עוף', 'עוף'], prices: { shufersal: 34.9, ramilevy: 26.9, victory: 29.9, yohananof: 29.9, osherad: 26.5 } },
  { name: 'שוקיים עוף', cat: 'meat', unit: 'kg', keywords: ['שוקיים', 'כרעיים'], prices: { shufersal: 19.9, ramilevy: 14.9, victory: 16.9, yohananof: 16.9, osherad: 14.5 } },
  { name: 'בשר טחון טרי', cat: 'meat', unit: 'kg', keywords: ['טחון', 'בשר טחון'], prices: { shufersal: 54.9, ramilevy: 44.9, victory: 49.9, yohananof: 49.9, osherad: 43.9 } },
  { name: 'סלמון טרי', cat: 'meat', unit: 'kg', keywords: ['סלמון', 'דג'], prices: { shufersal: 89.9, ramilevy: 74.9, victory: 79.9, yohananof: 79.9, osherad: 73.9 } },
  { name: 'נקניקיות עוף', cat: 'meat', unit: 'pack', keywords: ['נקניקיות'], prices: { shufersal: 12.9, ramilevy: 9.9, victory: 11.5, yohananof: 11.2, osherad: 9.8 } },
  { name: 'פסטרמה עוף', cat: 'meat', unit: 'gram', keywords: ['פסטרמה'], prices: { shufersal: 8.9, ramilevy: 6.9, victory: 7.9, yohananof: 7.5, osherad: 6.8 } },

  // לחם ומאפים
  { name: 'לחם אחיד פרוס', cat: 'bakery', unit: 'unit', barcode: '7290002331384', keywords: ['לחם'], prices: { shufersal: 7.02, ramilevy: 7.02, victory: 7.02, yohananof: 7.02, osherad: 7.02 } },
  { name: 'פיתות (10 יח\')', cat: 'bakery', unit: 'pack', keywords: ['פיתות', 'פיתה'], prices: { shufersal: 10.9, ramilevy: 8.9, victory: 9.9, yohananof: 9.5, osherad: 8.7 } },
  { name: 'לחמניות המבורגר', cat: 'bakery', unit: 'pack', keywords: ['לחמניות', 'לחמנייה'], prices: { shufersal: 12.9, ramilevy: 9.9, victory: 11.5, yohananof: 10.9, osherad: 9.8 } },
  { name: 'חלה', cat: 'bakery', unit: 'unit', prices: { shufersal: 11.9, ramilevy: 8.9, victory: 10.5, yohananof: 9.9, osherad: 8.8 } },

  // מזווה ויבשים
  { name: 'פסטה ברילה', cat: 'dry', unit: 'pack', barcode: '8076809513722', keywords: ['פסטה', 'ספגטי'], prices: { shufersal: 6.9, ramilevy: 5.4, victory: 6.2, yohananof: 5.9, osherad: 5.3 } },
  { name: 'אורז בסמטי 1 ק"ג', cat: 'dry', unit: 'pack', keywords: ['אורז'], prices: { shufersal: 12.9, ramilevy: 9.9, victory: 11.5, yohananof: 10.9, osherad: 9.7 } },
  { name: 'קמח לבן 1 ק"ג', cat: 'dry', unit: 'pack', keywords: ['קמח'], prices: { shufersal: 5.9, ramilevy: 4.2, victory: 5.2, yohananof: 4.9, osherad: 4.1 } },
  { name: 'סוכר לבן 1 ק"ג', cat: 'dry', unit: 'pack', keywords: ['סוכר'], prices: { shufersal: 5.5, ramilevy: 4.5, victory: 5, yohananof: 4.9, osherad: 4.4 } },
  { name: 'שמן קנולה', cat: 'dry', unit: 'bottle', keywords: ['שמן'], prices: { shufersal: 12.9, ramilevy: 10.9, victory: 11.9, yohananof: 11.5, osherad: 10.7 } },
  { name: 'שמן זית', cat: 'dry', unit: 'bottle', prices: { shufersal: 39.9, ramilevy: 32.9, victory: 36.9, yohananof: 35.9, osherad: 31.9 } },
  { name: 'טונה בשמן (4 יח\')', cat: 'dry', unit: 'pack', keywords: ['טונה'], prices: { shufersal: 21.9, ramilevy: 17.9, victory: 19.9, yohananof: 19.5, osherad: 17.5 } },
  { name: 'רסק עגבניות', cat: 'dry', unit: 'unit', keywords: ['רסק'], prices: { shufersal: 4.9, ramilevy: 3.5, victory: 4.2, yohananof: 3.9, osherad: 3.4 } },
  { name: 'חומוס גרגרים יבש', cat: 'dry', unit: 'bag', keywords: ['גרגרי חומוס'], prices: { shufersal: 8.9, ramilevy: 6.9, victory: 7.9, yohananof: 7.5, osherad: 6.7 } },
  { name: 'קפה נמס עלית 200 גרם', cat: 'dry', unit: 'unit', barcode: '7290000102702', keywords: ['קפה', 'נס קפה'], prices: { shufersal: 24.9, ramilevy: 19.9, victory: 22.9, yohananof: 21.9, osherad: 19.5 } },
  { name: 'תה ויסוצקי (25 שקיקים)', cat: 'dry', unit: 'box', keywords: ['תה'], prices: { shufersal: 9.9, ramilevy: 7.9, victory: 8.9, yohananof: 8.5, osherad: 7.7 } },
  { name: 'מלח שולחן', cat: 'dry', unit: 'unit', keywords: ['מלח'], prices: { shufersal: 3.5, ramilevy: 2.5, victory: 3, yohananof: 2.9, osherad: 2.4 } },
  { name: 'קורנפלקס תלמה', cat: 'dry', unit: 'box', keywords: ['קורנפלקס', 'דגני בוקר'], prices: { shufersal: 17.9, ramilevy: 13.9, victory: 15.9, yohananof: 15.5, osherad: 13.5 } },

  // קפואים
  { name: 'אפונה קפואה', cat: 'frozen', unit: 'bag', keywords: ['אפונה'], prices: { shufersal: 9.9, ramilevy: 7.9, victory: 8.9, yohananof: 8.5, osherad: 7.7 } },
  { name: 'שניצל תירס', cat: 'frozen', unit: 'pack', keywords: ['שניצל'], prices: { shufersal: 19.9, ramilevy: 15.9, victory: 17.9, yohananof: 17.5, osherad: 15.5 } },
  { name: 'פיצה קפואה', cat: 'frozen', unit: 'unit', keywords: ['פיצה'], prices: { shufersal: 21.9, ramilevy: 17.9, victory: 19.9, yohananof: 19.5, osherad: 17.5 } },
  { name: 'גלידה משפחתית', cat: 'frozen', unit: 'box', keywords: ['גלידה'], prices: { shufersal: 24.9, ramilevy: 19.9, victory: 22.9, yohananof: 21.9, osherad: 19.5 } },

  // שתייה
  { name: 'קוקה קולה 1.5 ליטר', cat: 'drinks', unit: 'bottle', barcode: '7290000108803', keywords: ['קולה', 'קוקה'], prices: { shufersal: 8.9, ramilevy: 7.4, victory: 8.2, yohananof: 7.9, osherad: 7.3 } },
  { name: 'מים מינרליים (שישייה)', cat: 'drinks', unit: 'six', keywords: ['מים', 'נביעות', 'מי עדן'], prices: { shufersal: 15.9, ramilevy: 11.9, victory: 13.9, yohananof: 13.5, osherad: 11.7 } },
  { name: 'מיץ תפוזים טרי 1 ליטר', cat: 'drinks', unit: 'bottle', keywords: ['מיץ'], prices: { shufersal: 13.9, ramilevy: 10.9, victory: 12.5, yohananof: 11.9, osherad: 10.7 } },
  { name: 'בירה גולדסטאר (שישייה)', cat: 'drinks', unit: 'six', keywords: ['בירה'], prices: { shufersal: 42.9, ramilevy: 36.9, victory: 39.9, yohananof: 38.9, osherad: 35.9 } },

  // חטיפים ומתוקים
  { name: 'במבה אסם 80 גרם', cat: 'snacks', unit: 'bag', barcode: '7290000066318', keywords: ['במבה'], prices: { shufersal: 4.9, ramilevy: 3.9, victory: 4.5, yohananof: 4.2, osherad: 3.8 } },
  { name: 'ביסלי גריל', cat: 'snacks', unit: 'bag', keywords: ['ביסלי'], prices: { shufersal: 4.9, ramilevy: 3.9, victory: 4.5, yohananof: 4.2, osherad: 3.8 } },
  { name: 'שוקולד פרה עלית', cat: 'snacks', unit: 'unit', barcode: '7290000103150', keywords: ['שוקולד', 'פרה'], prices: { shufersal: 6.9, ramilevy: 4.9, victory: 5.9, yohananof: 5.5, osherad: 4.8 } },
  { name: 'עוגיות שוקולד צ׳יפס', cat: 'snacks', unit: 'pack', keywords: ['עוגיות'], prices: { shufersal: 12.9, ramilevy: 9.9, victory: 11.5, yohananof: 10.9, osherad: 9.7 } },

  // ניקיון וחד־פעמי
  { name: 'נייר טואלט (32 גלילים)', cat: 'cleaning', unit: 'pack', keywords: ['נייר טואלט', 'טואלט'], prices: { shufersal: 49.9, ramilevy: 39.9, victory: 44.9, yohananof: 43.9, osherad: 38.9 } },
  { name: 'מגבונים', cat: 'cleaning', unit: 'pack', keywords: ['מגבון'], prices: { shufersal: 9.9, ramilevy: 6.9, victory: 8.5, yohananof: 7.9, osherad: 6.7 } },
  { name: 'סבון כלים פיירי', cat: 'cleaning', unit: 'bottle', barcode: '8001090218929', keywords: ['סבון כלים', 'פיירי'], prices: { shufersal: 12.9, ramilevy: 9.9, victory: 11.5, yohananof: 10.9, osherad: 9.7 } },
  { name: 'אבקת כביסה', cat: 'cleaning', unit: 'box', keywords: ['כביסה', 'אבקה'], prices: { shufersal: 39.9, ramilevy: 29.9, victory: 34.9, yohananof: 33.9, osherad: 29.5 } },
  { name: 'שקיות אשפה', cat: 'cleaning', unit: 'pack', keywords: ['אשפה', 'זבל'], prices: { shufersal: 14.9, ramilevy: 10.9, victory: 12.9, yohananof: 12.5, osherad: 10.5 } },
  { name: 'אקונומיקה', cat: 'cleaning', unit: 'bottle', prices: { shufersal: 7.9, ramilevy: 5.9, victory: 6.9, yohananof: 6.5, osherad: 5.7 } },

  // טיפוח והיגיינה
  { name: 'שמפו', cat: 'toiletries', unit: 'bottle', prices: { shufersal: 16.9, ramilevy: 12.9, victory: 14.9, yohananof: 14.5, osherad: 12.5 } },
  { name: 'משחת שיניים', cat: 'toiletries', unit: 'unit', keywords: ['שיניים'], prices: { shufersal: 11.9, ramilevy: 8.9, victory: 10.5, yohananof: 9.9, osherad: 8.7 } },
  { name: 'דאודורנט', cat: 'toiletries', unit: 'unit', keywords: ['דאו'], prices: { shufersal: 14.9, ramilevy: 11.9, victory: 13.5, yohananof: 12.9, osherad: 11.5 } },
  { name: 'סבון רחצה', cat: 'toiletries', unit: 'bottle', keywords: ['סבון גוף'], prices: { shufersal: 12.9, ramilevy: 9.9, victory: 11.5, yohananof: 10.9, osherad: 9.7 } },

  // תינוקות
  { name: 'חיתולים האגיס', cat: 'baby', unit: 'pack', keywords: ['חיתולים', 'טיטולים'], prices: { shufersal: 54.9, ramilevy: 44.9, victory: 49.9, yohananof: 48.9, osherad: 43.9 } },
  { name: 'מטרנה שלב 1', cat: 'baby', unit: 'box', keywords: ['מטרנה', 'תמ"ל'], prices: { shufersal: 64.9, ramilevy: 57.9, victory: 61.9, yohananof: 59.9, osherad: 56.9 } },
];

/* מילות מפתח לקטגוריות — לזיהוי אוטומטי של מוצרים שלא בקטלוג */
const CATEGORY_KEYWORDS = {
  produce: ['ירק', 'פרי', 'עגבני', 'מלפפון', 'חסה', 'בצל', 'שום', 'גזר', 'פלפל', 'תפוח', 'בננ', 'ענבים', 'אבטיח', 'מלון', 'תות', 'אגס', 'אפרסק', 'שזיף', 'קישוא', 'חציל', 'כרוב', 'תרד', 'פטרוזיליה', 'כוסברה', 'שמיר', 'נענע', 'בטטה', 'דלעת', 'סלרי', 'צנון', 'רימון', 'קלמנטינ', 'תפוז', 'לימון', 'אבוקדו', 'פטרי'],
  dairy: ['חלב', 'גבינ', 'קוטג', 'יוגורט', 'שמנת', 'חמאה', 'ביצ', 'לבן ', 'אשל', 'גיל ', 'מעדן', 'צפתית', 'בולגרית', 'מוצרלה', 'ריקוטה', 'קשקבל'],
  meat: ['עוף', 'בשר', 'הודו', 'טחון', 'סטייק', 'שניצל טרי', 'כבד', 'דג', 'סלמון', 'טונה טרי', 'נקניק', 'פסטרמה', 'קבב', 'המבורגר טרי', 'אנטריקוט', 'פילה'],
  bakery: ['לחם', 'פיתה', 'פיתות', 'לחמני', 'חלה', 'בגט', 'קרואסון', 'מאפה', 'טורטיה', 'עוגה טרי'],
  dry: ['פסטה', 'אורז', 'קמח', 'סוכר', 'שמן', 'טונה', 'רסק', 'תבלין', 'מלח', 'פלפל שחור', 'קפה', 'תה', 'קורנפלקס', 'דגני', 'שיבולת', 'קטניות', 'עדשים', 'חומוס יבש', 'גרגר', 'פתיתים', 'קוסקוס', 'בורגול', 'קינואה', 'שימורים', 'זיתים', 'מיונז', 'קטשופ', 'חרדל', 'טחינה', 'סילאן', 'דבש', 'ריבה', 'ממרח', 'אבקת אפיה', 'שמרים', 'פירורי'],
  frozen: ['קפוא', 'גלידה', 'אפונה', 'שעועית קפוא', 'תירס קפוא', 'מלאווח', 'ג׳חנון', 'גחנון', 'בצק עלים', 'שניצל תירס', 'פיצה'],
  drinks: ['מים', 'קולה', 'סודה', 'מיץ', 'משקה', 'בירה', 'יין', 'סיידר', 'תרכיז', 'פחית', 'ספרייט', 'פאנטה', 'נסטי', 'פריגת', 'XL', 'אנרגיה'],
  snacks: ['במבה', 'ביסלי', 'חטיף', 'שוקולד', 'ממתק', 'סוכריה', 'מסטיק', 'עוגי', 'ופל', 'קרקר', 'בייגלה', 'צ׳יפס', 'תפוצ', 'בוטנים', 'גרעינים', 'פיצוחים', 'חלווה', 'קליק', 'טורטית'],
  cleaning: ['ניקוי', 'אקונומיק', 'סבון כלים', 'אבקת כביסה', 'מרכך כביסה', 'ג׳ל כביסה', 'נייר טואלט', 'מגבת נייר', 'נייר סופג', 'מגבונים לבית', 'שקיות אשפה', 'זבל', 'ספוג', 'מטליות', 'חד פעמי', 'כוסות פלסטיק', 'צלחות חד', 'נירוסטה', 'אסלה', 'רצפות', 'חלונות'],
  toiletries: ['שמפו', 'מרכך שיער', 'סבון רחצה', 'משחת שיניים', 'מברשת שיניים', 'דאודורנט', 'דאו', 'תער', 'גילוח', 'קרם', 'טיפוח', 'מקלוני', 'צמר גפן', 'תחבושות', 'טמפונים'],
  baby: ['חיתול', 'טיטול', 'מטרנה', 'סימילאק', 'תמ"ל', 'מגבוני תינוק', 'בקבוק תינוק', 'מוצץ', 'דייסה', 'גרבר'],
};

/* חיפוש מוצר בקטלוג לפי ברקוד */
function findByBarcode(code) {
  return CATALOG.find(p => p.barcode === code) || null;
}

/* חיפוש מוצר בקטלוג לפי טקסט (שם או מילת מפתח) */
function findInCatalog(text) {
  const t = text.trim();
  if (!t) return null;
  let hit = CATALOG.find(p => p.name === t);
  if (hit) return hit;
  hit = CATALOG.find(p => p.name.includes(t) || t.includes(p.name));
  if (hit) return hit;
  return CATALOG.find(p => (p.keywords || []).some(k => t.includes(k) || k.includes(t))) || null;
}

/* זיהוי קטגוריה אוטומטי לפי מילות מפתח */
function guessCategory(text) {
  const hit = findInCatalog(text);
  if (hit) return hit.cat;
  for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
    if (words.some(w => text.includes(w))) return cat;
  }
  return 'other';
}

/* יחידת ברירת־מחדל לפי המוצר */
function guessUnit(text) {
  const hit = findInCatalog(text);
  if (hit) return hit.unit;
  const cat = guessCategory(text);
  if (cat === 'produce' || cat === 'meat') return 'kg';
  if (cat === 'drinks') return 'bottle';
  return 'unit';
}
