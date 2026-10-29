// ==========================================================================
// Pre-configured Starter Boards & Templates
// ==========================================================================

export const TEMPLATES = {
  'apple-glass': {
    id: 'apple-glass',
    name: '🍎 Apple Glass Showcase',
    description: 'visionOS weather widgets, macOS project finder, and optical glass cards',
    viewport: { x: 320, y: 160, scale: 0.95 },
    cards: [
      {
        id: 'card-weather',
        type: 'weather',
        title: 'Weather Glance',
        color: 'sky',
        x: 60,
        y: 60,
        width: 300,
        city: 'Toronto',
        day: 'Today',
        icon: '⛅',
        temp: '21°',
        cond: 'Mostly Cloudy'
      },
      {
        id: 'card-finder',
        type: 'finder',
        title: 'Downloads & Projects',
        color: 'periwinkle',
        x: 420,
        y: 60,
        width: 360,
        folders: [
          { name: 'geist-font', items: '6 Items', icon: '📁' },
          { name: 'PulseBoard', items: '12 Items', icon: '📁' },
          { name: 'AtlasApp', items: '8 Items', icon: '📁' },
          { name: 'Invoices', items: '48 Items', icon: '📁' },
          { name: 'DesignKit', items: '24 Items', icon: '📁' },
          { name: 'Assets', items: '16 Items', icon: '📁' }
        ]
      },
      {
        id: 'card-vision',
        type: 'note',
        title: 'Liquid Glass Vision',
        color: 'lavender',
        x: 60,
        y: 390,
        width: 300,
        content: `Apple visionOS & macOS liquid glass aesthetic with optical refraction over high-contrast atmospheric landscapes.\n\n• Molded specular bevels\n• Prismatic chromatic edges\n• Fluid spatial canvas`
      },
      {
        id: 'card-tasks',
        type: 'checklist',
        title: 'Milestone Checklist',
        color: 'frost',
        x: 420,
        y: 390,
        width: 360,
        items: [
          { id: 't-1', text: 'visionOS optical glass materials', done: true },
          { id: 't-2', text: 'macOS window traffic lights (🔴🟡🟢)', done: true },
          { id: 't-3', text: 'Scenic atmospheric wallpaper switcher', done: true },
          { id: 't-4', text: 'Mobile responsive liquid HUD islands', done: true }
        ]
      },
      {
        id: 'card-code',
        type: 'code',
        title: 'Optical Refraction Formula',
        color: 'indigo',
        x: 840,
        y: 180,
        width: 340,
        lang: 'css',
        code: `/* Apple Optical Glass Specular Bevel */\n.glass-pill {\n  background: rgba(255, 255, 255, 0.42);\n  backdrop-filter: blur(32px) saturate(190%);\n  border: 1px solid rgba(255, 255, 255, 0.65);\n  box-shadow: inset 0 1.5px 1.5px #fff;\n}`
      }
    ],
    connections: [
      { id: 'conn-g1', fromCard: 'card-weather', fromPort: 'right', toCard: 'card-finder', toPort: 'left' },
      { id: 'conn-g2', fromCard: 'card-weather', fromPort: 'bottom', toCard: 'card-vision', toPort: 'top' },
      { id: 'conn-g3', fromCard: 'card-finder', fromPort: 'bottom', toCard: 'card-tasks', toPort: 'top' },
      { id: 'conn-g4', fromCard: 'card-finder', fromPort: 'right', toCard: 'card-code', toPort: 'left' }
    ]
  },

  startup: {
    id: 'startup',
    name: '⚡ Product Launch Plan',
    description: 'Vision, roadmap, architecture, and launch checklist',
    viewport: { x: 340, y: 180, scale: 0.95 },
    cards: [
      {
        id: 'card-1',
        type: 'note',
        title: '🚀 MindCanvas Vision',
        color: 'periwinkle',
        x: 60,
        y: 60,
        width: 320,
        content: `Build the fastest, most delightful spatial canvas for thinkers, creators, and developers.\n\n- Zero friction note-taking\n- Natural spatial organization\n- Instant Markdown & JSON export\n- Real-time magnetic wire links`
      },
      {
        id: 'card-2',
        type: 'checklist',
        title: '🎯 Roadmap Milestones',
        color: 'sky',
        x: 460,
        y: 60,
        width: 340,
        items: [
          { id: 'item-1', text: 'Build spatial zoom & pan engine', done: true },
          { id: 'item-2', text: 'Reactive bezier connection curves', done: true },
          { id: 'item-3', text: 'Web Audio API synthesizer cues', done: true },
          { id: 'item-4', text: 'Markdown & JSON document exporter', done: true },
          { id: 'item-5', text: 'Mobile pinch-to-zoom testing', done: false }
        ]
      },
      {
        id: 'card-3',
        type: 'code',
        title: '⚡ Canvas Transform Engine',
        color: 'indigo',
        x: 60,
        y: 380,
        width: 340,
        lang: 'javascript',
        code: `// Screen to World Space Transformation\nfunction screenToWorld(sx, sy, pan, scale) {\n  return {\n    x: (sx - pan.x) / scale,\n    y: (sy - pan.y) / scale\n  };\n}`
      },
      {
        id: 'card-4',
        type: 'checklist',
        title: '📋 Launch Day Checklist',
        color: 'lavender',
        x: 460,
        y: 400,
        width: 340,
        items: [
          { id: 'l-1', text: 'Record snappy demo teaser video', done: true },
          { id: 'l-2', text: 'Verify cross-browser canvas rendering', done: true },
          { id: 'l-3', text: 'Create ProductHunt launch asset pack', done: false },
          { id: 'l-4', text: 'Deploy live preview to production', done: false }
        ]
      },
      {
        id: 'card-5',
        type: 'note',
        title: '💡 Growth & Distribution Ideas',
        color: 'lilac',
        x: 880,
        y: 180,
        width: 300,
        content: `Channels to explore:\n\n• Show HN: "MindCanvas - Spatial scratchpad for developers"\n• Twitter / X demo threads with sound on\n• Reddit r/webdev & r/productivity\n• GitHub open source showcase`
      }
    ],
    connections: [
      { id: 'conn-1', fromCard: 'card-1', fromPort: 'right', toCard: 'card-2', toPort: 'left' },
      { id: 'conn-2', fromCard: 'card-1', fromPort: 'bottom', toCard: 'card-3', toPort: 'top' },
      { id: 'conn-3', fromCard: 'card-2', fromPort: 'bottom', toCard: 'card-4', toPort: 'top' },
      { id: 'conn-4', fromCard: 'card-2', fromPort: 'right', toCard: 'card-5', toPort: 'left' }
    ]
  },

  brainstorm: {
    id: 'brainstorm',
    name: '🧠 Creative App Brainstorm',
    description: 'User personas, feature nodes, and problem spaces',
    viewport: { x: 380, y: 220, scale: 0.95 },
    cards: [
      {
        id: 'b-1',
        type: 'note',
        title: 'Core Problem Statement',
        color: 'lavender',
        x: 100,
        y: 100,
        width: 320,
        content: `Traditional linear note-taking apps restrict non-linear thinking. When brainstorming architectures or user journeys, humans think spatially and connect ideas with lines.`
      },
      {
        id: 'b-2',
        type: 'note',
        title: 'Target Personas',
        color: 'sky',
        x: 500,
        y: 60,
        width: 320,
        content: `1. Full-Stack Developers mapping system diagrams\n2. Product Designers sketching user flows\n3. Students organizing research synthesis`
      },
      {
        id: 'b-3',
        type: 'checklist',
        title: 'Killer Features',
        color: 'periwinkle',
        x: 500,
        y: 340,
        width: 320,
        items: [
          { id: 'bf-1', text: 'Frosted glass panels with layered depth', done: true },
          { id: 'bf-2', text: 'Soft ambient blue and purple lighting', done: true },
          { id: 'bf-3', text: 'Live Minimap radar overview', done: true },
          { id: 'bf-4', text: 'Zero latency markdown export', done: true }
        ]
      }
    ],
    connections: [
      { id: 'b-conn-1', fromCard: 'b-1', fromPort: 'right', toCard: 'b-2', toPort: 'left' },
      { id: 'b-conn-2', fromCard: 'b-1', fromPort: 'bottom', toCard: 'b-3', toPort: 'left' }
    ]
  },

  blank: {
    id: 'blank',
    name: '✨ Blank Slate',
    description: 'Clean infinite canvas ready for your ideas',
    viewport: { x: 500, y: 300, scale: 1.0 },
    cards: [
      {
        id: 'welcome-card',
        type: 'note',
        title: '👋 Welcome to MindCanvas',
        color: 'periwinkle',
        x: 200,
        y: 120,
        width: 340,
        content: `Double click anywhere or press 'N' to add a note.\n\n• Press 'T' for a Checklist\n• Press 'C' for Code Snippet\n• Drag dots to connect cards\n• Hold Space + Drag to pan`
      }
    ],
    connections: []
  }
};
