/* ========================================
   MARMOLERÍA BENJAMIN — Cobros Page
   ======================================== */

import { DataService } from '../services/mockData.js';
import { formatCurrency, formatDate, escapeHtml, debounce } from '../utils/helpers.js';
import { Icons, renderDataTable, renderSearchInput, renderBadge, renderFileUpload } from '../components/ui.js';
import { Drawer } from '../components/drawer.js';
import { Toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { DocumentModal } from '../components/documentModal.js';
import { generateCobroHtml, exportToPdf, exportToWord } from '../services/documentExporter.js';
import { METODOS_PAGO, COBRO_ESTADO_LABELS, COBRO_ESTADO_COLORS } from '../utils/constants.js';

export function renderCobros(container, actionsEl) {
  actionsEl.innerHTML = `<button class="btn btn-primary" id="btn-new-cobro">${Icons.plus} Nuevo cobro</button>`;

  let cobros = DataService.getAll('cobros');
  let searchTerm = '', filterEstado = '';

  function render() {
    let filtered = cobros;
    if (filterEstado) filtered = filtered.filter(c => c.estado === filterEstado);
    if (searchTerm) {
      const clis = DataService.getAll('clientes');
      filtered = filtered.filter(c => {
        const cli = clis.find(cl => cl.id === c.clienteId);
        return `${cli?.nombre||''} ${cli?.apellido||''} ${c.observaciones||''}`.toLowerCase().includes(searchTerm.toLowerCase());
      });
    }

    const clientes = DataService.getAll('clientes');
    const obras = DataService.getAll('obras');
    const columns = [
      { label: 'Cliente', render: (c) => { const cl=clientes.find(x=>x.id===c.clienteId); return `<span class="cell-primary">${escapeHtml(cl?`${cl.nombre} ${cl.apellido||''}`:'-')}</span>`; }},
      { label: 'Obra', render: (c) => { const o=obras.find(x=>x.id===c.obraId); return o?`<span class="text-truncate" style="max-width:150px;display:inline-block">${escapeHtml(o.direccion)}</span>`:'-'; }, className: 'cell-secondary' },
      { label: 'Fecha', render: (c) => formatDate(c.fecha) },
      { label: 'Método', render: (c) => { const m=METODOS_PAGO.find(x=>x.value===c.metodoPago); return escapeHtml(m?.label||c.metodoPago); }},
      { label: 'Importe', align: 'right', render: (c) => `<span class="cell-currency">${formatCurrency(c.importe)}</span>` },
      { label: 'Estado', render: (c) => renderBadge(COBRO_ESTADO_LABELS[c.estado]||c.estado, COBRO_ESTADO_COLORS[c.estado]||'neutral') },
      { label: '', align: 'right', className: 'cell-actions', render: (c) => `
        <button class="btn btn-ghost btn-icon btn-sm" data-action="export" data-id="${c.id}" title="Recibo PDF / Word">${Icons.download}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${c.id}">${Icons.edit}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="delete" data-id="${c.id}">${Icons.trash}</button>
      `}
    ];

    // Summary
    const totalCobrado = cobros.filter(c=>c.estado==='cobrado').reduce((s,c)=>s+c.importe,0);
    const totalPendiente = cobros.filter(c=>c.estado==='pendiente').reduce((s,c)=>s+c.importe,0);

    container.innerHTML = `
      <div class="stats-grid" style="margin-bottom:var(--space-4)">
        <div class="stat-card"><div class="stat-card-value" style="color:var(--color-success)">${formatCurrency(totalCobrado)}</div><div class="stat-card-label">Total cobrado</div></div>
        <div class="stat-card"><div class="stat-card-value" style="color:var(--color-warning)">${formatCurrency(totalPendiente)}</div><div class="stat-card-label">Pendiente</div></div>
      </div>
      <div class="table-container">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            ${renderSearchInput('Buscar cobro...')}
            <select class="filter-select" id="filter-estado"><option value="">Todos los estados</option>${Object.entries(COBRO_ESTADO_LABELS).map(([k,v])=>`<option value="${k}" ${filterEstado===k?'selected':''}>${v}</option>`).join('')}</select>
          </div>
          <div class="table-toolbar-right"><span class="text-muted" style="font-size:var(--text-sm)">${filtered.length} cobros</span></div>
        </div>
        ${renderDataTable({ columns, data: filtered.sort((a,b)=>new Date(b.fecha)-new Date(a.fecha)), emptyMessage: 'No hay cobros registrados' })}
      </div>
    `;

    const si=container.querySelector('#search-input');
    if(si){si.value=searchTerm;si.addEventListener('input',debounce(e=>{searchTerm=e.target.value;render();},300));}
    container.querySelector('#filter-estado')?.addEventListener('change',e=>{filterEstado=e.target.value;render();});
    container.addEventListener('click',e=>{
      const btn=e.target.closest('[data-action]');if(!btn)return;
      if(btn.dataset.action==='export') {
        const c = DataService.getById('cobros', btn.dataset.id);
        const cli = DataService.getById('clientes', c.clienteId);
        const o = c.obraId ? DataService.getById('obras', c.obraId) : null;
        DocumentModal.open({
          title: `Recibo #${String(c.id).padStart(5, '0')}`,
          filename: `Recibo_${c.id}`,
          htmlContent: generateCobroHtml(c, cli, o)
        });
      }
      if(btn.dataset.action==='edit')openForm(btn.dataset.id);
      if(btn.dataset.action==='delete')handleDelete(btn.dataset.id);
    });
  }

  function openForm(editId=null){
    const cobro=editId?DataService.getById('cobros',editId):{};const isEdit=!!editId;
    const clientes=DataService.getAll('clientes');
    const obrasDisp=DataService.getAll('obras').filter(o=>!['cancelada'].includes(o.estado));

    Drawer.open({title:isEdit?'Editar cobro':'Nuevo cobro',
      content:`<form id="cobro-form">
        <div class="form-group"><label class="form-label">Cliente <span class="required">*</span></label><select class="form-select" name="clienteId" id="cobro-cliente"><option value="">Seleccionar...</option>${clientes.map(c=>`<option value="${c.id}" ${cobro.clienteId===c.id?'selected':''}>${c.nombre} ${c.apellido||''}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Obra</label><select class="form-select" name="obraId" id="cobro-obra"><option value="">Sin asociar</option>${obrasDisp.map(o=>{const cl=clientes.find(c=>c.id===o.clienteId);return`<option value="${o.id}" ${cobro.obraId===o.id?'selected':''}>${escapeHtml(o.direccion)} (${cl?.nombre||''})</option>`;}).join('')}</select></div>
        <div id="cobro-saldo-info" style="display:none;margin-bottom:var(--space-4)"></div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Importe <span class="required">*</span></label><input type="number" class="form-input" name="importe" value="${cobro.importe||''}" min="0" step="0.01"></div>
          <div class="form-group"><label class="form-label">Fecha</label><input type="date" class="form-input" name="fecha" value="${cobro.fecha||new Date().toISOString().split('T')[0]}"></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Método de pago</label><select class="form-select" name="metodoPago">${METODOS_PAGO.map(m=>`<option value="${m.value}" ${cobro.metodoPago===m.value?'selected':''}>${m.label}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Estado</label><select class="form-select" name="estado">${Object.entries(COBRO_ESTADO_LABELS).map(([k,v])=>`<option value="${k}" ${(cobro.estado||'cobrado')===k?'selected':''}>${v}</option>`).join('')}</select></div>
        </div>
        <div class="form-group"><label class="form-label">Observaciones</label><textarea class="form-textarea" name="observaciones" rows="2">${escapeHtml(cobro.observaciones||'')}</textarea></div>
        <div class="form-group"><label class="form-label">Comprobante</label>${renderFileUpload('cobro-file')}</div>
      </form>`,
      footer:`<button class="btn btn-secondary" id="drawer-cancel">Cancelar</button><button class="btn btn-primary" id="drawer-save">${isEdit?'Guardar':'Registrar cobro'}</button>`
    });

    // Show saldo when obra is selected
    const obraSelect=document.getElementById('cobro-obra');
    const saldoInfo=document.getElementById('cobro-saldo-info');
    function updateSaldoInfo(){
      const obraId=obraSelect.value;
      if(obraId){
        const total=DataService.getObraTotal(obraId);const cobrado=DataService.getObraCobrado(obraId);
        saldoInfo.style.display='block';
        saldoInfo.innerHTML=`<div class="alert alert-info"><span class="alert-icon">${Icons.info}</span><span>Total obra: ${formatCurrency(total)} · Cobrado: ${formatCurrency(cobrado)} · <strong>Pendiente: ${formatCurrency(total-cobrado)}</strong></span></div>`;
      }else{saldoInfo.style.display='none';}
    }
    obraSelect?.addEventListener('change',updateSaldoInfo);
    if(cobro.obraId)updateSaldoInfo();

    const zone=document.getElementById('cobro-file-zone');const fileInput=document.getElementById('cobro-file');
    if(zone&&fileInput){zone.addEventListener('click',()=>fileInput.click());}

    document.getElementById('drawer-cancel').addEventListener('click',()=>Drawer.close());
    document.getElementById('drawer-save').addEventListener('click',()=>{
      const data=Object.fromEntries(new FormData(document.getElementById('cobro-form')));
      if(!data.clienteId||!data.importe){Toast.warning('Completá los campos obligatorios');return;}
      data.importe=parseFloat(data.importe);data.comprobanteKey=null;
      // Set presupuestoId from obra if available
      if(data.obraId){const obra=DataService.getById('obras',data.obraId);data.presupuestoId=obra?.presupuestoId||null;}
      if(isEdit){DataService.update('cobros',editId,data);Toast.success('Cobro actualizado');}
      else{DataService.create('cobros',data);Toast.success('Cobro registrado');}
      Drawer.close();cobros=DataService.getAll('cobros');render();
    });
  }

  async function handleDelete(id){
    const confirmed=await confirmDialog({title:'Eliminar cobro',message:'¿Estás seguro?',confirmText:'Eliminar',type:'danger'});
    if(confirmed){DataService.remove('cobros',id);Toast.success('Cobro eliminado');cobros=DataService.getAll('cobros');render();}
  }

  setTimeout(()=>{document.getElementById('btn-new-cobro')?.addEventListener('click',()=>openForm());},100);
  render();
}
