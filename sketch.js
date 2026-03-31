/* ═══════════════════════════════════════════════════════════
   sketch.js  ·  El Oráculo de la Olla
   ───────────────────────────────────────────────────────────
   FOLDER STRUCTURE (actual):
     assets/
       secuencia_web/
         1_loop/
           secuencia_animacion0000.png   ← idle frames 0–3
           secuencia_animacion0001.png
           secuencia_animacion0002.png
           secuencia_animacion0003.png
         2_loopplay/
           secuencia_animacion0004.png   ← stir frames 4–39
           secuencia_animacion0005.png
           …
           secuencia_animacion0039.png
       verduras_texturas/
         choclo.png
         tomate.png
         zanahoria.png
         pimenton.png
         limon.png

   ANIMATION LOGIC:
     IDLE  → loops frames 0000–0003
     STIR  → plays frames 0004–0039 ONCE, then popup opens
     After modal closes → back to IDLE
   ═══════════════════════════════════════════════════════════ */

// ── Ingredients data ──────────────────────────────────────
const INGREDIENTS = [
  { file: 'choclo.png',    name: 'Choclo'    },
  { file: 'tomate.png',    name: 'Tomate'    },
  { file: 'zanahoria.png', name: 'Zanahoria' },
  { file: 'pimenton.png',  name: 'Pimentón'  },
  { file: 'limon.png',     name: 'Limón'     },
];

// ── Oracle Message Logic (Intro + Verb + Recipe) ──────────────────────
const INTRO_PHRASES = [
  "Usa estos ingredientes de manera sabia.",
  "Tu vientre necesita algo más que aire.",
  "Tu guata pide algo real hoy.",
  "Ten un poco de decencia.",
  "Hazte un cariño profundo.",
  "Escucha a tu cuerpo.",
  "Detén la máquina un rato."
];

const COOKING_VERBS = [
  "Fríe estos ingredientes",
  "Cuece estos ingredientes",
  "Saltea estos ingredientes",
  "Asa estos ingredientes",
  "Hornea estos ingredientes",
  "Sofríe estos ingredientes",
  "Hierve estos ingredientes"
];

const RECIPE_TEXTS = [
  "a fuego lento, recordando que el tiempo es el mejor condimento.",
  "con una pizca de sal, pimienta y ese toque de amor de mamá.",
  "en la olla más viejita que tengas, dejando que los aromas te abracen el alma.",
  "hasta que suelte el hervor, ideal para espantar cualquier pena que ande rondando.",
  "con mucha paciencia y un buen chorrito de aceite, sin apuros ni culpas.",
  "mezclando todo con cuchara de palo para no perder la magia de la tierra."
];

// ── Frame config ──────────────────────────────────────────
const IDLE_START  = 0;
const IDLE_END    = 3;   // inclusive
const STIR_START  = 4;
const STIR_END    = 39;  // inclusive — popup fires after this frame
const TOTAL_FRAMES = 40; // 0000–0039

const FPS_IDLE = 4;   // canvas fps equivalent: swap frame every N draw() calls
const FPS_STIR = 5;  // slightly faster during stir

// ── State ─────────────────────────────────────────────────
let frames      = [];   // p5.Image array, index = frame number
let ingImgs     = {};   // { 'choclo.png': p5.Image, … }
let framesReady = false;
let ingsReady   = false;

let state       = 'loading'; // 'loading' | 'idle' | 'stirring' | 'done'
let curFrame    = IDLE_START;
let ticker      = 0;         // counts draw() calls between frame advances

let hydraReady  = false;

// Canvas sizing
let CW, CH;

// ── p5 preload ────────────────────────────────────────────
function preload() {
  let framesDone = 0;
  let ingsDone   = 0;

  // Load all 40 frames
  // Frames 0–3  → assets/secuencia_web/1_loop/
  // Frames 4–39 → assets/secuencia_web/2_loopplay/
  for (let i = 0; i < TOTAL_FRAMES; i++) {
    const num    = String(i).padStart(4, '0');
    const folder = i <= IDLE_END ? '1_loop' : '2_loopplay';
    const path   = `assets/secuencia_web/${folder}/secuencia_animacion${num}.png`;
    loadImage(
      path,
      img => { frames[i] = img; framesDone++; checkReady(); },
      ()  => {                  framesDone++; checkReady(); }
    );
  }

  // Load ingredient images
  for (const ing of INGREDIENTS) {
    const path = `assets/verduras_texturas/${ing.file}`;
    loadImage(
      path,
      img => { ingImgs[ing.file] = img; ingsDone++; checkIngsReady(); },
      ()  => {                          ingsDone++; checkIngsReady(); }
    );
  }

  function checkReady()    { if (framesDone   === TOTAL_FRAMES)     framesReady = true; }
  function checkIngsReady(){ if (ingsDone      === INGREDIENTS.length) ingsReady = true; }
}

