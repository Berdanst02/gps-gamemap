// ─────────────────────────────────────────────────────────────
//  src/mapStyles.ts
// ─────────────────────────────────────────────────────────────

import type { Map as MapboxMap } from 'mapbox-gl'
import type { RoadTheme } from './roadThemes'
import { applyPOI, teardown as teardownPOI } from './mapPOI'

const TEXTURE_IMAGE_ID  = 'road-texture-img'
const TEXTURE_LAYER_ID  = 'road-texture-layer'
const BLDG_TEX_IMAGE_ID = 'bldg-texture-img'
const WATER_TEX_IMAGE_ID = 'water-texture-img'
const LAND_TEX_IMAGE_ID  = 'land-texture-img'

// Info object passed to the optional onTextureReady callback
export interface TextureDebugInfo {
  imageData:     ImageData
  url:           string    // file path or '(generated)'
  scale:         number
  offsetX:       number    // 0–1 fraction
  offsetY:       number    // pixels
  isPlaceholder: boolean
}

// ── Main entry point ──────────────────────────────────────────
// onTextureReady is optional — pass it from App to power the debugger
export function applyTheme(
  map: MapboxMap,
  theme: RoadTheme,
  onTextureReady?: (info: TextureDebugInfo) => void,
) {
  applyCamera(map, theme)
  applyRoadColors(map, theme)
  applyRoadTexture(map, theme, onTextureReady)
  applyFog(map, theme)
  applyBuildings(map, theme)
  applyWater(map, theme)
  applyLabels(map, theme)
  applyLand(map, theme)
  teardownPOI()
  applyPOI(map, theme)
}

// ── Camera ────────────────────────────────────────────────────
function applyCamera(map: MapboxMap, theme: RoadTheme) {
  map.easeTo({
    pitch:    theme.pitch   ?? 0,
    bearing:  theme.bearing ?? 0,
    zoom:     theme.zoom    ?? map.getZoom(),
    duration: theme.transitionDuration ?? 300,
  })
}

// ── Road colors ───────────────────────────────────────────────
function applyRoadColors(map: MapboxMap, theme: RoadTheme) {
  function set(layerId: string, property: string, value: unknown) {
    try {
      if (map.getLayer(layerId)) map.setPaintProperty(layerId, property as any, value)
    } catch (_) {}
  }
  const {
    local, primary, highway, casing,
    localOpacity   = 1,
    primaryOpacity = 1,
    highwayOpacity = 1,
  } = theme.roads

  // Colors
  set('road-minor',                    'line-color', local)
  set('road-street',                   'line-color', local)
  set('road-minor-case',               'line-color', casing)
  set('road-street-case',              'line-color', casing)
  set('road-secondary-tertiary',       'line-color', local)
  set('road-secondary-tertiary-case',  'line-color', casing)
  set('road-primary',                  'line-color', primary)
  set('road-primary-case',             'line-color', casing)
  set('road-motorway-trunk',           'line-color', highway)
  set('road-motorway-trunk-case',      'line-color', casing)
  set('road-motorway_link',            'line-color', highway)
  set('road-link',                     'line-color', primary)
  set('road-link-case',                'line-color', casing)
  set('rail',                          'line-color', '#2f3948')
  set('rail-tracks',                   'line-color', '#3a4a5a')

  // Per-type opacity
  ;['road-minor', 'road-street', 'road-secondary-tertiary'].forEach(
    id => set(id, 'line-opacity', localOpacity)
  )
  ;['road-primary', 'road-link'].forEach(
    id => set(id, 'line-opacity', primaryOpacity)
  )
  ;['road-motorway-trunk', 'road-motorway_link'].forEach(
    id => set(id, 'line-opacity', highwayOpacity)
  )
}

