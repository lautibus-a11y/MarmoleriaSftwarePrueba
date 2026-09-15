/* ========================================
   MARMOLERÍA BENJAMIN — Presupuestos Page
   ======================================== */

import { DataService } from '../services/mockData.js';
import { formatCurrency, formatDate, searchFilter, escapeHtml, debounce, generateAutoNumber } from '../utils/helpers.js';
import { Icons, renderDataTable, renderSearchInput, renderBadge, renderEmptyState } from '../components/ui.js';
import { Drawer } from '../components/drawer.js';
import { Modal } from '../components/modal.js';
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
        const cliName = cli ? `${cli.nombre} ${cli.apellido}` : (p.clienteNombre || '');
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
        return escapeHtml(cli ? `${cli.nombre} ${cli.apellido || ''}` : (p.clienteNombre || '-'));
      }},
      { label: 'Descripción', render: (p) => `<span class="text-truncate" style="max-width:200px;display:inline-block">${escapeHtml(p.descripcion)}</span>` },
      { label: 'Estado', render: (p) => renderBadge(PRESUPUESTO_ESTADO_LABELS[p.estado] || p.estado, PRESUPUESTO_ESTADO_COLORS[p.estado] || 'neutral') },
      { label: 'Total', align: 'right', render: (p) => `<span class="cell-currency">${formatCurrency(DataService.getPresupuestoTotal(p), p.moneda)}</span>` },
      { label: '', align: 'right', className: 'cell-actions', render: (p) => `
        <button class="btn btn-ghost btn-icon btn-sm" data-action="share" data-id="${p.id}" title="Compartir (WhatsApp / PDF)" style="color:#25D366">${Icons.whatsapp}</button>
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
      if (action === 'share') {
        const pres = DataService.getById('presupuestos', id);
        if (pres) openShareModal(pres);
      }
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
      items: [{ id: '1', descripcion: 'Pieza #1', largo: 0, ancho: 0, cantidad: 1, m2: 0, precioUnitario: 0, subtotal: 0 }],
      adicionales: { colocacion: 0, manoDeObra: 0, inglete: 0, transporte: 0, bacha: 0, zocalos: 0, extras: 0 },
      descuento: 0, impuestos: 21, condiciones: CONDICIONES_COMERCIALES_DEFAULT.join('\n')
    };

    const clientes = DataService.getAll('clientes');
    const materiales = DataService.getAll('materiales');

    const isNuevoInicial = !pres.clienteId && !!pres.clienteNombre;
    let selectedMatName = pres.material || (pres.items?.[0]?.material) || (materiales[0]?.nombre || '');
    let currentMaterial = materiales.find(m => m.nombre === selectedMatName) || materiales[0];
    
    // Si es edición de presupuesto existente, conservar el precioM2 histórico de creación; si es nuevo, tomar el precioM2 actual del material en stock
    let precioM2 = editId
      ? (pres.precioM2 || pres.items?.[0]?.precioUnitario || (currentMaterial?.precioM2 ?? currentMaterial?.precioVenta ?? 0))
      : (currentMaterial?.precioM2 ?? currentMaterial?.precioVenta ?? 0);

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

            <!-- Selector de tipo de cliente: Habitual vs Nuevo -->
            <div class="form-group">
              <label class="form-label">Tipo de cliente</label>
              <div class="client-type-toggle" id="client-type-toggle">
                <button type="button" class="client-type-btn ${!isNuevoInicial ? 'active' : ''}" data-type="habitual">Cliente habitual</button>
                <button type="button" class="client-type-btn ${isNuevoInicial ? 'active' : ''}" data-type="nuevo">Cliente nuevo</button>
              </div>
              <input type="hidden" name="tipoCliente" id="tipo-cliente-val" value="${isNuevoInicial ? 'nuevo' : 'habitual'}">
            </div>

            <div class="form-row-2">
              <div id="cliente-habitual-wrap" style="${isNuevoInicial ? 'display:none' : 'display:block'}">
                <div class="form-group mb-0">
                  <label class="form-label">Cliente habitual registrado <span class="required">*</span></label>
                  <select class="form-select" name="clienteId" id="pres-cliente-select">
                    <option value="">Seleccionar cliente...</option>
                    ${clientes.map(c => `<option value="${c.id}" ${pres.clienteId === c.id ? 'selected' : ''}>${c.nombre} ${c.apellido || ''}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div id="cliente-nuevo-wrap" style="${isNuevoInicial ? 'display:block' : 'display:none'}">
                <div class="form-group mb-0">
                  <label class="form-label">Nombre del cliente nuevo <span class="required">*</span></label>
                  <input type="text" class="form-input" name="clienteNombre" id="pres-cliente-nuevo-input" value="${escapeHtml(pres.clienteNombre || '')}" placeholder="Ej: Juan Pérez">
                </div>
              </div>

              <div class="form-group mb-0">
                <label class="form-label">Dirección de obra</label>
                <input type="text" class="form-input" name="direccion" id="pres-direccion-input" value="${escapeHtml(pres.direccion || '')}" placeholder="Ej: San Martín 450">
              </div>
            </div>

            <div class="form-group mt-3">
              <label class="form-label">Descripción del proyecto</label>
              <input type="text" class="form-input" name="descripcion" value="${escapeHtml(pres.descripcion || '')}" placeholder="Ej: Mesada de cocina en L con isla">
            </div>
          </div>

          <div class="presupuesto-form-section">
            <h4 class="presupuesto-form-section-title mb-2">${Icons.package} Material y Piezas</h4>
            
            <div class="form-group mb-2">
              <label class="form-label" style="font-weight:var(--font-bold);color:var(--color-stone-900)">
                Material – precio por m² precargado <span class="required">*</span>
              </label>
              <select class="form-select" id="pres-selected-material" name="material" style="font-weight:var(--font-medium);font-size:var(--text-base);padding:10px 14px">
                <option value="">Seleccionar material del catálogo...</option>
                ${materiales.map(m => {
                  const isSel = (selectedMatName === m.nombre);
                  const pM2 = m.precioM2 ?? m.precioVenta ?? 0;
                  return `<option value="${escapeHtml(m.nombre)}" ${isSel ? 'selected' : ''}>${escapeHtml(m.nombre)} — ${formatCurrency(pM2)} / m²</option>`;
                }).join('')}
              </select>
            </div>

            <button type="button" class="btn btn-secondary btn-sm" id="btn-add-item" style="width:100%;justify-content:center;margin-top:8px;margin-bottom:var(--space-4);padding:11px;font-weight:var(--font-semibold);border-style:dashed;border-color:var(--color-stone-300)">
              ${Icons.plus} Añadir ítem
            </button>

            <div class="presupuesto-items-list" id="items-body"></div>

            <div id="material-summary-banner"></div>
          </div>

          <div class="presupuesto-form-section">
            <h4 class="presupuesto-form-section-title">${Icons['dollar-sign']} Campos adicionales</h4>
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
                <label class="form-label">Inglete – Mano de obra</label>
                <input type="number" class="form-input calc-field" name="adic_inglete" value="${pres.adicionales?.inglete || 0}" min="0">
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
              <label class="form-label">IVA</label>
              <select class="form-select calc-field" name="impuestos" id="pres-iva-select">
                <option value="21" ${(Number(pres.impuestos) === 21 || (!pres.impuestos && pres.impuestos !== 0 && Number(pres.impuestos) !== 10.5)) ? 'selected' : ''}>IVA 21%</option>
                <option value="10.5" ${Number(pres.impuestos) === 10.5 ? 'selected' : ''}>IVA 10,5%</option>
                <option value="0" ${Number(pres.impuestos) === 0 ? 'selected' : ''}>Sin IVA (0%)</option>
              </select>
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

          <!-- Acciones directas dentro del formulario (visibles sin scroll en mobile y desktop) -->
          <div class="presupuesto-form-actions-box">
            <div style="font-size:13px;font-weight:var(--font-bold);color:var(--color-stone-800);display:flex;align-items:center;gap:6px">
              ${Icons.check} Acciones del presupuesto
            </div>
            <button type="button" class="btn btn-success btn-lg" id="btn-inline-save-share" style="width:100%;justify-content:center;background:#25D366;color:#fff;border-color:#25D366;font-weight:var(--font-bold);box-shadow:0 4px 12px rgba(37,211,102,0.25)">
              ${Icons.whatsapp} Guardar y Compartir presupuesto
            </button>
            <div style="display:flex;gap:var(--space-2)">
              <button type="button" class="btn btn-primary" id="btn-inline-save" style="flex:1;justify-content:center;font-weight:var(--font-semibold)">
                ${Icons.check} Guardar
              </button>
              <button type="button" class="btn btn-secondary" id="btn-inline-preview" style="flex:1;justify-content:center">
                ${Icons.eye} Vista previa
              </button>
            </div>
          </div>
        </form>
      `,
      headerActions: `
        <button type="button" class="btn btn-primary btn-sm" id="drawer-header-save" style="font-weight:var(--font-semibold)">${Icons.check} Guardar</button>
      `,
      footer: `
        <button type="button" class="btn btn-secondary" id="drawer-cancel">Cancelar</button>
        <button type="button" class="btn btn-secondary" id="drawer-preview-btn">${Icons.eye} Vista previa</button>
        <button type="button" class="btn btn-primary" id="drawer-save">${Icons.check} Guardar</button>
        <button type="button" class="btn btn-success btn-full-mobile" id="drawer-save-share" style="background:#25D366;color:#fff;border-color:#25D366;font-weight:var(--font-bold)">${Icons.whatsapp} Guardar y Compartir</button>
      `
    });

    // Setup Client Type Toggle
    const toggleWrap = document.getElementById('client-type-toggle');
    const tipoVal = document.getElementById('tipo-cliente-val');
    const habWrap = document.getElementById('cliente-habitual-wrap');
    const nueWrap = document.getElementById('cliente-nuevo-wrap');
    const cliSelect = document.getElementById('pres-cliente-select');
    const dirInput = document.getElementById('pres-direccion-input');

    toggleWrap?.querySelectorAll('.client-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        tipoVal.value = type;
        toggleWrap.querySelectorAll('.client-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (type === 'habitual') {
          habWrap.style.display = 'block';
          nueWrap.style.display = 'none';
        } else {
          habWrap.style.display = 'none';
          nueWrap.style.display = 'block';
        }
      });
    });

    cliSelect?.addEventListener('change', (e) => {
      const selectedCli = clientes.find(c => c.id === e.target.value);
      if (selectedCli && dirInput && !dirInput.value) {
        dirInput.value = selectedCli.direccion || '';
      }
    });

    // Setup Items and Calculation
    const itemsBody = document.getElementById('items-body');
    const matSelect = document.getElementById('pres-selected-material');
    const matSummaryEl = document.getElementById('material-summary-banner');

    let items = (pres.items && pres.items.length > 0)
      ? pres.items.map((it, idx) => ({
          id: it.id || (idx + 1).toString(),
          descripcion: it.descripcion || `Ítem ${idx + 1}`,
          material: selectedMatName,
          cantidad: Math.max(1, parseFloat(it.cantidad) || 1),
          largo: parseFloat(it.largo) || 0,
          ancho: parseFloat(it.ancho) || 0,
          m2: parseFloat(it.m2) || 0,
          precioUnitario: precioM2,
          subtotal: parseFloat(it.subtotal) || 0
        }))
      : [
          { id: '1', descripcion: 'Ítem 1', material: selectedMatName, cantidad: 1, largo: 0, ancho: 0, m2: 0, precioUnitario: precioM2, subtotal: 0 }
        ];

    function calculateItem(it) {
      const cant = Math.max(1, parseFloat(it.cantidad) || 1);
      const largo = Math.max(0, parseFloat(it.largo) || 0);
      const ancho = Math.max(0, parseFloat(it.ancho) || 0);
      if (largo > 0 && ancho > 0) {
        it.m2 = ((largo * ancho) / 10000) * cant;
      } else if (largo > 0 && ancho === 0) {
        it.m2 = (largo / 100) * cant;
      } else {
        it.m2 = 0;
      }
      it.material = selectedMatName;
      it.precioUnitario = precioM2;
      it.subtotal = it.m2 * precioM2;
    }

    items.forEach(it => calculateItem(it));

    function renderMaterialSummary() {
      const totalM2 = items.reduce((sum, it) => sum + (it.m2 || 0), 0);
      const totalSubtotal = items.reduce((sum, it) => sum + (it.subtotal || 0), 0);
      if (matSummaryEl) {
        matSummaryEl.innerHTML = `
          <div class="material-summary-box">
            <div>
              <div style="font-size:13px;font-weight:var(--font-bold);color:var(--color-stone-900)">
                ${escapeHtml(selectedMatName || 'Sin material seleccionado')}
              </div>
              <div style="font-size:12px;color:var(--color-stone-600);margin-top:2px">
                Suma total: <strong>${totalM2.toFixed(2)} m²</strong> · Precio por m²: <strong>${formatCurrency(precioM2)} / m²</strong>
              </div>
            </div>
            <div style="text-align:right">
              <div style="font-size:11px;color:var(--color-stone-500);text-transform:uppercase;letter-spacing:0.5px">Subtotal material</div>
              <div style="font-size:16px;font-weight:var(--font-bold);color:var(--color-stone-900)">${formatCurrency(totalSubtotal)}</div>
            </div>
          </div>
        `;
      }
    }

    function renderItems() {
      itemsBody.innerHTML = items.map((item, idx) => `
        <div class="pres-item-card compact-item-card" data-idx="${idx}">
          <div class="pres-item-header" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <div style="display:flex;align-items:center;gap:8px;flex:1">
              <span class="pres-item-badge">Ítem ${idx + 1}</span>
              <input type="text" class="form-input item-field item-desc-input" data-field="descripcion" value="${escapeHtml(item.descripcion || `Ítem ${idx + 1}`)}" placeholder="Nombre de pieza (ej: Mesada, Isla, Alzada)" style="height:34px;font-size:13px;font-weight:var(--font-semibold);padding:4px 8px;flex:1;max-width:260px">
            </div>
            ${items.length > 1 ? `
              <button type="button" class="btn btn-ghost btn-sm row-remove" data-idx="${idx}" title="Eliminar ítem" style="color:var(--color-error);padding:4px 8px">
                ${Icons.trash} <span style="font-size:12px">Quitar</span>
              </button>
            ` : ''}
          </div>

          <div class="pres-item-metrics-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(85px, 1fr));gap:8px">
            <div class="form-group mb-0">
              <label class="form-label-sm">Largo (cm)</label>
              <input type="number" class="form-input item-field" data-field="largo" value="${item.largo || ''}" min="0" placeholder="Ej: 220" style="padding:8px">
            </div>
            <div class="form-group mb-0">
              <label class="form-label-sm">Ancho (cm)</label>
              <input type="number" class="form-input item-field" data-field="ancho" value="${item.ancho || ''}" min="0" placeholder="Ej: 60" style="padding:8px">
            </div>
            <div class="form-group mb-0">
              <label class="form-label-sm">Cantidad</label>
              <input type="number" class="form-input item-field" data-field="cantidad" value="${item.cantidad || 1}" min="1" style="padding:8px">
            </div>
            <div class="form-group mb-0">
              <label class="form-label-sm">Superficie</label>
              <div class="item-m2-pill" style="justify-content:center;height:38px;padding:0 8px">
                <span class="item-m2" style="font-weight:var(--font-bold)">${(item.m2 || 0).toFixed(2)}</span>&nbsp;m²
              </div>
            </div>
          </div>

          <div class="pres-item-footer-bar" style="margin-top:8px;padding:6px 10px;font-size:12px;background:var(--color-stone-50);border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center">
            <span style="color:var(--color-stone-600)">${(item.m2 || 0).toFixed(2)} m² × ${formatCurrency(precioM2)}/m²</span>
            <span class="item-subtotal-val" style="font-weight:var(--font-bold);color:var(--color-stone-900)">${formatCurrency(item.subtotal || 0)}</span>
          </div>
        </div>
      `).join('');

      // Field events
      itemsBody.querySelectorAll('.item-field').forEach(input => {
        input.addEventListener('input', () => {
          const card = input.closest('.pres-item-card');
          const idx = parseInt(card.dataset.idx);
          const field = input.dataset.field;
          let val = input.value;
          if (['cantidad', 'largo', 'ancho'].includes(field)) {
            val = parseFloat(val) || 0;
          }
          items[idx][field] = val;
          calculateItem(items[idx]);

          const m2El = card.querySelector('.item-m2');
          if (m2El) m2El.textContent = (items[idx].m2 || 0).toFixed(2);
          const subEl = card.querySelector('.item-subtotal-val');
          if (subEl) subEl.textContent = formatCurrency(items[idx].subtotal || 0);

          renderMaterialSummary();
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
          renderMaterialSummary();
          updateSummary();
          Toast.info('Ítem eliminado');
        });
      });
    }

    matSelect?.addEventListener('change', (e) => {
      selectedMatName = e.target.value;
      const mat = materiales.find(m => m.nombre === selectedMatName);
      precioM2 = mat ? (mat.precioM2 ?? mat.precioVenta ?? 0) : 0;
      items.forEach(it => calculateItem(it));
      renderItems();
      renderMaterialSummary();
      updateSummary();
    });

    document.getElementById('btn-add-item')?.addEventListener('click', () => {
      items.push({
        id: Date.now().toString(),
        descripcion: `Ítem ${items.length + 1}`,
        material: selectedMatName,
        cantidad: 1,
        largo: 0,
        ancho: 0,
        m2: 0,
        precioUnitario: precioM2,
        subtotal: 0
      });
      renderItems();
      renderMaterialSummary();
      updateSummary();
      Toast.info('Nuevo ítem añadido');
    });

    function updateSummary() {
      const form = document.getElementById('pres-form');
      if (!form) return;
      const itemsTotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
      const adics = ['colocacion', 'manoDeObra', 'inglete', 'transporte', 'bacha', 'zocalos', 'extras'];
      const adicsTotal = adics.reduce((s, k) => s + (parseFloat(form.querySelector(`[name="adic_${k}"]`)?.value) || 0), 0);
      const subtotal = itemsTotal + adicsTotal;
      const desc = parseFloat(form.querySelector('[name="descuento"]')?.value) || 0;
      const imp = parseFloat(form.querySelector('[name="impuestos"]')?.value) || 0;
      const descMonto = subtotal * desc / 100;
      const impMonto = (subtotal - descMonto) * imp / 100;
      const total = subtotal - descMonto + impMonto;

      const sumEl = document.getElementById('pres-summary');
      if (sumEl) {
        sumEl.innerHTML = `
          <div class="summary-row"><span class="summary-row-label">Subtotal materiales e ítems</span><span class="summary-row-value">${formatCurrency(itemsTotal)}</span></div>
          <div class="summary-row"><span class="summary-row-label">Campos adicionales</span><span class="summary-row-value">${formatCurrency(adicsTotal)}</span></div>
          ${desc > 0 ? `<div class="summary-row"><span class="summary-row-label">Descuento (${desc}%)</span><span class="summary-row-value" style="color:var(--color-error)">-${formatCurrency(descMonto)}</span></div>` : ''}
          ${imp > 0 ? `<div class="summary-row"><span class="summary-row-label">IVA (${imp}%)</span><span class="summary-row-value">${formatCurrency(impMonto)}</span></div>` : ''}
          <div class="summary-row total"><span class="summary-row-label">Total Presupuesto</span><span class="summary-row-value">${formatCurrency(total)}</span></div>
        `;
      }
    }

    renderItems();
    renderMaterialSummary();
    updateSummary();

    document.querySelectorAll('.calc-field').forEach(f => {
      f.addEventListener('input', updateSummary);
      f.addEventListener('change', updateSummary);
    });

    function previewDraft() {
      const form = document.getElementById('pres-form');
      if (!form) return;
      const fd = new FormData(form);
      const data = Object.fromEntries(fd);
      const tipoCliente = data.tipoCliente || 'habitual';
      let cli = null;
      if (tipoCliente === 'habitual') {
        cli = clientes.find(c => c.id === data.clienteId) || null;
      } else {
        cli = { nombre: data.clienteNombre || 'Cliente ocasional', apellido: '', direccion: data.direccion || '' };
      }
      const adics = ['colocacion', 'manoDeObra', 'inglete', 'transporte', 'bacha', 'zocalos', 'extras'];
      const adicionales = {};
      adics.forEach(k => { adicionales[k] = parseFloat(data[`adic_${k}`]) || 0; });
      const draftPres = {
        ...pres,
        ...data,
        material: selectedMatName,
        precioM2,
        items,
        adicionales,
        descuento: parseFloat(data.descuento) || 0,
        impuestos: parseFloat(data.impuestos) || 0
      };
      const draftTotal = DataService.getPresupuestoTotal(draftPres);
      DocumentModal.open({
        title: `Vista previa — ${draftPres.numero}`,
        filename: `Presupuesto_${draftPres.numero}`,
        htmlContent: generatePresupuestoHtml(draftPres, cli, draftTotal)
      });
    }

    function savePresupuesto(andShare = false) {
      const form = document.getElementById('pres-form');
      if (!form) return;
      const fd = new FormData(form);
      const data = Object.fromEntries(fd);

      const tipoCliente = data.tipoCliente || 'habitual';
      if (tipoCliente === 'habitual') {
        if (!data.clienteId) {
          Toast.warning('Seleccioná un cliente habitual para el presupuesto');
          return;
        }
        data.clienteNombre = null;
      } else {
        const nombre = (data.clienteNombre || '').trim();
        if (!nombre) {
          Toast.warning('Ingresá el nombre del cliente nuevo');
          return;
        }
        data.clienteNombre = nombre;
        data.clienteId = null;
      }

      if (!items || items.length === 0) {
        Toast.warning('Agregá al menos un ítem al presupuesto');
        return;
      }

      const adics = ['colocacion', 'manoDeObra', 'inglete', 'transporte', 'bacha', 'zocalos', 'extras'];
      const adicionales = {};
      adics.forEach(k => { adicionales[k] = parseFloat(data[`adic_${k}`]) || 0; delete data[`adic_${k}`]; });

      const record = {
        ...data,
        material: selectedMatName,
        precioM2,
        items,
        adicionales,
        descuento: parseFloat(data.descuento) || 0,
        impuestos: parseFloat(data.impuestos) || 0
      };

      let saved;
      if (editId) {
        saved = DataService.update('presupuestos', editId, record);
        Toast.success('Presupuesto actualizado');
      } else {
        saved = DataService.create('presupuestos', record);
        Toast.success('Presupuesto guardado con éxito');
      }
      Drawer.close();
      presupuestos = DataService.getAll('presupuestos');
      render();

      if (andShare && saved) {
        setTimeout(() => {
          openShareModal(saved);
        }, 360);
      }
    }

    document.getElementById('drawer-cancel')?.addEventListener('click', () => Drawer.close());
    document.getElementById('drawer-save')?.addEventListener('click', () => savePresupuesto(false));
    document.getElementById('drawer-header-save')?.addEventListener('click', () => savePresupuesto(false));
    document.getElementById('btn-inline-save')?.addEventListener('click', () => savePresupuesto(false));

    document.getElementById('drawer-save-share')?.addEventListener('click', () => savePresupuesto(true));
    document.getElementById('btn-inline-save-share')?.addEventListener('click', () => savePresupuesto(true));

    document.getElementById('drawer-preview-btn')?.addEventListener('click', previewDraft);
    document.getElementById('btn-inline-preview')?.addEventListener('click', previewDraft);
  }

  function openShareModal(pres) {
    if (!pres) return;
    const cliente = DataService.getById('clientes', pres.clienteId);
    const total = DataService.getPresupuestoTotal(pres);
    const getDocHtml = () => generatePresupuestoHtml(pres, cliente, total);
    const docFilename = `Presupuesto_${pres.numero}`;

    const cliName = cliente ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : (pres.clienteNombre || 'Cliente');
    const cliPhone = cliente?.whatsapp || cliente?.telefono || '';
    const cleanPhone = cliPhone.replace(/\D/g, '');

    const shareMsg = `Hola ${cliName}! Te adjunto el presupuesto *${pres.numero}* de Marmolería Benjamin.\n\n*Detalle:* ${pres.descripcion || 'Trabajo a medida en marmolería'}\n*Total:* ${formatCurrency(total, pres.moneda)}\n\nCualquier consulta estamos a disposición.`;

    Modal.open({
      title: `Compartir ${pres.numero}`,
      size: 'md',
      content: `
        <div style="text-align:center;margin-bottom:var(--space-4);padding-bottom:var(--space-3);border-bottom:1px solid var(--color-stone-200)">
          <div style="font-size:var(--text-lg);font-weight:var(--font-bold);color:var(--color-stone-900)">${pres.numero}</div>
          <div class="text-muted" style="font-size:var(--text-sm);margin-top:2px">
            ${escapeHtml(cliName)} · Total: <strong style="color:var(--color-stone-900)">${formatCurrency(total, pres.moneda)}</strong>
          </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:var(--space-3)">
          <!-- WhatsApp -->
          <div class="card" style="border:1.5px solid #25D366;background:rgba(37,211,102,0.06);padding:var(--space-3);border-radius:var(--radius-lg)">
            <div style="font-size:var(--text-xs);font-weight:var(--font-bold);color:#128C7E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:flex;align-items:center;gap:6px">
              ${Icons.whatsapp} Enviar por WhatsApp
            </div>
            <div class="form-group mb-2">
              <label class="form-label-sm" style="font-size:12px">Teléfono / WhatsApp de destino</label>
              <div style="display:flex;gap:6px">
                <input type="text" class="form-input" id="share-modal-phone" value="${escapeHtml(cleanPhone)}" placeholder="Ej: 5491145678901">
                <button type="button" class="btn btn-success" id="share-modal-wa-btn" style="background:#25D366;color:#fff;border-color:#25D366;white-space:nowrap;font-weight:var(--font-bold)">
                  ${Icons.whatsapp} Abrir chat
                </button>
              </div>
              <span class="text-muted" style="font-size:11px;display:block;margin-top:4px">Abre WhatsApp con el mensaje oficial listo para enviar</span>
            </div>
          </div>

          <!-- Descargas directas -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)">
            <button type="button" class="btn btn-pdf" id="share-modal-pdf-btn" style="justify-content:center;height:44px">
              ${Icons['file-pdf']} Descargar PDF
            </button>
            <button type="button" class="btn btn-word" id="share-modal-word-btn" style="justify-content:center;height:44px">
              ${Icons['file-word']} Descargar Word
            </button>
          </div>

          <!-- Vista previa & Copiar -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--space-2)">
            <button type="button" class="btn btn-secondary" id="share-modal-preview-btn" style="justify-content:center;height:42px">
              ${Icons.eye} Vista previa
            </button>
            <button type="button" class="btn btn-secondary" id="share-modal-copy-btn" style="justify-content:center;height:42px">
              ${Icons.copy} Copiar texto
            </button>
          </div>

          <a href="#/presupuestos/${pres.id}" class="btn btn-ghost" id="share-modal-detail-link" style="justify-content:center;margin-top:var(--space-2);color:var(--color-stone-600)">
            Ver detalle completo del presupuesto →
          </a>
        </div>
      `,
      footer: `
        <button type="button" class="btn btn-secondary w-full" id="share-modal-close" style="width:100%;justify-content:center">Cerrar</button>
      `
    });

    document.getElementById('share-modal-close')?.addEventListener('click', () => Modal.close());
    document.getElementById('share-modal-detail-link')?.addEventListener('click', () => Modal.close());

    document.getElementById('share-modal-wa-btn')?.addEventListener('click', () => {
      const phoneInput = document.getElementById('share-modal-phone');
      const phone = phoneInput ? phoneInput.value.replace(/\D/g, '') : cleanPhone;
      if (phone) {
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(shareMsg)}`, '_blank');
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareMsg)}`, '_blank');
      }
    });

    document.getElementById('share-modal-pdf-btn')?.addEventListener('click', async () => {
      Toast.info('Generando PDF', 'Preparando documento...');
      const ok = await exportToPdf(getDocHtml(), docFilename);
      if (ok) Toast.success('PDF descargado con éxito');
    });

    document.getElementById('share-modal-word-btn')?.addEventListener('click', () => {
      try {
        exportToWord(getDocHtml(), docFilename);
        Toast.success('Documento Word descargado');
      } catch (e) {
        Toast.error('Error al exportar a Word');
      }
    });

    document.getElementById('share-modal-preview-btn')?.addEventListener('click', () => {
      Modal.close();
      DocumentModal.open({
        title: `Presupuesto ${pres.numero}`,
        filename: docFilename,
        htmlContent: getDocHtml()
      });
    });

    document.getElementById('share-modal-copy-btn')?.addEventListener('click', () => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareMsg).then(() => {
          Toast.success('Texto copiado al portapapeles');
        }).catch(() => {
          Toast.info('Mensaje', shareMsg);
        });
      } else {
        Toast.info('Mensaje', shareMsg);
      }
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
  const adicEntries = Object.entries({
    Colocación: adic.colocacion,
    'Mano de obra': adic.manoDeObra,
    'Inglete – Mano de obra': adic.inglete,
    Transporte: adic.transporte,
    Bacha: adic.bacha,
    Zócalos: adic.zocalos,
    Extras: adic.extras
  }).filter(([, v]) => v > 0);

  container.innerHTML = `
    <!-- Action buttons bar -->
    <div class="card mb-4">
      <div class="card-body" style="display:flex;gap:var(--space-2);flex-wrap:wrap">
        <button class="btn btn-success" id="btn-share-modal" style="flex:1;min-width:130px;justify-content:center;background:#25D366;color:#fff;border-color:#25D366;font-weight:var(--font-bold)">${Icons.whatsapp} Compartir</button>
        <button class="btn btn-pdf" id="btn-pdf" style="flex:1;min-width:130px;justify-content:center">${Icons['file-pdf']} Descargar PDF</button>
        <button class="btn btn-word" id="btn-word" style="flex:1;min-width:130px;justify-content:center">${Icons['file-word']} Descargar Word</button>
        <button class="btn btn-secondary" id="btn-preview" style="flex:1;min-width:130px;justify-content:center">${Icons.eye} Vista previa</button>
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
            <span class="detail-value">${cliente ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : escapeHtml(pres.clienteNombre || 'Cliente ocasional')}</span>
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
  document.getElementById('btn-share-modal')?.addEventListener('click', () => openShareModal(pres));

  // WhatsApp
  document.getElementById('btn-whatsapp')?.addEventListener('click', () => {
    const msg = `Hola! Te envío el presupuesto ${pres.numero} de Marmolería Benjamin.\n\n${pres.descripcion}\nTotal: ${formatCurrency(total, pres.moneda)}\n\n¡Saludos!`;
    window.open(`https://wa.me/${cliente.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank');
  });
}
