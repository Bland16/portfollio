# Ferris Wheel Portfolio

## Project Structure
```
ferris-wheel/
├── index.html              ← Entry point, HTML structure, HUD elements
├── styles/
│   └── main.css            ← All CSS, color variables, UI components
├── js/
│   ├── main.js             ← 🎯 START HERE — orchestrator, animation loop
│   ├── config.js           ← 🎨 ALL USER CONTENT — cabins, colors, settings
│   ├── materials.js        ← Material assignment by mesh name prefix
│   ├── wheel.js            ← Ferris wheel spin, cabin placement, sway physics
│   ├── camera.js           ← Orbit / Transit / Interior camera modes
│   ├── labels.js           ← CSS3D floating cabin labels
│   ├── fog.js              ← Particle fog system
│   ├── inspect.js          ← Project object inspection + description panel
│   ├── lighting.js         ← Scene lighting setup
│   ├── postprocessing.js   ← Bloom, tone mapping
│   └── devmode.js          ← Dev tools (?dev=true)
└── models/
    ├── cabin.glb           ← ⚠️ Add your GLB files here
    ├── wheel-rails.glb
    └── wheel-stand.glb
```

## Setup
1. Drop your three GLB files into `/models/`
2. Run a local server from this folder:
   ```
   npx serve .
   ```
   or with VS Code: right-click `index.html` → Open with Live Server

3. Open `http://localhost:3000` (or whatever port)

## Adding Projects
Open `js/config.js` and add items to any cabin's `items` array:

```js
{
  glb: 'models/projects/my_project.glb',
  seat: 'left',                           // 'left' or 'right'
  positionOffset: [0, 0, 0.1],            // fine-tune position on seat
  label: 'My Project',
  link: 'https://mysite.com',             // opens on click (no description panel)
  description: null,
}
```

If `link` is `null`, clicking the object opens the description panel instead.

## Dev Mode
Add `?dev=true` to the URL:
```
http://localhost:3000/?dev=true
```
- **Reroll Object Positions** — randomizes project object placement on seats
- **Log Positions to Console** — prints current positions so you can save them to config

## Tuning Values
All tweakable values are in `js/config.js`:
- `SEAT_Y` — height of seat surface
- `WHEEL.spinSpeed` — idle rotation speed
- `SWAY.*` — cabin sway physics
- `FOG.*` — fog density and behavior
- `LIGHTS.*` — light colors and intensities
- `MATERIALS.*` — all mesh colors

## GLB Mesh Naming
Materials are applied automatically by mesh name prefix:

| Prefix | Material |
|--------|----------|
| `cabin_body_` | Cream panels |
| `cabin_trim_` | Gold emissive |
| `cabin_trim_window_ext_` | Cream (matches body) |
| `cabin_trim_window_int_` | Warm ivory, soft glow |
| `cabin_window_` | Glass, transparent |
| `cabin_door_body` | Cream |
| `cabin_door_trim` | Gold emissive |
| `cabin_door_trim_red` | Deep red |
| `cabin_door_base` | Dark |
| `cabin_door_handle` | Gold emissive |
| `cabin_door_bar` | Weathered gold |
| `cabin_seat_` | Red velvet |
| `cabin_roof_` | Bronze/gold |
| `cabin_floor_` | Dark matte |
| `cabin_hook_` | Gunmetal |
| `Body*` | Dark iron (wheel) |
| `wheel_rim_front` | Blue-white emissive |
| `attach_bar_*` | Weathered gold |
| `stand_axle*` | Dark iron, smooth |
| `stand_*` | Dark iron |
