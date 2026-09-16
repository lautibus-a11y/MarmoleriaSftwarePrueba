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
import { openEventoForm } from './calendario.js';
import { openDescontarStockObraModal } from '../services/stockAutomation.js';

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
        <button class="btn btn-ghost btn-icon btn-sm" data-action="schedule" data-id="${p.id}" title="Agendar en calendario">${Icons.calendar}</button>
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
        if (!pres) return;
        const cli = pres.clienteId ? DataService.getById('clientes', pres.clienteId) : null;
        const tot = DataService.getPresupuestoTotal(pres);
        DocumentModal.open({
          title: `Presupuesto ${pres.numero || pres.id}`,
          filename: `Presupuesto_${pres.numero || pres.id}`,
          htmlContent: generatePresupuestoHtml(pres, cli, tot)
        });
      }
      if (action === 'edit') openPresupuestoForm(id);
      if (action === 'schedule') {
        const pres = DataService.getById('presupuestos', id);
        if (pres) {
          const matList = [...new Set((pres.items || []).map(i => i.material).filter(Boolean))].join(', ') || pres.material || '';
          openEventoForm({
            clienteId: pres.clienteId,
            clienteNombre: pres.clienteNombre,
            presupuestoId: pres.id,
            direccion: pres.direccion,
            notas: matList ? `Materiales: ${matList}` : (pres.descripcion || ''),
            tipo: 'instalacion'
          });
        }
      }
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
    const found = editId ? DataService.getById('presupuestos', editId) : null;
    const isEdit = !!editId && !!found;
    const pres = found ? { ...found } : {
      numero: generateAutoNumber('PRES', DataService.getAll('presupuestos')),
      fecha: new Date().toISOString().split('T')[0],
      moneda: 'ARS', estado: 'borrador',
      items: [{ id: '1', descripcion: 'Pieza #1', largo: 0, ancho: 0, cantidad: 1, m2: 0, precioUnitario: 0, subtotal: 0 }],
      adicionales: { colocacion: 0, manoDeObra: 0, inglete: 0, transporte: 0, bacha: 0, zocalos: 0, extras: 0 },
      descuento: 0, impuestos: 21, condiciones: CONDICIONES_COMERCIALES_DEFAULT.join('\n')
    };

    const clientes = DataService.getAll('clientes').filter(Boolean);
    const materiales = DataService.getAll('materiales').filter(Boolean);

    const isNuevoInicial = !pres.clienteId && !!pres.clienteNombre;

    Drawer.open({
      title: isEdit ? `Editar ${pres.numero || 'presupuesto'}` : 'Nuevo presupuesto',
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
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-3)">
              <h4 class="presupuesto-form-section-title mb-0">${Icons.package} Ítems del presupuesto</h4>
              <span class="text-muted" style="font-size:12px;font-weight:var(--font-medium)">Material independiente por ítem</span>
            </div>

            <div class="presupuesto-items-list" id="items-body"></div>

            <button type="button" class="btn btn-secondary" id="btn-add-item" style="width:100%;justify-content:center;margin-top:var(--space-2);margin-bottom:var(--space-3);padding:11px;font-weight:var(--font-semibold);border:1.5px dashed var(--color-stone-300);border-radius:var(--radius-lg);gap:8px">
              ${Icons.plus} Añadir ítem
            </button>

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
    const matSummaryEl = document.getElementById('material-summary-banner');

    const defaultFirstMat = materiales[0]?.nombre || '';
    const defaultFirstMatPrice = materiales[0] ? (materiales[0].precioM2 ?? materiales[0].precioVenta ?? 0) : 0;

    let items = (pres.items && pres.items.length > 0)
      ? pres.items.map((it, idx) => {
          const matName = it.material || pres.material || defaultFirstMat;
          const matObj = materiales.find(m => m.nombre === matName);
          const pM2 = it.precioUnitario || (matObj ? (matObj.precioM2 ?? matObj.precioVenta ?? 0) : defaultFirstMatPrice);
          const largoNorm = (it.largo && it.largo > 10) ? +(it.largo / 100).toFixed(2) : (it.largo !== undefined && it.largo !== null ? it.largo : '');
          const anchoNorm = (it.ancho && it.ancho > 10) ? +(it.ancho / 100).toFixed(2) : (it.ancho !== undefined && it.ancho !== null ? it.ancho : '');
          return {
            id: it.id || (idx + 1).toString(),
            descripcion: it.descripcion || `Ítem ${idx + 1}`,
            material: matName,
            cantidad: Math.max(1, parseFloat(it.cantidad) || 1),
            largo: largoNorm,
            ancho: anchoNorm,
            m2: parseFloat(it.m2) || 0,
            precioUnitario: pM2,
            subtotal: parseFloat(it.subtotal) || 0
          };
        })
      : [
          {
            id: '1',
            descripcion: 'Ítem 1',
            material: defaultFirstMat,
            cantidad: 1,
            largo: '',
            ancho: '',
            m2: 0,
            precioUnitario: defaultFirstMatPrice,
            subtotal: 0
          }
        ];

    function calculateItem(it) {
      const cant = Math.max(1, parseFloat(it.cantidad) || 1);
      const largo = Math.max(0, parseFloat(String(it.largo).replace(',', '.')) || 0);
      const ancho = Math.max(0, parseFloat(String(it.ancho).replace(',', '.')) || 0);

      if (largo > 0 && ancho > 0) {
        it.m2 = (largo * ancho) * cant;
      } else if (largo > 0 && ancho === 0) {
        it.m2 = largo * cant;
      } else {
        it.m2 = 0;
      }

      // Obtener precio por m² del material seleccionado desde Stock e Inventario
      const mat = materiales.find(m => m.nombre === it.material);
      if (mat) {
        it.precioUnitario = mat.precioM2 ?? mat.precioVenta ?? 0;
      } else if (!it.precioUnitario) {
        it.precioUnitario = 0;
      }

      it.subtotal = it.m2 * it.precioUnitario;
    }

    items.forEach(it => calculateItem(it));

    function renderMaterialSummary() {
      if (!matSummaryEl) return;
      const matGroups = {};
      items.forEach(it => {
        const matName = it.material || 'Sin material especificado';
        if (!matGroups[matName]) {
          matGroups[matName] = { totalM2: 0, subtotal: 0, count: 0, precioM2: it.precioUnitario || 0 };
        }
        matGroups[matName].totalM2 += (it.m2 || 0);
        matGroups[matName].subtotal += (it.subtotal || 0);
        matGroups[matName].count += 1;
      });

      const groupEntries = Object.entries(matGroups);
      const totalM2 = items.reduce((sum, it) => sum + (it.m2 || 0), 0);

      matSummaryEl.innerHTML = `
        <div class="material-breakdown-box">
          <div class="material-breakdown-header">
            <span>Materiales seleccionados (${groupEntries.length})</span>
            <span style="font-size:11px;font-weight:var(--font-bold);color:var(--color-stone-900)">Total: ${totalM2.toFixed(2)} m²</span>
          </div>
          <div class="material-breakdown-list">
            ${groupEntries.map(([mat, data]) => `
              <div class="material-breakdown-row">
                <div>
                  <strong>${escapeHtml(mat)}</strong>
                  <span style="color:var(--color-stone-500);font-size:11px;margin-left:4px">(${data.count} ${data.count === 1 ? 'ítem' : 'ítems'})</span>
                </div>
                <div style="display:flex;gap:12px;align-items:center">
                  <span style="color:var(--color-stone-600)">${data.totalM2.toFixed(2)} m²</span>
                  <strong style="font-family:var(--font-mono);color:var(--color-stone-900)">${formatCurrency(data.subtotal)}</strong>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    function renderItems() {
      itemsBody.innerHTML = items.map((item, idx) => `
        <div class="pres-item-card" data-idx="${idx}">
          <div class="pres-item-header">
            <div class="pres-item-title-wrap">
              <span class="pres-item-badge">Ítem ${idx + 1}</span>
              <input type="text" class="form-input pres-item-desc-input item-field" data-field="descripcion" value="${escapeHtml(item.descripcion || `Ítem ${idx + 1}`)}" placeholder="Pieza (ej: Mesada, Isla)">
            </div>
            ${items.length > 1 ? `
              <button type="button" class="btn btn-ghost btn-sm row-remove" data-idx="${idx}" title="Eliminar ítem" style="color:var(--color-error);padding:3px 8px;gap:4px">
                ${Icons.trash} <span style="font-size:11.5px;font-weight:var(--font-semibold)">Eliminar</span>
              </button>
            ` : ''}
          </div>

          <!-- Selector de Material independiente por cada ítem -->
          <div class="form-group mb-2">
            <label class="form-label-sm">Material <span class="required">*</span></label>
            <select class="form-select item-field item-material-select" data-field="material">
              <option value="">Seleccionar material del catálogo...</option>
              ${materiales.map(m => {
                const isSel = (item.material === m.nombre);
                const pM2 = m.precioM2 ?? m.precioVenta ?? 0;
                return `<option value="${escapeHtml(m.nombre)}" ${isSel ? 'selected' : ''}>${escapeHtml(m.nombre)} — ${formatCurrency(pM2)} / m²</option>`;
              }).join('')}
            </select>
          </div>

          <!-- Medidas: Largo y Ancho (en metros) + Cantidad -->
          <div class="pres-item-measures-grid">
            <div class="form-group mb-0">
              <label class="form-label-sm">Largo (m)</label>
              <input type="number" step="0.01" min="0" inputmode="decimal" class="form-input item-field" data-field="largo" value="${item.largo || ''}" placeholder="Ej: 1.20">
            </div>
            <div class="form-group mb-0">
              <label class="form-label-sm">Ancho (m)</label>
              <input type="number" step="0.01" min="0" inputmode="decimal" class="form-input item-field" data-field="ancho" value="${item.ancho || ''}" placeholder="Ej: 0.60">
            </div>
            <div class="form-group mb-0">
              <label class="form-label-sm">Cant.</label>
              <input type="number" step="1" min="1" inputmode="numeric" class="form-input item-field" data-field="cantidad" value="${item.cantidad || 1}">
            </div>
          </div>

          <!-- Resumen de cálculo del ítem: m², Precio/m², Subtotal -->
          <div class="pres-item-calc-footer">
            <div class="pres-item-stat-pill">
              <span class="pres-item-stat-label">m²</span>
              <span class="pres-item-stat-val item-m2">${(item.m2 || 0).toFixed(2)}</span>
            </div>
            <div class="pres-item-stat-pill">
              <span class="pres-item-stat-label">Precio / m²</span>
              <span class="pres-item-stat-val item-precio-val">${formatCurrency(item.precioUnitario || 0)}</span>
            </div>
            <div class="pres-item-stat-pill subtotal-pill">
              <span class="pres-item-stat-label">Subtotal</span>
              <span class="pres-item-stat-val item-subtotal-val">${formatCurrency(item.subtotal || 0)}</span>
            </div>
          </div>
        </div>
      `).join('');

      // Field events
      itemsBody.querySelectorAll('.item-field').forEach(input => {
        const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
        input.addEventListener(eventName, () => {
          const card = input.closest('.pres-item-card');
          const idx = parseInt(card.dataset.idx);
          const field = input.dataset.field;
          let val = input.value;

          if (field === 'material') {
            items[idx].material = val;
            const mat = materiales.find(m => m.nombre === val);
            items[idx].precioUnitario = mat ? (mat.precioM2 ?? mat.precioVenta ?? 0) : 0;
            calculateItem(items[idx]);

            const precioEl = card.querySelector('.item-precio-val');
            if (precioEl) precioEl.textContent = formatCurrency(items[idx].precioUnitario || 0);
            const m2El = card.querySelector('.item-m2');
            if (m2El) m2El.textContent = (items[idx].m2 || 0).toFixed(2);
            const subEl = card.querySelector('.item-subtotal-val');
            if (subEl) subEl.textContent = formatCurrency(items[idx].subtotal || 0);
          } else {
            if (['cantidad', 'largo', 'ancho'].includes(field)) {
              items[idx][field] = val;
            } else {
              items[idx][field] = val;
            }
            calculateItem(items[idx]);

            const m2El = card.querySelector('.item-m2');
            if (m2El) m2El.textContent = (items[idx].m2 || 0).toFixed(2);
            const subEl = card.querySelector('.item-subtotal-val');
            if (subEl) subEl.textContent = formatCurrency(items[idx].subtotal || 0);
          }

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

    // Botón + Añadir ítem: Poder elegir el mismo material del ítem anterior o cualquier otro material
    document.getElementById('btn-add-item')?.addEventListener('click', () => {
      const lastItem = items[items.length - 1];
      const defaultMatName = lastItem?.material || (materiales[0]?.nombre || '');
      const defaultMat = materiales.find(m => m.nombre === defaultMatName) || materiales[0];
      const pM2 = defaultMat ? (defaultMat.precioM2 ?? defaultMat.precioVenta ?? 0) : 0;

      items.push({
        id: Date.now().toString(),
        descripcion: `Ítem ${items.length + 1}`,
        material: defaultMatName,
        cantidad: 1,
        largo: '',
        ancho: '',
        m2: 0,
        precioUnitario: pM2,
        subtotal: 0
      });
      renderItems();
      renderMaterialSummary();
      updateSummary();
      Toast.info(`Ítem ${items.length} añadido`);
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

      const matList = [...new Set(items.map(i => i.material).filter(Boolean))].join(', ');
      const draftPres = {
        ...pres,
        ...data,
        material: matList || items[0]?.material || '',
        precioM2: items[0]?.precioUnitario || 0,
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

      const matList = [...new Set(items.map(i => i.material).filter(Boolean))].join(', ');
      const record = {
        ...data,
        material: matList || items[0]?.material || '',
        precioM2: items[0]?.precioUnitario || 0,
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
    if (!pres) return;
    const confirmed = await confirmDialog({ title: 'Eliminar presupuesto', message: `¿Eliminar ${pres.numero || 'este presupuesto'}?`, confirmText: 'Eliminar', type: 'danger' });
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
        <button class="btn btn-secondary" id="btn-agendar-pres" style="flex:1;min-width:140px;justify-content:center;font-weight:var(--font-semibold)">${Icons.calendar} Agendar trabajo</button>
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
          ${(pres.items || []).map((item, idx) => {
            const formatMeasure = (val) => {
              if (!val && val !== 0) return '-';
              const n = parseFloat(val);
              if (isNaN(n) || n === 0) return '-';
              if (n > 10) return (n / 100).toFixed(2) + ' m';
              return n.toFixed(2) + ' m';
            };
            return `
            <div class="detail-item-card">
              <div class="detail-item-card-top">
                <span class="detail-item-card-desc"><strong>#${idx + 1}</strong> — ${escapeHtml(item.descripcion || `Ítem ${idx + 1}`)}</span>
                <span class="badge badge-neutral" style="font-weight:var(--font-bold)">${escapeHtml(item.material || 'Sin material')}</span>
              </div>
              <div class="detail-item-card-grid">
                <div><span class="text-muted">Cantidad:</span> <strong>${item.cantidad || 1} ${item.cantidad > 1 ? 'piezas' : 'pieza'}</strong></div>
                <div><span class="text-muted">Medidas:</span> <strong>${formatMeasure(item.largo)} × ${formatMeasure(item.ancho)}</strong></div>
                <div><span class="text-muted">Superficie total:</span> <strong>${(item.m2 || 0).toFixed(2)} m²</strong></div>
                <div><span class="text-muted">Precio por m²:</span> <strong>${formatCurrency(item.precioUnitario || 0)}</strong></div>
              </div>
              <div class="detail-item-card-subtotal">
                <span class="text-muted">Subtotal ítem:</span>
                <strong>${formatCurrency(item.subtotal || 0)}</strong>
              </div>
            </div>
          `}).join('')}
        </div>
      </div>
    </div>

    <div class="summary-box mb-4">
      <div class="summary-row"><span class="summary-row-label">Subtotal ítems</span><span class="summary-row-value">${formatCurrency((pres.items || []).reduce((s, i) => s + (i.subtotal || 0), 0))}</span></div>
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

  // Agendar trabajo
  document.getElementById('btn-agendar-pres')?.addEventListener('click', () => {
    const matList = [...new Set((pres.items || []).map(i => i.material).filter(Boolean))].join(', ');
    openEventoForm({
      clienteId: pres.clienteId,
      clienteNombre: pres.clienteNombre || (cliente ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : ''),
      presupuestoId: pres.id,
      direccion: pres.direccion || (cliente?.direccion || ''),
      notas: matList ? `Materiales: ${matList}` : (pres.descripcion || ''),
      tipo: 'instalacion'
    }, () => {
      Toast.success('Trabajo agendado en el calendario');
    });
  });

  // Approve action
  document.getElementById('btn-aprobar')?.addEventListener('click', async () => {
    DataService.update('presupuestos', presId, { estado: 'aprobado' });
    Toast.success('Presupuesto aprobado');
    renderPresupuestoDetail(container, actionsEl, presId);
  });

  // Create obra
  document.getElementById('btn-crear-obra')?.addEventListener('click', () => {
    const matList = [...new Set((pres.items || []).map(i => i.material).filter(Boolean))].join(', ');
    const obra = DataService.create('obras', {
      clienteId: pres.clienteId, presupuestoId: pres.id,
      direccion: pres.direccion, descripcion: pres.descripcion,
      material: matList || pres.material || '',
      fechaInicio: new Date().toISOString().split('T')[0],
      fechaEstimada: '', responsable: '', estado: 'pendiente', observaciones: '', archivos: []
    });
    DataService.update('presupuestos', presId, { obraId: obra.id });
    Toast.success('Obra creada desde presupuesto');

    if (pres.items && pres.items.length > 0) {
      openDescontarStockObraModal({
        obra,
        presupuesto: pres,
        onDone: () => {
          window.location.hash = `#/obras/${obra.id}`;
        }
      });
    } else {
      window.location.hash = `#/obras/${obra.id}`;
    }
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
    const phone = (cliente?.whatsapp || cliente?.telefono || '').replace(/\D/g, '');
    const msg = `Hola! Te envío el presupuesto ${pres.numero} de Marmolería Benjamin.\n\n${pres.descripcion || ''}\nTotal: ${formatCurrency(total, pres.moneda)}\n\n¡Saludos!`;
    if (phone) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
  });
}
