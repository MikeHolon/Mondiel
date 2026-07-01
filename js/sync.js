/* ===== סנכרון לייב בין שני טלפונים דרך MQTT over WebSocket =====
 *
 * שימוש בברוקר ציבורי (broker.emqx.io) עם קוד חדר אקראי בתור topic.
 * כל שינוי ברשימה משודר לחדר; מיזוג לפי חותמת־זמן לכל פריט (last-write-wins).
 * ספריית mqtt.js נטענת מ-CDN רק כשמפעילים לייב.
 */

const LiveSync = (() => {
  const BROKER = 'wss://broker.emqx.io:8084/mqtt';
  const MQTT_CDN = 'https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js';

  let client = null;
  let room = null;
  let clientId = null;
  let onRemoteState = null;   // callback: (items) => void
  let onStatus = null;        // callback: (statusText, peers) => void
  let peers = {};             // clientId -> { name, seen }

  function topic(kind) { return `salhakham/${room}/${kind}`; }

  function loadMqttLib() {
    return new Promise((resolve, reject) => {
      if (window.mqtt) return resolve();
      const s = document.createElement('script');
      s.src = MQTT_CDN;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('טעינת ספריית הסנכרון נכשלה — בדקו חיבור לאינטרנט'));
      document.head.appendChild(s);
    });
  }

  function newRoomCode() {
    const n = Math.floor(1000 + Math.random() * 9000);
    const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ';
    const l = () => letters[Math.floor(Math.random() * letters.length)];
    return `SAL-${l()}${l()}${n}`;
  }

  async function connect(roomCode, myName, handlers) {
    await loadMqttLib();
    disconnect();

    room = roomCode.toUpperCase().trim();
    onRemoteState = handlers.onRemoteState;
    onStatus = handlers.onStatus;
    clientId = 'sal_' + Math.random().toString(36).slice(2, 10);
    peers = {};

    client = window.mqtt.connect(BROKER, { clientId, clean: true, reconnectPeriod: 3000 });

    client.on('connect', () => {
      client.subscribe([topic('state'), topic('hello')]);
      sendHello(myName);
      // בקשת מצב עדכני ממי שכבר בחדר
      publish('hello', { type: 'ping', clientId, name: myName });
      report('מחובר ✓');
    });

    client.on('reconnect', () => report('מתחבר מחדש…'));
    client.on('offline', () => report('אין חיבור'));
    client.on('error', () => report('שגיאת חיבור'));

    client.on('message', (t, payload) => {
      let msg;
      try { msg = JSON.parse(payload.toString()); } catch { return; }
      if (msg.clientId === clientId) return; // הודעות של עצמי

      if (t === topic('hello')) {
        peers[msg.clientId] = { name: msg.name || 'שותפ/ה', seen: Date.now() };
        report('מחובר ✓');
        // מישהו חדש נכנס — נשלח לו את המצב הנוכחי שלנו
        if (msg.type === 'ping' && handlers.getState) {
          publishState(handlers.getState());
          sendHello(myName);
        }
      } else if (t === topic('state')) {
        if (Array.isArray(msg.items) && onRemoteState) onRemoteState(msg.items);
      }
    });

    return room;
  }

  function sendHello(name) {
    publish('hello', { type: 'hello', clientId, name });
  }

  function publish(kind, obj) {
    if (!client || !client.connected) return;
    client.publish(topic(kind), JSON.stringify(obj));
  }

  function publishState(items) {
    publish('state', { clientId, items });
  }

  function report(text) {
    if (onStatus) {
      const names = Object.values(peers).map(p => p.name);
      onStatus(text, names);
    }
  }

  function disconnect() {
    if (client) { try { client.end(true); } catch {} }
    client = null; room = null; peers = {};
  }

  return {
    connect, disconnect, publishState, newRoomCode,
    get connected() { return !!(client && client.connected); },
    get room() { return room; },
  };
})();
