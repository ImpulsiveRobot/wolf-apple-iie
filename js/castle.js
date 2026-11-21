import {
  ROOM_COLS,
  ROOM_ROWS,
  TILE,
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
} from './constants.js';

const FLOOR_NAMES = [
  'FLOOR 1: DUNGEON',
  'FLOOR 2: BARRACKS',
  'FLOOR 3: HIGH COMMAND',
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function createEmptyGrid() {
  const grid = [];
  for (let r = 0; r < ROOM_ROWS; r++) {
    const row = new Array(ROOM_COLS).fill(T_FLOOR);
    for (let c = 0; c < ROOM_COLS; c++) {
      if (r === 0 || r === ROOM_ROWS - 1 || c === 0 || c === ROOM_COLS - 1) {
        row[c] = T_WALL;
      }
    }
    grid.push(row);
  }
  return grid;
}

function setWallRect(grid, c1, r1, c2, r2) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (r > 0 && r < ROOM_ROWS - 1 && c > 0 && c < ROOM_COLS - 1) {
        grid[r][c] = T_WALL;
      }
    }
  }
}

function clearRect(grid, c1, r1, c2, r2) {
  for (let r = r1; r <= r2; r++) {
    for (let c = c1; c <= c2; c++) {
      if (r > 0 && r < ROOM_ROWS - 1 && c > 0 && c < ROOM_COLS - 1) {
        grid[r][c] = T_FLOOR;
      }
    }
  }
}

function applyRoomTemplate(grid, template) {
  switch (template) {
    case 'start_cell':
      // Classic prison cell partition on the left side with open door
      setWallRect(grid, 8, 1, 8, 5);
      setWallRect(grid, 8, 10, 8, 14);
      setWallRect(grid, 18, 4, 19, 5);
      setWallRect(grid, 18, 10, 19, 11);
      break;
    case 'pillars':
      setWallRect(grid, 6, 4, 7, 5);
      setWallRect(grid, 20, 4, 21, 5);
      setWallRect(grid, 6, 10, 7, 11);
      setWallRect(grid, 20, 10, 21, 11);
      break;
    case 'barracks':
      setWallRect(grid, 7, 4, 11, 4);
      setWallRect(grid, 16, 4, 20, 4);
      setWallRect(grid, 7, 11, 11, 11);
      setWallRect(grid, 16, 11, 20, 11);
      break;
    case 'baffles':
      setWallRect(grid, 8, 2, 8, 6);
      setWallRect(grid, 19, 9, 19, 13);
      setWallRect(grid, 13, 6, 14, 9);
      break;
    case 'vault':
      // Inner fortified chamber with top/bottom doorways
      setWallRect(grid, 8, 4, 19, 4);
      setWallRect(grid, 8, 11, 19, 11);
      setWallRect(grid, 8, 4, 8, 11);
      setWallRect(grid, 19, 4, 19, 11);
      clearRect(grid, 12, 4, 15, 4);
      clearRect(grid, 12, 11, 15, 11);
      break;
    case 'alcoves':
      setWallRect(grid, 5, 4, 5, 11);
      setWallRect(grid, 22, 4, 22, 11);
      clearRect(grid, 5, 7, 5, 8);
      clearRect(grid, 22, 7, 22, 8);
      setWallRect(grid, 12, 7, 15, 8);
      break;
    case 'open_hall':
    default:
      setWallRect(grid, 10, 7, 11, 8);
      setWallRect(grid, 16, 7, 17, 8);
      break;
  }

  // Always guarantee clear zones inside all 4 doorway entries
  clearRect(grid, 12, 1, 15, 3);
  clearRect(grid, 12, 12, 15, 14);
  clearRect(grid, 1, 6, 3, 9);
  clearRect(grid, 24, 6, 26, 9);
}

function isWalkableTile(grid, c, r) {
  if (r <= 0 || r >= ROOM_ROWS - 1 || c <= 0 || c >= ROOM_COLS - 1) return false;
  return grid[r][c] === T_FLOOR;
}

