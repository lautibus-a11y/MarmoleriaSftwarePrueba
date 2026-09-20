/* =========================================================
   MARMOLERÍA BENJAMIN — Mobile Navigation & FAB Component
   Mobile-First bottom navigation bar and thumb-friendly FAB
   ========================================================= */

import { Icons } from './ui.js';

export function renderMobileNav(activePath = '/dashboard') {
  return `
    <nav class="mobile-bottom-nav" id="mobile-bottom-nav" aria-label="Navegación móvil">
      <a href="#/dashboard" class="mobile-nav-item ${activePath === '/dashboard' ? 'active' : ''}" data-path="/dashboard">
        <span class="mobile-nav-icon">${Icons.home}</span>
        <span class="mobile-nav-label">Inicio</span>
      </a>
      <a href="#/presupuestos" class="mobile-nav-item ${activePath.startsWith('/presupuestos') ? 'active' : ''}" data-path="/presupuestos">
        <span class="mobile-nav-icon">${Icons['file-text']}</span>
        <span class="mobile-nav-label">Presupuestos</span>
      </a>
      <a href="#/obras" class="mobile-nav-item ${activePath.startsWith('/obras') ? 'active' : ''}" data-path="/obras">
        <span class="mobile-nav-icon">${Icons['hard-hat']}</span>
        <span class="mobile-nav-label">Obras</span>
      </a>
      <a href="#/clientes" class="mobile-nav-item ${activePath.startsWith('/clientes') ? 'active' : ''}" data-path="/clientes">
        <span class="mobile-nav-icon">${Icons.users}</span>
        <span class="mobile-nav-label">Clientes</span>
      </a>
      <button type="button" class="mobile-nav-item mobile-nav-btn" id="btn-mobile-more" aria-label="Más opciones">
        <span class="mobile-nav-icon">${Icons.menu}</span>
        <span class="mobile-nav-label">Más</span>
      </button>
    </nav>
    <div id="mobile-fab-container"></div>
  `;
}

export function initMobileNav() {
  const moreBtn = document.getElementById('btn-mobile-more');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (moreBtn && sidebar && overlay) {
    moreBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    });
  }
}

export function updateMobileNav(path) {
  const nav = document.getElementById('mobile-bottom-nav');
  if (!nav) return;

  nav.querySelectorAll('.mobile-nav-item[data-path]').forEach(item => {
    const itemPath = item.dataset.path;
    const isActive = path === itemPath || (itemPath !== '/dashboard' && path.startsWith(itemPath));
    item.classList.toggle('active', isActive);
  });

  updateMobileFab(path);
}

export function updateMobileFab(path) {
  const fabContainer = document.getElementById('mobile-fab-container');
  if (!fabContainer) return;

  // Don't show create FAB on desktop (screens > 768px)
  if (typeof window !== 'undefined' && window.innerWidth > 768) {
    fabContainer.innerHTML = '';
    return;
  }

  const basePath = path.split('/')[1] || '';
  const isDetail = path.split('/').length > 2 && path.split('/')[2];

  // Don't show create FAB on detail views or config/dashboard
  if (isDetail || ['dashboard', 'configuracion'].includes(basePath)) {
    fabContainer.innerHTML = '';
    return;
  }

  const fabConfigs = {
    'paso-a-paso': { label: 'Proceso', targetId: 'btn-workflow-new-process' },
    calendario: { label: 'Evento', targetId: 'btn-new-event' },
    presupuestos: { label: 'Presupuesto', targetId: 'btn-new-pres' },
    obras: { label: 'Obra', targetId: 'btn-new-obra' },
    clientes: { label: 'Cliente', targetId: 'btn-new-cliente' },
    cobros: { label: 'Cobro', targetId: 'btn-new-cobro' },
    facturas: { label: 'Factura', targetId: 'btn-new-fac' },
    pagos: { label: 'Pago', targetId: 'btn-new-pago' },
    stock: { label: 'Movimiento', targetId: 'btn-new-mov' },
    proveedores: { label: 'Proveedor', targetId: 'btn-new-prov' }
  };

  const config = fabConfigs[basePath];
  if (!config) {
    fabContainer.innerHTML = '';
    return;
  }

  fabContainer.innerHTML = `
    <button class="mobile-fab" id="mobile-fab-action" aria-label="Crear ${config.label}">
      <span class="mobile-fab-icon">${Icons.plus}</span>
      <span class="mobile-fab-label">${config.label}</span>
    </button>
  `;

  document.getElementById('mobile-fab-action')?.addEventListener('click', () => {
    // Forward click to the active page's primary creation button
    const targetBtn = document.getElementById(config.targetId);
    if (targetBtn) {
      targetBtn.click();
    }
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', () => {
    updateMobileFab(window.location.hash.slice(1) || '/');
  });
}
