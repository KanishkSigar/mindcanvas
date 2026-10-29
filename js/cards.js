// ==========================================================================
// Cards Manager: Rendering, Dragging, Resizing & Interactions
// ==========================================================================

import { store } from './state.js';
import { viewport } from './viewport.js';
import { sound } from './audio.js';

class CardsManager {
  constructor() {
    this.container = null;
    this.activeDragCardId = null;
    this.dragStartMouse = { x: 0, y: 0 };
    this.dragStartCardPos = { x: 0, y: 0 };

    this.activeResizeCardId = null;
    this.resizeStartMouse = { x: 0, y: 0 };
    this.resizeStartWidth = 0;

    this.onConnectionDragStart = null;
    this.onConnectionDragMove = null;
    this.onConnectionDragEnd = null;

    this.colorPalette = ['periwinkle', 'lavender', 'sky', 'lilac', 'indigo', 'frost'];
  }

  mount(container, connectionCallbacks) {
    this.container = container;
    this.onConnectionDragStart = connectionCallbacks.onStart;
    this.onConnectionDragMove = connectionCallbacks.onMove;
    this.onConnectionDragEnd = connectionCallbacks.onEnd;

    this.setupGlobalEvents();
    this.renderAll();

    // Subscribe to store changes
    store.subscribe('card:added', (card) => this.renderCard(card));
    store.subscribe('card:removed', ({ card }) => this.removeCardDOM(card.id));
    store.subscribe('board:reset', () => this.renderAll());
    store.subscribe('selection:change', (selectedIds) => this.updateSelectionStyles(selectedIds));
    store.subscribe('card:depth', ({ id, zIndex }) => {
      const el = document.getElementById(`card-${id}`);
      if (el) el.style.zIndex = zIndex;
    });
  }

  setupGlobalEvents() {
    window.addEventListener('mousemove', (e) => {
      if (this.activeDragCardId) {
        this.handleCardDrag(e);
      } else if (this.activeResizeCardId) {
        this.handleCardResize(e);
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.activeDragCardId) {
        const cardEl = document.getElementById(`card-${this.activeDragCardId}`);
        if (cardEl) cardEl.classList.remove('is-dragging');
        this.activeDragCardId = null;
        store.debounceSave();
      }
      if (this.activeResizeCardId) {
        this.activeResizeCardId = null;
        store.debounceSave();
      }
    });

    // Close open color popovers when clicking outside
    window.addEventListener('click', (e) => {
      if (!e.target.closest('.card-color-popover') && !e.target.closest('.btn-color-palette')) {
        document.querySelectorAll('.card-color-popover.is-open').forEach(p => p.classList.remove('is-open'));
      }
    });
  }

  renderAll() {
    if (!this.container) return;
    this.container.innerHTML = '';
    const cards = store.getAllCards();
    cards.forEach(card => this.renderCard(card));
  }

