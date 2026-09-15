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
        const combined = `${p.destinatarioConcepto || ''} ${p.concepto || ''} ${prov?.nombre || ''}`.toLowerCase();
        return combined.includes(searchTerm.toLowerCase());
      });
    }

    const proveedores = DataService.getAll('proveedores');
    const columns = [
      {
        label: 'Destinatario / Concepto',
        render: (p) => {
          const pr = proveedores.find(x => x.id === p.proveedorId);
          const text = p.destinatarioConcepto || p.concepto || pr?.nombre || '-';
          return `<span class="cell-primary">${escapeHtml(text)}</span>`;
        }
      },
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
          ${renderSearchInput('Buscar por destinatario o concepto...')}
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

    const existingDest = pago.destinatarioConcepto || pago.concepto || (proveedores.find(p=>p.id===pago.proveedorId)?.nombre || '');

    Drawer.open({title:isEdit?'Editar pago':'Nuevo pago',
      content:`<form id="pago-form">
        <div class="form-group">
          <label class="form-label">Destinatario / Concepto <span class="required">*</span></label>
          <input type="text" class="form-input" name="destinatarioConcepto" id="pago-destinatario-concepto" list="destinatarios-sugeridos" value="${escapeHtml(existingDest)}" placeholder="Ej: Cantera San Luis, Flete, Servicios, Sueldos..." required>
          <datalist id="destinatarios-sugeridos">
            ${proveedores.map(p => `<option value="${escapeHtml(p.nombre)}">${escapeHtml(p.razonSocial || p.nombre)}</option>`).join('')}
          </datalist>
          <span class="text-muted" style="font-size:11px;display:block;margin-top:4px">Podés escribir cualquier destinatario/concepto o seleccionar un proveedor habitual.</span>
        </div>
        <div class="form-group"><label class="form-label">Factura asociada (opcional)</label><select class="form-select" name="facturaId"><option value="">Sin asociar</option>${facturasDisp.map(f=>{const prov=proveedores.find(p=>p.id===f.proveedorId);return`<option value="${f.id}" ${pago.facturaId===f.id?'selected':''}>${f.numero} - ${prov?.nombre||''} (${formatCurrency(f.importe)})</option>`;}).join('')}</select></div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Importe <span class="required">*</span></label><input type="number" class="form-input" name="importe" value="${pago.importe||''}" min="0" step="0.01" required></div>
          <div class="form-group"><label class="form-label">Fecha</label><input type="date" class="form-input" name="fecha" value="${pago.fecha||new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Método de pago</label><select class="form-select" name="metodoPago">${METODOS_PAGO.map(m=>`<option value="${m.value}" ${(pago.metodoPago||'transferencia')===m.value?'selected':''}>${m.label}</option>`).join('')}</select></div>
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
      const dest = (data.destinatarioConcepto || '').trim();
      if(!dest || !data.importe){Toast.warning('Completá el destinatario/concepto y el importe');return;}
      data.destinatarioConcepto = dest;
      data.concepto = dest;
      const matched = proveedores.find(p => p.nombre.toLowerCase() === dest.toLowerCase());
      data.proveedorId = matched ? matched.id : (pago.proveedorId || null);
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
