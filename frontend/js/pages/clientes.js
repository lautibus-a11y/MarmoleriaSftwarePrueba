/* ========================================
   MARMOLERÍA BENJAMIN — Clientes Page
   ======================================== */

import { DataService } from '../services/mockData.js';
import { formatCurrency, formatDate, searchFilter, escapeHtml, debounce } from '../utils/helpers.js';
import { Icons, renderDataTable, renderSearchInput, renderBadge, renderEmptyState } from '../components/ui.js';
import { Drawer } from '../components/drawer.js';
import { Toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { EVENTO_TIPO_LABELS, EVENTO_TIPO_COLORS, EVENTO_ESTADO_LABELS, EVENTO_ESTADO_COLORS } from '../utils/constants.js';
import { openEventoForm, openEventoDetailModal } from './calendario.js';

export function renderClientes(container, actionsEl, path) {
  // Check if we're viewing a specific client
  const parts = path.split('/');
  if (parts.length > 2 && parts[2]) {
    renderClienteDetail(container, actionsEl, parts[2]);
    return;
  }

  // Actions
  actionsEl.innerHTML = `
    <button class="btn btn-primary" id="btn-new-cliente">${Icons.plus} Nuevo cliente</button>
  `;

  let clientes = DataService.getAll('clientes');
  let searchTerm = '';

  function render() {
    const filtered = searchFilter(clientes, searchTerm, ['nombre', 'apellido', 'telefono', 'email']);

    const columns = [
      {
        label: 'Nombre', field: 'nombre',
        render: (item) => `<span class="cell-primary">${escapeHtml(item.nombre)} ${escapeHtml(item.apellido || '')}</span>`
      },
      { label: 'Teléfono', field: 'telefono', render: (item) => escapeHtml(item.telefono || '-') },
      { label: 'Email', field: 'email', render: (item) => escapeHtml(item.email || '-'), className: 'cell-secondary' },
      {
        label: 'Saldo pendiente', field: 'saldo', align: 'right',
        render: (item) => {
          const saldo = DataService.getClienteSaldo(item.id);
          return saldo.saldo > 0
            ? `<span class="cell-currency" style="color: var(--color-success)">${formatCurrency(saldo.saldo)}</span>`
            : `<span class="cell-currency">${formatCurrency(0)}</span>`;
        }
      },
      {
        label: '', field: 'actions', align: 'right', className: 'cell-actions',
        render: (item) => `
          <button class="btn btn-ghost btn-icon btn-sm" data-action="view" data-id="${item.id}" title="Ver">${Icons.eye}</button>
          <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${item.id}" title="Editar">${Icons.edit}</button>
          <button class="btn btn-ghost btn-icon btn-sm" data-action="delete" data-id="${item.id}" title="Eliminar">${Icons.trash}</button>
        `
      }
    ];

    container.innerHTML = `
      <div class="table-container">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            ${renderSearchInput('Buscar por nombre, teléfono, email...')}
          </div>
          <div class="table-toolbar-right">
            <span class="text-muted" style="font-size: var(--text-sm)">${filtered.length} clientes</span>
          </div>
        </div>
        ${renderDataTable({ columns, data: filtered, emptyMessage: 'No hay clientes registrados' })}
      </div>
    `;

    // Search
    const searchInput = container.querySelector('#search-input');
    if (searchInput) {
      searchInput.value = searchTerm;
      searchInput.addEventListener('input', debounce((e) => {
        searchTerm = e.target.value;
        render();
      }, 300));
    }

    // Actions
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const id = btn.dataset.id;

      if (action === 'view') window.location.hash = `#/clientes/${id}`;
      if (action === 'edit') openClienteForm(id);
      if (action === 'delete') handleDelete(id);
    });

    // Row click
    container.querySelectorAll('.data-table tbody tr').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        const id = row.dataset.id;
        if (id) window.location.hash = `#/clientes/${id}`;
      });
    });
  }

  function openClienteForm(editId = null) {
    const cliente = (editId ? DataService.getById('clientes', editId) : null) || {};
    const isEdit = !!editId && !!cliente.id;

    Drawer.open({
      title: isEdit ? 'Editar cliente' : 'Nuevo cliente',
      content: `
        <form id="cliente-form">
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Nombre <span class="required">*</span></label>
              <input type="text" class="form-input" name="nombre" value="${escapeHtml(cliente.nombre || '')}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Apellido / Razón Social</label>
              <input type="text" class="form-input" name="apellido" value="${escapeHtml(cliente.apellido || '')}">
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Teléfono</label>
              <input type="tel" class="form-input" name="telefono" value="${escapeHtml(cliente.telefono || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">WhatsApp</label>
              <input type="tel" class="form-input" name="whatsapp" value="${escapeHtml(cliente.whatsapp || '')}" placeholder="5491100000000">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="form-input" name="email" value="${escapeHtml(cliente.email || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">Dirección</label>
            <input type="text" class="form-input" name="direccion" value="${escapeHtml(cliente.direccion || '')}">
          </div>
          <div class="form-group">
            <label class="form-label">CUIT</label>
            <input type="text" class="form-input" name="cuit" value="${escapeHtml(cliente.cuit || '')}" placeholder="XX-XXXXXXXX-X">
          </div>
          <div class="form-group">
            <label class="form-label">Observaciones</label>
            <textarea class="form-textarea" name="observaciones" rows="3">${escapeHtml(cliente.observaciones || '')}</textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" id="drawer-cancel">Cancelar</button>
        <button class="btn btn-primary" id="drawer-save">${isEdit ? 'Guardar cambios' : 'Crear cliente'}</button>
      `
    });

    document.getElementById('drawer-cancel').addEventListener('click', () => Drawer.close());
    document.getElementById('drawer-save').addEventListener('click', () => {
      const form = document.getElementById('cliente-form');
      const formData = new FormData(form);
      const data = Object.fromEntries(formData);

      if (!data.nombre?.trim()) {
        Toast.warning('Campo requerido', 'El nombre es obligatorio');
        return;
      }

      if (isEdit) {
        DataService.update('clientes', editId, data);
        Toast.success('Cliente actualizado');
      } else {
        DataService.create('clientes', data);
        Toast.success('Cliente creado');
      }

      Drawer.close();
      clientes = DataService.getAll('clientes');
      render();
    });
  }

  async function handleDelete(id) {
    const cliente = DataService.getById('clientes', id);
    const confirmed = await confirmDialog({
      title: 'Eliminar cliente',
      message: `¿Estás seguro de eliminar a "${cliente.nombre} ${cliente.apellido || ''}"?`,
      subMessage: 'Se eliminarán también sus presupuestos y cobros asociados.',
      confirmText: 'Eliminar',
      type: 'danger'
    });

    if (confirmed) {
      DataService.remove('clientes', id);
      Toast.success('Cliente eliminado');
      clientes = DataService.getAll('clientes');
      render();
    }
  }

  // New button
  setTimeout(() => {
    document.getElementById('btn-new-cliente')?.addEventListener('click', () => openClienteForm());
  }, 100);

  render();
}

