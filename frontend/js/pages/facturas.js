/* ========================================
   MARMOLERÍA BENJAMIN — Facturas Page
   ======================================== */

import { DataService } from '../services/mockData.js';
import { formatCurrency, formatDate, escapeHtml, debounce } from '../utils/helpers.js';
import { Icons, renderDataTable, renderSearchInput, renderBadge, renderFileUpload } from '../components/ui.js';
import { Drawer } from '../components/drawer.js';
import { Toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { DocumentModal } from '../components/documentModal.js';
import { generateFacturaHtml } from '../services/documentExporter.js';
import { FACTURA_TIPO_LABELS, FACTURA_ESTADOS, FACTURA_ESTADO_LABELS, FACTURA_ESTADO_COLORS, FACTURA_CATEGORIAS, MONEDAS } from '../utils/constants.js';

export function renderFacturas(container, actionsEl) {
  actionsEl.innerHTML = `
    <button class="btn btn-secondary" id="btn-new-nc">${Icons.plus} Nota Crédito</button>
    <button class="btn btn-secondary" id="btn-new-nd">${Icons.plus} Nota Débito</button>
    <button class="btn btn-primary" id="btn-new-fac">${Icons.plus} Nueva factura</button>
  `;

  let facturas = DataService.getAll('facturas');
  let searchTerm = '', filterEstado = '', filterTipo = '';

  function render() {
    let filtered = facturas;
    if (filterEstado) filtered = filtered.filter(f => f.estado === filterEstado);
    if (filterTipo) filtered = filtered.filter(f => f.tipo === filterTipo);
    if (searchTerm) {
      const provs = DataService.getAll('proveedores');
      filtered = filtered.filter(f => {
        const prov = provs.find(p => p.id === f.proveedorId);
        return `${f.numero} ${prov?.nombre||''} ${f.observaciones||''}`.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    const proveedores = DataService.getAll('proveedores');
    const columns = [
      { label: 'Tipo', render: (f) => renderBadge(FACTURA_TIPO_LABELS[f.tipo], f.tipo==='nota_credito'?'success':f.tipo==='nota_debito'?'warning':'neutral') },
      { label: 'Número', render: (f) => `<span class="cell-mono">${escapeHtml(f.numero)}</span>` },
      { label: 'Proveedor', render: (f) => { const p = proveedores.find(p=>p.id===f.proveedorId); return escapeHtml(p?.nombre||'-'); }},
      { label: 'Fecha', render: (f) => formatDate(f.fecha), className: 'cell-secondary' },
      { label: 'Vencimiento', render: (f) => {
        if (!f.vencimiento) return '-';
        const isVencido = new Date(f.vencimiento) < new Date() && f.estado === 'pendiente';
        return `<span style="color:${isVencido?'var(--color-error)':''}">${formatDate(f.vencimiento)}</span>`;
      }},
      { label: 'Importe', align: 'right', render: (f) => `<span class="cell-currency">${formatCurrency(f.importe)}</span>` },
      { label: 'Estado', render: (f) => renderBadge(FACTURA_ESTADO_LABELS[f.estado]||f.estado, FACTURA_ESTADO_COLORS[f.estado]||'neutral') },
      { label: '', align: 'right', className: 'cell-actions', render: (f) => `
        <button class="btn btn-ghost btn-icon btn-sm" data-action="export" data-id="${f.id}" title="Comprobante PDF / Word">${Icons.download}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${f.id}">${Icons.edit}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="delete" data-id="${f.id}">${Icons.trash}</button>
      `}
    ];

    container.innerHTML = `<div class="table-container">
      <div class="table-toolbar">
        <div class="table-toolbar-left">
          ${renderSearchInput('Buscar factura...')}
          <select class="filter-select" id="filter-tipo"><option value="">Todos los tipos</option>${Object.entries(FACTURA_TIPO_LABELS).map(([k,v])=>`<option value="${k}" ${filterTipo===k?'selected':''}>${v}</option>`).join('')}</select>
          <select class="filter-select" id="filter-estado"><option value="">Todos los estados</option>${Object.entries(FACTURA_ESTADO_LABELS).map(([k,v])=>`<option value="${k}" ${filterEstado===k?'selected':''}>${v}</option>`).join('')}</select>
        </div>
        <div class="table-toolbar-right"><span class="text-muted" style="font-size:var(--text-sm)">${filtered.length} registros</span></div>
      </div>
      ${renderDataTable({ columns, data: filtered.sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)), emptyMessage: 'No hay facturas registradas' })}
    </div>`;

    const si=container.querySelector('#search-input');
    if(si){si.value=searchTerm;si.addEventListener('input',debounce(e=>{searchTerm=e.target.value;render();},300));}
    container.querySelector('#filter-tipo')?.addEventListener('change',e=>{filterTipo=e.target.value;render();});
    container.querySelector('#filter-estado')?.addEventListener('change',e=>{filterEstado=e.target.value;render();});
    container.addEventListener('click',e=>{
      const btn=e.target.closest('[data-action]');if(!btn)return;
      if(btn.dataset.action==='export') {
        const f = DataService.getById('facturas', btn.dataset.id);
        const prov = DataService.getById('proveedores', f.proveedorId);
        DocumentModal.open({
          title: `Comprobante ${f.numero || f.id}`,
          filename: `Comprobante_${f.numero || f.id}`,
          htmlContent: generateFacturaHtml(f, prov)
        });
      }
      if(btn.dataset.action==='edit')openForm(btn.dataset.id);
      if(btn.dataset.action==='delete')handleDelete(btn.dataset.id);
    });
  }

  function openForm(editId=null, defaultTipo='factura'){
    const fac=editId?DataService.getById('facturas',editId):{tipo:defaultTipo};
    const isEdit=!!editId;
    const proveedores=DataService.getAll('proveedores');

    Drawer.open({title:isEdit?`Editar ${FACTURA_TIPO_LABELS[fac.tipo]||'factura'}`:`Nueva ${FACTURA_TIPO_LABELS[defaultTipo]||'factura'}`,size:'lg',
      content:`<form id="fac-form">
        <div class="form-group"><label class="form-label">Proveedor <span class="required">*</span></label><select class="form-select" name="proveedorId"><option value="">Seleccionar...</option>${proveedores.map(p=>`<option value="${p.id}" ${fac.proveedorId===p.id?'selected':''}>${p.nombre}</option>`).join('')}</select></div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Tipo</label><select class="form-select" name="tipo">${Object.entries(FACTURA_TIPO_LABELS).map(([k,v])=>`<option value="${k}" ${(fac.tipo||defaultTipo)===k?'selected':''}>${v}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Número <span class="required">*</span></label><input type="text" class="form-input" name="numero" value="${escapeHtml(fac.numero||'')}" placeholder="A-0001-00000001"></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Fecha</label><input type="date" class="form-input" name="fecha" value="${fac.fecha||new Date().toISOString().split('T')[0]}"></div>
          <div class="form-group"><label class="form-label">Vencimiento</label><input type="date" class="form-input" name="vencimiento" value="${fac.vencimiento||''}"></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Importe <span class="required">*</span></label><input type="number" class="form-input" name="importe" value="${fac.importe||''}" min="0" step="0.01"></div>
          <div class="form-group"><label class="form-label">Moneda</label><select class="form-select" name="moneda">${MONEDAS.map(m=>`<option value="${m.value}" ${fac.moneda===m.value?'selected':''}>${m.label}</option>`).join('')}</select></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Categoría</label><select class="form-select" name="categoria"><option value="">-</option>${FACTURA_CATEGORIAS.map(c=>`<option value="${c.value}" ${fac.categoria===c.value?'selected':''}>${c.label}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Estado</label><select class="form-select" name="estado">${Object.entries(FACTURA_ESTADO_LABELS).map(([k,v])=>`<option value="${k}" ${(fac.estado||'pendiente')===k?'selected':''}>${v}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label class="form-label">Observaciones</label><textarea class="form-textarea" name="observaciones" rows="2">${escapeHtml(fac.observaciones||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Archivo adjunto</label>${renderFileUpload('fac-file')}</div>
      </form>`,
      footer:`<button class="btn btn-secondary" id="drawer-cancel">Cancelar</button><button class="btn btn-primary" id="drawer-save">${isEdit?'Guardar':'Crear'}</button>`
    });

    // File upload zone interactions
    const zone=document.getElementById('fac-file-zone');
    const fileInput=document.getElementById('fac-file');
    if(zone&&fileInput){
      zone.addEventListener('click',()=>fileInput.click());
      zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('dragover');});
      zone.addEventListener('dragleave',()=>zone.classList.remove('dragover'));
      zone.addEventListener('drop',e=>{e.preventDefault();zone.classList.remove('dragover');if(e.dataTransfer.files[0])showPreview(e.dataTransfer.files[0]);});
      fileInput.addEventListener('change',()=>{if(fileInput.files[0])showPreview(fileInput.files[0]);});
    }

    function showPreview(file){
      const prev=document.getElementById('fac-file-preview');
      if(prev){prev.style.display='block';prev.innerHTML=`<div class="file-upload-preview"><div class="file-upload-preview-info"><div class="file-upload-preview-name">${escapeHtml(file.name)}</div><div class="file-upload-preview-size">${(file.size/1024).toFixed(0)} KB</div></div><button type="button" class="btn btn-ghost btn-sm" id="remove-file">${Icons.x}</button></div>`;
      document.getElementById('remove-file')?.addEventListener('click',()=>{prev.style.display='none';fileInput.value='';});}
    }

    document.getElementById('drawer-cancel').addEventListener('click',()=>Drawer.close());
    document.getElementById('drawer-save').addEventListener('click',()=>{
      const data=Object.fromEntries(new FormData(document.getElementById('fac-form')));
      if(!data.proveedorId||!data.numero||!data.importe){Toast.warning('Completá los campos obligatorios');return;}
      data.importe=parseFloat(data.importe);data.archivoKey=null;
      if(isEdit){DataService.update('facturas',editId,data);Toast.success('Registro actualizado');}
      else{DataService.create('facturas',data);Toast.success('Registro creado');}
      Drawer.close();facturas=DataService.getAll('facturas');render();
    });
  }

  async function handleDelete(id){
    const confirmed=await confirmDialog({title:'Eliminar registro',message:'¿Estás seguro?',subMessage:'También se preguntará si deseas eliminar el archivo adjunto.',confirmText:'Eliminar',type:'danger'});
    if(confirmed){DataService.remove('facturas',id);Toast.success('Registro eliminado');facturas=DataService.getAll('facturas');render();}
  }

  setTimeout(()=>{
    document.getElementById('btn-new-fac')?.addEventListener('click',()=>openForm(null,'factura'));
    document.getElementById('btn-new-nc')?.addEventListener('click',()=>openForm(null,'nota_credito'));
    document.getElementById('btn-new-nd')?.addEventListener('click',()=>openForm(null,'nota_debito'));
  },100);
  render();
}
