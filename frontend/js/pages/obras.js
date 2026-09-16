/* ========================================
   MARMOLERÍA BENJAMIN — Obras Page
   ======================================== */

import { DataService } from '../services/mockData.js';
import { formatCurrency, formatDate, escapeHtml, debounce, searchFilter } from '../utils/helpers.js';
import { Icons, renderDataTable, renderSearchInput, renderBadge, renderEmptyState, renderProgressBar } from '../components/ui.js';
import { Drawer } from '../components/drawer.js';
import { Toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { DocumentModal } from '../components/documentModal.js';
import { generateObraHtml, exportToPdf, exportToWord } from '../services/documentExporter.js';
import { OBRA_ESTADO_LABELS, OBRA_ESTADO_COLORS } from '../utils/constants.js';
import { openDescontarStockObraModal } from '../services/stockAutomation.js';

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
      { label: 'Cliente', render: (o) => {
        const c = clientes.find(c => String(c.id) === String(o.clienteId));
        const cliName = c ? `${c.nombre} ${c.apellido || ''}`.trim() : (o.clienteNombre || 'Cliente sin asignar');
        const shortId = (o.id && o.id.length > 8) ? o.id.slice(-5).toUpperCase() : o.id;
        return `<div>
          <span class="cell-primary" style="font-weight:var(--font-semibold);display:block">${escapeHtml(cliName)}</span>
          <span class="cell-mono" style="font-size:11px;color:var(--color-stone-400)">Obra #${shortId}</span>
        </div>`;
      }},
      { label: 'Presupuesto', render: (o) => {
        if (o.presupuestoNumero) return `<a href="#/presupuestos/${o.presupuestoId}" class="badge badge-neutral" style="font-family:var(--font-mono);font-size:11px;font-weight:var(--font-bold);text-decoration:none">${escapeHtml(o.presupuestoNumero)}</a>`;
        if (o.presupuestoId) return `<a href="#/presupuestos/${o.presupuestoId}" class="badge badge-neutral">#${o.presupuestoId}</a>`;
        return '<span class="text-muted" style="font-size:11px">Directa</span>';
      }},
      { label: 'Dirección', render: (o) => `<span class="text-truncate" style="max-width:180px;display:inline-block" title="${escapeHtml(o.direccion || '')}">${escapeHtml(o.direccion || '-')}</span>` },
      { label: 'Material', render: (o) => `<span class="text-truncate cell-secondary" style="max-width:150px;display:inline-block" title="${escapeHtml(o.material || '')}">${escapeHtml(o.material || '-')}</span>` },
      { label: 'Estado', render: (o) => renderBadge(OBRA_ESTADO_LABELS[o.estado] || o.estado, OBRA_ESTADO_COLORS[o.estado] || 'neutral') },
      { label: 'Saldo', align: 'right', render: (o) => {
        const t = DataService.getObraTotal(o.id);
        const c = DataService.getObraCobrado(o.id);
        const saldo = t - c;
        return `<div>
          <span class="cell-currency" style="font-weight:var(--font-bold);color:${saldo > 0 ? 'var(--color-stone-900)' : 'var(--color-success)'}">${formatCurrency(saldo)}</span>
          ${t > 0 ? `<div style="font-size:10.5px;color:var(--color-stone-500)">Cobrado: ${Math.round(c / t * 100)}%</div>` : ''}
        </div>`;
      }},
      { label: 'Acciones', align: 'right', className: 'cell-actions', render: (o) => `
        <div style="display:inline-flex;align-items:center;justify-content:flex-end;gap:5px">
          <button class="btn btn-outline-primary btn-sm" data-action="edit" data-id="${o.id}" title="Planificar / Editar obra" style="padding:4px 10px;gap:5px;font-size:12px;font-weight:var(--font-semibold);display:inline-flex;align-items:center;color:var(--color-primary);border-color:var(--color-primary)">
            ${Icons.edit} <span>Editar</span>
          </button>
          <button class="btn btn-ghost btn-icon btn-sm" data-action="view" data-id="${o.id}" title="Ver">${Icons.eye}</button>
          <button class="btn btn-ghost btn-icon btn-sm" data-action="export" data-id="${o.id}" title="Exportar Ficha / Orden">${Icons.download}</button>
          <button class="btn btn-ghost btn-icon btn-sm" data-action="delete" data-id="${o.id}" title="Eliminar" style="color:var(--color-error)">${Icons.trash}</button>
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
        ${renderDataTable({ columns, data: filtered, emptyMessage: 'No hay obras registradas' })}
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

  function openObraForm(editId = null, onSaved = null) {
    const obra = (editId ? DataService.getById('obras', editId) : null) || {};
    const isEdit = !!editId && !!obra.id;
    const clientes = DataService.getAll('clientes').filter(Boolean);

    Drawer.open({
      title: isEdit ? `Planificar / Editar Obra #${obra.id}` : 'Nueva obra',
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
        // Preserva datos presupuestados originales como items, presupuestoId, importe, archivos
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
        obras = DataService.getAll('obras');
        render();
      }
    });
  }

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

