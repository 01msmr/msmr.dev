/* msmr.dev — Verhalten der Seite. Blöcke:
   0 Grundlagen · 1 Wortmarke · 2 Navigation · 3 Schmale Navigation (Auswahlrad)
   4 Blättern (aktives Projekt, Tasten, Wischen) · 5 Projektbild · 6 Link-Pille
   7 Flüssigkeit · 8 Cursor */

/* ═══ 0 Grundlagen: Elemente, Medienabfragen, gemeinsamer Zustand ═══ */
const root    = document.documentElement;
const calm    = matchMedia('(prefers-reduced-motion: reduce)');
const narrow  = matchMedia('(max-width:1099px)');
const bar     = document.querySelector('.bar');
const mark    = document.querySelector('.mark');
const markM   = document.querySelector('.mark__m');
const slot    = document.querySelector('.mark-slot');
const hero    = document.querySelector('.hero');
const lede    = document.querySelector('.lede');
const slides  = [...document.querySelectorAll('.slide')];
const nav     = document.querySelector('.nav');
const links   = [...nav.querySelectorAll('a')];
const hl      = nav.querySelector('.nav__hl');
const endLink = nav.querySelector('.nav-end');
const count   = document.querySelector('.count b');
const endPage = document.querySelector('.end');
const screens = [hero, ...slides, endPage];     // Start, Projekte, Linkseite
let atEnd = false;                              // Linkseite sichtbar
// Scrollbereich: auf Touch der eigene Bereich .pager (sauberes Einrasten auf iOS), sonst das Fenster
const pagerOn  = matchMedia('(hover:none)').matches;
const pager    = document.querySelector('.pager');
const scroller = pagerOn ? pager : window;
const snapEl   = pagerOn ? pager : root;        // trägt scroll-snap-type
const Y        = () => pagerOn ? pager.scrollTop : scrollY;
const toY      = y => pagerOn ? (pager.scrollTop = y) : scrollTo(0, y);

root.classList.add('js');

/* ═══ 1 Wortmarke: bildschirmbreit auf dem Start, schrumpft links oben
   in die Kopfleiste (30 px). Ohne JS steht sie gleich klein dort. ═══ */
const TOP  = 14;
let big = 1, slotTop = 0, travel = 1, padX = 0, markW = 0, ledeTop = 0, ledeH = 0, ledeEnd = 0;


/* Echte Schrift-Transition: die Schriftgröße selbst läuft mit (nicht transform:scale).
   Der Browser setzt die Buchstaben bei jeder Größe neu — scharf, ohne Umschalten. */
function measure(){
  mark.style.fontSize = '';
  mark.style.transform = 'none';
  padX = parseFloat(getComputedStyle(bar).paddingLeft);
  markW = mark.getBoundingClientRect().width;
  big = (innerWidth - 2 * padX) / markW * .97;   // Rand für Glyphenüberhang
  root.style.setProperty('--mark-w', markW + 32 + 'px');
  slot.style.height = mark.offsetHeight * big * .86 + 'px';
  slotTop = slot.offsetTop;
  travel = Math.max(1, hero.offsetHeight * .6);
  lede.style.transform = ''; lede.style.opacity = '';
  ledeTop = lede.offsetTop; ledeH = lede.offsetHeight;
  ledeEnd = parseFloat(getComputedStyle(root).getPropertyValue('--bar')) + ledeH;   // ganz weg: eine eigene Höhe unter der Kopfleiste
  update(true);
}
let lastP = -1;
const onHeader = [];                          // weitere Arbeit nur, solange sich der Kopf bewegt (nicht bei jedem Scrollen)
function update(force){
  const p = Math.min(1, Math.max(0, Y() / travel));
  if (p === lastP && !force) return;          // nach dem Startbildschirm: nichts mehr zu tun, kein Neuberechnen der Seite
  lastP = p;
  // EIN Bogen: die Mitte der Marke läuft auf einer quadratischen Bézierkurve
  // von der Mitte der großen Marke zur Mitte der kleinen. Der Kontrollpunkt liegt
  // auf Höhe des Starts und über dem Ziel — also erst nach links, dann nach oben.
  const t  = (1 - Math.cos(Math.PI * p)) / 2;            // ease-in-out sine
  const s  = big ** (1 - t);                             // Größe: logarithmisch, wirkt gleichmäßig
  const h  = 30;                                         // Zeilenhöhe der kleinen Marke
  const sx = padX + markW * big / 2, sy = slotTop + h * big / 2;   // Start (Mitte)
  const ex = padX + markW / 2,       ey = TOP + h / 2;             // Ziel (Mitte)
  const cx = ex,                     cy = sy;                      // Kontrollpunkt
  const mx = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t * t * ex;
  const my = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t * t * ey;
  const x  = mx - markW * s / 2 - padX;                  // linke obere Ecke relativ zur Ruhelage
  const y  = my - h * s / 2 - TOP;
  mark.style.fontSize = (30 * s).toFixed(2) + 'px';
  mark.style.transform = `translate3d(${x}px,${y}px,0)`;
  root.style.setProperty('--p', t.toFixed(3));

  // Unterzeile: schrumpft und verblasst beim Hochscrollen; ganz weg, wenn sie noch
  // eine eigene Höhe unter der Kopfleiste steht
  const q = Math.min(1, Math.max(0, Y() / Math.max(1, ledeTop - ledeEnd)));
  lede.style.opacity = (1 - q).toFixed(3);
  lede.style.transform = `scale(${(1 - .35 * q).toFixed(3)})`;
  onHeader.forEach(f => f());
}
let queued = false;
scroller.addEventListener('scroll', () => {
  if (queued) return; queued = true;
  requestAnimationFrame(() => { queued = false; update(); });
}, { passive:true });
addEventListener('resize', measure);
document.fonts.ready.then(measure);
document.fonts.addEventListener('loadingdone', measure);   // Webfont kommt später: neu messen
measure();

