/* ========================================
   MARMOLERÍA BENJAMIN — App Router
   ======================================== */

import { renderSidebar, initSidebar, updateSidebarActive } from './components/sidebar.js';
import { renderMobileNav, initMobileNav, updateMobileNav } from './components/mobileNav.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderClientes } from './pages/clientes.js';
import { renderPresupuestos } from './pages/presupuestos.js';
import { renderObras } from './pages/obras.js';
import { renderStock } from './pages/stock.js';
import { renderProveedores } from './pages/proveedores.js';
import { renderFacturas } from './pages/facturas.js';
import { renderPagos } from './pages/pagos.js';
import { renderCobros } from './pages/cobros.js';
import { renderConfiguracion } from './pages/configuracion.js';

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
          <div class="page-header-actions" id="page-header-actions"></div>
        </header>
        <div class="page-content" id="page-content"></div>
      </main>
      ${renderMobileNav(currentPath)}
    `;

    initSidebar();
    initMobileNav();
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
    const path = this.getCurrentPath();
    if (!window.location.hash || window.location.hash === '#/login' || window.location.hash === '#/') {
      window.location.hash = '#/dashboard';
      return;
    }

    const path = this.getCurrentPath();
    updateSidebarActive(path);
    updateMobileNav(path);

    const contentEl = document.getElementById('page-content');
    const titleEl = document.getElementById('page-title');
    const actionsEl = document.getElementById('page-header-actions');

    if (!contentEl) return;

    // Route matching
    const routes = {
      '/dashboard': { title: 'Inicio', render: renderDashboard },
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
      return;
    }

    titleEl.textContent = route.title;
    actionsEl.innerHTML = '';

    // Add fade animation
    contentEl.style.opacity = '0';
    setTimeout(() => {
      route.render(contentEl, actionsEl, path);
      contentEl.style.opacity = '1';
      contentEl.style.transition = 'opacity 0.15s ease';
    }, 50);
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new App();
});
