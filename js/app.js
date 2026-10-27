// ==========================================================================
// MindCanvas Master Application Controller & Orchestration
// ==========================================================================

import { store } from './state.js';
import { viewport } from './viewport.js';
import { cards } from './cards.js';
import { connections } from './connections.js';
import { minimap } from './minimap.js';
import { searchPalette } from './search.js';
import { exporter } from './export.js';
import { sound } from './audio.js';

class MindCanvasApp {
  constructor() {
    this.toastContainer = null;
  }

  init() {
    this.toastContainer = document.getElementById('toast-container');

    // 1. Mount Viewport
    viewport.mount(
      document.getElementById('canvas-viewport'),
      document.getElementById('canvas-world'),
      document.getElementById('canvas-grid')
    );

    // 2. Mount Connections Layer
    connections.mount(document.getElementById('connections-svg'));

    // 3. Mount Cards Layer
    cards.mount(
      document.getElementById('cards-layer'),
      {
        onStart: (cardId, port, e) => connections.startConnectionDrag(cardId, port, e),
        onMove: (e) => connections.handlePointerMove(e),
        onEnd: (e) => connections.handlePointerUp(e)
      }
    );

    // 4. Mount Minimap
    minimap.mount(
      document.getElementById('minimap-container'),
      document.getElementById('minimap-canvas'),
      document.getElementById('minimap-viewport-indicator'),
      document.getElementById('minimap-toggle-btn')
    );

    // 5. Mount Search Command Palette
    searchPalette.mount(
      document.getElementById('cmd-palette-modal'),
      document.getElementById('cmd-search-input'),
      document.getElementById('cmd-results-list'),
      (action) => this.handleQuickAction(action)
    );

    // 6. Mount Exporter Modal
    exporter.mount(
      document.getElementById('export-modal'),
      document.getElementById('export-preview-content'),
      (msg, type) => this.showToast(msg, type)
    );

    // 7. Wire UI Controls & Shortcuts
    this.setupHUDControls();
    this.setupKeyboardShortcuts();
    this.setupDoubleTapCanvas();
    this.updateStatsDisplay();

    // Subscribe to state changes for stats
    store.subscribe('*', () => this.updateStatsDisplay());
    viewport.subscribe(({ scale }) => {
      const zoomPctBtn = document.getElementById('zoom-pct-btn');
      if (zoomPctBtn) {
        zoomPctBtn.textContent = `${Math.round(scale * 100)}%`;
      }
    });

    this.showToast('✨ Welcome to MindCanvas! Press N to add notes, space+drag to pan.', 'info', 4000);
  }

