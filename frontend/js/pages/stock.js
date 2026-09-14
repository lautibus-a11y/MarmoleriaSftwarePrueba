/* ========================================
   MARMOLERÍA BENJAMIN — Stock Page
   ======================================== */

import { DataService } from '../services/mockData.js';
import { formatCurrency, formatDate, escapeHtml, debounce, searchFilter } from '../utils/helpers.js';
import { Icons, renderDataTable, renderSearchInput, renderBadge, renderEmptyState } from '../components/ui.js';
import { Drawer } from '../components/drawer.js';
import { Modal } from '../components/modal.js';
import { Toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { MATERIAL_CATEGORIAS, UNIDADES, MOVIMIENTO_TIPO_LABELS, MOVIMIENTO_TIPO_COLORS } from '../utils/constants.js';

export function renderStock(container, actionsEl) {
  actionsEl.innerHTML = `
    <button class="btn btn-secondary" id="btn-new-mov">${Icons.plus} Movimiento</button>
    <button class="btn btn-primary" id="btn-new-mat">${Icons.plus} Nuevo material</button>
  `;

  let materiales = DataService.getAll('materiales');
  let searchTerm = '', filterCat = '';

  function render() {
    let filtered = materiales;
    if (filterCat) filtered = filtered.filter(m => m.categoria === filterCat);
    if (searchTerm) filtered = searchFilter(filtered, searchTerm, ['nombre', 'categoria', 'tipo']);

    const columns = [
      { label: 'Material', render: (m) => `<span class="cell-primary">${escapeHtml(m.nombre)}</span><br><span class="cell-secondary" style="font-size:var(--text-xs)">${escapeHtml(m.tipo)} · ${escapeHtml(m.espesor)}</span>` },
      { label: 'Categoría', render: (m) => { const cat = MATERIAL_CATEGORIAS.find(c=>c.value===m.categoria); return renderBadge(cat?.label||m.categoria, 'neutral'); }},
      { label: 'Unidad', render: (m) => escapeHtml(m.unidad) },
      { label: 'Stock', render: (m) => {
        const actual = DataService.getStockActual(m.id);
        const isBajo = actual <= m.stockMinimo;
        return `<span style="font-weight:var(--font-semibold);color:${isBajo?'var(--color-error)':'var(--color-stone-800)'}">${actual}</span>
          <span class="cell-secondary" style="font-size:var(--text-xs)"> / mín: ${m.stockMinimo}</span>
          ${isBajo ? `<span style="margin-left:4px">${Icons['alert-triangle']}</span>` : ''}`;
      }},
      { label: 'Costo', align: 'right', render: (m) => `<span class="cell-currency cell-secondary">${formatCurrency(m.costo)}</span>` },
      {
        label: 'P. Venta', align: 'right',
        render: (m) => {
          const unit = m.unidad === 'm2' ? ' / m²' : (m.unidad === 'metros' ? ' / ml' : (m.unidad === 'unidades' ? ' / un' : (m.unidad ? ` / ${m.unidad}` : '')));
          return `<span class="cell-currency" style="font-weight:var(--font-bold)">${formatCurrency(m.precioVenta)}<span class="cell-secondary" style="font-size:11px;font-weight:normal">${unit}</span></span>`;
        }
      },
      { label: '', align: 'right', className: 'cell-actions', render: (m) => `
        <button class="btn btn-ghost btn-icon btn-sm" data-action="history" data-id="${m.id}" title="Historial">${Icons.clock}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${m.id}" title="Editar">${Icons.edit}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="delete" data-id="${m.id}" title="Eliminar">${Icons.trash}</button>
      `}
    ];

    container.innerHTML = `
      <div class="table-container">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            ${renderSearchInput('Buscar material...')}
            <select class="filter-select" id="filter-cat"><option value="">Todas las categorías</option>${MATERIAL_CATEGORIAS.map(c=>`<option value="${c.value}" ${filterCat===c.value?'selected':''}>${c.label}</option>`).join('')}</select>
          </div>
          <div class="table-toolbar-right"><span class="text-muted" style="font-size:var(--text-sm)">${filtered.length} materiales</span></div>
        </div>
        ${renderDataTable({ columns, data: filtered, emptyMessage: 'No hay materiales registrados' })}
      </div>
    `;

    const si = container.querySelector('#search-input');
    if(si){si.value=searchTerm;si.addEventListener('input',debounce(e=>{searchTerm=e.target.value;render();},300));}
    container.querySelector('#filter-cat')?.addEventListener('change',e=>{filterCat=e.target.value;render();});
    container.addEventListener('click',e=>{
      const btn=e.target.closest('[data-action]');if(!btn)return;
      const{action,id}=btn.dataset;
      if(action==='edit')openMaterialForm(id);
      if(action==='delete')handleDelete(id);
      if(action==='history')showHistory(id);
    });
  }

  function openMaterialForm(editId=null){
    const mat=editId?DataService.getById('materiales',editId):{};
    const isEdit=!!editId;
    const proveedores=DataService.getAll('proveedores');

    const unitConfigs = {
      m2: { label: 'Precio por m² ($)', placeholder: 'Ej: $85.000 / m²', help: 'Configurado una sola vez. Se aplicará automáticamente al cotizar en presupuestos.' },
      metros: { label: 'Precio por metro lineal ($)', placeholder: 'Ej: $25.000 / ml', help: 'Precio por metro lineal que se cargará automáticamente en presupuestos.' },
      unidades: { label: 'Precio por unidad ($)', placeholder: 'Ej: $72.000 / un', help: 'Precio por unidad que se cargará automáticamente en presupuestos.' },
      kg: { label: 'Precio por kg ($)', placeholder: 'Ej: $15.000 / kg', help: 'Precio por kilogramo que se cargará automáticamente en presupuestos.' },
      placas: { label: 'Precio por placa ($)', placeholder: 'Ej: $250.000 / placa', help: 'Precio por placa entera que se cargará automáticamente en presupuestos.' }
    };
    const initialUnit = mat.unidad || 'm2';
    const currentCfg = unitConfigs[initialUnit] || unitConfigs.m2;

    Drawer.open({title:isEdit?'Editar material':'Nuevo material',
      content:`<form id="mat-form">
        <div class="form-group"><label class="form-label">Nombre del material <span class="required">*</span></label><input type="text" class="form-input" name="nombre" value="${escapeHtml(mat.nombre||'')}" placeholder="Ej: Granito Negro Brasil, Mármol Carrara..." required></div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Categoría</label><select class="form-select" name="categoria">${MATERIAL_CATEGORIAS.map(c=>`<option value="${c.value}" ${mat.categoria===c.value?'selected':''}>${c.label}</option>`).join('')}</select></div>
          <div class="form-group"><label class="form-label">Tipo / Procedencia</label><input type="text" class="form-input" name="tipo" value="${escapeHtml(mat.tipo||'Nacional')}" placeholder="Nacional, Importado..."></div>
        </div>
        <div class="form-row-3">
          <div class="form-group"><label class="form-label">Unidad de medida <span class="required">*</span></label>
            <select class="form-select" name="unidad" id="mat-form-unidad">
              ${UNIDADES.map(u=>`<option value="${u.value}" ${(mat.unidad||'m2')===u.value?'selected':''}>${u.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label class="form-label">Espesor</label><input type="text" class="form-input" name="espesor" value="${escapeHtml(mat.espesor||'2cm')}" placeholder="2cm"></div>
          <div class="form-group"><label class="form-label">Stock mínimo</label><input type="number" class="form-input" name="stockMinimo" value="${mat.stockMinimo||5}" min="0"></div>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Costo unitario ($)</label><input type="number" class="form-input" name="costo" value="${mat.costo||0}" min="0" placeholder="Ej: 55000"></div>
          <div class="form-group">
            <label class="form-label" id="mat-precio-label">${currentCfg.label} <span class="required">*</span></label>
            <input type="number" class="form-input" name="precioVenta" id="mat-precio-input" value="${mat.precioVenta||''}" min="0" placeholder="${currentCfg.placeholder}" required>
            <span class="text-muted" id="mat-precio-help" style="font-size:11px;display:block;margin-top:3px">${currentCfg.help}</span>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Proveedor habitual</label><select class="form-select" name="proveedor"><option value="">-</option>${proveedores.map(p=>`<option value="${p.id}" ${mat.proveedor===p.id?'selected':''}>${p.nombre}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Observaciones</label><textarea class="form-textarea" name="observaciones" rows="2" placeholder="Terminación, pulido, detalles...">${escapeHtml(mat.observaciones||'')}</textarea></div>
      </form>`,
      footer:`<button class="btn btn-secondary" id="drawer-cancel">Cancelar</button><button class="btn btn-primary" id="drawer-save">${isEdit?'Guardar cambios':'Crear material'}</button>`
    });

    // Dynamic label update when changing unit
    const unidadSelect = document.getElementById('mat-form-unidad');
    unidadSelect?.addEventListener('change', (e) => {
      const u = e.target.value;
      const cfg = unitConfigs[u] || unitConfigs.m2;
      const lbl = document.getElementById('mat-precio-label');
      const inp = document.getElementById('mat-precio-input');
      const hlp = document.getElementById('mat-precio-help');
      if (lbl) lbl.innerHTML = `${cfg.label} <span class="required">*</span>`;
      if (inp) inp.placeholder = cfg.placeholder;
      if (hlp) hlp.textContent = cfg.help;
    });

    document.getElementById('drawer-cancel').addEventListener('click',()=>Drawer.close());
    document.getElementById('drawer-save').addEventListener('click',()=>{
      const fd=new FormData(document.getElementById('mat-form'));const data=Object.fromEntries(fd);
      if(!data.nombre?.trim()){Toast.warning('El nombre es obligatorio');return;}
      data.costo=parseFloat(data.costo)||0;data.precioVenta=parseFloat(data.precioVenta)||0;data.stockMinimo=parseInt(data.stockMinimo)||0;
      data.unidad=data.unidad || 'm2';
      if(isEdit){DataService.update('materiales',editId,data);Toast.success('Material actualizado');}
      else{DataService.create('materiales',data);Toast.success('Material creado');}
      Drawer.close();materiales=DataService.getAll('materiales');render();
    });
  }

  function openMovimientoForm(){
    const mats=DataService.getAll('materiales');
    Modal.open({title:'Nuevo movimiento de stock',size:'md',
      content:`<form id="mov-form">
        <div class="form-group"><label class="form-label">Material <span class="required">*</span></label><select class="form-select" name="materialId"><option value="">Seleccionar...</option>${mats.map(m=>`<option value="${m.id}">${m.nombre}</option>`).join('')}</select></div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Tipo</label><select class="form-select" name="tipo"><option value="entrada">Entrada</option><option value="salida">Salida</option><option value="ajuste">Ajuste</option><option value="devolucion">Devolución</option></select></div>
          <div class="form-group"><label class="form-label">Cantidad</label><input type="number" class="form-input" name="cantidad" value="1" min="1"></div>
        </div>
        <div class="form-group"><label class="form-label">Fecha</label><input type="date" class="form-input" name="fecha" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label class="form-label">Referencia</label><input type="text" class="form-input" name="referencia" placeholder="Ej: Compra proveedor, Obra X..."></div>
      </form>`,
      footer:`<button class="btn btn-secondary" id="modal-cancel">Cancelar</button><button class="btn btn-primary" id="modal-save">Registrar</button>`
    });

    document.getElementById('modal-cancel').addEventListener('click',()=>Modal.close());
    document.getElementById('modal-save').addEventListener('click',()=>{
      const fd=new FormData(document.getElementById('mov-form'));const data=Object.fromEntries(fd);
      if(!data.materialId){Toast.warning('Seleccioná un material');return;}
      data.cantidad=parseInt(data.cantidad)||0;
      if(data.cantidad<=0){Toast.warning('La cantidad debe ser mayor a 0');return;}
      DataService.create('stockMovimientos',data);
      Toast.success('Movimiento registrado');Modal.close();render();
    });
  }

  function showHistory(materialId){
    const mat=DataService.getById('materiales',materialId);
    const movs=DataService.getAll('stockMovimientos').filter(m=>m.materialId===materialId).sort((a,b)=>new Date(b.fecha)-new Date(a.fecha));
    const actual=DataService.getStockActual(materialId);

    Modal.open({title:`Historial — ${mat.nombre}`,size:'lg',
      content:`
        <p style="margin-bottom:var(--space-4)">Stock actual: <strong>${actual} ${mat.unidad}</strong></p>
        ${movs.length > 0 ? `<table class="data-table"><thead><tr><th>Fecha</th><th>Tipo</th><th style="text-align:right">Cantidad</th><th>Referencia</th></tr></thead><tbody>
        ${movs.map(m=>`<tr><td>${formatDate(m.fecha)}</td><td>${renderBadge(MOVIMIENTO_TIPO_LABELS[m.tipo],MOVIMIENTO_TIPO_COLORS[m.tipo])}</td><td style="text-align:right;font-weight:var(--font-semibold);color:${m.tipo==='entrada'||m.tipo==='devolucion'?'var(--color-success)':'var(--color-error)'}">${m.tipo==='salida'?'-':''}${m.cantidad}</td><td class="cell-secondary">${escapeHtml(m.referencia||'-')}</td></tr>`).join('')}
        </tbody></table>` : '<p class="text-muted">Sin movimientos registrados</p>'}`
    });
  }

  async function handleDelete(id){
    const confirmed=await confirmDialog({title:'Eliminar material',message:'¿Estás seguro?',confirmText:'Eliminar',type:'danger'});
    if(confirmed){DataService.remove('materiales',id);Toast.success('Material eliminado');materiales=DataService.getAll('materiales');render();}
  }

  setTimeout(()=>{
    document.getElementById('btn-new-mat')?.addEventListener('click',()=>openMaterialForm());
    document.getElementById('btn-new-mov')?.addEventListener('click',()=>openMovimientoForm());
  },100);
  render();
}
