// Authentic Apple IIe 5x7 Bitmap Font (rendered on 7x8 grid = 40 columns on 280px wide screen)
// Each glyph is 7 rows of 5-bit patterns.
const FONT_5X7 = {
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '!': [4, 4, 4, 4, 4, 0, 4],
  '"': [10, 10, 0, 0, 0, 0, 0],
  '#': [10, 31, 10, 10, 31, 10, 0],
  '$': [4, 15, 20, 14, 5, 30, 4],
  '%': [24, 25, 2, 4, 8, 19, 3],
  '&': [12, 18, 20, 8, 21, 18, 13],
  "'": [4, 4, 0, 0, 0, 0, 0],
  '(': [2, 4, 8, 8, 8, 4, 2],
  ')': [8, 4, 2, 2, 2, 4, 8],
  '*': [0, 4, 21, 14, 21, 4, 0],
  '+': [0, 4, 4, 31, 4, 4, 0],
  ',': [0, 0, 0, 0, 0, 4, 8],
  '-': [0, 0, 0, 31, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0, 4],
  '/': [0, 1, 2, 4, 8, 16, 0],
  '0': [14, 17, 19, 21, 25, 17, 14],
  '1': [4, 12, 4, 4, 4, 4, 14],
  '2': [14, 17, 1, 2, 4, 8, 31],
  '3': [31, 2, 4, 2, 1, 17, 14],
  '4': [2, 6, 10, 18, 31, 2, 2],
  '5': [31, 16, 30, 1, 1, 17, 14],
  '6': [6, 8, 16, 30, 17, 17, 14],
  '7': [31, 1, 2, 4, 8, 8, 8],
  '8': [14, 17, 17, 14, 17, 17, 14],
  '9': [14, 17, 17, 15, 1, 2, 12],
  ':': [0, 0, 4, 0, 0, 4, 0],
  ';': [0, 0, 4, 0, 0, 4, 8],
  '<': [2, 4, 8, 16, 8, 4, 2],
  '=': [0, 0, 31, 0, 31, 0, 0],
  '>': [8, 4, 2, 1, 2, 4, 8],
  '?': [14, 17, 1, 2, 4, 0, 4],
  '@': [14, 17, 23, 21, 23, 16, 14],
  'A': [14, 17, 17, 31, 17, 17, 17],
  'B': [30, 17, 17, 30, 17, 17, 30],
  'C': [14, 17, 16, 16, 16, 17, 14],
  'D': [28, 18, 17, 17, 17, 18, 28],
  'E': [31, 16, 16, 30, 16, 16, 31],
  'F': [31, 16, 16, 30, 16, 16, 16],
  'G': [14, 17, 16, 23, 17, 17, 15],
  'H': [17, 17, 17, 31, 17, 17, 17],
  'I': [14, 4, 4, 4, 4, 4, 14],
  'J': [7, 2, 2, 2, 2, 18, 12],
  'K': [17, 18, 20, 24, 20, 18, 17],
  'L': [16, 16, 16, 16, 16, 16, 31],
  'M': [17, 27, 21, 21, 17, 17, 17],
  'N': [17, 25, 21, 19, 17, 17, 17],
  'O': [14, 17, 17, 17, 17, 17, 14],
  'P': [30, 17, 17, 30, 16, 16, 16],
  'Q': [14, 17, 17, 17, 21, 18, 13],
  'R': [30, 17, 17, 30, 20, 18, 17],
  'S': [15, 16, 16, 14, 1, 1, 30],
  'T': [31, 4, 4, 4, 4, 4, 4],
  'U': [17, 17, 17, 17, 17, 17, 14],
  'V': [17, 17, 17, 17, 17, 10, 4],
  'W': [17, 17, 17, 21, 21, 27, 17],
  'X': [17, 17, 10, 4, 10, 17, 17],
  'Y': [17, 17, 10, 4, 4, 4, 4],
  'Z': [31, 1, 2, 4, 8, 16, 31],
  '[': [14, 8, 8, 8, 8, 8, 14],
  '\\': [0, 16, 8, 4, 2, 1, 0],
  ']': [14, 2, 2, 2, 2, 2, 14],
  '^': [4, 10, 17, 0, 0, 0, 0],
  '_': [0, 0, 0, 0, 0, 0, 31],
  '|': [4, 4, 4, 4, 4, 4, 4],
  '~': [0, 8, 21, 2, 0, 0, 0],
};

/**
 * Draw crisp Apple IIe bitmap text directly onto the 280x192 canvas.
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {string} color
 * @param {number} [scale=1]
 * @param {number} [spacing=7] - 7px per char = 40 columns across 280px
 */
