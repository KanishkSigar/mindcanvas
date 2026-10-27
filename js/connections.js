// ==========================================================================
// Reactive SVG Connections Layer: Dynamic Bezier Curves & Magnetic Snapping
// ==========================================================================

import { store } from './state.js';
import { cards } from './cards.js';
import { viewport } from './viewport.js';
import { sound } from './audio.js';

class ConnectionsManager {
  constructor() {
    this.svg = null;
    this.previewPath = null;
    this.activeDrag = null; // { fromCard, fromPort, startCoord }
  }

  mount(svgElement) {
    this.svg = svgElement;

    // Create defs and preview path element
    this.initSvgDefs();
    this.renderAll();

    // Store subscriptions
    store.subscribe('card:moved', () => this.renderAll());
    store.subscribe('card:resized', () => this.renderAll());
    store.subscribe('card:updated', () => this.renderAll());
    store.subscribe('card:added', () => this.renderAll());
    store.subscribe('card:removed', () => this.renderAll());
    store.subscribe('connection:added', () => this.renderAll());
    store.subscribe('connection:removed', () => this.renderAll());
    store.subscribe('board:reset', () => this.renderAll());

    // Window mouse move & up for wire dragging
    window.addEventListener('mousemove', (e) => this.handlePointerMove(e));
    window.addEventListener('mouseup', (e) => this.handlePointerUp(e));
  }

  initSvgDefs() {
    this.svg.innerHTML = `
      <g id="connections-render-group"></g>
      <path id="connection-preview-path" d="" style="display: none;"></path>
    `;
    this.previewPath = this.svg.querySelector('#connection-preview-path');
  }

  renderAll() {
    const group = this.svg.querySelector('#connections-render-group');
    if (!group) return;

    group.innerHTML = '';
    const conns = store.getAllConnections();

    conns.forEach(conn => {
      const fromPt = cards.getPortWorldCoordinates(conn.fromCard, conn.fromPort);
      const toPt = cards.getPortWorldCoordinates(conn.toCard, conn.toPort);

      if (!fromPt || !toPt) return;

      const pathData = this.calculateBezierPath(fromPt, conn.fromPort, toPt, conn.toPort);

      // SVG Group for connection
      const connGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      connGroup.setAttribute('class', 'connection-group');
      connGroup.setAttribute('data-id', conn.id);

      // 1. Transparent wide hit area for hover/click
      const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hitPath.setAttribute('d', pathData.d);
      hitPath.setAttribute('class', 'connection-path-backdrop');

      // 2. Crisp clean line (Apple Freeform style)
      const mainPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      mainPath.setAttribute('d', pathData.d);
      mainPath.setAttribute('class', 'connection-path');
      mainPath.setAttribute('stroke', '#8e8e93');
      mainPath.setAttribute('stroke-width', '2');

      // 3. Subtle midpoint delete pill
      const midPoint = pathData.midpoint;
      const deleteGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      deleteGroup.setAttribute('class', 'connection-delete-pill');
      deleteGroup.setAttribute('transform', `translate(${midPoint.x}, ${midPoint.y})`);

      deleteGroup.innerHTML = `
        <circle r="10" fill="#ffffff" stroke="rgba(0, 0, 0, 0.14)" stroke-width="1" />
        <path d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5" stroke="#ff3b30" stroke-width="1.5" stroke-linecap="round" />
      `;

      deleteGroup.addEventListener('click', (e) => {
        e.stopPropagation();
        store.removeConnection(conn.id);
        sound.playCut();
      });

      connGroup.appendChild(hitPath);
      connGroup.appendChild(mainPath);
      connGroup.appendChild(deleteGroup);

      group.appendChild(connGroup);
    });
  }

