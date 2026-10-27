# 🧠 MindCanvas — Infinite Spatial Scratchpad & Visual Mind Map

> A high-performance, aesthetically stunning infinite spatial canvas for non-linear brainstorming, task checklists, code snippets, magnetic idea connections, and instant Markdown/JSON export.

![MindCanvas Screenshot](https://raw.githubusercontent.com/kanishksigar/assets/main/mindcanvas-preview.png)

---

## ✨ Features

- **🌌 Infinite Spatial Canvas**:
  - Smooth pan and cursor-anchored zoom (15% to 300%).
  - Responsive dynamic dot-grid background that scales with world-space coordinates.
  - Radial ambient glow and deep glassmorphic dark-mode palette.
- **📑 Multi-Type Interactive Cards**:
  - **Notes / Thoughts**: Auto-expanding rich textcards with markdown-ready typography.
  - **Task Checklists**: Interactive checkboxes with dynamic progress percentage bars.
  - **Code Snippets**: Monospace font, language selector, and 1-click clipboard copy with animated feedback.
- **🕸️ Dynamic Bezier Connections**:
  - Drag connection lines between cards with magnetic snapping to connection ports (Top, Right, Bottom, Left).
  - Ambient glow strokes matching card theme colors with inline cut/delete pills.
- **🗺️ Live Minimap Radar**:
  - Real-time miniature radar in the bottom-right corner displaying all cards as color chips.
  - Draggable & clickable viewport box to jump across the canvas.
- **⚡ Command Palette (`Ctrl + K`)**:
  - Instant global search across note titles, checklist items, and code contents.
  - Fly-to-card camera transitions with spotlight ping animations.
- **🎶 Web Audio API Sound Synthesizer**:
  - Zero external sound files — pure procedural audio cues for card creation, magnetic snapping, task completion, and whoosh transitions.
- **📄 Instant Export & Backup**:
  - One-click structured **Markdown** export (`.md`) grouping cards and documenting connection links.
  - Full **JSON** backup & import.

---

## ⌨️ Keyboard & Mouse Controls

| Action | Shortcut |
| :--- | :--- |
| **Pan Canvas** | `Space + Left Drag` or `Middle Click Drag` or Drag empty canvas |
| **Zoom In / Out** | `Mouse Wheel` (centered at cursor) or `+` / `-` in HUD |
| **Fit to Screen** | `F` |
| **Quick Add Note** | `N` or Double Click empty canvas |
| **Quick Add Checklist** | `T` |
| **Quick Add Code** | `C` |
| **Global Search** | `Ctrl + K` or `Cmd + K` |
| **Delete Card** | `Delete` or `Backspace` |
| **Undo / Redo** | `Ctrl + Z` / `Ctrl + Y` |

---

## 🚀 Quick Start

MindCanvas runs natively with zero external dependencies:

```bash
# Start the local server
node server.js

# Or with npm
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.
