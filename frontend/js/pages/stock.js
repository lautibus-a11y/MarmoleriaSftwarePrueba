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
    <button class="btn btn-secondary" id="btn-actualizar-precios" style="color:var(--color-primary);font-weight:var(--font-semibold)">${Icons.settings} Actualizar precios</button>
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
      {
        label: 'Material',
        render: (m) => `
          <span class="cell-primary">${escapeHtml(m.nombre)}</span><br>
          <span class="cell-secondary" style="font-size:var(--text-xs)">${escapeHtml(m.tipo || 'Nacional')}</span>
        `
      },
      {
        label: 'Medidas',
        render: (m) => {
          if (m.largo && m.ancho) {
            return `<span class="cell-mono" style="font-weight:var(--font-semibold)">${m.largo} × ${m.ancho} cm</span>`;
          }
          if (m.largo) return `<span class="cell-mono">${m.largo} cm</span>`;
          return `<span class="cell-secondary">-</span>`;
        }
      },
      {
        label: 'Espesor',
        render: (m) => escapeHtml(m.espesor || '20 mm'),
        className: 'cell-secondary'
      },
      {
        label: 'Precio por m²',
        render: (m) => {
          const precio = m.precioM2 ?? m.precioVenta ?? 0;
          return `
            <div style="display:flex;align-items:baseline;gap:4px">
              <span class="cell-mono" style="font-weight:var(--font-bold);color:var(--color-primary-700);font-size:var(--text-sm)">
                ${formatCurrency(precio)}
              </span>
              <span class="cell-secondary" style="font-size:var(--text-xs)">/ m²</span>
            </div>
          `;
        }
      },
      {
        label: 'Cantidad/Stock',
        render: (m) => {
          const actual = DataService.getStockActual(m.id);
          const isBajo = actual <= m.stockMinimo;
          const unitSuffix = m.unidad === 'm2' ? ' m²' : (m.unidad === 'metros' ? ' ml' : (m.unidad === 'unidades' ? ' un' : (m.unidad === 'placas' ? ' pl' : '')));
          return `
            <span style="font-weight:var(--font-bold);font-size:var(--text-sm);color:${isBajo ? 'var(--color-error)' : 'var(--color-stone-800)'}">
              ${actual}${unitSuffix}
            </span>
            <span class="cell-secondary" style="font-size:var(--text-xs);margin-left:4px">
              / mín: ${m.stockMinimo}${unitSuffix}
            </span>
            ${isBajo ? `<span style="margin-left:4px;color:var(--color-error);display:inline-flex;vertical-align:middle">${Icons['alert-triangle']}</span>` : ''}
          `;
        }
      },
      {
        label: '', align: 'right', className: 'cell-actions',
        render: (m) => `
          <button class="btn btn-ghost btn-icon btn-sm" data-action="history" data-id="${m.id}" title="Historial">${Icons.clock}</button>
          <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${m.id}" title="Editar">${Icons.edit}</button>
          <button class="btn btn-ghost btn-icon btn-sm" data-action="delete" data-id="${m.id}" title="Eliminar">${Icons.trash}</button>
        `
      }
    ];

    container.innerHTML = `
      <div class="table-container">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            ${renderSearchInput('Buscar material por nombre o tipo...')}
            <select class="filter-select" id="filter-cat"><option value="">Todas las categorías</option>${MATERIAL_CATEGORIAS.map(c=>`<option value="${c.value}" ${filterCat===c.value?'selected':''}>${c.label}</option>`).join('')}</select>
          </div>
          <div class="table-toolbar-right"><span class="text-muted" style="font-size:var(--text-sm)">${filtered.length} materiales</span></div>
        </div>
        ${renderDataTable({ columns, data: filtered, emptyMessage: 'No hay materiales registrados' })}
      </div>
    `;

    const si = container.querySelector('#search-input');
    if (si) { si.value = searchTerm; si.oninput = debounce(e => { searchTerm = e.target.value; render(); }, 300); }
    const fc = container.querySelector('#filter-cat');
    if (fc) fc.onchange = e => { filterCat = e.target.value; render(); };
  }

  container.onclick = e => {
    const btn = e.target.closest('[data-action]'); if (!btn) return;
    e.stopPropagation();
    const { action, id } = btn.dataset;
    if (action === 'edit') { openMaterialForm(id); return; }
    if (action === 'delete') { handleDelete(id); return; }
    if (action === 'history') { showHistory(id); return; }
  };

  function openMaterialForm(editId=null){
    const mat = (editId ? DataService.getById('materiales', editId) : null) || {};
    const isEdit = !!editId;
    const proveedores=DataService.getAll('proveedores');
    const valorPrecio = (mat.precioM2 ?? mat.precioVenta) ?? '';

    Drawer.open({
      title: isEdit ? 'Editar material' : 'Nuevo material',
      content: `<form id="mat-form">
        <div class="form-group">
          <label class="form-label">Nombre del material <span class="required">*</span></label>
          <input type="text" class="form-input" name="nombre" value="${escapeHtml(mat.nombre||'')}" placeholder="Ej: Negro Brasil, Granito Negro Absoluto..." required>
        </div>
        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Categoría</label>
            <select class="form-select" name="categoria">
              ${MATERIAL_CATEGORIAS.map(c=>`<option value="${c.value}" ${mat.categoria===c.value?'selected':''}>${c.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tipo / Procedencia</label>
            <input type="text" class="form-input" name="tipo" value="${escapeHtml(mat.tipo||'Nacional')}" placeholder="Nacional, Importado...">
          </div>
        </div>

        <div style="background:var(--color-stone-50);border:1px solid var(--color-stone-200);border-radius:var(--radius-lg);padding:var(--space-3);margin-bottom:var(--space-4)">
          <div style="font-size:var(--text-xs);font-weight:var(--font-bold);color:var(--color-stone-700);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:var(--space-2)">
            Medidas y Dimensiones
          </div>
          <div class="form-row-3">
            <div class="form-group mb-0">
              <label class="form-label">Largo (cm)</label>
              <input type="number" class="form-input" name="largo" value="${mat.largo || ''}" min="0" placeholder="Ej: 300">
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Ancho (cm)</label>
              <input type="number" class="form-input" name="ancho" value="${mat.ancho || ''}" min="0" placeholder="Ej: 180">
            </div>
            <div class="form-group mb-0">
              <label class="form-label">Espesor</label>
              <input type="text" class="form-input" name="espesor" value="${escapeHtml(mat.espesor||'20 mm')}" placeholder="Ej: 20 mm">
            </div>
          </div>
        </div>

        <!-- CAMPO EXCLUSIVO DE PRECIO POR M² PARA PRESUPUESTOS -->
        <div class="form-group" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:var(--radius-lg);padding:var(--space-3);margin-bottom:var(--space-4)">
          <label class="form-label" style="font-weight:var(--font-bold);color:#166534;display:flex;align-items:center;justify-content:space-between">
            <span>Precio por m² ($) <span class="required">*</span></span>
            <span style="font-size:11px;font-weight:var(--font-semibold);background:#dcfce7;color:#15803d;padding:2px 8px;border-radius:12px">Referencia Presupuestos</span>
          </label>
          <div style="position:relative">
            <input type="number" step="any" class="form-input" name="precioM2" id="mat-precio-m2" value="${valorPrecio}" min="0" placeholder="Ej: 50000" required style="font-size:var(--text-base);font-weight:var(--font-bold);color:#14532d;background:#fff">
          </div>
          <span style="font-size:var(--text-xs);color:#15803d;margin-top:6px;display:block">
            Este precio se cargará automáticamente al seleccionar este material en cualquier nuevo presupuesto.
          </span>
        </div>

        <div class="form-row-2">
          <div class="form-group">
            <label class="form-label">Unidad de medida <span class="required">*</span></label>
            <select class="form-select" name="unidad" id="mat-form-unidad">
              ${UNIDADES.map(u=>`<option value="${u.value}" ${(mat.unidad||'m2')===u.value?'selected':''}>${u.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Stock mínimo de alerta</label>
            <input type="number" class="form-input" name="stockMinimo" value="${mat.stockMinimo||5}" min="0">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Proveedor habitual</label>
          <select class="form-select" name="proveedor">
            <option value="">-</option>
            ${proveedores.map(p=>`<option value="${p.id}" ${mat.proveedor===p.id?'selected':''}>${p.nombre}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Observaciones</label>
          <textarea class="form-textarea" name="observaciones" rows="2" placeholder="Terminación, pulido, detalles...">${escapeHtml(mat.observaciones||'')}</textarea>
        </div>
      </form>`,
      footer: `<button class="btn btn-secondary" id="drawer-cancel">Cancelar</button><button class="btn btn-primary" id="drawer-save">${isEdit?'Guardar cambios':'Crear material'}</button>`
    });

    document.getElementById('drawer-cancel').addEventListener('click',()=>Drawer.close());
    document.getElementById('drawer-save').addEventListener('click',()=>{
      const fd=new FormData(document.getElementById('mat-form'));
      const data=Object.fromEntries(fd);
      if(!data.nombre?.trim()){Toast.warning('El nombre es obligatorio');return;}
      data.largo = parseFloat(data.largo) || 0;
      data.ancho = parseFloat(data.ancho) || 0;
      data.stockMinimo = parseInt(data.stockMinimo) || 0;
      data.unidad = data.unidad || 'm2';
      
      // Guardar precio por m² y sincronizar precioVenta
      const precioM2Val = parseFloat(data.precioM2) || 0;
      data.precioM2 = precioM2Val;
      data.precioVenta = precioM2Val;

      if(isEdit){DataService.update('materiales',editId,data);Toast.success('Material y precio actualizado');}
      else{DataService.create('materiales',data);Toast.success('Material creado exitosamente');}
      Drawer.close();materiales=DataService.getAll('materiales');render();
    });
  }

  function openMovimientoForm(){
    const mats=DataService.getAll('materiales');
    Modal.open({title:'Nuevo movimiento de stock',size:'md',
      content:`<form id="mov-form">
        <div class="form-group">
          <label class="form-label">Material <span class="required">*</span></label>
          <select class="form-select" name="materialId" id="mov-material-select">
            <option value="">Seleccionar material...</option>
            ${mats.map(m=>`<option value="${m.id}">${m.nombre} (${m.unidad === 'm2' ? 'm²' : (m.unidad === 'metros' ? 'ml' : (m.unidad === 'unidades' ? 'un' : m.unidad))})</option>`).join('')}
          </select>
        </div>
        <div class="form-row-2">
          <div class="form-group"><label class="form-label">Tipo</label><select class="form-select" name="tipo"><option value="entrada">Entrada</option><option value="salida">Salida</option><option value="ajuste">Ajuste</option><option value="devolucion">Devolución</option></select></div>
          <div class="form-group">
            <label class="form-label">Cantidad <span id="mov-unit-hint" class="text-muted" style="font-size:11px;font-weight:normal">(m²)</span></label>
            <input type="number" step="any" class="form-input" name="cantidad" value="1" min="0.01" required>
          </div>
        </div>
        <div class="form-group"><label class="form-label">Fecha</label><input type="date" class="form-input" name="fecha" value="${new Date().toISOString().split('T')[0]}"></div>
        <div class="form-group"><label class="form-label">Referencia</label><input type="text" class="form-input" name="referencia" placeholder="Ej: Compra proveedor, Obra X..."></div>
      </form>`,
      footer:`<button class="btn btn-secondary" id="modal-cancel">Cancelar</button><button class="btn btn-primary" id="modal-save">Registrar</button>`
    });

    const matSel = document.getElementById('mov-material-select');
    const unitHint = document.getElementById('mov-unit-hint');
    matSel?.addEventListener('change', (e) => {
      const selected = mats.find(m => m.id === e.target.value);
      if (unitHint) {
        if (selected) {
          const uText = selected.unidad === 'm2' ? 'm²' : (selected.unidad === 'metros' ? 'ml' : (selected.unidad === 'unidades' ? 'un' : selected.unidad));
          unitHint.textContent = `(${uText})`;
        } else {
          unitHint.textContent = '';
        }
      }
    });

    document.getElementById('modal-cancel').addEventListener('click',()=>Modal.close());
    document.getElementById('modal-save').addEventListener('click',()=>{
      const fd=new FormData(document.getElementById('mov-form'));const data=Object.fromEntries(fd);
      if(!data.materialId){Toast.warning('Seleccioná un material');return;}
      data.cantidad=parseFloat(data.cantidad)||0;
      if(data.cantidad<=0){Toast.warning('La cantidad debe ser mayor a 0');return;}
      DataService.create('stockMovimientos',data);
      Toast.success('Movimiento registrado');Modal.close();render();
    });
  }

  function showHistory(materialId){
    const mat = DataService.getById('materiales', materialId);
    if (!mat) return;
    const movs = DataService.getAll('stockMovimientos').filter(m => m.materialId === materialId).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    const actual = DataService.getStockActual(materialId);
    const uText = (mat.unidad === 'm2' ? 'm²' : (mat.unidad === 'metros' ? 'ml' : (mat.unidad === 'unidades' ? 'un' : mat.unidad))) || 'm²';

    Modal.open({title:`Historial — ${mat.nombre || 'Material'}`,size:'lg',
      content:`
        <p style="margin-bottom:var(--space-4)">Stock actual: <strong>${actual} ${uText}</strong></p>
        ${movs.length > 0 ? `<table class="data-table"><thead><tr><th>Fecha</th><th>Tipo</th><th style="text-align:right">Cantidad</th><th>Referencia</th></tr></thead><tbody>
        ${movs.map(m=>`<tr><td>${formatDate(m.fecha)}</td><td>${renderBadge(MOVIMIENTO_TIPO_LABELS[m.tipo],MOVIMIENTO_TIPO_COLORS[m.tipo])}</td><td style="text-align:right;font-weight:var(--font-semibold);color:${m.tipo==='entrada'||m.tipo==='devolucion'?'var(--color-success)':'var(--color-error)'}">${m.tipo==='salida'?'-':''}${m.cantidad} ${uText}</td><td class="cell-secondary">${escapeHtml(m.referencia||'-')}</td></tr>`).join('')}
        </tbody></table>` : '<p class="text-muted">Sin movimientos registrados</p>'}`
    });
  }

  async function handleDelete(id){
    const confirmed=await confirmDialog({title:'Eliminar material',message:'¿Estás seguro?',confirmText:'Eliminar',type:'danger'});
    if(confirmed){DataService.remove('materiales',id);Toast.success('Material eliminado');materiales=DataService.getAll('materiales');render();}
  }

  function openActualizarPreciosModal() {
    let catFilter = '';
    let tipoAumento = 'porcentaje';
    let valorAumento = 10;
    let redondeo = '100';

    const allMats = DataService.getAll('materiales');

    function calculateNewPrice(currentPrice) {
      const p = Number(currentPrice) || 0;
      if (p <= 0) return 0;
      let nuevo = p;
      if (tipoAumento === 'porcentaje') {
        nuevo = p * (1 + (Number(valorAumento) || 0) / 100);
      } else {
        nuevo = p + (Number(valorAumento) || 0);
      }

      if (redondeo === '100') {
        nuevo = Math.round(nuevo / 100) * 100;
      } else if (redondeo === '1000') {
        nuevo = Math.round(nuevo / 1000) * 1000;
      } else {
        nuevo = Math.round(nuevo * 100) / 100;
      }
      return Math.max(0, nuevo);
    }

    function getAffectedMats() {
      if (!catFilter) return allMats;
      return allMats.filter(m => m.categoria === catFilter);
    }

    function renderModalBody() {
      const affected = getAffectedMats();

      return `
        <div style="display:flex;flex-direction:column;gap:var(--space-4)">
          <div style="padding:10px 14px;background:var(--color-stone-100);border-radius:var(--radius-md);font-size:var(--text-xs);color:var(--color-stone-600)">
            Esta herramienta aplica aumentos porcentuales o fijos a los precios por m² del catálogo y se sincroniza en tiempo real con Cloudflare R2.
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Categoría a actualizar</label>
              <select class="form-select" id="bulk-cat">
                <option value="">Todas las categorías (${allMats.length} materiales)</option>
                ${MATERIAL_CATEGORIAS.map(c => `
                  <option value="${c.value}" ${catFilter === c.value ? 'selected' : ''}>
                    ${c.label} (${allMats.filter(m => m.categoria === c.value).length})
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Tipo de incremento</label>
              <select class="form-select" id="bulk-tipo">
                <option value="porcentaje" ${tipoAumento === 'porcentaje' ? 'selected' : ''}>Porcentaje (+ %)</option>
                <option value="monto" ${tipoAumento === 'monto' ? 'selected' : ''}>Monto fijo (+ $ ARS)</option>
              </select>
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label" id="bulk-val-label">${tipoAumento === 'porcentaje' ? 'Porcentaje de aumento (%)' : 'Monto de aumento ($)'}</label>
              <input type="number" class="form-input" id="bulk-val" value="${valorAumento}" step="any" min="0" required>
            </div>
            <div class="form-group">
              <label class="form-label">Criterio de redondeo</label>
              <select class="form-select" id="bulk-redondeo">
                <option value="100" ${redondeo === '100' ? 'selected' : ''}>Redondear a centenas ($100)</option>
                <option value="1000" ${redondeo === '1000' ? 'selected' : ''}>Redondear a miles ($1.000)</option>
                <option value="ninguno" ${redondeo === 'ninguno' ? 'selected' : ''}>Sin redondeo (exacto)</option>
              </select>
            </div>
          </div>

          <div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
              <label class="form-label" style="margin:0">Previsualización (${affected.length} materiales afectados)</label>
              <span class="text-muted" style="font-size:var(--text-xs)">Cálculo en vivo antes de guardar</span>
            </div>
            <div style="max-height:220px;overflow-y:auto;border:1px solid var(--color-stone-200);border-radius:var(--radius-md)">
              <table class="data-table" style="font-size:var(--text-xs);margin:0">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th style="text-align:right">Precio actual</th>
                    <th style="text-align:right">Nuevo precio</th>
                    <th style="text-align:right">Variación</th>
                  </tr>
                </thead>
                <tbody id="bulk-preview-rows">
                  ${affected.map(m => {
                    const current = Number(m.precioM2 ?? m.precioVenta) || 0;
                    const nuevo = calculateNewPrice(current);
                    const diff = nuevo - current;
                    return `
                      <tr>
                        <td><strong>${escapeHtml(m.nombre)}</strong></td>
                        <td style="text-align:right">${formatCurrency(current)}</td>
                        <td style="text-align:right;font-weight:var(--font-bold);color:var(--color-stone-900)">${formatCurrency(nuevo)}</td>
                        <td style="text-align:right;color:${diff >= 0 ? '#15803D' : '#DC2626'};font-weight:var(--font-semibold)">+${formatCurrency(diff)}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:var(--space-2);margin-top:var(--space-2)">
            <button type="button" class="btn btn-secondary" id="btn-bulk-cancel">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btn-bulk-apply">
              ${Icons.check} Aplicar aumento a ${affected.length} materiales
            </button>
          </div>
        </div>
      `;
    }

    Modal.open({
      title: '⚡ Actualización Masiva de Precios por m²',
      size: 'lg',
      content: renderModalBody()
    });

    const updatePreview = () => {
      catFilter = document.getElementById('bulk-cat')?.value || '';
      tipoAumento = document.getElementById('bulk-tipo')?.value || 'porcentaje';
      valorAumento = parseFloat(document.getElementById('bulk-val')?.value) || 0;
      redondeo = document.getElementById('bulk-redondeo')?.value || '100';

      const valLabel = document.getElementById('bulk-val-label');
      if (valLabel) {
        valLabel.textContent = tipoAumento === 'porcentaje' ? 'Porcentaje de aumento (%)' : 'Monto de aumento ($)';
      }

      const affected = getAffectedMats();
      const tbody = document.getElementById('bulk-preview-rows');
      if (tbody) {
        tbody.innerHTML = affected.map(m => {
          const current = Number(m.precioM2 ?? m.precioVenta) || 0;
          const nuevo = calculateNewPrice(current);
          const diff = nuevo - current;
          return `
            <tr>
              <td><strong>${escapeHtml(m.nombre)}</strong></td>
              <td style="text-align:right">${formatCurrency(current)}</td>
              <td style="text-align:right;font-weight:var(--font-bold);color:var(--color-stone-900)">${formatCurrency(nuevo)}</td>
              <td style="text-align:right;color:${diff >= 0 ? '#15803D' : '#DC2626'};font-weight:var(--font-semibold)">+${formatCurrency(diff)}</td>
            </tr>
          `;
        }).join('');
      }

      const applyBtn = document.getElementById('btn-bulk-apply');
      if (applyBtn) {
        applyBtn.innerHTML = `${Icons.check} Aplicar aumento a ${affected.length} materiales`;
      }
    };

    document.getElementById('bulk-cat')?.addEventListener('change', updatePreview);
    document.getElementById('bulk-tipo')?.addEventListener('change', updatePreview);
    document.getElementById('bulk-val')?.addEventListener('input', updatePreview);
    document.getElementById('bulk-redondeo')?.addEventListener('change', updatePreview);

    document.getElementById('btn-bulk-cancel')?.addEventListener('click', () => Modal.close());

    document.getElementById('btn-bulk-apply')?.addEventListener('click', () => {
      const affected = getAffectedMats();
      if (affected.length === 0) {
        Toast.info('Aviso', 'No hay materiales seleccionados');
        return;
      }

      let updatedCount = 0;
      affected.forEach(m => {
        const current = Number(m.precioM2 ?? m.precioVenta) || 0;
        const nuevo = calculateNewPrice(current);
        DataService.update('materiales', m.id, {
          precioM2: nuevo,
          precioVenta: nuevo
        });
        updatedCount++;
      });

      Toast.success(`¡Se actualizaron los precios de ${updatedCount} materiales!`);
      Modal.close();
      materiales = DataService.getAll('materiales');
      render();
    });
  }

  actionsEl.querySelector('#btn-new-mat')?.addEventListener('click', () => openMaterialForm());
  actionsEl.querySelector('#btn-new-mov')?.addEventListener('click', () => openMovimientoForm());
  actionsEl.querySelector('#btn-actualizar-precios')?.addEventListener('click', () => openActualizarPreciosModal());
  render();
}
