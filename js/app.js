/* ===== סל חכם — לוגיקת האפליקציה ===== */

/* ---------- מצב (state) ---------- */

const STORAGE_KEY = 'salhakham_v1';

let state = {
  items: [],            // { id, name, qty, unit, cat, who, note, checked, updatedAt }
  settings: { myName: 'אני', partnerName: 'בת/בן זוג', autoCat: true },
  room: null,           // קוד חדר לייב פעיל
  splitMode: false,
  splitFilter: 'all',
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...state, ...JSON.parse(raw) };
  } catch { /* אחסון פגום — מתחילים נקי */ }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------- עזרי DOM ---------- */

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add('hidden'), 2500);
}

function unitName(id) { return (UNITS.find(u => u.id === id) || UNITS[0]).name; }
function unitStep(id) { return (UNITS.find(u => u.id === id) || UNITS[0]).step; }
function catInfo(id) { return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1]; }

function fmtQty(qty) {
  return Number.isInteger(qty) ? String(qty) : qty.toFixed(qty < 1 ? 2 : 1).replace(/\.?0+$/, '');
}

/* ---------- פענוח שורת טקסט חופשי: "2 ק"ג עגבניות" ---------- */

function parseLine(line) {
  let text = line.trim().replace(/[.،,;•\-–]+$/g, '').replace(/^[.،,;•\-–\d]*\)\s*/, '').trim();
  if (!text) return null;

  let qty = null, unit = null;

  // מספר בתחילת השורה או בסופה
  const numRe = /(\d+(?:[.,]\d+)?)/;
  const words = text.split(/\s+/);

  // חיפוש יחידה לפי מילות מפתח
  for (const [kw, unitId] of Object.entries(UNIT_KEYWORDS)) {
    const idx = words.findIndex(w => w === kw || w === kw + ',');
    if (idx !== -1) {
      unit = unitId;
      words.splice(idx, 1);
      break;
    }
  }

  // חיפוש כמות — מספר ראשון שנמצא
  const numIdx = words.findIndex(w => numRe.test(w) && !/%/.test(w));
  if (numIdx !== -1) {
    const m = words[numIdx].match(numRe);
    qty = parseFloat(m[1].replace(',', '.'));
    // אם המילה היא רק המספר — מסירים אותה מהשם
    if (words[numIdx] === m[1]) words.splice(numIdx, 1);
  }

  const name = words.join(' ').trim();
  if (!name) return null;

  const catalogHit = findInCatalog(name);
  return {
    name: catalogHit ? catalogHit.name : name,
    qty: qty ?? 1,
    unit: unit || (catalogHit ? catalogHit.unit : guessUnit(name)),
    cat: state.settings.autoCat ? (catalogHit ? catalogHit.cat : guessCategory(name)) : 'other',
  };
}

/* ---------- פעולות על הרשימה ---------- */

function addItem(parsed, opts = {}) {
  // אם מוצר זהה כבר ברשימה ולא סומן — מגדילים כמות במקום לשכפל
  const existing = state.items.find(i => !i.checked && i.name === parsed.name && i.unit === parsed.unit);
  if (existing && !opts.forceNew) {
    existing.qty += parsed.qty;
    existing.updatedAt = Date.now();
  } else {
    state.items.push({
      id: uid(),
      name: parsed.name,
      qty: parsed.qty,
      unit: parsed.unit,
      cat: parsed.cat,
      who: parsed.who || 'none',
      note: parsed.note || '',
      checked: false,
      updatedAt: Date.now(),
    });
  }
  afterChange();
}

function updateItem(id, patch) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  Object.assign(item, patch, { updatedAt: Date.now() });
  afterChange();
}

function deleteItem(id) {
  const item = state.items.find(i => i.id === id);
  if (item) {
    // מחיקה רכה כדי שהסנכרון ידע להעביר אותה למכשיר השני
    item.deleted = true;
    item.updatedAt = Date.now();
  }
  afterChange();
}

function afterChange() {
  saveState();
  render();
  if (LiveSync.connected) LiveSync.publishState(state.items);
}

/* מיזוג מצב שהגיע מהמכשיר השני — last-write-wins לכל פריט */
function mergeRemote(remoteItems) {
  const byId = new Map(state.items.map(i => [i.id, i]));
  let changed = false;
  for (const r of remoteItems) {
    const local = byId.get(r.id);
    if (!local) {
      state.items.push(r);
      changed = true;
    } else if ((r.updatedAt || 0) > (local.updatedAt || 0)) {
      Object.assign(local, r);
      changed = true;
    }
  }
  if (changed) {
    saveState();
    render();
  }
}