function findFreeTile(grid, forbiddenSet, preferCenter = false) {
  const candidates = [];
  for (let r = 2; r <= ROOM_ROWS - 3; r++) {
    for (let c = 2; c <= ROOM_COLS - 3; c++) {
      if (!isWalkableTile(grid, c, r)) continue;
      // Avoid blocking immediate doorway entrances
      if ((c >= 12 && c <= 15) && (r <= 2 || r >= 13)) continue;
      if ((r >= 6 && r <= 9) && (c <= 2 || c >= 25)) continue;
      const key = `${c},${r}`;
      if (forbiddenSet.has(key)) continue;
      candidates.push({ c, r });
    }
  }
  if (candidates.length === 0) return { c: 13, r: 7 };
  if (preferCenter) {
    candidates.sort((a, b) => {
      const da = Math.hypot(a.c - 13.5, a.r - 7.5);
      const db = Math.hypot(b.c - 13.5, b.r - 7.5);
      return da - db;
    });
    return candidates[0];
  }
  return candidates[randInt(0, candidates.length - 1)];
}

function generateFloorGraph(gridW, gridH) {
  // Spanning tree via randomized DFS + extra loops for tactical stealth routes
  const rooms = [];
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      rooms.push({
        x,
        y,
        doors: { N: null, S: null, W: null, E: null }, // null | { locked: bool }
      });
    }
  }

  const getRoom = (x, y) => rooms[y * gridW + x];
  const visited = new Set();
  const stack = [{ x: 0, y: gridH - 1 }];
  visited.add(`0,${gridH - 1}`);

  const dirs = [
    { d: 'N', opp: 'S', dx: 0, dy: -1 },
    { d: 'S', opp: 'N', dx: 0, dy: 1 },
    { d: 'W', opp: 'E', dx: -1, dy: 0 },
    { d: 'E', opp: 'W', dx: 1, dy: 0 },
  ];

  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const neighbors = shuffle(dirs)
      .map((dir) => ({ ...dir, nx: cur.x + dir.dx, ny: cur.y + dir.dy }))
      .filter((n) => n.nx >= 0 && n.nx < gridW && n.ny >= 0 && n.ny < gridH && !visited.has(`${n.nx},${n.ny}`));

    if (neighbors.length === 0) {
      stack.pop();
    } else {
      const next = neighbors[0];
      getRoom(cur.x, cur.y).doors[next.d] = { locked: false };
      getRoom(next.nx, next.ny).doors[next.opp] = { locked: false };
      visited.add(`${next.nx},${next.ny}`);
      stack.push({ x: next.nx, y: next.ny });
    }
  }

  // Add extra loop connections (~45% chance per remaining wall) so castle feels open & stealth-friendly
  for (let y = 0; y < gridH; y++) {
    for (let x = 0; x < gridW; x++) {
      const rm = getRoom(x, y);
      if (x + 1 < gridW && !rm.doors.E && Math.random() < 0.45) {
        const locked = Math.random() < 0.25;
        rm.doors.E = { locked };
        getRoom(x + 1, y).doors.W = { locked };
      }
      if (y + 1 < gridH && !rm.doors.S && Math.random() < 0.45) {
        const locked = Math.random() < 0.25;
        rm.doors.S = { locked };
        getRoom(x, y + 1).doors.N = { locked };
      }
    }
  }

  return rooms;
}

