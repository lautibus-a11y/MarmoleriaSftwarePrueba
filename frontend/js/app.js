/* ========================================
   MARMOLERÍA BENJAMIN — App Router
   ======================================== */

import { renderSidebar, initSidebar, updateSidebarActive } from './components/sidebar.js';
import { renderMobileNav, initMobileNav, updateMobileNav } from './components/mobileNav.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderCalendario } from './pages/calendario.js';
import { renderClientes } from './pages/clientes.js';
import { renderPresupuestos } from './pages/presupuestos.js';
import { renderObras } from './pages/obras.js';
import { renderStock } from './pages/stock.js';
import { renderProveedores } from './pages/proveedores.js';
import { renderFacturas } from './pages/facturas.js';
import { renderPagos } from './pages/pagos.js';
import { renderCobros } from './pages/cobros.js';
import { renderConfiguracion } from './pages/configuracion.js';
import { DataService } from './services/mockData.js';
import { Icons } from './components/ui.js';
import { Drawer } from './components/drawer.js';
import { Modal } from './components/modal.js';
import { DocumentModal } from './components/documentModal.js';
import { getSystemAlerts, openNotificationsModal } from './components/notificationsModal.js';

import { escapeHtml } from './utils/helpers.js';

class App {
  constructor() {
    this.appContainer = document.getElementById('app');
    this.currentPage = null;
    this.init();
  }

  init() {
    this.renderApp();
    this.setupRouter();
    this.navigate();

    // Sincronizar datos con Cloudflare Worker R2 en segundo plano
    DataService.syncAll().then((res) => {
      if (res && res.success) {
        this.navigate();
        this.updateNotificationsBadge();
      }
    });
  }

  renderApp() {
    const currentPath = this.getCurrentPath();

    this.appContainer.innerHTML = `
      ${renderSidebar(currentPath)}
      <main class="main-content">
        <header class="page-header" id="page-header">
          <div class="page-header-left">
            <h1 class="page-title" id="page-title">Inicio</h1>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <button class="btn btn-ghost btn-icon" id="btn-header-notifs" title="Centro de alertas operativas" aria-label="Notificaciones" style="position:relative;padding:8px">
              ${Icons.bell}
              <span id="header-notifs-badge" style="display:none;position:absolute;top:2px;right:2px;background:#DC2626;color:#ffffff;font-size:10px;font-weight:700;border-radius:10px;min-width:18px;height:18px;line-height:14px;text-align:center;padding:1px 4px;border:2px solid var(--color-stone-100)">0</span>
            </button>
            <div class="page-header-actions" id="page-header-actions"></div>
          </div>
        </header>
        <div class="page-content" id="page-content"></div>
      </main>
      ${renderMobileNav(currentPath)}
    `;

    document.getElementById('btn-header-notifs')?.addEventListener('click', () => {
      openNotificationsModal();
    });

    initSidebar();
    initMobileNav();
  }

  updateNotificationsBadge() {
    const alerts = getSystemAlerts();
    const badge = document.getElementById('header-notifs-badge');
    if (badge) {
      if (alerts.totalCount > 0) {
        badge.textContent = alerts.totalCount > 99 ? '99+' : alerts.totalCount;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  setupRouter() {
    window.addEventListener('hashchange', () => this.navigate());
  }

  getCurrentPath() {
    const hash = window.location.hash.replace('#', '') || '/dashboard';
    if (hash === '/' || hash === '/login') {
      return '/dashboard';
    }
    return hash;
  }

  navigate() {
    let path = this.getCurrentPath();
    if (!window.location.hash || window.location.hash === '#/login' || window.location.hash === '#/') {
      window.location.hash = '#/dashboard';
      path = '/dashboard';
    }

    // Close any open drawers or modals when navigating between tabs
    try {
      if (Drawer && typeof Drawer.close === 'function') Drawer.close(true);
      if (Modal && typeof Modal.close === 'function') Modal.close(true);
      if (DocumentModal && typeof DocumentModal.close === 'function') DocumentModal.close();
    } catch (e) {
      console.warn('Error closing drawers/modals on navigate:', e);
    }

    const oldContentEl = document.getElementById('page-content');
    const titleEl = document.getElementById('page-title');
    let actionsEl = document.getElementById('page-header-actions');

    if (!oldContentEl) {
      this.renderApp();
      return;
    }

    // Cleanly replace content container to strip any lingering event listeners from previous views
    const contentEl = oldContentEl.cloneNode(false);
    contentEl.onclick = null;
    oldContentEl.parentNode.replaceChild(contentEl, oldContentEl);

    // Cleanly reset actions container
    if (actionsEl) {
      const cleanActionsEl = actionsEl.cloneNode(false);
      cleanActionsEl.onclick = null;
      actionsEl.parentNode.replaceChild(cleanActionsEl, actionsEl);
      actionsEl = cleanActionsEl;
    }

    updateSidebarActive(path);
    updateMobileNav(path);

    // Route matching
    const routes = {
      '/dashboard': { title: 'Inicio', render: renderDashboard },
      '/calendario': { title: 'Calendario', render: renderCalendario },
      '/clientes': { title: 'Clientes', render: renderClientes },
      '/presupuestos': { title: 'Presupuestos', render: renderPresupuestos },
      '/obras': { title: 'Obras', render: renderObras },
      '/stock': { title: 'Stock e Inventario', render: renderStock },
      '/proveedores': { title: 'Proveedores', render: renderProveedores },
      '/facturas': { title: 'Facturas / Cuentas', render: renderFacturas },
      '/pagos': { title: 'Pagos', render: renderPagos },
      '/cobros': { title: 'Cobros', render: renderCobros },
      '/configuracion': { title: 'Configuración', render: renderConfiguracion }
    };

    // Find matching route
    let route = routes[path];

    // Check for sub-routes (e.g., /clientes/cli-001)
    if (!route) {
      const basePath = '/' + path.split('/')[1];
      route = routes[basePath];
    }

    if (!route) {
      // Default to dashboard
      window.location.hash = '#/dashboard';
      route = routes['/dashboard'];
      path = '/dashboard';
    }

    if (titleEl) titleEl.textContent = route.title;
    if (actionsEl) actionsEl.innerHTML = '';

    try {
      route.render(contentEl, actionsEl, path);
      contentEl.style.opacity = '1';
      this.updateNotificationsBadge();
    } catch (err) {
      console.error('Error rendering route:', path, err);
      contentEl.innerHTML = `
        <div class="card" style="margin:20px;border-left:4px solid var(--color-error)">
          <div class="card-body">
            <h3 style="color:var(--color-error)">Error al cargar la página: ${escapeHtml(route?.title || path)}</h3>
            <p style="color:var(--color-stone-800);margin:8px 0">${escapeHtml(err.message || String(err))}</p>
            <pre style="font-size:12px;background:var(--color-stone-100);padding:10px;border-radius:4px;overflow:auto">${escapeHtml(err.stack || '')}</pre>
            <div style="margin-top:12px;display:flex;gap:8px">
              <button class="btn btn-primary btn-sm" onclick="location.reload()">Reintentar</button>
              <button class="btn btn-secondary btn-sm" onclick="localStorage.clear();location.reload()">Restablecer datos locales</button>
            </div>
          </div>
        </div>
      `;
      contentEl.style.opacity = '1';
    }
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new App();
  });
} else {
  new App();
}
