/* ========================================
   MARMOLERÍA BENJAMIN — Presupuestos Page
   ======================================== */

import { DataService } from '../services/mockData.js';
import { formatCurrency, formatDate, searchFilter, escapeHtml, debounce, generateAutoNumber, compareNewestFirst, resolveEntityContact } from '../utils/helpers.js';
import { Icons, renderDataTable, renderSearchInput, renderBadge, renderEmptyState } from '../components/ui.js';
import { Drawer } from '../components/drawer.js';
import { Modal } from '../components/modal.js';
import { Toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { DocumentModal } from '../components/documentModal.js';
import { generatePresupuestoHtml, exportToPdf, exportToWord, shareViaWhatsAppAndPdf } from '../services/documentExporter.js';
import { PRESUPUESTO_ESTADO_LABELS, PRESUPUESTO_ESTADO_COLORS, CONDICIONES_COMERCIALES_DEFAULT, MONEDAS } from '../utils/constants.js';
import { openEventoForm } from './calendario.js';
import { openDescontarStockObraModal } from '../services/stockAutomation.js';
import { openClienteForm } from './clientes.js';
import { openObraForm } from './obras.js';

let isApprovingPresupuesto = false;

/**
 * Aprueba un presupuesto de forma idempotente:
 * - Evita doble ejecución / doble clic con flag mutex.
 * - Muestra una única confirmación visual (Toast).
 * - Crea automáticamente una Obra en estado "Pendiente" vinculada al presupuesto con todos los datos existentes.
 */
export function aprobarPresupuesto(presId, onDone = null) {
  if (isApprovingPresupuesto) {
    console.warn('Aprobación en curso, ignorando clic repetido');
    return;
  }
  isApprovingPresupuesto = true;

  try {
    const pres = DataService.getById('presupuestos', presId);
    if (!pres) {
      Toast.error('Presupuesto no encontrado');
      isApprovingPresupuesto = false;
      return;
    }

    // Verificar si ya existe una obra vinculada a este presupuesto
    const allObras = DataService.getAll('obras');
    let existingObra = allObras.find(o => String(o.presupuestoId) === String(pres.id));
    if (!existingObra && pres.obraId) {
      existingObra = DataService.getById('obras', pres.obraId);
    }

    // Si ya está aprobado Y ya tiene obra vinculada, no duplicar la obra
    if (pres.estado === 'aprobado' && existingObra) {
      Toast.info('Presupuesto ya aprobado', `Ya cuenta con la Obra #${existingObra.id} vinculada.`);
      isApprovingPresupuesto = false;
      if (onDone) onDone(pres, existingObra);
      return;
    }

    // Resolver datos del cliente
    let cliente = pres.clienteId ? DataService.getById('clientes', pres.clienteId) : null;
    if (!cliente && pres.clienteNombre) {
      const allClientes = DataService.getAll('clientes');
      cliente = allClientes.find(c => {
        const full = `${c.nombre} ${c.apellido || ''}`.trim().toLowerCase();
        return full === pres.clienteNombre.trim().toLowerCase() || c.nombre.trim().toLowerCase() === pres.clienteNombre.trim().toLowerCase();
      });
      if (cliente) {
        DataService.update('presupuestos', pres.id, { clienteId: cliente.id });
      }
    }

    const clienteNombre = cliente 
      ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() 
      : (pres.clienteNombre || 'Cliente ocasional');
    const contacto = cliente ? (cliente.telefono || cliente.whatsapp || '') : (pres.telefono || pres.contacto || '');
    const direccion = pres.direccion || (cliente ? (cliente.direccion || '') : '');
    const materialList = [...new Set((pres.items || []).map(i => i.material).filter(Boolean))].join(', ') || pres.material || '';
    const importeTotal = DataService.getPresupuestoTotal(pres);
    const today = new Date().toISOString().split('T')[0];

    // Descripción para la orden de trabajo
    const itemDescriptions = (pres.items || []).map(i => i.descripcion).filter(Boolean);
    const descripcionObra = pres.descripcion || (itemDescriptions.length > 0 ? itemDescriptions.join(' | ') : `Trabajo s/ Presupuesto ${pres.numero || pres.id}`);

    let obra = existingObra;
    if (!obra) {
      // 3. Crear automáticamente la Obra al aprobar presupuesto
      const obraData = {
        presupuestoId: pres.id,
        presupuestoNumero: pres.numero || `PRES-${pres.id}`,
        clienteId: cliente ? cliente.id : (pres.clienteId || null),
        clienteNombre: clienteNombre,
        contacto: contacto,
        telefono: contacto,
        direccion: direccion,
        descripcion: descripcionObra,
        material: materialList,
        items: (pres.items || []).map(i => ({ ...i })),
        importe: importeTotal,
        moneda: pres.moneda || 'ARS',
        cotizacionDolar: pres.cotizacionDolar || null,
        fechaAprobacion: today,
        fechaInicio: today,
        fechaEstimada: '',
        responsable: '',
        estado: 'pendiente',
        observaciones: pres.condiciones ? `Condiciones comerciales presupuestadas:\n${pres.condiciones}` : '',
        archivos: []
      };
      obra = DataService.create('obras', obraData);
    }

    // Actualizar presupuesto a aprobado con referencia a la obra
    const updatedPres = DataService.update('presupuestos', pres.id, {
      estado: 'aprobado',
      obraId: obra.id,
      fechaAprobacion: today
    });

    // 2. Corregir aprobación duplicada: única confirmación visual
    Toast.success('Presupuesto aprobado', `Se aprobó con éxito y se generó la Obra #${obra.id} en estado Pendiente.`);

    if (onDone) {
      onDone(updatedPres, obra);
    }
  } catch (err) {
    console.error('Error al aprobar presupuesto y crear obra:', err);
    Toast.error('Error al aprobar el presupuesto');
  } finally {
    // Liberar mutex tras un intervalo seguro para bloquear doble clics involuntarios
    setTimeout(() => {
      isApprovingPresupuesto = false;
    }, 600);
  }
}

export function renderPresupuestos(container, actionsEl, path = '/presupuestos') {
  const parts = path.split('/');
  if (parts.length > 2 && parts[2]) {
    renderPresupuestoDetail(container, actionsEl, parts[2]);
    return;
  }

  actionsEl.innerHTML = `<button class="btn btn-primary" id="btn-new-pres">${Icons.plus} Nuevo presupuesto</button>`;
  actionsEl.querySelector('#btn-new-pres')?.addEventListener('click', () => openPresupuestoForm());

  let presupuestos = DataService.getAll('presupuestos');
  let searchTerm = '';
  let filterEstado = '';

  function render() {
    presupuestos = DataService.getAll('presupuestos');
    let filtered = presupuestos;
    if (filterEstado) filtered = filtered.filter(p => p.estado === filterEstado);
    if (searchTerm) {
      const clientes = DataService.getAll('clientes');
      filtered = filtered.filter(p => {
        const cli = clientes.find(c => c.id === p.clienteId);
        const contact = resolveEntityContact(cli, { clienteNombre: p.clienteNombre });
        const combined = `${p.numero} ${contact.name || ''} ${p.descripcion}`.toLowerCase();
        return combined.includes(searchTerm.toLowerCase());
      });
    }

    const clientes = DataService.getAll('clientes');
    const columns = [
      { label: 'Número', render: (p) => `<span class="cell-mono cell-primary">${p.numero}</span>` },
      { label: 'Fecha', render: (p) => formatDate(p.fecha), className: 'cell-secondary' },
      { label: 'Cliente', render: (p) => {
        const cli = clientes.find(c => c.id === p.clienteId);
        const contact = resolveEntityContact(cli, { clienteNombre: p.clienteNombre });
        return escapeHtml(contact.name || '-');
      }},
      { label: 'Descripción', render: (p) => `<span class="text-truncate" style="max-width:200px;display:inline-block">${escapeHtml(p.descripcion)}</span>` },
      { label: 'Estado', render: (p) => renderBadge(PRESUPUESTO_ESTADO_LABELS[p.estado] || p.estado || 'Borrador', PRESUPUESTO_ESTADO_COLORS[p.estado] || 'neutral') },
      { label: 'Total', align: 'right', render: (p) => `<span class="cell-currency">${formatCurrency(DataService.getPresupuestoTotal(p), p.moneda)}</span>` },
      { label: '', align: 'right', className: 'cell-actions', render: (p) => `
        ${p.estado !== 'aprobado' ? `<button class="btn btn-ghost btn-icon btn-sm" data-action="approve" data-id="${p.id}" title="Aprobar presupuesto" style="color:var(--color-success)">${Icons.check}</button>` : ''}
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
        ${renderDataTable({ columns, data: filtered.sort(compareNewestFirst), emptyMessage: 'No hay presupuestos' })}
      </div>
    `;

    // Events
    const searchInput = container.querySelector('#search-input');
    if (searchInput) {
      searchInput.value = searchTerm;
      searchInput.oninput = debounce((e) => { searchTerm = e.target.value; render(); }, 300);
    }

    const filterEl = container.querySelector('#filter-estado');
    if (filterEl) {
      filterEl.onchange = (e) => { filterEstado = e.target.value; render(); };
    }
  }

  // Escuchar cambios de datos en tiempo real entre pestañas/módulos
  const handleDataChanged = () => {
    if (container.isConnected) {
      render();
    } else {
      window.removeEventListener('mb-data-changed', handleDataChanged);
    }
  };
  window.addEventListener('mb-data-changed', handleDataChanged);

  // Delegated single click handler on container (prevents duplicate listeners on render)
  container.onclick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      e.stopPropagation();
      const { action, id } = btn.dataset;
      if (action === 'approve') {
        aprobarPresupuesto(id, () => {
          presupuestos = DataService.getAll('presupuestos');
          render();
        });
        return;
      }
      if (action === 'share') {
        const pres = DataService.getById('presupuestos', id);
        if (pres) openShareModal(pres);
        return;
      }
      if (action === 'view') {
        window.location.hash = `#/presupuestos/${id}`;
        return;
      }
      if (action === 'export') {
        const pres = DataService.getById('presupuestos', id);
        if (!pres) return;
        const cli = pres.clienteId ? DataService.getById('clientes', pres.clienteId) : null;
        const contact = resolveEntityContact(cli, { clienteNombre: pres.clienteNombre, telefono: pres.telefono || pres.contacto });
        const tot = DataService.getPresupuestoTotal(pres);
        const presPhone = (contact.whatsapp || contact.phone || '').replace(/\D/g, '');
        DocumentModal.open({
          title: `Presupuesto ${pres.numero || pres.id}`,
          filename: `Presupuesto_${pres.numero || pres.id}`,
          htmlContent: generatePresupuestoHtml(pres, cli, tot),
          whatsappData: {
            phone: presPhone,
            text: `Hola ${contact.name || ''}! Te envío el presupuesto ${pres.numero || pres.id} de Marmolería Benjamin.\nTotal: ${formatCurrency(tot, pres.moneda)}\nAdjunto copia en PDF.`
          }
        });
        return;
      }
      if (action === 'edit') {
        openPresupuestoForm(id);
        return;
      }
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
        return;
      }
      if (action === 'duplicate') {
        handleDuplicate(id);
        return;
      }
      if (action === 'delete') {
        handleDelete(id);
        return;
      }
      return;
    }

    const row = e.target.closest('.data-table tbody tr');
    if (row && row.dataset.id && !e.target.closest('a, button')) {
      window.location.hash = `#/presupuestos/${row.dataset.id}`;
    }
  };

  function openPresupuestoForm(editId = null, onSaved = null) {
    const found = editId ? DataService.getById('presupuestos', editId) : null;
    const isEdit = !!editId && !!found;
    const configData = JSON.parse(localStorage.getItem('mb_config') || '{}');
    const defaultCotizacion = parseFloat(configData.cotizacionDolar) || 1350;

    const pres = found ? { ...found } : {
      numero: generateAutoNumber('PRES', DataService.getAll('presupuestos')),
      fecha: new Date().toISOString().split('T')[0],
      moneda: 'ARS',
      cotizacionDolar: defaultCotizacion,
      estado: 'borrador',
      items: [{ id: '1', descripcion: 'Pieza #1', material: '', unidadMedida: 'cm', largo: '', ancho: '', cantidad: 1, m2: 0, precioUnitario: 0, subtotal: 0 }],
      adicionales: { colocacion: 0, manoDeObra: 0, inglete: 0, transporte: 0, bacha: 0, zocalos: 0, extras: 0 },
      descuento: 0, impuestos: 21, condiciones: CONDICIONES_COMERCIALES_DEFAULT.join('\n')
    };
    if (!pres.cotizacionDolar) pres.cotizacionDolar = defaultCotizacion;

    const clientes = DataService.getAll('clientes').filter(Boolean);
    const materiales = DataService.getAll('materiales').filter(Boolean);

    const isNuevoInicial = !pres.clienteId && !!pres.clienteNombre;

    const drawerEl = Drawer.open({
      title: isEdit ? `Editar ${pres.numero || 'presupuesto'}` : 'Nuevo presupuesto',
      size: 'xl',
      content: `
        <form id="pres-form">
          <div class="presupuesto-form-section">
            <h4 class="presupuesto-form-section-title">${Icons['file-text']} Datos generales</h4>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">Número</label>
                <input type="text" class="form-input" name="numero" value="${escapeHtml(pres.numero || '')}" readonly style="background:var(--color-stone-50)">
              </div>
              <div class="form-group">
                <label class="form-label">Fecha</label>
                <input type="date" class="form-input" name="fecha" value="${pres.fecha || ''}">
              </div>
            </div>
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label">Moneda</label>
                <select class="form-select" name="moneda" id="pres-moneda-select">
                  ${MONEDAS.map(m => `<option value="${m.value}" ${pres.moneda === m.value ? 'selected' : ''}>${m.label}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Estado del presupuesto</label>
                <select class="form-select" name="estado" id="pres-estado-select" style="font-weight:var(--font-semibold)">
                  <option value="borrador" ${(pres.estado === 'borrador' || !pres.estado) ? 'selected' : ''}>Borrador (en confección)</option>
                  <option value="enviado" ${pres.estado === 'enviado' ? 'selected' : ''}>Enviado al cliente</option>
                  <option value="aprobado" ${pres.estado === 'aprobado' ? 'selected' : ''}>Aprobado</option>
                  <option value="rechazado" ${pres.estado === 'rechazado' ? 'selected' : ''}>Rechazado</option>
                </select>
              </div>
            </div>

            <!-- Cotización del Dólar si la moneda es USD -->
            <div class="form-group" id="pres-cotizacion-wrap" style="${pres.moneda === 'USD' ? 'display:block' : 'display:none'};background:var(--color-stone-100);border:1px solid var(--color-stone-200);border-radius:var(--radius-md);padding:10px 14px;margin-bottom:var(--space-4)">
              <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
                <div>
                  <label class="form-label mb-0" style="font-weight:var(--font-bold);color:var(--color-stone-900)">
                    ${Icons['dollar-sign']} Cotización del Dólar (ARS por USD) <span class="required">*</span>
                  </label>
                  <span class="text-muted" style="font-size:11.5px;display:block">Los precios de los materiales se convierten automáticamente a dólares según este valor.</span>
                </div>
                <div style="display:flex;align-items:center;gap:6px">
                  <span style="font-weight:var(--font-bold);color:var(--color-stone-700)">1 USD = $</span>
                  <input type="number" class="form-input calc-field" name="cotizacionDolar" id="pres-cotizacion-input" value="${pres.cotizacionDolar || defaultCotizacion}" min="1" step="0.01" style="width:130px;font-weight:var(--font-bold)" placeholder="1507">
                </div>
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

            <div id="cliente-habitual-wrap" style="${isNuevoInicial ? 'display:none' : 'display:block'}">
              <div class="form-row-2">
                <div class="form-group mb-0">
                  <label class="form-label">Cliente habitual registrado <span class="required">*</span></label>
                  <select class="form-select" name="clienteId" id="pres-cliente-select">
                    <option value="">Seleccionar cliente...</option>
                    ${clientes.map(c => `<option value="${c.id}" ${String(pres.clienteId) === String(c.id) ? 'selected' : ''}>${escapeHtml(c.nombre)} ${escapeHtml(c.apellido || '')}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group mb-0">
                  <label class="form-label">Dirección de obra</label>
                  <input type="text" class="form-input" name="direccion" id="pres-direccion-input" value="${escapeHtml(pres.direccion || '')}" placeholder="Ej: San Martín 450">
                </div>
              </div>
            </div>

            <div id="cliente-nuevo-wrap" style="${isNuevoInicial ? 'display:block' : 'display:none'}">
              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label">Nombre y Apellido del cliente <span class="required">*</span></label>
                  <input type="text" class="form-input" name="clienteNombre" id="pres-cliente-nuevo-input" value="${escapeHtml(pres.clienteNombre || '')}" placeholder="Ej: Juan Pérez">
                </div>
                <div class="form-group">
                  <label class="form-label">Dirección de obra</label>
                  <input type="text" class="form-input" name="direccionNuevo" id="pres-direccion-nuevo-input" value="${escapeHtml(pres.direccion || '')}" placeholder="Ej: San Martín 450">
                </div>
              </div>
              <div class="form-row-2 mt-2">
                <div class="form-group mb-0">
                  <label class="form-label">Teléfono / WhatsApp</label>
                  <input type="tel" class="form-input" name="clienteTelefono" id="pres-cliente-nuevo-tel" placeholder="Ej: 11 5566-7788">
                </div>
                <div class="form-group mb-0">
                  <label class="form-label">Email <span class="text-muted" style="font-weight:normal">(opcional)</span></label>
                  <input type="email" class="form-input" name="clienteEmail" id="pres-cliente-nuevo-email" placeholder="cliente@correo.com">
                </div>
              </div>
              <div class="form-row-2 mt-2">
                <div class="form-group mb-0">
                  <label class="form-label">CUIT / DNI <span class="text-muted" style="font-weight:normal">(opcional)</span></label>
                  <input type="text" class="form-input" name="clienteCuit" id="pres-cliente-nuevo-cuit" placeholder="XX-XXXXXXXX-X">
                </div>
                <div class="form-group mb-0" style="display:flex;align-items:flex-end">
                  <div class="alert alert-info mb-0" style="padding:8px 12px;font-size:11.5px;display:flex;align-items:center;gap:6px;width:100%;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.2);border-radius:var(--radius-md);color:#1e40af">
                    ${Icons.info} Se creará automáticamente en <strong>Clientes</strong> al guardar.
                  </div>
                </div>
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
            <button type="button" class="btn btn-success" id="btn-inline-approve" style="width:100%;justify-content:center;background:#059669;color:#fff;border-color:#059669;font-weight:var(--font-bold);box-shadow:0 3px 10px rgba(5,150,105,0.25)">
              ${Icons.check} Guardar y Aprobar presupuesto
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
        <button type="button" class="btn btn-outline-success btn-sm" id="drawer-header-approve" style="color:#059669;border-color:#059669;font-weight:var(--font-bold)">${Icons.check} Aprobar</button>
        <button type="button" class="btn btn-primary btn-sm" id="drawer-header-save" style="font-weight:var(--font-semibold)">${Icons.check} Guardar</button>
      `,
      footer: `
        <button type="button" class="btn btn-secondary" id="drawer-cancel">Cancelar</button>
        <button type="button" class="btn btn-secondary" id="drawer-preview-btn">${Icons.eye} Vista previa</button>
        <button type="button" class="btn btn-outline-success" id="drawer-approve" style="color:#059669;border-color:#059669;font-weight:var(--font-bold)">${Icons.check} Aprobar</button>
        <button type="button" class="btn btn-primary" id="drawer-save">${Icons.check} Guardar</button>
        <button type="button" class="btn btn-success btn-full-mobile" id="drawer-save-share" style="background:#25D366;color:#fff;border-color:#25D366;font-weight:var(--font-bold)">${Icons.whatsapp} Guardar y Compartir</button>
      `
    });

    // Helper to find inside drawerEl or fallback to document
    const qEl = (sel) => drawerEl?.querySelector(sel) || document.querySelector(sel);

    // Setup Client Type Toggle
    const toggleWrap = qEl('#client-type-toggle');
    const tipoVal = qEl('#tipo-cliente-val');
    const habWrap = qEl('#cliente-habitual-wrap');
    const nueWrap = qEl('#cliente-nuevo-wrap');
    const cliSelect = qEl('#pres-cliente-select');
    const dirInput = qEl('#pres-direccion-input');

    toggleWrap?.querySelectorAll('.client-type-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.type;
        if (tipoVal) tipoVal.value = type;
        toggleWrap.querySelectorAll('.client-type-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (type === 'habitual') {
          if (habWrap) habWrap.style.display = 'block';
          if (nueWrap) nueWrap.style.display = 'none';
        } else {
          if (habWrap) habWrap.style.display = 'none';
          if (nueWrap) nueWrap.style.display = 'block';
        }
      });
    });

    cliSelect?.addEventListener('change', (e) => {
      const selectedCli = clientes.find(c => String(c.id) === String(e.target.value));
      if (selectedCli && dirInput && !dirInput.value) {
        dirInput.value = selectedCli.direccion || '';
      }
    });

    // Setup Items and Calculation
    const itemsBody = qEl('#items-body');
    const matSummaryEl = qEl('#material-summary-banner');

    function getMaterialPrice(matName, currency = 'ARS', tc = defaultCotizacion) {
      const mat = materiales.find(m => m.nombre === matName);
      if (!mat) return 0;
      const baseARS = mat.precioM2 ?? mat.precioVenta ?? 0;
      if (currency === 'USD') {
        const rate = (tc && tc > 0) ? tc : defaultCotizacion;
        return rate > 0 ? Math.round((baseARS / rate) * 100) / 100 : baseARS;
      }
      return baseARS;
    }

    const defaultFirstMat = materiales[0]?.nombre || '';
    const initialMoneda = pres.moneda || 'ARS';
    const initialTC = pres.cotizacionDolar || defaultCotizacion;
    const defaultFirstMatPrice = getMaterialPrice(defaultFirstMat, initialMoneda, initialTC);

    let items = (pres.items && pres.items.length > 0)
      ? pres.items.map((it, idx) => {
          const matName = it.material || pres.material || defaultFirstMat;
          const pM2 = (it.precioUnitario !== undefined && it.precioUnitario !== null && it.precioUnitario > 0)
            ? it.precioUnitario
            : getMaterialPrice(matName, initialMoneda, initialTC);

          let u = it.unidadMedida;
          let lVal = it.largo !== undefined && it.largo !== null ? it.largo : '';
          let aVal = it.ancho !== undefined && it.ancho !== null ? it.ancho : '';

          if (!u) {
            const rawL = parseFloat(String(lVal).replace(',', '.')) || 0;
            const rawA = parseFloat(String(aVal).replace(',', '.')) || 0;
            if (rawL > 10 || rawA > 10) {
              u = 'cm';
            } else {
              u = 'm';
            }
          }

          return {
            id: it.id || (idx + 1).toString(),
            descripcion: it.descripcion || `Ítem ${idx + 1}`,
            material: matName,
            unidadMedida: u,
            cantidad: Math.max(1, parseFloat(it.cantidad) || 1),
            largo: lVal,
            ancho: aVal,
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
            unidadMedida: 'cm',
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
      const unidad = it.unidadMedida === 'm' ? 'm' : 'cm';
      it.unidadMedida = unidad;

      const rawLargo = parseFloat(String(it.largo || '').replace(',', '.')) || 0;
      const rawAncho = parseFloat(String(it.ancho || '').replace(',', '.')) || 0;

      // Conversión automática a metros según la unidad elegida
      let largoM = 0;
      let anchoM = 0;

      if (unidad === 'cm') {
        largoM = rawLargo / 100;
        anchoM = rawAncho / 100;
      } else {
        largoM = rawLargo;
        anchoM = rawAncho;
      }

      // Cálculo de superficie en m²
      if (largoM > 0 && anchoM > 0) {
        it.m2 = (largoM * anchoM) * cant;
      } else if (largoM > 0 && anchoM === 0) {
        it.m2 = largoM * cant;
      } else {
        it.m2 = 0;
      }

      // Redondeo limpio a 4 decimales
      it.m2 = Math.round((it.m2 + Number.EPSILON) * 10000) / 10000;

      // Precio por m² del material si no está fijado
      if (it.material && (!it.precioUnitario || it.precioUnitario === 0)) {
        const curMoneda = qEl('#pres-moneda-select')?.value || pres.moneda || 'ARS';
        const curTC = parseFloat(qEl('#pres-cotizacion-input')?.value) || pres.cotizacionDolar || defaultCotizacion;
        it.precioUnitario = getMaterialPrice(it.material, curMoneda, curTC);
      }

      // Multiplicación automática: m² * precio por m²
      it.subtotal = it.m2 * (it.precioUnitario || 0);
    }

    function getItemPreviewHtml(item) {
      const u = item.unidadMedida || 'cm';
      const rawL = parseFloat(String(item.largo || '').replace(',', '.'));
      const rawA = parseFloat(String(item.ancho || '').replace(',', '.'));
      const cant = Math.max(1, parseFloat(item.cantidad) || 1);
      const m2Str = (item.m2 || 0).toFixed(2).replace('.', ',');

      if (!isNaN(rawL) && rawL > 0 && !isNaN(rawA) && rawA > 0) {
        const cantText = cant > 1 ? ` × ${cant} un.` : '';
        return `📐 Medidas: <strong>${item.largo} ${u}</strong> × <strong>${item.ancho} ${u}</strong>${cantText} → Superficie: <strong style="color:var(--color-primary)">${m2Str} m²</strong>`;
      }
      return `<span class="text-muted">Ingresá largo y ancho en <strong>${u === 'm' ? 'metros (m)' : 'centímetros (cm)'}</strong> para calcular m²</span>`;
    }

    items.forEach(it => calculateItem(it));

    function renderMaterialSummary() {
      const box = qEl('#material-summary-box');
      if (!box) return;
      const curMoneda = qEl('#pres-moneda-select')?.value || pres.moneda || 'ARS';
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
      if (groupEntries.length === 0) { box.innerHTML = ''; return; }

      const totalM2 = items.reduce((s, i) => s + (i.m2 || 0), 0);

      box.innerHTML = `
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
                  <strong style="font-family:var(--font-mono);color:var(--color-stone-900)">${formatCurrency(data.subtotal, curMoneda)}</strong>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    function renderItems() {
      const bodyEl = qEl('#items-body');
      if (!bodyEl) return;
      const curMoneda = qEl('#pres-moneda-select')?.value || pres.moneda || 'ARS';
      const curTC = parseFloat(qEl('#pres-cotizacion-input')?.value) || pres.cotizacionDolar || defaultCotizacion;

      bodyEl.innerHTML = items.map((item, idx) => `
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
                const pM2 = getMaterialPrice(m.nombre, curMoneda, curTC);
                return `<option value="${escapeHtml(m.nombre)}" ${isSel ? 'selected' : ''}>${escapeHtml(m.nombre)} — ${formatCurrency(pM2, curMoneda)} / m²</option>`;
              }).join('')}
            </select>
          </div>

          <!-- Selector de Unidad: cm o m + Medidas: Largo, Ancho y Cantidad -->
          <div class="pres-item-measures-grid">
            <div class="form-group mb-0">
              <label class="form-label-sm">Unidad <span class="required">*</span></label>
              <div class="unit-toggle-group">
                <button type="button" class="unit-toggle-btn ${item.unidadMedida === 'cm' ? 'active' : ''}" data-action="toggle-unit" data-unit="cm">cm</button>
                <button type="button" class="unit-toggle-btn ${item.unidadMedida === 'm' ? 'active' : ''}" data-action="toggle-unit" data-unit="m">m</button>
              </div>
            </div>
            <div class="form-group mb-0">
              <label class="form-label-sm">Largo (${item.unidadMedida || 'cm'})</label>
              <input type="text" inputmode="decimal" class="form-input item-field" data-field="largo" value="${item.largo ?? ''}" placeholder="${item.unidadMedida === 'm' ? 'Ej: 2,40' : 'Ej: 240'}">
            </div>
            <div class="form-group mb-0">
              <label class="form-label-sm">Ancho (${item.unidadMedida || 'cm'})</label>
              <input type="text" inputmode="decimal" class="form-input item-field" data-field="ancho" value="${item.ancho ?? ''}" placeholder="${item.unidadMedida === 'm' ? 'Ej: 0,60' : 'Ej: 60'}">
            </div>
            <div class="form-group mb-0">
              <label class="form-label-sm">Cant.</label>
              <input type="number" step="1" min="1" inputmode="numeric" class="form-input item-field" data-field="cantidad" value="${item.cantidad || 1}">
            </div>
          </div>

          <!-- Indicador de conversión y cálculo automático en vivo -->
          <div class="pres-item-measure-preview">
            <span class="preview-calc-text">${getItemPreviewHtml(item)}</span>
            <span class="preview-tag">${item.unidadMedida === 'm' ? 'Metros (m)' : 'Centímetros (cm)'}</span>
          </div>

          <!-- Resumen de cálculo del ítem: m², Precio/m², Subtotal -->
          <div class="pres-item-calc-footer">
            <div class="pres-item-stat-pill">
              <span class="pres-item-stat-label">Superficie</span>
              <span class="pres-item-stat-val item-m2">${(item.m2 || 0).toFixed(2).replace('.', ',')} m²</span>
            </div>
            <div class="pres-item-stat-pill">
              <span class="pres-item-stat-label">Precio / m²</span>
              <span class="pres-item-stat-val item-precio-val">${formatCurrency(item.precioUnitario || 0, curMoneda)}</span>
            </div>
            <div class="pres-item-stat-pill subtotal-pill">
              <span class="pres-item-stat-label">Subtotal</span>
              <span class="pres-item-stat-val item-subtotal-val">${formatCurrency(item.subtotal || 0, curMoneda)}</span>
            </div>
          </div>
        </div>
      `).join('');

      // Unit toggle handler: converts values smoothly between cm and m
      bodyEl.querySelectorAll('[data-action="toggle-unit"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const card = btn.closest('.pres-item-card');
          const idx = parseInt(card.dataset.idx);
          const targetUnit = btn.dataset.unit;
          const currentUnit = items[idx].unidadMedida || 'cm';
          if (targetUnit === currentUnit) return;

          const rawL = parseFloat(String(items[idx].largo || '').replace(',', '.'));
          const rawA = parseFloat(String(items[idx].ancho || '').replace(',', '.'));

          if (targetUnit === 'm' && currentUnit === 'cm') {
            // Convert cm -> m (divide by 100)
            if (!isNaN(rawL) && rawL > 0) items[idx].largo = +(rawL / 100).toFixed(4).toString().replace('.', ',');
            if (!isNaN(rawA) && rawA > 0) items[idx].ancho = +(rawA / 100).toFixed(4).toString().replace('.', ',');
          } else if (targetUnit === 'cm' && currentUnit === 'm') {
            // Convert m -> cm (multiply by 100)
            if (!isNaN(rawL) && rawL > 0) items[idx].largo = Math.round(rawL * 100).toString();
            if (!isNaN(rawA) && rawA > 0) items[idx].ancho = Math.round(rawA * 100).toString();
          }

          items[idx].unidadMedida = targetUnit;
          calculateItem(items[idx]);
          renderItems();
          renderMaterialSummary();
          updateSummary();
        });
      });

      // Field events
      bodyEl.querySelectorAll('.item-field').forEach(input => {
        const eventName = input.tagName === 'SELECT' ? 'change' : 'input';
        input.addEventListener(eventName, () => {
          const card = input.closest('.pres-item-card');
          const idx = parseInt(card.dataset.idx);
          const field = input.dataset.field;
          let val = input.value;

          const curMoneda = qEl('#pres-moneda-select')?.value || pres.moneda || 'ARS';
          const curTC = parseFloat(qEl('#pres-cotizacion-input')?.value) || pres.cotizacionDolar || defaultCotizacion;

          if (field === 'material') {
            items[idx].material = val;
            items[idx].precioUnitario = getMaterialPrice(val, curMoneda, curTC);
            calculateItem(items[idx]);

            const precioEl = card.querySelector('.item-precio-val');
            if (precioEl) precioEl.textContent = formatCurrency(items[idx].precioUnitario || 0, curMoneda);
            const m2El = card.querySelector('.item-m2');
            if (m2El) m2El.textContent = `${(items[idx].m2 || 0).toFixed(2).replace('.', ',')} m²`;
            const subEl = card.querySelector('.item-subtotal-val');
            if (subEl) subEl.textContent = formatCurrency(items[idx].subtotal || 0, curMoneda);
            const prevEl = card.querySelector('.preview-calc-text');
            if (prevEl) prevEl.innerHTML = getItemPreviewHtml(items[idx]);
          } else {
            items[idx][field] = val;
            calculateItem(items[idx]);

            const m2El = card.querySelector('.item-m2');
            if (m2El) m2El.textContent = `${(items[idx].m2 || 0).toFixed(2).replace('.', ',')} m²`;
            const subEl = card.querySelector('.item-subtotal-val');
            if (subEl) subEl.textContent = formatCurrency(items[idx].subtotal || 0, curMoneda);
            const prevEl = card.querySelector('.preview-calc-text');
            if (prevEl) prevEl.innerHTML = getItemPreviewHtml(items[idx]);
          }

          renderMaterialSummary();
          updateSummary();
        });
      });

      // Remove item
      bodyEl.querySelectorAll('.row-remove').forEach(btn => {
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
    qEl('#btn-add-item')?.addEventListener('click', () => {
      const lastItem = items[items.length - 1];
      const defaultMatName = lastItem?.material || (materiales[0]?.nombre || '');
      const defaultMat = materiales.find(m => m.nombre === defaultMatName) || materiales[0];
      const pM2 = defaultMat ? (defaultMat.precioM2 ?? defaultMat.precioVenta ?? 0) : 0;
      const defaultUnit = lastItem?.unidadMedida || 'cm';

      items.push({
        id: Date.now().toString(),
        descripcion: `Ítem ${items.length + 1}`,
        material: defaultMatName,
        unidadMedida: defaultUnit,
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
      const form = qEl('#pres-form');
      if (!form) return;
      const curMoneda = form.querySelector('[name="moneda"]')?.value || pres.moneda || 'ARS';
      const curTC = parseFloat(form.querySelector('[name="cotizacionDolar"]')?.value) || pres.cotizacionDolar || defaultCotizacion;

      const itemsTotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);
      const adics = ['colocacion', 'manoDeObra', 'inglete', 'transporte', 'bacha', 'zocalos', 'extras'];
      const adicsTotal = adics.reduce((s, k) => s + (parseFloat(form.querySelector(`[name="adic_${k}"]`)?.value) || 0), 0);
      const subtotal = itemsTotal + adicsTotal;
      const desc = parseFloat(form.querySelector('[name="descuento"]')?.value) || 0;
      const imp = parseFloat(form.querySelector('[name="impuestos"]')?.value) || 0;
      const descMonto = subtotal * desc / 100;
      const impMonto = (subtotal - descMonto) * imp / 100;
      const total = subtotal - descMonto + impMonto;

      const sumEl = qEl('#pres-summary');
      if (sumEl) {
        sumEl.innerHTML = `
          <div class="summary-row"><span class="summary-row-label">Subtotal materiales e ítems</span><span class="summary-row-value">${formatCurrency(itemsTotal, curMoneda)}</span></div>
          <div class="summary-row"><span class="summary-row-label">Campos adicionales</span><span class="summary-row-value">${formatCurrency(adicsTotal, curMoneda)}</span></div>
          ${desc > 0 ? `<div class="summary-row"><span class="summary-row-label">Descuento (${desc}%)</span><span class="summary-row-value" style="color:var(--color-error)">-${formatCurrency(descMonto, curMoneda)}</span></div>` : ''}
          ${imp > 0 ? `<div class="summary-row"><span class="summary-row-label">IVA (${imp}%)</span><span class="summary-row-value">${formatCurrency(impMonto, curMoneda)}</span></div>` : ''}
          <div class="summary-row total"><span class="summary-row-label">Total Presupuesto</span><span class="summary-row-value">${formatCurrency(total, curMoneda)}</span></div>
          ${(curMoneda === 'USD' && curTC > 0) ? `
            <div style="padding:8px 12px;margin-top:8px;background:var(--color-stone-100);border:1px solid var(--color-stone-200);border-radius:var(--radius-sm);font-size:12px;color:var(--color-stone-700);text-align:right">
              Tipo de cambio de referencia: <strong>$${curTC} ARS</strong> · Equivalente aprox: <strong style="color:var(--color-stone-900)">${formatCurrency(total * curTC, 'ARS')}</strong>
            </div>
          ` : ''}
        `;
      }
    }

    renderItems();
    renderMaterialSummary();
    updateSummary();

    // Eventos para cambio de moneda y cotización
    const monedaSelect = qEl('#pres-moneda-select');
    const tcWrap = qEl('#pres-cotizacion-wrap');
    const tcInput = qEl('#pres-cotizacion-input');

    if (monedaSelect) {
      monedaSelect.addEventListener('change', (e) => {
        const newMoneda = e.target.value;
        if (tcWrap) {
          tcWrap.style.display = newMoneda === 'USD' ? 'block' : 'none';
        }
        const curTC = parseFloat(tcInput?.value) || defaultCotizacion;

        // Recalcular precios unitarios según la moneda seleccionada
        items.forEach(it => {
          if (it.material) {
            it.precioUnitario = getMaterialPrice(it.material, newMoneda, curTC);
            calculateItem(it);
          }
        });

        renderItems();
        renderMaterialSummary();
        updateSummary();
      });
    }

    if (tcInput) {
      tcInput.addEventListener('input', () => {
        const curTC = parseFloat(tcInput.value) || defaultCotizacion;
        const curMoneda = monedaSelect?.value || 'ARS';
        if (curMoneda === 'USD') {
          items.forEach(it => {
            if (it.material) {
              it.precioUnitario = getMaterialPrice(it.material, 'USD', curTC);
              calculateItem(it);
            }
          });
          renderItems();
          renderMaterialSummary();
          updateSummary();
        }
      });
    }

    (drawerEl?.querySelectorAll('.calc-field') || document.querySelectorAll('.calc-field')).forEach(f => {
      f.addEventListener('input', updateSummary);
      f.addEventListener('change', updateSummary);
    });

    function previewDraft() {
      const form = qEl('#pres-form');
      if (!form) return;
      const fd = new FormData(form);
      const data = Object.fromEntries(fd);
      const tipoCliente = data.tipoCliente || 'habitual';
      const direccionFinal = (data.direccionNuevo || data.direccion || '').trim();
      data.direccion = direccionFinal;
      delete data.direccionNuevo;

      let cli = null;
      if (tipoCliente === 'habitual') {
        cli = clientes.find(c => String(c.id) === String(data.clienteId)) || null;
      } else {
        cli = {
          nombre: data.clienteNombre || 'Cliente ocasional',
          apellido: '',
          direccion: direccionFinal,
          telefono: data.clienteTelefono || '',
          email: data.clienteEmail || '',
          cuit: data.clienteCuit || ''
        };
      }
      const adics = ['colocacion', 'manoDeObra', 'inglete', 'transporte', 'bacha', 'zocalos', 'extras'];
      const adicionales = {};
      adics.forEach(k => { adicionales[k] = parseFloat(data[`adic_${k}`]) || 0; });

      const matList = [...new Set(items.map(i => i.material).filter(Boolean))].join(', ');
      const draftPres = {
        ...pres,
        ...data,
        estado: data.estado || pres.estado || 'borrador',
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

    function savePresupuesto(andShare = false, forceEstado = null) {
      const form = qEl('#pres-form');
      if (!form) return;
      const fd = new FormData(form);
      const data = Object.fromEntries(fd);

      const tipoCliente = data.tipoCliente || 'habitual';
      let createdClient = null;
      let missingClientFields = [];

      if (tipoCliente === 'habitual') {
        if (!data.clienteId) {
          if (data.clienteNombre && data.clienteNombre.trim()) {
            data.clienteId = null;
          } else {
            Toast.warning('Seleccioná un cliente habitual o cambiá a "Cliente nuevo"');
            return;
          }
        } else {
          data.clienteNombre = null;
        }
      } else {
        const nombreCompleto = (data.clienteNombre || '').trim();
        if (!nombreCompleto) {
          Toast.warning('Ingresá el nombre del cliente nuevo');
          return;
        }

        const direccion = (data.direccionNuevo || data.direccion || '').trim();
        data.direccion = direccion;
        delete data.direccionNuevo;

        const telefono = (data.clienteTelefono || '').trim();
        const whatsapp = (data.clienteWhatsapp || telefono).trim();
        const email = (data.clienteEmail || '').trim();
        const cuit = (data.clienteCuit || '').trim();

        // 1. Buscar si ya existe un cliente con este nombre en el sistema
        const allClientes = DataService.getAll('clientes') || [];
        let existingCliente = allClientes.find(c => {
          const full = `${c.nombre || ''} ${c.apellido || ''}`.trim().toLowerCase();
          return full === nombreCompleto.toLowerCase() || (c.nombre || '').trim().toLowerCase() === nombreCompleto.toLowerCase();
        });

        if (existingCliente) {
          data.clienteId = existingCliente.id;
          data.clienteNombre = `${existingCliente.nombre} ${existingCliente.apellido || ''}`.trim();
          // Actualizar datos de contacto si estaban vacíos
          const updates = {};
          if (!existingCliente.direccion && direccion) updates.direccion = direccion;
          if (!existingCliente.telefono && telefono) updates.telefono = telefono;
          if (!existingCliente.whatsapp && whatsapp) updates.whatsapp = whatsapp;
          if (!existingCliente.email && email) updates.email = email;
          if (!existingCliente.cuit && cuit) updates.cuit = cuit;
          if (Object.keys(updates).length > 0) {
            DataService.update('clientes', existingCliente.id, updates);
            existingCliente = { ...existingCliente, ...updates };
          }
          createdClient = existingCliente;
        } else {
          // 2. Crear automáticamente el nuevo cliente en la colección Clientes
          const parts = nombreCompleto.split(' ');
          const nombre = parts[0] || nombreCompleto;
          const apellido = parts.slice(1).join(' ') || '';

          const nuevoCliente = DataService.create('clientes', {
            nombre,
            apellido,
            telefono,
            whatsapp,
            email,
            direccion,
            cuit,
            observaciones: `Cliente registrado automáticamente desde Presupuesto ${pres.numero || ''}`
          });

          data.clienteId = nuevoCliente.id;
          data.clienteNombre = `${nombre} ${apellido}`.trim();
          createdClient = nuevoCliente;
        }

        delete data.clienteTelefono;
        delete data.clienteWhatsapp;
        delete data.clienteEmail;
        delete data.clienteCuit;
      }

      // Evaluar datos faltantes del cliente para emitir alertas ⚠️
      const targetClient = data.clienteId ? DataService.getById('clientes', data.clienteId) : null;
      if (targetClient) {
        if (!targetClient.telefono && !targetClient.whatsapp) missingClientFields.push('Teléfono / WhatsApp');
        if (!targetClient.direccion && !data.direccion) missingClientFields.push('Dirección');
        if (!targetClient.cuit) missingClientFields.push('CUIT / DNI');
        if (!targetClient.email) missingClientFields.push('Email');
      }

      if (!items || items.length === 0) {
        Toast.warning('Agregá al menos un ítem al presupuesto');
        return;
      }

      const adics = ['colocacion', 'manoDeObra', 'inglete', 'transporte', 'bacha', 'zocalos', 'extras'];
      const adicionales = {};
      adics.forEach(k => { adicionales[k] = parseFloat(data[`adic_${k}`]) || 0; delete data[`adic_${k}`]; });

      const matList = [...new Set(items.map(i => i.material).filter(Boolean))].join(', ');
      const estadoFinal = forceEstado || data.estado || pres.estado || 'borrador';
      const curMoneda = data.moneda || pres.moneda || 'ARS';
      const curTC = curMoneda === 'USD' ? (parseFloat(data.cotizacionDolar) || defaultCotizacion) : null;

      const record = {
        ...pres,
        ...data,
        moneda: curMoneda,
        cotizacionDolar: curTC,
        estado: estadoFinal,
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
      } else {
        saved = DataService.create('presupuestos', record);
      }
      Drawer.close();

      if (estadoFinal === 'aprobado') {
        // Ejecuta aprobación única y crea la Obra automáticamente
        aprobarPresupuesto(saved.id, (approvedPres) => {
          if (onSaved) {
            onSaved(approvedPres);
          } else {
            presupuestos = DataService.getAll('presupuestos');
            render();
          }
          if (andShare && approvedPres) {
            setTimeout(() => {
              openShareModal(approvedPres);
            }, 360);
          }
        });
        return;
      }

      // Alerta proactiva si faltan datos en el cliente creado
      if (createdClient && missingClientFields.length > 0) {
        Toast.warning(
          `Cliente "${data.clienteNombre}" creado en Clientes`,
          `⚠️ Faltan completar datos: ${missingClientFields.join(', ')}. Podés completarlos en la ficha de Clientes.`
        );
      } else if (createdClient) {
        Toast.success('Cliente creado', `Se dio de alta a "${data.clienteNombre}" en Clientes.`);
      } else {
        Toast.success(editId ? 'Presupuesto actualizado' : 'Presupuesto guardado con éxito');
      }
      if (onSaved) {
        onSaved(saved);
      } else {
        presupuestos = DataService.getAll('presupuestos');
        render();
      }

      if (andShare && saved) {
        setTimeout(() => {
          openShareModal(saved);
        }, 360);
      }
    }

    const attachBtn = (id, fn) => {
      const btn = drawerEl?.querySelector(`#${id}`) || document.getElementById(id);
      btn?.addEventListener('click', fn);
    };

    attachBtn('drawer-cancel', () => Drawer.close());
    attachBtn('drawer-save', () => savePresupuesto(false));
    attachBtn('drawer-header-save', () => savePresupuesto(false));
    attachBtn('btn-inline-save', () => savePresupuesto(false));
    attachBtn('drawer-approve', () => savePresupuesto(false, 'aprobado'));
    attachBtn('drawer-header-approve', () => savePresupuesto(false, 'aprobado'));
    attachBtn('btn-inline-approve', () => savePresupuesto(false, 'aprobado'));
    attachBtn('drawer-save-share', () => savePresupuesto(true));
    attachBtn('btn-inline-save-share', () => savePresupuesto(true));
    attachBtn('drawer-preview-btn', previewDraft);
    attachBtn('btn-inline-preview', previewDraft);
  }

  function openShareModal(pres) {
    if (!pres) return;
    const cliente = pres.clienteId ? DataService.getById('clientes', pres.clienteId) : null;
    const contact = resolveEntityContact(cliente, { clienteNombre: pres.clienteNombre, telefono: pres.telefono || pres.contacto });
    const total = DataService.getPresupuestoTotal(pres);
    const getDocHtml = () => generatePresupuestoHtml(pres, cliente, total);
    const docFilename = `Presupuesto_${pres.numero}`;

    const cliName = contact.name || 'Cliente';
    const cliPhone = contact.whatsapp || contact.phone || '';
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
              ${Icons.whatsapp} Enviar por WhatsApp con copia en PDF
            </div>
            <div class="form-group mb-2">
              <label class="form-label-sm" style="font-size:12px">Teléfono / WhatsApp de destino</label>
              <div style="display:flex;gap:6px">
                <input type="text" class="form-input" id="share-modal-phone" value="${escapeHtml(cleanPhone)}" placeholder="Ej: 5491145678901">
                <button type="button" class="btn btn-success" id="share-modal-wa-btn" style="background:#25D366;color:#fff;border-color:#25D366;white-space:nowrap;font-weight:var(--font-bold)">
                  ${Icons.whatsapp} Enviar + Descargar PDF
                </button>
              </div>
              <span class="text-muted" style="font-size:11px;display:block;margin-top:4px">Descarga automáticamente el PDF en tu equipo y abre WhatsApp con el mensaje listo para enviar</span>
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

    document.getElementById('share-modal-wa-btn')?.addEventListener('click', async () => {
      const phoneInput = document.getElementById('share-modal-phone');
      const phone = phoneInput ? phoneInput.value.replace(/\D/g, '') : cleanPhone;
      await shareViaWhatsAppAndPdf({
        phone,
        text: shareMsg,
        htmlContent: getDocHtml(),
        filename: docFilename
      });
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
        htmlContent: getDocHtml(),
        whatsappData: {
          phone: cleanPhone,
          text: shareMsg
        }
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

  const cliente = pres.clienteId ? DataService.getById('clientes', pres.clienteId) : null;
  const contact = resolveEntityContact(cliente, { clienteNombre: pres.clienteNombre, direccion: pres.direccion, telefono: pres.telefono || pres.contacto });
  const total = DataService.getPresupuestoTotal(pres);

  actionsEl.innerHTML = `
    <a href="#/presupuestos" class="btn btn-secondary">${Icons['chevron-left']} Volver</a>
    <button class="btn btn-secondary" id="btn-edit-header">${Icons.edit} Editar presupuesto</button>
    ${pres.obraId ? `
      <button class="btn btn-primary" id="btn-header-planificar" style="font-weight:var(--font-semibold);gap:6px">
        ${Icons.edit} Planificar obra
      </button>
    ` : ''}
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
    ${(() => {
      if (!cliente) return '';
      const missing = [];
      if (!cliente.telefono && !cliente.whatsapp) missing.push('Teléfono / WhatsApp');
      if (!cliente.direccion && !pres.direccion) missing.push('Dirección de obra');
      if (!cliente.cuit) missing.push('CUIT / DNI');
      if (!cliente.email) missing.push('Email');
      if (missing.length === 0) return '';
      return `
        <div class="card mb-4" style="border-left: 4px solid var(--color-warning); background: rgba(245, 158, 11, 0.08);">
          <div class="card-body" style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-3);flex-wrap:wrap;padding:14px 18px">
            <div style="display:flex;align-items:center;gap:12px;min-width:260px">
              <span style="font-size:24px;line-height:1">⚠️</span>
              <div>
                <strong style="color:#92400E;font-size:var(--text-sm)">Ficha de cliente con datos pendientes</strong>
                <div class="text-muted" style="font-size:var(--text-xs);margin-top:2px">
                  Falta completar: <strong style="color:#B45309">${missing.join(', ')}</strong> en el perfil de <em>${escapeHtml(cliente.nombre)}</em>.
                </div>
              </div>
            </div>
            <button class="btn btn-warning btn-sm" id="btn-completar-cliente-pres" data-cliente-id="${cliente.id}" style="font-weight:var(--font-semibold);gap:6px">
              ${Icons.edit} Completar datos del cliente
            </button>
          </div>
        </div>
      `;
    })()}

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
            <span class="detail-value">${escapeHtml(contact.name || 'Cliente ocasional')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Fecha</span>
            <span class="detail-value">${formatDate(pres.fecha)}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Dirección</span>
            <span class="detail-value">${escapeHtml(contact.direccion || pres.direccion || '-')}</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">Moneda</span>
            <span class="detail-value">${pres.moneda}${pres.cotizacionDolar ? ` (TC: $${pres.cotizacionDolar})` : ''}</span>
          </div>
          ${pres.obraId ? `
          <div class="detail-item">
            <span class="detail-label">Obra vinculada</span>
            <span class="detail-value">
              <a href="#/obras/${pres.obraId}" style="font-weight:var(--font-bold);color:var(--color-primary);display:inline-flex;align-items:center;gap:4px">
                ${Icons['hard-hat']} Obra #${pres.obraId} (Pendiente)
              </a>
            </span>
          </div>` : ''}
        </div>
      </div>
    </div>

    <!-- Items section as responsive cards -->
    <div class="card mb-4">
      <div class="card-header"><h3 class="card-title">Ítems (${(pres.items || []).length})</h3></div>
      <div class="card-body">
        <div class="detail-items-list">
          ${(pres.items || []).map((item, idx) => {
            const u = item.unidadMedida || ((item.largo > 10 || item.ancho > 10) ? 'cm' : 'm');
            const formatMeasure = (val) => {
              if (!val && val !== 0) return '-';
              const s = String(val).trim();
              if (!s || s === '0') return '-';
              return `${s} ${u}`;
            };
            const m2Formatted = (item.m2 !== undefined && item.m2 !== null) ? Number(item.m2).toFixed(2).replace('.', ',') : '0,00';
            return `
            <div class="detail-item-card">
              <div class="detail-item-card-top">
                <span class="detail-item-card-desc"><strong>#${idx + 1}</strong> — ${escapeHtml(item.descripcion || `Ítem ${idx + 1}`)}</span>
                <span class="badge badge-neutral" style="font-weight:var(--font-bold)">${escapeHtml(item.material || 'Sin material')}</span>
              </div>
              <div class="detail-item-card-grid">
                <div><span class="text-muted">Cantidad:</span> <strong>${item.cantidad || 1} ${item.cantidad > 1 ? 'piezas' : 'pieza'}</strong></div>
                <div><span class="text-muted">Medidas:</span> <strong>${formatMeasure(item.largo)} × ${formatMeasure(item.ancho)}</strong></div>
                <div><span class="text-muted">Superficie total:</span> <strong style="color:var(--color-primary)">${m2Formatted} m²</strong></div>
                <div><span class="text-muted">Precio por m²:</span> <strong>${formatCurrency(item.precioUnitario || 0, pres.moneda)}</strong></div>
              </div>
              <div class="detail-item-card-subtotal">
                <span class="text-muted">Subtotal ítem:</span>
                <strong>${formatCurrency(item.subtotal || 0, pres.moneda)}</strong>
              </div>
            </div>
          `}).join('')}
        </div>
      </div>
    </div>

    ${(() => {
      const itemsSubtotal = (pres.items || []).reduce((s, i) => s + (i.subtotal || 0), 0);
      const adicSubtotal = adicEntries.reduce((s, [, v]) => s + v, 0);
      const baseImponible = itemsSubtotal + adicSubtotal;
      const descMonto = pres.descuento > 0 ? (baseImponible * pres.descuento / 100) : 0;
      const subtotalConDesc = baseImponible - descMonto;
      const ivaMonto = pres.impuestos > 0 ? (subtotalConDesc * pres.impuestos / 100) : 0;

      return `
        <div class="summary-box mb-4">
          <div class="summary-row"><span class="summary-row-label">Subtotal materiales e ítems</span><span class="summary-row-value">${formatCurrency(itemsSubtotal, pres.moneda)}</span></div>
          ${adicEntries.map(([k, v]) => `<div class="summary-row"><span class="summary-row-label">${k}</span><span class="summary-row-value">${formatCurrency(v, pres.moneda)}</span></div>`).join('')}
          ${pres.descuento > 0 ? `<div class="summary-row"><span class="summary-row-label">Descuento (${pres.descuento}%)</span><span class="summary-row-value" style="color:var(--color-error)">-${formatCurrency(descMonto, pres.moneda)}</span></div>` : ''}
          ${pres.impuestos > 0 ? `<div class="summary-row"><span class="summary-row-label">IVA (${pres.impuestos}%)</span><span class="summary-row-value">${formatCurrency(ivaMonto, pres.moneda)}</span></div>` : ''}
          <div class="summary-row total"><span class="summary-row-label">Total</span><span class="summary-row-value">${formatCurrency(total, pres.moneda)}</span></div>
          ${(pres.moneda === 'USD' && pres.cotizacionDolar) ? `
            <div style="font-size:12px;color:var(--color-stone-600);text-align:right;padding:6px 12px;background:var(--color-stone-100);border-radius:var(--radius-sm);margin-top:6px">
              Tipo de cambio: <strong>$${pres.cotizacionDolar} ARS</strong> · Equivalente en pesos: <strong style="color:var(--color-stone-900)">${formatCurrency(total * pres.cotizacionDolar, 'ARS')}</strong>
            </div>
          ` : ''}
        </div>
      `;
    })()}

    ${pres.condiciones ? `
    <div class="card mb-4">
      <div class="card-header"><h3 class="card-title">Condiciones comerciales</h3></div>
      <div class="card-body"><pre style="white-space:pre-wrap;font-family:inherit;font-size:var(--text-sm);color:var(--color-stone-600);line-height:1.6">${escapeHtml(pres.condiciones)}</pre></div>
    </div>` : ''}

    <!-- Quick Operations & Actions Bar (Abajo de todo) -->
    <div class="card mb-4" style="border:1px solid var(--color-stone-200);background:var(--color-stone-50);margin-top:var(--space-4)">
      <div class="card-body" style="padding:var(--space-3) var(--space-4)">
        <!-- 4 Action buttons grid: 2x2 on Mobile, 4 in a row on Desktop -->
        <div class="presupuesto-actions-grid mb-3">
          <button class="btn btn-primary presupuesto-action-btn" id="btn-edit-detail">
            ${Icons.edit} <span>Editar</span>
          </button>
          <button class="btn btn-secondary presupuesto-action-btn" id="btn-agendar-pres">
            ${Icons.calendar} <span>Agendar trabajo</span>
          </button>
          ${pres.estado !== 'aprobado' ? `
            <button class="btn btn-success presupuesto-action-btn" id="btn-aprobar" style="background:#059669;border-color:#059669;color:#fff">
              ${Icons.check} <span>Aprobar</span>
            </button>
          ` : (!pres.obraId ? `
            <button class="btn btn-primary presupuesto-action-btn" id="btn-crear-obra" style="background:var(--color-primary);border-color:var(--color-primary);color:#fff">
              ${Icons['hard-hat']} <span>Generar Obra</span>
            </button>
          ` : `
            <a href="#/obras/${pres.obraId}" class="btn btn-secondary presupuesto-action-btn" style="color:var(--color-primary);border-color:var(--color-primary);text-decoration:none">
              ${Icons['hard-hat']} <span>Ver Obra</span>
            </a>
          `)}
          <button class="btn btn-secondary presupuesto-action-btn" id="btn-share-modal" style="color:#15803D;border-color:#BBF7D0;background:#F0FDF4">
            ${Icons.whatsapp} <span>Compartir</span>
          </button>
        </div>

        <!-- Export & View Actions Below (2-column grid on mobile) -->
        <div class="presupuesto-secondary-grid">
          <button class="btn btn-secondary btn-sm presupuesto-secondary-btn" id="btn-preview">
            ${Icons.eye} <span>Vista previa</span>
          </button>
          <button class="btn btn-pdf btn-sm presupuesto-secondary-btn" id="btn-pdf">
            ${Icons['file-pdf']} <span>Descargar PDF</span>
          </button>
          <button class="btn btn-word btn-sm presupuesto-secondary-btn" id="btn-word">
            ${Icons['file-word']} <span>Descargar Word</span>
          </button>
          ${pres.obraId ? `
            <button type="button" class="btn btn-secondary btn-sm presupuesto-secondary-btn" id="btn-planificar-obra-bottom">
              ${Icons.edit} <span>Planificar obra</span>
            </button>
          ` : ''}
        </div>
      </div>
    </div>
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

  // Edit actions
  const handleEdit = () => {
    openPresupuestoForm(presId, () => {
      renderPresupuestoDetail(container, actionsEl, presId);
    });
  };
  document.getElementById('btn-edit-header')?.addEventListener('click', handleEdit);
  document.getElementById('btn-edit-detail')?.addEventListener('click', handleEdit);

  // Planificar obra vinculada
  const handlePlanificarObra = () => {
    if (!pres.obraId) {
      Toast.warning('Este presupuesto no tiene una obra vinculada');
      return;
    }
    openObraForm(pres.obraId, () => {
      renderPresupuestoDetail(container, actionsEl, presId);
    });
  };
  document.getElementById('btn-header-planificar')?.addEventListener('click', handlePlanificarObra);
  document.getElementById('btn-planificar-obra-direct')?.addEventListener('click', handlePlanificarObra);
  document.getElementById('btn-planificar-obra-bottom')?.addEventListener('click', handlePlanificarObra);

  // Completar datos de cliente desde el banner de alerta
  document.getElementById('btn-completar-cliente-pres')?.addEventListener('click', (e) => {
    const cid = e.currentTarget.dataset.clienteId;
    if (cid) {
      openClienteForm(cid, () => {
        renderPresupuestoDetail(container, actionsEl, presId);
      });
    }
  });

  // Approve action
  const btnAprobar = document.getElementById('btn-aprobar');
  if (btnAprobar) {
    btnAprobar.onclick = () => {
      aprobarPresupuesto(presId, () => {
        renderPresupuestoDetail(container, actionsEl, presId);
      });
    };
  }

  // Create obra (fallback si quedó aprobado sin obra)
  const btnCrearObra = document.getElementById('btn-crear-obra');
  if (btnCrearObra) {
    btnCrearObra.onclick = () => {
      aprobarPresupuesto(presId, (p, obra) => {
        if (obra) {
          window.location.hash = `#/obras/${obra.id}`;
        } else {
          renderPresupuestoDetail(container, actionsEl, presId);
        }
      });
    };
  }

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
  document.getElementById('btn-whatsapp')?.addEventListener('click', async () => {
    const phone = (contact.whatsapp || contact.phone || '').replace(/\D/g, '');
    const msg = `Hola ${contact.name ? contact.name + '! ' : ''}Te envío el presupuesto ${pres.numero} de Marmolería Benjamin.\n\n${pres.descripcion || ''}\nTotal: ${formatCurrency(total, pres.moneda)}\n\n¡Saludos!`;
    await shareViaWhatsAppAndPdf({
      phone,
      text: msg,
      htmlContent: getDocHtml(),
      filename: docFilename
    });
  });
}
