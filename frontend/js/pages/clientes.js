/* ========================================
   MARMOLERÍA BENJAMIN — Clientes Page
   ======================================== */

import { DataService } from '../services/mockData.js';
import { formatCurrency, formatDate, searchFilter, escapeHtml, debounce } from '../utils/helpers.js';
import { Icons, renderDataTable, renderSearchInput, renderBadge, renderEmptyState } from '../components/ui.js';
import { Drawer } from '../components/drawer.js';
import { Toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirmDialog.js';

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
    const cliente = editId ? DataService.getById('clientes', editId) : {};
    const isEdit = !!editId;

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

  // Header
  actionsEl.innerHTML = `
    <a href="#/clientes" class="btn btn-secondary">${Icons['chevron-left']} Volver</a>
  `;

  const initials = (cliente.nombre?.[0] || '') + (cliente.apellido?.[0] || '');

  container.innerHTML = `
    <div class="detail-header">
      <div class="detail-avatar">${initials.toUpperCase()}</div>
      <div class="detail-header-info">
        <h2 class="detail-header-name">${escapeHtml(cliente.nombre)} ${escapeHtml(cliente.apellido || '')}</h2>
        <div class="detail-header-meta">
          ${cliente.telefono ? `<span class="detail-header-meta-item">${Icons.phone} ${escapeHtml(cliente.telefono)}</span>` : ''}
          ${cliente.email ? `<span class="detail-header-meta-item">${Icons.mail} ${escapeHtml(cliente.email)}</span>` : ''}
          ${cliente.direccion ? `<span class="detail-header-meta-item">${Icons['map-pin']} ${escapeHtml(cliente.direccion)}</span>` : ''}
        </div>
      </div>
    </div>

    <div class="detail-stats-row">
      <div class="detail-stat-mini">
        <span class="detail-stat-mini-label">Total obras</span>
        <span class="detail-stat-mini-value">${formatCurrency(saldo.totalObras)}</span>
      </div>
      <div class="detail-stat-mini">
        <span class="detail-stat-mini-label">Cobrado</span>
        <span class="detail-stat-mini-value" style="color: var(--color-success)">${formatCurrency(saldo.totalCobrado)}</span>
      </div>
      <div class="detail-stat-mini">
        <span class="detail-stat-mini-label">Pendiente</span>
        <span class="detail-stat-mini-value" style="color: ${saldo.saldo > 0 ? 'var(--color-warning)' : 'var(--color-stone-500)'}">${formatCurrency(saldo.saldo)}</span>
      </div>
      <div class="detail-stat-mini">
        <span class="detail-stat-mini-label">Presupuestos</span>
        <span class="detail-stat-mini-value">${presupuestos.length}</span>
      </div>
    </div>

    <div class="tabs-container">
      <div class="tabs-header">
        <button class="tab-btn active" data-tab="presupuestos">Presupuestos (${presupuestos.length})</button>
        <button class="tab-btn" data-tab="obras">Obras (${obras.length})</button>
        <button class="tab-btn" data-tab="cobros">Cobros (${cobros.length})</button>
        <button class="tab-btn" data-tab="datos">Datos</button>
      </div>

      <div class="tab-content active" id="tab-presupuestos">
        ${presupuestos.length > 0 ? renderDataTable({
          columns: [
            { label: 'Número', render: (p) => `<span class="cell-mono">${p.numero}</span>` },
            { label: 'Fecha', render: (p) => formatDate(p.fecha) },
            { label: 'Descripción', render: (p) => escapeHtml(p.descripcion) },
            { label: 'Estado', render: (p) => renderBadge(p.estado.charAt(0).toUpperCase() + p.estado.slice(1), { borrador: 'neutral', enviado: 'info', aprobado: 'success', rechazado: 'error', vencido: 'warning' }[p.estado]) },
            { label: 'Total', align: 'right', render: (p) => `<span class="cell-currency">${formatCurrency(DataService.getPresupuestoTotal(p))}</span>` }
          ],
          data: presupuestos,
          id: 'pres-table'
        }) : '<p class="text-muted" style="padding: var(--space-6)">No hay presupuestos</p>'}
      </div>

      <div class="tab-content" id="tab-obras">
        ${obras.length > 0 ? renderDataTable({
          columns: [
            { label: 'Dirección', render: (o) => escapeHtml(o.direccion) },
            { label: 'Material', render: (o) => escapeHtml(o.material || '-') },
            { label: 'Estado', render: (o) => renderBadge(o.estado.replace('_', ' '), { pendiente: 'neutral', en_preparacion: 'info', en_proceso: 'warning', colocacion: 'accent', finalizada: 'success', cancelada: 'error' }[o.estado]) },
            { label: 'Cobrado', align: 'right', render: (o) => `<span class="cell-currency">${formatCurrency(DataService.getObraCobrado(o.id))}</span>` }
          ],
          data: obras,
          id: 'obras-table'
        }) : '<p class="text-muted" style="padding: var(--space-6)">No hay obras</p>'}
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
        }) : '<p class="text-muted" style="padding: var(--space-6)">No hay cobros registrados</p>'}
      </div>

      <div class="tab-content" id="tab-datos">
        <div class="card">
          <div class="card-body">
            <div class="detail-list">
              <span class="detail-label">Nombre</span>
              <span class="detail-value">${escapeHtml(cliente.nombre)} ${escapeHtml(cliente.apellido || '')}</span>
              <span class="detail-label">Teléfono</span>
              <span class="detail-value">${escapeHtml(cliente.telefono || '-')}</span>
              <span class="detail-label">WhatsApp</span>
              <span class="detail-value">${escapeHtml(cliente.whatsapp || '-')}</span>
              <span class="detail-label">Email</span>
              <span class="detail-value">${escapeHtml(cliente.email || '-')}</span>
              <span class="detail-label">Dirección</span>
              <span class="detail-value">${escapeHtml(cliente.direccion || '-')}</span>
              <span class="detail-label">CUIT</span>
              <span class="detail-value">${escapeHtml(cliente.cuit || '-')}</span>
              <span class="detail-label">Observaciones</span>
              <span class="detail-value">${escapeHtml(cliente.observaciones || '-')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Tabs logic
  container.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}
