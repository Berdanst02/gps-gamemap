import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { applyTheme } from './mapStyles'
import type { TextureDebugInfo } from './mapStyles'
import { themes, DEFAULT_THEME_ID } from './roadThemes'
import type { RoadTheme } from './roadThemes'
import { TextureDebugger } from './TextureDebugger'
import { SearchBar } from './SearchBar'
import { AISearch } from './AISearch'
import { MapClickInfo } from './MapClickInfo'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN ?? ''

export default function App() {
  const mapDivRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const activeStyleRef = useRef<string>('')
  const [status, setStatus] = useState('Loading map...')
  const [themeId, setThemeId] = useState(DEFAULT_THEME_ID)
  const [texInfo, setTexInfo] = useState<TextureDebugInfo | null>(null)
  const [mapReady, setMapReady] = useState<mapboxgl.Map | null>(null)
  const [aiQuery, setAiQuery] = useState('')

  // ── Init map ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapDivRef.current) return
    const initialTheme = themes.find(t => t.id === DEFAULT_THEME_ID)!

    const map = new mapboxgl.Map({
      container: mapDivRef.current,
      style: initialTheme.mapStyle,
      center: [-73.985, 40.758],
      zoom: 15,
      pitch: 0,
      bearing: 0,
    })

    activeStyleRef.current = initialTheme.mapStyle
    map.on('load', () => {
      applyTheme(map, initialTheme, setTexInfo)
      setMapReady(map)
      setStatus('')
    })

    navigator.geolocation.getCurrentPosition(
      (pos) => map.setCenter([pos.coords.longitude, pos.coords.latitude]),
      () => {
        setStatus('GPS denied — showing default location')
        setTimeout(() => setStatus(''), 3000)
      }
    )

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [])

  // ── Switch theme ─────────────────────────────────────────────
  function switchTheme(newTheme: RoadTheme) {
    const map = mapRef.current
    if (!map) return
    setThemeId(newTheme.id)
    setTexInfo(null)

    // Same base style — no reload needed, just re-apply
    if (activeStyleRef.current === newTheme.mapStyle) {
      applyTheme(map, newTheme, setTexInfo)
      return
    }

    setStatus('Loading theme...')
    activeStyleRef.current = newTheme.mapStyle
    map.setStyle(newTheme.mapStyle)
    map.once('style.load', () => {
      applyTheme(map, newTheme, setTexInfo)
      setStatus('')
    })
  }

  // ── UI ───────────────────────────────────────────────────────
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>

      <div ref={mapDivRef} style={{ width: '100%', height: '100%' }} />

      {/* Search bar — top left */}
      <SearchBar map={mapReady} externalQuery={aiQuery} />

      {/* AI search — bottom left */}
      <AISearch map={mapReady} onSearchQuery={setAiQuery} />

      {/* POI click info */}
      <MapClickInfo map={mapReady} />

      {/* Theme selector — top right */}
      <div style={{
        position: 'absolute',
        top: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        background: 'rgba(0,0,0,0.75)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '8px',
        padding: '10px 12px',
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#ccc',
      }}>
        <div style={{ color: '#fff', fontWeight: 'bold', letterSpacing: '0.05em', marginBottom: '4px' }}>
          MAP STYLE
        </div>
        {themes.map(t => (
          <button
            key={t.id}
            onClick={() => switchTheme(t)}
            style={{
              background: themeId === t.id ? 'rgba(255,255,255,0.15)' : 'transparent',
              border: themeId === t.id ? '1px solid rgba(255,255,255,0.4)' : '1px solid transparent',
              borderRadius: '4px',
              color: themeId === t.id ? '#fff' : '#888',
              cursor: 'pointer',
              padding: '4px 10px',
              textAlign: 'left',
              fontFamily: 'monospace',
              fontSize: '13px',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Texture debugger — bottom right */}
      <TextureDebugger info={texInfo} />

      {/* Status overlay */}
      {status && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.7)',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          fontFamily: 'monospace',
          fontSize: '14px',
          pointerEvents: 'none',
        }}>
          {status}
        </div>
      )}
    </div>
  )
}
