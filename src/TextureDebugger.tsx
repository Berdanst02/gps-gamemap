// ─────────────────────────────────────────────────────────────
//  src/TextureDebugger.tsx
//
//  Debug panel that shows:
//    - The full texture tile (yellow dashed border = 1 tile)
//    - A road preview strip showing how the tile repeats
//    - Yellow dashed lines marking each tile boundary
//    - Info rows: source, scale, offset x/y, tile pixel dimensions
// ─────────────────────────────────────────────────────────────

import { useEffect, useRef } from 'react'
import type { TextureDebugInfo } from './mapStyles'

const PANEL_W    = 230
const ROAD_H     = 44
const MAX_PREV_H = 160

export function TextureDebugger({ info }: { info: TextureDebugInfo | null }) {
  const previewRef = useRef<HTMLCanvasElement>(null)
  const roadRef    = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!info?.imageData) return
    const { imageData } = info

    // ── Texture preview
    const prev = previewRef.current
    if (prev) {
      prev.width  = imageData.width
      prev.height = imageData.height
      prev.getContext('2d')!.putImageData(imageData, 0, 0)
    }

    // ── Road strip preview
    const road = roadRef.current
    if (!road) return
    const roadW = PANEL_W - 20
    road.width  = roadW
    road.height = ROAD_H

    const rctx = road.getContext('2d')!
    rctx.clearRect(0, 0, roadW, ROAD_H)

    // Dark road base
    rctx.fillStyle = '#222'
    rctx.fillRect(0, 0, roadW, ROAD_H)

    // Tile the texture along the strip
    const tmp = document.createElement('canvas')
    tmp.width  = imageData.width
    tmp.height = imageData.height
    tmp.getContext('2d')!.putImageData(imageData, 0, 0)
    const pattern = rctx.createPattern(tmp, 'repeat')!
    rctx.fillStyle = pattern
    rctx.fillRect(0, 0, roadW, ROAD_H)

    // Yellow dashed lines at each tile boundary
    rctx.strokeStyle = 'rgba(255, 220, 0, 0.7)'
    rctx.lineWidth   = 1
    rctx.setLineDash([3, 3])
    for (let x = imageData.width; x < roadW; x += imageData.width) {
      rctx.beginPath()
      rctx.moveTo(x, 0)
      rctx.lineTo(x, ROAD_H)
      rctx.stroke()
    }
    rctx.setLineDash([])

    // Road edge lines
    rctx.strokeStyle = 'rgba(255,255,255,0.15)'
    rctx.lineWidth   = 1
    rctx.strokeRect(0, 0, roadW, ROAD_H)
  }, [info?.imageData])

  if (!info) return null

  const { imageData, url, scale, offsetX, offsetY, isPlaceholder } = info

  // Scale preview to fit panel, keeping aspect ratio
  const previewW = PANEL_W - 20
  const aspect   = imageData.height / imageData.width
  const previewH = Math.min(Math.round(previewW * aspect), MAX_PREV_H)

  const filename = isPlaceholder
    ? '(auto-generated)'
    : url.split('/').pop() ?? url

  return (
    <div style={{
      position:     'absolute',
      bottom:       '16px',
      right:        '16px',
      width:        `${PANEL_W}px`,
      background:   'rgba(0, 0, 0, 0.88)',
      border:       '1px solid rgba(255,255,255,0.18)',
      borderRadius: '8px',
      padding:      '10px 12px',
      fontFamily:   'monospace',
      fontSize:     '11px',
      color:        '#ccc',
      userSelect:   'none',
    }}>

      {/* Header */}
      <div style={{ color: '#fff', fontWeight: 'bold', letterSpacing: '0.06em', marginBottom: '8px' }}>
        TEXTURE DEBUG
      </div>

      {/* Texture preview — full tile shown with dashed border */}
      <div style={{ position: 'relative', marginBottom: '6px' }}>
        <canvas
          ref={previewRef}
          style={{
            width:          `${previewW}px`,
            height:         `${previewH}px`,
            display:        'block',
            imageRendering: 'pixelated',
            border:         '2px dashed rgba(255, 220, 0, 0.75)',
            borderRadius:   '3px',
          }}
        />
        <span style={{
          position:   'absolute',
          top:        '4px',
          left:       '6px',
          fontSize:   '9px',
          color:      'rgba(255, 220, 0, 0.9)',
          textShadow: '0 0 6px black',
        }}>
          1 tile — {imageData.width} × {imageData.height} px
        </span>
      </div>

      {/* Road preview strip */}
      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontSize: '10px', color: '#666', marginBottom: '3px' }}>
          road preview  <span style={{ color: 'rgba(255,220,0,0.6)' }}>- - -</span> = tile boundaries
        </div>
        <canvas
          ref={roadRef}
          style={{
            width:        `${PANEL_W - 20}px`,
            height:       `${ROAD_H}px`,
            display:      'block',
            borderRadius: '3px',
          }}
        />
      </div>

      {/* Info table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px' }}>
        <InfoRow label="source"    value={filename}                    dim={isPlaceholder} />
        <InfoRow label="scale"     value={`×${scale.toFixed(2)}`} />
        <InfoRow label="offset x"  value={`${(offsetX * 100).toFixed(0)}%  (along road)`} />
        <InfoRow label="offset y"  value={`${offsetY}px  (sideways)`} />
        <InfoRow label="tile size" value={`${imageData.width} × ${imageData.height} px`} />
      </div>

    </div>
  )
}

function InfoRow({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
      <span style={{ color: '#555', flexShrink: 0 }}>{label}</span>
      <span style={{ color: dim ? '#444' : '#ddd', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  )
}
