/* ========================================
   MARMOLERÍA BENJAMIN — Drawer Component
   ======================================== */

class DrawerManager {
  constructor() {
    this.overlay = null;
    this.drawer = null;
    this.onCloseCallback = null;
  }

  open({ title = '', content = '', size = '', onClose = null, footer = null, headerActions = null } = {}) {
    this.close();
    this.onCloseCallback = onClose;

    const sizeClass = size ? `drawer-${size}` : '';

    this.overlay = document.createElement('div');
    this.overlay.className = 'drawer-overlay';
    document.body.appendChild(this.overlay);

    this.drawer = document.createElement('div');
    this.drawer.className = `drawer ${sizeClass}`;
    this.drawer.innerHTML = `
      <div class="drawer-handle" aria-hidden="true"></div>
      <div class="drawer-header">
        <h3 class="drawer-title">${title}</h3>
        <div class="drawer-header-actions" style="display:flex;align-items:center;gap:var(--space-2)">
          ${headerActions || ''}
          <button class="drawer-close" aria-label="Cerrar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="drawer-body">${typeof content === 'string' ? content : ''}</div>
      ${footer ? `<div class="drawer-footer">${footer}</div>` : ''}
    `;

    document.body.appendChild(this.drawer);
    document.body.style.overflow = 'hidden';
    document.body.classList.add('drawer-open');

    // If content is DOM element
    if (typeof content !== 'string' && content instanceof HTMLElement) {
      this.drawer.querySelector('.drawer-body').innerHTML = '';
      this.drawer.querySelector('.drawer-body').appendChild(content);
    }

    // Animate in
    requestAnimationFrame(() => {
      this.overlay.classList.add('visible');
      this.drawer.classList.add('visible');
    });

    // Close handlers
    this.drawer.querySelector('.drawer-close').addEventListener('click', () => this.close());
    this.overlay.addEventListener('click', () => this.close());

    this._keyHandler = (e) => {
      if (e.key === 'Escape') this.close();
    };
    document.addEventListener('keydown', this._keyHandler);

    return this.drawer;
  }

  close() {
    if (!this.drawer) return;

    if (this.overlay) this.overlay.classList.remove('visible');
    this.drawer.classList.remove('visible');

    const overlay = this.overlay;
    const drawer = this.drawer;

    setTimeout(() => {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (drawer && drawer.parentNode) drawer.parentNode.removeChild(drawer);
    }, 350);

    document.body.style.overflow = '';
    document.body.classList.remove('drawer-open');
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }

    if (this.onCloseCallback) {
      this.onCloseCallback();
      this.onCloseCallback = null;
    }

    this.overlay = null;
    this.drawer = null;
  }

  getBody() {
    if (!this.drawer) return null;
    return this.drawer.querySelector('.drawer-body');
  }

  getFooter() {
    if (!this.drawer) return null;
    return this.drawer.querySelector('.drawer-footer');
  }

  setFooter(html) {
    if (!this.drawer) return;
    let footer = this.drawer.querySelector('.drawer-footer');
    if (!footer) {
      footer = document.createElement('div');
      footer.className = 'drawer-footer';
      this.drawer.appendChild(footer);
    }
    footer.innerHTML = html;
  }
}

export const Drawer = new DrawerManager();