// ── p5 setup ──────────────────────────────────────────────
function setup() {
  const host = select('#canvas-host');
  const rect  = host.elt.getBoundingClientRect();
  CW = rect.width  || windowWidth;
  CH = rect.height || floor(windowHeight * 0.58);

  const cnv = createCanvas(CW, CH);
  cnv.parent('canvas-host');
  cnv.mousePressed(onCanvasClick);

  frameRate(60);
  initHydra();
}

// ── p5 draw ───────────────────────────────────────────────
function draw() {
  clear();

  // Wait for assets
  if (!framesReady) {
    drawLoadingState();
    return;
  }

  // Transition from loading → idle on first ready frame
  if (state === 'loading') {
    state    = 'idle';
    curFrame = IDLE_START;
    ticker   = 0;
  }

  // Tick the frame counter
  const speed = (state === 'stirring') ? FPS_STIR : FPS_IDLE;
  ticker++;
  if (ticker >= speed) {
    ticker = 0;
    advanceFrame();
  }

  // Draw current frame
  drawFrame(curFrame);

  // Hover ring (idle only)
  if (state === 'idle') drawHoverHint();
}

// ── Advance frame ─────────────────────────────────────────
function advanceFrame() {
  if (state === 'idle') {
    curFrame++;
    if (curFrame > IDLE_END) curFrame = IDLE_START;

  } else if (state === 'stirring') {
    curFrame++;
    if (curFrame > STIR_END) {
      // Animation complete → show popup
      curFrame = STIR_END; // hold last frame
      state    = 'done';
      openModal();
    }
  }
}

// ── Draw a single PNG frame ───────────────────────────────
function drawFrame(idx) {
  const img = frames[idx];
  if (!img) return;

  // Scale to fill canvas preserving aspect ratio
  const sc = min(CW / img.width, CH / img.height);
  const dw = img.width  * sc;
  const dh = img.height * sc;
  const dx = (CW - dw) / 2;
  const dy = (CH - dh) / 2;

  // multiply blend → black ink sits on paper background
  drawingContext.globalCompositeOperation = 'multiply';
  image(img, dx, dy, dw, dh);
  drawingContext.globalCompositeOperation = 'source-over';
}

// ── Hover hint ────────────────────────────────────────────
let isHover = false;

function mouseMoved() {
  isHover = isOverPot();
}

function isOverPot() {
  // Approximate clickable area: centred circle
  const cx = CW / 2;
  const cy = CH * 0.52;
  const r  = min(CW, CH) * 0.32;
  return dist(mouseX, mouseY, cx, cy) < r;
}

function drawHoverHint() {
  if (!isHover) return;
  noFill();
  stroke(163, 108, 94, 55);
  strokeWeight(10);
  const cx = CW / 2;
  const cy = CH * 0.52;
  const r  = min(CW, CH) * 0.33;
  ellipse(cx, cy, r * 2, r * 2);
  noStroke();
}

// ── Loading state ─────────────────────────────────────────
function drawLoadingState() {
  const loaded = frames.filter(Boolean).length;
  const pct    = loaded / TOTAL_FRAMES;

  fill(26, 18, 8, 180);
  noStroke();
  textFont('Georgia');
  textAlign(CENTER, CENTER);
  textSize(13);
  textStyle(ITALIC);
  fill(107, 76, 42);
  text(`Encendiendo el fuego… ${floor(pct * 100)}%`, CW / 2, CH / 2);
}

// ── Click handler ─────────────────────────────────────────
function onCanvasClick() {
  if (state !== 'idle') return;
  triggerStir();
}

// Button in HTML also calls this
window.triggerStir = function() {
  if (state !== 'idle') return;
  state    = 'stirring';
  curFrame = STIR_START;
  ticker   = 0;

  // Pulse Hydra
  if (hydraReady) pulseHydra();

  // Disable button
  const btn = document.getElementById('consult-btn');
  if (btn) btn.disabled = true;
};

// Wire HTML button
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('consult-btn');
  if (btn) btn.addEventListener('click', () => window.triggerStir());
});

// ── Resize ────────────────────────────────────────────────
function windowResized() {
  const host = select('#canvas-host');
  const rect  = host.elt.getBoundingClientRect();
  CW = rect.width  || windowWidth;
  CH = rect.height || floor(windowHeight * 0.58);
  resizeCanvas(CW, CH);
}

// ═══════════════════════════════════════════════════════════
//  HYDRA VIDEO SYNTH
//  hydra-synth is loaded as a global via <script> tag.
//  We point it at #hydra-canvas (already in the DOM).
// ═══════════════════════════════════════════════════════════
let hydra;

