// ─────────────────────────────────────────────────────────────
//  src/mapPOI.ts
//
//  Reads POIs from Mapbox's built-in poi_label layer,
//  matches them against the theme's poiIcons rules, and places
//  HTML markers above each matching store.
//
//  Supports both single PNG files and sprite sheet regions.
//  Icons only appear at zoom >= 14.
// ─────────────────────────────────────────────────────────────

import mapboxgl from 'mapbox-gl'
import type { Map as MapboxMap } from 'mapbox-gl'
import type { RoadTheme } from './roadThemes'
import type { POIIconRule, IconSource } from './poiIcons'

const MIN_ZOOM = 12

const markers    = new Map<string, mapboxgl.Marker>()
const cleanupFns: Array<() => void> = []
let   activeRules: POIIconRule[] = []

// ── Main entry ────────────────────────────────────────────────
export function applyPOI(map: MapboxMap, theme: RoadTheme) {
  teardown()
  if (!theme.poiIcons?.length) return

  activeRules = theme.poiIcons

  const onMove = () => refreshMarkers(map)
  map.on('moveend', onMove)
  map.on('zoomend', onMove)
  map.on('idle',    onMove)   // fires when all tiles finish loading
  cleanupFns.push(
    () => map.off('moveend', onMove),
    () => map.off('zoomend', onMove),
    () => map.off('idle',    onMove),
  )
}

export function teardown() {
  clearMarkers()
  cleanupFns.forEach(fn => fn())
  cleanupFns.length = 0
}

// ── Query visible POIs and place markers ─────────────────────
function refreshMarkers(map: MapboxMap) {
  if (map.getZoom() < MIN_ZOOM) { clearMarkers(); return }

  const features = map.querySourceFeatures('composite', {
    sourceLayer: 'poi_label',
  })

  const seenIds = new Set<string>()

  for (const feature of features) {
    if (feature.geometry.type !== 'Point') continue

    const coords = (feature.geometry as GeoJSON.Point).coordinates as [number, number]
    const id = feature.id != null
      ? String(feature.id)
      : `${feature.properties?.name ?? ''}|${coords[0].toFixed(5)}|${coords[1].toFixed(5)}`

    seenIds.add(id)
    if (markers.has(id)) continue

    const maki  = (feature.properties?.maki        ?? '') as string
    const catEn = (feature.properties?.category_en ?? '') as string

    const rule = matchRule(maki, catEn)
    if (!rule) continue

    const size = rule.size ?? 28
    const el   = makeIconElement(rule.icon, size)

    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat(coords)
      .addTo(map)

    markers.set(id, marker)
  }

  for (const [id, marker] of markers) {
    if (!seenIds.has(id)) { marker.remove(); markers.delete(id) }
  }
}

function matchRule(maki: string, categoryEn: string) {
  for (const rule of activeRules) {
    if (rule.maki.includes(maki))             return rule
    if (rule.categories.includes(categoryEn)) return rule
  }
  return null
}

// ── Build marker element — handles file or sprite ─────────────
function makeIconElement(icon: IconSource, size: number): HTMLElement {
  const el = document.createElement('div')
  el.style.width          = `${size}px`
  el.style.height         = `${size}px`
  el.style.pointerEvents  = 'none'
  el.style.filter         = 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))'

  if (icon.type === 'file') {
    const img  = document.createElement('img')
    img.src    = icon.url
    img.width  = size
    img.height = size
    img.style.cssText = 'display:block;width:100%;height:100%;'
    el.appendChild(img)
  } else {
    // Sprite sheet: scale the image so cellW == size, then translate
    // so the target cell sits at the top-left of the clipping div.
    // No sheet dimensions needed — only cellW/cellH matter.
    el.style.overflow = 'hidden'
    const scale = size / icon.cellW
    const img   = document.createElement('img')
    img.src = icon.url
    img.style.cssText = [
      'position:absolute',
      'transform-origin:0 0',
      `transform:scale(${scale}) translate(${-icon.x}px,${-icon.y}px)`,
    ].join(';')
    el.appendChild(img)
  }

  return el
}

function clearMarkers() {
  for (const m of markers.values()) m.remove()
  markers.clear()
}
