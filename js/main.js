import { SCREEN_W, SCREEN_H } from './constants.js';
import { AppleIIAudio } from './audio.js';
import { WolfGame } from './game.js';
import { AppleIIRenderer } from './renderer.js';

const canvas = document.getElementById('gameCanvas');
const crtScreen = document.getElementById('crtScreen');
const quickControlsText = document.getElementById('quickControlsText');

const monitorBtns = document.querySelectorAll('[data-monitor-btn]');
const scanlinesBtn = document.getElementById('scanlinesBtn');
const controlModeBtn = document.getElementById('controlModeBtn');
const sfxBtn = document.getElementById('sfxBtn');
const voiceBtn = document.getElementById('voiceBtn');
const mapBtn = document.getElementById('mapBtn');
const manualBtn = document.getElementById('manualBtn');
const optionsBtn = document.getElementById('optionsBtn');
const newGameBtn = document.getElementById('newGameBtn');

const manualDialog = document.getElementById('manualDialog');
const optionsDialog = document.getElementById('optionsDialog');
const hardcoreBtn = document.getElementById('hardcoreBtn');
const resetProgressBtn = document.getElementById('resetProgressBtn');
const rankSummary = document.getElementById('rankSummary');

const audio = new AppleIIAudio();
const game = new WolfGame(audio);
const renderer = new AppleIIRenderer(canvas);

// Sync UI chrome with loaded settings
function syncUI() {
  document.body.dataset.monitor = game.monitorMode;
  crtScreen.dataset.scanlines = game.scanlines ? 'on' : 'off';

  monitorBtns.forEach((btn) => {
    const active = btn.dataset.monitorBtn === game.monitorMode;
    btn.setAttribute('aria-pressed', String(active));
  });

  scanlinesBtn.setAttribute('aria-pressed', String(game.scanlines));
  sfxBtn.setAttribute('aria-pressed', String(audio.sfxEnabled));
  voiceBtn.setAttribute('aria-pressed', String(audio.voiceEnabled));

  controlModeBtn.textContent = game.controlMode === 'modern' ? 'Modern' : 'Classic IIe';

  if (game.controlMode === 'modern') {
    quickControlsText.innerHTML =
      '<strong>Modern:</strong> <kbd>WASD</kbd> Move &middot; <kbd>Mouse</kbd>/<kbd>Arrows</kbd> Aim &middot; ' +
      '<kbd>Click</kbd>/<kbd>Space</kbd> Shoot &middot; <kbd>E</kbd> Search/Frisk/Unlock &middot; ' +
      '<kbd>R</kbd> Holster (Disguise) &middot; <kbd>G</kbd>/<kbd>R-Click</kbd> Grenade &middot; <kbd>M</kbd> Map';
  } else {
    quickControlsText.innerHTML =
      '<strong>Classic Apple IIe:</strong> <kbd>QWEADZXC</kbd> 8-Way Move (<kbd>S</kbd> Stop) &middot; ' +
      '<kbd>IJKL</kbd>/<kbd>Arrows</kbd> Aim &middot; <kbd>Space</kbd> Shoot &middot; ' +
      '<kbd>U</kbd> Use/Search &middot; <kbd>H</kbd> Holster &middot; <kbd>T</kbd> Grenade &middot; <kbd>M</kbd> Map';
  }

  hardcoreBtn.textContent = game.hardcoreOneHit ? 'Classic 1-Hit (ON)' : 'Standard (3 HP)';
  hardcoreBtn.setAttribute('aria-pressed', String(game.hardcoreOneHit));
  rankSummary.textContent = `Rank: ${game.getRankName()} · High Score: ${game.highScore}`;
}

function isAnyDialogOpen() {
  return manualDialog.open || optionsDialog.open;
}

// Safari fallback for declarative <dialog closedby="any"> light-dismiss
if (!('closedBy' in HTMLDialogElement.prototype)) {
  const isOutside = (e, dlg) => {
    const r = dlg.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };
  for (const dlg of document.querySelectorAll('dialog[closedby="any"]')) {
    let pressedOutside = false;
    dlg.addEventListener('pointerdown', (e) => {
      pressedOutside = isOutside(e, dlg);
    });
    dlg.addEventListener('pointerup', (e) => {
      if (pressedOutside && isOutside(e, dlg)) {
        dlg.close();
      }
      pressedOutside = false;
    });
  }
}

