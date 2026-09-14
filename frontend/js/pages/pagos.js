/* ========================================
   MARMOLERÍA BENJAMIN — Pagos Page
   ======================================== */

import { DataService } from '../services/mockData.js';
import { formatCurrency, formatDate, escapeHtml, debounce } from '../utils/helpers.js';
import { Icons, renderDataTable, renderSearchInput, renderBadge, renderFileUpload } from '../components/ui.js';
import { Drawer } from '../components/drawer.js';
import { Toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { METODOS_PAGO, PAGO_ESTADO_LABELS, PAGO_ESTADO_COLORS } from '../utils/constants.js';

export function renderPagos(container, actionsEl) {
  actionsEl.innerHTML = `<button class="btn btn-primary" id="btn-new-pago">${Icons.plus} Nuevo pago</button>`;

  let pagos = DataService.getAll('pagos');
  let searchTerm = '', filterEstado = '', filterMetodo = '';

  function render() {
    let filtered = pagos;
    if (filterEstado) filtered = filtered.filter(p => p.estado === filterEstado);
    if (filterMetodo) filtered = filtered.filter(p => p.metodoPago === filterMetodo);
    if (searchTerm) {
      const provs = DataService.getAll('proveedores');
      filtered = filtered.filter(p => {
        const prov = provs.find(pr => pr.id === p.proveedorId);
        return `${prov?.nombre||''} ${p.concepto||''}`.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    const proveedores = DataService.getAll('proveedores');
    const columns = [
      { label: 'Proveedor', render: (p) => { const pr=proveedores.find(x=>x.id===p.proveedorId); return `<span class="cell-primary">${escapeHtml(pr?.nombre||'-')}</span>`; }},
      { label: 'Concepto', render: (p) => `<span class="text-truncate" style="max-width:200px;display:inline-block">${escapeHtml(p.concepto)}</span>` },
      { label: 'Fecha', render: (p) => formatDate(p.fecha), className: 'cell-secondary' },
      { label: 'Método', render: (p) => { const m=METODOS_PAGO.find(x=>x.value===p.metodoPago); return escapeHtml(m?.label||p.metodoPago); }},
      { label: 'Importe', align: 'right', render: (p) => `<span class="cell-currency">${formatCurrency(p.importe)}</span>` },
      { label: 'Estado', render: (p) => renderBadge(PAGO_ESTADO_LABELS[p.estado]||p.estado, PAGO_ESTADO_COLORS[p.estado]||'neutral') },
      { label: '', align: 'right', className: 'cell-actions', render: (p) => `
        <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${p.id}">${Icons.edit}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="delete" data-id="${p.id}">${Icons.trash}</button>
      `}
    ];

    container.innerHTML = `<div class="table-container">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          ${renderSearchInput('Buscar pago...')}
          <select class="filter-select" id="filter-estado"><option value="">Todos los estados</option>${Object.entries(PAGO_ESTADO_LABELS).map(([k,v])=>`<option value="${k}" ${filterEstado===k?'selected':''}>${v}</option>`).join('')}</select>
          <select class="filter-select" id="filter-metodo"><option value="">Todos los métodos</option>${METODOS_PAGO.map(m=>`<option value="${m.value}" ${filterMetodo===m.value?'selected':''}>${m.label}</option>`).join('')}</select>
        </div>
        <div class="table-toolbar-right"><span class="text-muted" style="font-size:var(--text-sm)">${filtered.length} pagos</span></div>
      </div>
      ${renderDataTable({ columns, data: filtered.sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)), emptyMessage: 'No hay pagos registrados' })}
    </div>`;

    const si=container.querySelector('#search-input');
    if(si){si.value=searchTerm;si.addEventListener('input',debounce(e=>{searchTerm=e.target.value;render();},300));}
    container.querySelector('#filter-estado')?.addEventListener('change',e=>{filterEstado=e.target.value;render();});
    container.querySelector('#filter-metodo')?.addEventListener('change',e=>{filterMetodo=e.target.value;render();});
    container.addEventListener('click',e=>{
      const btn=e.target.closest('[data-action]');if(!btn)return;
      if(btn.dataset.action==='edit')openForm(btn.dataset.id);
      if(btn.dataset.action==='delete')handleDelete(btn.dataset.id);
    });
  }

  function openForm(editId=null){
    const pago=editId?DataService.getById('pagos',editId):{};const isEdit=!!editId;
    const proveedores=DataService.getAll('proveedores');
    const facturasDisp=DataService.getAll('facturas').filter(f=>f.tipo==='factura'&&(f.estado==='pendiente'||f.estado==='parcial'));

    Drawer.open({title:isEdit?'Editar pago':'Nuevo pago',
      content:`<form id="pago-form">
        <div class="form-group"><label class="form-label">Proveedor <span class="required">*</span></label><select class="form-select" name="proveedorId"><option value="">Seleccionar...</option>${proveedores.map(p=>`<option value="${p.id}" ${pago.proveedorId===p.id?'selected':''}>${p.nombre}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Factura asociada</label><select class="form-select" name="facturaId"><option value="">Sin asociar</option>${facturasDisp.map(f=>{const prov=proveedores.find(p=>p.id===f.proveedorId);return`<option value="${f.id}" ${pago.facturaId===f.id?'selected':''}>${f.numero} - ${prov?.nombre||''} (${formatCurrency(f.importe)})</option>`;}).join('')}</select></div>
        <div class="form-group"><label class="form-label">Concepto <span class="required">*</span></label><input type="text" class="form-input" name="concepto" value="${escapeHtml(pago.concepto||'')}"></div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Importe <span class="required">*</span></label><input type="number" class="form-input" name="importe" value="${pago.importe||''}" min="0" step="0.01"></div>
          <div class="form-group"><label class="form-label">Fecha</label><input type="date" class="form-input" name="fecha" value="${pago.fecha||new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Método de pago</label><select class="form-select" name="metodoPago">${METODOS_PAGO.map(m=>`<option value="${m.value}" ${pago.metodoPago===m.value?'selected':''}>${m.label}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Estado</label><select class="form-select" name="estado">${Object.entries(PAGO_ESTADO_LABELS).map(([k,v])=>`<option value="${k}" ${(pago.estado||'pagado')===k?'selected':''}>${v}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label class="form-label">Observaciones</label><textarea class="form-textarea" name="observaciones" rows="2">${escapeHtml(pago.observaciones||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Comprobante</label>${renderFileUpload('pago-file')}</div>
      </form>`,
      footer:`<button class="btn btn-secondary" id="drawer-cancel">Cancelar</button><button class="btn btn-primary" id="drawer-save">${isEdit?'Guardar':'Registrar pago'}</button>`
    });

    const zone=document.getElementById('pago-file-zone');const fileInput=document.getElementById('pago-file');
    if(zone&&fileInput){zone.addEventListener('click',()=>fileInput.click());}

    document.getElementById('drawer-cancel').addEventListener('click',()=>Drawer.close());
    document.getElementById('drawer-save').addEventListener('click',()=>{
      const data=Object.fromEntries(new FormData(document.getElementById('pago-form')));
      if(!data.proveedorId||!data.concepto||!data.importe){Toast.warning('Completá los campos obligatorios');return;}
      data.importe=parseFloat(data.importe);data.comprobanteKey=null;
      if(isEdit){DataService.update('pagos',editId,data);Toast.success('Pago actualizado');}
      else{DataService.create('pagos',data);Toast.success('Pago registrado');}
      Drawer.close();pagos=DataService.getAll('pagos');render();
    });
  }

  async function handleDelete(id){
    const confirmed=await confirmDialog({title:'Eliminar pago',message:'¿Estás seguro?',confirmText:'Eliminar',type:'danger'});
    if(confirmed){DataService.remove('pagos',id);Toast.success('Pago eliminado');pagos=DataService.getAll('pagos');render();}
  }

  setTimeout(()=>{document.getElementById('btn-new-pago')?.addEventListener('click',()=>openForm());},100);
  render();
}