  calculateBezierPath(p1, port1, p2, port2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distance = Math.hypot(dx, dy);
    const curvature = Math.min(Math.max(distance * 0.45, 40), 220);

    let cp1x = p1.x;
    let cp1y = p1.y;
    let cp2x = p2.x;
    let cp2y = p2.y;

    // Direct control points according to port orientation
    if (port1 === 'right') cp1x += curvature;
    else if (port1 === 'left') cp1x -= curvature;
    else if (port1 === 'bottom') cp1y += curvature;
    else if (port1 === 'top') cp1y -= curvature;

    if (port2 === 'right') cp2x += curvature;
    else if (port2 === 'left') cp2x -= curvature;
    else if (port2 === 'bottom') cp2y += curvature;
    else if (port2 === 'top') cp2y -= curvature;

    const d = `M ${p1.x} ${p1.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;

    // Approximate bezier midpoint at t = 0.5
    const midX = 0.125 * p1.x + 0.375 * cp1x + 0.375 * cp2x + 0.125 * p2.x;
    const midY = 0.125 * p1.y + 0.375 * cp1y + 0.375 * cp2y + 0.125 * p2.y;

    return { d, midpoint: { x: midX, y: midY } };
  }

  // --- Wire Dragging & Magnetic Snapping ---

  startConnectionDrag(fromCardId, fromPort, e) {
    const startCoord = cards.getPortWorldCoordinates(fromCardId, fromPort);
    if (!startCoord) return;

    this.activeDrag = {
      fromCard: fromCardId,
      fromPort,
      startCoord
    };

    document.body.classList.add('is-connecting-mode');
    const sourceCardEl = document.getElementById(`card-${fromCardId}`);
    if (sourceCardEl) sourceCardEl.classList.add('is-connecting-source');

    this.previewPath.style.display = 'block';
    this.updatePreview(startCoord.x, startCoord.y, fromPort, startCoord.x, startCoord.y, 'center');
  }

  handlePointerMove(e) {
    if (!this.activeDrag) return;

    const worldMouse = viewport.screenToWorld(e.clientX, e.clientY);
    let targetX = worldMouse.x;
    let targetY = worldMouse.y;
    let targetPort = 'left';

    // Find nearest snapping port on other cards
    const snapResult = this.findNearestSnapPort(e.clientX, e.clientY, this.activeDrag.fromCard);

    // Clear previous snap highlights
    document.querySelectorAll('.card-port.is-snap-target').forEach(p => p.classList.remove('is-snap-target'));

    if (snapResult) {
      targetX = snapResult.coord.x;
      targetY = snapResult.coord.y;
      targetPort = snapResult.portName;
      snapResult.portEl.classList.add('is-snap-target');
    }

    this.updatePreview(
      this.activeDrag.startCoord.x,
      this.activeDrag.startCoord.y,
      this.activeDrag.fromPort,
      targetX,
      targetY,
      targetPort
    );
  }

  handlePointerUp(e) {
    if (!this.activeDrag) return;

    // Check if we released over a valid snap target
    const snapResult = this.findNearestSnapPort(e.clientX, e.clientY, this.activeDrag.fromCard);

    if (snapResult) {
      const added = store.addConnection(
        this.activeDrag.fromCard,
        this.activeDrag.fromPort,
        snapResult.cardId,
        snapResult.portName
      );

      if (added) {
        sound.playSnap();
      }
    }

    // Cleanup
    this.previewPath.style.display = 'none';
    this.previewPath.setAttribute('d', '');
    document.body.classList.remove('is-connecting-mode');
    document.querySelectorAll('.card-port.is-snap-target').forEach(p => p.classList.remove('is-snap-target'));
    document.querySelectorAll('.canvas-card.is-connecting-source').forEach(c => c.classList.remove('is-connecting-source'));

    this.activeDrag = null;
  }

  updatePreview(x1, y1, port1, x2, y2, port2) {
    const pathData = this.calculateBezierPath({ x: x1, y: y1 }, port1, { x: x2, y: y2 }, port2);
    this.previewPath.setAttribute('d', pathData.d);
  }

  findNearestSnapPort(screenX, screenY, excludeCardId) {
    const ports = document.querySelectorAll('.card-port');
    let nearest = null;
    let minDistance = 36; // Snap distance in screen pixels

    ports.forEach(portEl => {
      const cardId = portEl.getAttribute('data-card-id');
      if (cardId === excludeCardId) return;

      const rect = portEl.getBoundingClientRect();
      const portScreenCenterX = rect.left + rect.width / 2;
      const portScreenCenterY = rect.top + rect.height / 2;

      const dist = Math.hypot(screenX - portScreenCenterX, screenY - portScreenCenterY);
      if (dist < minDistance) {
        minDistance = dist;
        const portName = portEl.getAttribute('data-port');
        const coord = cards.getPortWorldCoordinates(cardId, portName);
        nearest = { cardId, portName, portEl, coord };
      }
    });

    return nearest;
  }
}

export const connections = new ConnectionsManager();
