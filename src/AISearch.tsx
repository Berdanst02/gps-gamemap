// ─────────────────────────────────────────────────────────────
//  src/AISearch.tsx  —  Natural-language POI search via LM Studio
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import mapboxgl from 'mapbox-gl'

// LM Studio local server — change port here if needed
const LM_STUDIO_URL = '/lmstudio/v1/chat/completions'

interface Props {
  map: mapboxgl.Map | null
  onSearchQuery: (q: string) => void   // push suggested query to SearchBar
}

interface GeoResult {
  id: string
  place_name: string
  center: [number, number]
  distKm?: number
}

function haversinKm(a: [number, number], b: [number, number]): number {
  const R = 6371
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

export function AISearch({ map, onSearchQuery }: Props) {
  const [open, setOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [userPos, setUserPos] = useState<[number, number] | null>(null)
  const [results, setResults] = useState<GeoResult[]>([])
  const markerRefs = useRef<mapboxgl.Marker[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      pos => setUserPos([pos.coords.longitude, pos.coords.latitude]),
      () => { },
    )
  }, [])

  function clearResultMarkers() {
    markerRefs.current.forEach(m => m.remove())
    markerRefs.current = []
  }

  function getNearbyPOIs(): string {
    if (!map || !userPos) return ''
    try {
      const features = map.querySourceFeatures('composite', { sourceLayer: 'poi_label' })
      const seen = new Set<string>()
      const pois: { name: string; category: string; dist: number }[] = []

      for (const f of features) {
        if (f.geometry.type !== 'Point') continue
        const name = f.properties?.name as string | undefined
        if (!name || seen.has(name)) continue
        seen.add(name)
        const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number]
        const dist = haversinKm(userPos, coords)
        const category = (f.properties?.category_en ?? '') as string
        pois.push({ name, category, dist })
      }

      pois.sort((a, b) => a.dist - b.dist)
      const top = pois.slice(0, 40)
      if (!top.length) return ''
      const lines = top.map((p, i) =>
        `${i + 1}. ${p.name}${p.category ? ` (${p.category})` : ''} — ${fmtDist(p.dist)}`
      ).join('\n')
      return `\nNearby places currently visible on the map:\n${lines}`
    } catch {
      return ''
    }
  }

  async function send() {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setResponse('')
    setResults([])
    clearResultMarkers()

    const locationCtx = userPos
      ? `The user's current coordinates are [${userPos[1].toFixed(4)}, ${userPos[0].toFixed(4)}] (lat, lon).`
      : 'User location is unknown.'

    const nearbyCtx = getNearbyPOIs()

    // Gemma (and many local models) don't support the 'system' role —
    // fold context into the user message so it always works.
    const userMessage = `[Context: You are a local navigation assistant. ${locationCtx}${nearbyCtx} Always recommend the closest option to the user based on the nearby places listed above. When suggesting a place to search for, prefer names from the nearby list and end your reply with exactly this JSON on its own line: {"searchQuery":"<search term> near me"}. Keep your reply to 2-4 sentences.]

User request: ${prompt}`

    try {
      const res = await fetch(LM_STUDIO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'local-model',
          messages: [
            { role: 'user', content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      })

      if (!res.ok) throw new Error(`LM Studio error: ${res.status}`)

      const data = await res.json()
      const content = data.choices?.[0]?.message?.content ?? ''

      // Extract JSON search query from response
      const jsonMatch = content.match(/\{"searchQuery"\s*:\s*"([^"]+)"\}/)
      const searchQuery = jsonMatch?.[1] ?? null

      // Display response without the JSON line
      const displayText = content.replace(/\n?\{"searchQuery"[^}]+\}/g, '').trim()
      setResponse(displayText)

      // Auto-search Mapbox if we got a query
      if (searchQuery) {
        await searchMapbox(searchQuery)
        onSearchQuery(searchQuery)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      if (msg.includes('fetch') || msg.includes('Failed')) {
        setResponse('Could not connect to LM Studio. Make sure it is running on port 1234 with a model loaded.')
      } else {
        setResponse(`Error: ${msg}`)
      }
    }

    setLoading(false)
  }

  async function searchMapbox(query: string) {
    if (!map) return
    const token = mapboxgl.accessToken as string
    const proximity = userPos ? `&proximity=${userPos[0]},${userPos[1]}` : ''
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${token}&limit=5&types=poi,place${proximity}`

    try {
      const res = await fetch(url)
      const data = await res.json()
      let features = (data.features ?? []) as GeoResult[]

      if (userPos) {
        features = features
          .map(r => ({ ...r, distKm: haversinKm(userPos, r.center) }))
          .sort((a, b) => (a.distKm ?? 0) - (b.distKm ?? 0))
      }

      setResults(features)

      // Drop markers for each result
      features.forEach((r, i) => {
        const el = document.createElement('div')
        el.style.cssText = [
          'width:22px', 'height:22px',
          'background:#f97316',
          'border:2px solid #fff',
          'border-radius:50%',
          'display:flex', 'align-items:center', 'justify-content:center',
          'font-size:11px', 'font-weight:bold', 'color:#fff',
          'font-family:monospace',
          'box-shadow:0 0 6px rgba(0,0,0,0.7)',
          'cursor:pointer',
        ].join(';')
        el.textContent = String(i + 1)

        const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(r.center)
          .addTo(map)
        markerRefs.current.push(marker)
      })

      // Fit to all results
      if (features.length > 0) {
        const bounds = features.reduce(
          (b, r) => b.extend(r.center),
          new mapboxgl.LngLatBounds(features[0].center, features[0].center),
        )
        map.fitBounds(bounds, { padding: 100, maxZoom: 15 })
      }
    } catch {
      // silently ignore
    }
  }

  function flyTo(r: GeoResult) {
    if (!map) return
    map.flyTo({ center: r.center, zoom: 16, speed: 1.4 })
    onSearchQuery(r.place_name)
  }

  function handleKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{
      position: 'absolute',
      bottom: '24px',
      left: '16px',
      width: '340px',
      fontFamily: 'monospace',
      fontSize: '13px',
      zIndex: 10,
    }}>
      {/* Toggle button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            padding: '8px 16px',
            background: 'rgba(0,0,0,0.82)',
            border: '1px solid rgba(249,115,22,0.5)',
            borderRadius: '8px',
            color: '#f97316',
            cursor: 'pointer',
            fontFamily: 'monospace',
            fontSize: '13px',
            fontWeight: 'bold',
            letterSpacing: '0.05em',
          }}
        >
          AI SEARCH
        </button>
      )}

      {open && (
        <div style={{
          background: 'rgba(0,0,0,0.90)',
          border: '1px solid rgba(249,115,22,0.4)',
          borderRadius: '10px',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ color: '#f97316', fontWeight: 'bold', flex: 1 }}>AI SEARCH</span>
            <button
              onClick={() => { setOpen(false); clearResultMarkers(); setResults([]); setResponse('') }}
              style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}
            >
              ×
            </button>
          </div>

          {/* Response */}
          {response && (
            <div style={{
              padding: '10px 12px',
              color: '#ddd',
              fontSize: '12px',
              lineHeight: '1.5',
              borderBottom: results.length ? '1px solid rgba(255,255,255,0.08)' : 'none',
            }}>
              {response}
            </div>
          )}

          {/* Result list */}
          {results.length > 0 && (
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {results.map((r, i) => (
                <div
                  key={r.id}
                  onClick={() => flyTo(r)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '7px 12px',
                    cursor: 'pointer',
                    borderTop: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(249,115,22,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{
                    width: '18px', height: '18px', flexShrink: 0,
                    background: '#f97316', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 'bold', color: '#fff',
                  }}>
                    {i + 1}
                  </span>
                  <span style={{ color: '#ccc', fontSize: '12px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.place_name}
                  </span>
                  {r.distKm != null && (
                    <span style={{ flexShrink: 0, color: '#f97316', fontSize: '10px' }}>
                      {fmtDist(r.distKm)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div style={{ display: 'flex', gap: '6px', padding: '8px' }}>
            <textarea
              ref={textareaRef}
              rows={2}
              placeholder="e.g. nearest cafe, closest pharmacy…"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={handleKey}
              style={{
                flex: 1,
                resize: 'none',
                padding: '7px 10px',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                color: '#fff',
                outline: 'none',
                fontFamily: 'monospace',
                fontSize: '12px',
                lineHeight: '1.4',
              }}
            />
            <button
              onClick={send}
              disabled={loading || !prompt.trim()}
              style={{
                flexShrink: 0,
                padding: '0 14px',
                background: loading ? 'rgba(249,115,22,0.3)' : '#f97316',
                border: 'none',
                borderRadius: '6px',
                color: '#fff',
                cursor: loading ? 'default' : 'pointer',
                fontFamily: 'monospace',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              {loading ? '…' : 'ASK'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
