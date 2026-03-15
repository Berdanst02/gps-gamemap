// ─────────────────────────────────────────────────────────────
//  src/poiIcons.ts  —  POI icon types
// ─────────────────────────────────────────────────────────────

// Single image file
export interface IconFile {
  type: 'file'
  url: string   // e.g. '/icons/gta5/shirt.png'
}

// Region inside a sprite sheet — no sheet dimensions needed,
// only the cell size. Rendering uses CSS transform to crop.
export interface IconSprite {
  type: 'sprite'
  url: string   // e.g. '/icons/gta5/sprites.png'
  x: number   // px from left edge of sheet to this cell
  y: number   // px from top  edge of sheet to this cell
  cellW: number   // width  of one icon cell in the sheet
  cellH: number   // height of one icon cell in the sheet
}

export type IconSource = IconFile | IconSprite

export interface POIIconRule {
  icon: IconSource
  maki: string[]   // Mapbox maki values that match
  categories: string[]   // category_en fallback values
  size?: number     // display size in px (default 28)
}