/* ═══ 2 Navigation: aktives Projekt, Farbband, Fenster ═══
   Hinter der Navigation liegt ein Band aus Projekttönen (je Eintrag voll,
   über die Lücke verlaufend). Das Rechteck ist ein Ausschnitt davon und
   gleitet zum Eintrag unter der Maus, sonst zum aktiven Projekt. */
let current = -2, hovered = null, peek = null, choice = null;   // choice: angeklickter Eintrag, solange die Seite noch unterwegs ist

const box = a => {                           // genaue Lage eines Eintrags im Band (Bruchteile von Pixeln)
  const n = hl.getBoundingClientRect(), r = a.getBoundingClientRect();
  return { l:r.left - n.left, r:r.right - n.left, w:n.width };
};
/* Vor dem ersten Eintrag liegt ein unsichtbarer »Eintrag 0« (Startbildschirm): auf dem Rechner
   die Fläche der Wortmarke, schmal so breit wie der erste Eintrag. Von dort gleitet das Fenster
   in Eintrag 01 — die Farbe wechselt an der Kante von transparent zur Projektfarbe. */
const zeroWidth = () => narrow.matches
  ? links[0].offsetWidth
  : parseFloat(getComputedStyle(root).getPropertyValue('--mark-w')) || 160;
let navColors = null;                        // Projektfarben der Einträge — ändern sich nie, einmal lesen
function paintBand(){
  navColors = navColors || links.map(a => getComputedStyle(a).getPropertyValue('--hl'));
  const V = zeroWidth();
  hl.style.left = -V + 'px';
  hl.style.width = nav.scrollWidth + V + 'px';    // im scrollbaren Streifen: Band über die ganze Länge (+ Eintrag 0)
  const f = box(links[0]);
  const stops = [`transparent 0px`, `transparent ${f.l}px`];
  links.forEach((a, j) => {
    const c = navColors[j], b = box(a);                                   // volle Projektfarbe
    stops.push(`${c} ${b.l}px`, `${c} ${b.r}px`);                          // harte Kanten, in px wie das Fenster
  });
  hl.style.background = `linear-gradient(to right, ${stops.join(',')})`;
}
function placeHl(){
  const a = hovered || peek || choice || (atEnd ? endLink : links[current]);
  links.forEach(l => l.classList.toggle('in-win', l === a));
  const b = box(a || links[0]);
  const L = a ? b.l : 0, R = a ? b.r : box(links[0]).l - 2;   // nichts aktiv: Fenster auf dem unsichtbaren Eintrag 0 (2 px Abstand: kein Farbsaum an 01)
  hl.style.setProperty('--l', L + 'px');
  hl.style.setProperty('--r', (b.w - R) + 'px');
}
function relayout(){ markNeighbours(); paintBand(); placeHl(); }
function markNeighbours(c){                   // schmal: nur der aktive Eintrag (oder die Mitte beim Wischen), daneben ‹ ›
  let i = links.indexOf(c || peek || (atEnd ? endLink : links[current]));
  if (i < 0) i = 0;                             // Startbildschirm: als stünde 01 an — nie alle Einträge zeigen
  links.forEach((a, j) => {
    const d = j - i;
    a.classList.toggle('far', Math.abs(d) > 1);
    a.classList.toggle('edge-l', d === -1);
    a.classList.toggle('edge-r', d === 1);
  });
}
markNeighbours();                               // gleich beim Laden: der Streifen startet reduziert
links.forEach(a => a.addEventListener('pointerenter', () => { hovered = a; placeHl(); }));
/* Klick: der Eintrag wird sofort aktiv — die Seite folgt. Sonst springt die Markierung beim
   Wegbewegen der Maus kurz zurück, bis die Seite angekommen ist. */
links.forEach(a => a.addEventListener('click', () => {
  choice = a;
  if (a !== endLink) setActive(links.indexOf(a), true);
  relayout();
}));
nav.addEventListener('pointerleave', () => { hovered = null; placeHl(); });

/* Die Karte wechselt sofort (ihre Füllung beginnt); die Navigation folgt, wenn die
   Füllung zu 85 % steht — bei der Flüssigkeit auf Touch nach ≈ 390 ms. */
const NAV_AFTER_FILL = 390;
let navT = 0, fillStart = 0;                    // fillStart: Beginn der Füllung auf Touch (Zeitpunkt)
function setActive(i, now = false){           // now: Navigation sofort (Auswahl im Streifen)
  if (i === current) return;
  current = i;
  slides.forEach((s, j) => s.classList.toggle('is-active', j === i));
  root.style.setProperty('--hl-now', i >= 0 ? getComputedStyle(slides[i]).getPropertyValue('--hl') : '');
  clearTimeout(navT);
  navT = setTimeout(() => {
    links.forEach((a, j) => a.toggleAttribute('aria-current', j === current));
    count.textContent = String(current + 1).padStart(2, '0');
    count.classList.remove('tick'); void count.offsetWidth; count.classList.add('tick');
    markNeighbours();
    requestAnimationFrame(() => { relayout(); centerNav(); });   // neue Breiten stehen: einmal messen, einmal zentrieren
  }, now ? 0 : navDelay());
}
function navDelay(){                          // Touch: ab Beginn der Füllung gerechnet; sonst voll
  const since = performance.now() - fillStart;
  return since < 1000 ? Math.max(0, NAV_AFTER_FILL - since) : NAV_AFTER_FILL;
}

/* ═══ 3 Schmale Navigation: Auswahlrad ═══
   Wischen: nur Nummern, das Farbfenster folgt dem Eintrag in der Mitte.
   Loslassen: der Eintrag rastet ein, wird aktiv, zeigt seinen Namen, die Karte wechselt.
   »msmr« gleitet dabei aus der Leiste, ».dev« bleibt links stehen. */
let scrubbing = false, settleT = 0;

