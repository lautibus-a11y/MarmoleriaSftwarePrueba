/* ========================================
   MARMOLERÍA BENJAMIN — Proveedores Page
   ======================================== */

import { DataService } from '../services/mockData.js';
import { formatCurrency, formatDate, escapeHtml, debounce, searchFilter, compareNewestFirst } from '../utils/helpers.js';
import { Icons, renderDataTable, renderSearchInput, renderBadge, renderEmptyState } from '../components/ui.js';
import { Drawer } from '../components/drawer.js';
import { Toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { FACTURA_TIPO_LABELS } from '../utils/constants.js';

export function renderProveedores(container, actionsEl, path = '/proveedores') {
  const parts = path.split('/');
  if (parts.length > 2 && parts[2]) { renderProveedorDetail(container, actionsEl, parts[2]); return; }

  actionsEl.innerHTML = `<button class="btn btn-primary" id="btn-new-prov">${Icons.plus} Nuevo proveedor</button>`;

  let proveedores = DataService.getAll('proveedores');
  let searchTerm = '';

  function render() {
    const filtered = searchFilter(proveedores, searchTerm, ['nombre', 'razonSocial', 'cuit']);
    const columns = [
      { label: 'Nombre', render: (p) => `<span class="cell-primary">${escapeHtml(p.nombre)}</span><br><span class="cell-secondary" style="font-size:var(--text-xs)">${escapeHtml(p.razonSocial||'')}</span>` },
      { label: 'CUIT', render: (p) => `<span class="cell-mono cell-secondary">${escapeHtml(p.cuit||'-')}</span>` },
      { label: 'Teléfono', render: (p) => escapeHtml(p.telefono||'-') },
      { label: 'Contacto', render: (p) => escapeHtml(p.contacto||'-'), className: 'cell-secondary' },
      { label: 'Saldo', align: 'right', render: (p) => {
        const s = DataService.getProveedorSaldo(p.id);
        return `<span class="cell-currency" style="color:${s.saldo>0?'var(--color-error)':'var(--color-success)'}">${formatCurrency(s.saldo)}</span>`;
      }},
      { label: '', align: 'right', className: 'cell-actions', render: (p) => `
        <button class="btn btn-ghost btn-icon btn-sm" data-action="view" data-id="${p.id}">${Icons.eye}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${p.id}">${Icons.edit}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="delete" data-id="${p.id}">${Icons.trash}</button>
      `}
    ];

    container.innerHTML = `<div class="table-container">
      <div class="table-toolbar"><div class="table-toolbar-left">${renderSearchInput('Buscar proveedor...')}</div>
      <div class="table-toolbar-right"><span class="text-muted" style="font-size:var(--text-sm)">${filtered.length} proveedores</span></div></div>
      ${renderDataTable({ columns, data: filtered.sort(compareNewestFirst), emptyMessage: 'No hay proveedores' })}
    </div>`;

    const si = container.querySelector('#search-input');
    if (si) { si.value = searchTerm; si.oninput = debounce(e => { searchTerm = e.target.value; render(); }, 300); }
  }

  container.onclick = e => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      e.stopPropagation();
      const { action, id } = btn.dataset;
      if (action === 'view') { window.location.hash = `#/proveedores/${id}`; return; }
      if (action === 'edit') { openForm(id); return; }
      if (action === 'delete') { handleDelete(id); return; }
      return;
    }
    const r = e.target.closest('.data-table tbody tr');
    if (r && r.dataset.id && !e.target.closest('a, button')) {
      window.location.hash = `#/proveedores/${r.dataset.id}`;
    }
  };

  const openForm = (id) => openProveedorForm(id, () => {
    proveedores = DataService.getAll('proveedores');
    render();
  });

  async function handleDelete(id){
    const confirmed=await confirmDialog({title:'Eliminar proveedor',message:'¿Estás seguro?',confirmText:'Eliminar',type:'danger'});
    if(confirmed){DataService.remove('proveedores',id);Toast.success('Proveedor eliminado');proveedores=DataService.getAll('proveedores');render();}
  }

  actionsEl.querySelector('#btn-new-prov')?.addEventListener('click', () => openForm());
  render();
}

