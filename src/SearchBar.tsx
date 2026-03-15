// ─────────────────────────────────────────────────────────────
//  src/SearchBar.tsx  —  Destination search + navigation
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react'
import mapboxgl from 'mapbox-gl'
import { startNavigation, stopNavigation } from './mapNav'
import type { RouteInfo } from './mapNav'

interface GeoResult {
  id:         string
  place_name: string
  center:     [number, number]
  distKm?:    number
}

interface Props {
  map:            mapboxgl.Map | null
  externalQuery?: string   // set by AI to pre-populate + trigger search
}

// Haversine distance in km
function distKm(a: [number, number], b: [number, number]): number {
  const R  = 6371
  const dLat = (b[1] - a[1]) * Math.PI / 180
  const dLon = (b[0] - a[0]) * Math.PI / 180
  const sin2 = Math.sin(dLat / 2) ** 2
    + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180)
    * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(sin2))
}

function fmtDist(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

const PAGE = 5   // results visible before "Show more"

export function SearchBar({ map, externalQuery }: Props) {
  const [query,      setQuery]      = useState('')
  const [results,    setResults]    = useState<GeoResult[]>([])
  const [visible,    setVisible]    = useState(PAGE)
  const [open,       setOpen]       = useState(false)
  const [dest,       setDest]       = useState<GeoResult | null>(null)
  const [navigating, setNavigating] = useState(false)
  const [navError,   setNavError]   = useState('')
  const [loading,    setLoading]    = useState(false)
  const [routeInfo,  setRouteInfo]  = useState<RouteInfo | null>(null)
  const [userPos,    setUserPos]    = useState<[number, number] | null>(null)

  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const isPickedRef   = useRef(false)

  // Grab user location once for proximity + sorting
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => setUserPos([pos.coords.longitude, pos.coords.latitude]),
      ()  => {},
    )
  }, [])

  // When AI pushes a query, populate and open the search
  useEffect(() => {
    if (!externalQuery) return
    isPickedRef.current = false
    setDest(null)
    setQuery(externalQuery)
  }, [externalQuery])

  // Debounced geocoding — fetch 10, sort by distance from user
  useEffect(() => {
    if (isPickedRef.current) { isPickedRef.current = false; return }
    if (!query.trim()) { setResults([]); setOpen(false); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const token     = mapboxgl.accessToken as string
      const proximity = userPos ? `&proximity=${userPos[0]},${userPos[1]}` : ''
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&autocomplete=true&limit=10&types=poi,place,address${proximity}`
      try {
        const res  = await fetch(url)
        const data = await res.json()
        let features = (data.features ?? []) as GeoResult[]

        // Attach distance and sort closest-first
        if (userPos) {
          features = features
            .map(r => ({ ...r, distKm: distKm(userPos, r.center) }))
            .sort((a, b) => (a.distKm ?? 0) - (b.distKm ?? 0))
        }

        setResults(features)
        setVisible(PAGE)
        setOpen(true)
      } catch {
        setResults([])
      }
    }, 300)
  }, [query, userPos])

  function pickResult(r: GeoResult) {
    if (!map) return
    isPickedRef.current = true
    setQuery(r.place_name)
    setOpen(false)
    setDest(r)
    setNavError('')

    destMarkerRef.current?.remove()
    const el = document.createElement('div')
    el.style.cssText = [
      'width:14px', 'height:14px',
      'background:#a855f7',
      'border:2px solid #fff',
      'border-radius:50%',
      'box-shadow:0 0 6px rgba(0,0,0,0.8)',
    ].join(';')
    destMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
      .setLngLat(r.center)
      .addTo(map)

    map.flyTo({ center: r.center, zoom: 14, speed: 1.4 })
  }

  async function handleGo() {
    if (!map || !dest) return
    setLoading(true)
    setNavError('')
    destMarkerRef.current?.remove()
    destMarkerRef.current = null
    const info = await startNavigation(map, dest.center, msg => setNavError(msg))
    setLoading(false)
    if (info) { setRouteInfo(info); setNavigating(true) }
  }

  function handleStop() {
    if (!map) return
    stopNavigation(map)
    setNavigating(false)
    setDest(null)
    setQuery('')
    setNavError('')
    setRouteInfo(null)
  }

  const containerStyle: React.CSSProperties = {
    position:   'absolute',
    top:        '16px',
    left:       '16px',
    width:      '320px',
    fontFamily: 'monospace',
    fontSize:   '13px',
    zIndex:     10,
  }

  if (navigating) {
    const ri = routeInfo
    const totalMin = ri ? Math.round(ri.durationSec / 60) : 0
    const hrs      = Math.floor(totalMin / 60)
    const mins     = totalMin % 60
    const timeStr  = hrs > 0 ? `${hrs} h ${mins} min` : `${mins} min`
    const distStr  = ri
      ? ri.distanceM >= 1000
        ? `${(ri.distanceM / 1000).toFixed(1)} km`
        : `${Math.round(ri.distanceM)} m`
      : ''

    return (
      <div style={containerStyle}>
        <div style={{
          background:   'rgba(0,0,0,0.88)',
          border:       '1px solid rgba(168,85,247,0.5)',
          borderRadius: '8px',
          padding:      '10px 12px',
        }}>
          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ color: '#a855f7', fontWeight: 'bold', flex: 1 }}>NAVIGATING</span>
            <button
              onClick={handleStop}
              style={{
                padding:      '5px 12px',
                background:   '#c0392b',
                border:       'none',
                borderRadius: '5px',
                color:        '#fff',
                cursor:       'pointer',
                fontFamily:   'monospace',
                fontSize:     '12px',
                fontWeight:   'bold',
              }}
            >
              STOP
            </button>
          </div>

          {/* Destination */}
          <div style={{ color: '#ddd', fontSize: '12px', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {dest?.place_name}
          </div>

          {/* Time + Distance */}
          {ri && (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '8px' }}>
              <div>
                <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', lineHeight: 1 }}>{timeStr}</div>
                <div style={{ color: '#888', fontSize: '11px' }}>ETA</div>
              </div>
              <div style={{ width: '1px', background: 'rgba(255,255,255,0.15)' }} />
              <div>
                <div style={{ color: '#fff', fontSize: '20px', fontWeight: 'bold', lineHeight: 1 }}>{distStr}</div>
                <div style={{ color: '#888', fontSize: '11px' }}>distance</div>
              </div>
            </div>
          )}

          {/* Badges */}
          {ri && (ri.hasTolls || ri.hasHighway) && (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {ri.hasHighway && (
                <span style={{
                  padding: '2px 8px', borderRadius: '4px',
                  background: 'rgba(74,144,226,0.25)', border: '1px solid rgba(74,144,226,0.5)',
                  color: '#7ab8f5', fontSize: '11px',
                }}>
                  Highway
                </span>
              )}
              {ri.hasTolls && (
                <span style={{
                  padding: '2px 8px', borderRadius: '4px',
                  background: 'rgba(230,180,30,0.2)', border: '1px solid rgba(230,180,30,0.5)',
                  color: '#f0c040', fontSize: '11px',
                }}>
                  Tolls
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  const showDropdown = open && results.length > 0
  const showGo       = dest && !open
  const shown        = results.slice(0, visible)
  const remaining    = results.length - visible

  return (
    <div style={containerStyle}>
      {/* Input row */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          type="text"
          placeholder="Search destination…"
          value={query}
          onChange={e => { setQuery(e.target.value); setDest(null) }}
          onFocus={() => results.length > 0 && setOpen(true)}
          style={{
            flex:         1,
            minWidth:     0,
            padding:      '9px 12px',
            background:   'rgba(0,0,0,0.82)',
            border:       '1px solid rgba(255,255,255,0.2)',
            borderRadius: showDropdown ? '6px 6px 0 0' : '6px',
            color:        '#fff',
            outline:      'none',
            fontFamily:   'monospace',
            fontSize:     '13px',
          }}
        />
        {showGo && (
          <button
            onClick={handleGo}
            disabled={loading}
            style={{
              flexShrink:    0,
              padding:       '9px 16px',
              background:    loading ? 'rgba(168,85,247,0.4)' : '#a855f7',
              border:        'none',
              borderRadius:  '6px',
              color:         '#fff',
              cursor:        loading ? 'default' : 'pointer',
              fontFamily:    'monospace',
              fontSize:      '13px',
              fontWeight:    'bold',
              letterSpacing: '0.06em',
            }}
          >
            {loading ? '…' : 'GO'}
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div style={{
          background:   'rgba(0,0,0,0.92)',
          border:       '1px solid rgba(255,255,255,0.2)',
          borderTop:    'none',
          borderRadius: '0 0 6px 6px',
          overflow:     'hidden',
        }}>
          {shown.map(r => (
            <div
              key={r.id}
              onClick={() => pickResult(r)}
              style={{
                display:      'flex',
                alignItems:   'center',
                padding:      '8px 12px',
                cursor:       'pointer',
                borderTop:    '1px solid rgba(255,255,255,0.07)',
                gap:          '8px',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{
                flex:         1,
                color:        '#ccc',
                whiteSpace:   'nowrap',
                overflow:     'hidden',
                textOverflow: 'ellipsis',
                fontSize:     '13px',
              }}>
                {r.place_name}
              </span>
              {r.distKm != null && (
                <span style={{
                  flexShrink: 0,
                  color:      '#a855f7',
                  fontSize:   '11px',
                }}>
                  {fmtDist(r.distKm)}
                </span>
              )}
            </div>
          ))}

          {remaining > 0 && (
            <div
              onClick={() => setVisible(v => v + PAGE)}
              style={{
                padding:    '7px 12px',
                color:      '#a855f7',
                cursor:     'pointer',
                borderTop:  '1px solid rgba(255,255,255,0.07)',
                fontSize:   '12px',
                textAlign:  'center',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(168,85,247,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Show {remaining} more
            </div>
          )}
        </div>
      )}

      {navError && (
        <div style={{
          marginTop:    '6px',
          padding:      '6px 10px',
          background:   'rgba(192,57,43,0.85)',
          borderRadius: '6px',
          color:        '#fff',
          fontSize:     '12px',
        }}>
          {navError}
        </div>
      )}
    </div>
  )
}
