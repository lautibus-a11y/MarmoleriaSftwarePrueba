/* ========================================
   MARMOLERÍA BENJAMIN — Modal Component
   ======================================== */

class ModalManager {
  constructor() {
    this.overlay = null;
    this.activeModal = null;
    this.onCloseCallback = null;
  }

  open({ title = '', content = '', size = 'md', onClose = null, footer = null, closable = true } = {}) {
    this.close();

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

  close() {
    if (!this.overlay) return;

    this.overlay.classList.remove('visible');
    const overlay = this.overlay;

    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 200);

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