  setupHUDControls() {
    // Add Note Button
    document.getElementById('btn-add-note').addEventListener('click', () => {
      this.addNewCardAtCenter('note');
    });

    // Add Checklist Button
    document.getElementById('btn-add-checklist').addEventListener('click', () => {
      this.addNewCardAtCenter('checklist');
    });

    // Add Code Button
    document.getElementById('btn-add-code').addEventListener('click', () => {
      this.addNewCardAtCenter('code');
    });

    // Search Trigger
    document.getElementById('btn-search-trigger').addEventListener('click', () => {
      searchPalette.open();
    });

    // Audio SFX Toggle
    const soundBtn = document.getElementById('btn-sound-toggle');
    if (!sound.isSoundEnabled()) soundBtn.classList.add('sound-muted');
    soundBtn.addEventListener('click', () => {
      const enabled = sound.toggleSound();
      soundBtn.classList.toggle('sound-muted', !enabled);
      this.showToast(enabled ? '🔊 Sound effects on' : '🔇 Sound effects muted', 'info');
    });

    // Templates Dropdown
    const tplBtn = document.getElementById('btn-templates');
    const tplMenu = document.getElementById('templates-menu');
    tplBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      tplMenu.classList.toggle('is-open');
    });
    window.addEventListener('click', () => tplMenu.classList.remove('is-open'));

    tplMenu.querySelectorAll('.template-item').forEach(item => {
      item.addEventListener('click', () => {
        const tplKey = item.getAttribute('data-template');
        store.loadTemplate(tplKey);
        viewport.fitToScreen();
        sound.playPop(520);
        this.showToast(`Loaded ${item.textContent.trim()}`, 'success');
      });
    });

    // Export Trigger
    document.getElementById('btn-export-trigger').addEventListener('click', () => {
      exporter.open();
    });

    // Import File Trigger
    const fileInput = document.getElementById('import-file-input');
    document.getElementById('btn-import-trigger').addEventListener('click', () => {
      fileInput.click();
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        exporter.importJSONFile(e.target.files[0]);
        fileInput.value = '';
      }
    });

    // Clear Board
    document.getElementById('btn-clear-board').addEventListener('click', () => {
      if (confirm('Are you sure you want to clear the canvas?')) {
        store.clearBoard();
        sound.playCut();
        this.showToast('Canvas cleared', 'info');
      }
    });

    // Bottom-Left Zoom Controls
    document.getElementById('btn-zoom-in').addEventListener('click', () => viewport.zoomIn());
    document.getElementById('btn-zoom-out').addEventListener('click', () => viewport.zoomOut());
    document.getElementById('zoom-pct-btn').addEventListener('click', () => viewport.resetZoom());
    document.getElementById('btn-fit-screen').addEventListener('click', () => viewport.fitToScreen());
  }

  setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (this.isTyping(e)) return;

      const key = e.key.toLowerCase();

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          store.redo();
          this.showToast('Redo', 'info');
        } else {
          store.undo();
          this.showToast('Undo', 'info');
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && key === 'y') {
        e.preventDefault();
        store.redo();
        this.showToast('Redo', 'info');
        return;
      }

      // Add Card Shortcuts
      if (key === 'n') {
        e.preventDefault();
        this.addNewCardAtCenter('note');
      } else if (key === 't') {
        e.preventDefault();
        this.addNewCardAtCenter('checklist');
      } else if (key === 'c') {
        e.preventDefault();
        this.addNewCardAtCenter('code');
      } else if (key === 'f') {
        e.preventDefault();
        viewport.fitToScreen();
      } else if (key === 'delete' || key === 'backspace') {
        // Delete selected card(s)
        const selected = Array.from(store.state.selectedCardIds);
        if (selected.length > 0) {
          e.preventDefault();
          selected.forEach(id => store.removeCard(id));
          sound.playCut();
          this.showToast('Card removed', 'info');
        }
      }
    });
  }

  setupDoubleTapCanvas() {
    const viewportEl = document.getElementById('canvas-viewport');
    viewportEl.addEventListener('dblclick', (e) => {
      // Don't trigger if clicked on an existing card or HUD
      if (e.target.closest('.canvas-card') || e.target.closest('#top-hud') || e.target.closest('#bottom-left-hud') || e.target.closest('#minimap-wrapper')) {
        return;
      }

      const worldPos = viewport.screenToWorld(e.clientX, e.clientY);
      const card = store.addCard({
        type: 'note',
        title: 'New Idea',
        x: Math.round(worldPos.x - 160),
        y: Math.round(worldPos.y - 80),
        color: this.getRandomColor()
      });

      sound.playPop(580);

      // Focus title immediately
      setTimeout(() => {
        const titleInput = document.querySelector(`#card-${card.id} .card-title-input`);
        if (titleInput) {
          titleInput.focus();
          titleInput.select();
        }
      }, 50);
    });
  }

  addNewCardAtCenter(type) {
    const bounds = viewport.getViewportWorldBounds();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;

    const colors = {
      note: 'periwinkle',
      checklist: 'lavender',
      code: 'sky'
    };

    const card = store.addCard({
      type,
      title: type === 'checklist' ? 'New Checklist' : type === 'code' ? 'Code Snippet' : 'New Note',
      x: Math.round(centerX - 160),
      y: Math.round(centerY - 100),
      color: colors[type] || 'periwinkle'
    });

    sound.playPop(520);
    this.showToast(`Added ${type} card`, 'info');

    setTimeout(() => {
      const cardEl = document.getElementById(`card-${card.id}`);
      if (cardEl) {
        const input = cardEl.querySelector('.card-title-input');
        if (input) {
          input.focus();
          input.select();
        }
      }
    }, 50);
  }

  handleQuickAction(action) {
    switch (action) {
      case 'add-note': this.addNewCardAtCenter('note'); break;
      case 'add-checklist': this.addNewCardAtCenter('checklist'); break;
      case 'add-code': this.addNewCardAtCenter('code'); break;
      case 'fit': viewport.fitToScreen(); break;
      case 'export': exporter.open(); break;
      case 'clear':
        if (confirm('Clear entire board?')) {
          store.clearBoard();
          sound.playCut();
        }
        break;
    }
  }

  updateStatsDisplay() {
    const cards = store.getAllCards();
    const conns = store.getAllConnections();
    const pill = document.getElementById('canvas-stats-pill');
    if (pill) {
      pill.textContent = `${cards.length} cards • ${conns.length} links`;
    }
  }

  getRandomColor() {
    const colors = ['periwinkle', 'lavender', 'sky', 'lilac', 'indigo', 'frost'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  isTyping(e) {
    const tag = e.target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;
  }

  showToast(message, type = 'info', duration = 2600) {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
      success: '✓',
      info: '✦',
      warning: '⚠'
    };

    toast.innerHTML = `
      <span class="toast-icon">${icons[type] || '✦'}</span>
      <span>${message}</span>
    `;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      setTimeout(() => toast.remove(), 260);
    }, duration);
  }
}

// Boot application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new MindCanvasApp();
  app.init();
});
