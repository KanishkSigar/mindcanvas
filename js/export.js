// ==========================================================================
// Document Exporter: Markdown Generator, JSON Backup & Clipboard Engine
// ==========================================================================

import { store } from './state.js';
import { sound } from './audio.js';

class Exporter {
  constructor() {
    this.modalEl = null;
    this.previewEl = null;
    this.activeTab = 'markdown'; // 'markdown' | 'json'
    this.onToast = null;
  }

  mount(modalEl, previewEl, onToast) {
    this.modalEl = modalEl;
    this.previewEl = previewEl;
    this.onToast = onToast;

    this.setupEvents();
  }

  setupEvents() {
    // Close modal on click backdrop
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.close();
      }
    });

    const closeBtn = this.modalEl.querySelector('.export-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    // Tabs
    const tabBtns = this.modalEl.querySelectorAll('.export-tab');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.activeTab = btn.getAttribute('data-tab');
        this.updatePreview();
      });
    });

    // Copy Button
    const copyBtn = this.modalEl.querySelector('#export-copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.copyToClipboard());
    }

    // Download Button
    const downloadBtn = this.modalEl.querySelector('#export-download-btn');
    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.downloadFile());
    }
  }

  open() {
    this.modalEl.classList.add('is-open');
    this.updatePreview();
  }

  close() {
    this.modalEl.classList.remove('is-open');
  }

  updatePreview() {
    if (!this.previewEl) return;
    if (this.activeTab === 'markdown') {
      this.previewEl.textContent = this.generateMarkdown();
    } else {
      this.previewEl.textContent = this.generateJSON();
    }
  }

  generateMarkdown() {
    const cards = store.getAllCards();
    const conns = store.getAllConnections();
    const dateStr = new Date().toLocaleString();

    let md = `# 🧠 MindCanvas Board Export\n`;
    md += `*Generated on: ${dateStr}*\n\n`;
    md += `---\n\n`;

    if (cards.length === 0) {
      md += `*Canvas is empty.*\n`;
      return md;
    }

    // 1. Cards Section
    md += `## 📑 Canvas Cards & Notes (${cards.length})\n\n`;

    cards.forEach((card, idx) => {
      const typeLabel = card.type === 'checklist' ? 'Checklist' : card.type === 'code' ? 'Code Snippet' : 'Note';
      md += `### ${idx + 1}. ${card.title || 'Untitled Card'}\n`;
      md += `> **Type:** ${typeLabel} | **Theme:** ${card.color || 'violet'}\n\n`;

      if (card.type === 'note') {
        md += `${card.content || '*(No content)*'}\n\n`;
      } else if (card.type === 'checklist') {
        const items = card.items || [];
        const doneCount = items.filter(i => i.done).length;
        md += `**Progress:** ${doneCount}/${items.length} completed\n\n`;
        items.forEach(item => {
          md += `- [${item.done ? 'x' : ' '}] ${item.text || 'Untitled task'}\n`;
        });
        md += `\n`;
      } else if (card.type === 'code') {
        const lang = card.lang || 'text';
        md += `\`\`\`${lang}\n${card.code || '// Empty code'}\n\`\`\`\n\n`;
      }
    });

    // 2. Connections Section
    md += `---\n\n`;
    md += `## 🕸️ Concept Connections (${conns.length})\n\n`;

    if (conns.length === 0) {
      md += `*No connections between cards.*\n`;
    } else {
      conns.forEach((conn, idx) => {
        const fromCard = store.getCard(conn.fromCard);
        const toCard = store.getCard(conn.toCard);
        const fromTitle = fromCard ? fromCard.title : 'Unknown Card';
        const toTitle = toCard ? toCard.title : 'Unknown Card';

        md += `${idx + 1}. **${fromTitle}** *(${conn.fromPort})* ───▶ **${toTitle}** *(${conn.toPort})*\n`;
      });
    }

    md += `\n---\n*Exported from MindCanvas — Infinite Spatial Scratchpad*\n`;
    return md;
  }

  generateJSON() {
    const payload = {
      generator: 'MindCanvas',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      cards: store.getAllCards(),
      connections: store.getAllConnections()
    };
    return JSON.stringify(payload, null, 2);
  }

  async copyToClipboard() {
    const content = this.activeTab === 'markdown' ? this.generateMarkdown() : this.generateJSON();
    try {
      await navigator.clipboard.writeText(content);
      sound.playSuccess();
      if (this.onToast) {
        this.onToast(`${this.activeTab === 'markdown' ? 'Markdown' : 'JSON'} copied to clipboard!`, 'success');
      }
    } catch (e) {
      console.error('Failed to copy', e);
    }
  }

  downloadFile() {
    const isMd = this.activeTab === 'markdown';
    const content = isMd ? this.generateMarkdown() : this.generateJSON();
    const filename = isMd ? `mindcanvas-export-${Date.now()}.md` : `mindcanvas-backup-${Date.now()}.json`;
    const mimeType = isMd ? 'text/markdown;charset=utf-8' : 'application/json;charset=utf-8';

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    sound.playSuccess();
    if (this.onToast) {
      this.onToast(`Downloaded ${filename}`, 'success');
    }
  }

  importJSONFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        store.loadStateFromJSON(parsed);
        sound.playSuccess();
        if (this.onToast) {
          this.onToast('Board imported successfully!', 'success');
        }
      } catch (err) {
        if (this.onToast) {
          this.onToast('Invalid JSON file format', 'warning');
        }
      }
    };
    reader.readAsText(file);
  }
}

export const exporter = new Exporter();