/* Streifen und Farbfenster bewegen sich gemeinsam: gleiche Dauer, gleiche Kurve
   (--nav-ms / ease-out cubic), Einrasten des Streifens währenddessen aus. */
const NAV_MS = 450;
let navAnim = 0;
function centerNav(smooth = true){
  if (!narrow.matches || scrubbing) return;
  const a = atEnd ? endLink : links[current];
  if (!a) return;
  const to = Math.max(0, Math.min(nav.scrollWidth - nav.clientWidth, a.offsetLeft + a.offsetWidth / 2 - nav.clientWidth / 2));
  cancelAnimationFrame(navAnim);
  const from = nav.scrollLeft;
  if (!smooth || Math.abs(to - from) < 1) { nav.scrollLeft = to; return; }
  nav.style.scrollSnapType = 'none';
  const t0 = performance.now();
  const tick = now => {
    const k = Math.min(1, (now - t0) / NAV_MS), e = 1 - (1 - k) ** 3;
    nav.scrollLeft = from + (to - from) * e;
    if (k < 1) navAnim = requestAnimationFrame(tick);
    else nav.style.scrollSnapType = '';
  };
  navAnim = requestAnimationFrame(tick);
}
function centred(){                           // Eintrag, dessen Mitte der Streifenmitte am nächsten ist
  const mid = nav.getBoundingClientRect().left + nav.clientWidth / 2;
  let best = null, d = Infinity;
  links.forEach(a => { const r = a.getBoundingClientRect(), dd = Math.abs(r.left + r.width / 2 - mid); if (dd < d) { d = dd; best = a; } });
  return best;
}
function slideMark(){                         // »msmr« weicht, sobald der Streifen gescrollt wird
  // nur mit kleiner Marke in der Kopfleiste — auf dem Startbildschirm steht »msmr.dev« vollständig links
  if (!narrow.matches || lastP < 1) { mark.style.translate = ''; markM.style.opacity = ''; return; }
  // Ausgangspunkt: erster Eintrag (01) in der Mitte — dort steht »msmr.dev« vollständig
  const f = links[0], base = Math.max(0, f.offsetLeft + f.offsetWidth / 2 - nav.clientWidth / 2);
  // nie halb: ganz da oder ganz weg — sobald der Streifen über 01 hinaus steht, gleitet »msmr« als Ganzes hinaus
  const hide = nav.scrollLeft - base > 8;
  mark.style.translate = hide ? `${-markM.offsetWidth}px 0` : '0 0';
  markM.style.opacity = hide ? '0' : '1';
}
const startScrub = () => {
  if (!narrow.matches || scrubbing) return;
  cancelAnimationFrame(navAnim); nav.style.scrollSnapType = '';
  scrubbing = true; nav.classList.add('is-scrubbing');
  requestAnimationFrame(() => { peek = centred(); markNeighbours(peek); paintBand(); placeHl(); });   // nur Nummern: Band neu malen
};
nav.addEventListener('touchstart', startScrub, { passive:true });
nav.addEventListener('wheel', startScrub, { passive:true });
nav.addEventListener('touchend', () => { if (!scrubbing) return; clearTimeout(settleT); settleT = setTimeout(settle, 160); }, { passive:true });   // nur getippt: Zustand zurücksetzen
nav.addEventListener('scroll', () => {
  slideMark();
  if (!scrubbing) return;
  const c = centred();
  if (c !== peek) { peek = c; markNeighbours(c); placeHl(); }
  clearTimeout(settleT);
  settleT = setTimeout(settle, 160);          // kurz nach dem letzten Scrollschritt gilt es als losgelassen
}, { passive:true });
function settle(){
  const a = peek; peek = null; scrubbing = false;
  nav.classList.remove('is-scrubbing');
  if (!a) return relayout();
  if (a === endLink) endPage.scrollIntoView({ behavior:'smooth' });
  else { setActive(links.indexOf(a), true); slides[links.indexOf(a)].scrollIntoView({ behavior:'smooth' }); }
  requestAnimationFrame(() => { relayout(); centerNav(); });
}
narrow.addEventListener('change', () => { slideMark(); relayout(); centerNav(false); });
onHeader.push(slideMark);                     // beim Zurück zum Start sofort zurücksetzen
/* ═══ 4 Blättern: aktives Projekt — erst übernehmen, wenn der Bildlauf steht ═══ */
let pending = null, idleT = 0;
const commit = () => { if (pending !== null) setActive(pending); pending = null; choice = null; };   // Seite steht: Klick-Wahl erledigt
const waitIdle = () => { clearTimeout(idleT); idleT = setTimeout(commit, 140); };
const io = new IntersectionObserver(entries => entries.forEach(en => {
  if (!en.isIntersecting) return;
  pending = slides.indexOf(en.target);        // merken, aber erst übernehmen, wenn der Bildlauf steht
  waitIdle();
}), { threshold:.5 });
scroller.addEventListener('scroll', () => { if (pending !== null) waitIdle(); }, { passive:true });
[hero, ...slides].forEach(el => io.observe(el));
addEventListener('resize', relayout);
document.fonts.ready.then(relayout);
new ResizeObserver(relayout).observe(nav);   // Breite ändert sich (Schrift, schmale Ansicht): Band neu malen

/* ── Links/rechts wechselt das Projekt wie hoch/runter:
   Pfeiltasten, seitliches Wischen am Trackpad, Wischen am Touchscreen ═══ */
new IntersectionObserver(([en]) => {
  atEnd = en.isIntersecting;
  root.classList.toggle('at-end', atEnd);
  endLink.toggleAttribute('aria-current', atEnd);
  links.forEach((a, j) => { if (a !== endLink) a.toggleAttribute('aria-current', !atEnd && j === current); });
  requestAnimationFrame(() => { relayout(); centerNav(); });
}, { threshold:.5 }).observe(endPage);

