# Ferris Wheel Portfolio — Dev Notes

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

---

## Feature Plan

```
📁 Ferris Wheel Portfolio
│
├── 📁 Button System
│   ├── Base display function (shared)
│   ├── Base action function (per button)
│   ├── Robot nav button
│   ├── Cabin nav button
│   ├── Vibe switch button
│   ├── PDF open button
│   ├── Volume knob
│   │
│   ├── 📁 Vibe System
│   │   ├── 6 material files (Suave, Carnival, Noir, Blueprint, Midnight Arcade, Pop Art)
│   │   ├── Flicker transition (randomised)
│   │   ├── Machinery startup sound
│   │   ├── Lofi music (general, across all vibes)
│   │   ├── UI tinting per palette
│   │   └── PDF sheet muted palette version
│   │
│   └── 📁 PDF Portfolio Sheet
│       ├── Tab structure + color shading
│       ├── GLB viewer (static → hover spin → click fullscreen)
│       ├── Photo reel per project
│       ├── Pagination (next page button per tab)
│       └── PDF export (clean/neutral)
│
├── 📁 Bug Fixes
│   ├── Fix door animation
│   ├── Fix robot animation
│   ├── Fix robot camera position
│   └── Remove cabin entry text in robot mode
│
└── 📁 Cabin Experience
    ├── 2-second hint overlay ("Press A to auto-explore")
    ├── Auto-explore mode
    ├── Cabin ambient sounds
    ├── Cabin entry stamp animation
    ├── Gondola visited lights (off → warm glow when visited)
    ├── Wheel idle slow rotation
    ├── Populate cabins (GLBs, descriptions, links)
    ├── ? keybind (hotkeys card, carnival program style)
    │
    ├── 📁 Welcome Screen
    │   ├── Remove auto-dismiss
    │   ├── Portfolio link on sign
    │   ├── Obvious click cue
    │   └── Wheel visible behind sign
    │
    ├── 📁 Robot & Ticket Booth
    │   ├── Color the robot
    │   ├── Booth texture (wood/light reflection)
    │   ├── Robot idle animations
    │   ├── CV gating through chat
    │   └── 3-minute engagement wave
    │
    └── 📁 Easter Eggs
        ├── Stamp passport (Press B, all 6 cabins → email capture)
        └── Guestbook → Google Form (About Me cabin)
```

---

## Vibe Reference

| Vibe | Palette | Energy |
|------|---------|--------|
| Suave | Dark purple-blue, glowing spokes | Default. Sophisticated first impression |
| Carnival | Warm amber/red, string lights | Nostalgic fair energy |
| Noir | Charcoal/black, single amber light, rain particles | Cinematic, brooding |
| Blueprint | Deep navy, white linework, wireframe GLBs | Technical precision |
| Midnight Arcade | Massive neon tubes, everything outlined | Video game title screen |
| Pop Art | Stark white, bold flat primaries, thick outlines | Lichtenstein meets theme park |

Vibe switch cycles on click → lights flicker (randomised pattern) → machinery startup sound → world reboots.
UI buttons tint with active palette. PDF sheet picks up muted palette version. Exported PDF always clean/neutral.

---

## PDF Portfolio Sheet — Notes

- Multicolored tabbed file holder, one tab per cabin section
- Each project within a tab has its own section, graduating color shades down the page
- Unlimited projects per tab — overflow handled by next/prev page button (not scroll)
- Page indicator sits subtly on the tab (e.g. 1 / 2)
- **GLB viewer:** static by default → hover = spins flat (2D, drawn-on-page feel) → click = fullscreen, fully 3D, arrow keys rotate, ESC exits
- **Photo reel:** framed photo, two white arrows, one image at a time, PNGs (real world + alternate angles)
- **Export:** always clean/neutral regardless of active vibe

---

## Robot & Ticket Booth — Notes

- Robot lives permanently in the ticket booth — stationary, always findable
- Existential personality — questions, philosophical, turns things back on the visitor
- CV is gated: visitor requests it through chat → robot asks for their email → CV sent privately
- New booth context and coloring can be fed into robot prompt as additional information
- Fallback: shrugs animation + charming deflection line if algorithm doesn't catch something

---

## Easter Egg — Stamp Passport

- Press `B` anywhere to open a worn passport UI
- Each of the 6 cabins stamps it on visit
- Complete all 6 → prompted to enter email → fires to a form you own
- Strong signal: someone who completes all 6 is a genuinely engaged visitor

---

## Easter Egg — Guestbook

- Lives in the About Me cabin
- Visitor writes a note → submits to a Google Form → you receive it
- Not stored in JS (stateless) — all persistence via Google Form
