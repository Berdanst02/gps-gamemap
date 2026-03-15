// ─────────────────────────────────────────────────────────────
//  src/mapNav.ts  —  Routing + live GPS navigation
// ─────────────────────────────────────────────────────────────

import mapboxgl from 'mapbox-gl'

const SOURCE_ID   = 'nav-route'
const LAYER_CASE  = 'nav-route-casing'
const LAYER_LINE  = 'nav-route-layer'

let watchId:          number | null              = null
let userMarker:       mapboxgl.Marker | null     = null
let currentRoute:     GeoJSON.LineString | null  = null
let styleLoadHandler: (() => void) | null        = null

export interface RouteInfo {
  durationSec: number   // total seconds
  distanceM:   number   // total metres
  hasTolls:    boolean
  hasHighway:  boolean
}

// ── Start navigation ──────────────────────────────────────────
export async function startNavigation(
  map:         mapboxgl.Map,
  destination: [number, number],
  onError:     (msg: string) => void,
): Promise<RouteInfo | null> {
  stopNavigation(map)

  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const origin: [number, number] = [pos.coords.longitude, pos.coords.latitude]

        try {
          const token = mapboxgl.accessToken as string
          const url = [
            'https://api.mapbox.com/directions/v5/mapbox/driving/',
            `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`,
            `?geometries=geojson&overview=full&steps=true&access_token=${token}`,
          ].join('')

          const res   = await fetch(url)
          const data  = await res.json()
          const route = data.routes?.[0]

          if (!route?.geometry) { onError('No route found'); resolve(null); return }

          currentRoute = route.geometry as GeoJSON.LineString
          drawRoute(map, currentRoute)

          // Re-draw if theme changes
          const handler = () => { if (currentRoute) drawRoute(map, currentRoute) }
          map.on('style.load', handler)
          styleLoadHandler = () => map.off('style.load', handler)

          placeUserDot(map, origin)

          // Fit map to route
          const coords = currentRoute.coordinates as [number, number][]
          const bounds = coords.reduce(
            (b, c) => b.extend(c as mapboxgl.LngLatLike),
            new mapboxgl.LngLatBounds(coords[0], coords[0]),
          )
          map.fitBounds(bounds, { padding: 80, maxZoom: 16 })

          // Live tracking
          watchId = navigator.geolocation.watchPosition(p => {
            const c: [number, number] = [p.coords.longitude, p.coords.latitude]
            userMarker?.setLngLat(c)
            map.easeTo({ center: c, duration: 800 })
          })

          // Scan steps for toll/highway classes
          const steps: { intersections?: { classes?: string[] }[] }[] =
            route.legs?.flatMap((l: { steps?: unknown[] }) => l.steps ?? []) ?? []

          const allClasses = steps.flatMap(s =>
            s.intersections?.flatMap(i => i.classes ?? []) ?? []
          )

          const info: RouteInfo = {
            durationSec: route.duration  ?? 0,
            distanceM:   route.distance  ?? 0,
            hasTolls:    allClasses.includes('toll'),
            hasHighway:  allClasses.some(c => c === 'motorway' || c === 'motorway_link'),
          }

          resolve(info)
        } catch {
          onError('Failed to fetch route')
          resolve(null)
        }
      },
      () => { onError('Location access denied'); resolve(null) },
    )
  })
}

// ── Stop navigation ───────────────────────────────────────────
export function stopNavigation(map: mapboxgl.Map) {
  if (watchId !== null) { navigator.geolocation.clearWatch(watchId); watchId = null }
  userMarker?.remove();  userMarker = null
  styleLoadHandler?.();  styleLoadHandler = null
  currentRoute = null
  if (map.getLayer(LAYER_LINE))  map.removeLayer(LAYER_LINE)
  if (map.getLayer(LAYER_CASE))  map.removeLayer(LAYER_CASE)
  if (map.getSource(SOURCE_ID))  map.removeSource(SOURCE_ID)
}

// ── Internal helpers ──────────────────────────────────────────
function drawRoute(map: mapboxgl.Map, geometry: GeoJSON.LineString) {
  if (map.getLayer(LAYER_LINE))  map.removeLayer(LAYER_LINE)
  if (map.getLayer(LAYER_CASE))  map.removeLayer(LAYER_CASE)
  if (map.getSource(SOURCE_ID))  map.removeSource(SOURCE_ID)

  map.addSource(SOURCE_ID, {
    type: 'geojson',
    data: { type: 'Feature', properties: {}, geometry },
  })

  map.addLayer({
    id:     LAYER_CASE,
    type:   'line',
    source: SOURCE_ID,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint:  { 'line-color': '#6b21a8', 'line-width': 9, 'line-opacity': 0.85 },
  })

  map.addLayer({
    id:     LAYER_LINE,
    type:   'line',
    source: SOURCE_ID,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint:  { 'line-color': '#a855f7', 'line-width': 5, 'line-opacity': 1 },
  })
}

function placeUserDot(map: mapboxgl.Map, coords: [number, number]) {
  const el = document.createElement('div')
  el.style.cssText = [
    'width:18px', 'height:18px',
    'background:#a855f7',
    'border:3px solid #fff',
    'border-radius:50%',
    'box-shadow:0 0 10px rgba(168,85,247,0.9)',
  ].join(';')

  userMarker = new mapboxgl.Marker({ element: el, anchor: 'center' })
    .setLngLat(coords)
    .addTo(map)
}
