import {
  SCREEN_W,
  SCREEN_H,
  PLAY_H,
  HUD_Y,
  HUD_H,
  TILE,
  ROOM_COLS,
  ROOM_ROWS,
  T_WALL,
  T_DOOR_N,
  T_DOOR_S,
  T_DOOR_W,
  T_DOOR_E,
  T_STAIRS_UP,
  T_STAIRS_DOWN,
  T_EXIT,
  PALETTES,
} from './constants.js';
import {
  drawText,
  drawTextCentered,
  drawWallTile,
  drawChest,
  drawDoorTile,
  drawStairs,
  drawExitGate,
  drawPlayer,
  drawGuard,
  drawTitleCastle,
} from './sprites.js';

export class AppleIIRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.width = SCREEN_W;
    this.canvas.height = SCREEN_H;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.ctx.imageSmoothingEnabled = false;
  }

  render(game) {
    const pal = PALETTES[game.monitorMode] || PALETTES.color;
    const ctx = this.ctx;

    ctx.fillStyle = pal.bg;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    if (game.state === 'title') {
      this._renderTitle(ctx, game, pal);
      return;
    }

    this._renderPlayfield(ctx, game, pal);
    this._renderHud(ctx, game, pal);

    if (game.showMap && game.state === 'playing') {
      this._renderMapOverlay(ctx, game, pal);
    }

    if (game.state === 'gameover') {
      this._renderEndOverlay(ctx, game, pal, false);
    } else if (game.state === 'victory') {
      this._renderEndOverlay(ctx, game, pal, true);
    }
  }

  _renderTitle(ctx, game, pal) {
    // Classic Apple IIe decorative border
    ctx.strokeStyle = pal.wall;
    ctx.lineWidth = 1;
    ctx.strokeRect(2.5, 2.5, SCREEN_W - 5, SCREEN_H - 5);
    ctx.strokeStyle = pal.wallDark;
    ctx.strokeRect(4.5, 4.5, SCREEN_W - 9, SCREEN_H - 9);

    drawTitleCastle(ctx, pal);

    drawTextCentered(ctx, 'CASTLE', SCREEN_W / 2, 74, pal.textHi, 2, 7);
    drawTextCentered(ctx, 'WOLFENSTEIN', SCREEN_W / 2, 92, pal.guard, 2, 7);

    drawTextCentered(ctx, 'APPLE IIE EDITION (1981 TRIBUTE)', SCREEN_W / 2, 112, pal.wall, 1, 6);

    drawTextCentered(ctx, 'INFILTRATE 3 FLOORS. STEAL THE', SCREEN_W / 2, 127, pal.text, 1, 6);
    drawTextCentered(ctx, 'SECRET WAR PLANS. ESCAPE ALIVE.', SCREEN_W / 2, 136, pal.text, 1, 6);

    drawTextCentered(
      ctx,
      `RANK: ${game.getRankName()}   HI-SCORE: ${game.highScore}`,
      SCREEN_W / 2,
      152,
      pal.textWarn,
      1,
      6
    );

    // Clear steady start CTA box (no rapid flashing)
    ctx.fillStyle = pal.wallDark;
    ctx.fillRect(36, 166, SCREEN_W - 72, 14);
    ctx.strokeStyle = pal.textHi;
    ctx.strokeRect(36.5, 166.5, SCREEN_W - 73, 13);
    drawTextCentered(ctx, 'PRESS [SPACE] OR CLICK TO START', SCREEN_W / 2, 170, pal.textHi, 1, 6);
  }

  _renderPlayfield(ctx, game, pal) {
    const room = game.room;
    const p = game.player;
    if (!room || !p) return;

    // Subtle stone floor dots
    ctx.fillStyle = pal.floorDot;
    for (let r = 1; r < ROOM_ROWS - 1; r++) {
      for (let c = 1; c < ROOM_COLS - 1; c++) {
        if ((r + c) % 2 === 0) {
          ctx.fillRect(c * TILE + 4, r * TILE + 4, 1, 1);
        }
      }
    }

    // Room tiles (walls, doors, stairs, exit)
    for (let r = 0; r < ROOM_ROWS; r++) {
      for (let c = 0; c < ROOM_COLS; c++) {
        const t = room.grid[r][c];
        const tx = c * TILE;
        const ty = r * TILE;
        if (t === T_WALL) {
          const isOuter = r === 0 || r === ROOM_ROWS - 1 || c === 0 || c === ROOM_COLS - 1;
          drawWallTile(ctx, tx, ty, pal, isOuter);
        } else if (t === T_DOOR_N) {
          drawDoorTile(ctx, tx, ty, 'H', !!room.doors.N?.locked, pal);
        } else if (t === T_DOOR_S) {
          drawDoorTile(ctx, tx, ty, 'H', !!room.doors.S?.locked, pal);
        } else if (t === T_DOOR_W) {
          drawDoorTile(ctx, tx, ty, 'V', !!room.doors.W?.locked, pal);
        } else if (t === T_DOOR_E) {
          drawDoorTile(ctx, tx, ty, 'V', !!room.doors.E?.locked, pal);
        } else if (t === T_STAIRS_UP) {
          drawStairs(ctx, tx, ty, true, pal);
          drawText(ctx, 'UP', tx, ty - 8 > 10 ? ty - 8 : ty + 11, pal.stairs, 1, 6);
        } else if (t === T_STAIRS_DOWN) {
          drawStairs(ctx, tx, ty, false, pal);
          drawText(ctx, 'DN', tx, ty - 8 > 10 ? ty - 8 : ty + 11, pal.stairs, 1, 6);
        } else if (t === T_EXIT) {
          drawExitGate(ctx, tx, ty, p.hasPlans, pal);
        }
      }
    }

    // Exit label banner
    if (room.isExit) {
      drawTextCentered(
        ctx,
        p.hasPlans ? 'EXIT OPEN!' : 'EXIT',
        140,
        12,
        p.hasPlans ? pal.textHi : pal.doorLocked,
        1,
        6
      );
    }

    // Chests
    for (const ch of room.chests) {
      drawChest(ctx, ch.x, ch.y, ch, pal);
      if (ch.isPlansVault && !ch.opened) {
        drawTextCentered(ctx, 'PLANS', ch.x, ch.y - 13, pal.textHi, 1, 6);
      }
      // Opening progress bar
      if (game.activeAction?.type === 'chest' && game.activeAction.target === ch) {
        const pct = Math.min(1, game.activeAction.progress / game.activeAction.total);
        const bx = Math.round(ch.x - 10);
        const by = Math.round(ch.y - 11);
        ctx.fillStyle = pal.bg;
        ctx.fillRect(bx - 1, by - 1, 22, 5);
        ctx.fillStyle = pal.wall;
        ctx.fillRect(bx, by, 20, 3);
        ctx.fillStyle = pal.textHi;
        ctx.fillRect(bx, by, Math.round(20 * pct), 3);
      }
    }

    // Lockpick progress bar on door
    if (game.activeAction?.type === 'door') {
      const target = game.activeAction.target;
      const pct = Math.min(1, game.activeAction.progress / game.activeAction.total);
      const bx = Math.max(12, Math.min(SCREEN_W - 34, Math.round(target.x - 10)));
      const by = Math.max(12, Math.min(PLAY_H - 16, Math.round(target.y - 8)));
      ctx.fillStyle = pal.bg;
      ctx.fillRect(bx - 1, by - 1, 22, 5);
      ctx.fillStyle = pal.wall;
      ctx.fillRect(bx, by, 20, 3);
      ctx.fillStyle = pal.textHi;
      ctx.fillRect(bx, by, Math.round(20 * pct), 3);
    }

    // Fallen guards first (underneath)
    for (const g of room.guards) {
      if (g.state === 'dead') drawGuard(ctx, g, pal);
    }

    // Living guards
    for (const g of room.guards) {
      if (g.state !== 'dead') drawGuard(ctx, g, pal);
    }

    // Player
    drawPlayer(ctx, p, pal);

    // Subtle aiming reticle dot in front of player (when gun drawn)
    if (!p.holstered) {
      const rx = Math.round(p.x + Math.cos(p.aimAngle) * 14);
      const ry = Math.round(p.y + Math.sin(p.aimAngle) * 14);
      ctx.fillStyle = pal.textHi;
      ctx.fillRect(rx, ry, 1, 1);

      // Modern mode crisp cursor reticle
      if (game.controlMode === 'modern' && game.mouse.active && game.mouse.y < PLAY_H) {
        const mx = Math.round(game.mouse.x);
        const my = Math.round(game.mouse.y);
        ctx.fillStyle = pal.textHi;
        ctx.fillRect(mx - 3, my, 2, 1);
        ctx.fillRect(mx + 2, my, 2, 1);
        ctx.fillRect(mx, my - 3, 1, 2);
        ctx.fillRect(mx, my + 2, 1, 2);
      }
    }

    // Bullets
    for (const b of game.bullets) {
      ctx.fillStyle = b.fromPlayer ? pal.bullet : pal.guard;
      ctx.fillRect(Math.round(b.x) - 1, Math.round(b.y) - 1, 2, 2);
    }

    // Grenades
    for (const gr of game.grenades) {
      const gx = Math.round(gr.x);
      const gy = Math.round(gr.y);
      ctx.fillStyle = pal.grenade;
      ctx.fillRect(gx - 2, gy - 2, 4, 4);
      ctx.fillStyle = pal.blast1;
      ctx.fillRect(gx - 1, gy - 3, 2, 1);
    }

    // Sparks
    for (const s of game.sparks) {
      ctx.fillStyle = pal.blast1;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }

    // Grenade Explosions (smooth expanding rings, safe below flash threshold)
    for (const ex of game.explosions) {
      const t = 1 - ex.timer / ex.maxTimer;
      const r = Math.round(6 + t * ex.radius);
      const cx = Math.round(ex.x);
      const cy = Math.round(ex.y);
      ctx.strokeStyle = t < 0.35 ? pal.blast1 : t < 0.7 ? pal.blast2 : pal.blast3;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      if (t < 0.5) {
        ctx.fillStyle = pal.blast2;
        ctx.fillRect(cx - 4, cy - 4, 8, 8);
      }
    }

    // Guard speech bubbles ("HALT!", "SS!", "NEIN!", "KAPUT!")
    for (const g of room.guards) {
      if (g.shoutTimer > 0 && g.shoutText) {
        const tw = g.shoutText.length * 6 + 4;
        const sx = Math.max(12, Math.min(SCREEN_W - tw - 12, Math.round(g.x - tw / 2)));
        const sy = Math.max(12, Math.round(g.y - 16));
        ctx.fillStyle = pal.bg;
        ctx.fillRect(sx - 1, sy - 1, tw + 2, 9);
        ctx.fillStyle = g.isSS ? pal.ss : pal.textWarn;
        drawText(ctx, g.shoutText, sx + 2, sy, g.isSS ? pal.ss : pal.textWarn, 1, 6);
      }
    }

    // Context interact hint when close to an unopened chest, searchable guard, or locked door
    if (!game.activeAction) {
      const hint = this._getInteractHint(game);
      if (hint) {
        const tw = hint.text.length * 6 + 4;
        const hx = Math.max(12, Math.min(SCREEN_W - tw - 12, Math.round(hint.x - tw / 2)));
        const hy = Math.max(12, Math.round(hint.y - 14));
        ctx.fillStyle = pal.bg;
        ctx.fillRect(hx - 1, hy - 1, tw + 2, 9);
        drawText(ctx, hint.text, hx + 2, hy, pal.textHi, 1, 6);
      }
    }

    // Subtle damage border indicator (non-strobing smooth fade)
    if (game.damageFlash > 0.05) {
      ctx.strokeStyle = pal.textAlert;
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, SCREEN_W - 2, PLAY_H - 2);
    }
  }

  _getInteractHint(game) {
    const p = game.player;
    const room = game.room;
    const keyLabel = game.controlMode === 'classic' ? 'U' : 'E';

    for (const g of room.guards) {
      if (g.state === 'surrender' && !g.searched && Math.hypot(g.x - p.x, g.y - p.y) <= 20) {
        return { text: `[${keyLabel}]FRISK`, x: g.x, y: g.y };
      }
    }
    for (const g of room.guards) {
      if (g.state === 'dead' && !g.searched && g.loot && Math.hypot(g.x - p.x, g.y - p.y) <= 18) {
        return { text: `[${keyLabel}]LOOT`, x: g.x, y: g.y };
      }
    }
    for (const ch of room.chests) {
      if (!ch.opened && Math.hypot(ch.x - p.x, ch.y - p.y) <= 19) {
        return { text: `[${keyLabel}]OPEN`, x: ch.x, y: ch.y };
      }
    }
    return null;
  }

  _renderHud(ctx, game, pal) {
    const p = game.player;
    const room = game.room;
    if (!p || !room) return;

    ctx.fillStyle = pal.hudBg;
    ctx.fillRect(0, HUD_Y, SCREEN_W, HUD_H);

    // Line 1 (y=161..167): Ammo, Grenades, Keys, HP, Vest
    const bulStr = String(p.bullets).padStart(2, ' ');
    const line1 = `BUL:${bulStr} GRN:${p.grenades} KEY:${p.keys} HP:${p.hp}/${p.maxHp} VST:${p.vestHp}`;
    drawText(ctx, line1, 3, HUD_Y + 1, pal.text, 1, 7);

    // Line 2 (y=169..175): Floor, Room, Status Badge (UNIFORM / PLANS / SCORE)
    let badge = `SCR:${game.score}`;
    let badgeCol = pal.textWarn;
    if (p.hasPlans) {
      badge = 'PLANS:OK!';
      badgeCol = pal.textHi;
    } else if (p.hasUniform) {
      badge = p.holstered && !p.disguiseBlown ? 'DISGUISED' : 'UNIF(GUN)';
      badgeCol = p.holstered && !p.disguiseBlown ? pal.textHi : pal.textWarn;
    }
    const loc = `FL:${game.floor + 1}/3 ${room.label.slice(0, 14)}`;
    drawText(ctx, loc, 3, HUD_Y + 9, pal.wall, 1, 6);
    drawText(ctx, badge, SCREEN_W - badge.length * 6 - 3, HUD_Y + 9, badgeCol, 1, 6);

    // Line 3 (y=177..183): Dynamic Status Message
    const msg = game.statusMsg.slice(0, 44);
    const msgCol = game.alarmActive && p.hasPlans ? pal.textHi : pal.textWarn;
    drawText(ctx, msg, 3, HUD_Y + 17, msgCol, 1, 6);

    // Line 4 (y=185..191): Compact key legend (max 45 chars @ 6px = 270px inside 280px screen)
    const legend =
      game.controlMode === 'modern'
        ? 'WASD:MV SPC/CLK:FIRE E:USE R:HOL G:GRN M:MAP'
        : 'QWEADZXC:MV IJKL:AIM SPC:FIR U:USE H:HL T:GRN';
    drawText(ctx, legend, 3, HUD_Y + 25, pal.wallDark === '#0A4E82' ? '#6AA8D6' : pal.wall, 1, 6);
  }

  _renderMapOverlay(ctx, game, pal) {
    const fl = game.castle.floors[game.floor];
    const boxW = 196;
    const boxH = 122;
    const ox = Math.floor((SCREEN_W - boxW) / 2);
    const oy = Math.floor((PLAY_H - boxH) / 2);

    ctx.fillStyle = pal.bg;
    ctx.fillRect(ox, oy, boxW, boxH);
    ctx.strokeStyle = pal.textHi;
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + 0.5, oy + 0.5, boxW - 1, boxH - 1);

    drawTextCentered(ctx, fl.name, SCREEN_W / 2, oy + 5, pal.textHi, 1, 6);

    const cellW = 34;
    const cellH = 22;
    const startX = ox + Math.floor((boxW - fl.gridW * cellW) / 2);
    const startY = oy + 19;

    for (const rm of fl.rooms) {
      const rx = startX + rm.x * cellW;
      const ry = startY + rm.y * cellH;
      const isCur = rm.x === game.roomX && rm.y === game.roomY;

      if (!rm.visited) {
        ctx.strokeStyle = pal.wallDark;
        ctx.strokeRect(rx + 2.5, ry + 2.5, cellW - 5, cellH - 5);
        continue;
      }

      ctx.fillStyle = isCur ? pal.wallDark : pal.bg;
      ctx.fillRect(rx + 2, ry + 2, cellW - 4, cellH - 4);
      ctx.strokeStyle = isCur ? pal.textHi : pal.wall;
      ctx.strokeRect(rx + 2.5, ry + 2.5, cellW - 5, cellH - 5);

      // Draw door connectors
      if (rm.doors.E) {
        ctx.fillStyle = rm.doors.E.locked ? pal.doorLocked : pal.door;
        ctx.fillRect(rx + cellW - 3, ry + cellH / 2 - 2, 6, 4);
      }
      if (rm.doors.S) {
        ctx.fillStyle = rm.doors.S.locked ? pal.doorLocked : pal.door;
        ctx.fillRect(rx + cellW / 2 - 2, ry + cellH - 3, 4, 6);
      }

      // Markers
      let tag = '';
      if (isCur) tag = '@';
      else if (rm.isExit) tag = 'EX';
      else if (rm.isVault) tag = 'VP';
      else if (rm.stairsUpPos) tag = 'UP';
      else if (rm.stairsDownPos) tag = 'DN';

      if (tag) {
        drawTextCentered(
          ctx,
          tag,
          rx + cellW / 2,
          ry + 8,
          isCur ? pal.textHi : pal.textWarn,
          1,
          6
        );
      }
    }

    drawTextCentered(ctx, '@:YOU UP/DN:STAIR VP:PLANS EX:EXIT'.replace('UP/DN:STAIR', 'U/D:STAIR'), SCREEN_W / 2, oy + boxH - 18, pal.text, 1, 6);
    drawTextCentered(ctx, 'PRESS [M] TO CLOSE MAP', SCREEN_W / 2, oy + boxH - 10, pal.wall, 1, 6);
  }

  _renderEndOverlay(ctx, game, pal, isVictory) {
    const bw = 228;
    const bh = 116;
    const ox = Math.floor((SCREEN_W - bw) / 2);
    const oy = Math.floor((PLAY_H - bh) / 2);

    ctx.fillStyle = pal.bg;
    ctx.fillRect(ox, oy, bw, bh);
    ctx.strokeStyle = isVictory ? pal.textHi : pal.textAlert;
    ctx.lineWidth = 2;
    ctx.strokeRect(ox + 1, oy + 1, bw - 2, bh - 2);

    drawTextCentered(
      ctx,
      isVictory ? 'ESCAPED CASTLE!' : 'KAPUT! KILLED IN ACTION',
      SCREEN_W / 2,
      oy + 10,
      isVictory ? pal.textHi : pal.textAlert,
      1,
      7
    );

    if (isVictory) {
      drawTextCentered(
        ctx,
        `PROMOTED TO: ${game.getRankName()}!`,
        SCREEN_W / 2,
        oy + 24,
        pal.textWarn,
        1,
        6
      );
    } else {
      drawTextCentered(
        ctx,
        `RANK: ${game.getRankName()}`,
        SCREEN_W / 2,
        oy + 24,
        pal.textWarn,
        1,
        6
      );
    }

    const mins = Math.floor(game.elapsedTime / 60);
    const secs = String(Math.floor(game.elapsedTime % 60)).padStart(2, '0');

    drawText(ctx, `SCORE:    ${game.score}`, ox + 26, oy + 42, pal.text, 1, 6);
    drawText(ctx, `HI-SCORE: ${game.highScore}`, ox + 26, oy + 52, pal.textHi, 1, 6);
    drawText(ctx, `GUARDS:   ${game.kills}   CHESTS: ${game.chestsOpened}`, ox + 26, oy + 62, pal.text, 1, 6);
    drawText(ctx, `TIME:     ${mins}:${secs}`, ox + 26, oy + 72, pal.wall, 1, 6);

    ctx.fillStyle = pal.wallDark;
    ctx.fillRect(ox + 18, oy + 90, bw - 36, 15);
    drawTextCentered(
      ctx,
      isVictory ? '[SPACE] NEXT CASTLE' : '[SPACE] TRY AGAIN',
      SCREEN_W / 2,
      oy + 94,
      pal.textHi,
      1,
      6
    );
  }
}