// ── Road texture ──────────────────────────────────────────────
function applyRoadTexture(
  map: MapboxMap,
  theme: RoadTheme,
  onTextureReady?: (info: TextureDebugInfo) => void,
) {
  if (map.getLayer(TEXTURE_LAYER_ID)) map.removeLayer(TEXTURE_LAYER_ID)
  if (map.hasImage(TEXTURE_IMAGE_ID)) map.removeImage(TEXTURE_IMAGE_ID)

  if (!theme.textureUrl) return

  const offsetX = theme.textureOffset?.x ?? 0
  const offsetY = theme.textureOffset?.y ?? 0

  map.loadImage(theme.textureUrl, (error, image) => {
    if (error || !image) {
      console.info(`[mapStyles] "${theme.textureUrl}" not found — using placeholder.`)
      const imageData = buildGeneratedTexture(theme)
      registerAndAttach(map, imageData, offsetY)
      onTextureReady?.({ imageData, url: '(generated)', scale: theme.textureScale ?? 1, offsetX, offsetY, isPlaceholder: true })
      return
    }

    const scale     = theme.textureScale ?? 1.0
    const imageData = processImage(image as ImageBitmap, scale, offsetX)
    registerAndAttach(map, imageData, offsetY)
    onTextureReady?.({ imageData, url: theme.textureUrl!, scale, offsetX, offsetY, isPlaceholder: false })
  })
}

// Scale + horizontally roll a source image
function processImage(source: ImageBitmap | HTMLImageElement, scale: number, offsetX: number): ImageData {
  const w = Math.round((source.width  || 64) * scale)
  const h = Math.round((source.height || 64) * scale)

  const canvas = document.createElement('canvas')
  canvas.width  = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h)

  return rollHorizontally(ctx.getImageData(0, 0, w, h), offsetX)
}

// Roll an ImageData horizontally by offsetX (0–1 fraction)
function rollHorizontally(src: ImageData, offsetX: number): ImageData {
  if (offsetX === 0) return src
  const { width, height, data } = src
  const shift  = Math.round(offsetX * width) % width
  const result = new ImageData(width, height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcX   = (x + shift + width) % width
      const si     = (y * width + srcX) * 4
      const di     = (y * width + x)    * 4
      result.data[di]     = data[si]
      result.data[di + 1] = data[si + 1]
      result.data[di + 2] = data[si + 2]
      result.data[di + 3] = data[si + 3]
    }
  }
  return result
}

// Build the striped placeholder ImageData
function buildGeneratedTexture(theme: RoadTheme): ImageData {
  const scale = theme.textureScale ?? 1.0
  const size  = Math.round(64 * scale)
  const offsetX = theme.textureOffset?.x ?? 0

  const canvas = document.createElement('canvas')
  canvas.width  = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = theme.roads.highway
  ctx.fillRect(0, 0, size, size)

  ctx.strokeStyle = theme.roads.casing
  ctx.globalAlpha = 0.35
  ctx.lineWidth   = 3
  for (let i = -size; i < size * 2; i += 12) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i + size, size)
    ctx.stroke()
  }

  ctx.globalAlpha = 0.6
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(0, size / 2)
  ctx.lineTo(size, size / 2)
  ctx.stroke()

  return rollHorizontally(ctx.getImageData(0, 0, size, size), offsetX)
}

function registerAndAttach(map: MapboxMap, imageData: ImageData, lineOffset: number) {
  if (map.hasImage(TEXTURE_IMAGE_ID)) map.removeImage(TEXTURE_IMAGE_ID)
  map.addImage(TEXTURE_IMAGE_ID, imageData, { width: imageData.width, height: imageData.height } as any)
  attachTextureLayer(map, lineOffset)
}

function attachTextureLayer(map: MapboxMap, lineOffset: number) {
  if (map.getLayer(TEXTURE_LAYER_ID)) return
  map.addLayer({
    id:     TEXTURE_LAYER_ID,
    type:   'line',
    source: 'composite',
    'source-layer': 'road',
    filter: ['in', ['get', 'class'],
      ['literal', ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'street']],
    ],
    paint: {
      'line-pattern': TEXTURE_IMAGE_ID,
      'line-offset':  lineOffset,
      'line-width': ['interpolate', ['linear'], ['zoom'],
        10, 1,
        14, 5,
        18, 14,
      ],
    },
  })
}

