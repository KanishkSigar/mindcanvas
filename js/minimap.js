// ==========================================================================
// Interactive Live Minimap Radar
// ==========================================================================

import { store } from './state.js';
import { viewport } from './viewport.js';

class MinimapEngine {
  constructor() {
    this.container = null;
    this.canvas = null;
    this.ctx = null;
    this.indicator = null;
    this.toggleBtn = null;

    this.isDraggingViewport = false;
    this.isCollapsed = false;

    this.minimapWidth = 180;
    this.minimapHeight = 120;
    this.worldBounds = { minX: 0, minY: 0, maxX: 1000, maxY: 1000 };
  }

  mount(container, canvas, indicator, toggleBtn) {
    this.container = container;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.indicator = indicator;
    this.toggleBtn = toggleBtn;

    this.canvas.width = this.minimapWidth * window.devicePixelRatio;
    this.canvas.height = this.minimapHeight * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    this.setupEvents();
    this.render();

    viewport.subscribe(() => this.render());
    store.subscribe('*', () => this.render());
  }

  setupEvents() {
    this.toggleBtn.addEventListener('click', () => {
      this.isCollapsed = !this.isCollapsed;
      this.container.classList.toggle('is-collapsed', this.isCollapsed);
      this.toggleBtn.textContent = this.isCollapsed ? '🗺️ Radar' : '✕ Hide';
    });

    // Clicking / Dragging on Minimap
    this.container.addEventListener('mousedown', (e) => {
      if (e.target === this.toggleBtn) return;
      this.isDraggingViewport = true;
      this.handleMinimapClick(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDraggingViewport) {
        this.handleMinimapClick(e);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDraggingViewport = false;
    });
  }

  handleMinimapClick(e) {
    const rect = this.container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const boundsW = this.worldBounds.maxX - this.worldBounds.minX;
    const boundsH = this.worldBounds.maxY - this.worldBounds.minY;

    // Convert minimap pixel to world space
    const targetWorldX = this.worldBounds.minX + (clickX / this.minimapWidth) * boundsW;
    const targetWorldY = this.worldBounds.minY + (clickY / this.minimapHeight) * boundsH;

    viewport.flyTo(targetWorldX, targetWorldY, null, 200);
  }

  render() {
    if (this.isCollapsed || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.minimapWidth, this.minimapHeight);

    const cards = store.getAllCards();
    const vpBounds = viewport.getViewportWorldBounds();

    // Compute bounding box enclosing all cards AND current viewport
    let minX = vpBounds.x;
    let minY = vpBounds.y;
    let maxX = vpBounds.x + vpBounds.width;
    let maxY = vpBounds.y + vpBounds.height;

    cards.forEach(c => {
      minX = Math.min(minX, c.x);
      minY = Math.min(minY, c.y);
      maxX = Math.max(maxX, c.x + (c.width || 320));
      maxY = Math.max(maxY, c.y + 240);
    });

    // Add 10% breathing room
    const pad = 200;
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;

    this.worldBounds = { minX, minY, maxX, maxY };

    const totalW = maxX - minX;
    const totalH = maxY - minY;

    const scaleX = this.minimapWidth / totalW;
    const scaleY = this.minimapHeight / totalH;

    // 1. Draw connections on minimap
    const conns = store.getAllConnections();
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    this.ctx.lineWidth = 1;
    conns.forEach(conn => {
      const fromCard = store.getCard(conn.fromCard);
      const toCard = store.getCard(conn.toCard);
      if (fromCard && toCard) {
        const x1 = (fromCard.x + (fromCard.width || 320) / 2 - minX) * scaleX;
        const y1 = (fromCard.y + 100 - minY) * scaleY;
        const x2 = (toCard.x + (toCard.width || 320) / 2 - minX) * scaleX;
        const y2 = (toCard.y + 100 - minY) * scaleY;

        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
      }
    });

    // 2. Draw Cards as mini colored chips
    cards.forEach(card => {
      const rx = (card.x - minX) * scaleX;
      const ry = (card.y - minY) * scaleY;
      const rw = Math.max((card.width || 320) * scaleX, 4);
      const rh = Math.max(160 * scaleY, 3);

      this.ctx.fillStyle = this.getColorHex(card.color);
      this.ctx.beginPath();
      this.ctx.roundRect ? this.ctx.roundRect(rx, ry, rw, rh, 2) : this.ctx.rect(rx, ry, rw, rh);
      this.ctx.fill();
    });

    // 3. Position the Viewport Indicator
    const indX = Math.max(0, (vpBounds.x - minX) * scaleX);
    const indY = Math.max(0, (vpBounds.y - minY) * scaleY);
    const indW = Math.min(this.minimapWidth - indX, vpBounds.width * scaleX);
    const indH = Math.min(this.minimapHeight - indY, vpBounds.height * scaleY);

    if (this.indicator) {
      this.indicator.style.left = `${indX}px`;
      this.indicator.style.top = `${indY}px`;
      this.indicator.style.width = `${Math.max(indW, 12)}px`;
      this.indicator.style.height = `${Math.max(indH, 8)}px`;
    }
  }

  getColorHex(colorName) {
    const map = {
      violet: '#8b5cf6',
      cyan: '#06b6d4',
      emerald: '#10b981',
      amber: '#f59e0b',
      rose: '#f43f5e',
      slate: '#64748b'
    };
    return map[colorName] || '#8b5cf6';
  }
}

export const minimap = new MinimapEngine();
