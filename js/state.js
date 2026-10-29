// ==========================================================================
// Central Reactive State Store & Auto-Persistence
// ==========================================================================

import { TEMPLATES } from './templates.js';

const STORAGE_KEY = 'mindcanvas_board_v3';

class Store {
  constructor() {
    this.listeners = new Map();
    this.history = [];
    this.historyIndex = -1;
    this.isApplyingHistory = false;

    // Default Initial State
    this.state = {
      cards: [],
      connections: [],
      selectedCardIds: new Set(),
      activeConnectingPort: null,
      currentTemplate: 'apple-glass'
    };

    this.init();
  }

  init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.cards)) {
          this.state.cards = parsed.cards;
          this.state.connections = parsed.connections || [];
          this.recordHistory();
          return;
        }
      } catch (e) {
        console.warn('Failed to parse saved state, loading template:', e);
      }
    }

    // Default to the Apple Glass Showcase template
    this.loadTemplate('apple-glass', false);
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.listeners.get(event).delete(callback);
  }

  notify(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => cb(data, this.state));
    }
    if (this.listeners.has('*')) {
      this.listeners.get('*').forEach(cb => cb(event, data, this.state));
    }
    this.debounceSave();
  }

  debounceSave() {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this.saveToStorage();
    }, 400);
  }

  saveToStorage() {
    try {
      const payload = {
        cards: this.state.cards,
        connections: this.state.connections,
        updatedAt: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Could not save to localStorage', e);
    }
  }

  recordHistory() {
    if (this.isApplyingHistory) return;
    const snapshot = JSON.stringify({
      cards: this.state.cards,
      connections: this.state.connections
    });

    // Don't duplicate top snapshot
    if (this.history[this.historyIndex] === snapshot) return;

    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(snapshot);
    if (this.history.length > 30) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.applySnapshot(this.history[this.historyIndex]);
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.applySnapshot(this.history[this.historyIndex]);
    }
  }

  applySnapshot(jsonStr) {
    try {
      this.isApplyingHistory = true;
      const parsed = JSON.parse(jsonStr);
      this.state.cards = parsed.cards || [];
      this.state.connections = parsed.connections || [];
      this.state.selectedCardIds.clear();
      this.notify('board:reset', this.state);
    } finally {
      this.isApplyingHistory = false;
    }
  }

  // --- Card CRUD Operations ---

  addCard(cardData) {
    const id = cardData.id || `card-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newCard = {
      id,
      type: cardData.type || 'note',
      title: cardData.title || (cardData.type === 'checklist' ? 'Task List' : cardData.type === 'code' ? 'Code Snippet' : 'New Thought'),
      color: cardData.color || 'periwinkle',
      x: cardData.x ?? 100,
      y: cardData.y ?? 100,
      width: cardData.width || (cardData.type === 'code' ? 360 : 320),
      content: cardData.content || '',
      items: cardData.items || (cardData.type === 'checklist' ? [{ id: `item-${Date.now()}-1`, text: 'Explore idea', done: false }] : []),
      lang: cardData.lang || 'javascript',
      code: cardData.code || '',
      zIndex: this.getNextZIndex()
    };

    this.state.cards.push(newCard);
    this.selectSingleCard(id);
    this.recordHistory();
    this.notify('card:added', newCard);
    return newCard;
  }

  updateCard(id, updates, skipHistory = false) {
    const card = this.getCard(id);
    if (!card) return null;

    Object.assign(card, updates);
    if (!skipHistory && !('x' in updates || 'y' in updates)) {
      this.recordHistory();
    }
    this.notify('card:updated', { id, updates, card });
    return card;
  }

  removeCard(id) {
    const index = this.state.cards.findIndex(c => c.id === id);
    if (index === -1) return false;

    const removedCard = this.state.cards.splice(index, 1)[0];
    this.state.selectedCardIds.delete(id);

    // Also remove any connections tied to this card
    const removedConns = this.state.connections.filter(
      c => c.fromCard === id || c.toCard === id
    );
    this.state.connections = this.state.connections.filter(
      c => c.fromCard !== id && c.toCard !== id
    );

    this.recordHistory();
    this.notify('card:removed', { card: removedCard, removedConns });
    return true;
  }

  duplicateCard(id) {
    const original = this.getCard(id);
    if (!original) return null;

    const cloned = JSON.parse(JSON.stringify(original));
    cloned.id = `card-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    cloned.title = `${cloned.title} (Copy)`;
    cloned.x += 40;
    cloned.y += 40;
    cloned.zIndex = this.getNextZIndex();

    return this.addCard(cloned);
  }

  getCard(id) {
    return this.state.cards.find(c => c.id === id);
  }

  getAllCards() {
    return this.state.cards;
  }

  getNextZIndex() {
    const maxZ = this.state.cards.reduce((max, c) => Math.max(max, c.zIndex || 1), 1);
    return maxZ + 1;
  }

  bringToFront(id) {
    const card = this.getCard(id);
    if (card) {
      card.zIndex = this.getNextZIndex();
      this.notify('card:depth', { id, zIndex: card.zIndex });
    }
  }

  // --- Selection Methods ---

  selectSingleCard(id) {
    this.state.selectedCardIds.clear();
    if (id) {
      this.state.selectedCardIds.add(id);
      this.bringToFront(id);
    }
    this.notify('selection:change', Array.from(this.state.selectedCardIds));
  }

  toggleCardSelection(id) {
    if (this.state.selectedCardIds.has(id)) {
      this.state.selectedCardIds.delete(id);
    } else {
      this.state.selectedCardIds.add(id);
      this.bringToFront(id);
    }
    this.notify('selection:change', Array.from(this.state.selectedCardIds));
  }

  clearSelection() {
    if (this.state.selectedCardIds.size > 0) {
      this.state.selectedCardIds.clear();
      this.notify('selection:change', []);
    }
  }

  // --- Connection Operations ---

  addConnection(fromCard, fromPort, toCard, toPort) {
    // Avoid connecting card to itself
    if (fromCard === toCard) return null;

    // Check if identical connection already exists
    const exists = this.state.connections.some(
      c => (c.fromCard === fromCard && c.fromPort === fromPort && c.toCard === toCard && c.toPort === toPort) ||
           (c.fromCard === toCard && c.fromPort === toPort && c.toCard === fromCard && c.toPort === fromPort)
    );
    if (exists) return null;

    const newConn = {
      id: `conn-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      fromCard,
      fromPort,
      toCard,
      toPort
    };

    this.state.connections.push(newConn);
    this.recordHistory();
    this.notify('connection:added', newConn);
    return newConn;
  }

  removeConnection(connId) {
    const idx = this.state.connections.findIndex(c => c.id === connId);
    if (idx === -1) return false;

    const removed = this.state.connections.splice(idx, 1)[0];
    this.recordHistory();
    this.notify('connection:removed', removed);
    return true;
  }

  getAllConnections() {
    return this.state.connections;
  }

  // --- Templates & Reset ---

  loadTemplate(templateKey, triggerNotify = true) {
    const template = TEMPLATES[templateKey] || TEMPLATES.startup;
    this.state.cards = JSON.parse(JSON.stringify(template.cards));
    this.state.connections = JSON.parse(JSON.stringify(template.connections));
    this.state.selectedCardIds.clear();
    this.state.currentTemplate = templateKey;

    this.recordHistory();
    if (triggerNotify) {
      this.notify('board:reset', { state: this.state, viewport: template.viewport });
    }
  }

  clearBoard() {
    this.state.cards = [];
    this.state.connections = [];
    this.state.selectedCardIds.clear();
    this.recordHistory();
    this.notify('board:reset', { state: this.state });
  }

  loadStateFromJSON(jsonObj) {
    if (!jsonObj || !Array.isArray(jsonObj.cards)) {
      throw new Error('Invalid MindCanvas JSON format');
    }
    this.state.cards = jsonObj.cards;
    this.state.connections = jsonObj.connections || [];
    this.state.selectedCardIds.clear();
    this.recordHistory();
    this.notify('board:reset', { state: this.state });
  }
}

export const store = new Store();