function initHydra() {
  try {
    const canvas = document.getElementById('hydra-canvas');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    hydra = new Hydra({
      canvas,
      autoLoop: true,
      detectAudio: false,
    });

    // Default idle visual:
    // slow organic flow — warm earth tones on paper
    osc(6, 0.04, 0.3)
      .color(0.55, 0.38, 0.18)
      .rotate(0.4, 0.01)
      .modulate(noise(2, 0.008), 0.3)
      .layer(
        solid(0.9, 0.87, 0.78, 1)
          .mask(shape(4, 0.9, 0.01))
      )
      .blend(solid(0.9, 0.87, 0.78), 0.88)
.kaleid(100)
  .rotate(Math.PI/2)
.scale(1,9/16)
.add(solid(0.545,0.102,0.102))
      .out();

    hydraReady = true;
  } catch (e) {
    console.warn('Hydra could not initialise:', e);
    hydraReady = false;
  }
}

function pulseHydra() {
  // Triggered on stir: shift to more active / warmer visual
  try {
noise(3, 0.018)
      .color(0.72, 0.22, 0.08)
      .rotate(0.2, 0.04)
      .modulate(osc(12, 0.05, 0.4), 0.18)
      .blend(solid(0.9, 0.87, 0.78), 0.6)
.kaleid(100)
  .rotate(Math.PI/2)
.scale(1,9/16)
.add(solid(0.545,0.102,0.102))
      .out();

    // Reveal canvas more during stir (Stays active until modal closes)
    document.getElementById('hydra-canvas').classList.add('active');

  } catch (e) {
    console.warn('Hydra pulse error:', e);
  }
}

function resetHydra() {
  // Triggered when modal closes to return to idle background
  if (!hydraReady) return;
  try {
  osc(6, 0.04, 0.3)
      .color(0.55, 0.38, 0.18)
      .rotate(0.4, 0.01)
      .modulate(noise(2, 0.008), 0.3)
      .blend(solid(0.9, 0.87, 0.78), 0.88)
.kaleid(100)
  .rotate(Math.PI/2)
.scale(1,9/16)
.add(solid(0.545,0.102,0.102))
      .out();
      
    document.getElementById('hydra-canvas').classList.remove('active');
  } catch (e) {
    console.warn('Hydra reset error:', e);
  }
}

// ═══════════════════════════════════════════════════════════
//  ORACLE MODAL
// ═══════════════════════════════════════════════════════════

function pickThree() {
  const pool = [...INGREDIENTS];
  const out  = [];
  while (out.length < 3) {
    const i = floor(random(pool.length));
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

function buildIngredientCards(chosen) {
  return chosen.map(ing => {
    const img = ingImgs[ing.file];
    const src = img ? img.canvas.toDataURL() : '';
    return `
      <div class="ing-card">
        <div class="ing-img-wrap">
          ${src
            ? `<img src="${src}" alt="${ing.name}" />`
            : `<span style="font-size:2rem">🌿</span>`
          }
        </div>
        <span class="ing-label">${ing.name}</span>
      </div>`;
  }).join('');
}

function openModal() {
  const chosen  = pickThree();
  
  // --- NEW LOGIC ---
  const intro  = random(INTRO_PHRASES);
  const verb   = random(COOKING_VERBS);
  const recipe = random(RECIPE_TEXTS);
  const message = `${intro}\n${verb} ${recipe}`;

  document.getElementById('ingredients-row').innerHTML = buildIngredientCards(chosen);
  document.getElementById('oracle-msg').innerHTML = message.replace(/\n/g, '<br><br>');

  const modal = document.getElementById('modal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal() {
  const modal = document.getElementById('modal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');

  // Reset to idle
  state    = 'idle';
  curFrame = IDLE_START;
  ticker   = 0;

  const btn = document.getElementById('consult-btn');
  if (btn) btn.disabled = false;
  
  // Reset the Hydra visuals to calm!
  resetHydra();
}

function tryAgain() {
  const row = document.getElementById('ingredients-row');
  const msg = document.getElementById('oracle-msg');

  // Quick fade-swap
  row.style.transition = msg.style.transition = 'opacity 0.25s ease';
  row.style.opacity    = msg.style.opacity    = '0';

  setTimeout(() => {
    const chosen  = pickThree();
    
    // --- NEW LOGIC ---
    const intro  = random(INTRO_PHRASES);
    const verb   = random(COOKING_VERBS);
    const recipe = random(RECIPE_TEXTS);
    const message = `${intro}\n${verb} ${recipe}`;
    
    row.innerHTML  = buildIngredientCards(chosen);
    msg.innerHTML  = message.replace(/\n/g, '<br><br>');
    row.style.opacity = msg.style.opacity = '1';
  }, 260);

  if (hydraReady) pulseHydra();
}

// ── Wire modal buttons ────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('close-btn')
    .addEventListener('click', closeModal);

  document.getElementById('try-again-btn')
    .addEventListener('click', tryAgain);

  document.getElementById('modal')
    .addEventListener('click', e => {
      if (e.target === e.currentTarget) closeModal();
    });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
});