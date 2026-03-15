// ─────────────────────────────────────────────────────────────
//  src/roadThemes.ts
//
//  Add new themes here — that's all you ever need to touch.
//  Every field except id, label, mapStyle, and roads is optional.
// ─────────────────────────────────────────────────────────────

import type { POIIconRule, IconSprite } from './poiIcons'

// ── GTA 5 sprite sheet helper ─────────────────────────────────
// Drop the sprite sheet at /public/icons/gta5/sprites.png
// Adjust sheetW/sheetH/cellW/cellH if your sheet differs.
function gta5Sprite(col: number, row: number): IconSprite {
  const cellW = 50, cellH = 50
  return {
    type: 'sprite',
    url: '/icons/gta5/sprites.png',
    x: col * cellW,
    y: row * cellH,
    cellW,
    cellH,
  }
}

export interface RoadTheme {
  id: string   // unique key, used internally
  label: string   // shown in the dropdown

  // Mapbox hosted base style.
  // Options: dark-v11 | light-v11 | streets-v12 |
  //          satellite-streets-v12 | navigation-night-v1 | navigation-day-v1
  mapStyle: string

  // ── Road colors (required) ───────────────────────────────
  roads: {
    local: string   // small/local road fill
    primary: string   // primary road fill
    highway: string   // motorway/trunk fill
    casing: string   // outline/glow on all roads
    localOpacity?: number   // 0–1 opacity for local/minor roads (default 1)
    primaryOpacity?: number   // 0–1 opacity for primary roads (default 1)
    highwayOpacity?: number   // 0–1 opacity for motorways/highways (default 1)
  }

  // ── Texture ──────────────────────────────────────────────
  // Path to a PNG in /public/textures/ tiled along road lines.
  // If the file doesn't exist yet a placeholder stripe pattern
  // is generated automatically using the road colors.
  textureUrl?: string

  // How large each texture tile appears on the road.
  //   1.0 = default size (matches the source image pixel dimensions)
  //   2.0 = tiles are 2x bigger (fewer, coarser repeats)
  //   0.5 = tiles are half size (more, finer repeats)
  textureScale?: number

  // Shift the texture position.
  //   x: 0–1 fraction, rolls the image horizontally (where the tile starts along the road)
  //   y: pixels, shifts the line sideways from the road center (+ = right, - = left)
  textureOffset?: { x: number; y: number }

  // ── Camera defaults ──────────────────────────────────────
  pitch?: number   // map tilt — 0 = flat top-down, 60 = angled 3D
  bearing?: number   // map rotation in degrees (0 = north up)
  zoom?: number   // default zoom when this theme loads

  // ── Fog / atmosphere ─────────────────────────────────────
  fog?: {
    color: string   // fog color near the horizon
    highColor: string   // sky color above the horizon
    horizonBlend: number   // 0–1, how sharp the horizon edge is
    rangeStart: number   // zoom distance fog begins
    rangeEnd: number   // zoom distance fog is fully opaque
  }

  // ── 3D buildings ─────────────────────────────────────────
  buildings?: {
    visible: boolean
    color: string   // building side/face color
    opacity: number   // 0–1
    height?: number   // height multiplier (1 = real, 2 = double, etc.)
    topColor?: string   // roof color — defaults to color if omitted
    glowColor?: string   // adds a second semi-transparent layer for neon glow effect
    glowOpacity?: number   // opacity of glow layer (0–1, default 0.3)
    ambientLight?: number   // 0–1, how bright the unlit sides are (default 0.3)
    textureUrl?: string   // PNG tiled over building faces (replaces color when set)
  }

  // ── Water ────────────────────────────────────────────────
  water?: {
    color: string
    opacity: number   // 0–1
    textureUrl?: string   // PNG tiled over water fill
  }

  // ── Labels / text ────────────────────────────────────────
  labels?: {
    color: string   // text fill color
    halo: string   // text outline / glow color
    visible: boolean
  }

  // ── Land (base ground color) ─────────────────────────────
  land?: {
    color: string
    textureUrl?: string   // PNG tiled over ground/land fill
  }

  // ── Style transition speed ───────────────────────────────
  transitionDuration?: number   // ms, default 300

  // ── POI icons ────────────────────────────────────────────
  // Per-theme store icons shown above map POIs.
  // Drop PNGs in /public/icons/<theme-name>/
  poiIcons?: POIIconRule[]
}

// ── Theme definitions ─────────────────────────────────────────
// To add a new theme: copy any block, give it a new id + label,
// tweak the values. Everything is a placeholder — swap in real
// values whenever you're ready.