export function drawText(ctx, text, x, y, color, scale = 1, spacing = 7) {
  ctx.fillStyle = color;
  const upper = String(text).toUpperCase();
  let cx = Math.floor(x);
  const cy = Math.floor(y);
  for (let i = 0; i < upper.length; i++) {
    const glyph = FONT_5X7[upper[i]] || FONT_5X7[' '];
    for (let row = 0; row < 7; row++) {
      const bits = glyph[row];
      if (!bits) continue;
      for (let col = 0; col < 5; col++) {
        if (bits & (16 >> col)) {
          ctx.fillRect(cx + col * scale, cy + row * scale, scale, scale);
        }
      }
    }
    cx += spacing * scale;
  }
}

export function drawTextCentered(ctx, text, centerX, y, color, scale = 1, spacing = 7) {
  const width = text.length * spacing * scale - (spacing - 5) * scale;
  drawText(ctx, text, Math.floor(centerX - width / 2), y, color, scale, spacing);
}

/**
 * Draw a 10x10 Apple IIe castle masonry brick tile.
 */
export function drawWallTile(ctx, x, y, pal, isOuter = false) {
  ctx.fillStyle = pal.wallDark;
  ctx.fillRect(x, y, 10, 10);

  // Brick pattern (2 rows of offset bricks)
  ctx.fillStyle = pal.wall;
  // Top brick row
  ctx.fillRect(x + 1, y + 1, 4, 3);
  ctx.fillRect(x + 6, y + 1, 3, 3);
  // Bottom brick row (offset)
  ctx.fillRect(x + 1, y + 5, 2, 4);
  ctx.fillRect(x + 4, y + 5, 5, 4);

  if (isOuter) {
    ctx.fillStyle = pal.wallHi;
    ctx.fillRect(x + 1, y + 1, 4, 1);
    ctx.fillRect(x + 6, y + 1, 3, 1);
  }
}

/**
 * Draw a supply chest (10x8 pixels centered in tile).
 */
export function drawChest(ctx, x, y, chest, pal) {
  const bx = Math.floor(x - 5);
  const by = Math.floor(y - 4);
  if (chest.opened) {
    ctx.fillStyle = pal.chestOpen;
    ctx.fillRect(bx, by + 2, 10, 6);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(bx + 1, by + 3, 8, 3);
    // Open lid propped at back
    ctx.fillStyle = pal.chest;
    ctx.fillRect(bx, by, 10, 2);
  } else {
    ctx.fillStyle = pal.chest;
    ctx.fillRect(bx, by, 10, 8);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(bx + 1, by + 1, 8, 2);
    ctx.fillRect(bx + 1, by + 4, 8, 3);
    // Metal lock clasp
    ctx.fillStyle = pal.wallHi;
    ctx.fillRect(bx + 4, by + 2, 2, 3);
    // Corner studs
    ctx.fillRect(bx, by, 1, 1);
    ctx.fillRect(bx + 9, by, 1, 1);
    ctx.fillRect(bx, by + 7, 1, 1);
    ctx.fillRect(bx + 9, by + 7, 1, 1);
  }
}

/**
 * Draw a doorway (locked, unlocked, or blasted).
 */
export function drawDoorTile(ctx, x, y, orientation, locked, pal) {
  // orientation: 'H' (north/south wall doorway) or 'V' (east/west wall doorway)
  if (locked) {
    ctx.fillStyle = pal.doorLocked;
    if (orientation === 'H') {
      ctx.fillRect(x, y + 3, 10, 4);
      ctx.fillStyle = pal.bg;
      ctx.fillRect(x + 2, y + 4, 6, 2);
      // Padlock center
      ctx.fillStyle = pal.wallHi;
      ctx.fillRect(x + 4, y + 3, 2, 4);
    } else {
      ctx.fillRect(x + 3, y, 4, 10);
      ctx.fillStyle = pal.bg;
      ctx.fillRect(x + 4, y + 2, 2, 6);
      ctx.fillStyle = pal.wallHi;
      ctx.fillRect(x + 3, y + 4, 4, 2);
    }
  } else {
    // Unlocked open passage with clean threshold markers along the frame edges
    ctx.fillStyle = pal.door;
    if (orientation === 'H') {
      ctx.fillRect(x, y, 10, 1);
      ctx.fillRect(x, y + 9, 10, 1);
    } else {
      ctx.fillRect(x, y, 1, 10);
      ctx.fillRect(x + 9, y, 1, 10);
    }
  }
}

/**
 * Draw stairs tile (up or down).
 */