function makeGuard(grid, forbidden, isSS, floorIdx, rankIdx) {
  const spawn = findFreeTile(grid, forbidden, false);
  forbidden.add(`${spawn.c},${spawn.r}`);

  // Build 2-3 patrol waypoints around open floor tiles
  const waypoints = [{ x: spawn.c * TILE + TILE / 2, y: spawn.r * TILE + TILE / 2 }];
  for (let i = 0; i < 2; i++) {
    const wp = findFreeTile(grid, new Set(), false);
    waypoints.push({ x: wp.c * TILE + TILE / 2, y: wp.r * TILE + TILE / 2 });
  }

  // Random guard drop loot
  const roll = Math.random();
  let loot = null;
  if (roll < 0.48) {
    loot = { type: ITEM_TYPES.BULLETS, amount: randInt(2, 4), label: 'AMMO CLIP' };
  } else if (roll < 0.65) {
    loot = { type: ITEM_TYPES.KEY, amount: 1, label: 'BRASS KEY' };
  } else if (roll < 0.78) {
    loot = { type: ITEM_TYPES.GRENADES, amount: 1, label: 'GRENADE' };
  } else if (!isSS && roll < 0.90) {
    loot = { type: ITEM_TYPES.UNIFORM, amount: 1, label: 'GUARD UNIFORM' };
  } else {
    loot = { type: ITEM_TYPES.BULLETS, amount: 3, label: '3 BULLETS' };
  }

  const baseHp = isSS ? (3 + (rankIdx >= 4 ? 1 : 0)) : 1;
  const speed = isSS ? 34 + Math.min(10, rankIdx * 2) : 21 + floorIdx * 2 + Math.min(6, rankIdx);

  return {
    id: `g_${Math.random().toString(36).slice(2, 8)}`,
    isSS,
    x: spawn.c * TILE + TILE / 2,
    y: spawn.r * TILE + TILE / 2,
    angle: randInt(0, 7) * (Math.PI / 4),
    hp: baseHp,
    maxHp: baseHp,
    speed,
    patrolSpeed: isSS ? 20 : 14,
    state: 'patrol', // patrol | alert | chase | surrender | dead
    alertTimer: 0,
    fireCooldown: 0.6 + Math.random() * 0.5,
    surrenderTimer: 0,
    waypoints,
    wpIndex: 1,
    waitTimer: 0.4 + Math.random() * 1.2,
    walkPhase: 0,
    moving: false,
    shoutText: '',
    shoutTimer: 0,
    searched: false,
    loot,
    hitFlash: 0,
  };
}

function makeChestItem(type) {
  switch (type) {
    case ITEM_TYPES.WAR_PLANS:
      return { type, amount: 1, label: 'SECRET WAR PLANS!' };
    case ITEM_TYPES.UNIFORM:
      return { type, amount: 1, label: 'GUARD UNIFORM' };
    case ITEM_TYPES.VEST:
      return { type, amount: 3, label: 'BULLETPROOF VEST' };
    case ITEM_TYPES.KEY:
      return { type, amount: 1, label: 'BRASS KEY' };
    case ITEM_TYPES.GRENADES:
      return { type, amount: randInt(1, 2), label: 'GRENADES' };
    case ITEM_TYPES.BRATWURST:
      return { type, amount: 1, label: 'BRATWURST (+1 HP)' };
    case ITEM_TYPES.SCHNAPPS:
      return { type, amount: 1, label: 'SCHNAPPS! (HIC!)' };
    case ITEM_TYPES.BULLETS:
    default:
      return { type: ITEM_TYPES.BULLETS, amount: randInt(4, 7), label: 'AMMO BOX' };
  }
}

/**
 * Generate a complete 3-floor Castle Wolfenstein layout.
 */
