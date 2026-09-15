/* ========================================
   MARMOLERÍA BENJAMIN — Sidebar Component
   ======================================== */

import { Icons } from './ui.js';
import { NAV_ITEMS } from '../utils/constants.js';

export function renderSidebar(activePath = '/dashboard') {
  const navItems = NAV_ITEMS.map(item => {
    const isActive = activePath === item.path || activePath.startsWith(item.path + '/');
    return `
      <a href="#${item.path}" class="sidebar-nav-item ${isActive ? 'active' : ''}" data-page="${item.id}">
        <span class="sidebar-nav-icon">${Icons[item.icon] || ''}</span>
        <span>${item.label}</span>
      </a>
    `;
  }).join('');

  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <a href="#/dashboard" class="sidebar-logo">
          <div class="sidebar-logo-icon">MB</div>
          <div class="sidebar-logo-text">
            <span class="sidebar-logo-name">Marmolería Benjamin</span>
            <span class="sidebar-logo-sub">Sistema Administrativo</span>
          </div>
        </a>
      </div>
      
      <nav class="sidebar-nav">
        <div class="sidebar-nav-section">
          <div class="sidebar-nav-label">Menú principal</div>
          ${navItems}
        </div>
      </nav>
      
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">A</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">Administrador</div>
            <div class="sidebar-user-role">Admin</div>
          </div>
        </div>
      </div>
    </aside>
    
    <button class="sidebar-toggle" id="sidebar-toggle" aria-label="Menú">
      ${Icons.menu}
    </button>
    <div class="sidebar-overlay" id="sidebar-overlay"></div>
  `;
}

export function initSidebar() {
  const toggle = document.getElementById('sidebar-toggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');

  if (!toggle || !sidebar) return;

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('visible');
  });

  if (overlay) {
    overlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    });
  }

  // Close sidebar and ensure navigation even if clicking active hash
  sidebar.querySelectorAll('.sidebar-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const href = item.getAttribute('href');
      if (href && window.location.hash === href) {
        window.dispatchEvent(new Event('hashchange'));
      }
      if (window.innerWidth <= 1024) {
        sidebar.classList.remove('open');
        overlay.classList.remove('visible');
      }
    });
  });
}

export function updateSidebarActive(path) {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebar.querySelectorAll('.sidebar-nav-item').forEach(item => {
    const href = item.getAttribute('href') || '';
    const itemPath = href.replace('#', '');
    const isActive = path === itemPath || path.startsWith(itemPath + '/');
    item.classList.toggle('active', isActive);
  });
}
