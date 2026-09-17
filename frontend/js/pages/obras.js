/* ========================================
   MARMOLERÍA BENJAMIN — Obras Page
   ======================================== */

import { DataService } from '../services/mockData.js';
import { formatCurrency, formatDate, escapeHtml, debounce, searchFilter, compareNewestFirst } from '../utils/helpers.js';
import { Icons, renderDataTable, renderSearchInput, renderBadge, renderEmptyState, renderProgressBar } from '../components/ui.js';
import { Drawer } from '../components/drawer.js';
import { Toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { DocumentModal } from '../components/documentModal.js';
import { generateObraHtml, exportToPdf, exportToWord } from '../services/documentExporter.js';
import { OBRA_ESTADO_LABELS, OBRA_ESTADO_COLORS } from '../utils/constants.js';
import { openDescontarStockObraModal } from '../services/stockAutomation.js';
import { openCobroForm } from './cobros.js';
import { openEventoForm } from './calendario.js';

export function renderObras(container, actionsEl, path) {
  const parts = path.split('/');
  if (parts.length > 2 && parts[2]) { renderObraDetail(container, actionsEl, parts[2]); return; }

  actionsEl.innerHTML = `<button class="btn btn-primary" id="btn-new-obra">${Icons.plus} Nueva obra</button>`;
  actionsEl.querySelector('#btn-new-obra')?.addEventListener('click', () => openObraForm());

  let obras = DataService.getAll('obras');
  let searchTerm = '', filterEstado = '';

  function render() {
    let filtered = obras;
    if (filterEstado) filtered = filtered.filter(o => o.estado === filterEstado);
    if (searchTerm) filtered = searchFilter(filtered, searchTerm, ['direccion', 'descripcion', 'material', 'clienteNombre', 'presupuestoNumero']);

    const clientes = DataService.getAll('clientes');
    const columns = [
      { label: 'Cliente y Obra', render: (o) => {
        const c = clientes.find(c => String(c.id) === String(o.clienteId));
        const cliName = c ? `${c.nombre} ${c.apellido || ''}`.trim() : (o.clienteNombre || 'Cliente sin asignar');
        const shortId = (o.id && o.id.length > 8) ? o.id.slice(-6).toUpperCase() : o.id;
        return `<div>
          <span class="cell-primary" style="font-weight:var(--font-semibold);display:block;line-height:1.3">${escapeHtml(cliName)}</span>
          <div style="display:flex;align-items:center;gap:6px;margin-top:2px;font-size:11px">
            <span class="cell-mono" style="color:var(--color-primary);font-weight:var(--font-bold)">#${shortId}</span>
            ${o.presupuestoNumero ? `<a href="#/presupuestos/${o.presupuestoId}" class="badge badge-neutral" style="font-family:var(--font-mono);font-size:10px;padding:1px 6px;text-decoration:none" title="Ver presupuesto">${escapeHtml(o.presupuestoNumero)}</a>` : ''}
          </div>
        </div>`;
      }},
      { label: 'Dirección', render: (o) => `<span class="text-truncate" style="max-width:170px;display:inline-block" title="${escapeHtml(o.direccion || '')}">${escapeHtml(o.direccion || '-')}</span>` },
      { label: 'Material', render: (o) => `<span class="text-truncate cell-secondary" style="max-width:140px;display:inline-block" title="${escapeHtml(o.material || '')}">${escapeHtml(o.material || '-')}</span>` },
      { label: 'Estado', render: (o) => renderBadge(OBRA_ESTADO_LABELS[o.estado] || o.estado, OBRA_ESTADO_COLORS[o.estado] || 'neutral') },
      { label: 'Saldo', align: 'right', render: (o) => {
        const t = DataService.getObraTotal(o.id);
        const c = DataService.getObraCobrado(o.id);
        const saldo = t - c;
        return `<div>
          <span class="cell-currency" style="font-weight:var(--font-bold);color:${saldo > 0 ? 'var(--color-stone-900)' : 'var(--color-success)'}">${formatCurrency(saldo)}</span>
          ${t > 0 ? `<div style="font-size:10.5px;color:var(--color-stone-400)">Cobrado: ${Math.round(c / t * 100)}%</div>` : ''}
        </div>`;
      }},
      { label: '', align: 'right', className: 'cell-actions', render: (o) => `
        <div class="table-actions-group">
          <button class="btn btn-ghost btn-icon btn-sm" data-action="view" data-id="${o.id}" title="Ver ficha y detalle de obra">${Icons.eye}</button>
          <button class="btn btn-ghost btn-icon btn-sm" data-action="export" data-id="${o.id}" title="Exportar Ficha / Orden">${Icons.download}</button>
          <button class="btn btn-ghost btn-icon btn-sm" data-action="delete" data-id="${o.id}" title="Eliminar obra" style="color:var(--color-error)">${Icons.trash}</button>
        </div>
      `}
    ];

    container.innerHTML = `
      <div class="table-container">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            ${renderSearchInput('Buscar obra, cliente, material...')}
            <select class="filter-select" id="filter-estado">
              <option value="">Todos los estados</option>
              ${Object.entries(OBRA_ESTADO_LABELS).map(([k,v]) => `<option value="${k}" ${filterEstado===k?'selected':''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="table-toolbar-right"><span class="text-muted" style="font-size:var(--text-sm)">${filtered.length} obras</span></div>
        </div>
        ${renderDataTable({ columns, data: filtered.sort(compareNewestFirst), emptyMessage: 'No hay obras registradas', onRowClick: true })}
      </div>
    `;

    const si = container.querySelector('#search-input');
    if (si) { si.value = searchTerm; si.oninput = debounce(e => { searchTerm = e.target.value; render(); }, 300); }
    const filterEl = container.querySelector('#filter-estado');
    if (filterEl) { filterEl.onchange = e => { filterEstado = e.target.value; render(); }; }
  }

  // Delegated single click handler on container (prevents duplicate listeners on render)
  container.onclick = e => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      e.stopPropagation();
      const { action, id } = btn.dataset;
      if (action === 'view') { window.location.hash = `#/obras/${id}`; return; }
      if (action === 'export') {
        const o = DataService.getById('obras', id);
        if (!o) return;
        const cli = o.clienteId ? DataService.getById('clientes', o.clienteId) : null;
        const pr = o.presupuestoId ? DataService.getById('presupuestos', o.presupuestoId) : null;
        const cobs = DataService.getAll('cobros').filter(c => String(c.obraId) === String(id));
        DocumentModal.open({
          title: `Ficha Técnica — Obra #${o.id}`,
          filename: `Ficha_Obra_${o.id}`,
          htmlContent: generateObraHtml(o, cli, pr, cobs)
        });
        return;
      }
      if (action === 'edit') { openObraForm(id); return; }
      if (action === 'delete') { handleDelete(id); return; }
      return;
    }
    const r = e.target.closest('.data-table tbody tr');
    if (r && r.dataset.id && !e.target.closest('a, button')) {
      window.location.hash = `#/obras/${r.dataset.id}`;
    }
  };

  async function handleDelete(id) {
    const confirmed = await confirmDialog({ title: 'Eliminar obra', message: '¿Estás seguro de eliminar esta obra?', confirmText: 'Eliminar', type: 'danger' });
    if (confirmed) {
      DataService.remove('obras', id);
      Toast.success('Obra eliminada');
      obras = DataService.getAll('obras');
      render();
    }
  }

  render();
}

export function openObraForm(editId = null, onSaved = null) {
  const obra = (editId ? DataService.getById('obras', editId) : null) || {};
  const isEdit = !!editId && !!obra.id;
  const clientes = DataService.getAll('clientes').filter(Boolean);

  Drawer.open({
    title: isEdit ? `Editar Obra #${obra.id}` : 'Nueva obra',
    size: 'lg',
    content: `
      <form id="obra-form">
        ${(obra.presupuestoNumero || obra.presupuestoId) ? `
          <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:var(--radius-md);padding:10px 14px;margin-bottom:var(--space-4);display:flex;align-items:center;justify-content:space-between;gap:8px">
            <div>
              <span style="font-weight:var(--font-bold);color:#1E40AF">Vinculada a Presupuesto:</span>
              <a href="#/presupuestos/${obra.presupuestoId}" style="font-weight:var(--font-bold);text-decoration:underline;color:#1D4ED8;margin-left:4px">
                ${escapeHtml(obra.presupuestoNumero || '#' + obra.presupuestoId)}
              </a>
            </div>
            <span class="badge badge-success" style="font-weight:var(--font-bold)">Importe: ${formatCurrency(obra.importe || DataService.getObraTotal(obra.id))}</span>
          </div>
        ` : ''}

        <div class="form-group">
          <label class="form-label">Cliente <span class="required">*</span></label>
          <select class="form-select" name="clienteId">
            <option value="">Seleccionar cliente...</option>
            ${clientes.map(c => `<option value="${c.id}" ${String(obra.clienteId) === String(c.id) ? 'selected' : ''}>${escapeHtml(c.nombre)} ${escapeHtml(c.apellido || '')}</option>`).join('')}
          </select>
          ${obra.clienteNombre && !obra.clienteId ? `<small class="text-muted" style="display:block;margin-top:4px">Cliente registrado originalmente: <strong>${escapeHtml(obra.clienteNombre)}</strong></small>` : ''}
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Contacto / Teléfono</label>
            <input type="text" class="form-input" name="contacto" value="${escapeHtml(obra.contacto || obra.telefono || '')}" placeholder="Teléfono o WhatsApp">
          </div>
          <div class="form-group">
            <label class="form-label">Dirección de obra</label>
            <input type="text" class="form-input" name="direccion" value="${escapeHtml(obra.direccion || '')}" placeholder="Dirección de colocación">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Descripción del trabajo</label>
          <input type="text" class="form-input" name="descripcion" value="${escapeHtml(obra.descripcion || '')}" placeholder="Descripción de los trabajos">
        </div>

        <div class="form-group">
          <label class="form-label">Material/es</label>
          <input type="text" class="form-input" name="material" value="${escapeHtml(obra.material || '')}" placeholder="Ej: Granito Negro Boreal, Silestone Blanco">
        </div>

        <!-- Bloque de Planificación -->
        <div style="background:var(--color-stone-50);border:1px solid var(--color-stone-200);border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:var(--space-3)">
          <h4 style="font-size:var(--text-sm);font-weight:var(--font-bold);margin-bottom:var(--space-2);color:var(--color-stone-700);display:flex;align-items:center;gap:6px">
            ${Icons.calendar} Planificación de Taller e Instalación
          </h4>
          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Fecha de inicio</label>
              <input type="date" class="form-input" name="fechaInicio" value="${obra.fechaInicio || new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
              <label class="form-label">Fecha estimada de entrega</label>
              <input type="date" class="form-input" name="fechaEstimada" value="${obra.fechaEstimada || ''}">
            </div>
          </div>
          <div class="form-row-2">
            <div class="form-group mb-0">
              <label class="form-label">Responsable / Taller</label>
              <input type="text" class="form-input" name="responsable" value="${escapeHtml(obra.responsable || '')}" placeholder="Encargado o instalador asignado">
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Estado de la obra</label>
              <select class="form-select" name="estado">
                ${Object.entries(OBRA_ESTADO_LABELS).map(([k, v]) => `<option value="${k}" ${(obra.estado || 'pendiente') === k ? 'selected' : ''}>${v}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Observaciones técnicas / Instrucciones para el taller</label>
          <textarea class="form-textarea" name="observaciones" rows="3" placeholder="Detalles de bacha, inglete, plantilla, notas de colocación...">${escapeHtml(obra.observaciones || '')}</textarea>
        </div>
      </form>
    `,
    footer: `
      <button class="btn btn-secondary" id="drawer-cancel">Cancelar</button>
      <button class="btn btn-primary" id="drawer-save">${isEdit ? 'Guardar cambios' : 'Crear obra'}</button>
    `
  });

  document.getElementById('drawer-cancel').addEventListener('click', () => Drawer.close());
  document.getElementById('drawer-save').addEventListener('click', () => {
    const fd = new FormData(document.getElementById('obra-form'));
    const data = Object.fromEntries(fd);
    if (!data.clienteId && !obra.clienteNombre) {
      Toast.warning('Seleccioná un cliente para la obra');
      return;
    }
    if (data.contacto) {
      data.telefono = data.contacto;
    }
    let saved;
    if (isEdit) {
      saved = DataService.update('obras', editId, { ...obra, ...data });
      Toast.success('Obra actualizada con éxito');
    } else {
      data.archivos = [];
      data.estado = data.estado || 'pendiente';
      saved = DataService.create('obras', data);
      Toast.success('Obra creada con éxito');
    }
    Drawer.close();
    if (onSaved) {
      onSaved(saved);
    } else {
      window.location.hash = `#/obras/${saved.id}`;
    }
  });
}