export function generateCastle(rankIdx = 0) {
  const numFloors = 3;
  const gridW = 3;
  const gridH = 3;
  const floors = [];

  // Choose start room on Floor 0: bottom-left (0, 2)
  const startCoord = { floor: 0, x: 0, y: 2 };

  // Choose stair coordinates connecting floors
  const stairs01 = { x: 2, y: 0 }; // Floor 0 -> Floor 1 (opposite corner from start)
  const stairs12 = { x: 0, y: 0 }; // Floor 1 -> Floor 2

  // Floor 2 special rooms: War Plans Vault & Castle Exit Gate (distinct from arrival stairs12)
  const vaultCoord = { x: 2, y: 2 };
  const exitCoord = { x: 2, y: 0 };

  const templates = ['pillars', 'barracks', 'baffles', 'alcoves', 'open_hall', 'vault'];

  // Guaranteed loot pool across floors
  const guaranteedLoot = [
    { floor: 0, item: ITEM_TYPES.UNIFORM },
    { floor: 0, item: ITEM_TYPES.VEST },
    { floor: 0, item: ITEM_TYPES.KEY },
    { floor: 0, item: ITEM_TYPES.BULLETS },
    { floor: 1, item: ITEM_TYPES.VEST },
    { floor: 1, item: ITEM_TYPES.GRENADES },
    { floor: 1, item: ITEM_TYPES.KEY },
    { floor: 1, item: ITEM_TYPES.UNIFORM },
    { floor: 2, item: ITEM_TYPES.GRENADES },
    { floor: 2, item: ITEM_TYPES.VEST },
  ];

  for (let f = 0; f < numFloors; f++) {
    const graphRooms = generateFloorGraph(gridW, gridH);
    const floorRooms = [];

    for (const gr of graphRooms) {
      const grid = createEmptyGrid();
      const isStart = f === 0 && gr.x === startCoord.x && gr.y === startCoord.y;
      const isVault = f === 2 && gr.x === vaultCoord.x && gr.y === vaultCoord.y;
      const isExit = f === 2 && gr.x === exitCoord.x && gr.y === exitCoord.y;
      const hasStairsUp = (f === 0 && gr.x === stairs01.x && gr.y === stairs01.y) ||
                          (f === 1 && gr.x === stairs12.x && gr.y === stairs12.y);
      const hasStairsDown = (f === 1 && gr.x === stairs01.x && gr.y === stairs01.y) ||
                            (f === 2 && gr.x === stairs12.x && gr.y === stairs12.y);

      const template = isStart
        ? 'start_cell'
        : isVault
          ? 'vault'
          : templates[randInt(0, templates.length - 1)];

      applyRoomTemplate(grid, template);

      // Carve doorways into perimeter walls
      if (gr.doors.N) {
        grid[0][13] = T_DOOR_N;
        grid[0][14] = T_DOOR_N;
      }
      if (gr.doors.S) {
        grid[ROOM_ROWS - 1][13] = T_DOOR_S;
        grid[ROOM_ROWS - 1][14] = T_DOOR_S;
      }
      if (gr.doors.W) {
        grid[7][0] = T_DOOR_W;
        grid[8][0] = T_DOOR_W;
      }
      if (gr.doors.E) {
        grid[7][ROOM_COLS - 1] = T_DOOR_E;
        grid[8][ROOM_COLS - 1] = T_DOOR_E;
      }

      const forbidden = new Set();
      if (isStart) {
        // Reserve player start area inside prison cell
        for (let r = 6; r <= 9; r++) {
          for (let c = 3; c <= 6; c++) forbidden.add(`${c},${r}`);
        }
      }

      // Place stairs
      let stairsUpPos = null;
      let stairsDownPos = null;
      if (hasStairsUp) {
        const pos = findFreeTile(grid, forbidden, false);
        grid[pos.r][pos.c] = T_STAIRS_UP;
        forbidden.add(`${pos.c},${pos.r}`);
        stairsUpPos = { c: pos.c, r: pos.r };
      }
      if (hasStairsDown) {
        const pos = findFreeTile(grid, forbidden, false);
        grid[pos.r][pos.c] = T_STAIRS_DOWN;
        forbidden.add(`${pos.c},${pos.r}`);
        stairsDownPos = { c: pos.c, r: pos.r };
      }

      // Place Castle Exit Gate on North outer wall of exit room (Floor 2, y=0 so North is always outer wall!)
      let exitPos = null;
      if (isExit) {
        grid[0][13] = T_EXIT;
        grid[0][14] = T_EXIT;
        clearRect(grid, 12, 1, 15, 3);
        exitPos = { c: 13, r: 0 };
      }

      // Place chests
      const chests = [];
      if (isVault) {
        // Guaranteed Secret War Plans chest in center of vault!
        const pos = findFreeTile(grid, forbidden, true);
        forbidden.add(`${pos.c},${pos.r}`);
        chests.push({
          id: `c_plans`,
          x: pos.c * TILE + TILE / 2,
          y: pos.r * TILE + TILE / 2,
          opened: false,
          openTime: 2.6,
          progress: 0,
          item: makeChestItem(ITEM_TYPES.WAR_PLANS),
          isPlansVault: true,
        });
      } else if (isStart) {
        // One helpful starter chest right outside the cell partition
        const pos = { c: 15, r: 4 };
        grid[pos.r][pos.c] = T_FLOOR;
        forbidden.add(`${pos.c},${pos.r}`);
        chests.push({
          id: `c_start`,
          x: pos.c * TILE + TILE / 2,
          y: pos.r * TILE + TILE / 2,
          opened: false,
          openTime: 1.5,
          progress: 0,
          item: makeChestItem(ITEM_TYPES.BULLETS),
        });
      } else {
        const chestCount = Math.random() < 0.72 ? 1 : (Math.random() < 0.35 ? 2 : 0);
        for (let i = 0; i < chestCount; i++) {
          const pos = findFreeTile(grid, forbidden, false);
          forbidden.add(`${pos.c},${pos.r}`);
          const randomPool = [
            ITEM_TYPES.BULLETS,
            ITEM_TYPES.BULLETS,
            ITEM_TYPES.GRENADES,
            ITEM_TYPES.KEY,
            ITEM_TYPES.BRATWURST,
            ITEM_TYPES.SCHNAPPS,
            ITEM_TYPES.VEST,
            ITEM_TYPES.UNIFORM,
          ];
          const itemType = randomPool[randInt(0, randomPool.length - 1)];
          chests.push({
            id: `c_${f}_${gr.x}_${gr.y}_${i}`,
            x: pos.c * TILE + TILE / 2,
            y: pos.r * TILE + TILE / 2,
            opened: false,
            openTime: 1.6 + Math.random() * 1.4,
            progress: 0,
            item: makeChestItem(itemType),
          });
        }
      }

      // Place guards
      const guards = [];
      if (!isStart) {
        let guardCount = f === 0 ? randInt(1, 2) : f === 1 ? randInt(1, 2) : randInt(2, 3);
        if (isVault || isExit) guardCount = Math.max(2, guardCount);
        if (rankIdx >= 3 && Math.random() < 0.35) guardCount = Math.min(3, guardCount + 1);

        for (let i = 0; i < guardCount; i++) {
          const ssChance = isVault || isExit
            ? 0.55
            : f === 0
              ? (rankIdx >= 2 ? 0.15 : 0)
              : f === 1
                ? 0.28
                : 0.45;
          const isSS = (isExit && i === 0) || (isVault && i === 0) || Math.random() < ssChance;
          guards.push(makeGuard(grid, forbidden, isSS, f, rankIdx));
        }
      }

      // Lock one door on vault room for authentic infiltration feel (unless only 1 door — keep unlockable via lockpick/key/grenade!)
      if (isVault) {
        for (const d of ['N', 'S', 'W', 'E']) {
          if (gr.doors[d]) {
            gr.doors[d].locked = true;
            // Sync neighbor door
            const offsets = { N: [0, -1, 'S'], S: [0, 1, 'N'], W: [-1, 0, 'E'], E: [1, 0, 'W'] };
            const [dx, dy, opp] = offsets[d];
            const nb = graphRooms.find((r) => r.x === gr.x + dx && r.y === gr.y + dy);
            if (nb && nb.doors[opp]) nb.doors[opp].locked = true;
          }
        }
      }

      floorRooms.push({
        floor: f,
        x: gr.x,
        y: gr.y,
        grid,
        doors: gr.doors,
        chests,
        guards,
        stairsUpPos,
        stairsDownPos,
        exitPos,
        isStart,
        isVault,
        isExit,
        visited: isStart,
        label: isStart
          ? 'CELL BLOCK'
          : isVault
            ? 'WAR ROOM VAULT'
            : isExit
              ? 'CASTLE GATE'
              : hasStairsUp
                ? 'STAIRWELL UP'
                : hasStairsDown
                  ? 'STAIRWELL DOWN'
                  : `ROOM ${gr.y * gridW + gr.x + 1}`,
      });
    }

    // Inject guaranteed floor loot into existing chests on this floor
    const floorChests = floorRooms.flatMap((rm) => rm.chests).filter((c) => !c.isPlansVault && c.id !== 'c_start');
    const needed = guaranteedLoot.filter((g) => g.floor === f);
    const shuffledChests = shuffle(floorChests);
    needed.forEach((req, idx) => {
      if (shuffledChests[idx]) {
        shuffledChests[idx].item = makeChestItem(req.item);
      }
    });

    floors.push({
      index: f,
      name: FLOOR_NAMES[f],
      gridW,
      gridH,
      rooms: floorRooms,
    });
  }

  return {
    floors,
    startCoord,
    vaultCoord: { floor: 2, ...vaultCoord },
    exitCoord: { floor: 2, ...exitCoord },
    getRoom(floor, x, y) {
      const fl = this.floors[floor];
      if (!fl || x < 0 || x >= fl.gridW || y < 0 || y >= fl.gridH) return null;
      return fl.rooms[y * fl.gridW + x];
    },
  };
}