/* ---------- רינדור ---------- */

function visibleItems() {
  let items = state.items.filter(i => !i.deleted);
  if (state.splitMode && state.splitFilter !== 'all') {
    items = items.filter(i => (i.who || 'none') === state.splitFilter);
  }
  return items;
}

function render() {
  const container = $('#list-container');
  const items = visibleItems();
  const open = items.filter(i => !i.checked);
  const done = items.filter(i => i.checked);

  $('#empty-state').classList.toggle('hidden', items.length > 0);

  // סיכום
  const est = estimateBasket(state.items.filter(i => !i.deleted && !i.checked));
  $('#summary').innerHTML = items.length
    ? `<span>📝 ${open.length} לקנות</span><span>✅ ${done.length} בעגלה</span>` +
      (est.cheapest ? `<span>💰 הערכה: ‏${est.cheapest.total.toFixed(0)}₪ ב${est.cheapest.name}</span>` : '')
    : '';

  // קיבוץ לפי קטגוריות (לפי סדר CATEGORIES), מסומנים בסוף
  let html = '';
  for (const cat of CATEGORIES) {
    const catItems = open.filter(i => i.cat === cat.id);
    if (!catItems.length) continue;
    html += `<div class="category-block">
      <div class="category-title">${cat.icon} ${cat.name} <span class="count">(${catItems.length})</span></div>
      ${catItems.map(itemHtml).join('')}
    </div>`;
  }
  if (done.length) {
    html += `<div class="category-block">
      <div class="category-title">✅ בעגלה <span class="count">(${done.length})</span></div>
      ${done.map(itemHtml).join('')}
    </div>`;
  }
  container.innerHTML = html;

  // מאזינים
  $$('#list-container .item').forEach(el => {
    const id = el.dataset.id;
    el.querySelector('input[type=checkbox]').addEventListener('change', e => {
      updateItem(id, { checked: e.target.checked });
      if (e.target.checked && navigator.vibrate) navigator.vibrate(30);
    });
    el.querySelector('.item-main').addEventListener('click', () => openItemDialog(id));
    el.querySelector('.qty-minus').addEventListener('click', () => bumpQty(id, -1));
    el.querySelector('.qty-plus').addEventListener('click', () => bumpQty(id, +1));
  });

  renderSplitChips();
}

function itemHtml(i) {
  const whoBadge = state.splitMode && i.who !== 'none'
    ? `<span class="who-badge ${i.who}">${i.who === 'me' ? state.settings.myName : state.settings.partnerName}</span>`
    : '';
  const note = i.note ? `<span>📌 ${escapeHtml(i.note)}</span>` : '';
  const price = bestPriceLabel(i);
  return `<div class="item ${i.checked ? 'checked' : ''}" data-id="${i.id}">
    <input type="checkbox" ${i.checked ? 'checked' : ''}>
    <div class="item-main">
      <div class="item-name">${escapeHtml(i.name)} ${whoBadge}</div>
      <div class="item-meta">${note}${price}</div>
    </div>
    <div class="qty-controls">
      <button class="qty-minus" aria-label="פחות">−</button>
      <span class="qty-value">${fmtQty(i.qty)} ${unitName(i.unit)}</span>
      <button class="qty-plus" aria-label="יותר">+</button>
    </div>
  </div>`;
}

function bestPriceLabel(i) {
  const p = findInCatalog(i.name);
  if (!p || !p.prices) return '';
  const best = Object.entries(p.prices).sort((a, b) => a[1] - b[1])[0];
  const chain = CHAINS.find(c => c.id === best[0]);
  return `<span>💰 מ־${best[1].toFixed(2)}₪ (${chain ? chain.name : ''})</span>`;
}

function bumpQty(id, dir) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  const step = unitStep(item.unit);
  const next = Math.round((item.qty + dir * step) * 100) / 100;
  if (next <= 0) return;
  updateItem(id, { qty: next });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

/* ---------- הוספה בהקלדה + הצעות ---------- */

function handleAdd() {
  const input = $('#add-input');
  const parsed = parseLine(input.value);
  if (!parsed) return;
  addItem(parsed);
  toast(`נוסף: ${parsed.name}`);
  input.value = '';
  $('#suggestions').classList.add('hidden');
  input.focus();
}