// Pause game while dialogs are open and reset dialog.returnValue on close
for (const dlg of [manualDialog, optionsDialog]) {
  dlg.addEventListener('close', () => {
    dlg.returnValue = '';
    game.paused = isAnyDialogOpen();
    if (!game.paused) {
      game.keys.clear();
    }
  });
}

// Toolbar button listeners
monitorBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    game.monitorMode = btn.dataset.monitorBtn;
    game.saveProgress();
    syncUI();
    canvas.focus();
  });
});

scanlinesBtn.addEventListener('click', () => {
  game.scanlines = !game.scanlines;
  game.saveProgress();
  syncUI();
  canvas.focus();
});

controlModeBtn.addEventListener('click', () => {
  game.controlMode = game.controlMode === 'modern' ? 'classic' : 'modern';
  game.keys.clear();
  game.saveProgress();
  syncUI();
  if (game.state === 'playing') {
    game.setMessage(
      game.controlMode === 'modern' ? 'CONTROLS: MODERN (WASD + MOUSE)' : 'CONTROLS: CLASSIC APPLE IIE',
      2.4,
      2
    );
  }
  canvas.focus();
});

sfxBtn.addEventListener('click', () => {
  audio.unlock();
  audio.setSettings({ sfxEnabled: !audio.sfxEnabled });
  syncUI();
  canvas.focus();
});

voiceBtn.addEventListener('click', () => {
  audio.unlock();
  audio.setSettings({ voiceEnabled: !audio.voiceEnabled });
  if (audio.voiceEnabled) {
    audio.playVoice('HALT');
  }
  syncUI();
  canvas.focus();
});

mapBtn.addEventListener('click', () => {
  if (game.state === 'playing') {
    game.showMap = !game.showMap;
  }
  canvas.focus();
});

manualBtn.addEventListener('click', () => {
  game.paused = true;
  game.keys.clear();
  manualDialog.showModal();
});

optionsBtn.addEventListener('click', () => {
  game.paused = true;
  game.keys.clear();
  syncUI();
  optionsDialog.showModal();
});

newGameBtn.addEventListener('click', () => {
  game.startNewGame(false);
  canvas.focus();
});

hardcoreBtn.addEventListener('click', () => {
  game.hardcoreOneHit = !game.hardcoreOneHit;
  game.saveProgress();
  syncUI();
});

resetProgressBtn.addEventListener('click', () => {
  game.rankIdx = 0;
  game.highScore = 0;
  game.saveProgress();
  syncUI();
});

// Keyboard handling (prevent scrolling on arrows/space during play)
const GAME_KEYS = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

window.addEventListener('keydown', (e) => {
  if (isAnyDialogOpen()) return;
  if (GAME_KEYS.has(e.code)) {
    e.preventDefault();
  }
  if (!e.repeat) {
    game.onKeyDown(e.code);
  }
});

window.addEventListener('keyup', (e) => {
  game.onKeyUp(e.code);
});

window.addEventListener('blur', () => {
  game.keys.clear();
});

// Canvas pointer handling mapped precisely to 280x192 Apple IIe coordinate space
function canvasPointFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * SCREEN_W,
    y: ((e.clientY - rect.top) / rect.height) * SCREEN_H,
  };
}

canvas.addEventListener('mousemove', (e) => {
  const pt = canvasPointFromEvent(e);
  game.onCanvasMouseMove(pt.x, pt.y);
});

canvas.addEventListener('mousedown', (e) => {
  canvas.focus();
  const pt = canvasPointFromEvent(e);
  game.onCanvasMouseMove(pt.x, pt.y);
  game.onCanvasMouseDown(e.button);
});

canvas.addEventListener('mouseup', (e) => {
  game.onCanvasMouseUp(e.button);
});

canvas.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// Fixed-timestep simulation loop (60 Hz logic, smooth requestAnimationFrame render)
let lastTime = performance.now();
let accumulator = 0;
const STEP = 1 / 60;

function loop(now) {
  const frameDt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  accumulator += frameDt;
  while (accumulator >= STEP) {
    game.update(STEP);
    accumulator -= STEP;
  }

  renderer.render(game);
  requestAnimationFrame(loop);
}

syncUI();
requestAnimationFrame(loop);