export function drawStairs(ctx, x, y, isUp, pal) {
  ctx.fillStyle = pal.wallDark;
  ctx.fillRect(x, y, 10, 10);
  ctx.fillStyle = pal.stairs;
  // Classic Apple II staircase steps
  for (let i = 0; i < 4; i++) {
    const sy = y + 1 + i * 2;
    const sw = isUp ? 9 - i * 2 : 3 + i * 2;
    const sx = isUp ? x + 1 + i * 2 : x + 1;
    ctx.fillRect(sx, sy, Math.max(2, sw), 1);
  }
  // Frame
  ctx.fillStyle = pal.wallHi;
  ctx.fillRect(x, y, 10, 1);
  ctx.fillRect(x, y + 9, 10, 1);
}

/**
 * Draw Castle Exit Gate (iron portcullis).
 */
export function drawExitGate(ctx, x, y, unlocked, pal) {
  ctx.fillStyle = unlocked ? pal.exit : pal.doorLocked;
  // Portcullis bars
  for (let bx = 1; bx < 10; bx += 2) {
    ctx.fillRect(x + bx, y + 1, 1, 8);
  }
  ctx.fillRect(x, y + 1, 10, 1);
  ctx.fillRect(x, y + 8, 10, 1);
  if (unlocked) {
    ctx.fillStyle = pal.wallHi;
    ctx.fillRect(x + 4, y + 3, 2, 4);
  }
}

/**
 * Draw the Player sprite (authentic Apple IIe top-down silhouette with moving legs & directional pistol).
 */
export function drawPlayer(ctx, p, pal) {
  const cx = Math.round(p.x);
  const cy = Math.round(p.y);
  const bodyColor = p.hasUniform ? pal.playerUniform : pal.player;
  const step = Math.floor(p.walkPhase) % 2;

  // Feet / stride
  ctx.fillStyle = bodyColor;
  if (p.moving) {
    if (step === 0) {
      ctx.fillRect(cx - 3, cy + 3, 2, 2);
      ctx.fillRect(cx + 1, cy + 2, 2, 2);
    } else {
      ctx.fillRect(cx - 3, cy + 2, 2, 2);
      ctx.fillRect(cx + 1, cy + 3, 2, 2);
    }
  } else {
    ctx.fillRect(cx - 3, cy + 3, 2, 2);
    ctx.fillRect(cx + 1, cy + 3, 2, 2);
  }

  // Torso
  ctx.fillStyle = bodyColor;
  ctx.fillRect(cx - 3, cy - 2, 6, 5);

  // Bulletproof vest chestplate accent
  if (p.vestHp > 0) {
    ctx.fillStyle = pal.wallHi;
    ctx.fillRect(cx - 2, cy - 1, 4, 3);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(cx - 1, cy, 2, 1);
  } else if (p.hasUniform) {
    // Uniform belt & collar
    ctx.fillStyle = pal.bg;
    ctx.fillRect(cx - 3, cy + 1, 6, 1);
    ctx.fillStyle = pal.wallHi;
    ctx.fillRect(cx - 1, cy + 1, 2, 1);
  }

  // Head (helmet if disguised, bare head if prisoner)
  ctx.fillStyle = p.hasUniform ? pal.playerUniform : pal.wallHi;
  ctx.fillRect(cx - 2, cy - 5, 4, 3);
  if (p.hasUniform) {
    ctx.fillStyle = pal.wallHi;
    ctx.fillRect(cx - 2, cy - 5, 4, 1); // Helmet rim
  }

  // Aimed Pistol (only drawn when not holstered)
  if (!p.holstered) {
    const gx = Math.round(Math.cos(p.aimAngle) * 6);
    const gy = Math.round(Math.sin(p.aimAngle) * 6);
    const hx = Math.round(Math.cos(p.aimAngle) * 3);
    const hy = Math.round(Math.sin(p.aimAngle) * 3);
    ctx.fillStyle = pal.wallHi;
    ctx.fillRect(cx + hx - 1, cy + hy - 1, 2, 2);
    ctx.fillRect(cx + gx - 1, cy + gy - 1, 2, 2);
  }
}

/**
 * Draw a Guard or SS Stormtrooper sprite.
 */
