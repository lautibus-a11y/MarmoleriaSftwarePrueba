/* ========================================
   MARMOLERÍA BENJAMIN — Dashboard Page
   ======================================== */

import { DataService } from '../services/mockData.js';
import { formatCurrency, formatDate, formatRelativeDate } from '../utils/helpers.js';
import { Icons, renderStatsCard, renderBadge } from '../components/ui.js';
import {
  PRESUPUESTO_ESTADO_LABELS, PRESUPUESTO_ESTADO_COLORS,
  PAGO_ESTADO_LABELS
} from '../utils/constants.js';

export function renderDashboard(container, actionsEl) {
  const stats = DataService.getDashboardStats();
  const vencimientos = DataService.getProximosVencimientos(30);
  const ultPresupuestos = DataService.getUltimosPresupuestos(5);
  const ultPagos = DataService.getUltimosPagos(5);
  const ultCobros = DataService.getUltimosCobros(5);

  // Stock bajo alerts
  const stockAlerts = stats.stockBajo.map(mat => {
    const actual = DataService.getStockActual(mat.id);
    return `
      <div class="stock-alert-item">
        <div class="stock-alert-icon">
          ${Icons['alert-triangle']}
        </div>
        <span class="stock-alert-name">${mat.nombre}</span>
        <span class="stock-alert-value">${actual} ${mat.unidad} (mín: ${mat.stockMinimo})</span>
      </div>
    `;
  }).join('');

  // Vencimientos list
  const vencimientosHtml = vencimientos.slice(0, 5).map(v => {
    const isVencido = new Date(v.vencimiento) < new Date();
    return `
      <div class="activity-item">
        <div class="activity-dot" style="background: ${isVencido ? 'var(--color-error)' : 'var(--color-warning)'}"></div>
        <div class="activity-text">
          <strong>${v.proveedorNombre}</strong> — ${v.numero}
          <div style="font-size: var(--text-xs); color: var(--color-stone-400); margin-top: 2px">
            ${formatCurrency(v.importe)}
          </div>
        </div>
        <span class="activity-date">${formatDate(v.vencimiento)}</span>
      </div>
    `;
  }).join('') || '<p class="text-muted" style="padding: var(--space-4); font-size: var(--text-sm)">No hay vencimientos próximos</p>';

  // Últimos presupuestos
  const presupuestosHtml = ultPresupuestos.map(p => `
    <div class="activity-item">
      <div class="activity-dot" style="background: var(--color-accent)"></div>
      <div class="activity-text">
        <strong>${p.numero}</strong> — ${p.clienteNombre}
        <div style="font-size: var(--text-xs); color: var(--color-stone-400); margin-top: 2px">
          ${formatCurrency(p.total)} · ${renderBadge(PRESUPUESTO_ESTADO_LABELS[p.estado], PRESUPUESTO_ESTADO_COLORS[p.estado])}
        </div>
      </div>
      <span class="activity-date">${formatRelativeDate(p.createdAt)}</span>
    </div>
  `).join('');

  // Últimos pagos
  const pagosHtml = ultPagos.map(p => `
    <div class="activity-item">
      <div class="activity-dot" style="background: var(--color-error)"></div>
      <div class="activity-text">
        <strong>${p.proveedorNombre}</strong>
        <div style="font-size: var(--text-xs); color: var(--color-stone-400); margin-top: 2px">
          ${formatCurrency(p.importe)} · ${p.metodoPago}
        </div>
      </div>
      <span class="activity-date">${formatDate(p.fecha)}</span>
    </div>
  `).join('');

  // Últimos cobros
  const cobrosHtml = ultCobros.map(c => `
    <div class="activity-item">
      <div class="activity-dot" style="background: var(--color-success)"></div>
      <div class="activity-text">
        <strong>${c.clienteNombre}</strong>
        <div style="font-size: var(--text-xs); color: var(--color-stone-400); margin-top: 2px">
          ${formatCurrency(c.importe)} · ${c.metodoPago}
        </div>
      </div>
      <span class="activity-date">${formatDate(c.fecha)}</span>
    </div>
  `).join('');

  container.innerHTML = `
    <div class="stats-grid">
      ${renderStatsCard({ icon: 'arrow-down-circle', iconColor: 'success', value: formatCurrency(stats.totalPorCobrar), label: 'Total por cobrar' })}
      ${renderStatsCard({ icon: 'arrow-up-circle', iconColor: 'error', value: formatCurrency(stats.totalPorPagar), label: 'Total por pagar' })}
      ${renderStatsCard({ icon: 'receipt', iconColor: 'warning', value: stats.facturasVencidas, label: 'Facturas vencidas' })}
      ${renderStatsCard({ icon: 'file-text', iconColor: 'info', value: stats.presupuestosPendientes, label: 'Presupuestos pendientes' })}
      ${renderStatsCard({ icon: 'check', iconColor: 'success', value: stats.presupuestosAprobados, label: 'Presupuestos aprobados' })}
      ${renderStatsCard({ icon: 'hard-hat', iconColor: 'accent', value: stats.obrasActivas, label: 'Obras activas' })}
      ${renderStatsCard({ icon: 'arrow-down-circle', iconColor: 'success', value: formatCurrency(stats.cobrosDelMes), label: 'Cobros del mes' })}
      ${renderStatsCard({ icon: 'arrow-up-circle', iconColor: 'error', value: formatCurrency(stats.pagosDelMes), label: 'Pagos del mes' })}
    </div>

    ${stats.stockBajo.length > 0 ? `
      <div class="dashboard-alerts">
        <div class="alert alert-warning" style="margin-bottom: var(--space-3)">
          <span class="alert-icon">${Icons['alert-triangle']}</span>
          <span><strong>${stats.stockBajo.length} material${stats.stockBajo.length > 1 ? 'es' : ''}</strong> con stock bajo o agotado</span>
        </div>
      </div>
    ` : ''}

    <div class="dashboard-grid">
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Próximos vencimientos</h3>
          <a href="#/facturas" class="btn btn-ghost btn-sm">Ver todos</a>
        </div>
        <div class="card-body" style="padding: var(--space-3) var(--space-5)">
          <div class="activity-list">${vencimientosHtml}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Últimos presupuestos</h3>
          <a href="#/presupuestos" class="btn btn-ghost btn-sm">Ver todos</a>
        </div>
        <div class="card-body" style="padding: var(--space-3) var(--space-5)">
          <div class="activity-list">${presupuestosHtml}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Últimos cobros</h3>
          <a href="#/cobros" class="btn btn-ghost btn-sm">Ver todos</a>
        </div>
        <div class="card-body" style="padding: var(--space-3) var(--space-5)">
          <div class="activity-list">${cobrosHtml}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Últimos pagos</h3>
          <a href="#/pagos" class="btn btn-ghost btn-sm">Ver todos</a>
        </div>
        <div class="card-body" style="padding: var(--space-3) var(--space-5)">
          <div class="activity-list">${pagosHtml}</div>
        </div>
      </div>

      ${stats.stockBajo.length > 0 ? `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Alertas de stock</h3>
          <a href="#/stock" class="btn btn-ghost btn-sm">Ver stock</a>
        </div>
        <div class="card-body" style="padding: var(--space-3) var(--space-5)">
          ${stockAlerts}
        </div>
      </div>
      ` : ''}
    </div>
  `;
}
