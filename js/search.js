// ==========================================================================
// Command Palette (Ctrl+K) & Instant Global Search
// ==========================================================================

import { store } from './state.js';
import { viewport } from './viewport.js';
import { sound } from './audio.js';

class CommandPalette {
  constructor() {
    this.modalEl = null;
    this.inputEl = null;
    this.resultsEl = null;
    this.isOpen = false;
    this.activeIndex = 0;
    this.results = [];

    this.onActionTrigger = null;
  }

  mount(modalEl, inputEl, resultsEl, onActionTrigger) {
    this.modalEl = modalEl;
    this.inputEl = inputEl;
    this.resultsEl = resultsEl;
    this.onActionTrigger = onActionTrigger;

    this.setupEvents();
  }

  setupEvents() {
    // Keyboard shortcut Ctrl+K / Cmd+K
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.toggle();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Close on clicking backdrop
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.close();
      }
    });

    // Input search query
    this.inputEl.addEventListener('input', () => {
      this.filterResults();
    });

    // Arrow navigation & Enter
    this.inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.navigate(1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.navigate(-1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this.executeActive();
      }
    });
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.modalEl.classList.add('is-open');
    this.inputEl.value = '';
    this.filterResults();
    setTimeout(() => this.inputEl.focus(), 50);
  }

  close() {
    this.isOpen = false;
    this.modalEl.classList.remove('is-open');
  }

  filterResults() {
    const query = this.inputEl.value.trim().toLowerCase();
    this.results = [];

    // Built-in commands
    const commands = [
      { id: 'cmd-note', type: 'action', title: 'Add Note Card', subtitle: 'Shortcut: N', icon: '📝', action: 'add-note' },
      { id: 'cmd-todo', type: 'action', title: 'Add Checklist Card', subtitle: 'Shortcut: T', icon: '📋', action: 'add-checklist' },
      { id: 'cmd-code', type: 'action', title: 'Add Code Snippet', subtitle: 'Shortcut: C', icon: '💻', action: 'add-code' },
      { id: 'cmd-fit', type: 'action', title: 'Fit All Cards to Screen', subtitle: 'Shortcut: F', icon: '🔲', action: 'fit' },
      { id: 'cmd-export', type: 'action', title: 'Export Markdown & Backup', subtitle: 'Open export modal', icon: '📄', action: 'export' },
      { id: 'cmd-clear', type: 'action', title: 'Clear Entire Board', subtitle: 'Reset canvas', icon: '🧹', action: 'clear' }
    ];

    if (!query) {
      this.results.push(...commands);
    } else {
      // Filter commands
      commands.forEach(cmd => {
        if (cmd.title.toLowerCase().includes(query) || cmd.subtitle.toLowerCase().includes(query)) {
          this.results.push(cmd);
        }
      });
    }

    // Search through all Cards
    const cards = store.getAllCards();
    cards.forEach(card => {
      let match = false;
      let matchedSnippet = '';

      if (card.title && card.title.toLowerCase().includes(query)) {
        match = true;
      }
      if (card.content && card.content.toLowerCase().includes(query)) {
        match = true;
        matchedSnippet = card.content.slice(0, 40) + '...';
      }
      if (card.items && Array.isArray(card.items)) {
        const itemMatch = card.items.find(i => i.text.toLowerCase().includes(query));
        if (itemMatch) {
          match = true;
          matchedSnippet = `Task: ${itemMatch.text}`;
        }
      }
      if (card.code && card.code.toLowerCase().includes(query)) {
        match = true;
        matchedSnippet = `Code snippet (${card.lang || 'js'})`;
      }

      if (!query || match) {
        this.results.push({
          id: `card-${card.id}`,
          type: 'card',
          cardId: card.id,
          title: card.title || 'Untitled Card',
          subtitle: matchedSnippet || (card.type === 'checklist' ? 'Checklist' : card.type === 'code' ? 'Code Snippet' : 'Note'),
          color: card.color,
          icon: card.type === 'checklist' ? '📋' : card.type === 'code' ? '💻' : '📝'
        });
      }
    });

    this.activeIndex = 0;
    this.renderResults();
  }

  renderResults() {
    this.resultsEl.innerHTML = '';

    if (this.results.length === 0) {
      this.resultsEl.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13px;">
          No matching cards or commands found.
        </div>
      `;
      return;
    }

    let hasActionGroup = false;
    let hasCardGroup = false;

    this.results.forEach((item, index) => {
      // Group headings
      if (item.type === 'action' && !hasActionGroup) {
        hasActionGroup = true;
        const groupEl = document.createElement('div');
        groupEl.className = 'cmd-group-label';
        groupEl.textContent = 'Actions';
        this.resultsEl.appendChild(groupEl);
      } else if (item.type === 'card' && !hasCardGroup) {
        hasCardGroup = true;
        const groupEl = document.createElement('div');
        groupEl.className = 'cmd-group-label';
        groupEl.textContent = 'Cards on Canvas';
        this.resultsEl.appendChild(groupEl);
      }

      const itemEl = document.createElement('div');
      itemEl.className = `cmd-result-item ${index === this.activeIndex ? 'is-active' : ''}`;

      itemEl.innerHTML = `
        <div class="cmd-result-left">
          <span class="cmd-result-icon">${item.icon}</span>
          <span class="cmd-result-title">${this.escapeHtml(item.title)}</span>
          <span class="cmd-result-subtitle">${this.escapeHtml(item.subtitle)}</span>
        </div>
        ${item.color ? `<span class="cmd-result-badge" style="color:var(--color-${item.color}-light)">${item.color}</span>` : ''}
      `;

      itemEl.addEventListener('mouseenter', () => {
        this.activeIndex = index;
        this.updateActiveItem();
      });

      itemEl.addEventListener('click', () => {
        this.executeItem(item);
      });

      this.resultsEl.appendChild(itemEl);
    });

    this.scrollToActive();
  }

  navigate(dir) {
    if (this.results.length === 0) return;
    this.activeIndex = (this.activeIndex + dir + this.results.length) % this.results.length;
    this.updateActiveItem();
    this.scrollToActive();
  }

  updateActiveItem() {
    const items = this.resultsEl.querySelectorAll('.cmd-result-item');
    items.forEach((el, idx) => {
      el.classList.toggle('is-active', idx === this.activeIndex);
    });
  }

  scrollToActive() {
    const activeEl = this.resultsEl.querySelectorAll('.cmd-result-item')[this.activeIndex];
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }

  executeActive() {
    if (this.results.length > 0 && this.results[this.activeIndex]) {
      this.executeItem(this.results[this.activeIndex]);
    }
  }

  executeItem(item) {
    this.close();

    if (item.type === 'action') {
      if (this.onActionTrigger) {
        this.onActionTrigger(item.action);
      }
    } else if (item.type === 'card') {
      const card = store.getCard(item.cardId);
      if (card) {
        store.selectSingleCard(card.id);
        viewport.flyTo(card.x + (card.width || 320) / 2, card.y + 120, null, 400);

        // Visual flash ping on target card
        const cardEl = document.getElementById(`card-${card.id}`);
        if (cardEl) {
          cardEl.style.boxShadow = '0 0 0 3px var(--color-cyan), 0 0 35px var(--color-cyan-glow)';
          setTimeout(() => {
            cardEl.style.boxShadow = '';
          }, 1200);
        }
        sound.playPop(620);
      }
    }
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }
}

export const searchPalette = new CommandPalette();
