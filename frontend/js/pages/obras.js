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

  let obras = DataService.getAll('obras');
  let searchTerm = '', filterEstado = '';

  function render() {
    let filtered = obras;
    if (filterEstado) filtered = filtered.filter(o => o.estado === filterEstado);
    if (searchTerm) filtered = searchFilter(filtered, searchTerm, ['direccion', 'descripcion', 'material']);

    const clientes = DataService.getAll('clientes');
    const columns = [
      { label: 'Cliente', render: (o) => { const c = clientes.find(c => c.id === o.clienteId); return c ? `<span class="cell-primary">${escapeHtml(c.nombre)} ${escapeHtml(c.apellido || '')}</span>` : '-'; }},
      { label: 'Dirección', render: (o) => `<span class="text-truncate" style="max-width:180px;display:inline-block">${escapeHtml(o.direccion)}</span>` },
      { label: 'Material', render: (o) => escapeHtml(o.material || '-'), className: 'cell-secondary' },
      { label: 'Estado', render: (o) => renderBadge(OBRA_ESTADO_LABELS[o.estado] || o.estado, OBRA_ESTADO_COLORS[o.estado] || 'neutral') },
      { label: 'Progreso', render: (o) => { const total = DataService.getObraTotal(o.id); const cobrado = DataService.getObraCobrado(o.id); return total > 0 ? `<div style="min-width:80px">${renderProgressBar(cobrado, total)}<span style="font-size:var(--text-xs);color:var(--color-stone-500)">${Math.round(cobrado/total*100)}%</span></div>` : '-'; }},
      { label: 'Saldo', align: 'right', render: (o) => { const t = DataService.getObraTotal(o.id); const c = DataService.getObraCobrado(o.id); return `<span class="cell-currency">${formatCurrency(t - c)}</span>`; }},
      { label: '', align: 'right', className: 'cell-actions', render: (o) => `
        <button class="btn btn-ghost btn-icon btn-sm" data-action="view" data-id="${o.id}" title="Ver">${Icons.eye}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="export" data-id="${o.id}" title="Exportar Ficha / Orden">${Icons.download}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${o.id}" title="Editar">${Icons.edit}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="delete" data-id="${o.id}" title="Eliminar">${Icons.trash}</button>
      `}
    ];

    container.innerHTML = `
      <div class="table-container">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            ${renderSearchInput('Buscar obra...')}
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
    if (si) { si.value = searchTerm; si.addEventListener('input', debounce(e => { searchTerm = e.target.value; render(); }, 300)); }
    container.querySelector('#filter-estado')?.addEventListener('change', e => { filterEstado = e.target.value; render(); });
    container.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]'); if (!btn) return;
      const {action, id} = btn.dataset;
      if (action==='view') window.location.hash=`#/obras/${id}`;
      if (action==='export') {
        const o = DataService.getById('obras', id);
        if (!o) return;
        const cli = o.clienteId ? DataService.getById('clientes', o.clienteId) : null;
        const pr = o.presupuestoId ? DataService.getById('presupuestos', o.presupuestoId) : null;
        const cobs = DataService.getAll('cobros').filter(c => c.obraId === id);
        DocumentModal.open({
          title: `Ficha Técnica — Obra #${o.id}`,
          filename: `Ficha_Obra_${o.id}`,
          htmlContent: generateObraHtml(o, cli, pr, cobs)
        });
      }
      if (action==='edit') openObraForm(id);
      if (action==='delete') handleDelete(id);
    });
    container.querySelectorAll('.data-table tbody tr').forEach(r => r.addEventListener('click', e => { if (!e.target.closest('[data-action]') && r.dataset.id) window.location.hash=`#/obras/${r.dataset.id}`; }));
  }

  function openObraForm(editId = null) {
    const obra = (editId ? DataService.getById('obras', editId) : null) || {};
    const isEdit = !!editId && !!obra.id;
    const clientes = DataService.getAll('clientes').filter(Boolean);

    Drawer.open({
      title: isEdit ? 'Editar obra' : 'Nueva obra', size: 'lg',
      content: `<form id="obra-form">
        <div class="form-group"><label class="form-label">Cliente <span class="required">*</span></label><select class="form-select" name="clienteId"><option value="">Seleccionar...</option>${clientes.map(c=>`<option value="${c.id}" ${obra.clienteId===c.id?'selected':''}>${c.nombre} ${c.apellido||''}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Dirección</label><input type="text" class="form-input" name="direccion" value="${escapeHtml(obra.direccion||'')}"></div>
        <div class="form-group"><label class="form-label">Descripción</label><input type="text" class="form-input" name="descripcion" value="${escapeHtml(obra.descripcion||'')}"></div>
        <div class="form-group"><label class="form-label">Material</label><input type="text" class="form-input" name="material" value="${escapeHtml(obra.material||'')}"></div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Fecha inicio</label><input type="date" class="form-input" name="fechaInicio" value="${obra.fechaInicio||''}"></div>
          <div class="form-group"><label class="form-label">Fecha estimada</label><input type="date" class="form-input" name="fechaEstimada" value="${obra.fechaEstimada||''}"></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Responsable</label><input type="text" class="form-input" name="responsable" value="${escapeHtml(obra.responsable||'')}"></div>
          <div class="form-group"><label class="form-label">Estado</label><select class="form-select" name="estado">${Object.entries(OBRA_ESTADO_LABELS).map(([k,v])=>`<option value="${k}" ${obra.estado===k?'selected':''}>${v}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label class="form-label">Observaciones</label><textarea class="form-textarea" name="observaciones" rows="3">${escapeHtml(obra.observaciones||'')}</textarea></div>
      </form>`,
      footer: `<button class="btn btn-secondary" id="drawer-cancel">Cancelar</button><button class="btn btn-primary" id="drawer-save">${isEdit?'Guardar':'Crear obra'}</button>`
    });

    document.getElementById('drawer-cancel').addEventListener('click',()=>Drawer.close());
    document.getElementById('drawer-save').addEventListener('click',()=>{
      const fd = new FormData(document.getElementById('obra-form'));
      const data = Object.fromEntries(fd);
      if(!data.clienteId){Toast.warning('Seleccioná un cliente');return;}
      if(isEdit){DataService.update('obras',editId,data);Toast.success('Obra actualizada');}
      else{data.archivos=[];DataService.create('obras',data);Toast.success('Obra creada');}
      Drawer.close();obras=DataService.getAll('obras');render();
    });
  }

  async function handleDelete(id){
    const confirmed=await confirmDialog({title:'Eliminar obra',message:'¿Estás seguro?',confirmText:'Eliminar',type:'danger'});
    if(confirmed){DataService.remove('obras',id);Toast.success('Obra eliminada');obras=DataService.getAll('obras');render();}
  }

  setTimeout(()=>{document.getElementById('btn-new-obra')?.addEventListener('click',()=>openObraForm());},100);
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
    <a href="#/obras" class="btn btn-secondary">${Icons['chevron-left']} Volver</a>
  `;

  container.innerHTML = `
    <!-- Action buttons bar -->
    <div class="card mb-4">
      <div class="card-body" style="display:flex;gap:var(--space-2);flex-wrap:wrap">
        <button class="btn btn-pdf" id="btn-obra-pdf" style="flex:1;min-width:130px;justify-content:center">${Icons['file-pdf']} Ficha PDF</button>
        <button class="btn btn-word" id="btn-obra-word" style="flex:1;min-width:130px;justify-content:center">${Icons['file-word']} Ficha Word</button>
        <button class="btn btn-secondary" id="btn-obra-preview" style="flex:1;min-width:130px;justify-content:center">${Icons.eye} Vista previa</button>
        ${cliente?.whatsapp ? `<button class="btn btn-secondary" id="btn-obra-whatsapp" style="flex:1;min-width:130px;justify-content:center">${Icons.whatsapp} WhatsApp</button>` : ''}
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h2 style="font-size:var(--text-xl);font-weight:var(--font-bold)">${escapeHtml(obra.descripcion)}</h2>
            <p class="text-muted">${escapeHtml(obra.direccion)}</p>
          </div>
          ${renderBadge(OBRA_ESTADO_LABELS[obra.estado], OBRA_ESTADO_COLORS[obra.estado])}
        </div>
        <div class="detail-list">
          <div class="detail-item">
            <span class="detail-label">Cliente</span>
            <span class="detail-value">${cliente ? `<a href="#/clientes/${cliente.id}">${escapeHtml(cliente.nombre)} ${escapeHtml(cliente.apellido || '')}</a>` : '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Material</span>
            <span class="detail-value">${escapeHtml(obra.material || '-')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Fecha inicio</span>
            <span class="detail-value">${formatDate(obra.fechaInicio)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Fecha estimada</span>
            <span class="detail-value">${formatDate(obra.fechaEstimada)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Responsable</span>
            <span class="detail-value">${escapeHtml(obra.responsable || '-')}</span>
          </div>
          ${pres ? `
          <div class="detail-item">
            <span class="detail-label">Presupuesto</span>
            <span class="detail-value"><a href="#/presupuestos/${pres.id}">${pres.numero}</a></span>
          </div>` : ''}
        </div>
      </div>
    </div>

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
}