// ── Fog ───────────────────────────────────────────────────────
function applyFog(map: MapboxMap, theme: RoadTheme) {
  if (!theme.fog) { map.setFog({}); return }
  map.setFog({
    color:            theme.fog.color,
    'high-color':     theme.fog.highColor,
    'horizon-blend':  theme.fog.horizonBlend,
    'star-intensity': 0,
  })
}

// ── 3D buildings ──────────────────────────────────────────────
// Layer IDs we own — safe to remove/re-add on every theme switch
const BLDG_LAYER_ID      = 'custom-buildings-3d'
const BLDG_GLOW_LAYER_ID = 'custom-buildings-glow'
// Flat footprint layers that come from the base style
const BASE_BLDG_LAYERS   = ['building', 'building-outline']

function applyBuildings(map: MapboxMap, theme: RoadTheme) {
  // Remove our custom layers so we can re-add fresh ones
  ;[BLDG_GLOW_LAYER_ID, BLDG_LAYER_ID].forEach(id => {
    try { if (map.getLayer(id)) map.removeLayer(id) } catch (_) {}
  })
  if (map.hasImage(BLDG_TEX_IMAGE_ID)) map.removeImage(BLDG_TEX_IMAGE_ID)

  const b = theme.buildings

  // Hide the flat 2D base-style building footprints — they clip through extrusions
  BASE_BLDG_LAYERS.forEach(id => {
    try {
      if (map.getLayer(id))
        map.setLayoutProperty(id, 'visibility', b?.visible ? 'none' : 'visible')
    } catch (_) {}
  })

  if (!b?.visible) return

  const heightMultiplier = b.height ?? 1
  const ambientLight     = b.ambientLight ?? 0.3

  function addBuildingLayers() {
    const usePattern = map.hasImage(BLDG_TEX_IMAGE_ID)
    map.addLayer({
      id:     BLDG_LAYER_ID,
      type:   'fill-extrusion',
      source: 'composite',
      'source-layer': 'building',
      filter: ['==', ['get', 'extrude'], 'true'],
      minzoom: 12,
      paint: {
        ...(usePattern
          ? { 'fill-extrusion-pattern': BLDG_TEX_IMAGE_ID }
          : {
              'fill-extrusion-color': [
                'interpolate', ['linear'],
                ['/', ['to-number', ['get', 'height'], 10], 200],
                0, b!.color,
                1, b!.topColor ?? b!.color,
              ],
            }
        ),
        'fill-extrusion-height': ['*', ['to-number', ['get', 'height'], 10], heightMultiplier],
        'fill-extrusion-base':   ['*', ['to-number', ['get', 'min_height'], 0], heightMultiplier],
        'fill-extrusion-opacity': b!.opacity,
        'fill-extrusion-ambient-occlusion-intensity': 1 - ambientLight,
        'fill-extrusion-ambient-occlusion-radius':    3,
      } as any,
    })

    if (b!.glowColor) {
      map.addLayer({
        id:     BLDG_GLOW_LAYER_ID,
        type:   'fill-extrusion',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', ['get', 'extrude'], 'true'],
        minzoom: 12,
        paint: {
          'fill-extrusion-color':  b!.glowColor,
          'fill-extrusion-height': ['*', ['to-number', ['get', 'height'], 10], heightMultiplier * 1.02],
          'fill-extrusion-base':   ['*', ['to-number', ['get', 'min_height'], 0], heightMultiplier],
          'fill-extrusion-opacity': b!.glowOpacity ?? 0.3,
        },
      })
    }
  }

  if (b.textureUrl) {
    map.loadImage(b.textureUrl, (err, img) => {
      if (!err && img) map.addImage(BLDG_TEX_IMAGE_ID, img as ImageBitmap)
      addBuildingLayers()
    })
  } else {
    addBuildingLayers()
  }
}