  renderCard(card) {
    let existingEl = document.getElementById(`card-${card.id}`);
    if (existingEl) existingEl.remove();

    const cardEl = document.createElement('div');
    cardEl.id = `card-${card.id}`;
    cardEl.className = 'canvas-card';
    cardEl.setAttribute('data-id', card.id);
    cardEl.setAttribute('data-color', card.color || 'periwinkle');
    cardEl.style.left = `${card.x}px`;
    cardEl.style.top = `${card.y}px`;
    cardEl.style.width = `${card.width || 320}px`;
    cardEl.style.zIndex = card.zIndex || 1;

    // Build Header
    const headerEl = document.createElement('div');
    headerEl.className = 'card-header';

    // macOS Window Controls (Traffic Lights)
    const trafficLights = document.createElement('div');
    trafficLights.className = 'mac-traffic-lights';

    const dotClose = document.createElement('div');
    dotClose.className = 'mac-dot mac-dot-close';
    dotClose.title = 'Close card';
    dotClose.addEventListener('click', (e) => {
      e.stopPropagation();
      store.removeCard(card.id);
      sound.playCut();
    });

    const dotMin = document.createElement('div');
    dotMin.className = 'mac-dot mac-dot-minimize';
    dotMin.title = 'Collapse / Expand card';
    dotMin.addEventListener('click', (e) => {
      e.stopPropagation();
      cardEl.classList.toggle('is-collapsed');
      sound.playPop(480);
    });

    const dotMax = document.createElement('div');
    dotMax.className = 'mac-dot mac-dot-maximize';
    dotMax.title = 'Center & focus on card';
    dotMax.addEventListener('click', (e) => {
      e.stopPropagation();
      viewport.flyTo(card.x + (card.width || 320) / 2, card.y + 100, 1.05);
      sound.playPop(620);
    });

    trafficLights.appendChild(dotClose);
    trafficLights.appendChild(dotMin);
    trafficLights.appendChild(dotMax);

    const headerLeft = document.createElement('div');
    headerLeft.className = 'card-header-left';

    const typeIcon = document.createElement('div');
    typeIcon.className = 'card-type-icon';
    typeIcon.innerHTML = this.getTypeIconSvg(card.type);

    const titleInput = document.createElement('input');
    titleInput.className = 'card-title-input';
    titleInput.value = card.title || '';
    titleInput.placeholder = 'Card Title...';
    titleInput.addEventListener('input', (e) => {
      store.updateCard(card.id, { title: e.target.value }, true);
    });
    titleInput.addEventListener('blur', () => store.recordHistory());

    headerLeft.appendChild(trafficLights);
    headerLeft.appendChild(typeIcon);
    headerLeft.appendChild(titleInput);

    // Header Actions
    const actions = document.createElement('div');
    actions.className = 'card-header-actions';

    // Color Swatch Button
    const colorBtn = document.createElement('button');
    colorBtn.className = 'card-action-btn btn-color-palette';
    colorBtn.title = 'Change color';
    colorBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="8" cy="11" r="1.5" fill="currentColor"/><circle cx="16" cy="11" r="1.5" fill="currentColor"/><circle cx="12" cy="16" r="1.5" fill="currentColor"/></svg>`;

    // Color Popover
    const colorPopover = document.createElement('div');
    colorPopover.className = 'card-color-popover';
    this.colorPalette.forEach(col => {
      const swatch = document.createElement('div');
      swatch.className = `color-swatch ${col === card.color ? 'active' : ''}`;
      swatch.style.background = `var(--color-${col}-bg, var(--color-${col}))`;
      swatch.addEventListener('click', (e) => {
        e.stopPropagation();
        card.color = col;
        cardEl.setAttribute('data-color', col);
        colorPopover.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');
        colorPopover.classList.remove('is-open');
        store.updateCard(card.id, { color: col });
        sound.playPop(500);
      });
      colorPopover.appendChild(swatch);
    });

    colorBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = colorPopover.classList.contains('is-open');
      document.querySelectorAll('.card-color-popover.is-open').forEach(p => p.classList.remove('is-open'));
      if (!isOpen) colorPopover.classList.add('is-open');
    });

    // Duplicate Button
    const dupBtn = document.createElement('button');
    dupBtn.className = 'card-action-btn';
    dupBtn.title = 'Duplicate card';
    dupBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    dupBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      store.duplicateCard(card.id);
      sound.playPop(560);
    });

    // Delete Button
    const delBtn = document.createElement('button');
    delBtn.className = 'card-action-btn btn-delete';
    delBtn.title = 'Delete card';
    delBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      store.removeCard(card.id);
      sound.playCut();
    });

    actions.appendChild(colorBtn);
    actions.appendChild(dupBtn);
    actions.appendChild(delBtn);

    headerEl.appendChild(headerLeft);
    headerEl.appendChild(actions);
    headerEl.appendChild(colorPopover);
    cardEl.appendChild(headerEl);

    // Build Card Body based on type
    const bodyEl = document.createElement('div');
    bodyEl.className = 'card-body';

    if (card.type === 'note') {
      this.buildNoteBody(bodyEl, card);
    } else if (card.type === 'checklist') {
      this.buildChecklistBody(bodyEl, card);
    } else if (card.type === 'code') {
      this.buildCodeBody(bodyEl, card);
    } else if (card.type === 'weather') {
      this.buildWeatherBody(bodyEl, card);
    } else if (card.type === 'finder') {
      this.buildFinderBody(bodyEl, card);
    }

    cardEl.appendChild(bodyEl);

    // Attach 4 Connector Ports (Pins)
    ['top', 'right', 'bottom', 'left'].forEach(portPos => {
      const port = document.createElement('div');
      port.className = `card-port port-${portPos}`;
      port.setAttribute('data-card-id', card.id);
      port.setAttribute('data-port', portPos);

      port.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        if (this.onConnectionDragStart) {
          this.onConnectionDragStart(card.id, portPos, e);
        }
      });

      cardEl.appendChild(port);
    });

    // Resize Handle
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'card-resize-handle';
    resizeHandle.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      this.startCardResize(card.id, e);
    });
    cardEl.appendChild(resizeHandle);

    // Dragging Listeners
    headerEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0 || e.target.closest('button') || e.target.closest('input')) return;
      this.startCardDrag(card.id, e);
    });

    cardEl.addEventListener('mousedown', () => {
      store.selectSingleCard(card.id);
    });

    this.container.appendChild(cardEl);
  }

  buildNoteBody(container, card) {
    const textarea = document.createElement('textarea');
    textarea.className = 'card-note-textarea';
    textarea.placeholder = 'Type your thoughts, ideas, or markdown here...';
    textarea.value = card.content || '';

    // Auto-adjust height
    const adjustHeight = () => {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight + 4, 380)}px`;
    };

