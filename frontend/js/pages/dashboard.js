/* ========================================
   MARMOLERÍA BENJAMIN — Dashboard Page
   ======================================== */

import { DataService } from '../services/mockData.js';
import { formatCurrency, formatDate, formatRelativeDate, escapeHtml } from '../utils/helpers.js';
import { Icons, renderStatsCard, renderBadge } from '../components/ui.js';
import {
  PRESUPUESTO_ESTADO_LABELS, PRESUPUESTO_ESTADO_COLORS,
  PAGO_ESTADO_LABELS,
  EVENTO_TIPO_LABELS, EVENTO_TIPO_COLORS,
  EVENTO_ESTADO_LABELS, EVENTO_ESTADO_COLORS
} from '../utils/constants.js';
import { openEventoDetailModal, openEventoForm } from './calendario.js';

export function renderDashboard(container, actionsEl) {
  const stats = DataService.getDashboardStats();
  const vencimientos = DataService.getProximosVencimientos(30);
  const ultPresupuestos = DataService.getUltimosPresupuestos(5);
  const ultPagos = DataService.getUltimosPagos(5);
  const ultCobros = DataService.getUltimosCobros(5);
  const todayStr = new Date().toISOString().split('T')[0];
  const allUpcoming = DataService.getProximosEventos(8);
  const eventosHoy = allUpcoming.filter(e => e.fecha === todayStr);
  const eventosProximos = allUpcoming.filter(e => e.fecha > todayStr);

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

  // Agenda de hoy y próximos eventos
  const renderDashboardEventoItem = (ev, isHoy = false) => `
    <div class="activity-item dashboard-evento-item" data-event-id="${ev.id}" style="cursor:pointer;padding:var(--space-2) 0;display:flex;align-items:center;justify-content:space-between">
      <div style="display:flex;align-items:center;gap:var(--space-3);min-width:0;flex:1">
        <div class="activity-dot" style="background: ${ev.estado === 'realizado' ? 'var(--color-stone-400)' : 'var(--color-stone-900)'};flex-shrink:0"></div>
        <div class="activity-text" style="min-width:0;flex:1">
          <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
            <strong style="${ev.estado === 'realizado' ? 'text-decoration:line-through;color:var(--color-stone-500)' : 'color:var(--color-stone-900)'}">${escapeHtml(ev.clienteNombre || 'Sin cliente asignado')}</strong>
            ${renderBadge(EVENTO_TIPO_LABELS[ev.tipo] || ev.tipo, EVENTO_TIPO_COLORS[ev.tipo] || 'neutral')}
            ${renderBadge(EVENTO_ESTADO_LABELS[ev.estado] || ev.estado, EVENTO_ESTADO_COLORS[ev.estado] || 'neutral')}
          </div>
          <div style="font-size:var(--text-xs);color:var(--color-stone-500);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${escapeHtml(ev.direccion || ev.notas || 'Sin notas')}
          </div>
        </div>
      </div>
      <div style="text-align:right;flex-shrink:0;margin-left:var(--space-3)">
        <div style="font-size:var(--text-xs);font-weight:var(--font-bold);color:var(--color-stone-900)">${ev.hora ? ev.hora + ' hs' : 'Todo el día'}</div>
        <div style="font-size:10px;color:var(--color-stone-500);font-weight:var(--font-medium)">${isHoy ? 'HOY' : formatDate(ev.fecha)}</div>
      </div>
    </div>
  `;

  const agendaHtml = allUpcoming.length === 0
    ? '<p class="text-muted text-center" style="padding:var(--space-4);font-size:var(--text-sm)">No hay eventos agendados para hoy ni próximos días</p>'
    : `
      ${eventosHoy.length > 0 ? `
        <div style="font-size:11px;font-weight:var(--font-bold);letter-spacing:0.05em;color:var(--color-stone-600);text-transform:uppercase;margin-bottom:var(--space-2);display:flex;align-items:center;gap:var(--space-2)">
          <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:var(--color-stone-900)"></span>
          Hoy (${eventosHoy.length})
        </div>
        <div class="activity-list" style="margin-bottom:var(--space-4)">
          ${eventosHoy.map(e => renderDashboardEventoItem(e, true)).join('')}
        </div>
      ` : `
        <div style="padding:var(--space-2) 0;margin-bottom:var(--space-3);color:var(--color-stone-500);font-size:var(--text-xs);font-style:italic">
          No hay tareas programadas para hoy
        </div>
      `}
      ${eventosProximos.length > 0 ? `
        <div style="font-size:11px;font-weight:var(--font-bold);letter-spacing:0.05em;color:var(--color-stone-600);text-transform:uppercase;margin-bottom:var(--space-2)">
          Próximos trabajos
        </div>
        <div class="activity-list">
          ${eventosProximos.slice(0, 4).map(e => renderDashboardEventoItem(e, false)).join('')}
        </div>
      ` : ''}
    `;

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
      <div class="card" style="grid-column: 1 / -1">
        <div class="card-header flex justify-between items-center" style="flex-wrap:wrap;gap:var(--space-2)">
          <h3 class="card-title" style="display:flex;align-items:center;gap:var(--space-2)">
            ${Icons.calendar} Agenda de hoy y próximos trabajos
          </h3>
          <div style="display:flex;gap:var(--space-2)">
            <button class="btn btn-sm btn-primary" id="btn-dash-new-event">${Icons.plus} Agendar</button>
            <a href="#/calendario" class="btn btn-ghost btn-sm">Ver calendario</a>
          </div>
        </div>
        <div class="card-body" style="padding: var(--space-3) var(--space-5)">
          ${agendaHtml}
        </div>
      </div>

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

  // Calendar event listeners
  container.querySelectorAll('.dashboard-evento-item').forEach(item => {
    item.addEventListener('click', () => {
      const evId = item.dataset.eventId;
      if (evId) openEventoDetailModal(evId);
    });
  });

  document.getElementById('btn-dash-new-event')?.addEventListener('click', () => {
    openEventoForm({}, () => {
      renderDashboard(container, actionsEl);
    });
  });
}