// ── Water ─────────────────────────────────────────────────────
function applyWater(map: MapboxMap, theme: RoadTheme) {
  if (!theme.water) return
  if (map.hasImage(WATER_TEX_IMAGE_ID)) map.removeImage(WATER_TEX_IMAGE_ID)

  function set(layerId: string, property: string, value: unknown) {
    try {
      if (map.getLayer(layerId)) map.setPaintProperty(layerId, property as any, value)
    } catch (_) {}
  }

  if (theme.water.textureUrl) {
    map.loadImage(theme.water.textureUrl, (err, img) => {
      if (!err && img) {
        map.addImage(WATER_TEX_IMAGE_ID, img as ImageBitmap)
        set('water', 'fill-pattern', WATER_TEX_IMAGE_ID)
      } else {
        set('water', 'fill-color',   theme.water!.color)
      }
      set('water',           'fill-opacity', theme.water!.opacity)
      set('water-shadow',    'fill-color',   theme.water!.color)
      set('waterway',        'line-color',   theme.water!.color)
      set('waterway-shadow', 'line-color',   theme.water!.color)
    })
  } else {
    set('water',           'fill-color',   theme.water.color)
    set('water',           'fill-opacity', theme.water.opacity)
    set('water-shadow',    'fill-color',   theme.water.color)
    set('waterway',        'line-color',   theme.water.color)
    set('waterway-shadow', 'line-color',   theme.water.color)
  }
}

// ── Labels ────────────────────────────────────────────────────
function applyLabels(map: MapboxMap, theme: RoadTheme) {
  if (!theme.labels) return
  const { color, halo, visible } = theme.labels
  const vis = visible ? 'visible' : 'none'
  map.getStyle()?.layers?.forEach(layer => {
    if (layer.type !== 'symbol') return
    try {
      map.setLayoutProperty(layer.id, 'visibility', vis)
      if (visible) {
        map.setPaintProperty(layer.id, 'text-color'       as any, color)
        map.setPaintProperty(layer.id, 'text-halo-color'  as any, halo)
        map.setPaintProperty(layer.id, 'text-halo-width'  as any, 1.5)
      }
    } catch (_) {}
  })
}

// ── Land ──────────────────────────────────────────────────────
function applyLand(map: MapboxMap, theme: RoadTheme) {
  if (!theme.land) return
  if (map.hasImage(LAND_TEX_IMAGE_ID)) map.removeImage(LAND_TEX_IMAGE_ID)

  function set(layerId: string, property: string, value: unknown) {
    try {
      if (map.getLayer(layerId)) map.setPaintProperty(layerId, property as any, value)
    } catch (_) {}
  }

  if (theme.land.textureUrl) {
    map.loadImage(theme.land.textureUrl, (err, img) => {
      if (!err && img) {
        map.addImage(LAND_TEX_IMAGE_ID, img as ImageBitmap)
        set('landuse',       'fill-pattern', LAND_TEX_IMAGE_ID)
        set('landcover',     'fill-pattern', LAND_TEX_IMAGE_ID)
        set('national-park', 'fill-pattern', LAND_TEX_IMAGE_ID)
      } else {
        set('landuse',       'fill-color', theme.land!.color)
        set('landcover',     'fill-color', theme.land!.color)
        set('national-park', 'fill-color', theme.land!.color)
      }
      set('land', 'background-color', theme.land!.color)
    })
  } else {
    set('land',          'background-color', theme.land.color)
    set('landuse',       'fill-color',       theme.land.color)
    set('national-park', 'fill-color',       theme.land.color)
    set('landcover',     'fill-color',       theme.land.color)
  }
}