/* Start ↔ erstes Projekt: eigener, langsamer Bildlauf (≈ doppelte Dauer des
   Browser-Bildlaufs), damit die Wortmarke Zeit für ihren Bogen hat. */
const SLOW = 1050;                          // halb zwischen Browser (≈ 700 ms) und 1400 ms
let gliding = false, glideEnd = 0;
function glide(to){
  if (gliding) return;
  gliding = true;
  const from = Y(), t0 = performance.now();
  snapEl.style.scrollSnapType = 'none'; snapEl.style.scrollBehavior = 'auto';
  const tick = now => {
    const k = Math.min(1, (now - t0) / SLOW);
    const e = k < .5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2;   // ease-in-out cubic
    toY(from + (to - from) * e);
    if (k < 1) return requestAnimationFrame(tick);
    snapEl.style.scrollSnapType = ''; snapEl.style.scrollBehavior = '';
    gliding = false; glideEnd = performance.now();
  };
  requestAnimationFrame(tick);
}
const first = () => slides[0].offsetTop;
const onHero = () => Y() < first() * .5;
const atFirst = () => Math.abs(Y() - first()) < 8;

function go(dir){
  const here = atEnd ? screens.length - 1 : current + 1;                     // current: -1 = Start
  const i = Math.max(0, Math.min(screens.length - 1, here + dir));
  if (i <= 1 && (onHero() || atFirst())) return glide(i === 0 ? 0 : first());
  screens[i].scrollIntoView({ behavior:'smooth' });
}
addEventListener('keydown', ev => {
  if (ev.altKey || ev.ctrlKey || ev.metaKey || ev.target.closest('input, textarea')) return;
  if (ev.key === 'ArrowRight') { ev.preventDefault(); go(1); }
  if (ev.key === 'ArrowLeft')  { ev.preventDefault(); go(-1); }
  const down = ['ArrowDown', 'PageDown', ' '].includes(ev.key), up = ['ArrowUp', 'PageUp'].includes(ev.key);
  if (down && onHero())  { ev.preventDefault(); glide(first()); }
  if (up && atFirst())   { ev.preventDefault(); glide(0); }
});
addEventListener('wheel', ev => {             // senkrecht: nur der Übergang Start ↔ erstes Projekt
  if (Math.abs(ev.deltaY) <= Math.abs(ev.deltaX)) return;
  if (gliding || performance.now() - glideEnd < 600) { ev.preventDefault(); return; }   // Nachschwung des Trackpads schlucken
  if (ev.deltaY > 0 && onHero())  { ev.preventDefault(); glide(first()); }
  if (ev.deltaY < 0 && atFirst()) { ev.preventDefault(); glide(0); }
}, { passive:false });
document.querySelector('.cue a').addEventListener('click', ev => { ev.preventDefault(); glide(first()); });
let wheelLock = 0;
addEventListener('wheel', ev => {
  if (ev.target.closest && ev.target.closest('.nav')) return;   // der Streifen scrollt selbst
  if (Math.abs(ev.deltaX) < 30 || Math.abs(ev.deltaX) < Math.abs(ev.deltaY) * 1.5) return;
  const now = Date.now();
  if (now < wheelLock) return;                // eine Geste = ein Projekt
  wheelLock = now + 700;
  go(ev.deltaX > 0 ? 1 : -1);
}, { passive:true });
let touch = null;
addEventListener('touchstart', ev => { if (ev.target.closest('.nav')) { touch = null; return; } const t = ev.touches[0]; touch = { x:t.clientX, y:t.clientY }; }, { passive:true });
addEventListener('touchend', ev => {
  if (!touch) return;
  const t = ev.changedTouches[0], dx = t.clientX - touch.x, dy = t.clientY - touch.y;
  touch = null;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
}, { passive:true });

/* ── Touch: Einrasten per Skript ──
   Finger führt 1:1; beim Loslassen entscheidet die Wischbewegung: schnell oder mehr als ¼ Bildschirm
   = eine Karte weiter/zurück, sonst zurück zur aktuellen. Dann wird der iOS-Schwung gestoppt und die
   Seite gleitet exakt auf die Kartenkante. Karten höher als der Bildschirm lassen sich innen frei scrollen. */
if (pagerOn) {
  const tops = () => screens.map(el => el.offsetTop);
  const maxY = () => pager.scrollHeight - pager.clientHeight;
  let startY = 0, samples = [], anim = 0;
  const current = y => { const t = tops(); let i = 0; while (i + 1 < t.length && t[i + 1] <= y + 2) i++; return i; };   // Bildschirm, in dem y liegt
  function glideTo(to){
    cancelAnimationFrame(anim);
    const from = pager.scrollTop, d = to - from;
    if (Math.abs(d) < 1) { pager.style.overflowY = ''; return; }
    pager.style.overflowY = 'hidden';                  // stoppt den iOS-Schwung
    const dur = Math.min(520, 260 + Math.abs(d) * .3), t0 = performance.now();
    const tick = now => {
      const k = Math.min(1, (now - t0) / dur), e = 1 - (1 - k) ** 3;   // ease-out cubic
      pager.scrollTop = from + d * e;
      if (k < 1) anim = requestAnimationFrame(tick); else pager.style.overflowY = '';
    };
    anim = requestAnimationFrame(tick);
  }
  pager.addEventListener('touchstart', ev => {
    cancelAnimationFrame(anim); pager.style.overflowY = '';
    startY = pager.scrollTop;
    samples = [{ y:ev.touches[0].clientY, t:performance.now() }];
  }, { passive:true });
  pager.addEventListener('touchmove', ev => {
    const now = performance.now();
    samples.push({ y:ev.touches[0].clientY, t:now });
    while (samples.length > 2 && now - samples[0].t > 90) samples.shift();   // nur die letzten ~90 ms zählen
  }, { passive:true });
  pager.addEventListener('touchend', () => {
    const a = samples[0], b = samples[samples.length - 1];
    const v = b && a && b.t > a.t ? (a.y - b.y) / (b.t - a.t) : 0;   // px/ms, positiv = nach unten blättern
    const y = pager.scrollTop, vh = pager.clientHeight, t = tops();
    const i = current(startY), h = (t[i + 1] ?? pager.scrollHeight) - t[i];
    // hohe Karte: innen frei scrollen, solange wir nicht über ihre Enden hinaus wollen
    if (h > vh + 4 && y > t[i] && y < t[i] + h - vh) return;
    let target = i;
    if (Math.abs(v) > .35) target = i + Math.sign(v);
    else if (Math.abs(y - startY) > vh / 4) target = i + Math.sign(y - startY);
    target = Math.max(0, Math.min(screens.length - 1, target));
    // hohe Karte beim Hochwischen: an ihrem unteren Ende landen, nicht am Anfang
    let to = t[target];
    if (target < i || (target === i && y < t[i])) {
      const ht = (t[target + 1] ?? pager.scrollHeight) - t[target];
      if (ht > vh + 4 && target < i) to = t[target] + ht - vh;
    }
    glideTo(Math.max(0, Math.min(maxY(), to)));
  }, { passive:true });
}

