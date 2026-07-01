/* ===== סריקת ברקוד =====
 *
 * עדיפות ל-BarcodeDetector המובנה בדפדפן (כרום/אנדרואיד).
 * אם לא זמין (למשל iOS/ספארי) — נטענת ספריית ZXing מ-CDN.
 * בכל מקרה יש שדה להקלדת ברקוד ידנית.
 */

const Scanner = (() => {
  const ZXING_CDN = 'https://unpkg.com/@zxing/library@0.21.3/umd/index.min.js';
  const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'];

  let stream = null;
  let running = false;
  let zxingReader = null;

  function loadZxing() {
    return new Promise((resolve, reject) => {
      if (window.ZXing) return resolve();
      const s = document.createElement('script');
      s.src = ZXING_CDN;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('טעינת ספריית הסריקה נכשלה'));
      document.head.appendChild(s);
    });
  }

  async function start(videoEl, onCode, onStatus) {
    stop();
    running = true;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, audio: false,
      });
    } catch {
      onStatus('אין גישה למצלמה — אפשר להקליד ברקוד ידנית למטה');
      return;
    }
    videoEl.srcObject = stream;
    await videoEl.play();

    if ('BarcodeDetector' in window) {
      onStatus('מכוונים את המצלמה לברקוד…');
      const detector = new window.BarcodeDetector({ formats: FORMATS });
      const tick = async () => {
        if (!running) return;
        try {
          const codes = await detector.detect(videoEl);
          if (codes.length && running) {
            running = false;
            onCode(codes[0].rawValue);
            return;
          }
        } catch { /* פריים לא מוכן — ממשיכים */ }
        requestAnimationFrame(tick);
      };
      tick();
    } else {
      onStatus('טוען מנוע סריקה…');
      try {
        await loadZxing();
        zxingReader = new window.ZXing.BrowserMultiFormatReader();
        onStatus('מכוונים את המצלמה לברקוד…');
        zxingReader.decodeFromStream(stream, videoEl, (result) => {
          if (result && running) {
            running = false;
            onCode(result.getText());
          }
        });
      } catch {
        onStatus('הדפדפן לא תומך בסריקה — הקלידו ברקוד ידנית למטה');
      }
    }
  }

  function stop() {
    running = false;
    if (zxingReader) { try { zxingReader.reset(); } catch {} zxingReader = null; }
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }
  }

  return { start, stop };
})();