// ── Client Detail View ──
function renderClienteDetail(container, actionsEl, clienteId) {
  const cliente = DataService.getById('clientes', clienteId);

  if (!cliente) {
    container.innerHTML = renderEmptyState({ title: 'Cliente no encontrado', text: 'El cliente solicitado no existe' });
    return;
  }

  const saldo = DataService.getClienteSaldo(clienteId);
  const presupuestos = DataService.getAll('presupuestos').filter(p => p.clienteId === clienteId);
  const obras = DataService.getAll('obras').filter(o => o.clienteId === clienteId);
  const cobros = DataService.getAll('cobros').filter(c => c.clienteId === clienteId);
  const eventos = DataService.getEventosCliente(clienteId);

  // Header actions - clean Volver button only to avoid top bar overflow
  actionsEl.innerHTML = `
    <a href="#/clientes" class="btn btn-secondary">${Icons['chevron-left']} Volver</a>
  `;

  const initials = (cliente.nombre?.[0] || '') + (cliente.apellido?.[0] || '');

  container.innerHTML = `
    <!-- Action buttons bar -->
    <div class="card mb-4">
      <div class="card-body" style="display:flex;gap:var(--space-2);flex-wrap:wrap">
        <button class="btn btn-primary" id="btn-cliente-new-pres" style="flex:1;min-width:140px;justify-content:center">${Icons.plus} Presupuesto</button>
        <button class="btn btn-secondary" id="btn-cliente-action-agendar" style="flex:1;min-width:140px;justify-content:center">${Icons.calendar} Agendar</button>
        ${cliente.whatsapp ? `<a href="https://wa.me/${cliente.whatsapp}" target="_blank" class="btn btn-secondary" style="flex:1;min-width:130px;justify-content:center">${Icons.whatsapp} WhatsApp</a>` : ''}
        ${cliente.telefono ? `<a href="tel:${cliente.telefono}" class="btn btn-secondary" style="flex:1;min-width:110px;justify-content:center">${Icons.phone} Llamar</a>` : ''}
        <button class="btn btn-secondary" id="btn-cliente-edit" style="flex:1;min-width:110px;justify-content:center">${Icons.edit} Editar</button>
      </div>
    </div>

    <!-- Client profile card -->
    <div class="card mb-4">
      <div class="card-body">
        <div class="detail-header" style="margin-bottom:var(--space-3)">
          <div class="detail-avatar">${initials.toUpperCase()}</div>
          <div class="detail-header-info">
            <h2 class="detail-header-name">${escapeHtml(cliente.nombre)} ${escapeHtml(cliente.apellido || '')}</h2>
            <div class="detail-header-meta">
              ${cliente.telefono ? `<span class="detail-header-meta-item">${Icons.phone} ${escapeHtml(cliente.telefono)}</span>` : ''}
              ${cliente.email ? `<span class="detail-header-meta-item">${Icons.mail} ${escapeHtml(cliente.email)}</span>` : ''}
              ${cliente.direccion ? `<span class="detail-header-meta-item">${Icons['map-pin']} ${escapeHtml(cliente.direccion)}</span>` : ''}
              ${cliente.cuit ? `<span class="detail-header-meta-item">CUIT: ${escapeHtml(cliente.cuit)}</span>` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats row 2x2 grid -->
    <div class="detail-stats-row mb-4">
      <div class="detail-stat-mini">
        <span class="detail-stat-mini-label">Total obras</span>
        <span class="detail-stat-mini-value">${formatCurrency(saldo.totalObras)}</span>
      </div>
      <div class="detail-stat-mini">
        <span class="detail-stat-mini-label">Cobrado</span>
        <span class="detail-stat-mini-value" style="color: var(--color-success)">${formatCurrency(saldo.totalCobrado)}</span>
      </div>
      <div class="detail-stat-mini">
        <span class="detail-stat-mini-label">Saldo pendiente</span>
        <span class="detail-stat-mini-value" style="color: ${saldo.saldo > 0 ? 'var(--color-warning)' : 'var(--color-stone-500)'}">${formatCurrency(saldo.saldo)}</span>
      </div>
      <div class="detail-stat-mini">
        <span class="detail-stat-mini-label">Presupuestos</span>
        <span class="detail-stat-mini-value">${presupuestos.length}</span>
      </div>
    </div>

    <!-- Próximos eventos / trabajos agendados section -->
    <div class="card mb-4">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:var(--space-2)">
        <h3 class="card-title" style="display:flex;align-items:center;gap:var(--space-2)">
          ${Icons.calendar} Próximos eventos / trabajos agendados (${eventos.length})
        </h3>
        <div style="display:flex;gap:var(--space-2)">
          <button class="btn btn-sm btn-primary" id="btn-cliente-agendar">${Icons.plus} Agendar evento</button>
          <a href="#/calendario" class="btn btn-sm btn-secondary">${Icons.calendar} Ver en calendario</a>
        </div>
      </div>
      <div class="card-body" style="padding:0">
        ${eventos.length === 0 ? `
          <div class="text-center text-muted" style="padding:var(--space-6)">
            <p style="margin-bottom:var(--space-2);font-size:var(--text-sm)">No hay eventos ni trabajos agendados para este cliente.</p>
            <button class="btn btn-sm btn-secondary" id="btn-cliente-agendar-empty">${Icons.plus} Agendar el primero</button>
          </div>
        ` : `
          <div class="cliente-eventos-list">
            ${eventos.map(ev => `
              <div class="cliente-evento-row" data-event-id="${ev.id}" style="display:flex;align-items:center;justify-content:space-between;padding:var(--space-3) var(--space-4);border-bottom:1px solid var(--color-stone-200);cursor:pointer;gap:var(--space-3);transition:background 0.15s">
                <div style="display:flex;align-items:center;gap:var(--space-3);min-width:0;flex:1">
                  <div style="width:40px;height:40px;border-radius:var(--radius-md);background:var(--color-stone-100);display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;border:1px solid var(--color-stone-200)">
                    <span style="font-size:10px;font-weight:var(--font-bold);text-transform:uppercase;color:var(--color-stone-500);line-height:1">${new Date(ev.fecha + 'T00:00:00').toLocaleDateString('es-AR', { month: 'short' })}</span>
                    <span style="font-size:14px;font-weight:var(--font-bold);color:var(--color-stone-900);line-height:1.1">${new Date(ev.fecha + 'T00:00:00').getDate()}</span>
                  </div>
                  <div style="min-width:0;flex:1">
                    <div style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
                      ${renderBadge(EVENTO_TIPO_LABELS[ev.tipo] || ev.tipo, EVENTO_TIPO_COLORS[ev.tipo] || 'neutral')}
                      <span style="font-size:var(--text-sm);font-weight:var(--font-medium);color:var(--color-stone-900)">${ev.hora ? ev.hora + ' hs' : 'Todo el día'}</span>
                    </div>
                    <div style="font-size:var(--text-xs);color:var(--color-stone-600);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
                      ${escapeHtml(ev.direccion || ev.notas || 'Sin notas adicionales')}
                    </div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:var(--space-2);flex-shrink:0">
                  ${renderBadge(EVENTO_ESTADO_LABELS[ev.estado] || ev.estado, EVENTO_ESTADO_COLORS[ev.estado] || 'neutral')}
                  <button class="btn btn-ghost btn-icon btn-sm" title="Ver detalle">${Icons.eye}</button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>

    <div class="tabs-container">
      <div class="tabs-header">
        <button class="tab-btn active" data-tab="presupuestos">Presupuestos (${presupuestos.length})</button>
        <button class="tab-btn" data-tab="obras">Obras (${obras.length})</button>
        <button class="tab-btn" data-tab="cobros">Cobros (${cobros.length})</button>
        <button class="tab-btn" data-tab="datos">Ficha de datos</button>
      </div>

      <div class="tab-content active" id="tab-presupuestos">
        ${presupuestos.length > 0 ? renderDataTable({
          columns: [
            { label: 'Número', render: (p) => `<a href="#/presupuestos/${p.id}" class="cell-mono" style="font-weight:var(--font-bold);color:var(--color-stone-900)">${p.numero}</a>` },
            { label: 'Fecha', render: (p) => formatDate(p.fecha) },
            { label: 'Descripción', render: (p) => escapeHtml(p.descripcion) },
            { label: 'Estado', render: (p) => renderBadge(p.estado.charAt(0).toUpperCase() + p.estado.slice(1), { borrador: 'neutral', enviado: 'info', aprobado: 'success', rechazado: 'error', vencido: 'warning' }[p.estado]) },
            { label: 'Total', align: 'right', render: (p) => `<span class="cell-currency">${formatCurrency(DataService.getPresupuestoTotal(p))}</span>` },
            {
              label: '', field: 'actions', align: 'right', className: 'cell-actions',
              render: (p) => `<a href="#/presupuestos/${p.id}" class="btn btn-ghost btn-icon btn-sm" title="Ver">${Icons.eye}</a>`
            }
          ],
          data: presupuestos,
          id: 'pres-table'
        }) : '<div class="card"><div class="card-body text-center text-muted" style="padding:var(--space-8)">No hay presupuestos registrados para este cliente</div></div>'}
      </div>

      <div class="tab-content" id="tab-obras">
        ${obras.length > 0 ? renderDataTable({
          columns: [
            { label: 'Dirección', render: (o) => `<a href="#/obras/${o.id}" style="font-weight:var(--font-semibold);color:var(--color-stone-900)">${escapeHtml(o.direccion)}</a>` },
            { label: 'Material', render: (o) => escapeHtml(o.material || '-') },
            { label: 'Estado', render: (o) => renderBadge(o.estado.replace('_', ' '), { pendiente: 'neutral', en_preparacion: 'info', en_proceso: 'warning', colocacion: 'accent', finalizada: 'success', cancelada: 'error' }[o.estado]) },
            { label: 'Cobrado', align: 'right', render: (o) => `<span class="cell-currency">${formatCurrency(DataService.getObraCobrado(o.id))}</span>` },
            {
              label: '', field: 'actions', align: 'right', className: 'cell-actions',
              render: (o) => `<a href="#/obras/${o.id}" class="btn btn-ghost btn-icon btn-sm" title="Ver">${Icons.eye}</a>`
            }
          ],
          data: obras,
          id: 'obras-table'
        }) : '<div class="card"><div class="card-body text-center text-muted" style="padding:var(--space-8)">No hay obras registradas para este cliente</div></div>'}
      </div>

      <div class="tab-content" id="tab-cobros">
        ${cobros.length > 0 ? renderDataTable({
          columns: [
            { label: 'Fecha', render: (c) => formatDate(c.fecha) },
            { label: 'Importe', align: 'right', render: (c) => `<span class="cell-currency">${formatCurrency(c.importe)}</span>` },
            { label: 'Método', render: (c) => escapeHtml(c.metodoPago) },
            { label: 'Observaciones', render: (c) => escapeHtml(c.observaciones || '-'), className: 'cell-secondary' }
          ],
          data: cobros,
          id: 'cobros-table'
        }) : '<div class="card"><div class="card-body text-center text-muted" style="padding:var(--space-8)">No hay cobros registrados para este cliente</div></div>'}
      </div>

      <div class="tab-content" id="tab-datos">
        <div class="card">
          <div class="card-body">
            <div class="detail-list">
              <div class="detail-item">
                <span class="detail-label">Nombre completo</span>
                <span class="detail-value">${escapeHtml(cliente.nombre)} ${escapeHtml(cliente.apellido || '')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Teléfono</span>
                <span class="detail-value">${escapeHtml(cliente.telefono || '-')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">WhatsApp</span>
                <span class="detail-value">${escapeHtml(cliente.whatsapp || '-')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Email</span>
                <span class="detail-value">${escapeHtml(cliente.email || '-')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Dirección</span>
                <span class="detail-value">${escapeHtml(cliente.direccion || '-')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">CUIT / DNI</span>
                <span class="detail-value">${escapeHtml(cliente.cuit || '-')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Observaciones</span>
                <span class="detail-value">${escapeHtml(cliente.observaciones || '-')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Edit button
  document.getElementById('btn-cliente-edit')?.addEventListener('click', () => {
    // Navigate back to clients and trigger edit
    window.location.hash = '#/clientes';
    setTimeout(() => {
      document.querySelector(`[data-action="edit"][data-id="${clienteId}"]`)?.click();
    }, 150);
  });

  // New presupuesto button
  document.getElementById('btn-cliente-new-pres')?.addEventListener('click', () => {
    window.location.hash = '#/presupuestos';
    setTimeout(() => {
      document.getElementById('btn-new-pres')?.click();
      setTimeout(() => {
        const sel = document.querySelector('select[name="clienteId"]');
        if (sel) {
          sel.value = clienteId;
          sel.dispatchEvent(new Event('change'));
        }
      }, 100);
    }, 150);
  });

  // Agendar evento actions
  const handleAgendar = () => {
    openEventoForm({
      clienteId: cliente.id,
      clienteNombre: `${cliente.nombre} ${cliente.apellido || ''}`.trim(),
      direccion: cliente.direccion || ''
    }, () => {
      renderClienteDetail(container, actionsEl, clienteId);
    });
  };

  document.getElementById('btn-cliente-action-agendar')?.addEventListener('click', handleAgendar);
  document.getElementById('btn-cliente-agendar')?.addEventListener('click', handleAgendar);
  document.getElementById('btn-cliente-agendar-empty')?.addEventListener('click', handleAgendar);

  container.querySelectorAll('.cliente-evento-row').forEach(row => {
    row.addEventListener('click', () => {
      const evId = row.dataset.eventId;
      if (evId) openEventoDetailModal(evId);
    });
  });

  // Tabs logic
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`#tab-${btn.dataset.tab}`)?.classList.add('active');
    });
  });
}