/* ── Seiteninterne Links (#…) gleiten per Skript — auf Touch gilt kein globales »smooth« ── */
document.addEventListener('click', ev => {
  const a = ev.target.closest('a[href^="#"]');
  if (!a || ev.defaultPrevented) return;
  const t = document.querySelector(a.getAttribute('href'));
  if (!t) return;
  ev.preventDefault();
  t.scrollIntoView({ behavior:calm.matches ? 'auto' : 'smooth' });
  history.replaceState(null, '', a.getAttribute('href'));
});

/* ═══ 5 Projektbild
   Klick: Raster ein/aus. Doppelklick (nur bei Raster): volles Farbbild ↔ Raster.
   Nach 11 s ohne Aktion in der Karte blendet jedes Bild aus (4 s); danach wieder mit Klick beginnen. ═══ */
const SHOW_FOR = 11000;                     // danach blendet das Bild aus

/* Halbton im Browser: Punkte auf gedrehtem Raster (45°), Fläche ∝ Dunkelheit.
   Gezeichnet für die echte Kartengröße und Pixeldichte — scharf, ohne eigene Dateien. */
function halftone(canvas, img){
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if (!w || !h) return;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const sc = Math.max(w / img.naturalWidth, h / img.naturalHeight);       // wie background-size:cover
  const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
  const cell = 12.8 * dw / 1600;                                          // Rasterweite wie bisher
  // Vorlage klein, weich und grau abtasten
  const k = 4 / cell, sw = Math.ceil(w * k), sh = Math.ceil(h * k);
  const src = document.createElement('canvas'); src.width = sw; src.height = sh;
  const sx = src.getContext('2d', { willReadFrequently:true });
  sx.filter = `blur(${(cell / 3 * k).toFixed(2)}px) grayscale(1)`;
  sx.drawImage(img, (w - dw) / 2 * k, (h - dh) / 2 * k, dw * k, dh * k);
  const px = sx.getImageData(0, 0, sw, sh).data;
  // Kontrast strecken (1 % abschneiden), überwiegend dunkle Bilder umkehren
  const hist = new Uint32Array(256); let sum = 0;
  for (let i = 0; i < px.length; i += 4) { hist[px[i]]++; sum += px[i]; }
  const n = px.length / 4, cut = n * .01;
  let lo = 0, hi = 255, acc = 0;
  while (lo < 255 && (acc += hist[lo]) < cut) lo++;
  acc = 0; while (hi > 0 && (acc += hist[hi]) < cut) hi--;
  const span = Math.max(1, hi - lo);
  const inv = (sum / n - lo) / span * 255 < 100;
  const lum = (x, y) => {
    const i = (Math.min(sh - 1, Math.max(0, y | 0)) * sw + Math.min(sw - 1, Math.max(0, x | 0))) * 4;
    const g = Math.min(255, Math.max(0, (px[i] - lo) / span * 255));
    return inv ? 255 - g : g;
  };
  // Punkte zeichnen
  canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  const cx = canvas.getContext('2d');
  cx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cx.fillStyle = '#000'; cx.beginPath();
  const a = Math.PI / 4, ux = Math.cos(a) * cell, uy = Math.sin(a) * cell;
  const m = Math.ceil(Math.hypot(w, h) / cell) + 2, rmax = cell * .72, rmin = .9 * dw / 1600;
  for (let i = -m; i <= m; i++) for (let j = -m; j <= m; j++) {
    const x = w / 2 + i * ux - j * uy, y = h / 2 + i * uy + j * ux;
    if (x < -cell || y < -cell || x > w + cell || y > h + cell) continue;
    const dark = Math.max(0, (1 - lum(x * k, y * k) / 255 - .1) / .9) ** .8;
    const r = rmax * Math.sqrt(dark);
    if (r < rmin) continue;
    cx.moveTo(x + r, y); cx.arc(x, y, r, 0, Math.PI * 2);
  }
  cx.fill();
  canvas.dataset.size = w + 'x' + h;
}

