/* ========================================
   MARMOLERÍA BENJAMIN — App Router
   ======================================== */

import { Auth } from './services/auth.js';
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
    // Check authentication
    if (!Auth.isAuthenticated()) {
      this.renderLogin();
      return;
    }

    this.renderApp();
    this.setupRouter();
    this.navigate();
  }

  renderLogin() {
    this.appContainer.innerHTML = `
      <div class="login-page">
        <div class="login-card">
          <div class="login-logo">MB</div>
          <h1 class="login-title">Marmolería Benjamin</h1>
          <p class="login-subtitle">Sistema Administrativo</p>
          <div class="login-error" id="login-error">Usuario o contraseña incorrectos</div>
          <form class="login-form" id="login-form">
            <div class="form-group">
              <label class="form-label" for="login-user">Usuario</label>
              <input type="text" class="form-input" id="login-user" placeholder="Ingresá tu usuario" autocomplete="username" required>
            </div>
            <div class="form-group">
              <label class="form-label" for="login-pass">Contraseña</label>
              <input type="password" class="form-input" id="login-pass" placeholder="Ingresá tu contraseña" autocomplete="current-password" required>
            </div>
            <button type="submit" class="btn btn-primary btn-block btn-lg login-btn">Iniciar sesión</button>
          </form>
          <p style="margin-top: var(--space-6); font-size: var(--text-xs); color: var(--color-stone-400);">
            Demo: admin / admin123
          </p>
        </div>
      </div>
    `;

    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('login-user').value;
      const password = document.getElementById('login-pass').value;

      const result = Auth.login(username, password);
      if (result.success) {
        window.location.hash = '#/dashboard';
        this.renderApp();
        this.setupRouter();
        this.navigate();
      } else {
        document.getElementById('login-error').classList.add('visible');
        setTimeout(() => {
          document.getElementById('login-error')?.classList.remove('visible');
        }, 3000);
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
          <div class="page-header-actions" id="page-header-actions"></div>
        </header>
        <div class="page-content" id="page-content"></div>
      </main>
      ${renderMobileNav(currentPath)}
    `;

    initSidebar();
    initMobileNav();

    // Logout button
    document.getElementById('btn-logout')?.addEventListener('click', () => {
      Auth.logout();
      window.location.hash = '';
      this.renderLogin();
    });
  }

  setupRouter() {
    window.addEventListener('hashchange', () => this.navigate());
  }

  getCurrentPath() {
    const hash = window.location.hash.replace('#', '') || '/dashboard';
    return hash;
  }

  navigate() {
    if (!Auth.isAuthenticated()) {
      this.renderLogin();
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