export const themes: RoadTheme[] = [
  {
    id: 'neon',
    label: 'Neon Night',
    mapStyle: 'mapbox://styles/mapbox/dark-v11',
    pitch: 0,
    bearing: 0,
    roads: {
      local: '#1a1a2e',
      primary: '#0f3460',
      highway: '#0a2040',
      casing: '#00ff88',
      localOpacity: 0.4,
      primaryOpacity: 0.75,
      highwayOpacity: 1.0,
    },
    textureUrl: '/textures/neon.png',
    fog: {
      color: '#0d1b2a',
      highColor: '#001a0d',
      horizonBlend: 0.1,
      rangeStart: 0.5,
      rangeEnd: 10,
    },
    buildings: {
      visible: true,
      color: '#0d1b2a',
      opacity: 0.9,
    },
    water: {
      color: '#020d1a',
      opacity: 1,
    },
    labels: {
      color: '#00ff88',
      halo: '#001a0d',
      visible: true,
    },
    land: {
      color: '#0d0d0d',
    },
    transitionDuration: 400,
  },

  {
    id: 'cyberpunk',
    label: 'Cyberpunk 2077',
    mapStyle: 'mapbox://styles/mapbox/dark-v11',
    pitch: 60,
    bearing: 0,
    roads: {
      local: '#003a4a',
      primary: '#005a70',
      highway: '#007a96',
      casing: '#00e5ff',
      localOpacity: 0.6,
      primaryOpacity: 0.85,
      highwayOpacity: 1.0,
    },
    textureUrl: '/textures/cyberpunk.png',
    fog: {
      color: '#1a002e',
      highColor: '#0d0020',
      horizonBlend: 0.2,
      rangeStart: 0.5,
      rangeEnd: 8,
    },
    buildings: {
      visible: true,
      color: '#CF3634',
      opacity: 1.0,
      height: 2.5,
      topColor: '#3a0000',
      glowColor: '#CF3634',
      glowOpacity: 0.15,
      ambientLight: 0.15,
    },
    water: {
      color: '#0a001a',
      opacity: 1,
    },
    labels: {
      color: '#00e5ff',
      halo: '#000a0d',
      visible: true,
    },
    land: {
      color: '#01090cff',
    },
    transitionDuration: 500,
  },

  {
    id: 'Pixel',
    label: 'Pixel',
    mapStyle: 'mapbox://styles/mapbox/dark-v11',
    pitch: 0,
    bearing: 0,
    roads: {
      local: '#2a2a2a',
      primary: '#1a1a1a',
      highway: '#111111',
      casing: '#666666',
      localOpacity: 0.5,
      primaryOpacity: 0.8,
      highwayOpacity: 1.0,
    },
    textureUrl: '/textures/pixel/road.png',
    buildings: {
      visible: true,
      color: '#1a1a1a',
      opacity: 0.8,
      textureUrl: '/textures/pixel/building.png',
    },
    water: {
      color: '#0a0a12',
      opacity: 1,
      textureUrl: '/textures/pixel/water.png',
    },
    labels: {
      color: '#cccccc',
      halo: '#111111',
      visible: true,
    },
    land: {
      color: '#1F414D',
      textureUrl: '/textures/pixel/ground.png',
    },
    transitionDuration: 300,
  },

  {
    id: 'retro',
    label: 'Retro',
    mapStyle: 'mapbox://styles/mapbox/light-v11',
    pitch: 0,
    bearing: 0,
    roads: {
      local: '#d4b483',
      primary: '#c8963c',
      highway: '#b8742a',
      casing: '#7a3f10',
      localOpacity: 0.6,
      primaryOpacity: 0.85,
      highwayOpacity: 1.0,
    },
    textureUrl: '/textures/retro.png',
    buildings: {
      visible: true,
      color: '#e8d5a3',
      opacity: 0.7,
    },
    water: {
      color: '#a8c8d8',
      opacity: 0.9,
    },
    labels: {
      color: '#4a2800',
      halo: '#f5e8c8',
      visible: true,
    },
    land: {
      color: '#f5e8c8',
    },
    transitionDuration: 300,
  },

  {
    id: 'midnight',
    label: 'Midnight',
    mapStyle: 'mapbox://styles/mapbox/navigation-night-v1',
    pitch: 0,
    bearing: 0,
    roads: {
      local: '#0d1b2a',
      primary: '#1b3a5c',
      highway: '#0a2744',
      casing: '#4fc3f7',
      localOpacity: 0.45,
      primaryOpacity: 0.7,
      highwayOpacity: 1.0,
    },
    fog: {
      color: '#0a1628',
      highColor: '#050d1a',
      horizonBlend: 0.05,
      rangeStart: 0.5,
      rangeEnd: 12,
    },
    buildings: {
      visible: true,
      color: '#0d1b2a',
      opacity: 0.85,
    },
    water: {
      color: '#050d1a',
      opacity: 1,
    },
    labels: {
      color: '#4fc3f7',
      halo: '#0a1628',
      visible: true,
    },
    land: {
      color: '#080f1a',
    },
    transitionDuration: 300,
  },

  {
    id: 'satellite',
    label: 'Satellite',
    mapStyle: 'mapbox://styles/mapbox/satellite-streets-v12',
    pitch: 0,
    bearing: 0,
    roads: {
      local: '#2a2a2a',
      primary: '#333333',
      highway: '#444444',
      casing: '#ffffff',
    },
    labels: {
      color: '#ffffff',
      halo: '#000000',
      visible: true,
    },
    transitionDuration: 400,
  },

  {
    id: 'gta5',
    label: 'GTA V',
    mapStyle: 'mapbox://styles/mapbox/dark-v11',
    pitch: 0,
    bearing: 0,
    roads: {
      local: '#EBEBEB',
      primary: '#EBEBEB',
      highway: '#EBEBEB',
      casing: '#EBEBEB',
      localOpacity: 0.7,
      primaryOpacity: 0.85,
      highwayOpacity: 1.0,
    },
    buildings: {
      visible: true,
      color: '#2a2a2a',
      topColor: '#383838',
      opacity: 0.95,
      height: 1.0,
    },
    water: {
      color: '#1a2535',
      opacity: 1,
    },
    labels: {
      color: '#ffffff',
      halo: '#0a0a0a',
      visible: true,
    },
    land: {
      color: '#0f0f0f',
    },
    transitionDuration: 400,
    poiIcons: [
      // [4,1]  t-shirt        — clothing store
      { icon: gta5Sprite(4, 1), maki: ['clothing-store', 'department-store'], categories: ['Clothing Store', 'Boutique', 'Department Store', 'Fashion'], size: 28 },
      // [2,1]  scissors       — barber / hair salon
      { icon: gta5Sprite(2, 1), maki: ['hairdresser'], categories: ['Barbershop', 'Hair Salon', 'Nail Salon', 'Beauty Salon'], size: 28 },
      // [1,2]  martini glass  — bar / pub
      { icon: gta5Sprite(1, 2), maki: ['bar'], categories: ['Bar', 'Pub', 'Cocktail Bar', 'Sports Bar', 'Dive Bar'], size: 28 },
      // [3,3]  high heel      — nightclub / lounge
      { icon: gta5Sprite(3, 3), maki: ['music'], categories: ['Nightclub', 'Night Club', 'Club', 'Lounge', 'Dance Club'], size: 28 },
      // [13,2] pistol         — gun shop / ammo
      // [0,6]  dollar sign    — bank / ATM
      { icon: gta5Sprite(0, 6), maki: ['bank'], categories: ['Bank', 'ATM', 'Credit Union', 'Financial'], size: 28 },
      // [13,0] medical star   — hospital / clinic
      { icon: gta5Sprite(13, 0), maki: ['hospital', 'doctor'], categories: ['Hospital', 'Clinic', 'Medical Center', 'Urgent Care'], size: 28 },
      // [6,11] pill / capsule — pharmacy
      { icon: gta5Sprite(6, 11), maki: ['pharmacy'], categories: ['Pharmacy', 'Drug Store', 'Chemist'], size: 28 },
      // [0,2]  airplane       — airport
      { icon: gta5Sprite(0, 2), maki: ['airport'], categories: ['Airport', 'Airfield', 'Aerodrome'], size: 28 },
      // [14,0] helicopter     — helipad
      { icon: gta5Sprite(14, 0), maki: ['helipad'], categories: ['Helipad', 'Helicopter'], size: 28 },
      // [3,9]  anchor         — marina / harbor
      { icon: gta5Sprite(3, 9), maki: ['marina', 'harbor'], categories: ['Marina', 'Harbor', 'Boat Dock', 'Pier'], size: 28 },
      // [12,3] music note     — music venue
      // [5,11] wrench         — auto repair / mechanic
      { icon: gta5Sprite(5, 11), maki: ['car-repair'], categories: ['Auto Shop', 'Car Repair', 'Mechanic', 'Auto Parts'], size: 28 },
      // [6,6]  motorcycle     — dealership / rental
      { icon: gta5Sprite(6, 6), maki: ['car'], categories: ['Car Dealership', 'Car Rental', 'Motorcycle Shop'], size: 28 },
      // [7,7]  lips           — tattoo / body art
      { icon: gta5Sprite(7, 7), maki: ['tattoo'], categories: ['Tattoo', 'Tattoo Parlor', 'Body Art', 'Piercing'], size: 28 },
      // [11,2] golf flag      — golf course
      // [6,5]  camera         — photography
      { icon: gta5Sprite(6, 5), maki: ['camera', 'photo'], categories: ['Photography', 'Camera Store'], size: 28 },
      // [9,9]  theater mask   — theater / cinema
      { icon: gta5Sprite(9, 9), maki: ['theatre', 'cinema'], categories: ['Theater', 'Theatre', 'Cinema', 'Movie Theater'], size: 28 },
      // [0,12] bottle         — liquor store
      { icon: gta5Sprite(0, 12), maki: ['alcohol'], categories: ['Liquor Store', 'Wine Shop', 'Off Licence', 'LCBO'], size: 28 },
      // [10,8] van / truck    — delivery / logistics
      // [2,8]  submarine      — water sports / dive shop
      // [14,3] marijuana leaf — dispensary
      // [12,0] badge / shield — police station
    ] satisfies POIIconRule[],
  },
]

export const DEFAULT_THEME_ID = 'neon'