document.querySelectorAll('.card[data-shot]').forEach(card => {
  let clickTimer, hideTimer, mode = null;     // null | 'shot' | 'full'
  const canvas = card.querySelector('canvas.shot');
  let img = null;
  const load = () => {                        // erst bei Kontakt mit der Karte laden
    if (img) return img.decode ? img.decode().catch(() => {}) : Promise.resolve();
    img = new Image();
    img.src = card.dataset.shot;
    card.style.setProperty('--full', `url(${card.dataset.shot})`);
    return img.decode ? img.decode().catch(() => {}) : new Promise(r => { img.onload = r; });
  };
  const draw = () => load().then(() => {
    if (img.naturalWidth && canvas.dataset.size !== canvas.clientWidth + 'x' + canvas.clientHeight) halftone(canvas, img);
  });
  card.addEventListener('pointerenter', load, { once:true });
  addEventListener('resize', () => { if (canvas.dataset.size) { delete canvas.dataset.size; if (mode) draw(); } });
  const at = ev => {
    const r = card.getBoundingClientRect();
    card.style.setProperty('--cx', ev.clientX - r.left + 'px');
    card.style.setProperty('--cy', ev.clientY - r.top + 'px');
  };
  const arm = () => {                         // Uhr neu starten: 11 s ohne Aktion, dann ausblenden
    clearTimeout(hideTimer);
    if (mode) hideTimer = setTimeout(() => show(null, true), SHOW_FOR);
  };
  const show = (m, slow = false) => {         // slow: nach Ablauf langsam ausblenden, sonst zügig
    if (m) draw();
    card.classList.toggle('slow-out', slow);
    mode = m;
    card.classList.toggle('is-shot', m === 'shot');
    card.classList.toggle('is-full', m === 'full');
    arm();
  };
  card.addEventListener('pointermove', arm, { passive:true });   // Bewegung in der Karte zählt als Aktion
  card.addEventListener('mousedown', ev => { if (ev.detail > 1 && !ev.target.closest('a')) ev.preventDefault(); });   // kein Markieren beim Doppelklick
  card.addEventListener('click', ev => {
    if (ev.target.closest('a') || ev.detail > 1 || mode === 'full') return;
    clearTimeout(clickTimer);
    clickTimer = setTimeout(() => show(mode === 'shot' ? null : 'shot'), 240);   // auf möglichen Doppelklick warten
  });
  card.addEventListener('dblclick', ev => {
    if (ev.target.closest('a')) return;
    clearTimeout(clickTimer);
    if (mode === 'shot') { at(ev); show('full'); }          // öffnet sich vom Cursor aus …
    else if (mode === 'full') { at(ev); show('shot'); }     // … und schließt sich zum Cursor hin
  });
});

/* ═══ 6 Link-Pille beim Verlassen: Kopie fährt nach links hinaus ═══ */
document.querySelectorAll('.title a, .links a').forEach(a => {
  const leave = () => {
    if (calm.matches) return;
    const g = document.createElement('span');
    g.className = 'pill-ghost';
    g.setAttribute('aria-hidden', 'true');
    a.append(g);
    g.animate([{ transform:'none' }, { transform:'translateX(-100vw)' }],
              { duration:367, easing:'cubic-bezier(.55,0,.9,.35)' }).onfinish = () => g.remove();
  };
  let keyFocus = false;                       // Pille per Tastatur sichtbar?
  a.addEventListener('pointerleave', leave);
  a.addEventListener('focus', () => { keyFocus = a.matches(':focus-visible'); });
  a.addEventListener('blur', () => { if (keyFocus && !a.matches(':hover')) leave(); keyFocus = false; });
});

/* ═══ 7 Füllung als Flüssigkeit — zähflüssig (»Honig«) ═══
   Beim Hover steigt der Pegel; die Oberfläche wölbt sich breit zum Cursor und fließt
   träge zurück. Wenige Stützstellen und starke Kopplung: große, ruhige Wellen,
   kaum kleine Nebenwellen. Ohne reduzierte Bewegung.
   Touch (iPhone/iPad, kein Cursor): die eingerastete Karte füllt sich; die Wölbung
   wandert zu zufälligen Stellen, dazu leichte Stöße — Finger auf der Karte bewegt das Wasser auch. */
