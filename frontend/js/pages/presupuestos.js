/* ========================================
   MARMOLERÍA BENJAMIN — Presupuestos Page
   ======================================== */

import { DataService } from '../services/mockData.js';
import { formatCurrency, formatDate, searchFilter, escapeHtml, debounce, generateAutoNumber } from '../utils/helpers.js';
import { Icons, renderDataTable, renderSearchInput, renderBadge, renderEmptyState } from '../components/ui.js';
import { Drawer } from '../components/drawer.js';
import { Toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { DocumentModal } from '../components/documentModal.js';
import { generatePresupuestoHtml, exportToPdf, exportToWord } from '../services/documentExporter.js';
import { PRESUPUESTO_ESTADO_LABELS, PRESUPUESTO_ESTADO_COLORS, CONDICIONES_COMERCIALES_DEFAULT, MONEDAS } from '../utils/constants.js';

export function renderPresupuestos(container, actionsEl, path) {
  const parts = path.split('/');
  if (parts.length > 2 && parts[2]) {
    renderPresupuestoDetail(container, actionsEl, parts[2]);
    return;
  }

  actionsEl.innerHTML = `<button class="btn btn-primary" id="btn-new-pres">${Icons.plus} Nuevo presupuesto</button>`;

  let presupuestos = DataService.getAll('presupuestos');
  let searchTerm = '';
  let filterEstado = '';

  function render() {
    let filtered = presupuestos;
    if (filterEstado) filtered = filtered.filter(p => p.estado === filterEstado);
    if (searchTerm) {
      const clientes = DataService.getAll('clientes');
      filtered = filtered.filter(p => {
        const cli = clientes.find(c => c.id === p.clienteId);
        const cliName = cli ? `${cli.nombre} ${cli.apellido}` : '';
        const combined = `${p.numero} ${cliName} ${p.descripcion}`.toLowerCase();
        return combined.includes(searchTerm.toLowerCase());
      });
    }

    const clientes = DataService.getAll('clientes');
    const columns = [
      { label: 'Número', render: (p) => `<span class="cell-mono cell-primary">${p.numero}</span>` },
      { label: 'Fecha', render: (p) => formatDate(p.fecha), className: 'cell-secondary' },
      { label: 'Cliente', render: (p) => {
        const cli = clientes.find(c => c.id === p.clienteId);
        return escapeHtml(cli ? `${cli.nombre} ${cli.apellido || ''}` : '-');
      }},
      { label: 'Descripción', render: (p) => `<span class="text-truncate" style="max-width:200px;display:inline-block">${escapeHtml(p.descripcion)}</span>` },
      { label: 'Estado', render: (p) => renderBadge(PRESUPUESTO_ESTADO_LABELS[p.estado] || p.estado, PRESUPUESTO_ESTADO_COLORS[p.estado] || 'neutral') },
      { label: 'Total', align: 'right', render: (p) => `<span class="cell-currency">${formatCurrency(DataService.getPresupuestoTotal(p), p.moneda)}</span>` },
      { label: '', align: 'right', className: 'cell-actions', render: (p) => `
        <button class="btn btn-ghost btn-icon btn-sm" data-action="view" data-id="${p.id}" title="Ver">${Icons.eye}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="export" data-id="${p.id}" title="Exportar PDF / Word">${Icons.download}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="edit" data-id="${p.id}" title="Editar">${Icons.edit}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="duplicate" data-id="${p.id}" title="Duplicar">${Icons.copy}</button>
        <button class="btn btn-ghost btn-icon btn-sm" data-action="delete" data-id="${p.id}" title="Eliminar">${Icons.trash}</button>
      `}
    ];

    container.innerHTML = `
      <div class="table-container">
        <div class="table-toolbar">
          <div class="table-toolbar-left">
            ${renderSearchInput('Buscar presupuesto, cliente...')}
            <select class="filter-select" id="filter-estado">
              <option value="">Todos los estados</option>
              ${Object.entries(PRESUPUESTO_ESTADO_LABELS).map(([k, v]) => `<option value="${k}" ${filterEstado === k ? 'selected' : ''}>${v}</option>`).join('')}
            </select>
          </div>
          <div class="table-toolbar-right">
            <span class="text-muted" style="font-size:var(--text-sm)">${filtered.length} presupuestos</span>
          </div>
        </div>
        ${renderDataTable({ columns, data: filtered.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)), emptyMessage: 'No hay presupuestos' })}
      </div>
    `;

    // Events
    const searchInput = container.querySelector('#search-input');
    if (searchInput) {
      searchInput.value = searchTerm;
      searchInput.addEventListener('input', debounce((e) => { searchTerm = e.target.value; render(); }, 300));
    }

    container.querySelector('#filter-estado')?.addEventListener('change', (e) => { filterEstado = e.target.value; render(); });

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const { action, id } = btn.dataset;
      if (action === 'view') window.location.hash = `#/presupuestos/${id}`;
      if (action === 'export') {
        const pres = DataService.getById('presupuestos', id);
        const cli = DataService.getById('clientes', pres.clienteId);
        const tot = DataService.getPresupuestoTotal(pres);
        DocumentModal.open({
          title: `Presupuesto ${pres.numero}`,
          filename: `Presupuesto_${pres.numero}`,
          htmlContent: generatePresupuestoHtml(pres, cli, tot)
        });
      }
      if (action === 'edit') openPresupuestoForm(id);
      if (action === 'duplicate') handleDuplicate(id);
      if (action === 'delete') handleDelete(id);
    });

    container.querySelectorAll('.data-table tbody tr').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        if (row.dataset.id) window.location.hash = `#/presupuestos/${row.dataset.id}`;
      });
    });
  }

  function openPresupuestoForm(editId = null) {
    const pres = editId ? { ...DataService.getById('presupuestos', editId) } : {
      numero: generateAutoNumber('PRES', DataService.getAll('presupuestos')),
      fecha: new Date().toISOString().split('T')[0],
      moneda: 'ARS', estado: 'borrador',
      items: [{ id: '1', descripcion: '', material: '', cantidad: 1, largo: 0, ancho: 0, m2: 0, precioUnitario: 0, subtotal: 0 }],
      adicionales: { colocacion: 0, manoDeObra: 0, transporte: 0, bacha: 0, zocalos: 0, extras: 0 },
      descuento: 0, impuestos: 0, condiciones: CONDICIONES_COMERCIALES_DEFAULT.join('\n')
    };

    const clientes = DataService.getAll('clientes');
    const materiales = DataService.getAll('materiales');

    Drawer.open({
      title: editId ? `Editar ${pres.numero}` : 'Nuevo presupuesto',
      size: 'xl',
      content: `
        <form id="pres-form">
          <div class="presupuesto-form-section">
            <h4 class="presupuesto-form-section-title">${Icons['file-text']} Datos generales</h4>
            <div class="form-row-3">
              <div class="form-group">
                <label class="form-label">Número</label>
                <input type="text" class="form-input" name="numero" value="${pres.numero}" readonly style="background:var(--color-stone-50)">
              </div>
              <div class="form-group">
                <label class="form-label">Fecha</label>
                <input type="date" class="form-input" name="fecha" value="${pres.fecha}">
              </div>
              <div class="form-group">
                <label class="form-label">Moneda</label>
                <select class="form-select" name="moneda">
                  ${MONEDAS.map(m => `<option value="${m.value}" ${pres.moneda === m.value ? 'selected' : ''}>${m.label}</option>`).join('')}
                </select>
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">Cliente <span class="required">*</span></label>
                <select class="form-select" name="clienteId">
                  <option value="">Seleccionar cliente...</option>
                  ${clientes.map(c => `<option value="${c.id}" ${pres.clienteId === c.id ? 'selected' : ''}>${c.nombre} ${c.apellido || ''}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Dirección de obra</label>
                <input type="text" class="form-input" name="direccion" value="${escapeHtml(pres.direccion || '')}">
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">Descripción</label>
              <input type="text" class="form-input" name="descripcion" value="${escapeHtml(pres.descripcion || '')}">
            </div>
          </div>

          <div class="presupuesto-form-section">
            <div class="flex justify-between items-center mb-3">
              <h4 class="presupuesto-form-section-title mb-0">${Icons.package} Ítems del presupuesto</h4>
              <button type="button" class="btn btn-secondary btn-sm" id="btn-add-item">${Icons.plus} Agregar ítem</button>
            </div>
            <div class="presupuesto-items-list" id="items-body"></div>
          </div>

          <div class="presupuesto-form-section">
            <h4 class="presupuesto-form-section-title">${Icons['dollar-sign']} Adicionales</h4>
            <div class="presupuesto-adicionales">
              <div class="form-group">
                <label class="form-label">Colocación</label>
                <input type="number" class="form-input calc-field" name="adic_colocacion" value="${pres.adicionales?.colocacion || 0}" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">Mano de obra</label>
                <input type="number" class="form-input calc-field" name="adic_manoDeObra" value="${pres.adicionales?.manoDeObra || 0}" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">Transporte</label>
                <input type="number" class="form-input calc-field" name="adic_transporte" value="${pres.adicionales?.transporte || 0}" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">Bacha</label>
                <input type="number" class="form-input calc-field" name="adic_bacha" value="${pres.adicionales?.bacha || 0}" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">Zócalos</label>
                <input type="number" class="form-input calc-field" name="adic_zocalos" value="${pres.adicionales?.zocalos || 0}" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">Extras</label>
                <input type="number" class="form-input calc-field" name="adic_extras" value="${pres.adicionales?.extras || 0}" min="0">
              </div>
            </div>
          </div>

          <div class="form-row-2">
            <div class="form-group">
              <label class="form-label">Descuento (%)</label>
              <input type="number" class="form-input calc-field" name="descuento" value="${pres.descuento || 0}" min="0" max="100">
            </div>
            <div class="form-group">
              <label class="form-label">Impuestos / IVA (%)</label>
              <input type="number" class="form-input calc-field" name="impuestos" value="${pres.impuestos || 0}" min="0">
            </div>
          </div>

          <div class="summary-box" id="pres-summary"></div>

          <div class="form-group mt-6">
            <label class="form-label">Observaciones</label>
            <textarea class="form-textarea" name="observaciones" rows="2">${escapeHtml(pres.observaciones || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Condiciones comerciales</label>
            <textarea class="form-textarea" name="condiciones" rows="4">${escapeHtml(pres.condiciones || '')}</textarea>
          </div>
        </form>
      `,
      footer: `
        <button class="btn btn-secondary" id="drawer-cancel">Cancelar</button>
        <button class="btn btn-primary" id="drawer-save">Guardar</button>
      `
    });

    // Render items with automatic material pricing
    const itemsBody = document.getElementById('items-body');
    let items = (pres.items && pres.items.length > 0)
      ? pres.items.map(it => {
          const mat = materiales.find(m => m.nombre === it.material);
          return {
            ...it,
            unidad: it.unidad || (mat ? mat.unidad : 'm2'),
            precioUnitario: (it.precioUnitario !== undefined && it.precioUnitario !== null && it.precioUnitario !== '')
              ? it.precioUnitario
              : (mat ? mat.precioVenta : 0)
          };
        })
      : [{ id: Date.now().toString(), descripcion: '', material: '', unidad: 'm2', cantidad: 1, largo: 0, ancho: 0, m2: 0, precioUnitario: 0, subtotal: 0 }];

    function calculateItem(item) {
      const cant = Math.max(1, parseFloat(item.cantidad) || 1);
      const largo = Math.max(0, parseFloat(item.largo) || 0);
      const ancho = Math.max(0, parseFloat(item.ancho) || 0);
      const precio = Math.max(0, parseFloat(item.precioUnitario) || 0);
      const unidad = item.unidad || 'm2';

      if (unidad === 'm2') {
        // Largo (cm) × Ancho (cm) / 10000 = m² per piece. Total surface = m² per piece × cantidad
        if (largo > 0 && ancho > 0) {
          item.m2 = ((largo * ancho) / 10000) * cant;
        } else {
          item.m2 = 0;
        }
        item.subtotal = item.m2 * precio;
      } else if (unidad === 'metros') {
        const ml = largo > 0 ? (largo / 100) * cant : cant;
        item.m2 = 0;
        item.subtotal = ml * precio;
      } else {
        // unidades, kg, etc.
        item.m2 = 0;
        item.subtotal = cant * precio;
      }
    }

    // Initial calculation for all items
    items.forEach(it => calculateItem(it));

    function renderItems() {
      itemsBody.innerHTML = items.map((item, idx) => {
        const unidad = item.unidad || 'm2';
        const isM2 = unidad === 'm2';
        const isMetros = unidad === 'metros';
        const isUnidad = unidad === 'unidades';

        const selectedMat = materiales.find(m => m.nombre === item.material);
        const autoPriceBadge = selectedMat
          ? `<span class="badge badge-success" style="font-size:10px;padding:2px 6px">Precio cargado de ${escapeHtml(selectedMat.nombre)}</span>`
          : '';

        let formulaText = '';
        if (isM2) {
          formulaText = `${(item.m2 || 0).toFixed(2)} m² × ${formatCurrency(item.precioUnitario)}/m²`;
        } else if (isMetros) {
          const ml = item.largo > 0 ? (((item.largo || 0) / 100) * (item.cantidad || 1)).toFixed(2) : (item.cantidad || 1);
          formulaText = `${ml} ml × ${formatCurrency(item.precioUnitario)}/ml`;
        } else {
          formulaText = `${item.cantidad || 1} un × ${formatCurrency(item.precioUnitario)}/un`;
        }

        return `
        <div class="pres-item-card" data-idx="${idx}">
          <div class="pres-item-header">
            <div class="pres-item-title-wrap">
              <span class="pres-item-badge">Ítem #${idx + 1}</span>
              <span class="pres-item-title">${escapeHtml(item.descripcion || 'Nueva pieza')}</span>
              ${autoPriceBadge}
            </div>
            ${items.length > 1 ? `
              <button type="button" class="btn btn-ghost btn-sm row-remove" data-idx="${idx}" title="Eliminar ítem" style="color:var(--color-error)">
                ${Icons.trash} <span style="font-size:12px;margin-left:4px">Quitar</span>
              </button>
            ` : ''}
          </div>
          <div class="pres-item-body">
            <div class="form-row-2" style="margin-bottom:var(--space-3)">
              <div class="form-group mb-0">
                <label class="form-label-sm">Descripción del trabajo / Pieza <span class="required">*</span></label>
                <input type="text" class="form-input item-field" data-field="descripcion" value="${escapeHtml(item.descripcion || '')}" placeholder="Ej: Mesada con trasforo, Isla cocina, Vanitory...">
              </div>
              <div class="form-group mb-0">
                <label class="form-label-sm">Material (con precio por m² precargado) <span class="required">*</span></label>
                <select class="form-select item-field item-mat-select" data-field="material">
                  <option value="">Seleccionar material del catálogo...</option>
                  ${materiales.map(m => {
                    const unitSuffix = m.unidad === 'm2' ? 'm²' : (m.unidad === 'metros' ? 'ml' : (m.unidad === 'unidades' ? 'un' : m.unidad));
                    return `<option value="${escapeHtml(m.nombre)}" ${item.material === m.nombre ? 'selected' : ''}>${escapeHtml(m.nombre)} — ${formatCurrency(m.precioVenta)} / ${unitSuffix}</option>`;
                  }).join('')}
                </select>
              </div>
            </div>

            <div class="pres-item-metrics-grid">
              <div class="form-group mb-0">
                <label class="form-label-sm">${isM2 ? 'Cantidad de piezas' : (isMetros ? 'Cantidad (tiras)' : 'Cantidad (unidades)')}</label>
                <input type="number" class="form-input item-field" data-field="cantidad" value="${item.cantidad || 1}" min="1">
              </div>

              ${isM2 ? `
                <div class="form-group mb-0">
                  <label class="form-label-sm">Largo (cm)</label>
                  <input type="number" class="form-input item-field" data-field="largo" value="${item.largo || 0}" min="0" placeholder="Ej: 220">
                </div>
                <div class="form-group mb-0">
                  <label class="form-label-sm">Ancho (cm)</label>
                  <input type="number" class="form-input item-field" data-field="ancho" value="${item.ancho || 0}" min="0" placeholder="Ej: 60">
                </div>
                <div class="form-group mb-0">
                  <label class="form-label-sm">Superficie total (m²)</label>
                  <div class="item-m2-pill" title="Superficie total: (Largo × Ancho / 10.000) × Cantidad">
                    <span class="item-m2">${(item.m2 || 0).toFixed(2)}</span>&nbsp;m²
                  </div>
                </div>
                <div class="form-group mb-0">
                  <label class="form-label-sm">Precio por m² ($)</label>
                  <div style="position:relative">
                    <input type="number" class="form-input item-field item-price-input" data-field="precioUnitario" value="${item.precioUnitario || 0}" min="0" placeholder="Ej: $85.000 / m²">
                    <span style="position:absolute;right:10px;top:11px;font-size:11px;color:var(--color-stone-400);pointer-events:none">/ m²</span>
                  </div>
                </div>
              ` : (isMetros ? `
                <div class="form-group mb-0">
                  <label class="form-label-sm">Largo por tira (cm)</label>
                  <input type="number" class="form-input item-field" data-field="largo" value="${item.largo || 0}" min="0" placeholder="Ej: 100">
                </div>
                <div class="form-group mb-0">
                  <label class="form-label-sm">Metros lineales totales</label>
                  <div class="item-m2-pill">
                    <span class="item-m2">${(((item.largo || 0) / 100) * (item.cantidad || 1)).toFixed(2)}</span>&nbsp;ml
                  </div>
                </div>
                <div class="form-group mb-0">
                  <label class="form-label-sm">Precio por metro lineal ($)</label>
                  <div style="position:relative">
                    <input type="number" class="form-input item-field item-price-input" data-field="precioUnitario" value="${item.precioUnitario || 0}" min="0" placeholder="Ej: $25.000 / ml">
                    <span style="position:absolute;right:10px;top:11px;font-size:11px;color:var(--color-stone-400);pointer-events:none">/ ml</span>
                  </div>
                </div>
              ` : `
                <div class="form-group mb-0" style="grid-column: span 2">
                  <label class="form-label-sm">Precio unitario ($)</label>
                  <div style="position:relative">
                    <input type="number" class="form-input item-field item-price-input" data-field="precioUnitario" value="${item.precioUnitario || 0}" min="0" placeholder="Ej: $72.000">
                    <span style="position:absolute;right:10px;top:11px;font-size:11px;color:var(--color-stone-400);pointer-events:none">/ un</span>
                  </div>
                </div>
              `)}
            </div>

            <div class="pres-item-footer-bar">
              <div style="display:flex;align-items:center;gap:var(--space-2)">
                <span class="text-muted" style="font-size:var(--text-xs)">Cálculo:</span>
                <span class="item-calc-formula" style="font-size:var(--text-xs);font-weight:var(--font-semibold);color:var(--color-stone-700)">${formulaText}</span>
              </div>
              <div style="display:flex;align-items:center;gap:var(--space-2)">
                <span class="pres-item-footer-label">Subtotal ítem:</span>
                <span class="item-subtotal pres-item-footer-value">${formatCurrency(item.subtotal || 0)}</span>
              </div>
            </div>
          </div>
        </div>
        `;
      }).join('');

      // Item field events
      itemsBody.querySelectorAll('.item-field').forEach(input => {
        const eventType = input.tagName === 'SELECT' ? 'change' : 'input';
        input.addEventListener(eventType, () => {
          const card = input.closest('.pres-item-card');
          const idx = parseInt(card.dataset.idx);
          const field = input.dataset.field;
          let val = input.value;

          if (field === 'material') {
            const mat = materiales.find(m => m.nombre === val);
            if (mat) {
              items[idx].material = mat.nombre;
              items[idx].unidad = mat.unidad || 'm2';
              // Automatically fetch the pre-configured selling price / price per m²
              items[idx].precioUnitario = mat.precioVenta || 0;
            } else {
              items[idx].material = '';
              items[idx].unidad = 'm2';
              items[idx].precioUnitario = 0;
            }
            calculateItem(items[idx]);
            renderItems();
            updateSummary();
            return;
          }

          if (['cantidad', 'largo', 'ancho', 'precioUnitario'].includes(field)) {
            val = parseFloat(val) || 0;
          }
          items[idx][field] = val;
          calculateItem(items[idx]);

          // Update dynamic values on card without full re-render for smooth typing
          const m2El = card.querySelector('.item-m2');
          if (m2El) {
            m2El.textContent = (items[idx].unidad === 'metros')
              ? (((items[idx].largo || 0) / 100) * (items[idx].cantidad || 1)).toFixed(2)
              : (items[idx].m2 || 0).toFixed(2);
          }
          const subtotalEl = card.querySelector('.item-subtotal');
          if (subtotalEl) subtotalEl.textContent = formatCurrency(items[idx].subtotal || 0);

          const formulaEl = card.querySelector('.item-calc-formula');
          if (formulaEl) {
            if (items[idx].unidad === 'm2') {
              formulaEl.textContent = `${(items[idx].m2 || 0).toFixed(2)} m² × ${formatCurrency(items[idx].precioUnitario)}/m²`;
            } else if (items[idx].unidad === 'metros') {
              const ml = items[idx].largo > 0 ? (((items[idx].largo || 0) / 100) * (items[idx].cantidad || 1)).toFixed(2) : (items[idx].cantidad || 1);
              formulaEl.textContent = `${ml} ml × ${formatCurrency(items[idx].precioUnitario)}/ml`;
            } else {
              formulaEl.textContent = `${items[idx].cantidad || 1} un × ${formatCurrency(items[idx].precioUnitario)}/un`;
            }
          }

          if (field === 'descripcion') {
            card.querySelector('.pres-item-title').textContent = val || 'Nueva pieza';
          }
          updateSummary();
        });
      });

      // Remove item
      itemsBody.querySelectorAll('.row-remove').forEach(btn => {
        btn.addEventListener('click', () => {
          if (items.length <= 1) return;
          const idx = parseInt(btn.dataset.idx);
          items.splice(idx, 1);
          renderItems();
          updateSummary();
        });
      });
    }

    function updateSummary() {
      const form = document.getElementById('pres-form');
      const itemsTotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
      const adics = ['colocacion', 'manoDeObra', 'transporte', 'bacha', 'zocalos', 'extras'];
      const adicsTotal = adics.reduce((s, k) => s + (parseFloat(form.querySelector(`[name="adic_${k}"]`)?.value) || 0), 0);
      const subtotal = itemsTotal + adicsTotal;
      const desc = parseFloat(form.querySelector('[name="descuento"]')?.value) || 0;
      const imp = parseFloat(form.querySelector('[name="impuestos"]')?.value) || 0;
      const descMonto = subtotal * desc / 100;
      const impMonto = (subtotal - descMonto) * imp / 100;
      const total = subtotal - descMonto + impMonto;

      document.getElementById('pres-summary').innerHTML = `
        <div class="summary-row"><span class="summary-row-label">Subtotal materiales e ítems</span><span class="summary-row-value">${formatCurrency(itemsTotal)}</span></div>
        <div class="summary-row"><span class="summary-row-label">Adicionales (colocación, transporte, etc.)</span><span class="summary-row-value">${formatCurrency(adicsTotal)}</span></div>
        ${desc > 0 ? `<div class="summary-row"><span class="summary-row-label">Descuento (${desc}%)</span><span class="summary-row-value" style="color:var(--color-error)">-${formatCurrency(descMonto)}</span></div>` : ''}
        ${imp > 0 ? `<div class="summary-row"><span class="summary-row-label">Impuestos (${imp}%)</span><span class="summary-row-value">${formatCurrency(impMonto)}</span></div>` : ''}
        <div class="summary-row total"><span class="summary-row-label">Total Presupuesto</span><span class="summary-row-value">${formatCurrency(total)}</span></div>
      `;
    }

    renderItems();
    updateSummary();

    document.getElementById('btn-add-item')?.addEventListener('click', () => {
      items.push({ id: Date.now().toString(), descripcion: '', material: '', unidad: 'm2', cantidad: 1, largo: 0, ancho: 0, m2: 0, precioUnitario: 0, subtotal: 0 });
      renderItems();
      updateSummary();
    });

    document.querySelectorAll('.calc-field').forEach(f => f.addEventListener('input', updateSummary));

    document.getElementById('drawer-cancel')?.addEventListener('click', () => Drawer.close());
    document.getElementById('drawer-save')?.addEventListener('click', () => {
      const form = document.getElementById('pres-form');
      const fd = new FormData(form);
      const data = Object.fromEntries(fd);

      if (!data.clienteId) { Toast.warning('Seleccioná un cliente'); return; }

      const adics = ['colocacion', 'manoDeObra', 'transporte', 'bacha', 'zocalos', 'extras'];
      const adicionales = {};
      adics.forEach(k => { adicionales[k] = parseFloat(data[`adic_${k}`]) || 0; delete data[`adic_${k}`]; });

      const record = { ...data, items, adicionales, descuento: parseFloat(data.descuento) || 0, impuestos: parseFloat(data.impuestos) || 0 };

      if (editId) {
        DataService.update('presupuestos', editId, record);
        Toast.success('Presupuesto actualizado');
      } else {
        DataService.create('presupuestos', record);
        Toast.success('Presupuesto creado');
      }
      Drawer.close();
      presupuestos = DataService.getAll('presupuestos');
      render();
    });
  }

  function handleDuplicate(id) {
    const orig = DataService.getById('presupuestos', id);
    if (!orig) return;
    const dup = { ...JSON.parse(JSON.stringify(orig)), id: undefined, numero: generateAutoNumber('PRES', DataService.getAll('presupuestos')), estado: 'borrador', fecha: new Date().toISOString().split('T')[0] };
    DataService.create('presupuestos', dup);
    Toast.success('Presupuesto duplicado');
    presupuestos = DataService.getAll('presupuestos');
    render();
  }

  async function handleDelete(id) {
    const pres = DataService.getById('presupuestos', id);
    const confirmed = await confirmDialog({ title: 'Eliminar presupuesto', message: `¿Eliminar ${pres.numero}?`, confirmText: 'Eliminar', type: 'danger' });
    if (confirmed) {
      DataService.remove('presupuestos', id);
      Toast.success('Presupuesto eliminado');
      presupuestos = DataService.getAll('presupuestos');
      render();
    }
  }

  setTimeout(() => { document.getElementById('btn-new-pres')?.addEventListener('click', () => openPresupuestoForm()); }, 100);
  render();
}

// ── Presupuesto Detail ──
function renderPresupuestoDetail(container, actionsEl, presId) {
  const pres = DataService.getById('presupuestos', presId);
  if (!pres) { container.innerHTML = renderEmptyState({ title: 'Presupuesto no encontrado' }); return; }

  const cliente = DataService.getById('clientes', pres.clienteId);
  const total = DataService.getPresupuestoTotal(pres);

  actionsEl.innerHTML = `
    <a href="#/presupuestos" class="btn btn-secondary">${Icons['chevron-left']} Volver</a>
  `;

  const adic = pres.adicionales || {};
  const adicEntries = Object.entries({ Colocación: adic.colocacion, 'Mano de obra': adic.manoDeObra, Transporte: adic.transporte, Bacha: adic.bacha, Zócalos: adic.zocalos, Extras: adic.extras }).filter(([, v]) => v > 0);

  container.innerHTML = `
    <!-- Action buttons bar -->
    <div class="card mb-4">
      <div class="card-body" style="display:flex;gap:var(--space-2);flex-wrap:wrap">
        <button class="btn btn-pdf" id="btn-pdf" style="flex:1;min-width:130px;justify-content:center">${Icons['file-pdf']} Descargar PDF</button>
        <button class="btn btn-word" id="btn-word" style="flex:1;min-width:130px;justify-content:center">${Icons['file-word']} Descargar Word</button>
        <button class="btn btn-secondary" id="btn-preview" style="flex:1;min-width:130px;justify-content:center">${Icons.eye} Vista previa</button>
        ${cliente?.whatsapp ? `<button class="btn btn-secondary" id="btn-whatsapp" style="flex:1;min-width:130px;justify-content:center">${Icons.whatsapp} WhatsApp</button>` : ''}
        ${pres.estado === 'borrador' || pres.estado === 'enviado' ? `<button class="btn btn-success" id="btn-aprobar" style="flex:1;min-width:130px;justify-content:center">${Icons.check} Aprobar</button>` : ''}
        ${pres.estado === 'aprobado' && !pres.obraId ? `<button class="btn btn-primary" id="btn-crear-obra" style="flex:1;min-width:130px;justify-content:center">${Icons['hard-hat']} Crear obra</button>` : ''}
      </div>
    </div>

    <div class="card mb-4">
      <div class="card-body">
        <div class="flex justify-between items-start" style="margin-bottom:var(--space-4)">
          <div>
            <h2 style="font-size:var(--text-xl);font-weight:var(--font-bold)">${pres.numero}</h2>
            <p class="text-muted">${escapeHtml(pres.descripcion || '')}</p>
          </div>
          ${renderBadge(PRESUPUESTO_ESTADO_LABELS[pres.estado], PRESUPUESTO_ESTADO_COLORS[pres.estado])}
        </div>
        <div class="detail-list">
          <div class="detail-item">
            <span class="detail-label">Cliente</span>
            <span class="detail-value">${cliente ? `${cliente.nombre} ${cliente.apellido || ''}` : '-'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Fecha</span>
            <span class="detail-value">${formatDate(pres.fecha)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Dirección</span>
            <span class="detail-value">${escapeHtml(pres.direccion || '-')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Moneda</span>
            <span class="detail-value">${pres.moneda}${pres.cotizacionDolar ? ` (TC: $${pres.cotizacionDolar})` : ''}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Items section as responsive cards -->
    <div class="card mb-4">
      <div class="card-header"><h3 class="card-title">Ítems (${(pres.items || []).length})</h3></div>
      <div class="card-body">
        <div class="detail-items-list">
          ${(pres.items || []).map((item, idx) => `
            <div class="detail-item-card">
              <div class="detail-item-card-top">
                <span class="detail-item-card-desc"><strong>#${idx + 1}</strong> — ${escapeHtml(item.descripcion)}</span>
                <span class="badge badge-neutral">${escapeHtml(item.material || 'Piedra')}</span>
              </div>
              <div class="detail-item-card-grid">
                <div><span class="text-muted">Cantidad:</span> <strong>${item.cantidad} ${item.unidad === 'metros' ? 'tiras' : (item.unidad === 'unidades' ? 'un' : 'piezas')}</strong></div>
                <div><span class="text-muted">Medidas:</span> <strong>${item.largo || '-'} × ${item.ancho || '-'} cm</strong></div>
                <div><span class="text-muted">${item.unidad === 'metros' ? 'Metros lineales:' : (item.unidad === 'unidades' ? 'Unidades:' : 'Superficie total:')}</span> <strong>${item.unidad === 'metros' ? `${(((item.largo || 0) / 100) * (item.cantidad || 1)).toFixed(2)} ml` : `${(item.m2 || 0).toFixed(2)} m²`}</strong></div>
                <div><span class="text-muted">${item.unidad === 'metros' ? 'Precio por ml:' : (item.unidad === 'unidades' ? 'Precio unitario:' : 'Precio por m²:')}</span> <strong>${formatCurrency(item.precioUnitario)}</strong></div>
              </div>
              <div class="detail-item-card-subtotal">
                <span class="text-muted">Subtotal ítem:</span>
                <strong>${formatCurrency(item.subtotal)}</strong>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="summary-box mb-4">
      <div class="summary-row"><span class="summary-row-label">Subtotal ítems</span><span class="summary-row-value">${formatCurrency(pres.items.reduce((s, i) => s + (i.subtotal || 0), 0))}</span></div>
      ${adicEntries.map(([k, v]) => `<div class="summary-row"><span class="summary-row-label">${k}</span><span class="summary-row-value">${formatCurrency(v)}</span></div>`).join('')}
      ${pres.descuento > 0 ? `<div class="summary-row"><span class="summary-row-label">Descuento (${pres.descuento}%)</span><span class="summary-row-value" style="color:var(--color-error)">-${formatCurrency(DataService.getPresupuestoTotal({ ...pres, descuento: 0, impuestos: 0 }) * pres.descuento / 100)}</span></div>` : ''}
      <div class="summary-row total"><span class="summary-row-label">Total</span><span class="summary-row-value">${formatCurrency(total, pres.moneda)}</span></div>
    </div>

    ${pres.condiciones ? `
    <div class="card mb-4">
      <div class="card-header"><h3 class="card-title">Condiciones comerciales</h3></div>
      <div class="card-body"><pre style="white-space:pre-wrap;font-family:inherit;font-size:var(--text-sm);color:var(--color-stone-600);line-height:1.6">${escapeHtml(pres.condiciones)}</pre></div>
    </div>` : ''}
  `;

  // Approve action
  document.getElementById('btn-aprobar')?.addEventListener('click', async () => {
    DataService.update('presupuestos', presId, { estado: 'aprobado' });
    Toast.success('Presupuesto aprobado');
    renderPresupuestoDetail(container, actionsEl, presId);
  });

  // Create obra
  document.getElementById('btn-crear-obra')?.addEventListener('click', () => {
    const obra = DataService.create('obras', {
      clienteId: pres.clienteId, presupuestoId: pres.id,
      direccion: pres.direccion, descripcion: pres.descripcion,
      material: pres.items?.[0]?.material || '',
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaEstimada: '', responsable: '', estado: 'pendiente', observaciones: '', archivos: []
    });
    DataService.update('presupuestos', presId, { obraId: obra.id });
    Toast.success('Obra creada desde presupuesto');
    window.location.hash = `#/obras/${obra.id}`;
  });

  // Document actions
  const getDocHtml = () => generatePresupuestoHtml(pres, cliente, total);
  const docFilename = `Presupuesto_${pres.numero}`;

  const openPreview = () => {
    DocumentModal.open({
      title: `Presupuesto ${pres.numero}`,
      filename: docFilename,
      htmlContent: getDocHtml()
    });
  };

  const handlePdf = async () => {
    Toast.info('Generando PDF', 'Preparando documento en alta resolución...');
    const ok = await exportToPdf(getDocHtml(), docFilename);
    if (ok) Toast.success('PDF descargado con éxito');
  };

  const handleWord = () => {
    try {
      exportToWord(getDocHtml(), docFilename);
      Toast.success('Documento Word (.doc) descargado');
    } catch (e) {
      console.error(e);
      Toast.error('Error al generar archivo Word');
    }
  };

  document.getElementById('btn-header-preview')?.addEventListener('click', openPreview);
  document.getElementById('btn-preview')?.addEventListener('click', openPreview);
  document.getElementById('btn-header-pdf')?.addEventListener('click', handlePdf);
  document.getElementById('btn-pdf')?.addEventListener('click', handlePdf);
  document.getElementById('btn-header-word')?.addEventListener('click', handleWord);
  document.getElementById('btn-word')?.addEventListener('click', handleWord);

  // WhatsApp
  document.getElementById('btn-whatsapp')?.addEventListener('click', () => {
    const msg = `Hola! Te envío el presupuesto ${pres.numero} de Marmolería Benjamin.\n\n${pres.descripcion}\nTotal: ${formatCurrency(total, pres.moneda)}\n\n¡Saludos!`;
    window.open(`https://wa.me/${cliente.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
  });
}