export function openProveedorForm(editId=null, onDone=null){
  const prov = (editId ? DataService.getById('proveedores', editId) : null) || {};
  const isEdit = !!editId;
  Drawer.open({title:isEdit?'Editar proveedor':'Nuevo proveedor',
    content:`<form id="prov-form">
      <div class="form-row-2"><div class="form-group"><label class="form-label">Nombre <span class="required">*</span></label><input type="text" class="form-input" name="nombre" value="${escapeHtml(prov.nombre||'')}" required></div>
      <div class="form-group"><label class="form-label">Razón Social</label><input type="text" class="form-input" name="razonSocial" value="${escapeHtml(prov.razonSocial||'')}"></div></div>
      <div class="form-group"><label class="form-label">CUIT</label><input type="text" class="form-input" name="cuit" value="${escapeHtml(prov.cuit||'')}" placeholder="XX-XXXXXXXX-X"></div>
      <div class="form-row-2"><div class="form-group"><label class="form-label">Teléfono</label><input type="tel" class="form-input" name="telefono" value="${escapeHtml(prov.telefono||'')}"></div>
      <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" name="email" value="${escapeHtml(prov.email||'')}"></div></div>
      <div class="form-group"><label class="form-label">Dirección</label><input type="text" class="form-input" name="direccion" value="${escapeHtml(prov.direccion||'')}"></div>
      <div class="form-group"><label class="form-label">Contacto</label><input type="text" class="form-input" name="contacto" value="${escapeHtml(prov.contacto||'')}"></div>
      <div class="form-group"><label class="form-label">Observaciones</label><textarea class="form-textarea" name="observaciones" rows="3">${escapeHtml(prov.observaciones||'')}</textarea></div>
    </form>`,
    footer:`<button class="btn btn-secondary" id="drawer-cancel">Cancelar</button><button class="btn btn-primary" id="drawer-save">${isEdit?'Guardar':'Crear'}</button>`
  });
  document.getElementById('drawer-cancel').addEventListener('click',()=>Drawer.close());
  document.getElementById('drawer-save').addEventListener('click',()=>{
    const data=Object.fromEntries(new FormData(document.getElementById('prov-form')));
    if(!data.nombre?.trim()){Toast.warning('El nombre es obligatorio');return;}
    if(isEdit){DataService.update('proveedores',editId,data);Toast.success('Proveedor actualizado');}
    else{DataService.create('proveedores',data);Toast.success('Proveedor creado');}
    Drawer.close();
    if (onDone) onDone();
  });
}