function showSuggestions(query) {
  const box = $('#suggestions');
  const q = query.trim();
  if (q.length < 1) { box.classList.add('hidden'); return; }
  const matches = CATALOG
    .filter(p => p.name.includes(q) || (p.keywords || []).some(k => k.includes(q)))
    .slice(0, 6);
  if (!matches.length) { box.classList.add('hidden'); return; }
  box.innerHTML = matches.map(p =>
    `<button data-name="${escapeHtml(p.name)}">${catInfo(p.cat).icon} ${escapeHtml(p.name)}</button>`).join('');
  box.classList.remove('hidden');
  box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    addItem(parseLine(b.dataset.name));
    toast(`נוסף: ${b.dataset.name}`);
    $('#add-input').value = '';
    box.classList.add('hidden');
  }));
}

/* ---------- דיאלוג עריכת פריט ---------- */

let editingId = null;

function openItemDialog(id) {
  const item = state.items.find(i => i.id === id);
  if (!item) return;
  editingId = id;
  $('#item-name').value = item.name;
  $('#item-qty').value = item.qty;
  $('#item-unit').innerHTML = UNITS.map(u => `<option value="${u.id}" ${u.id === item.unit ? 'selected' : ''}>${u.name}</option>`).join('');
  $('#item-cat').innerHTML = CATEGORIES.map(c => `<option value="${c.id}" ${c.id === item.cat ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('');
  $('#item-who').value = item.who || 'none';
  $('#item-note').value = item.note || '';
  // שמות מותאמים בבחירת "מי קונה"
  $('#item-who').options[1].text = state.settings.myName;
  $('#item-who').options[2].text = state.settings.partnerName;
  $('#dlg-item').showModal();
}

/* ---------- סריקה ---------- */

function openScanner() {
  const dlg = $('#dlg-scan');
  dlg.showModal();
  Scanner.start($('#scan-video'), onBarcode, msg => { $('#scan-status').textContent = msg; });
}

function onBarcode(code) {
  Scanner.stop();
  $('#dlg-scan').close();
  const product = findByBarcode(code);
  if (product) {
    addItem({ name: product.name, qty: 1, unit: product.unit, cat: product.cat });
    toast(`נסרק ✓ ${product.name}`);
  } else {
    // ברקוד לא מוכר — מוסיפים פריט גנרי שאפשר לערוך
    addItem({ name: `מוצר (ברקוד ${code})`, qty: 1, unit: 'unit', cat: 'other', note: `ברקוד: ${code}` });
    toast('ברקוד לא מזוהה בקטלוג — נוסף לרשימה, אפשר לערוך את השם');
  }
  if (navigator.vibrate) navigator.vibrate([40, 40, 40]);
}

/* ---------- השוואת מחירים ---------- */

function estimateBasket(items) {
  const totals = {};
  let matched = 0;
  const missing = [];
  for (const chain of CHAINS) totals[chain.id] = 0;

  for (const item of items) {
    const p = findInCatalog(item.name);
    if (!p || !p.prices) { missing.push(item.name); continue; }
    matched++;
    // כמות אפקטיבית: גרם/מ"ל מומרים לק"ג/ליטר של מחיר הבסיס
    let mult = item.qty;
    if (item.unit === 'gram' && (p.unit === 'kg' || p.unit === 'gram')) mult = item.qty / (p.unit === 'kg' ? 1000 : 100);
    else if (item.unit === 'ml') mult = item.qty / 1000;
    else if (p.unit === 'gram' && item.unit === 'gram') mult = item.qty / 100;
    for (const chain of CHAINS) {
      if (p.prices[chain.id] != null) totals[chain.id] += p.prices[chain.id] * mult;
    }
  }

  const ranked = CHAINS
    .map(c => ({ id: c.id, name: c.name, total: totals[c.id] }))
    .sort((a, b) => a.total - b.total);

  return { ranked, cheapest: matched ? ranked[0] : null, matched, missing };
}

function openCompare() {
  const items = state.items.filter(i => !i.deleted && !i.checked);
  const box = $('#compare-results');
  if (!items.length) {
    box.innerHTML = '<p class="muted">אין פריטים פתוחים ברשימה.</p>';
  } else {
    const est = estimateBasket(items);
    if (!est.matched) {
      box.innerHTML = '<p class="muted">אף מוצר ברשימה לא נמצא במחירון ההדגמה.</p>';
    } else {
      const min = est.ranked[0].total;
      box.innerHTML = `
        <table class="compare-table">
          <thead><tr><th>רשת</th><th>סה"כ משוער</th><th>הפרש</th></tr></thead>
          <tbody>
            ${est.ranked.map((r, i) => `
              <tr class="${i === 0 ? 'best' : ''}">
                <td>${r.name} ${i === 0 ? '🏆' : ''}</td>
                <td>‏${r.total.toFixed(2)}₪</td>
                <td>${i === 0 ? '—' : '+' + (r.total - min).toFixed(2) + '₪'}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <p class="compare-note">מבוסס על ${est.matched} מתוך ${items.length} פריטים שנמצאו במחירון ההדגמה.</p>
        ${est.missing.length ? `<p class="compare-missing">לא במחירון: ${est.missing.map(escapeHtml).join(', ')}</p>` : ''}
        <p class="compare-note">🔎 בדיקת מחיר אמיתית לפי מוצר:</p>
        <div class="suggestions" style="border:none;padding:0">
          ${items.slice(0, 12).map(i =>
            `<a class="price-link mini-btn" target="_blank" rel="noopener"
               href="https://chp.co.il/main_page/compare_results?shopping_address=&product_name_or_barcode=${encodeURIComponent(i.name)}">${escapeHtml(i.name)} ↗</a>`).join(' ')}
        </div>`;
    }
  }
  $('#dlg-compare').showModal();
}

/* ---------- לייב ---------- */

async function startLive(roomCode) {
  try {
    const room = await LiveSync.connect(roomCode, state.settings.myName, {
      onRemoteState: mergeRemote,
      onStatus: (text, peerNames) => {
        $('#live-status').textContent = `${text} · חדר ${LiveSync.room}`;
        $('#live-peers').textContent = peerNames.length ? `👥 ${peerNames.join(', ')}` : '';
      },
      getState: () => state.items,
    });
    state.room = room;
    saveState();
    $('#live-bar').classList.remove('hidden');
    $('#btn-live').textContent = '🟢 לייב';
    $('#dlg-live').close();
    toast(`חדר לייב פעיל: ${room}`);
  } catch (e) {
    toast(e.message || 'החיבור נכשל');
  }
}

function leaveLive() {
  LiveSync.disconnect();
  state.room = null;
  saveState();
  $('#live-bar').classList.add('hidden');
  $('#btn-live').textContent = '🔴 לייב';
}

function shareRoomLink() {
  const url = `${location.origin}${location.pathname}?room=${LiveSync.room}`;
  const text = `🛒 מצטרפים אליי לרשימת הקניות בלייב!\nקוד חדר: ${LiveSync.room}\n${url}`;
  if (navigator.share) {
    navigator.share({ title: 'סל חכם — קניות ביחד', text, url }).catch(() => {});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }
}

/* ---------- ייצוא ---------- */

function exportList() {
  const items = state.items.filter(i => !i.deleted && !i.checked);
  if (!items.length) { toast('אין מה לייצא'); return; }
  let text = '🛒 רשימת קניות:\n';
  for (const cat of CATEGORIES) {
    const catItems = items.filter(i => i.cat === cat.id);
    if (!catItems.length) continue;
    text += `\n${cat.icon} ${cat.name}:\n`;
    text += catItems.map(i => `• ${i.name} — ${fmtQty(i.qty)} ${unitName(i.unit)}${i.note ? ` (${i.note})` : ''}`).join('\n') + '\n';
  }
  if (navigator.share) {
    navigator.share({ text }).catch(() => {});
  } else {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }
}

/* ---------- מצב חלוקה ---------- */

function renderSplitChips() {
  $('#chip-me').textContent = state.settings.myName;
  $('#chip-partner').textContent = state.settings.partnerName;
  $('#split-filters').classList.toggle('hidden', !state.splitMode);
  $$('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.who === state.splitFilter));
}

/* ---------- אתחול ומאזינים ---------- */

function init() {
  loadState();

  // הוספה
  $('#btn-add').addEventListener('click', handleAdd);
  $('#add-input').addEventListener('keydown', e => { if (e.key === 'Enter') handleAdd(); });
  $('#add-input').addEventListener('input', e => showSuggestions(e.target.value));

  // סריקה
  $('#btn-scan').addEventListener('click', openScanner);
  $('#btn-scan-manual').addEventListener('click', () => {
    const code = $('#scan-manual').value.trim();
    if (code) { $('#scan-manual').value = ''; onBarcode(code); }
  });

  // הדבקת רשימה
  $('#btn-paste-list').addEventListener('click', () => $('#dlg-paste').showModal());
  $('#btn-paste-add').addEventListener('click', () => {
    const lines = $('#paste-text').value.split('\n');
    let added = 0;
    for (const line of lines) {
      const parsed = parseLine(line);
      if (parsed) { addItem(parsed); added++; }
    }
    $('#paste-text').value = '';
    $('#dlg-paste').close();
    toast(`נוספו ${added} מוצרים`);
  });

  // עריכת פריט
  $('#btn-item-save').addEventListener('click', () => {
    if (!editingId) return;
    updateItem(editingId, {
      name: $('#item-name').value.trim() || 'מוצר',
      qty: Math.max(0.01, parseFloat($('#item-qty').value) || 1),
      unit: $('#item-unit').value,
      cat: $('#item-cat').value,
      who: $('#item-who').value,
      note: $('#item-note').value.trim(),
    });
    $('#dlg-item').close();
  });
  $('#btn-item-delete').addEventListener('click', () => {
    if (editingId) deleteItem(editingId);
    $('#dlg-item').close();
  });

  // מצב חלוקה
  $('#split-toggle').checked = state.splitMode;
  $('#split-toggle').addEventListener('change', e => {
    state.splitMode = e.target.checked;
    if (!state.splitMode) state.splitFilter = 'all';
    saveState();
    render();
  });
  $$('.filter-chip').forEach(c => c.addEventListener('click', () => {
    state.splitFilter = c.dataset.who;
    saveState();
    render();
  }));

  // תחתית
  $('#btn-clear-checked').addEventListener('click', () => {
    state.items.filter(i => i.checked && !i.deleted).forEach(i => { i.deleted = true; i.updatedAt = Date.now(); });
    afterChange();
    toast('המסומנים נוקו');
  });
  $('#btn-compare').addEventListener('click', openCompare);
  $('#btn-export').addEventListener('click', exportList);

  // הגדרות
  $('#btn-settings').addEventListener('click', () => {
    $('#set-my-name').value = state.settings.myName;
    $('#set-partner-name').value = state.settings.partnerName;
    $('#set-auto-cat').checked = state.settings.autoCat;
    $('#dlg-settings').showModal();
  });
  $('#btn-settings-save').addEventListener('click', () => {
    state.settings.myName = $('#set-my-name').value.trim() || 'אני';
    state.settings.partnerName = $('#set-partner-name').value.trim() || 'בת/בן זוג';
    state.settings.autoCat = $('#set-auto-cat').checked;
    saveState();
    render();
    $('#dlg-settings').close();
  });
  $('#btn-clear-all').addEventListener('click', () => {
    if (confirm('למחוק את כל הרשימה?')) {
      state.items.forEach(i => { i.deleted = true; i.updatedAt = Date.now(); });
      afterChange();
      $('#dlg-settings').close();
    }
  });

  // לייב
  $('#btn-live').addEventListener('click', () => {
    if (LiveSync.connected) {
      $('#live-bar').classList.toggle('hidden');
    } else {
      $('#dlg-live').showModal();
    }
  });
  $('#btn-create-room').addEventListener('click', () => startLive(LiveSync.newRoomCode()));
  $('#btn-join-room').addEventListener('click', () => {
    const code = $('#join-code').value.trim();
    if (code) startLive(code);
  });
  $('#btn-share-room').addEventListener('click', shareRoomLink);
  $('#btn-leave-room').addEventListener('click', leaveLive);

  // סגירת דיאלוגים
  $$('dialog .dlg-close').forEach(b => b.addEventListener('click', () => {
    const dlg = b.closest('dialog');
    if (dlg.id === 'dlg-scan') Scanner.stop();
    dlg.close();
  }));

  // הצטרפות אוטומטית לחדר מקישור ?room= או מחדר קודם
  const urlRoom = new URLSearchParams(location.search).get('room');
  if (urlRoom) startLive(urlRoom);
  else if (state.room) startLive(state.room);

  render();
}

document.addEventListener('DOMContentLoaded', init);
