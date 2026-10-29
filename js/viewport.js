// ==========================================================================
// Infinite Spatial Canvas & Viewport Camera Engine
// ==========================================================================

import { store } from './state.js';

class ViewportEngine {
  constructor() {
    this.panX = 180;
    this.panY = 120;
    this.scale = 0.95;

    this.minScale = 0.15;
    this.maxScale = 3.0;

    this.isPanning = false;
    this.startPointerX = 0;
    this.startPointerY = 0;
    this.startPanX = 0;
    this.startPanY = 0;

    this.isSpacePressed = false;
    this.listeners = new Set();

    this.viewportEl = null;
    this.worldEl = null;
    this.gridEl = null;
  }

  mount(viewportEl, worldEl, gridEl) {
    this.viewportEl = viewportEl;
    this.worldEl = worldEl;
    this.gridEl = gridEl;

    this.setupEvents();
    this.updateTransform();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    this.listeners.forEach(cb => cb({
      panX: this.panX,
      panY: this.panY,
      scale: this.scale,
      bounds: this.getViewportWorldBounds()
    }));
  }

  setupEvents() {
    // Track Spacebar for quick pan toggle
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.isSpacePressed && !this.isTyping(e)) {
        this.isSpacePressed = true;
        this.viewportEl.style.cursor = 'grab';
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        this.isSpacePressed = false;
        if (!this.isPanning) {
          this.viewportEl.style.cursor = '';
        }
      }
    });

    // Mouse Down on Viewport
    this.viewportEl.addEventListener('mousedown', (e) => {
      // Middle click (button 1) or Space+LeftClick or clicking directly on empty canvas/grid
      const isMiddleClick = e.button === 1;
      const isLeftClick = e.button === 0;
      const isCanvasTarget = e.target === this.viewportEl || e.target === this.gridEl || e.target.id === 'canvas-world' || e.target.id === 'connections-svg';

      if (isMiddleClick || (isLeftClick && (this.isSpacePressed || isCanvasTarget))) {
        e.preventDefault();
        this.startPan(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      const dx = e.clientX - this.startPointerX;
      const dy = e.clientY - this.startPointerY;
      this.panX = this.startPanX + dx;
      this.panY = this.startPanY + dy;
      this.updateTransform();
    });

    window.addEventListener('mouseup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.viewportEl.classList.remove('is-panning');
        this.viewportEl.style.cursor = this.isSpacePressed ? 'grab' : '';
      }
    });

    // Wheel Zooming centered at cursor
    this.viewportEl.addEventListener('wheel', (e) => {
      // If user is scrolling inside a textarea or checklist with scrollbar, don't zoom
      if (this.isScrollableElement(e.target) && !e.ctrlKey) {
        return;
      }

      e.preventDefault();

      // Zoom sensitivity
      const zoomFactor = e.deltaY < 0 ? 1.09 : 0.915;
      const targetScale = Math.min(Math.max(this.scale * zoomFactor, this.minScale), this.maxScale);

      if (targetScale === this.scale) return;

      const mouseX = e.clientX;
      const mouseY = e.clientY;

      // Keep world coordinates under cursor stationary
      const worldX = (mouseX - this.panX) / this.scale;
      const worldY = (mouseY - this.panY) / this.scale;

      this.panX = mouseX - worldX * targetScale;
      this.panY = mouseY - worldY * targetScale;
      this.scale = targetScale;

      this.updateTransform();
    }, { passive: false });

    // Touch support for pinch zoom and drag
    this.setupTouchEvents();
  }

  isTyping(e) {
    const tag = e.target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;
  }

  isScrollableElement(el) {
    if (!el) return false;
    if (el.tagName === 'TEXTAREA' || el.classList?.contains('checklist-items') || el.classList?.contains('cmd-results-list')) {
      return el.scrollHeight > el.clientHeight;
    }
    return false;
  }

  startPan(clientX, clientY) {
    this.isPanning = true;
    this.startPointerX = clientX;
    this.startPointerY = clientY;
    this.startPanX = this.panX;
    this.startPanY = this.panY;
    this.viewportEl.classList.add('is-panning');
  }

  updateTransform() {
    if (!this.worldEl) return;
    this.worldEl.style.transform = `translate3d(${this.panX}px, ${this.panY}px, 0) scale(${this.scale})`;

    if (this.gridEl && this.gridEl.classList.contains('has-dot-grid')) {
      const gridSize = 28 * this.scale;
      this.gridEl.style.backgroundPosition = `${this.panX}px ${this.panY}px`;
      this.gridEl.style.backgroundSize = `${gridSize}px ${gridSize}px`;
    }

    this.notify();
  }

  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.panX) / this.scale,
      y: (screenY - this.panY) / this.scale
    };
  }

  worldToScreen(worldX, worldY) {
    return {
      x: worldX * this.scale + this.panX,
      y: worldY * this.scale + this.panY
    };
  }

  getViewportWorldBounds() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const topLeft = this.screenToWorld(0, 0);
    const bottomRight = this.screenToWorld(width, height);

    return {
      x: topLeft.x,
      y: topLeft.y,
      width: bottomRight.x - topLeft.x,
      height: bottomRight.y - topLeft.y
    };
  }

  zoomIn() {
    this.zoomToCenter(this.scale * 1.2);
  }

  zoomOut() {
    this.zoomToCenter(this.scale * 0.83);
  }

  resetZoom() {
    this.zoomToCenter(1.0);
  }

  zoomToCenter(targetScale) {
    const clampedScale = Math.min(Math.max(targetScale, this.minScale), this.maxScale);
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    const worldX = (centerX - this.panX) / this.scale;
    const worldY = (centerY - this.panY) / this.scale;

    this.panX = centerX - worldX * clampedScale;
    this.panY = centerY - worldY * clampedScale;
    this.scale = clampedScale;

    this.updateTransform();
  }

  flyTo(worldX, worldY, targetScale = null, duration = 400) {
    const startPanX = this.panX;
    const startPanY = this.panY;
    const startScale = this.scale;

    const finalScale = targetScale !== null ? Math.min(Math.max(targetScale, this.minScale), this.maxScale) : this.scale;
    const finalPanX = (window.innerWidth / 2) - (worldX * finalScale);
    const finalPanY = (window.innerHeight / 2) - (worldY * finalScale);

    const startTime = performance.now();

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Smooth easeInOutCubic
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.panX = startPanX + (finalPanX - startPanX) * ease;
      this.panY = startPanY + (finalPanY - startPanY) * ease;
      this.scale = startScale + (finalScale - startScale) * ease;

      this.updateTransform();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  fitToScreen() {
    const cards = store.getAllCards();
    if (cards.length === 0) {
      this.flyTo(0, 0, 1.0);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    cards.forEach(card => {
      minX = Math.min(minX, card.x);
      minY = Math.min(minY, card.y);
      maxX = Math.max(maxX, card.x + (card.width || 320));
      maxY = Math.max(maxY, card.y + (card.height || 260));
    });

    const padding = 120;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;

    const scaleX = window.innerWidth / contentW;
    const scaleY = window.innerHeight / contentH;
    const targetScale = Math.min(Math.max(Math.min(scaleX, scaleY), 0.3), 1.2);

    const centerX = minX - padding + contentW / 2;
    const centerY = minY - padding + contentH / 2;

    this.flyTo(centerX, centerY, targetScale, 450);
  }

  setupTouchEvents() {
    let initialDistance = 0;
    let initialScale = 1;

    this.viewportEl.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        initialDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialScale = this.scale;
      }
    }, { passive: true });

    this.viewportEl.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && initialDistance > 0) {
        const distance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = distance / initialDistance;
        this.scale = Math.min(Math.max(initialScale * factor, this.minScale), this.maxScale);
        this.updateTransform();
      }
    }, { passive: true });
  }
}

export const viewport = new ViewportEngine();