export function drawGuard(ctx, g, pal) {
  const cx = Math.round(g.x);
  const cy = Math.round(g.y);

  if (g.state === 'dead') {
    // Fallen guard outline (classic Apple IIe X / prone figure)
    ctx.fillStyle = pal.blood;
    ctx.fillRect(cx - 4, cy - 1, 8, 3);
    ctx.fillStyle = g.isSS ? pal.ss : pal.guard;
    ctx.fillRect(cx - 4, cy - 2, 7, 3);
    ctx.fillStyle = pal.bg;
    ctx.fillRect(cx - 2, cy - 1, 3, 1);
    // Searchable indicator pixel if still carrying loot
    if (!g.searched && g.loot) {
      ctx.fillStyle = pal.wallHi;
      ctx.fillRect(cx + 3, cy - 3, 2, 2);
    }
    return;
  }

  const mainCol = g.isSS ? pal.ss : pal.guard;
  const trimCol = g.isSS ? pal.ssAccent : pal.guardAccent;
  const step = Math.floor(g.walkPhase) % 2;

  // Boots
  ctx.fillStyle = mainCol;
  if (g.moving) {
    ctx.fillRect(cx - 3, cy + (step ? 2 : 3), 2, 2);
    ctx.fillRect(cx + 1, cy + (step ? 3 : 2), 2, 2);
  } else {
    ctx.fillRect(cx - 3, cy + 3, 2, 2);
    ctx.fillRect(cx + 1, cy + 3, 2, 2);
  }

  // Torso
  ctx.fillStyle = mainCol;
  ctx.fillRect(cx - 3, cy - 2, 6, 5);
  // SS armor / belt trim
  ctx.fillStyle = trimCol;
  if (g.isSS) {
    ctx.fillRect(cx - 3, cy - 2, 6, 1);
    ctx.fillRect(cx - 1, cy - 1, 2, 3);
  } else {
    ctx.fillRect(cx - 3, cy + 1, 6, 1);
  }

  // Helmet
  ctx.fillStyle = mainCol;
  ctx.fillRect(cx - 2, cy - 5, 4, 3);
  ctx.fillStyle = trimCol;
  ctx.fillRect(cx - 3, cy - 4, 6, 1); // Stahlhelm brim

  if (g.state === 'surrender') {
    // Classic hands-up surrender pose!
    ctx.fillStyle = pal.wallHi;
    ctx.fillRect(cx - 5, cy - 5, 2, 4);
    ctx.fillRect(cx + 3, cy - 5, 2, 4);
  } else {
    // Weapon pointed in facing direction
    const gx = Math.round(Math.cos(g.angle) * 6);
    const gy = Math.round(Math.sin(g.angle) * 6);
    const hx = Math.round(Math.cos(g.angle) * 3);
    const hy = Math.round(Math.sin(g.angle) * 3);
    ctx.fillStyle = trimCol;
    ctx.fillRect(cx + hx, cy + hy, 2, 2);
    ctx.fillRect(cx + gx, cy + gy, 2, 2);
  }
}

/**
 * Draw the Castle Wolfenstein Title Screen turret graphic (authentic Apple IIe style).
 */
export function drawTitleCastle(ctx, pal) {
  const cx = 140;
  const baseY = 66;

  // Main castle keep wall
  ctx.fillStyle = pal.wallDark;
  ctx.fillRect(cx - 54, baseY - 26, 108, 30);

  // Brick lines
  ctx.fillStyle = pal.wall;
  for (let row = 0; row < 5; row++) {
    const ry = baseY - 24 + row * 6;
    const offset = (row % 2) * 5;
    for (let rx = cx - 52 + offset; rx < cx + 50; rx += 10) {
      ctx.fillRect(rx, ry, 8, 4);
    }
  }

  // Left & Right Towers
  ctx.fillStyle = pal.wall;
  ctx.fillRect(cx - 66, baseY - 38, 16, 42);
  ctx.fillRect(cx + 50, baseY - 38, 16, 42);

  // Battlements / Crenellations
  ctx.fillStyle = pal.wallHi;
  for (let bx = cx - 66; bx <= cx + 62; bx += 6) {
    if (bx < cx - 50 || bx >= cx + 50) {
      ctx.fillRect(bx, baseY - 42, 4, 4);
    } else {
      ctx.fillRect(bx, baseY - 30, 4, 4);
    }
  }

  // Central Arched Iron Gate
  ctx.fillStyle = pal.bg;
  ctx.fillRect(cx - 12, baseY - 16, 24, 20);
  ctx.fillRect(cx - 10, baseY - 19, 20, 4);
  ctx.fillRect(cx - 7, baseY - 21, 14, 3);

  // Portcullis bars
  ctx.fillStyle = pal.door;
  for (let bx = cx - 8; bx <= cx + 8; bx += 4) {
    ctx.fillRect(bx, baseY - 18, 1, 22);
  }
  ctx.fillRect(cx - 10, baseY - 10, 20, 1);
  ctx.fillRect(cx - 10, baseY - 4, 20, 1);

  // Tower slit windows
  ctx.fillStyle = pal.guard;
  ctx.fillRect(cx - 60, baseY - 28, 3, 7);
  ctx.fillRect(cx + 57, baseY - 28, 3, 7);

  // Banner flags
  ctx.fillStyle = pal.ss;
  ctx.fillRect(cx - 58, baseY - 50, 1, 8);
  ctx.fillRect(cx - 57, baseY - 50, 7, 4);
  ctx.fillRect(cx + 57, baseY - 50, 1, 8);
  ctx.fillRect(cx + 58, baseY - 50, 7, 4);
}
