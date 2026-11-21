// Apple IIe Hi-Res Display Constants (280x192 Mixed Mode)
// Top 280x160 = Playfield Graphics, Bottom 280x32 = 4 lines of 40-col Apple II Text
export const SCREEN_W = 280;
export const SCREEN_H = 192;
export const PLAY_H = 160;
export const HUD_Y = 160;
export const HUD_H = 32;

// Room grid inside playfield: 28 columns x 16 rows of 10x10 pixel tiles = 280x160
export const TILE = 10;
export const ROOM_COLS = 28;
export const ROOM_ROWS = 16;

// Tile types
export const T_FLOOR = 0;
export const T_WALL = 1;
export const T_DOOR_N = 2;
export const T_DOOR_S = 3;
export const T_DOOR_W = 4;
export const T_DOOR_E = 5;
export const T_STAIRS_UP = 6;
export const T_STAIRS_DOWN = 7;
export const T_EXIT = 8;

// Directions (8-way clockwise from North)
export const DIR = [
  { dx: 0, dy: -1, name: 'N' },
  { dx: 0.7071, dy: -0.7071, name: 'NE' },
  { dx: 1, dy: 0, name: 'E' },
  { dx: 0.7071, dy: 0.7071, name: 'SE' },
  { dx: 0, dy: 1, name: 'S' },
  { dx: -0.7071, dy: 0.7071, name: 'SW' },
  { dx: -1, dy: 0, name: 'W' },
  { dx: -0.7071, dy: -0.7071, name: 'NW' },
];

// Authentic Apple IIe Monitor Palettes
// Color palette uses Apple II Hi-Res 6 colors: Black, White, Green, Violet, Orange, Blue
export const PALETTES = {
  color: {
    id: 'color',
    label: 'HI-RES COLOR',
    bg: '#000000',
    wall: '#14A5FF',       // Apple II Hi-Res Blue stonework
    wallHi: '#FFFFFF',     // Highlight mortar
    wallDark: '#0A4E82',   // Shaded inner brick
    floorDot: '#1A1A28',   // Subtle floor grid pixel
    player: '#FFFFFF',     // Prisoner white/gray
    playerAccent: '#14F53C',
    playerUniform: '#14F53C', // Disguise uniform green
    guard: '#FF6A00',      // Regular guard orange
    guardAccent: '#FFFFFF',
    ss: '#E31EFF',         // SS Stormtrooper violet
    ssAccent: '#FF6A00',   // SS trim
    chest: '#FF6A00',
    chestOpen: '#8C3B00',
    door: '#14F53C',
    doorLocked: '#E31EFF',
    stairs: '#14F53C',
    exit: '#14F53C',
    bullet: '#FFFFFF',
    grenade: '#14F53C',
    blast1: '#FFFFFF',
    blast2: '#FF6A00',
    blast3: '#E31EFF',
    text: '#FFFFFF',
    textHi: '#14F53C',
    textWarn: '#FF6A00',
    textAlert: '#E31EFF',
    hudBg: '#000000',
    hudBorder: '#14A5FF',
    blood: '#E31EFF',
  },
  green: {
    id: 'green',
    label: 'GREEN PHOSPHOR',
    bg: '#020B04',
    wall: '#22C94C',
    wallHi: '#7DFF9B',
    wallDark: '#0D521E',
    floorDot: '#08240E',
    player: '#7DFF9B',
    playerAccent: '#33FF66',
    playerUniform: '#22C94C',
    guard: '#33FF66',
    guardAccent: '#7DFF9B',
    ss: '#B8FFC9',
    ssAccent: '#22C94C',
    chest: '#33FF66',
    chestOpen: '#136B28',
    door: '#7DFF9B',
    doorLocked: '#22C94C',
    stairs: '#7DFF9B',
    exit: '#B8FFC9',
    bullet: '#B8FFC9',
    grenade: '#7DFF9B',
    blast1: '#B8FFC9',
    blast2: '#33FF66',
    blast3: '#136B28',
    text: '#33FF66',
    textHi: '#B8FFC9',
    textWarn: '#7DFF9B',
    textAlert: '#B8FFC9',
    hudBg: '#020B04',
    hudBorder: '#22C94C',
    blood: '#136B28',
  },
  amber: {
    id: 'amber',
    label: 'AMBER CRT',
    bg: '#0B0600',
    wall: '#CC7A00',
    wallHi: '#FFD066',
    wallDark: '#573100',
    floorDot: '#211200',
    player: '#FFD066',
    playerAccent: '#FFB000',
    playerUniform: '#CC7A00',
    guard: '#FFB000',
    guardAccent: '#FFD066',
    ss: '#FFE6A3',
    ssAccent: '#CC7A00',
    chest: '#FFB000',
    chestOpen: '#6B3D00',
    door: '#FFD066',
    doorLocked: '#CC7A00',
    stairs: '#FFD066',
    exit: '#FFE6A3',
    bullet: '#FFE6A3',
    grenade: '#FFD066',
    blast1: '#FFE6A3',
    blast2: '#FFB000',
    blast3: '#6B3D00',
    text: '#FFB000',
    textHi: '#FFE6A3',
    textWarn: '#FFD066',
    textAlert: '#FFE6A3',
    hudBg: '#0B0600',
    hudBorder: '#CC7A00',
    blood: '#6B3D00',
  },
};

export const RANKS = [
  'PRIVATE',
  'CORPORAL',
  'SERGEANT',
  'LIEUTENANT',
  'CAPTAIN',
  'MAJOR',
  'COLONEL',
  'GENERAL',
];

export const ITEM_TYPES = {
  BULLETS: 'BULLETS',
  GRENADES: 'GRENADES',
  UNIFORM: 'UNIFORM',
  VEST: 'VEST',
  KEY: 'KEY',
  BRATWURST: 'BRATWURST',
  SCHNAPPS: 'SCHNAPPS',
  WAR_PLANS: 'WAR_PLANS',
};

export const MAX_BULLETS = 10;
export const MAX_GRENADES = 3;
export const MAX_KEYS = 5;
export const MAX_VEST_HP = 3;
