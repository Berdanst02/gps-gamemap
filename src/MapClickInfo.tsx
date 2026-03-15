// ─────────────────────────────────────────────────────────────
//  src/MapClickInfo.tsx  —  Click a POI on the map to see details
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'

interface Props {
  map: mapboxgl.Map | null
}

interface CardData {
  name:     string
  loading?: boolean
  address?: string
  phone?:   string
  website?: string
  category?: string
  hours?:   string
}

function safeHostname(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') }
  catch { return url }
}

function renderCard(d: CardData): string {
  const row = (label: string, value: string, href?: string) => `
    <div style="margin-top:7px">
      <div style="font-size:10px;color:#888;letter-spacing:0.06em">${label}</div>
      <div style="font-size:12px;color:#ddd;margin-top:1px">
        ${href
          ? `<a href="${href}" target="_blank" rel="noopener"
               style="color:#f97316;text-decoration:none">${value}</a>`
          : value}
      </div>
    </div>`

  return `
    <div style="font-family:monospace;padding:2px 0;min-width:210px">
      ${d.category ? `<div style="font-size:10px;color:#f97316;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:5px">${d.category}</div>` : ''}
      <div style="font-size:14px;font-weight:bold;color:#fff;line-height:1.3">${d.name}</div>
      ${d.loading ? `<div style="margin-top:8px;font-size:12px;color:#555">Loading…</div>` : ''}
      ${d.address ? row('ADDRESS', d.address) : ''}
      ${d.phone   ? row('PHONE',   d.phone,   `tel:${d.phone}`) : ''}
      ${d.website ? row('WEBSITE', safeHostname(d.website), d.website) : ''}
      ${d.hours   ? row('HOURS',   d.hours) : ''}
    </div>`
}

export function MapClickInfo({ map }: Props) {
  const sessionToken = useRef(crypto.randomUUID())
  const popupRef     = useRef<mapboxgl.Popup | null>(null)

  useEffect(() => {
    if (!map) return

    const onClick = async (e: mapboxgl.MapMouseEvent) => {
      // Find a POI feature under the click
      const features = map.queryRenderedFeatures(e.point)
      const feature  = features.find(f => f.sourceLayer === 'poi_label')

      if (!feature?.properties?.name) {
        popupRef.current?.remove()
        popupRef.current = null
        return
      }

      const name = feature.properties.name as string
      const { lng, lat } = e.lngLat

      // Show loading popup immediately
      popupRef.current?.remove()
      const popup = new mapboxgl.Popup({
        closeButton:  true,
        maxWidth:     '300px',
        className:    'poi-popup',
      })
        .setLngLat(e.lngLat)
        .setHTML(renderCard({ name, loading: true }))
        .addTo(map)
      popupRef.current = popup

      // Fetch rich details from Mapbox Search Box API
      const token   = mapboxgl.accessToken as string
      const session = sessionToken.current

      try {
        const sugRes  = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(name)}&proximity=${lng},${lat}&access_token=${token}&session_token=${session}&limit=1&types=poi`
        )
        const sugData = await sugRes.json()
        const suggestion = sugData.suggestions?.[0]

        if (!suggestion) { popup.setHTML(renderCard({ name })); return }

        const retRes  = await fetch(
          `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapbox_id}?access_token=${token}&session_token=${session}`
        )
        const retData = await retRes.json()
        const p       = retData.features?.[0]?.properties ?? {}

        const hours = (() => {
          const oh = p.open_hours
          if (!oh) return undefined
          if (oh.open_now === true)  return 'Open now'
          if (oh.open_now === false) return 'Closed now'
          return undefined
        })()

        popup.setHTML(renderCard({
          name:     p.name          ?? name,
          address:  p.full_address,
          phone:    p.phone,
          website:  p.website,
          category: (p.poi_category as string[] | undefined)?.[0],
          hours,
        }))
      } catch {
        popup.setHTML(renderCard({ name }))
      }
    }

    map.on('click', onClick)
    return () => {
      map.off('click', onClick)
      popupRef.current?.remove()
    }
  }, [map])

  return null
}