if (!calm.matches) {
  const touch = !matchMedia('(hover:hover) and (pointer:fine)').matches;
  root.classList.add('liquid');
  const N = 44;               // Stützstellen der Oberfläche — viele für eine feine Kurve …
  const TENSION = .0035;      // zieht jede Stelle zurück auf den Pegel (schwach: langsame Wellen)
  const SPREAD = .44;         // … und starke Kopplung: breite Wellen, keine kleinen Nebenwellen
  const DAMP = .988;          // Dämpfung pro Schritt (wenig: Wellen tragen weit)
  // Pegel als kritisch gedämpfte Feder: sanfter Anlauf, weiches Ankommen, Tempo ohne Knick
  // (auch beim Umkehren mitten im Füllen). Maus: voll nach ≈ 1,5 s;
  // Touch: 85 % nach ≈ 0,39 s, passend zur Navigation (NAV_AFTER_FILL).
  const OMEGA = touch ? 8.4 : 4;   // 25 % langsamer als zuvor (10,5 / 5)
  const PUSH = .015, PRESS = .02;    // seitliches Schieben / Drücken nahe der Oberfläche (sanft)
  const BULGE = .8, REACH = .24;     // Wölbung zum Cursor: Stärke (hoch), Breite (Anteil der Kartenbreite)
  const LAG = .35;                   // Sekunden: die Wölbung folgt einer geglätteten Cursorposition
  const PACE = .5;                   // Wellen-Tempo: halb so schnell — sehr ruhig
  const FULL = 1.02;          // Ziel knapp über der Kante: hält oben an, ohne einen Spalt zu lassen
  const live = new Set(); let raf = 0, t0 = 0;

  document.querySelectorAll('.card').forEach(card => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'liq'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('preserveAspectRatio', 'none');
    const path = document.createElementNS(svg.namespaceURI, 'path'); svg.append(path);
    card.prepend(svg);        // zuerst = unter Halbton, Nummer und Schrift
    const s = { card, path, w:1, h:1, level:0, lv:0, target:0, y:new Float32Array(N), v:new Float32Array(N), px:null, py:null, mx:null, ms:null, t:Math.random() * 100, ph:Math.random() * 6.3 };
    const size = () => { s.w = card.clientWidth; s.h = card.clientHeight; svg.setAttribute('viewBox', `0 0 ${s.w} ${s.h}`); draw(s); };
    new ResizeObserver(size).observe(card);
    const wake = () => { live.add(s); if (!raf) { t0 = 0; raf = requestAnimationFrame(loop); } };
    if (touch) {                              // Touch: steigt, sobald die Karte fast eingerastet ist (99,5 %)
      const screen = card.closest('.slide, .end');
      let on = false;
      new IntersectionObserver(([en]) => {
        // sichtbarer Anteil — bei Karten höher als der Bildschirm bezogen auf die Bildschirmhöhe
        const frac = en.intersectionRect.height / Math.min(en.boundingClientRect.height, en.rootBounds.height);
        const now = on ? frac > .5 : frac >= .995;  // an ab 99,5 %, aus erst unter 50 % (kein Flackern)
        if (now === on) return;
        on = now;
        s.target = on ? FULL : 0;
        if (on) fillStart = performance.now();
        s.mx = on ? (s.mx ?? .5) : null;
        wake();
      }, { threshold:[...Array.from({ length:101 }, (_, i) => i / 100), .995] }).observe(screen);   // Prüfpunkte in 1-%-Schritten + 99,5 %
      card.addEventListener('pointermove', e => { if (e.pointerType === 'touch') { stir(s, e); wake(); } });
      card.addEventListener('pointerup', () => { s.px = null; });
      size();
      return;
    }
    card.addEventListener('pointerenter', e => { s.target = FULL; stir(s, e); wake(); });
    card.addEventListener('pointerleave', e => { stir(s, e); s.target = 0; s.px = s.mx = null; wake(); });
    card.addEventListener('pointermove', e => { stir(s, e); wake(); });
    card.addEventListener('focusin', () => { s.target = FULL; wake(); });
    card.addEventListener('focusout', () => setTimeout(() => { if (!card.matches(':hover, :focus-within')) { s.target = 0; wake(); } }));
    size();
  });

  // ganz gefüllt und in Ruhe: keine Wellen, bis sich der Pegel wieder bewegt
  const atRest = s => s.target === FULL && Math.abs(FULL - s.level) < .003 && Math.abs(s.lv) < .01;
  const smooth = k => (k = Math.min(1, Math.max(0, k)), k * k * (3 - 2 * k));
  function stir(s, e){
    const r = s.card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    s.mx = x / s.w;
    if (s.px !== null && !atRest(s)) {
      const dx = x - s.px, dy = y - s.py, i = x / s.w * (N - 1);
      const near = Math.exp(-(((y - (1 - s.level) * s.h) / 160) ** 2));   // nur nahe der Oberfläche
      for (let j = 0; j < N; j++) {
        const d = (j - i) / 8, g = Math.exp(-d * d);   // breit verteilt: keine spitzen Stellen am Cursor
        s.v[j] += (dx * PUSH * d + dy * PRESS * near) * g;
      }
    }
    s.px = x; s.py = y;
  }
  function step(s, dt){
    const { y, v } = s;
    s.lv += (OMEGA * OMEGA * (s.target - s.level) - 2 * OMEGA * s.lv) * dt;   // Feder: Beschleunigung aus Abstand und Tempo
    s.level += s.lv * dt;
    s.t += dt;
    if (touch && s.mx !== null)               // kein Cursor: Wölbung gleitet ohne Pause auf überlagerten, langsamen Bahnen
      s.mx = .5 + .3 * Math.sin(s.t * .37 + s.ph) + .12 * Math.sin(s.t * .91 + s.ph * 2.3);
    if (s.mx === null) s.ms = null;           // geglättete Position: die Wölbung folgt träge, ohne Ruck
    else {
      const sway = .035 * Math.sin(s.t * .6 + s.ph);   // auch bei ruhender Maus: sanftes Pendeln
      s.ms = s.ms === null ? s.mx : s.ms + (s.mx + sway - s.ms) * (1 - Math.exp(-dt / LAG));
    }
    const lift = BULGE * (1 + .18 * Math.sin(s.t * .8 + s.ph));   // Höhe schwillt leicht an und ab
    for (let i = 0; i < N; i++) {
      const l = y[i > 0 ? i - 1 : 0], r = y[i < N - 1 ? i + 1 : N - 1];
      let f = -TENSION * y[i] + SPREAD * (l + r - 2 * y[i]);
      if (s.ms !== null) { const d = (i / (N - 1) - s.ms) / REACH; f -= lift * Math.exp(-d * d); }   // breite Wölbung zum (geglätteten) Cursor
      v[i] = (v[i] + f * PACE) * DAMP ** PACE;   // verlangsamte Physik: gleiche Form, halbes Tempo
    }
    let e = Math.abs(s.target - s.level) + Math.abs(s.lv) + (s.mx !== null ? .01 : 0);   // solange der Pegel wandert, lebt die Oberfläche
    for (let i = 0; i < N; i++) { y[i] += v[i] * PACE; e += Math.abs(v[i]) + Math.abs(y[i]) * .01; }
    if (atRest(s)) { y.fill(0); v.fill(0); return false; }   // voll: Wellen aus, Schleife hält an
    return e > .002;
  }
  function draw(s){
    const { w, h, y } = s, base = (1 - s.level) * h;
    if (s.level < .001 && s.target === 0) { s.path.setAttribute('d', ''); return; }
    // unten beginnt die Oberfläche als gerade Linie; die Wellen wachsen auf den ersten 18 % schnell,
    // aber weich herein — und reichen nie unter die Unterkante
    // oben genauso: kurz vor ganz voll laufen die Wellen weich aus
    const env = smooth(s.level / .18) * smooth((FULL - s.level) / .15);
    const X = i => i / (N - 1) * w, Y = i => Math.min(h, base + y[i] * env);
    // Catmull-Rom-Spline durch alle Stützstellen: durchgehend glatt, keine Knicke
    const P = i => [X(Math.max(0, Math.min(N - 1, i))), Y(Math.max(0, Math.min(N - 1, i)))];
    let d = `M0 ${h}L0 ${Y(0).toFixed(1)}`;
    for (let i = 0; i < N - 1; i++) {
      const [x0, y0] = P(i - 1), [x1, y1] = P(i), [x2, y2] = P(i + 1), [x3, y3] = P(i + 2);
      d += `C${(x1 + (x2 - x0) / 6).toFixed(1)} ${(y1 + (y2 - y0) / 6).toFixed(1)} ${(x2 - (x3 - x1) / 6).toFixed(1)} ${(y2 - (y3 - y1) / 6).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
    }
    s.path.setAttribute('d', d + `L${w} ${h}Z`);
  }
  function loop(now){
    const dt = Math.min(.05, t0 ? (now - t0) / 1000 : 1 / 60); t0 = now;
    const n = Math.max(1, Math.round(dt * 60));   // Physik in festen 60-Hz-Schritten
    for (const s of live) { let busy = false; for (let k = 0; k < n; k++) busy = step(s, dt / n) || busy; draw(s); if (!busy) live.delete(s); }
    raf = live.size ? requestAnimationFrame(loop) : 0;
  }
}

/* ═══ 8 Cursor mit Spur aus 9 Kreisen — nur mit Maus ═══ */
if (matchMedia('(hover:hover) and (pointer:fine)').matches) {
  const N = 9, R = 11;                       // R = halbe Cursorgröße: Spur hängt an der Mitte
  const fx = document.createElement('div');
  fx.className = 'fx';
  fx.setAttribute('aria-hidden', 'true');
  const cur = document.createElement('div');
  cur.className = 'cursor';
  cur.innerHTML = '<svg viewBox="0 0 22 22" aria-hidden="true"><path d="M0 0H11A11 11 0 1 1 0 11Z"/></svg>';
  const moving = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dots = moving ? Array.from({ length:N }, (_, i) => {
    const d = document.createElement('div');
    d.className = 'trail';
    d.style.setProperty('--sz', (16.2 * .77 ** i).toFixed(1) + 'px');   // Durchmesser wie die Deckkraft: 16,2 px (18 × 0,9), jeder weitere × 0,77
    d.style.opacity = (.9 * .77 ** i).toFixed(3);   // erster Kreis 90 %, jeder weitere × 0,77
    fx.append(d);
    return { el:d, x:-99, y:-99 };
  }) : [];
  fx.append(cur);                             // zuletzt = oben
  const inv = document.createElement('div');  // Kopie in umgekehrten Farben, nur über der Navigation sichtbar
  inv.className = 'fx-inv';
  const cur2 = cur.cloneNode(true);
  inv.append(cur2);
  fx.append(inv);
  const navEl = document.querySelector('.nav');
  const clipNav = () => {                     // Ausschnitt = Fläche der Navigation, sobald sie sichtbar ist
    if (lastP < .6) { inv.style.clipPath = 'inset(100%)'; return; }
    const r = navEl.getBoundingClientRect();
    inv.style.clipPath = `inset(${r.top}px ${innerWidth - r.right}px ${innerHeight - r.bottom}px ${r.left}px)`;
  };
  onHeader.push(clipNav);                   // die Leiste bewegt sich nur mit dem Kopf
  clipNav();                                // Anfangszustand (Seite kann mitten im Scrollen geladen werden)
  addEventListener('resize', clipNav);
  document.body.append(fx);
  root.classList.add('has-cursor', 'is-away');


  let mx = -99, my = -99, running = false, last = 0;
  const c = { x:-99, y:-99 };                 // Cursorposition (= Maus)
  const FOLLOW = .03, SLOWER = .9;            // Spur: erster Kreis folgt mit 3 % pro Frame, jeder weitere 10 % träger
  const step = () => {                        // ein Schritt à 16,7 ms (60 fps)
    c.x = mx; c.y = my;                       // Cursor sitzt direkt auf der Maus — kein Nachfedern
    let px = c.x + R, py = c.y + R;           // jeder Kreis folgt seinem Vorgänger
    dots.forEach((d, i) => {
      const f = FOLLOW * SLOWER ** i;
      d.x += (px - d.x) * f; d.y += (py - d.y) * f;
      px = d.x; py = d.y;
    });
  };
  const loop = now => {
    const steps = Math.min(4, Math.max(1, Math.round((now - (last || now - 16.7)) / 16.7)));
    last = now;
    for (let i = 0; i < steps; i++) step();   // bildratenunabhängig
    const dpr = devicePixelRatio || 1, snap = v => Math.round(v * dpr) / dpr;   // auf Gerätepixel: bleibt scharf
    cur.style.transform = cur2.style.transform = `translate3d(${snap(c.x)}px,${snap(c.y)}px,0)`;
    let still = true;
    for (const d of dots) {
      const dist = Math.hypot(c.x + R - d.x, c.y + R - d.y);
      if (dist > .2) still = false;
      d.el.style.transform = `translate3d(${d.x}px,${d.y}px,0)`;   // in Ruhe verdeckt der Cursor die Spur
    }
    running = !still;
    if (running) requestAnimationFrame(loop); else last = 0;
  };
  addEventListener('pointermove', ev => {
    if (c.x === -99) { c.x = ev.clientX; c.y = ev.clientY; dots.forEach(d => { d.x = c.x + R; d.y = c.y + R; }); }
    mx = ev.clientX; my = ev.clientY;
    cur.style.transform = cur2.style.transform = `translate3d(${mx}px,${my}px,0)`;   // sofort, ohne auf den nächsten Frame zu warten
    const link = !!ev.target.closest('a');
    cur.classList.toggle('is-link', link); cur2.classList.toggle('is-link', link);
    root.classList.remove('is-away');
    if (!running) { running = true; requestAnimationFrame(loop); }
  }, { passive:true });
  document.addEventListener('pointerleave', () => root.classList.add('is-away'));
  addEventListener('blur', () => root.classList.add('is-away'));
}
