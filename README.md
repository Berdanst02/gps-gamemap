# 🎮 NEXUS GPS STUDIO
### A Video Game HUD GPS — TypeScript + React

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev

# 3. Open http://localhost:5173
```

---

## 🏗️ Architecture

```
src/
├── main.tsx                  # Entry point
├── App.tsx                   # Root — orchestrates all hooks & layout
│
├── types/
│   └── index.ts              # All TypeScript interfaces & types
│
├── presets/
│   └── themes.ts             # 6 game themes (GTA, Cyberpunk, RDR2, Mario, Halo, Dark Souls)
│                             # Includes Google Maps style arrays + HUD config patches
│
├── store/
│   └── useHudStore.ts        # Zustand global store
│                             # Single source of truth for ALL config + GPS state
│
├── hooks/
│   ├── useGPS.ts             # Geolocation API wrapper with demo fallback
│   └── useClockAndGeocode.ts # Live clock + Nominatim reverse geocoding
│
├── components/
│   ├── MapView.tsx           # Leaflet map, player marker, waypoint, route line
│   ├── Minimap.tsx           # Separate Leaflet minimap synced to player
│   ├── HudElements.tsx       # TopBar, SpeedPanel, StatBars, CornerBrackets,
│   │                         # RoutePanel, NotificationStack, Overlays
│   ├── CustomPanel.tsx       # Slide-in customization editor (all controls)
│   └── ApiKeyScreen.tsx      # Google Maps API key splash screen
│
├── utils/
│   └── index.ts              # hexToRgb, haversine, syncCssVars, export/import
│
└── styles/
    └── main.css              # Global CSS + CSS custom properties
```

---

## 🎨 What You Can Customize (Live)

| Category         | Controls |
|-----------------|----------|
| **Presets**     | GTA V, Cyberpunk 2077, Red Dead II, Mario Kart, Halo, Dark Souls |
| **Colors**      | Accent, Glow, Border (color picker + hex input), Panel alpha |
| **Glow/FX**     | Glow radius, Glow opacity, Scanlines, Vignette, Sweep line, Glitch text |
| **Borders**     | Width, Style (solid/dashed/dotted/double), Corner brackets |
| **Typography**  | 8 game fonts, Speed font size |
| **Minimap**     | Visible, Shape (circle/square/rounded/hexagon), Size, Zoom, Radar sweep |
| **HUD Toggles** | Speed, Speed unit (km/h or mph), Top bar, Coordinates, Stat bars |
| **Stat Bars**   | Add/remove/rename/recolor/set value — unlimited custom bars |
| **Labels**      | Rename Location, Signal, and Waypoint labels |
| **Import/Export**| Save/load your full config as JSON |

---

## 🗺️ Maps

### OpenStreetMap (Free — default)
No key needed. Uses CartoDB dark tiles via Leaflet.

### Google Maps (Optional)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → Enable **Maps JavaScript API**
3. Create an API key → Enter it on the splash screen

Google Maps unlocks:
- Per-theme custom map styles (road colors, building colors, water, etc.)
- Future: Directions API for turn-by-turn routing

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `C` | Toggle customization panel |

---

## 🛠️ Tech Stack

| Layer        | Choice         | Why |
|-------------|---------------|-----|
| Language     | TypeScript     | Type safety as config complexity grows |
| UI           | React 18       | Component model, hooks, fine-grained re-renders |
| State        | Zustand + Immer| Minimal boilerplate, mutable-style updates, devtools |
| Map          | Leaflet        | Free, lightweight, full control |
| Build        | Vite           | Instant HMR, fast cold starts |
| Fonts        | Google Fonts   | Game-authentic typography |

---

## 📦 Build for Production

```bash
npm run build
# Output in dist/
```

---

## 🔧 Adding a New Theme

In `src/presets/themes.ts`:

```typescript
// 1. Add your Google Maps style array
const MAP_MYTH: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#0f0f23' }] },
  // ... more style rules
]

// 2. Add to THEMES object
myTheme: {
  id:    'myTheme',
  name:  'MY GAME',
  emoji: '🟣',
  config: {
    accentColor: '#aa44ff',
    glowColor:   '#aa44ff',
    // ... any HudConfig keys to override
  },
  mapStyles: MAP_MYTH,
}
```

Then add `'myTheme'` to the `ThemePreset` union type in `src/types/index.ts`.

---

## 📝 Config JSON Format

Export/import configs via the panel. Example:

```json
{
  "accentColor": "#ff4488",
  "glowColor": "#ff4488",
  "borderColor": "#ff4488",
  "panelBgAlpha": 85,
  "font": "VT323",
  "minimapShape": "hexagon",
  "showGlitch": true,
  "stats": [
    { "id": "hp", "label": "HEALTH", "value": 80, "color": "#ff4455" }
  ]
}
```