function renderObraDetail(container, actionsEl, obraId) {
  const obra = DataService.getById('obras', obraId);
  if (!obra) { container.innerHTML = renderEmptyState({ title: 'Obra no encontrada' }); return; }

  const cliente = DataService.getById('clientes', obra.clienteId);
  const pres = obra.presupuestoId ? DataService.getById('presupuestos', obra.presupuestoId) : null;
  const total = DataService.getObraTotal(obraId);
  const cobrado = DataService.getObraCobrado(obraId);
  const saldoPendiente = total - cobrado;
  const porcentajeCobrado = total > 0 ? Math.min(100, Math.round((cobrado / total) * 100)) : 0;
  const cobros = DataService.getAll('cobros').filter(c => String(c.obraId) === String(obraId));
  const stockMovimientosObra = DataService.getAll('stockMovimientos').filter(m => String(m.obraId) === String(obraId) || (m.referencia && m.referencia.includes('#' + obraId)));
  const itemsList = (obra.items && obra.items.length > 0) ? obra.items : (pres?.items && pres.items.length > 0 ? pres.items : []);

  actionsEl.innerHTML = `
    <button class="btn btn-primary" id="btn-obra-edit-top">${Icons.edit} Editar</button>
    <a href="#/obras" class="btn btn-secondary">${Icons['chevron-left']} Volver a Obras</a>
  `;

  container.innerHTML = `
    <!-- Hero Header Card -->
    <div class="card mb-4" style="background:var(--color-surface);border:1px solid var(--color-stone-200);border-radius:var(--radius-lg);overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.04)">
      <div class="card-body" style="padding:var(--space-5)">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:var(--space-4);flex-wrap:wrap;margin-bottom:var(--space-3)">
          <div style="flex:1;min-width:280px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap">
              <span class="badge badge-neutral" style="font-weight:var(--font-bold);font-size:var(--text-xs)">Obra #${obra.id}</span>
              ${pres ? `<a href="#/presupuestos/${pres.id}" class="badge badge-info" style="text-decoration:none;font-size:var(--text-xs)">${Icons.file} Presupuesto: ${escapeHtml(pres.numero || '#' + pres.id)}</a>` : ''}
              ${obra.responsable ? `<span class="badge badge-secondary" style="font-size:var(--text-xs)">Taller: ${escapeHtml(obra.responsable)}</span>` : ''}
            </div>
            <h2 style="font-size:var(--text-2xl);font-weight:var(--font-bold);color:var(--color-stone-900);margin:0 0 8px 0;line-height:1.2">
              ${escapeHtml(obra.descripcion || `Obra #${obra.id}`)}
            </h2>
            <div style="display:flex;align-items:center;gap:var(--space-3);color:var(--color-stone-600);font-size:var(--text-sm);flex-wrap:wrap">
              <span><strong>Cliente:</strong> ${cliente ? `<a href="#/clientes/${cliente.id}" style="color:var(--color-stone-900);font-weight:var(--font-semibold)">${escapeHtml(cliente.nombre)} ${escapeHtml(cliente.apellido || '')}</a>` : escapeHtml(obra.clienteNombre || 'Sin cliente')}</span>
              <span>•</span>
              <span><strong>Dirección:</strong> ${escapeHtml(obra.direccion || 'Sin dirección')}</span>
              ${(obra.contacto || obra.telefono || cliente?.telefono || cliente?.whatsapp) ? `
                <span>•</span>
                <span><strong>Contacto:</strong> ${escapeHtml(obra.contacto || obra.telefono || cliente?.telefono || cliente?.whatsapp || '')}</span>
              ` : ''}
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <div class="obra-status-badge-wrapper" style="position:relative;display:inline-flex;align-items:center">
              <button type="button" 
                      id="btn-obra-status-badge" 
                      class="badge badge-${OBRA_ESTADO_COLORS[obra.estado] || 'neutral'} badge-interactive" 
                      title="Clic para cambiar el estado de la obra"
                      style="border:1px solid rgba(0,0,0,0.08);outline:none;display:inline-flex;align-items:center;gap:6px;padding:6px 14px;font-size:var(--text-xs);font-weight:var(--font-bold);box-shadow:0 1px 2px rgba(0,0,0,0.06);border-radius:var(--radius-full);user-select:none">
                <span class="badge-dot ${OBRA_ESTADO_COLORS[obra.estado] || 'neutral'}"></span>
                <span>${escapeHtml(OBRA_ESTADO_LABELS[obra.estado] || obra.estado)}</span>
                <span style="opacity:0.6;display:inline-flex;align-items:center;margin-left:2px">${Icons['chevron-down']}</span>
              </button>

              <select id="select-obra-status-dropdown" 
                      class="form-select form-select-sm" 
                      style="display:none;font-size:var(--text-xs);font-weight:var(--font-bold);border-radius:var(--radius-full);padding:6px 28px 6px 14px;cursor:pointer;background-position:right 8px center;box-shadow:0 2px 6px rgba(0,0,0,0.12);border-color:var(--color-primary);background-color:var(--color-surface)">
                ${Object.entries(OBRA_ESTADO_LABELS).map(([k, v]) => `
                  <option value="${k}" ${obra.estado === k ? 'selected' : ''}>${v}</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- 4 Stat Metric Cards in a Grid -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:var(--space-3);margin-top:var(--space-4);padding-top:var(--space-4);border-top:1px solid var(--color-stone-200)">
          <div style="background:var(--color-stone-50);padding:14px;border-radius:var(--radius-md);border:1px solid var(--color-stone-200)">
            <div style="font-size:var(--text-xs);color:var(--color-stone-500);font-weight:var(--font-medium);text-transform:uppercase;letter-spacing:0.5px">Total Obra</div>
            <div style="font-size:var(--text-xl);font-weight:var(--font-bold);color:var(--color-stone-900);margin-top:4px">${formatCurrency(total)}</div>
          </div>

          <div style="background:var(--color-stone-50);padding:14px;border-radius:var(--radius-md);border:1px solid var(--color-stone-200)">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span style="font-size:var(--text-xs);color:var(--color-stone-500);font-weight:var(--font-medium);text-transform:uppercase;letter-spacing:0.5px">Cobrado</span>
              <span style="font-size:var(--text-xs);font-weight:var(--font-bold);color:var(--color-success)">${porcentajeCobrado}%</span>
            </div>
            <div style="font-size:var(--text-xl);font-weight:var(--font-bold);color:var(--color-success);margin-top:4px">${formatCurrency(cobrado)}</div>
          </div>

          <div style="background:var(--color-stone-50);padding:14px;border-radius:var(--radius-md);border:1px solid var(--color-stone-200)">
            <div style="font-size:var(--text-xs);color:var(--color-stone-500);font-weight:var(--font-medium);text-transform:uppercase;letter-spacing:0.5px">Saldo Pendiente</div>
            <div style="font-size:var(--text-xl);font-weight:var(--font-bold);color:${saldoPendiente > 0 ? 'var(--color-warning)' : 'var(--color-success)'};margin-top:4px">${formatCurrency(saldoPendiente)}</div>
          </div>

          <div style="background:var(--color-stone-50);padding:14px;border-radius:var(--radius-md);border:1px solid var(--color-stone-200)">
            <div style="font-size:var(--text-xs);color:var(--color-stone-500);font-weight:var(--font-medium);text-transform:uppercase;letter-spacing:0.5px">Stock Materiales</div>
            <div style="margin-top:6px">
              ${obra.stockDescontado ? `
                <span class="badge badge-success" style="font-size:var(--text-xs);font-weight:var(--font-bold)">✓ Descontado</span>
              ` : `
                <span class="badge badge-warning" style="font-size:var(--text-xs);font-weight:var(--font-bold)">⚠️ Pendiente de salida</span>
              `}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tabbed Navigation -->
    <div class="tabs-container">
      <div class="tabs-header">
        <button class="tab-btn active" data-tab="items">Trabajos e Ítems (${itemsList.length})</button>
        <button class="tab-btn" data-tab="stock">Stock y Materiales</button>
        <button class="tab-btn" data-tab="cobros">Cobranzas y Pagos (${cobros.length})</button>
        <button class="tab-btn" data-tab="ficha">Ficha Técnica y Fechas</button>
      </div>

      <!-- TAB 1: ITEMS Y PIEZAS A FABRICAR -->
      <div class="tab-content active" id="tab-items">
        ${itemsList.length > 0 ? `
          <div class="card">
            <div class="card-header flex justify-between items-center">
              <h3 class="card-title" style="display:flex;align-items:center;gap:var(--space-2)">
                ${Icons.file} Ítems y Piezas a Fabricar (${itemsList.length})
              </h3>
            </div>
            <div class="card-body">
              <div class="detail-items-list">
                ${itemsList.map((item, idx) => {
                  const u = item.unidadMedida || ((item.largo > 10 || item.ancho > 10) ? 'cm' : 'm');
                  const m2Formatted = (item.m2 !== undefined && item.m2 !== null) ? Number(item.m2).toFixed(2).replace('.', ',') : '0,00';
                  return `
                  <div class="detail-item-card" style="padding:14px 16px;border:1px solid var(--color-stone-200);border-radius:var(--radius-md);margin-bottom:10px;background:var(--color-surface)">
                    <div class="detail-item-card-top" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px">
                      <span class="detail-item-card-desc" style="font-size:var(--text-base)"><strong>#${idx + 1}</strong> — ${escapeHtml(item.descripcion || `Ítem ${idx + 1}`)}</span>
                      <span class="badge badge-neutral" style="font-weight:var(--font-bold)">${escapeHtml(item.material || obra.material || 'Material s/ diseño')}</span>
                    </div>
                    <div class="detail-item-card-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(140px, 1fr));gap:10px;font-size:var(--text-sm)">
                      <div><span class="text-muted">Cantidad:</span> <strong>${item.cantidad || 1} piezas</strong></div>
                      <div><span class="text-muted">Medidas:</span> <strong>${item.largo ? item.largo + ' ' + u : '-'} × ${item.ancho ? item.ancho + ' ' + u : '-'}</strong></div>
                      <div><span class="text-muted">Superficie:</span> <strong style="color:var(--color-primary)">${m2Formatted} m²</strong></div>
                      ${item.subtotal ? `<div><span class="text-muted">Subtotal:</span> <strong>${formatCurrency(item.subtotal)}</strong></div>` : ''}
                    </div>
                  </div>
                `;
                }).join('')}
              </div>
            </div>
          </div>
        ` : `
          <div class="card">
            <div class="card-body text-center text-muted" style="padding:var(--space-8)">
              <p style="font-size:var(--text-base);margin-bottom:var(--space-2)">No hay ítems presupuestados desglosados en esta obra.</p>
              <p style="font-size:var(--text-sm);color:var(--color-stone-500)">Podés detallar las piezas y medidas editando la obra o vinculándola con un presupuesto.</p>
            </div>
          </div>
        `}
      </div>

      <!-- TAB 2: STOCK Y MATERIALES -->
      <div class="tab-content" id="tab-stock">
        <div class="card mb-4">
          <div class="card-header flex justify-between items-center" style="flex-wrap:wrap;gap:var(--space-2)">
            <h3 class="card-title" style="display:flex;align-items:center;gap:var(--space-2)">
              ${Icons.box} Control de Consumo de Stock
            </h3>
            ${obra.stockDescontado ? `
              <span class="badge badge-success">${Icons.check} Stock descontado</span>
            ` : ''}
          </div>
          <div class="card-body">
            ${obra.stockDescontado ? `
              <div style="display:flex;align-items:center;gap:10px;padding:14px 18px;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:var(--radius-md);color:#166534;margin-bottom:var(--space-4)">
                ${Icons.check}
                <div>
                  <strong>Materiales ya descontados del stock</strong>
                  <div style="font-size:var(--text-xs);color:#15803D;margin-top:2px">El consumo de materiales para esta obra fue debitado del inventario de la marmolería.</div>
                </div>
              </div>
            ` : `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;background:#FEFCE8;border:1px solid #FEF08A;border-radius:var(--radius-md);gap:16px;flex-wrap:wrap;margin-bottom:var(--space-4)">
                <div>
                  <div style="font-weight:var(--font-bold);color:#854D0E;font-size:var(--text-base)">Descuento de materiales</div>
                  <div style="font-size:var(--text-xs);color:#A16207;margin-top:2px">Podés descontar automáticamente los metros cuadrados o unidades de materiales requeridos de tu stock disponible.</div>
                </div>
                <button class="btn btn-primary" id="btn-obra-descontar-stock">
                  ${Icons.box} Descontar materiales
                </button>
              </div>
            `}

            <h4 style="font-size:var(--text-sm);font-weight:var(--font-bold);margin-bottom:var(--space-3);color:var(--color-stone-700)">
              Movimientos de stock asociados a esta obra
            </h4>

            ${stockMovimientosObra.length > 0 ? `
              <table class="data-table">
                <thead>
                  <tr><th>Material</th><th style="text-align:right">Cantidad</th><th>Fecha</th><th>Referencia</th></tr>
                </thead>
                <tbody>
                  ${stockMovimientosObra.map(m => {
                    const mat = DataService.getById('materiales', m.materialId);
                    const u = mat ? (mat.unidad === 'm2' ? 'm²' : (mat.unidad === 'metros' ? 'ml' : mat.unidad)) : '';
                    return `<tr>
                      <td><strong>${escapeHtml(mat?.nombre || 'Material #' + m.materialId)}</strong></td>
                      <td style="text-align:right;font-weight:var(--font-semibold);color:var(--color-error)">-${m.cantidad} ${u}</td>
                      <td>${formatDate(m.fecha)}</td>
                      <td class="cell-secondary">${escapeHtml(m.referencia || '-')}</td>
                    </tr>`;
                  }).join('')}
                </tbody>
              </table>
            ` : `
              <p class="text-muted" style="margin:0;font-size:var(--text-sm)">
                ${obra.stockDescontado ? 'Stock marcado como descontado para esta obra.' : 'Aún no se registraron movimientos de stock para esta obra.'}
              </p>
            `}
          </div>
        </div>
      </div>

      <!-- TAB 3: COBRANZAS Y PAGOS -->
      <div class="tab-content" id="tab-cobros">
        ${total > 0 ? `
        <div class="card mb-4">
          <div class="card-body">
            <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2)">
              <span class="text-muted" style="font-size:var(--text-sm)">Avance de cobranza</span>
              <span style="font-weight:var(--font-bold);font-size:var(--text-sm)">${porcentajeCobrado}% (${formatCurrency(cobrado)} de ${formatCurrency(total)})</span>
            </div>
            ${renderProgressBar(cobrado, total)}
          </div>
        </div>` : ''}

        <div class="card">
          <div class="card-header flex justify-between items-center" style="flex-wrap:wrap;gap:var(--space-2)">
            <h3 class="card-title">Cobros asociados (${cobros.length})</h3>
            <button class="btn btn-sm btn-primary" id="btn-obra-new-cobro" style="gap:5px">
              ${Icons.plus} Registrar cobro
            </button>
          </div>
          ${cobros.length > 0 ? renderDataTable({ columns: [
            { label: 'Fecha', render: c => formatDate(c.fecha) },
            { label: 'Importe', align: 'right', render: c => `<span class="cell-currency">${formatCurrency(c.importe)}</span>` },
            { label: 'Método', render: c => escapeHtml(c.metodoPago) },
            { label: 'Observaciones', render: c => escapeHtml(c.observaciones || '-'), className: 'cell-secondary' }
          ], data: cobros }) : '<div class="card-body text-center text-muted" style="padding:var(--space-6)">No hay cobros registrados para esta obra</div>'}
        </div>
      </div>

      <!-- TAB 4: FICHA TECNICA Y PLANIFICACION -->
      <div class="tab-content" id="tab-ficha">
        <div class="card mb-4">
          <div class="card-header flex justify-between items-center">
            <h3 class="card-title">Datos Generales y Logística</h3>
            <button class="btn btn-sm btn-secondary" id="btn-obra-edit-ficha">${Icons.edit} Editar datos</button>
          </div>
          <div class="card-body">
            <div class="detail-list">
              <div class="detail-item">
                <span class="detail-label">Cliente</span>
                <span class="detail-value">${cliente ? `<a href="#/clientes/${cliente.id}" style="font-weight:var(--font-semibold);color:var(--color-primary)">${escapeHtml(cliente.nombre)} ${escapeHtml(cliente.apellido || '')}</a>` : escapeHtml(obra.clienteNombre || '-')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Contacto / Teléfono</span>
                <span class="detail-value">${escapeHtml(obra.contacto || obra.telefono || cliente?.telefono || cliente?.whatsapp || '-')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Dirección de obra</span>
                <span class="detail-value">${escapeHtml(obra.direccion || '-')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Material/es</span>
                <span class="detail-value">${escapeHtml(obra.material || '-')}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Fecha de inicio</span>
                <span class="detail-value">${formatDate(obra.fechaInicio)}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Fecha estimada de entrega</span>
                <span class="detail-value">${obra.fechaEstimada ? formatDate(obra.fechaEstimada) : '<span class="text-muted" style="font-style:italic">A definir en planificación</span>'}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Responsable / Taller</span>
                <span class="detail-value">${obra.responsable ? escapeHtml(obra.responsable) : '<span class="text-muted" style="font-style:italic">A asignar</span>'}</span>
              </div>
              ${pres ? `
              <div class="detail-item">
                <span class="detail-label">Presupuesto vinculado</span>
                <span class="detail-value"><a href="#/presupuestos/${pres.id}" style="font-weight:var(--font-bold);color:var(--color-primary)">${escapeHtml(pres.numero || '#' + pres.id)}</a></span>
              </div>` : (obra.presupuestoNumero ? `
              <div class="detail-item">
                <span class="detail-label">Presupuesto vinculado</span>
                <span class="detail-value"><a href="#/presupuestos/${obra.presupuestoId || ''}" style="font-weight:var(--font-bold);color:var(--color-primary)">${escapeHtml(obra.presupuestoNumero)}</a></span>
              </div>` : '')}
              ${obra.fechaAprobacion ? `
              <div class="detail-item">
                <span class="detail-label">Fecha de aprobación</span>
                <span class="detail-value">${formatDate(obra.fechaAprobacion)}</span>
              </div>` : ''}
            </div>
          </div>
        </div>

        ${obra.observaciones ? `
        <div class="card mb-4">
          <div class="card-header"><h3 class="card-title">Observaciones Técnicas e Instrucciones para el Taller</h3></div>
          <div class="card-body"><p style="color:var(--color-stone-700);white-space:pre-wrap;margin:0;line-height:1.5">${escapeHtml(obra.observaciones)}</p></div>
        </div>` : ''}
      </div>
    </div>

    <!-- Quick Operations & Actions Bar (Abajo de todo) -->
    <div class="card mb-4" style="border:1px solid var(--color-stone-200);background:var(--color-stone-50);margin-top:var(--space-4)">
      <div class="card-body" style="padding:var(--space-3) var(--space-4)">
        <!-- 4 Action buttons grid: 2x2 on Mobile, 4 in a row on Desktop -->
        <div class="obra-actions-grid mb-3">
          <button class="btn btn-primary obra-action-btn" id="btn-obra-edit-action">
            ${Icons.edit} <span>Editar</span>
          </button>
          <button class="btn btn-secondary obra-action-btn" id="btn-obra-agendar">
            ${Icons.calendar} <span>Agendar colocación</span>
          </button>
          <button class="btn btn-secondary obra-action-btn" id="btn-obra-quick-stock" style="color:var(--color-stone-800)">
            ${Icons.box} <span>Descontar materiales</span>
          </button>
          <button class="btn btn-secondary obra-action-btn" id="btn-obra-quick-cobro" style="color:var(--color-stone-800)">
            ${Icons.plus} <span>Registrar cobros</span>
          </button>
        </div>

        <!-- Export & View Actions Below (2-column grid on mobile) -->
        <div class="obra-secondary-grid">
          <button class="btn btn-secondary btn-sm obra-secondary-btn" id="btn-obra-preview">
            ${Icons.eye} <span>Vista previa</span>
          </button>
          <button class="btn btn-pdf btn-sm obra-secondary-btn" id="btn-obra-pdf">
            ${Icons['file-pdf']} <span>Ficha PDF</span>
          </button>
          <button class="btn btn-word btn-sm obra-secondary-btn" id="btn-obra-word">
            ${Icons['file-word']} <span>Ficha Word</span>
          </button>
          ${(cliente?.whatsapp || obra.contacto || obra.telefono) ? `
            <button class="btn btn-secondary btn-sm obra-secondary-btn" id="btn-obra-whatsapp" style="color:#15803D;border-color:#BBF7D0;background:#F0FDF4">
              ${Icons.whatsapp} <span>WhatsApp</span>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;

  // Export handlers
  const getDocHtml = () => generateObraHtml(obra, cliente, pres, cobros);
  const docFilename = `Ficha_Obra_${obra.id}`;

  document.getElementById('btn-obra-whatsapp')?.addEventListener('click', () => {
    const phone = (cliente?.whatsapp || cliente?.telefono || '').replace(/\D/g, '');
    const msg = `Hola! Te envío la información de la obra #${obra.id} de Marmolería Benjamin.\n${obra.descripcion || ''}\nDirección: ${obra.direccion || ''}\nEstado: ${obra.estado || ''}\n\n¡Saludos!`;
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      Toast.info('WhatsApp', 'El cliente no tiene teléfono o WhatsApp registrado');
    }
  });

  document.getElementById('btn-obra-preview')?.addEventListener('click', () => {
    DocumentModal.open({
      title: `Ficha Técnica — Obra #${obra.id}`,
      filename: docFilename,
      htmlContent: getDocHtml()
    });
  });

  document.getElementById('btn-obra-pdf')?.addEventListener('click', async () => {
    Toast.info('Generando PDF', 'Preparando ficha técnica de obra...');
    const ok = await exportToPdf(getDocHtml(), docFilename);
    if (ok) Toast.success('Ficha en PDF descargada');
  });

  const handleDescontarStock = () => {
    openDescontarStockObraModal({
      obra,
      presupuesto: pres,
      onDone: () => {
        renderObraDetail(container, actionsEl, obraId);
      }
    });
  };
  document.getElementById('btn-obra-descontar-stock')?.addEventListener('click', handleDescontarStock);
  document.getElementById('btn-obra-quick-stock')?.addEventListener('click', handleDescontarStock);

  document.getElementById('btn-obra-word')?.addEventListener('click', () => {
    try {
      exportToWord(getDocHtml(), docFilename);
      Toast.success('Ficha en Word (.doc) descargada');
    } catch (e) {
      console.error(e);
      Toast.error('Error al generar archivo Word');
    }
  });

  document.getElementById('btn-obra-agendar')?.addEventListener('click', () => {
    openEventoForm({
      clienteId: obra.clienteId,
      clienteNombre: obra.clienteNombre || (cliente ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : ''),
      direccion: obra.direccion,
      notas: `Obra #${obra.id} — ${obra.descripcion || ''}`,
      tipo: 'instalacion'
    }, () => {
      Toast.success('Trabajo agendado en el calendario');
    });
  });

  const handleNewCobro = () => {
    const pend = total - cobrado;
    openCobroForm(null, {
      obraId: obra.id,
      clienteId: obra.clienteId,
      importe: pend > 0 ? pend : ''
    }, () => {
      renderObraDetail(container, actionsEl, obraId);
    });
  };
  document.getElementById('btn-obra-new-cobro')?.addEventListener('click', handleNewCobro);
  document.getElementById('btn-obra-quick-cobro')?.addEventListener('click', handleNewCobro);

  const handleEditObra = () => {
    openObraForm(obraId, () => {
      renderObraDetail(container, actionsEl, obraId);
    });
  };
  document.getElementById('btn-obra-edit-top')?.addEventListener('click', handleEditObra);
  document.getElementById('btn-obra-edit-action')?.addEventListener('click', handleEditObra);
  document.getElementById('btn-obra-edit-ficha')?.addEventListener('click', handleEditObra);

  // Quick status change from badge
  const statusBadgeBtn = document.getElementById('btn-obra-status-badge');
  const statusDropdown = document.getElementById('select-obra-status-dropdown');
  if (statusBadgeBtn && statusDropdown) {
    statusBadgeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      statusBadgeBtn.style.display = 'none';
      statusDropdown.style.display = 'inline-block';
      statusDropdown.focus();
      if (typeof statusDropdown.showPicker === 'function') {
        try { statusDropdown.showPicker(); } catch (err) {}
      }
    });

    statusDropdown.addEventListener('change', (e) => {
      const nuevoEstado = e.target.value;
      if (nuevoEstado && nuevoEstado !== obra.estado) {
        DataService.update('obras', obraId, { estado: nuevoEstado });
        Toast.success(`Estado de la obra cambiado a: ${OBRA_ESTADO_LABELS[nuevoEstado] || nuevoEstado}`);
        renderObraDetail(container, actionsEl, obraId);
      } else {
        statusDropdown.style.display = 'none';
        statusBadgeBtn.style.display = 'inline-flex';
      }
    });

    statusDropdown.addEventListener('blur', () => {
      setTimeout(() => {
        statusDropdown.style.display = 'none';
        statusBadgeBtn.style.display = 'inline-flex';
      }, 150);
    });
  }

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