function renderObraDetail(container, actionsEl, obraId) {
  const obra = DataService.getById('obras', obraId);
  if (!obra) { container.innerHTML = renderEmptyState({ title: 'Obra no encontrada' }); return; }

  const cliente = DataService.getById('clientes', obra.clienteId);
  const pres = obra.presupuestoId ? DataService.getById('presupuestos', obra.presupuestoId) : null;
  const total = DataService.getObraTotal(obraId);
  const cobrado = DataService.getObraCobrado(obraId);
  const cobros = DataService.getAll('cobros').filter(c => c.obraId === obraId);
  const stockMovimientosObra = DataService.getAll('stockMovimientos').filter(m => m.obraId === obraId || (m.referencia && m.referencia.includes('#' + obraId)));

  actionsEl.innerHTML = `
    <button class="btn btn-primary" id="btn-obra-edit-top">${Icons.edit} Planificar / Editar obra</button>
    <a href="#/obras" class="btn btn-secondary">${Icons['chevron-left']} Volver</a>
  `;

  container.innerHTML = `
    <!-- Action buttons bar -->
    <div class="card mb-4">
      <div class="card-body" style="display:flex;gap:var(--space-2);flex-wrap:wrap">
        <button class="btn btn-primary" id="btn-obra-edit-action" style="flex:1;min-width:130px;justify-content:center">${Icons.edit} Planificar</button>
        <button class="btn btn-pdf" id="btn-obra-pdf" style="flex:1;min-width:130px;justify-content:center">${Icons['file-pdf']} Ficha PDF</button>
        <button class="btn btn-word" id="btn-obra-word" style="flex:1;min-width:130px;justify-content:center">${Icons['file-word']} Ficha Word</button>
        <button class="btn btn-secondary" id="btn-obra-preview" style="flex:1;min-width:130px;justify-content:center">${Icons.eye} Vista previa</button>
        ${(cliente?.whatsapp || obra.contacto || obra.telefono) ? `<button class="btn btn-secondary" id="btn-obra-whatsapp" style="flex:1;min-width:130px;justify-content:center">${Icons.whatsapp} WhatsApp</button>` : ''}
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h2 style="font-size:var(--text-xl);font-weight:var(--font-bold)">${escapeHtml(obra.descripcion || `Obra #${obra.id}`)}</h2>
            <p class="text-muted">${escapeHtml(obra.direccion || 'Sin dirección registrada')}</p>
          </div>
          ${renderBadge(OBRA_ESTADO_LABELS[obra.estado] || obra.estado, OBRA_ESTADO_COLORS[obra.estado] || 'neutral')}
        </div>
        <div class="detail-list">
          <div class="detail-item">
            <span class="detail-label">Cliente</span>
            <span class="detail-value">${cliente ? `<a href="#/clientes/${cliente.id}">${escapeHtml(cliente.nombre)} ${escapeHtml(cliente.apellido || '')}</a>` : escapeHtml(obra.clienteNombre || '-')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Contacto / Teléfono</span>
            <span class="detail-value">${escapeHtml(obra.contacto || obra.telefono || cliente?.telefono || cliente?.whatsapp || '-')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Dirección</span>
            <span class="detail-value">${escapeHtml(obra.direccion || '-')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Material/es</span>
            <span class="detail-value">${escapeHtml(obra.material || '-')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Fecha inicio</span>
            <span class="detail-value">${formatDate(obra.fechaInicio)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Fecha estimada</span>
            <span class="detail-value">${obra.fechaEstimada ? formatDate(obra.fechaEstimada) : '<span class="text-muted" style="font-style:italic">A definir en planificación</span>'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Responsable</span>
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

    <!-- Ítems / Trabajos presupuestados a fabricar -->
    ${((obra.items && obra.items.length > 0) || (pres && pres.items && pres.items.length > 0)) ? `
    <div class="card mb-4">
      <div class="card-header flex justify-between items-center">
        <h3 class="card-title" style="display:flex;align-items:center;gap:var(--space-2)">
          ${Icons.file} Ítems y Trabajos Presupuestados (${(obra.items || pres.items).length})
        </h3>
      </div>
      <div class="card-body">
        <div class="detail-items-list">
          ${(obra.items || pres.items).map((item, idx) => {
            const u = item.unidadMedida || ((item.largo > 10 || item.ancho > 10) ? 'cm' : 'm');
            const m2Formatted = (item.m2 !== undefined && item.m2 !== null) ? Number(item.m2).toFixed(2).replace('.', ',') : '0,00';
            return `
            <div class="detail-item-card" style="padding:12px 14px;border:1px solid var(--color-stone-200);border-radius:var(--radius-md);margin-bottom:8px;background:var(--color-surface)">
              <div class="detail-item-card-top" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                <span class="detail-item-card-desc"><strong>#${idx + 1}</strong> — ${escapeHtml(item.descripcion || `Ítem ${idx + 1}`)}</span>
                <span class="badge badge-neutral" style="font-weight:var(--font-bold)">${escapeHtml(item.material || obra.material || 'Material s/ diseño')}</span>
              </div>
              <div class="detail-item-card-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(130px, 1fr));gap:8px;font-size:var(--text-sm)">
                <div><span class="text-muted">Cantidad:</span> <strong>${item.cantidad || 1}</strong></div>
                <div><span class="text-muted">Medidas:</span> <strong>${item.largo ? item.largo + ' ' + u : '-'} × ${item.ancho ? item.ancho + ' ' + u : '-'}</strong></div>
                <div><span class="text-muted">Superficie:</span> <strong style="color:var(--color-primary)">${m2Formatted} m²</strong></div>
                ${item.subtotal ? `<div><span class="text-muted">Subtotal:</span> <strong>${formatCurrency(item.subtotal)}</strong></div>` : ''}
              </div>
            </div>
          `;
          }).join('')}
        </div>
      </div>
    </div>` : ''}

    <div class="detail-stats-row mb-4">
      <div class="detail-stat-mini">
        <span class="detail-stat-mini-label">Valor total</span>
        <span class="detail-stat-mini-value">${formatCurrency(total)}</span>
      </div>
      <div class="detail-stat-mini">
        <span class="detail-stat-mini-label">Cobrado</span>
        <span class="detail-stat-mini-value" style="color:var(--color-success)">${formatCurrency(cobrado)}</span>
      </div>
      <div class="detail-stat-mini">
        <span class="detail-stat-mini-label">Pendiente</span>
        <span class="detail-stat-mini-value" style="color:var(--color-warning)">${formatCurrency(total - cobrado)}</span>
      </div>
    </div>

    ${total > 0 ? `
    <div class="card mb-4">
      <div class="card-body">
        <div style="display:flex;justify-content:space-between;margin-bottom:var(--space-2)">
          <span class="text-muted" style="font-size:var(--text-sm)">Avance de cobranza</span>
          <span style="font-weight:var(--font-bold);font-size:var(--text-sm)">${Math.round(cobrado / total * 100)}%</span>
        </div>
        ${renderProgressBar(cobrado, total)}
      </div>
    </div>` : ''}

    <!-- Consumo de Materiales y Stock -->
    <div class="card mb-4">
      <div class="card-header flex justify-between items-center" style="flex-wrap:wrap;gap:var(--space-2)">
        <h3 class="card-title" style="display:flex;align-items:center;gap:var(--space-2)">
          ${Icons.box} Consumo de Stock y Materiales
        </h3>
        ${obra.stockDescontado ? `
          <span class="badge badge-success">${Icons.check} Stock descontado</span>
        ` : `
          <button class="btn btn-sm btn-primary" id="btn-obra-descontar-stock">
            ${Icons.box} Descontar materiales de stock
          </button>
        `}
      </div>
      <div class="card-body">
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
            ${obra.stockDescontado ? 'Stock marcado como descontado para esta obra.' : 'Aún no se registró la salida de stock para esta obra. Podés descontar los materiales presupuestados automáticamente con el botón superior.'}
          </p>
        `}
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-header"><h3 class="card-title">Cobros asociados (${cobros.length})</h3></div>
      ${cobros.length > 0 ? renderDataTable({ columns: [
        { label: 'Fecha', render: c => formatDate(c.fecha) },
        { label: 'Importe', align: 'right', render: c => `<span class="cell-currency">${formatCurrency(c.importe)}</span>` },
        { label: 'Método', render: c => escapeHtml(c.metodoPago) },
        { label: 'Observaciones', render: c => escapeHtml(c.observaciones || '-'), className: 'cell-secondary' }
      ], data: cobros }) : '<div class="card-body text-center text-muted" style="padding:var(--space-6)">No hay cobros registrados</div>'}
    </div>

    ${obra.observaciones ? `
    <div class="card mb-4">
      <div class="card-header"><h3 class="card-title">Observaciones</h3></div>
      <div class="card-body"><p style="color:var(--color-stone-600);white-space:pre-wrap">${escapeHtml(obra.observaciones)}</p></div>
    </div>` : ''}
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

  document.getElementById('btn-obra-descontar-stock')?.addEventListener('click', () => {
    openDescontarStockObraModal({
      obra,
      presupuesto: pres,
      onDone: () => {
        renderObraDetail(container, actionsEl, obraId);
      }
    });
  });

  document.getElementById('btn-obra-word')?.addEventListener('click', () => {
    try {
      exportToWord(getDocHtml(), docFilename);
      Toast.success('Ficha en Word (.doc) descargada');
    } catch (e) {
      console.error(e);
      Toast.error('Error al generar archivo Word');
    }
  });

  const handleEditObra = () => {
    openObraForm(obraId, () => {
      renderObraDetail(container, actionsEl, obraId);
    });
  };
  document.getElementById('btn-obra-edit-top')?.addEventListener('click', handleEditObra);
  document.getElementById('btn-obra-edit-action')?.addEventListener('click', handleEditObra);
}