    textarea.addEventListener('input', (e) => {
      card.content = e.target.value;
      adjustHeight();
      store.updateCard(card.id, { content: e.target.value }, true);
    });

    textarea.addEventListener('blur', () => store.recordHistory());

    container.appendChild(textarea);
    setTimeout(adjustHeight, 0);
  }

  buildChecklistBody(container, card) {
    const items = card.items || [];

    // Progress bar
    const progressContainer = document.createElement('div');
    progressContainer.className = 'checklist-progress-container';

    const progressMeta = document.createElement('div');
    progressMeta.className = 'checklist-progress-meta';
    const progressLabel = document.createElement('span');
    progressLabel.textContent = 'Progress';
    const progressCount = document.createElement('span');
    progressCount.className = 'progress-count';

    progressMeta.appendChild(progressLabel);
    progressMeta.appendChild(progressCount);

    const progressBar = document.createElement('div');
    progressBar.className = 'checklist-progress-bar';
    const progressFill = document.createElement('div');
    progressFill.className = 'checklist-progress-fill';
    progressBar.appendChild(progressFill);

    progressContainer.appendChild(progressMeta);
    progressContainer.appendChild(progressBar);
    container.appendChild(progressContainer);

    // Items list
    const itemsList = document.createElement('div');
    itemsList.className = 'checklist-items';

    const updateProgress = () => {
      const total = items.length;
      const done = items.filter(i => i.done).length;
      const pct = total === 0 ? 0 : Math.round((done / total) * 100);
      progressCount.textContent = `${done}/${total} (${pct}%)`;
      progressFill.style.width = `${pct}%`;
    };

    const renderItems = () => {
      itemsList.innerHTML = '';
      items.forEach((item, idx) => {
        const itemRow = document.createElement('div');
        itemRow.className = `checklist-item ${item.done ? 'is-done' : ''}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'checklist-checkbox';
        checkbox.checked = item.done;
        checkbox.addEventListener('change', () => {
          item.done = checkbox.checked;
          itemRow.classList.toggle('is-done', item.done);
          updateProgress();
          if (item.done) sound.playCheck();
          store.updateCard(card.id, { items }, true);
          store.debounceSave();
        });

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'checklist-input';
        input.value = item.text || '';
        input.placeholder = 'Task description...';
        input.addEventListener('input', (e) => {
          item.text = e.target.value;
          store.updateCard(card.id, { items }, true);
        });
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addNewItem('', idx + 1);
          }
        });

        const delBtn = document.createElement('button');
        delBtn.className = 'checklist-item-delete';
        delBtn.innerHTML = '✕';
        delBtn.title = 'Remove item';
        delBtn.addEventListener('click', () => {
          items.splice(idx, 1);
          renderItems();
          updateProgress();
          store.updateCard(card.id, { items });
        });

        itemRow.appendChild(checkbox);
        itemRow.appendChild(input);
        itemRow.appendChild(delBtn);
        itemsList.appendChild(itemRow);
      });
      updateProgress();
    };

    const addNewItem = (text = '', atIndex = null) => {
      const newItem = { id: `item-${Date.now()}`, text, done: false };
      if (atIndex !== null) {
        items.splice(atIndex, 0, newItem);
      } else {
        items.push(newItem);
      }
      renderItems();
      store.updateCard(card.id, { items });
      // Focus newly added input
      setTimeout(() => {
        const inputs = itemsList.querySelectorAll('.checklist-input');
        const targetInput = atIndex !== null ? inputs[atIndex] : inputs[inputs.length - 1];
        if (targetInput) targetInput.focus();
      }, 0);
    };

    container.appendChild(itemsList);

    // Add item prompt button
    const addRow = document.createElement('div');
    addRow.className = 'checklist-add-row';
    addRow.innerHTML = `<span style="font-size:14px;font-weight:700;">+</span> Add checklist item`;
    addRow.addEventListener('click', () => addNewItem(''));
    container.appendChild(addRow);

    renderItems();
  }

  buildCodeBody(container, card) {
    const codeContainer = document.createElement('div');
    codeContainer.className = 'card-code-container';

    const toolbar = document.createElement('div');
    toolbar.className = 'card-code-toolbar';

    const select = document.createElement('select');
    select.className = 'code-lang-selector';
    ['javascript', 'typescript', 'python', 'html', 'css', 'json', 'sql', 'bash'].forEach(lang => {
      const opt = document.createElement('option');
      opt.value = lang;
      opt.textContent = lang.toUpperCase();
      if (lang === (card.lang || 'javascript')) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
      card.lang = e.target.value;
      store.updateCard(card.id, { lang: e.target.value });
    });

    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-btn';
    copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> <span>Copy</span>`;

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(card.code || '');
        copyBtn.innerHTML = `✓ <span>Copied!</span>`;
        copyBtn.style.color = 'var(--color-emerald)';
        sound.playSuccess();
        setTimeout(() => {
          copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> <span>Copy</span>`;
          copyBtn.style.color = '';
        }, 1500);
      } catch (err) {
        console.error('Copy failed', err);
      }
    });

    toolbar.appendChild(select);
    toolbar.appendChild(copyBtn);

    const textarea = document.createElement('textarea');
    textarea.className = 'card-code-textarea';
    textarea.value = card.code || '';
    textarea.placeholder = '// Enter code snippet here...';
    textarea.spellcheck = false;

    textarea.addEventListener('input', (e) => {
      card.code = e.target.value;
      store.updateCard(card.id, { code: e.target.value }, true);
    });
    textarea.addEventListener('blur', () => store.recordHistory());

    codeContainer.appendChild(toolbar);
    codeContainer.appendChild(textarea);
    container.appendChild(codeContainer);
  }

  buildWeatherBody(container, card) {
    const weatherBox = document.createElement('div');
    weatherBox.className = 'card-weather-glance';

    const headerMeta = document.createElement('div');
    headerMeta.className = 'weather-header-meta';

    const city = document.createElement('div');
    city.className = 'weather-city-name';
    city.textContent = card.city || 'Toronto';

    const day = document.createElement('div');
    day.className = 'weather-day-label';
    day.textContent = card.day || 'Today';

    headerMeta.appendChild(city);
    headerMeta.appendChild(day);

    const icon = document.createElement('div');
    icon.className = 'weather-icon-art';
    icon.textContent = card.icon || '⛅';

    const temp = document.createElement('div');
    temp.className = 'weather-temp-display';
    temp.textContent = card.temp || '21°';

    const cond = document.createElement('div');
    cond.className = 'weather-condition-text';
    cond.textContent = card.cond || 'Mostly Cloudy';

    const metrics = document.createElement('div');
    metrics.className = 'weather-metrics-capsules';
    metrics.innerHTML = `
      <div class="weather-capsule">
        <span class="weather-capsule-icon">💨</span>
        <span class="weather-capsule-val">4 km/h</span>
      </div>
      <div class="weather-capsule">
        <span class="weather-capsule-icon">🌧️</span>
        <span class="weather-capsule-val">45%</span>
      </div>
      <div class="weather-capsule">
        <span class="weather-capsule-icon">💧</span>
        <span class="weather-capsule-val">56%</span>
      </div>
    `;

    weatherBox.appendChild(headerMeta);
    weatherBox.appendChild(icon);
    weatherBox.appendChild(temp);
    weatherBox.appendChild(cond);
    weatherBox.appendChild(metrics);
    container.appendChild(weatherBox);
  }

  buildFinderBody(container, card) {
    const finderGrid = document.createElement('div');
    finderGrid.className = 'card-finder-grid';

    const folders = card.folders || [
      { name: 'geist-font', items: '6 items', icon: '📁' },
      { name: 'PulseBoard', items: '12 items', icon: '📁' },
      { name: 'AtlasApp', items: '8 items', icon: '📁' },
      { name: 'Invoices', items: '48 items', icon: '📁' },
      { name: 'DesignKit', items: '24 items', icon: '📁' },
      { name: 'Assets', items: '16 items', icon: '📁' }
    ];

    folders.forEach(f => {
      const item = document.createElement('div');
      item.className = 'finder-item';
      item.innerHTML = `
        <div class="finder-icon">${f.icon}</div>
        <div class="finder-name">${f.name}</div>
        <div class="finder-count">${f.items}</div>
      `;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        sound.playPop(540);
      });
      finderGrid.appendChild(item);
    });

    container.appendChild(finderGrid);
  }

  getTypeIconSvg(type) {
    if (type === 'checklist') {
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
    }
    if (type === 'code') {
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
    }
    if (type === 'weather') {
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
    }
    if (type === 'finder') {
      return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
    }
    return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
  }

  // --- Dragging Handlers ---

  startCardDrag(cardId, e) {
    this.activeDragCardId = cardId;
    this.dragStartMouse = { x: e.clientX, y: e.clientY };

    const card = store.getCard(cardId);
    if (!card) return;
    this.dragStartCardPos = { x: card.x, y: card.y };

    store.bringToFront(cardId);

    const cardEl = document.getElementById(`card-${cardId}`);
    if (cardEl) cardEl.classList.add('is-dragging');
  }

  handleCardDrag(e) {
    const card = store.getCard(this.activeDragCardId);
    if (!card) return;

    const dx = (e.clientX - this.dragStartMouse.x) / viewport.scale;
    const dy = (e.clientY - this.dragStartMouse.y) / viewport.scale;

    card.x = Math.round(this.dragStartCardPos.x + dx);
    card.y = Math.round(this.dragStartCardPos.y + dy);

    const cardEl = document.getElementById(`card-${card.id}`);
    if (cardEl) {
      cardEl.style.left = `${card.x}px`;
      cardEl.style.top = `${card.y}px`;
    }

    store.notify('card:moved', card);
  }

  startCardResize(cardId, e) {
    this.activeResizeCardId = cardId;
    this.resizeStartMouse = { x: e.clientX, y: e.clientY };
    const card = store.getCard(cardId);
    this.resizeStartWidth = card ? (card.width || 320) : 320;
  }

  handleCardResize(e) {
    const card = store.getCard(this.activeResizeCardId);
    if (!card) return;

    const dx = (e.clientX - this.resizeStartMouse.x) / viewport.scale;
    const newWidth = Math.min(Math.max(Math.round(this.resizeStartWidth + dx), 260), 600);

    card.width = newWidth;
    const cardEl = document.getElementById(`card-${card.id}`);
    if (cardEl) {
      cardEl.style.width = `${newWidth}px`;
    }

    store.notify('card:resized', card);
  }

  removeCardDOM(id) {
    const cardEl = document.getElementById(`card-${id}`);
    if (cardEl) {
      cardEl.style.transform = 'scale(0.8)';
      cardEl.style.opacity = '0';
      cardEl.style.transition = 'transform 0.2s, opacity 0.2s';
      setTimeout(() => cardEl.remove(), 200);
    }
  }

  updateSelectionStyles(selectedIds) {
    const set = new Set(selectedIds);
    document.querySelectorAll('.canvas-card').forEach(cardEl => {
      const id = cardEl.getAttribute('data-id');
      cardEl.classList.toggle('is-selected', set.has(id));
    });
  }

  getPortWorldCoordinates(cardId, portName) {
    const card = store.getCard(cardId);
    if (!card) return null;

    const cardEl = document.getElementById(`card-${cardId}`);
    const width = cardEl ? cardEl.offsetWidth : (card.width || 320);
    const height = cardEl ? cardEl.offsetHeight : 240;

    switch (portName) {
      case 'top':
        return { x: card.x + width / 2, y: card.y };
      case 'bottom':
        return { x: card.x + width / 2, y: card.y + height };
      case 'left':
        return { x: card.x, y: card.y + height / 2 };
      case 'right':
        return { x: card.x + width, y: card.y + height / 2 };
      default:
        return { x: card.x + width / 2, y: card.y + height / 2 };
    }
  }
}

export const cards = new CardsManager();