function renderProveedorDetail(container, actionsEl, provId) {
  const prov = DataService.getById('proveedores', provId);
  if (!prov) { container.innerHTML = renderEmptyState({ title: 'Proveedor no encontrado' }); return; }

  const saldo = DataService.getProveedorSaldo(provId);
  const facturas = DataService.getAll('facturas').filter(f => String(f.proveedorId) === String(provId));
  const pagos = DataService.getAll('pagos').filter(p => String(p.proveedorId) === String(provId));

  actionsEl.innerHTML = `<a href="#/proveedores" class="btn btn-secondary">${Icons['chevron-left']} Volver</a>`;

  container.innerHTML = `
    <div class="detail-header">
      <div class="detail-avatar">${(prov.nombre||'P')[0].toUpperCase()}</div>
      <div class="detail-header-info">
        <h2 class="detail-header-name">${escapeHtml(prov.nombre)}</h2>
        <div class="detail-header-meta">
          ${prov.razonSocial?`<span class="detail-header-meta-item">${escapeHtml(prov.razonSocial)}</span>`:''}
          ${prov.telefono?`<span class="detail-header-meta-item">${Icons.phone} ${escapeHtml(prov.telefono)}</span>`:''}
          ${prov.email?`<span class="detail-header-meta-item">${Icons.mail} ${escapeHtml(prov.email)}</span>`:''}
        </div>
      </div>
    </div>

    <div class="cuenta-corriente-summary">
      <div class="cc-summary-item"><div class="cc-summary-label">Total facturado</div><div class="cc-summary-value">${formatCurrency(saldo.totalFacturas)}</div></div>
      <div class="cc-summary-item"><div class="cc-summary-label">Notas débito</div><div class="cc-summary-value">${formatCurrency(saldo.totalND)}</div></div>
      <div class="cc-summary-item"><div class="cc-summary-label">Notas crédito</div><div class="cc-summary-value positive">${formatCurrency(saldo.totalNC)}</div></div>
      <div class="cc-summary-item">
        <div class="cc-summary-label">${saldo.saldo > 0 ? 'Saldo pendiente' : (saldo.saldo < 0 ? 'Saldo a favor' : 'Estado de cuenta')}</div>
        <div class="cc-summary-value ${saldo.saldo > 0 ? 'negative' : 'positive'}">
          ${saldo.saldo > 0 ? formatCurrency(saldo.saldo) : (saldo.saldo < 0 ? `+${formatCurrency(Math.abs(saldo.saldo))} (a favor)` : 'Al día ($0)')}
        </div>
      </div>
    </div>

    <div class="tabs-container">
      <div class="tabs-header">
        <button class="tab-btn active" data-tab="facturas">Facturas / Notas (${facturas.length})</button>
        <button class="tab-btn" data-tab="pagos">Pagos (${pagos.length})</button>
        <button class="tab-btn" data-tab="datos">Datos</button>
      </div>
      <div class="tab-content active" id="tab-facturas">
        ${facturas.length>0?renderDataTable({columns:[
          {label:'Tipo',render:f=>renderBadge(FACTURA_TIPO_LABELS[f.tipo]||f.tipo,f.tipo==='nota_credito'?'success':f.tipo==='nota_debito'?'warning':'neutral')},
          {label:'Número',render:f=>`<span class="cell-mono">${escapeHtml(f.numero)}</span>`},
          {label:'Fecha',render:f=>formatDate(f.fecha)},
          {label:'Vencimiento',render:f=>formatDate(f.vencimiento)},
          {label:'Importe',align:'right',render:f=>`<span class="cell-currency">${formatCurrency(f.importe)}</span>`},
          {label:'Estado',render:f=>renderBadge(f.estado,{pendiente:'warning',pagada:'success',vencida:'error',parcial:'info'}[f.estado])}
        ],data:facturas.sort(compareNewestFirst)}):'<p class="text-muted" style="padding:var(--space-6)">No hay facturas</p>'}
      </div>
      <div class="tab-content" id="tab-pagos">
        ${pagos.length>0?renderDataTable({columns:[
          {label:'Fecha',render:p=>formatDate(p.fecha)},
          {label:'Concepto',render:p=>escapeHtml(p.concepto)},
          {label:'Importe',align:'right',render:p=>`<span class="cell-currency">${formatCurrency(p.importe)}</span>`},
          {label:'Método',render:p=>escapeHtml(p.metodoPago)},
          {label:'Estado',render:p=>renderBadge(p.estado,{pendiente:'warning',pagado:'success',vencido:'error'}[p.estado])}
        ],data:pagos.sort(compareNewestFirst)}):'<p class="text-muted" style="padding:var(--space-6)">No hay pagos</p>'}
      </div>
      <div class="tab-content" id="tab-datos">
        <div class="card"><div class="card-body"><div class="detail-list">
          <span class="detail-label">Nombre</span><span class="detail-value">${escapeHtml(prov.nombre)}</span>
          <span class="detail-label">Razón Social</span><span class="detail-value">${escapeHtml(prov.razonSocial||'-')}</span>
          <span class="detail-label">CUIT</span><span class="detail-value">${escapeHtml(prov.cuit||'-')}</span>
          <span class="detail-label">Teléfono</span><span class="detail-value">${escapeHtml(prov.telefono||'-')}</span>
          <span class="detail-label">Email</span><span class="detail-value">${escapeHtml(prov.email||'-')}</span>
          <span class="detail-label">Dirección</span><span class="detail-value">${escapeHtml(prov.direccion||'-')}</span>
          <span class="detail-label">Contacto</span><span class="detail-value">${escapeHtml(prov.contacto||'-')}</span>
          <span class="detail-label">Observaciones</span><span class="detail-value">${escapeHtml(prov.observaciones||'-')}</span>
        </div></div></div>
      </div>
    </div>
  `;

  container.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      container.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
      container.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`#tab-${btn.dataset.tab}`).classList.add('active');
    });
  });
}
