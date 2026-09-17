/* ========================================
   MARMOLERÍA BENJAMIN — Modal Component
   ======================================== */

class ModalManager {
  constructor() {
    this.overlay = null;
    this.activeModal = null;
    this.onCloseCallback = null;
  }

  get isOpen() {
    return !!(this.overlay && document.body.contains(this.overlay));
  }

  open({ title = '', content = '', size = 'md', onClose = null, footer = null, closable = true } = {}) {
    this.close(true);
    document.querySelectorAll('.modal-overlay').forEach(el => el.remove());

    this.onCloseCallback = onClose;

    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay';
    this.overlay.innerHTML = `
      <div class="modal modal-${size}">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          ${closable ? `
          <button class="modal-close" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>` : ''}
        </div>
        <div class="modal-body">${typeof content === 'string' ? content : ''}</div>
        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
      </div>
    `;

    document.body.appendChild(this.overlay);
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');

    // If content is a DOM element, append it
    if (typeof content !== 'string' && content instanceof HTMLElement) {
      this.overlay.querySelector('.modal-body').innerHTML = '';
      this.overlay.querySelector('.modal-body').appendChild(content);
    }

    // Animate in
    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
    });

    // Close handlers
    if (closable) {
      const closeBtn = this.overlay.querySelector('.modal-close');
      if (closeBtn) closeBtn.addEventListener('click', () => this.close());

      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay) this.close();
      });

      this._keyHandler = (e) => {
        if (e.key === 'Escape') this.close();
      };
      document.addEventListener('keydown', this._keyHandler);
    }

    this.activeModal = this.overlay;
    return this.overlay;
  }

  close(immediate = false) {
    if (!this.overlay) {
      document.querySelectorAll('.modal-overlay').forEach(el => el.remove());
      return;
    }

    this.overlay.classList.remove('visible');
    const overlay = this.overlay;

    if (immediate) {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    } else {
      setTimeout(() => {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      }, 200);
    }

    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }

    if (this.onCloseCallback) {
      this.onCloseCallback();
      this.onCloseCallback = null;
    }

    this.overlay = null;
    this.activeModal = null;
  }

  getBody() {
    if (!this.overlay) return null;
    return this.overlay.querySelector('.modal-body');
  }

  getFooter() {
    if (!this.overlay) return null;
    return this.overlay.querySelector('.modal-footer');
  }

  setFooter(html) {
    if (!this.overlay) return;
    let footer = this.overlay.querySelector('.modal-footer');
    if (!footer) {
      footer = document.createElement('div');
      footer.className = 'modal-footer';
      this.overlay.querySelector('.modal').appendChild(footer);
    }
    footer.innerHTML = html;
  }
}

export const Modal = new ModalManager();

import { resolveFileUrl, escapeHtml } from '../utils/helpers.js';

export function previewAttachment({ url, key, filename = 'Comprobante', type = '' }) {
  const fullUrl = resolveFileUrl(url || key);
  if (!fullUrl) return;

  const isPdf = fullUrl.toLowerCase().includes('.pdf') || (type && type.includes('pdf'));

  if (isPdf) {
    Modal.open({
      title: `${escapeHtml(filename)}`,
      size: 'xl',
      content: `
        <div style="width:100%;height:75vh;border-radius:6px;overflow:hidden;background:#f3f4f6">
          <iframe src="${fullUrl}" style="width:100%;height:100%;border:none"></iframe>
        </div>
        <div style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px">
          <a href="${fullUrl}" target="_blank" download="${escapeHtml(filename)}.pdf" class="btn btn-primary btn-sm">
            Descargar PDF
          </a>
        </div>
      `
    });
  } else {
    Modal.open({
      title: `${escapeHtml(filename)}`,
      size: 'lg',
      content: `
        <div style="text-align:center;padding:12px;background:#18181b;border-radius:8px">
          <img src="${fullUrl}" alt="${escapeHtml(filename)}" style="max-width:100%;max-height:75vh;object-fit:contain;border-radius:4px;display:inline-block">
        </div>
        <div style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px">
          <a href="${fullUrl}" target="_blank" download="${escapeHtml(filename)}" class="btn btn-primary btn-sm">
            Descargar / Abrir en pestaña nueva
          </a>
        </div>
      `
    });
  }
}

