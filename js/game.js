import {
  SCREEN_W,
  PLAY_H,
  TILE,
  ROOM_COLS,
  ROOM_ROWS,
  T_FLOOR,
  T_WALL,
  T_DOOR_N,
  T_DOOR_S,
  T_DOOR_W,
  T_DOOR_E,
  T_STAIRS_UP,
  T_STAIRS_DOWN,
  T_EXIT,
  ITEM_TYPES,
  RANKS,
  MAX_BULLETS,
  MAX_GRENADES,
  MAX_KEYS,
  MAX_VEST_HP,
} from './constants.js';
import { generateCastle } from './castle.js';

const STORAGE_KEY = 'wolf_apple_ii_save_v1';

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class WolfGame {
  constructor(audio) {
    this.audio = audio;
    this.state = 'title'; // title | playing | gameover | victory
    this.paused = false;
    this.showMap = false;

    // Settings
    this.controlMode = 'modern'; // modern | classic
    this.monitorMode = 'color';  // color | green | amber
    this.scanlines = true;
    this.hardcoreOneHit = false;

    // Persistence
    this.rankIdx = 0;
    this.highScore = 0;
    this._loadProgress();

    // Runtime state
    this.castle = null;
    this.floor = 0;
    this.roomX = 0;
    this.roomY = 2;
    this.room = null;

    this.player = null;
    this.bullets = [];
    this.grenades = [];
    this.explosions = [];
    this.sparks = [];
    this.pendingPursuit = null; // { isSS, entryDir, timer }

    this.score = 0;
    this.kills = 0;
    this.chestsOpened = 0;
    this.elapsedTime = 0;
    this.alarmActive = false;

    // HUD message ticker
    this.statusMsg = 'FIND THE WAR PLANS AND ESCAPE!';
    this.statusTimer = 0;
    this.statusPriority = 0;

    // Active timed interaction (chest or locked door)
    this.activeAction = null; // { type: 'chest'|'door', target, progress, total, tickAccum }
    this.stairsCooldown = 0;

    // Input state
    this.keys = new Set();
    this.mouse = { x: 140, y: 80, active: false, down: false };
    this.classicMoveVec = { dx: 0, dy: 0 };
    this.fireCooldown = 0;
    this.damageFlash = 0;
    this.roomTransitionFlash = 0;
  }

  _loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (typeof data.rankIdx === 'number') {
        this.rankIdx = clamp(data.rankIdx, 0, RANKS.length - 1);
      }
      if (typeof data.highScore === 'number') {
        this.highScore = Math.max(0, data.highScore);
      }
      if (['color', 'green', 'amber'].includes(data.monitorMode)) {
        this.monitorMode = data.monitorMode;
      }
      if (['modern', 'classic'].includes(data.controlMode)) {
        this.controlMode = data.controlMode;
      }
      if (typeof data.scanlines === 'boolean') {
        this.scanlines = data.scanlines;
      }
      if (typeof data.hardcoreOneHit === 'boolean') {
        this.hardcoreOneHit = data.hardcoreOneHit;
      }
    } catch {
      // Ignore storage failures
    }
  }

  saveProgress() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          rankIdx: this.rankIdx,
          highScore: this.highScore,
          monitorMode: this.monitorMode,
          controlMode: this.controlMode,
          scanlines: this.scanlines,
          hardcoreOneHit: this.hardcoreOneHit,
        })
      );
    } catch {
      // Ignore storage failures
    }
  }

  getRankName() {
    return RANKS[this.rankIdx] || 'PRIVATE';
  }

  startNewGame(keepScore = false) {
    this.audio.unlock();
    this.castle = generateCastle(this.rankIdx);
    this.floor = this.castle.startCoord.floor;
    this.roomX = this.castle.startCoord.x;
    this.roomY = this.castle.startCoord.y;
    this.room = this.castle.getRoom(this.floor, this.roomX, this.roomY);
    this.room.visited = true;

    if (!keepScore) {
      this.score = 0;
      this.kills = 0;
      this.chestsOpened = 0;
      this.elapsedTime = 0;
    }

    const startHp = this.hardcoreOneHit ? 1 : 3;
    this.player = {
      x: 45,
      y: 78,
      radius: 3.6,
      speed: 52,
      aimAngle: 0,
      hp: startHp,
      maxHp: startHp,
      vestHp: 0,
      bullets: MAX_BULLETS,
      grenades: 1,
      keys: 0,
      hasUniform: false,
      holstered: false,
      hasPlans: false,
      walkPhase: 0,
      moving: false,
      schnappsTimer: 0,
      invulnTimer: 0,
      disguiseBlown: false,
    };

    this.bullets = [];
    this.grenades = [];
    this.explosions = [];
    this.sparks = [];
    this.pendingPursuit = null;
    this.activeAction = null;
    this.alarmActive = false;
    this.stairsCooldown = 0.4;
    this.fireCooldown = 0;
    this.damageFlash = 0;
    this.classicMoveVec = { dx: 0, dy: 0 };
    this.showMap = false;
    this.state = 'playing';

    this.setMessage('CELL DOOR OPEN! FIND WAR PLANS ON FL 3.', 4.5, 2);
  }

  setMessage(text, duration = 2.8, priority = 1) {
    if (this.statusTimer > 0 && priority < this.statusPriority) return;
    this.statusMsg = text.toUpperCase();
    this.statusTimer = duration;
    this.statusPriority = priority;
  }

  // ------------------------------------------------------------------
  // Input Handlers
  // ------------------------------------------------------------------
  onKeyDown(code) {
    this.keys.add(code);

    if (this.state === 'title') {
      if (code === 'Space' || code === 'Enter') {
        this.startNewGame(false);
      }
      return;
    }

    if (this.state === 'gameover') {
      if (code === 'Space' || code === 'Enter') {
        this.startNewGame(false);
      }
      return;
    }

    if (this.state === 'victory') {
      if (code === 'Space' || code === 'Enter') {
        this.startNewGame(true);
      }
      return;
    }

    if (this.paused || this.state !== 'playing') return;

    if (code === 'KeyM') {
      this.showMap = !this.showMap;
      return;
    }

    // Classic Apple IIe movement stop key
    if (this.controlMode === 'classic' && code === 'KeyS') {
      this.classicMoveVec = { dx: 0, dy: 0 };
    }

    // Holster / Draw toggle
    if ((this.controlMode === 'modern' && code === 'KeyR') ||
        (this.controlMode === 'classic' && code === 'KeyH')) {
      this.toggleHolster();
      return;
    }

    // Fire pistol
    if (code === 'Space') {
      this.firePistol();
      return;
    }

    // Throw grenade
    if ((this.controlMode === 'modern' && code === 'KeyG') ||
        (this.controlMode === 'classic' && code === 'KeyT')) {
      this.throwGrenade();
      return;
    }

    // Search / Open / Frisk / Unlock
    if ((this.controlMode === 'modern' && (code === 'KeyE' || code === 'KeyF')) ||
        (this.controlMode === 'classic' && (code === 'KeyU' || code === 'KeyE'))) {
      this.tryInteract();
      return;
    }
  }

  onKeyUp(code) {
    this.keys.delete(code);
  }

  onCanvasMouseMove(normX, normY) {
    this.mouse.x = normX;
    this.mouse.y = normY;
    this.mouse.active = true;
  }

  onCanvasMouseDown(button) {
    this.audio.unlock();
    if (this.state === 'title' || this.state === 'gameover') {
      this.startNewGame(false);
      return;
    }
    if (this.state === 'victory') {
      this.startNewGame(true);
      return;
    }
    if (this.paused || this.state !== 'playing') return;

    if (button === 0) {
      this.mouse.down = true;
      this.firePistol();
    } else if (button === 2) {
      this.throwGrenade();
    }
  }

  onCanvasMouseUp(button) {
    if (button === 0) this.mouse.down = false;
  }

  toggleHolster() {
    if (!this.player) return;
    this.player.holstered = !this.player.holstered;
    this.audio.playEmptyClick();
    if (this.player.holstered) {
      this.setMessage(
        this.player.hasUniform
          ? 'GUN HOLSTERED - DISGUISE ACTIVE'
          : 'GUN HOLSTERED',
        2.0,
        1
      );
    } else {
      this.setMessage('PISTOL DRAWN!', 1.5, 1);
    }
  }

  // ------------------------------------------------------------------
  // Player Combat & Interaction Actions
  // ------------------------------------------------------------------
  firePistol() {
    if (!this.player || this.fireCooldown > 0) return;
    this.audio.unlock();

    if (this.player.holstered) {
      this.player.holstered = false;
    }

    // Cancel active chest/lockpick if player shoots
    if (this.activeAction) {
      this.activeAction = null;
    }

    if (this.player.bullets <= 0) {
      this.audio.playEmptyClick();
      this.fireCooldown = 0.25;
      this.setMessage('CLICK! OUT OF AMMO! (HOLD UP GUARDS)', 2.2, 2);
      return;
    }

    this.player.bullets--;
    this.fireCooldown = 0.26;
    this.player.disguiseBlown = true;
    this.audio.playGunshot(false);

    let angle = this.player.aimAngle;
    if (this.player.schnappsTimer > 0) {
      angle += (Math.random() - 0.5) * 0.32;
    }

    const speed = 215;
    this.bullets.push({
      x: this.player.x + Math.cos(angle) * 6,
      y: this.player.y + Math.sin(angle) * 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      fromPlayer: true,
      life: 1.5,
    });

    // Gunshots alert guards in this room!
    this._alertRoomGuards('ACHTUNG!');
  }

  throwGrenade() {
    if (!this.player) return;
    this.audio.unlock();

    if (this.player.grenades <= 0) {
      this.audio.playEmptyClick();
      this.setMessage('NO GRENADES LEFT!', 1.8, 1);
      return;
    }

    this.player.grenades--;
    this.player.disguiseBlown = true;
    this.activeAction = null;
    this.audio.playGrenadeThrow();

    const angle = this.player.aimAngle;
    const speed = 92;
    this.grenades.push({
      x: this.player.x + Math.cos(angle) * 5,
      y: this.player.y + Math.sin(angle) * 5,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      fuse: 1.15,
    });
    this.setMessage('GRENADE OUT! TAKE COVER!', 1.6, 2);
  }

  tryInteract() {
    if (!this.player || !this.room) return;
    this.audio.unlock();
    const p = this.player;

    // 1. Check surrendered guards to frisk (highest priority!)
    for (const g of this.room.guards) {
      if (g.state === 'surrender' && !g.searched) {
        const dist = Math.hypot(g.x - p.x, g.y - p.y);
        if (dist <= 20) {
          g.searched = true;
          this.score += 150;
          if (g.loot) {
            this._grantItem(g.loot, 'FRISKED GUARD');
          } else {
            this.setMessage('GUARD HAS NOTHING ELSE.', 2.0, 1);
          }
          return;
        }
      }
    }

    // 2. Check fallen guards to search
    for (const g of this.room.guards) {
      if (g.state === 'dead' && !g.searched && g.loot) {
        const dist = Math.hypot(g.x - p.x, g.y - p.y);
        if (dist <= 18) {
          g.searched = true;
          this._grantItem(g.loot, 'SEARCHED GUARD');
          return;
        }
      }
    }

    // 3. Check unopened chests
    for (const ch of this.room.chests) {
      if (!ch.opened) {
        const dist = Math.hypot(ch.x - p.x, ch.y - p.y);
        if (dist <= 19) {
          this.activeAction = {
            type: 'chest',
            target: ch,
            progress: ch.progress || 0,
            total: ch.openTime,
            tickAccum: 0,
          };
          this.audio.playChestTick();
          this.setMessage('OPENING CHEST... HOLD STILL!', 2.0, 2);
          return;
        }
      }
    }

    // 4. Check nearby locked doors
    const lockedDoor = this._findNearbyLockedDoor(p.x, p.y, 19);
    if (lockedDoor) {
      if (p.keys > 0) {
        p.keys--;
        this._unlockDoor(lockedDoor.dir);
        this.audio.playUnlock();
        this.score += 50;
        this.setMessage('UNLOCKED DOOR WITH BRASS KEY!', 2.2, 2);
      } else {
        this.activeAction = {
          type: 'door',
          target: lockedDoor,
          progress: 0,
          total: 2.6,
          tickAccum: 0,
        };
        this.audio.playChestTick();
        this.setMessage('PICKING DOOR LOCK... HOLD STILL!', 2.2, 2);
      }
      return;
    }

    this.setMessage('NOTHING NEARBY TO SEARCH.', 1.3, 0);
  }

  _grantItem(item, prefix = 'FOUND') {
    const p = this.player;
    this.audio.playPickup(item.type === ITEM_TYPES.WAR_PLANS);

    switch (item.type) {
      case ITEM_TYPES.WAR_PLANS:
        p.hasPlans = true;
        this.alarmActive = true;
        this.score += 1000;
        this.audio.playAlarm();
        this.audio.playVoice('ALARM', 1.0);
        this._alertRoomGuards('ALARM!');
        this.setMessage('WAR PLANS ACQUIRED! REACH FLOOR 3 EXIT!', 5.0, 3);
        break;
      case ITEM_TYPES.BULLETS: {
        const before = p.bullets;
        p.bullets = Math.min(MAX_BULLETS, p.bullets + item.amount);
        const gained = p.bullets - before;
        this.score += 50;
        this.setMessage(
          gained > 0 ? `${prefix}: +${gained} BULLETS` : `${prefix}: AMMO FULL (${MAX_BULLETS})`,
          2.4,
          2
        );
        break;
      }
      case ITEM_TYPES.GRENADES: {
        const before = p.grenades;
        p.grenades = Math.min(MAX_GRENADES, p.grenades + item.amount);
        const gained = p.grenades - before;
        this.score += 75;
        this.setMessage(
          gained > 0 ? `${prefix}: +${gained} GRENADE` : `${prefix}: GRENADES FULL`,
          2.4,
          2
        );
        break;
      }
      case ITEM_TYPES.UNIFORM:
        p.hasUniform = true;
        p.disguiseBlown = false;
        this.score += 150;
        this.setMessage(`${prefix}: GUARD UNIFORM! (HOLSTER [R])`, 3.4, 2);
        break;
      case ITEM_TYPES.VEST:
        p.vestHp = MAX_VEST_HP;
        this.score += 150;
        this.setMessage(`${prefix}: BULLETPROOF VEST! (+3 ARMOR)`, 3.0, 2);
        break;
      case ITEM_TYPES.KEY:
        p.keys = Math.min(MAX_KEYS, p.keys + 1);
        this.score += 80;
        this.setMessage(`${prefix}: BRASS DOOR KEY!`, 2.4, 2);
        break;
      case ITEM_TYPES.BRATWURST:
        p.hp = Math.min(p.maxHp, p.hp + 1);
        this.score += 100;
        this.setMessage(`${prefix}: BRATWURST! DELICIOUS (+1 HP)`, 2.8, 2);
        break;
      case ITEM_TYPES.SCHNAPPS:
        p.schnappsTimer = 6.5;
        this.score += 120;
        this.setMessage(`${prefix}: LIEBFRAUMILCH SCHNAPPS! HIC!`, 3.2, 2);
        break;
      default:
        this.setMessage(`${prefix}: ${item.label}`, 2.2, 2);
    }
  }

  _findNearbyLockedDoor(x, y, maxDist) {
    const centers = {
      N: { x: 14 * TILE, y: TILE / 2 },
      S: { x: 14 * TILE, y: (ROOM_ROWS - 0.5) * TILE },
      W: { x: TILE / 2, y: 8 * TILE },
      E: { x: (ROOM_COLS - 0.5) * TILE, y: 8 * TILE },
    };
    for (const dir of ['N', 'S', 'W', 'E']) {
      const door = this.room.doors[dir];
      if (door && door.locked) {
        const c = centers[dir];
        if (Math.hypot(x - c.x, y - c.y) <= maxDist + 8) {
          return { dir, door, ...c };
        }
      }
    }
    return null;
  }

  _unlockDoor(dir) {
    const door = this.room.doors[dir];
    if (door) door.locked = false;

    // Also unlock matching side in adjacent room
    const offsets = { N: [0, -1, 'S'], S: [0, 1, 'N'], W: [-1, 0, 'E'], E: [1, 0, 'W'] };
    const [dx, dy, opp] = offsets[dir];
    const adj = this.castle.getRoom(this.floor, this.roomX + dx, this.roomY + dy);
    if (adj && adj.doors[opp]) {
      adj.doors[opp].locked = false;
    }
  }

  // ------------------------------------------------------------------
  // Fixed-Timestep Simulation Update
  // ------------------------------------------------------------------
  update(dt) {
    if (this.state !== 'playing' || this.paused) return;

    this.elapsedTime += dt;
    if (this.statusTimer > 0) {
      this.statusTimer = Math.max(0, this.statusTimer - dt);
      if (this.statusTimer === 0) this.statusPriority = 0;
    }
    if (this.fireCooldown > 0) this.fireCooldown -= dt;
    if (this.stairsCooldown > 0) this.stairsCooldown -= dt;
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt * 2.5);
    if (this.roomTransitionFlash > 0) this.roomTransitionFlash = Math.max(0, this.roomTransitionFlash - dt * 6);
    if (this.player.schnappsTimer > 0) this.player.schnappsTimer = Math.max(0, this.player.schnappsTimer - dt);
    if (this.player.invulnTimer > 0) this.player.invulnTimer = Math.max(0, this.player.invulnTimer - dt);

    this._updatePlayerInput(dt);
    this._updateActiveAction(dt);
    this._updatePursuit(dt);
    this._updateGuards(dt);
    this._updateBullets(dt);
    this._updateGrenades(dt);
    this._updateEffects(dt);
  }

  _updatePlayerInput(dt) {
    const p = this.player;
    let dx = 0;
    let dy = 0;

    if (this.controlMode === 'modern') {
      if (this.keys.has('KeyW')) dy -= 1;
      if (this.keys.has('KeyS')) dy += 1;
      if (this.keys.has('KeyA')) dx -= 1;
      if (this.keys.has('KeyD')) dx += 1;

      // Arrow keys aim in 8 directions (override mouse until mouse moves again)
      let ax = 0;
      let ay = 0;
      if (this.keys.has('ArrowUp')) ay -= 1;
      if (this.keys.has('ArrowDown')) ay += 1;
      if (this.keys.has('ArrowLeft')) ax -= 1;
      if (this.keys.has('ArrowRight')) ax += 1;
      if (ax !== 0 || ay !== 0) {
        this.mouse.active = false;
        p.aimAngle = Math.atan2(ay, ax);
      } else if (this.mouse.active) {
        p.aimAngle = Math.atan2(this.mouse.y - p.y, this.mouse.x - p.x);
      } else if (dx !== 0 || dy !== 0) {
        p.aimAngle = Math.atan2(dy, dx);
      }
    } else {
      // Classic Apple IIe 8-way QWE / A(S)D / ZXC movement
      if (this.keys.has('KeyQ')) { dx = -1; dy = -1; }
      else if (this.keys.has('KeyW')) { dx = 0; dy = -1; }
      else if (this.keys.has('KeyE')) { dx = 1; dy = -1; }
      else if (this.keys.has('KeyA')) { dx = -1; dy = 0; }
      else if (this.keys.has('KeyD')) { dx = 1; dy = 0; }
      else if (this.keys.has('KeyZ')) { dx = -1; dy = 1; }
      else if (this.keys.has('KeyX')) { dx = 0; dy = 1; }
      else if (this.keys.has('KeyC')) { dx = 1; dy = 1; }

      // Classic aim keys: IJKL + UOM. or Arrows
      let ax = 0;
      let ay = 0;
      if (this.keys.has('KeyI') || this.keys.has('ArrowUp')) ay -= 1;
      if (this.keys.has('KeyK') || this.keys.has('ArrowDown')) ay += 1;
      if (this.keys.has('KeyJ') || this.keys.has('ArrowLeft')) ax -= 1;
      if (this.keys.has('KeyL') || this.keys.has('ArrowRight')) ax += 1;
      if (this.keys.has('KeyO')) { ax = 1; ay = -1; }
      if (this.keys.has('Period')) { ax = 1; ay = 1; }
      if (ax !== 0 || ay !== 0) {
        p.aimAngle = Math.atan2(ay, ax);
      } else if (dx !== 0 || dy !== 0) {
        p.aimAngle = Math.atan2(dy, dx);
      }
    }

    if (dx !== 0 && dy !== 0) {
      dx *= 0.7071;
      dy *= 0.7071;
    }

    // Subtle Schnapps wobble!
    if (p.schnappsTimer > 0 && (dx !== 0 || dy !== 0)) {
      const wobble = Math.sin(this.elapsedTime * 7) * 0.28;
      const cos = Math.cos(wobble);
      const sin = Math.sin(wobble);
      const nx = dx * cos - dy * sin;
      const ny = dx * sin + dy * cos;
      dx = nx;
      dy = ny;
    }

    p.moving = dx !== 0 || dy !== 0;

    if (p.moving) {
      // Moving cancels chest/lockpick
      if (this.activeAction) {
        this.activeAction = null;
        this.setMessage('SEARCH INTERRUPTED!', 1.2, 1);
      }

      const speed = p.speed;
      const hitWall = this._moveEntity(p, dx * speed * dt, dy * speed * dt, true);
      if (hitWall) {
        this.audio.playWallBump();
        if (this.room.isExit && !p.hasPlans && p.y <= 17 && p.x >= 122 && p.x <= 158) {
          this.setMessage('EXIT LOCKED! FIND SECRET WAR PLANS FIRST!', 2.8, 2);
        } else {
          const lockedDoor = this._findNearbyLockedDoor(p.x, p.y, 13);
          if (lockedDoor) {
            this.setMessage(
              p.keys > 0
                ? 'LOCKED DOOR! PRESS [E] TO USE BRASS KEY'
                : 'LOCKED DOOR! [E] PICK LOCK OR USE GRENADE',
              2.2,
              1
            );
          }
        }
      } else {
        p.walkPhase += dt * 9;
        this.audio.playFootstep();
      }

      this._checkRoomTriggers();
    }
  }

  _updateActiveAction(dt) {
    if (!this.activeAction) return;
    const act = this.activeAction;
    act.progress += dt;
    act.tickAccum += dt;
    if (act.tickAccum >= 0.34) {
      act.tickAccum = 0;
      this.audio.playChestTick();
    }

    if (act.type === 'chest') {
      act.target.progress = act.progress;
      // Being caught cracking a chest blows disguise
      if (this._anyGuardSeesPlayer()) {
        this.player.disguiseBlown = true;
      }
      if (act.progress >= act.total) {
        act.target.opened = true;
        act.target.progress = act.total;
        this.chestsOpened++;
        this.activeAction = null;
        this._grantItem(act.target.item, 'CHEST');
      }
    } else if (act.type === 'door') {
      if (this._anyGuardSeesPlayer()) {
        this.player.disguiseBlown = true;
      }
      if (act.progress >= act.total) {
        this._unlockDoor(act.target.dir);
        this.audio.playUnlock();
        this.score += 50;
        this.activeAction = null;
        this.setMessage('LOCK PICKED! DOOR OPEN!', 2.2, 2);
      }
    }
  }

  _updatePursuit(dt) {
    if (!this.pendingPursuit) return;
    this.pendingPursuit.timer -= dt;
    if (this.pendingPursuit.timer <= 0) {
      const { entryDir, guardTemplate } = this.pendingPursuit;
      this.pendingPursuit = null;

      // Spawn the pursuing SS stormtrooper just inside the doorway the player used!
      const spawns = {
        N: { x: 140, y: 18 },
        S: { x: 140, y: PLAY_H - 18 },
        W: { x: 18, y: 80 },
        E: { x: SCREEN_W - 18, y: 80 },
      };
      const sp = spawns[entryDir] || { x: 140, y: 80 };
      const pursuer = {
        ...guardTemplate,
        x: sp.x,
        y: sp.y,
        state: 'chase',
        alertTimer: 0,
        fireCooldown: 0.7,
        shoutText: 'SS!',
        shoutTimer: 1.5,
      };
      this.room.guards.push(pursuer);
      this.audio.playVoice('SS', 0.92);
      this.setMessage('SS STORMTROOPER FOLLOWED YOU!', 2.8, 3);
    }
  }

  _checkRoomTriggers() {
    const p = this.player;
    const col = Math.floor(p.x / TILE);
    const row = Math.floor(p.y / TILE);
    if (row < 0 || row >= ROOM_ROWS || col < 0 || col >= ROOM_COLS) return;
    const tile = this.room.grid[row][col];

    // Door transitions
    if (tile === T_DOOR_N && this.room.doors.N && !this.room.doors.N.locked && p.y < 11) {
      this._enterAdjacentRoom(0, -1, 'S');
      return;
    }
    if (tile === T_DOOR_S && this.room.doors.S && !this.room.doors.S.locked && p.y > PLAY_H - 11) {
      this._enterAdjacentRoom(0, 1, 'N');
      return;
    }
    if (tile === T_DOOR_W && this.room.doors.W && !this.room.doors.W.locked && p.x < 11) {
      this._enterAdjacentRoom(-1, 0, 'E');
      return;
    }
    if (tile === T_DOOR_E && this.room.doors.E && !this.room.doors.E.locked && p.x > SCREEN_W - 11) {
      this._enterAdjacentRoom(1, 0, 'W');
      return;
    }

    // Castle Exit Gate!
    if (tile === T_EXIT && p.y < 14) {
      if (p.hasPlans) {
        this._triggerVictory();
      } else {
        p.y = 16;
        this.audio.playWallBump();
        this.setMessage('GATE LOCKED! FIND SECRET WAR PLANS FIRST!', 3.2, 3);
      }
      return;
    }

    // Stairs Up / Down
    if (this.stairsCooldown <= 0) {
      if (tile === T_STAIRS_UP && this.floor < this.castle.floors.length - 1) {
        this._changeFloor(this.floor + 1, true);
      } else if (tile === T_STAIRS_DOWN && this.floor > 0) {
        this._changeFloor(this.floor - 1, false);
      }
    }
  }

  _enterAdjacentRoom(dx, dy, entrySide) {
    const nextRoom = this.castle.getRoom(this.floor, this.roomX + dx, this.roomY + dy);
    if (!nextRoom) return;

    // Check if an alerted SS Stormtrooper in current room should pursue across rooms!
    const chasingSS = this.room.guards.find(
      (g) => g.isSS && g.state === 'chase' && g.hp > 0
    );
    if (chasingSS) {
      // Remove from old room so he physically follows you
      this.room.guards = this.room.guards.filter((g) => g !== chasingSS);
      this.pendingPursuit = {
        entryDir: entrySide,
        timer: 1.45,
        guardTemplate: chasingSS,
      };
    } else {
      this.pendingPursuit = null;
    }

    this.roomX += dx;
    this.roomY += dy;
    this.room = nextRoom;
    this.room.visited = true;

    // Reset room projectiles & disguise blow status for new room (fresh stealth chance if wearing uniform!)
    this.bullets = [];
    this.grenades = [];
    this.explosions = [];
    this.sparks = [];
    this.activeAction = null;
    this.roomTransitionFlash = 1;
    if (this.player.hasUniform && this.player.holstered && !this.alarmActive) {
      this.player.disguiseBlown = false;
    }

    // Position player just inside the entry doorway
    if (entrySide === 'N') { this.player.x = 140; this.player.y = 16; }
    else if (entrySide === 'S') { this.player.x = 140; this.player.y = PLAY_H - 16; }
    else if (entrySide === 'W') { this.player.x = 16; this.player.y = 80; }
    else if (entrySide === 'E') { this.player.x = SCREEN_W - 16; this.player.y = 80; }

    // Announce SS presence or special rooms
    const hasSS = this.room.guards.some((g) => g.isSS && g.state !== 'dead');
    if (hasSS) {
      this.audio.playVoice('SS', 0.95);
      this.setMessage(`ENTERED ${this.room.label} - SS GUARD!`, 2.5, 2);
    } else if (this.room.isVault) {
      this.setMessage('WAR ROOM VAULT! SEARCH THE CHEST!', 2.8, 2);
    } else if (this.room.isExit) {
      this.setMessage(
        this.player.hasPlans
          ? 'CASTLE EXIT! RUN FOR THE NORTH GATE!'
          : 'CASTLE EXIT GATE (FIND WAR PLANS FIRST)',
        3.0,
        2
      );
    }
  }

  _changeFloor(newFloor, goingUp) {
    const nextRoom = this.castle.getRoom(newFloor, this.roomX, this.roomY);
    if (!nextRoom) return;
    this.floor = newFloor;
    this.room = nextRoom;
    this.room.visited = true;
    this.stairsCooldown = 1.0;
    this.bullets = [];
    this.grenades = [];
    this.explosions = [];
    this.pendingPursuit = null;
    this.activeAction = null;
    this.roomTransitionFlash = 1;

    // Spawn on matching stairwell tile
    const st = goingUp ? this.room.stairsDownPos : this.room.stairsUpPos;
    if (st) {
      this.player.x = st.c * TILE + TILE / 2;
      this.player.y = st.r * TILE + TILE / 2;
    }

    this.audio.playStairs(goingUp);
    this.setMessage(
      `${goingUp ? 'ASCENDED' : 'DESCENDED'} TO ${this.castle.floors[this.floor].name}`,
      3.0,
      2
    );
  }

  // ------------------------------------------------------------------
  // Guard AI, Line of Sight, Hold-Up & Combat
  // ------------------------------------------------------------------
  _isDisguiseEffectiveAgainst(guard) {
    if (guard.isSS) return false; // SS ALWAYS sees through uniform!
    if (!this.player.hasUniform) return false;
    if (!this.player.holstered) return false;
    if (this.player.disguiseBlown) return false;
    if (this.alarmActive) return false;
    return true;
  }

  _hasLineOfSight(x1, y1, x2, y2) {
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(dist / 4);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const sx = x1 + (x2 - x1) * t;
      const sy = y1 + (y2 - y1) * t;
      if (this._isSolidPixel(sx, sy)) return false;
    }
    return true;
  }

  _guardCanSeePlayer(g) {
    const p = this.player;
    const dx = p.x - g.x;
    const dy = p.y - g.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 145) return false;

    const toPlayer = Math.atan2(dy, dx);
    const diff = Math.abs(angleDiff(g.angle, toPlayer));

    // Close proximity detection (peripheral / footsteps) or forward vision cone
    const inVision = dist < 24 || diff < 0.85;
    if (!inVision) return false;

    return this._hasLineOfSight(g.x, g.y, p.x, p.y);
  }

  _anyGuardSeesPlayer() {
    for (const g of this.room.guards) {
      if (g.state !== 'dead' && g.state !== 'surrender' && this._guardCanSeePlayer(g)) {
        return true;
      }
    }
    return false;
  }

  _alertRoomGuards(shout = 'ACHTUNG!') {
    let shouted = false;
    for (const g of this.room.guards) {
      if (g.state === 'patrol') {
        g.state = 'alert';
        g.alertTimer = 0.45;
        g.angle = Math.atan2(this.player.y - g.y, this.player.x - g.x);
        g.shoutText = g.isSS ? 'SS!' : shout;
        g.shoutTimer = 1.3;
        if (!shouted) {
          this.audio.playVoice(g.isSS ? 'SS' : 'ACHTUNG', g.isSS ? 0.92 : 1.0);
          shouted = true;
        }
      }
    }
  }

  _updateGuards(dt) {
    const p = this.player;

    for (const g of this.room.guards) {
      if (g.shoutTimer > 0) g.shoutTimer = Math.max(0, g.shoutTimer - dt);
      if (g.hitFlash > 0) g.hitFlash = Math.max(0, g.hitFlash - dt * 5);
      if (g.state === 'dead') continue;

      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const dist = Math.hypot(dx, dy);
      const toPlayer = Math.atan2(dy, dx);
      const toGuard = Math.atan2(g.y - p.y, g.x - p.x);

      // Check Classic HOLD-UP mechanic: player aims drawn pistol at close unalerted regular guard!
      const playerAimingAtGuard =
        !p.holstered &&
        dist < 58 &&
        Math.abs(angleDiff(p.aimAngle, toGuard)) < 0.48 &&
        this._hasLineOfSight(p.x, p.y, g.x, g.y);

      if (g.state === 'surrender') {
        g.moving = false;
        if (playerAimingAtGuard || dist < 24) {
          g.surrenderTimer = 0;
        } else {
          g.surrenderTimer += dt;
          if (g.surrenderTimer > 3.6) {
            // Guard regains courage if you turn your back!
            g.state = 'chase';
            g.shoutText = 'HALT!';
            g.shoutTimer = 1.2;
            this.audio.playVoice('HALT', 1.05);
          }
        }
        continue;
      }

      if (!g.isSS && g.state === 'patrol' && playerAimingAtGuard) {
        // Check guard isn't already facing straight at player from far away
        const guardFacingPlayer = Math.abs(angleDiff(g.angle, toPlayer)) < 0.7;
        if (!guardFacingPlayer || dist < 34) {
          g.state = 'surrender';
          g.surrenderTimer = 0;
          g.moving = false;
          g.shoutText = 'NEIN!';
          g.shoutTimer = 1.6;
          this.audio.playVoice('NEIN', 1.05);
          this.setMessage('GUARD SURRENDERED! PRESS [E] TO FRISK!', 2.6, 2);
          continue;
        }
      }

      // Vision check for patrol -> alert
      if (g.state === 'patrol') {
        const sees = this._guardCanSeePlayer(g);
        const bumped = dist < 11;
        if ((sees || bumped) && !this._isDisguiseEffectiveAgainst(g)) {
          g.state = 'alert';
          g.alertTimer = g.isSS ? 0.35 : 0.62; // Classic tense beat after "HALT!"
          g.angle = toPlayer;
          g.moving = false;
          g.shoutText = g.isSS ? 'SS!' : (Math.random() < 0.6 ? 'HALT!' : 'ACHTUNG!');
          g.shoutTimer = 1.4;
          this.audio.playVoice(g.isSS ? 'SS' : (g.shoutText === 'HALT!' ? 'HALT' : 'ACHTUNG'));
          continue;
        }

        // Patrol along waypoints
        if (g.waitTimer > 0) {
          g.waitTimer -= dt;
          g.moving = false;
        } else {
          const wp = g.waypoints[g.wpIndex];
          const wdx = wp.x - g.x;
          const wdy = wp.y - g.y;
          const wdist = Math.hypot(wdx, wdy);
          if (wdist < 4) {
            g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
            g.waitTimer = 0.6 + Math.random() * 1.2;
            g.moving = false;
          } else {
            g.angle = Math.atan2(wdy, wdx);
            const blocked = this._moveEntity(
              g,
              (wdx / wdist) * g.patrolSpeed * dt,
              (wdy / wdist) * g.patrolSpeed * dt,
              false
            );
            g.moving = !blocked;
            g.walkPhase += dt * 5;
            if (blocked) {
              g.wpIndex = (g.wpIndex + 1) % g.waypoints.length;
              g.waitTimer = 0.4;
            }
          }
        }
        continue;
      }

      // Alert reaction beat before shooting
      if (g.state === 'alert') {
        g.angle = toPlayer;
        g.moving = false;
        g.alertTimer -= dt;
        if (g.alertTimer <= 0) {
          g.state = 'chase';
          g.fireCooldown = 0.25;
        }
        continue;
      }

      // Active Chase & Shoot
      if (g.state === 'chase') {
        g.angle = toPlayer;
        const los = this._hasLineOfSight(g.x, g.y, p.x, p.y);

        // Move toward player if far or no line of sight
        if (!los || dist > 48) {
          const moveSpeed = g.speed;
          const vx = (dx / Math.max(1, dist)) * moveSpeed * dt;
          const vy = (dy / Math.max(1, dist)) * moveSpeed * dt;
          const blocked = this._moveEntity(g, vx, vy, false);
          // Simple wall-slide nudge if blocked straight-on
          if (blocked) {
            this._moveEntity(g, -vy * 0.8, vx * 0.8, false);
          }
          g.moving = true;
          g.walkPhase += dt * 8;
        } else {
          g.moving = false;
        }

        // Fire pistol at player when in line of sight
        g.fireCooldown -= dt;
        if (los && g.fireCooldown <= 0 && dist < 170) {
          g.fireCooldown = g.isSS
            ? Math.max(0.55, 0.95 - this.rankIdx * 0.05)
            : Math.max(0.85, 1.35 - this.rankIdx * 0.05);
          this._guardFire(g, toPlayer);
        }
      }
    }
  }

  _guardFire(g, angle) {
    this.audio.playGunshot(true);
    const spread = g.isSS ? 0.11 : 0.19;
    const shotAngle = angle + (Math.random() - 0.5) * spread;
    const speed = g.isSS ? 165 : 140;
    this.bullets.push({
      x: g.x + Math.cos(shotAngle) * 6,
      y: g.y + Math.sin(shotAngle) * 6,
      vx: Math.cos(shotAngle) * speed,
      vy: Math.sin(shotAngle) * speed,
      fromPlayer: false,
      life: 1.6,
    });
  }

  // ------------------------------------------------------------------
  // Projectiles, Explosions & Collision
  // ------------------------------------------------------------------
  _updateBullets(dt) {
    const p = this.player;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;

      if (b.life <= 0 || b.x < 0 || b.x > SCREEN_W || b.y < 0 || b.y > PLAY_H) {
        this.bullets.splice(i, 1);
        continue;
      }

      // Wall impact
      if (this._isSolidPixel(b.x, b.y)) {
        this._spawnSparks(b.x, b.y, 4);
        this.audio.playRicochet();
        this.bullets.splice(i, 1);
        continue;
      }

      if (b.fromPlayer) {
        let hit = false;
        for (const g of this.room.guards) {
          if (g.state === 'dead') continue;
          if (Math.hypot(b.x - g.x, b.y - g.y) < 6.5) {
            this._damageGuard(g, 1, false);
            hit = true;
            break;
          }
        }
        if (hit) {
          this.bullets.splice(i, 1);
          continue;
        }
      } else {
        // Enemy bullet vs Player
        if (Math.hypot(b.x - p.x, b.y - p.y) < 5.5) {
          this._damagePlayer(1);
          this.bullets.splice(i, 1);
          continue;
        }
      }
    }
  }

  _damageGuard(g, dmg, fromExplosion) {
    g.hp -= dmg;
    g.hitFlash = 1;
    if (g.hp > 0) {
      // SS armor absorbed shot!
      this._spawnSparks(g.x, g.y, 5);
      this.audio.playRicochet();
      g.state = 'chase';
      g.shoutText = 'SS!';
      g.shoutTimer = 1.0;
      this.setMessage('SS ARMOR DEFLECTED SHOT! USE GRENADE!', 2.0, 2);
    } else {
      g.state = 'dead';
      g.moving = false;
      g.shoutText = 'KAPUT!';
      g.shoutTimer = 1.2;
      this.kills++;
      this.score += g.isSS ? 300 : 100;
      if (!fromExplosion) {
        this.audio.playVoice('KAPUT', g.isSS ? 0.88 : 1.0);
      }
      this.setMessage(
        g.isSS ? 'SS STORMTROOPER DOWN! [E] TO SEARCH' : 'GUARD DOWN! [E] TO SEARCH',
        2.0,
        1
      );
    }
  }

  _damagePlayer(dmg) {
    const p = this.player;
    if (p.invulnTimer > 0) return;

    if (p.vestHp > 0) {
      p.vestHp -= dmg;
      p.invulnTimer = 0.35;
      this._spawnSparks(p.x, p.y, 5);
      this.audio.playPlayerHit(true);
      this.setMessage(
        p.vestHp > 0
          ? `VEST ABSORBED HIT! (${p.vestHp} ARMOR LEFT)`
          : 'BULLETPROOF VEST SHATTERED!',
        2.2,
        2
      );
      return;
    }

    p.hp -= dmg;
    p.invulnTimer = 0.45;
    this.damageFlash = 1;
    this.audio.playPlayerHit(false);

    if (p.hp <= 0) {
      p.hp = 0;
      this._triggerGameOver();
    } else {
      this.setMessage(`HIT! ${p.hp} HP REMAINING!`, 2.0, 3);
    }
  }

  _updateGrenades(dt) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const gr = this.grenades[i];
      gr.fuse -= dt;

      // Move with simple wall bounce + friction
      const nx = gr.x + gr.vx * dt;
      const ny = gr.y + gr.vy * dt;
      if (this._isSolidPixel(nx, gr.y)) {
        gr.vx = -gr.vx * 0.55;
        this.audio.playWallBump();
      } else {
        gr.x = nx;
      }
      if (this._isSolidPixel(gr.x, ny)) {
        gr.vy = -gr.vy * 0.55;
        this.audio.playWallBump();
      } else {
        gr.y = ny;
      }
      gr.vx *= Math.pow(0.28, dt);
      gr.vy *= Math.pow(0.28, dt);

      if (gr.fuse <= 0) {
        this._detonateGrenade(gr.x, gr.y);
        this.grenades.splice(i, 1);
      }
    }
  }

  _detonateGrenade(x, y) {
    this.audio.playExplosion();
    this.explosions.push({ x, y, timer: 0.48, maxTimer: 0.48, radius: 34 });
    this._spawnSparks(x, y, 12);

    // Damage all guards in blast radius (kills SS in 1 blast!)
    for (const g of this.room.guards) {
      if (g.state === 'dead') continue;
      if (Math.hypot(g.x - x, g.y - y) <= 36) {
        this._damageGuard(g, 10, true);
      }
    }

    // Blast open any locked door within range!
    const locked = this._findNearbyLockedDoor(x, y, 32);
    if (locked) {
      this._unlockDoor(locked.dir);
      this.setMessage('GRENADE BLEW THE LOCKED DOOR OPEN!', 2.6, 2);
    }

    // Self-damage if standing too close
    const pdist = Math.hypot(this.player.x - x, this.player.y - y);
    if (pdist <= 28) {
      this._damagePlayer(2);
    }

    // Alert any surviving guards in the room
    this._alertRoomGuards('ALARM!');
  }

  _spawnSparks(x, y, count) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 25 + Math.random() * 45;
      this.sparks.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.22 + Math.random() * 0.14,
      });
    }
  }

  _updateEffects(dt) {
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      this.explosions[i].timer -= dt;
      if (this.explosions[i].timer <= 0) this.explosions.splice(i, 1);
    }
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) this.sparks.splice(i, 1);
    }
  }

  // ------------------------------------------------------------------
  // Collision Helpers
  // ------------------------------------------------------------------
  _isSolidTile(c, r) {
    if (r < 0 || r >= ROOM_ROWS || c < 0 || c >= ROOM_COLS) return true;
    const t = this.room.grid[r][c];
    if (t === T_WALL) return true;
    if (t === T_DOOR_N && this.room.doors.N?.locked) return true;
    if (t === T_DOOR_S && this.room.doors.S?.locked) return true;
    if (t === T_DOOR_W && this.room.doors.W?.locked) return true;
    if (t === T_DOOR_E && this.room.doors.E?.locked) return true;
    if (t === T_EXIT && !this.player?.hasPlans) return true;
    return false;
  }

  _isSolidPixel(x, y) {
    const c = Math.floor(x / TILE);
    const r = Math.floor(y / TILE);
    return this._isSolidTile(c, r);
  }

  _canStandAt(x, y, rad, isPlayer) {
    const pts = [
      [x - rad, y - rad],
      [x + rad, y - rad],
      [x - rad, y + rad],
      [x + rad, y + rad],
    ];
    for (const [px, py] of pts) {
      const c = Math.floor(px / TILE);
      const r = Math.floor(py / TILE);
      if (this._isSolidTile(c, r)) return false;
      // Guards stay inside room (don't walk out open doors)
      if (!isPlayer) {
        const t = this.room.grid[r]?.[c];
        if (t === T_DOOR_N || t === T_DOOR_S || t === T_DOOR_W || t === T_DOOR_E || t === T_EXIT) {
          return false;
        }
      }
    }
    // Collide softly with chests
    for (const ch of this.room.chests) {
      if (Math.abs(x - ch.x) < rad + 4 && Math.abs(y - ch.y) < rad + 3.5) {
        return false;
      }
    }
    return true;
  }

  _moveEntity(ent, dx, dy, isPlayer) {
    const rad = ent.radius || 3.6;
    let blocked = false;
    if (dx !== 0) {
      if (this._canStandAt(ent.x + dx, ent.y, rad, isPlayer)) {
        ent.x += dx;
      } else {
        blocked = true;
      }
    }
    if (dy !== 0) {
      if (this._canStandAt(ent.x, ent.y + dy, rad, isPlayer)) {
        ent.y += dy;
      } else {
        blocked = true;
      }
    }
    return blocked;
  }

  // ------------------------------------------------------------------
  // End-of-Run States
  // ------------------------------------------------------------------
  _triggerGameOver() {
    this.state = 'gameover';
    this.audio.playDeath();
    this.audio.playVoice('KAPUT', 0.85);
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveProgress();
    }
  }

  _triggerVictory() {
    this.state = 'victory';
    this.score += 1500 + this.player.hp * 200 + this.player.bullets * 25;
    if (this.rankIdx < RANKS.length - 1) {
      this.rankIdx++;
    }
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
    this.saveProgress();
    this.audio.playVictory();
  }
}
