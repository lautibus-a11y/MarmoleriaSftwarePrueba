/* ==========================================================================
   MARMOLERÍA BENJAMIN — Modo Guiado "Paso a Paso"
   Asistente operativo de flujo de trabajo integral
   Cliente → Presupuesto → Confirmación → Obra → Agenda → Seña → Taller → Cierre
   ========================================================================== */

import { DataService } from '../services/mockData.js';
import { formatCurrency, formatDate, escapeHtml, resolveEntityContact, compareNewestFirst } from '../utils/helpers.js';
import { Icons, renderBadge, renderEmptyState, renderSearchInput } from '../components/ui.js';
import { Toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirmDialog.js';
import { openClienteForm } from './clientes.js';
import { openPresupuestoForm, aprobarPresupuesto, openShareModal } from './presupuestos.js';
import { openObraForm } from './obras.js';
import { openEventoForm } from './calendario.js';
import { openCobroForm } from './cobros.js';
import { openDescontarStockObraModal } from '../services/stockAutomation.js';
import { OBRA_ESTADO_LABELS, OBRA_ESTADO_COLORS, PRESUPUESTO_ESTADO_LABELS, PRESUPUESTO_ESTADO_COLORS } from '../utils/constants.js';

// ── Pasos del Flujo Guiado ──
export const PASOS_CONFIG = [
  { step: 1, title: 'Cliente', subtitle: 'Datos y contacto', icon: 'users' },
  { step: 2, title: 'Presupuesto', subtitle: 'Medidas y materiales', icon: 'file-text' },
  { step: 3, title: 'Confirmación', subtitle: 'Envío y respuesta', icon: 'clock' },
  { step: 4, title: 'Obra', subtitle: 'Orden de trabajo', icon: 'hard-hat' },
  { step: 5, title: 'Agenda', subtitle: 'Turno e instalación', icon: 'calendar' },
  { step: 6, title: 'Seña / Cobro', subtitle: 'Anticipo comercial', icon: 'hand-coins' },
  { step: 7, title: 'Taller', subtitle: 'Stock y producción', icon: 'package' },
  { step: 8, title: 'Finalización', subtitle: 'Colocación y saldo', icon: 'check' }
];

// ── Almacenamiento local de borradores iniciales (antes de crear presupuesto) ──
const STORAGE_KEY_DRAFTS = 'mb_paso_drafts';

function getLocalDrafts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFTS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalDrafts(drafts) {
  try {
    localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(drafts));
  } catch (e) {}
}

function createNewDraft() {
  const drafts = getLocalDrafts();
  const id = 'draft-' + Date.now();
  const newDraft = {
    id,
    clienteId: null,
    clienteNombre: '',
    telefono: '',
    direccion: '',
    observaciones: '',
    createdAt: new Date().toISOString()
  };
  drafts.unshift(newDraft);
  saveLocalDrafts(drafts);
  return newDraft;
}

function updateDraft(id, data) {
  const drafts = getLocalDrafts();
  const idx = drafts.findIndex(d => d.id === id);
  if (idx !== -1) {
    drafts[idx] = { ...drafts[idx], ...data, updatedAt: new Date().toISOString() };
    saveLocalDrafts(drafts);
    return drafts[idx];
  }
  return null;
}

function removeDraft(id) {
  const drafts = getLocalDrafts().filter(d => d.id !== id);
  saveLocalDrafts(drafts);
}

// ── Consolidación unificada de Procesos a partir de los datos reales del sistema ──
export function getAllProcesses() {
  const presupuestos = DataService.getAll('presupuestos');
  const obras = DataService.getAll('obras');
  const clientes = DataService.getAll('clientes');
  const eventos = DataService.getAll('eventos');
  const cobros = DataService.getAll('cobros');
  const drafts = getLocalDrafts();

  const processes = [];
  const processedObraIds = new Set();

  // 1. Procesos originados por presupuestos (con o sin obra vinculada)
  presupuestos.forEach(pres => {
    let obra = null;
    if (pres.obraId) {
      obra = obras.find(o => String(o.id) === String(pres.obraId));
    }
    if (!obra) {
      obra = obras.find(o => String(o.presupuestoId) === String(pres.id));
    }
    if (obra) processedObraIds.add(String(obra.id));

    const cliente = pres.clienteId
      ? clientes.find(c => String(c.id) === String(pres.clienteId))
      : (obra?.clienteId ? clientes.find(c => String(c.id) === String(obra.clienteId)) : null);

    const contact = resolveEntityContact(cliente, {
      clienteNombre: pres.clienteNombre || obra?.clienteNombre,
      telefono: pres.telefono || obra?.contacto || obra?.telefono
    });

    const presEventos = eventos.filter(e =>
      (obra && String(e.obraId) === String(obra.id)) ||
      String(e.presupuestoId) === String(pres.id) ||
      (cliente && String(e.clienteId) === String(cliente.id))
    );

    const presCobros = cobros.filter(c =>
      (obra && String(c.obraId) === String(obra.id)) ||
      (cliente && String(c.clienteId) === String(cliente.id))
    );

    const stateInfo = calculateProcessState({
      presupuesto: pres,
      obra,
      cliente,
      eventos: presEventos,
      cobros: presCobros
    });

    processes.push({
      processId: `pres-${pres.id}`,
      type: 'presupuesto',
      id: pres.id,
      presupuestoId: pres.id,
      obraId: obra?.id || null,
      presupuesto: pres,
      obra,
      cliente,
      clienteNombre: contact.name || 'Cliente sin nombre',
      telefono: contact.whatsapp || contact.phone || '',
      direccion: pres.direccion || obra?.direccion || cliente?.direccion || '',
      fecha: pres.fecha || pres.createdAt,
      stateInfo
    });
  });

  // 2. Obras creadas directamente (sin presupuesto originario)
  obras.forEach(o => {
    if (processedObraIds.has(String(o.id))) return;

    const cliente = o.clienteId ? clientes.find(c => String(c.id) === String(o.clienteId)) : null;
    const contact = resolveEntityContact(cliente, { clienteNombre: o.clienteNombre, telefono: o.contacto || o.telefono });

    const obraEventos = eventos.filter(e => String(e.obraId) === String(o.id));
    const obraCobros = cobros.filter(c => String(c.obraId) === String(o.id));

    const stateInfo = calculateProcessState({
      presupuesto: null,
      obra: o,
      cliente,
      eventos: obraEventos,
      cobros: obraCobros
    });

    processes.push({
      processId: `obra-${o.id}`,
      type: 'obra',
      id: o.id,
      presupuestoId: null,
      obraId: o.id,
      presupuesto: null,
      obra: o,
      cliente,
      clienteNombre: contact.name || 'Cliente sin nombre',
      telefono: contact.whatsapp || contact.phone || '',
      direccion: o.direccion || cliente?.direccion || '',
      fecha: o.fechaInicio || o.createdAt,
      stateInfo
    });
  });

  // 3. Borradores temporales no comiteados aún a presupuesto
  drafts.forEach(d => {
    const cliente = d.clienteId ? clientes.find(c => String(c.id) === String(d.clienteId)) : null;
    const stateInfo = calculateProcessState({
      draft: d,
      cliente
    });

    processes.push({
      processId: d.id,
      type: 'draft',
      id: d.id,
      presupuestoId: null,
      obraId: null,
      draft: d,
      presupuesto: null,
      obra: null,
      cliente,
      clienteNombre: cliente ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : (d.clienteNombre || 'Nuevo cliente en borrador'),
      telefono: cliente ? (cliente.whatsapp || cliente.telefono || '') : (d.telefono || ''),
      direccion: d.direccion || cliente?.direccion || '',
      fecha: d.createdAt,
      stateInfo
    });
  });

  return processes.sort((a, b) => {
    // Los borradores arriba, luego por fecha descendente
    if (a.type === 'draft' && b.type !== 'draft') return -1;
    if (b.type === 'draft' && a.type !== 'draft') return 1;
    return compareNewestFirst(a, b);
  });
}

// ── Máquina de Estado Dinámica del Proceso (8 Pasos) ──
export function calculateProcessState({ draft, presupuesto, obra, cliente, eventos = [], cobros = [] }) {
  // Caso Borrador inicial en confección
  if (draft) {
    if (!draft.clienteId && !draft.clienteNombre) {
      return {
        currentStep: 1,
        stepName: 'Cliente',
        statusKey: 'draft_client',
        statusLabel: 'Faltan datos del cliente',
        statusColor: 'info',
        progressPercent: 12,
        canAdvance: false,
        isCompleted: false,
        isWaiting: false,
        summary: 'Ingresá o seleccioná el cliente para iniciar este trabajo.'
      };
    }
    return {
      currentStep: 2,
      stepName: 'Presupuesto',
      statusKey: 'draft_presupuesto',
      statusLabel: 'Confeccionar presupuesto',
      statusColor: 'info',
      progressPercent: 25,
      canAdvance: false,
      isCompleted: false,
      isWaiting: false,
      summary: 'El cliente está definido. Falta cotizar las piezas y materiales.'
    };
  }

  // Si no hay presupuesto ni obra
  if (!presupuesto && !obra) {
    return {
      currentStep: 1,
      stepName: 'Cliente',
      statusKey: 'nuevo',
      statusLabel: 'Nuevo proceso',
      statusColor: 'neutral',
      progressPercent: 10,
      canAdvance: false,
      isCompleted: false,
      isWaiting: false,
      summary: 'Iniciando proceso.'
    };
  }

  // Presupuesto no aprobado aún
  if (presupuesto && presupuesto.estado !== 'aprobado' && !obra) {
    if (presupuesto.estado === 'borrador') {
      return {
        currentStep: 3,
        stepName: 'Confirmación',
        statusKey: 'borrador',
        statusLabel: 'Presupuesto en borrador',
        statusColor: 'neutral',
        progressPercent: 35,
        canAdvance: true,
        isCompleted: false,
        isWaiting: false,
        summary: `Presupuesto ${presupuesto.numero || '#' + presupuesto.id} listo para enviar o aprobar.`
      };
    }
    if (presupuesto.estado === 'enviado') {
      return {
        currentStep: 3,
        stepName: 'Confirmación',
        statusKey: 'esperando_confirmacion',
        statusLabel: 'Esperando confirmación',
        statusColor: 'warning',
        progressPercent: 37,
        canAdvance: true,
        isCompleted: false,
        isWaiting: true,
        summary: 'Presupuesto enviado al cliente. Esperando confirmación para aprobar.'
      };
    }
    if (presupuesto.estado === 'rechazado' || presupuesto.estado === 'vencido') {
      return {
        currentStep: 3,
        stepName: 'Confirmación',
        statusKey: presupuesto.estado,
        statusLabel: presupuesto.estado === 'rechazado' ? 'Rechazado por el cliente' : 'Presupuesto vencido',
        statusColor: presupuesto.estado === 'rechazado' ? 'error' : 'warning',
        progressPercent: 37,
        canAdvance: false,
        isCompleted: false,
        isWaiting: false,
        summary: `El presupuesto se encuentra ${presupuesto.estado}.`
      };
    }
  }

  // Presupuesto aprobado pero sin obra registrada aún
  if (presupuesto && presupuesto.estado === 'aprobado' && !obra) {
    return {
      currentStep: 4,
      stepName: 'Obra',
      statusKey: 'crear_obra',
      statusLabel: 'Presupuesto aprobado',
      statusColor: 'info',
      progressPercent: 45,
      canAdvance: false,
      isCompleted: false,
      isWaiting: false,
      summary: 'Presupuesto aprobado. Crear la Orden de Obra técnica para el taller.'
    };
  }

  // A partir de aquí existe una Obra real
  if (obra.estado === 'finalizada') {
    return {
      currentStep: 8,
      stepName: 'Finalización',
      statusKey: 'finalizada',
      statusLabel: 'Finalizado',
      statusColor: 'success',
      progressPercent: 100,
      canAdvance: false,
      isCompleted: true,
      isWaiting: false,
      summary: `Obra #${obra.id} finalizada y entregada con éxito.`
    };
  }

  if (obra.estado === 'cancelada') {
    return {
      currentStep: 8,
      stepName: 'Cancelada',
      statusKey: 'cancelada',
      statusLabel: 'Cancelada',
      statusColor: 'error',
      progressPercent: 100,
      canAdvance: false,
      isCompleted: false,
      isWaiting: false,
      summary: 'La obra fue cancelada.'
    };
  }

  // Paso 5: Planificación y Agenda
  const hasEvent = eventos.some(e => String(e.obraId) === String(obra.id) || (presupuesto && String(e.presupuestoId) === String(presupuesto.id)));
  const hasEstimada = !!obra.fechaEstimada;
  const isAgendada = hasEvent || hasEstimada;

  if (!isAgendada) {
    return {
      currentStep: 5,
      stepName: 'Agenda',
      statusKey: 'falta_agendar',
      statusLabel: 'Falta agendar',
      statusColor: 'info',
      progressPercent: 60,
      canAdvance: true,
      isCompleted: false,
      isWaiting: false,
      summary: 'La obra está creada. Falta definir fecha estimada o agendar evento en Calendario.'
    };
  }

  // Paso 6: Cobro de Seña / Anticipo
  const totalObra = DataService.getObraTotal(obra.id);
  const cobradoObra = DataService.getObraCobrado(obra.id);
  const saldoPendiente = totalObra - cobradoObra;

  if (totalObra > 0 && cobradoObra <= 0) {
    return {
      currentStep: 6,
      stepName: 'Seña / Anticipo',
      statusKey: 'pendiente_sena',
      statusLabel: 'Pendiente de seña',
      statusColor: 'warning',
      progressPercent: 72,
      canAdvance: true,
      isCompleted: false,
      isWaiting: false,
      summary: `Anticipo pendiente. Total de la obra: ${formatCurrency(totalObra)}. Sin cobros registrados.`
    };
  }

  // Paso 7: Taller y Salida de Stock
  const isStockDescontado = !!obra.stockDescontado;
  const isProduccionIniciada = ['en_preparacion', 'en_proceso', 'colocacion'].includes(obra.estado);

  if (!isStockDescontado && !isProduccionIniciada) {
    return {
      currentStep: 7,
      stepName: 'Taller',
      statusKey: 'pendiente_taller',
      statusLabel: 'En preparación / taller',
      statusColor: 'neutral',
      progressPercent: 85,
      canAdvance: true,
      isCompleted: false,
      isWaiting: false,
      summary: 'Descontar materiales de stock y pasar obra a estado de taller o colocación.'
    };
  }

  // Paso 8: Colocación y Saldo Final
  return {
    currentStep: 8,
    stepName: 'Finalización',
    statusKey: saldoPendiente > 0 ? 'saldo_pendiente' : 'lista_finalizar',
    statusLabel: saldoPendiente > 0 ? 'Saldo pendiente / Colocación' : 'Lista para finalizar',
    statusColor: saldoPendiente > 0 ? 'info' : 'accent',
    progressPercent: 92,
    canAdvance: true,
    isCompleted: false,
    isWaiting: false,
    summary: saldoPendiente > 0
      ? `Obra en ejecución. Saldo restante: ${formatCurrency(saldoPendiente)}.`
      : 'Obra lista para marcar como finalizada.'
  };
}

// ── VISTA PRINCIPAL: LISTADO DE PROCESOS ──
export function renderPasoAPaso(container, actionsEl, path = '/paso-a-paso') {
  const parts = path.split('/');
  // Sub-ruta de detalle de proceso: /paso-a-paso/:processId
  if (parts.length > 2 && parts[2]) {
    renderPasoAPasoWorkflow(container, actionsEl, parts[2]);
    return;
  }

  actionsEl.innerHTML = `
    <button class="btn btn-primary" id="btn-workflow-new-process" style="font-weight:var(--font-bold);box-shadow:0 2px 8px rgba(0,0,0,0.1)">
      ${Icons.plus} <span>Iniciar nuevo proceso</span>
    </button>
  `;

  actionsEl.querySelector('#btn-workflow-new-process')?.addEventListener('click', () => {
    const draft = createNewDraft();
    window.location.hash = `#/paso-a-paso/${draft.id}`;
  });

  let filterTab = 'activos'; // 'todos' | 'activos' | 'espera' | 'finalizados'
  let searchTerm = '';

  function renderList() {
    const allProcesses = getAllProcesses();

    let filtered = allProcesses;
    if (filterTab === 'activos') {
      filtered = filtered.filter(p => !p.stateInfo.isCompleted);
    } else if (filterTab === 'espera') {
      filtered = filtered.filter(p => p.stateInfo.isWaiting);
    } else if (filterTab === 'finalizados') {
      filtered = filtered.filter(p => p.stateInfo.isCompleted);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => {
        const text = [
          p.clienteNombre,
          p.telefono,
          p.direccion,
          p.presupuesto?.numero,
          p.obra?.id ? '#' + p.obra.id : '',
          p.presupuesto?.descripcion,
          p.obra?.descripcion,
          p.presupuesto?.material,
          p.obra?.material
        ].filter(Boolean).join(' ').toLowerCase();
        return text.includes(term);
      });
    }

    const counts = {
      todos: allProcesses.length,
      activos: allProcesses.filter(p => !p.stateInfo.isCompleted).length,
      espera: allProcesses.filter(p => p.stateInfo.isWaiting).length,
      finalizados: allProcesses.filter(p => p.stateInfo.isCompleted).length
    };

    container.innerHTML = `
      <div class="paso-container">
        <!-- Hero explicativo -->
        <div class="workflow-hero-banner">
          <div class="workflow-hero-left">
            <div class="workflow-hero-icon">${Icons.workflow || Icons['file-text']}</div>
            <div>
              <h2 class="workflow-hero-title">Paso a Paso — Flujo de Trabajo Guiado</h2>
              <p class="workflow-hero-sub">
                Acompañamiento ordenado desde el primer contacto del cliente hasta la colocación final y cobro del saldo.
              </p>
            </div>
          </div>
          <button class="btn btn-primary btn-workflow-hero-action" id="btn-hero-new-process">
            ${Icons.plus} Iniciar nuevo proceso
          </button>
        </div>

        <!-- Barra de herramientas: Filtros y Buscador -->
        <div class="workflow-toolbar">
          <div class="workflow-tabs-group">
            <button type="button" class="workflow-tab-btn ${filterTab === 'activos' ? 'active' : ''}" data-tab="activos">
              Activos <span class="workflow-tab-badge">${counts.activos}</span>
            </button>
            <button type="button" class="workflow-tab-btn ${filterTab === 'espera' ? 'active' : ''}" data-tab="espera">
              Esperando confirmación <span class="workflow-tab-badge">${counts.espera}</span>
            </button>
            <button type="button" class="workflow-tab-btn ${filterTab === 'finalizados' ? 'active' : ''}" data-tab="finalizados">
              Finalizados <span class="workflow-tab-badge">${counts.finalizados}</span>
            </button>
            <button type="button" class="workflow-tab-btn ${filterTab === 'todos' ? 'active' : ''}" data-tab="todos">
              Todos <span class="workflow-tab-badge">${counts.todos}</span>
            </button>
          </div>

          <div class="workflow-search-box">
            ${renderSearchInput('Buscar por cliente, presupuesto, obra...')}
          </div>
        </div>

        <!-- Listado de tarjetas de procesos -->
        <div class="workflow-process-grid" id="workflow-process-grid">
          ${filtered.length === 0 ? renderEmptyState({
            title: filterTab === 'espera'
              ? 'No hay presupuestos esperando confirmación'
              : (filterTab === 'finalizados' ? 'No hay obras finalizadas en el historial' : 'No hay procesos en esta categoría'),
            message: 'Iniciá un nuevo trabajo guiado para comenzar a registrar clientes y obras.'
          }) : filtered.map(proc => renderProcessCard(proc)).join('')}
        </div>
      </div>
    `;

    // Conectar eventos
    container.querySelectorAll('.workflow-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        filterTab = btn.dataset.tab;
        renderList();
      });
    });

    const searchInput = container.querySelector('#search-input');
    if (searchInput) {
      searchInput.value = searchTerm;
      searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderList();
      });
    }

    container.querySelector('#btn-hero-new-process')?.addEventListener('click', () => {
      const draft = createNewDraft();
      window.location.hash = `#/paso-a-paso/${draft.id}`;
    });

    container.querySelectorAll('.workflow-process-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="delete-draft"]') || e.target.closest('a')) {
          return;
        }
        const id = card.dataset.processId;
        if (id) {
          window.location.hash = `#/paso-a-paso/${id}`;
        }
      });
    });

    container.querySelectorAll('[data-action="continue-process"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        window.location.hash = `#/paso-a-paso/${id}`;
      });
    });

    container.querySelectorAll('[data-action="delete-draft"]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        const ok = await confirmDialog({
          title: 'Descartar borrador',
          message: '¿Querés eliminar este borrador de proceso no guardado?',
          confirmText: 'Descartar',
          type: 'danger'
        });
        if (ok) {
          removeDraft(id);
          Toast.success('Borrador descartado');
          renderList();
        }
      });
    });
  }

  // Escuchar cambios reactivos en los datos del sistema
  const handleDataChanged = () => {
    if (container.isConnected) {
      renderList();
    } else {
      window.removeEventListener('mb-data-changed', handleDataChanged);
    }
  };
  window.addEventListener('mb-data-changed', handleDataChanged);

  renderList();
}

// ── RENDERIZADO DE TARJETA DE PROCESO ──
function renderProcessCard(proc) {
  const { stateInfo, clienteNombre, telefono, direccion, presupuesto, obra, processId, type } = proc;
  const isDraft = type === 'draft';
  const total = obra
    ? DataService.getObraTotal(obra.id)
    : (presupuesto ? DataService.getPresupuestoTotal(presupuesto) : 0);
  const cobrado = obra ? DataService.getObraCobrado(obra.id) : 0;
  const saldo = total - cobrado;
  const trabMaterial = obra?.material || presupuesto?.material || obra?.descripcion || presupuesto?.descripcion || 'A definir';

  return `
    <div class="workflow-process-card ${stateInfo.isCompleted ? 'completed' : ''}" data-process-id="${escapeHtml(processId)}">
      <div class="workflow-card-header">
        <div class="workflow-client-title">
          <strong title="${escapeHtml(clienteNombre)}">${escapeHtml(clienteNombre)}</strong>
          ${telefono ? `<span class="workflow-client-phone">📞 ${escapeHtml(telefono)}</span>` : '<span class="workflow-client-phone text-muted">Sin teléfono</span>'}
          <div class="workflow-entity-tags">
            ${presupuesto?.numero ? `<span class="badge badge-neutral">${escapeHtml(presupuesto.numero)}</span>` : ''}
            ${obra?.id ? `<span class="badge badge-neutral">Obra #${escapeHtml(String(obra.id))}</span>` : ''}
            ${isDraft ? `<span class="badge badge-warning">Borrador inicial</span>` : ''}
          </div>
        </div>
        <div class="workflow-card-header-right">
          ${renderBadge(stateInfo.statusLabel, stateInfo.statusColor)}
        </div>
      </div>

      <!-- Barra de progreso del proceso -->
      <div class="workflow-card-progress-box">
        <div class="workflow-card-progress-labels">
          <span class="workflow-step-badge">Paso ${stateInfo.currentStep} de 8</span>
          <span class="workflow-step-name">${escapeHtml(stateInfo.stepName)} (${stateInfo.progressPercent}%)</span>
        </div>
        <div class="workflow-progress-track">
          <div class="workflow-progress-fill" style="width: ${stateInfo.progressPercent}%; background: ${stateInfo.isCompleted ? 'var(--color-success)' : (stateInfo.isWaiting ? 'var(--color-warning)' : 'var(--color-primary)')}"></div>
        </div>
      </div>

      <!-- Datos clave del trabajo -->
      <div class="workflow-card-meta-list">
        <div class="workflow-card-meta-row">
          <span class="workflow-meta-label">📍 Dirección</span>
          <span class="workflow-meta-value" title="${escapeHtml(direccion || '-')}">${escapeHtml(direccion || '-')}</span>
        </div>
        <div class="workflow-card-meta-row">
          <span class="workflow-meta-label">🪨 Trabajo</span>
          <span class="workflow-meta-value" title="${escapeHtml(trabMaterial)}">${escapeHtml(trabMaterial)}</span>
        </div>
        <div class="workflow-card-meta-row">
          <span class="workflow-meta-label">💰 Importe</span>
          <span class="workflow-meta-value font-mono">
            ${total > 0 ? formatCurrency(total, presupuesto?.moneda || obra?.moneda || 'ARS') : 'A cotizar'}
            ${obra && saldo > 0 ? `<span style="color:var(--color-warning);font-size:11px;font-weight:700"> (Resta: ${formatCurrency(saldo)})</span>` : ''}
          </span>
        </div>
      </div>

      <!-- Banner de próximo paso sugerido -->
      <div class="workflow-card-next-banner ${stateInfo.isWaiting ? 'waiting' : (stateInfo.isCompleted ? 'completed' : '')}">
        <div class="workflow-next-header">
          <span class="workflow-next-tag">
            ${stateInfo.isCompleted ? '✅ Proceso concluido' : (stateInfo.isWaiting ? '⏳ Esperando al cliente' : '👉 Próximo paso')}
          </span>
        </div>
        <div class="workflow-next-text">${escapeHtml(stateInfo.summary)}</div>
      </div>

      <!-- Botonera de la tarjeta con alineación inferior fija -->
      <div class="workflow-card-footer">
        ${isDraft ? `
          <button type="button" class="btn btn-ghost btn-sm text-error" data-action="delete-draft" data-id="${escapeHtml(processId)}" title="Descartar borrador">
            ${Icons.trash}
          </button>
        ` : ''}
        <button type="button" class="btn ${stateInfo.isCompleted ? 'btn-secondary' : 'btn-primary'} workflow-card-continue-btn" data-action="continue-process" data-id="${escapeHtml(processId)}">
          <span>${stateInfo.isCompleted ? 'Ver proceso completo' : `Continuar: Paso ${stateInfo.currentStep} · ${stateInfo.stepName}`}</span>
          ${Icons['chevron-right']}
        </button>
      </div>
    </div>
  `;
}

// ── VISTA DETALLADA DEL PROCESO: FLUJO GUIADO ──
export function renderPasoAPasoWorkflow(container, actionsEl, processId) {
  const allProcesses = getAllProcesses();
  let proc = allProcesses.find(p => p.processId === processId);

  if (!proc) {
    container.innerHTML = `
      <div class="paso-container">
        ${renderEmptyState({
          title: 'Proceso no encontrado',
          message: 'El proceso seleccionado no existe o fue eliminado.'
        })}
        <div style="text-align:center;margin-top:var(--space-4)">
          <a href="#/paso-a-paso" class="btn btn-primary">Volver al listado de Paso a Paso</a>
        </div>
      </div>
    `;
    return;
  }

  // Paso actualmente enfocado (por defecto el paso actual que determinó el sistema)
  let activeStep = proc.stateInfo.currentStep;

  actionsEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:var(--space-2)">
      <a href="#/paso-a-paso" class="btn btn-secondary btn-sm" title="Volver a la lista de procesos">
        ${Icons['chevron-left']} <span>Guardar y salir</span>
      </a>
      <a href="#/dashboard" class="btn btn-ghost btn-sm text-muted" title="Salir a las pestañas habituales">
        <span>Salir del modo guiado</span>
      </a>
    </div>
  `;

  function renderWorkflow() {
    // Recargar proceso vivo desde DataService para reflejar cualquier cambio en vivo
    const updatedAll = getAllProcesses();
    const currentProc = updatedAll.find(p => p.processId === processId) || proc;
    proc = currentProc;

    const { stateInfo, clienteNombre, telefono, direccion, presupuesto, obra, draft } = proc;
    const cliente = proc.cliente || (presupuesto?.clienteId ? DataService.getById('clientes', presupuesto.clienteId) : null);
    const total = obra ? DataService.getObraTotal(obra.id) : (presupuesto ? DataService.getPresupuestoTotal(presupuesto) : 0);
    const cobrado = obra ? DataService.getObraCobrado(obra.id) : 0;
    const saldo = total - cobrado;

    container.innerHTML = `
      <div class="paso-container">
        <!-- Barra de navegación superior del proceso -->
        <div class="workflow-detail-header">
          <div class="workflow-detail-header-left">
            <a href="#/paso-a-paso" class="workflow-back-link">${Icons['chevron-left']} Volver a todos los procesos</a>
            <div class="workflow-detail-title-box">
              <h2 class="workflow-detail-title">${escapeHtml(clienteNombre)}</h2>
              <div class="workflow-detail-tags">
                ${presupuesto?.numero ? `<a href="#/presupuestos/${presupuesto.id}" class="badge badge-neutral" title="Ver en Presupuestos">${escapeHtml(presupuesto.numero)}</a>` : ''}
                ${obra?.id ? `<a href="#/obras/${obra.id}" class="badge badge-neutral" title="Ver en Obras">Obra #${escapeHtml(String(obra.id))}</a>` : ''}
                ${renderBadge(stateInfo.statusLabel, stateInfo.statusColor)}
              </div>
            </div>
          </div>
          <div class="workflow-detail-header-right">
            <div class="workflow-stepper-counter">
              <span class="counter-label">Progreso del trabajo</span>
              <strong class="counter-val">Paso ${stateInfo.currentStep} de 8</strong>
            </div>
          </div>
        </div>

        <!-- Stepper horizontal interactivo -->
        <div class="workflow-stepper-container">
          <div class="workflow-stepper">
            ${PASOS_CONFIG.map((s, idx) => {
              const isPast = s.step < stateInfo.currentStep || stateInfo.isCompleted;
              const isCurrent = s.step === stateInfo.currentStep;
              const isViewing = s.step === activeStep;
              return `
                <div class="step-node ${isPast ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isViewing ? 'viewing' : ''}" data-step="${s.step}">
                  <div class="step-circle">
                    ${isPast ? Icons.check : s.step}
                  </div>
                  <div class="step-labels">
                    <span class="step-title">${escapeHtml(s.title)}</span>
                    <span class="step-subtitle">${escapeHtml(s.subtitle)}</span>
                  </div>
                </div>
                ${idx < PASOS_CONFIG.length - 1 ? `<div class="step-connector ${isPast ? 'active' : ''}"></div>` : ''}
              `;
            }).join('')}
          </div>
        </div>

        <!-- Tarjeta enfocada del paso seleccionado -->
        <div class="workflow-step-card" id="workflow-step-card">
          ${renderStepContent({
            step: activeStep,
            proc,
            cliente,
            presupuesto,
            obra,
            draft,
            total,
            cobrado,
            saldo,
            stateInfo
          })}
        </div>
      </div>
    `;

    // Eventos de selección de pasos en el stepper
    container.querySelectorAll('.step-node').forEach(node => {
      node.addEventListener('click', () => {
        const targetStep = parseInt(node.dataset.step, 10);
        activeStep = targetStep;
        renderWorkflow();
      });
    });

    // Conectar botones y acciones dentro del paso activo
    attachStepActions({
      activeStep,
      proc,
      processId,
      total,
      cobrado,
      saldo,
      onRefresh: () => renderWorkflow(),
      onAdvanceTo: (nextStep) => {
        activeStep = nextStep;
        renderWorkflow();
      }
    });
  }

  // Escuchar cambios reactivos en tiempo real
  const handleDataChanged = () => {
    if (container.isConnected) {
      renderWorkflow();
    } else {
      window.removeEventListener('mb-data-changed', handleDataChanged);
    }
  };
  window.addEventListener('mb-data-changed', handleDataChanged);

  renderWorkflow();
}

// ── RENDERIZADO DEL CONTENIDO DE CADA PASO ──
function renderStepContent({ step, proc, cliente, presupuesto, obra, draft, total, cobrado, saldo, stateInfo }) {
  const stepMeta = PASOS_CONFIG.find(s => s.step === step) || PASOS_CONFIG[0];
  const prevMeta = step > 1 ? PASOS_CONFIG.find(s => s.step === step - 1) : null;
  const nextMeta = step < 8 ? PASOS_CONFIG.find(s => s.step === step + 1) : null;

  let bodyHtml = '';

  switch (step) {
    // ── PASO 1: CLIENTE ──
    case 1: {
      const hasClient = !!(cliente || proc.clienteNombre);
      bodyHtml = `
        <div class="step-content-section">
          <p class="step-description">
            Todo trabajo en Marmolería Benjamín comienza identificando al cliente para registrar sus datos de contacto y dirección de colocación.
          </p>

          ${cliente ? `
            <div class="workflow-entity-summary-box">
              <div class="summary-header">
                <div style="display:flex;align-items:center;gap:10px">
                  <span style="font-size:20px">👤</span>
                  <div>
                    <strong style="font-size:16px">${escapeHtml(cliente.nombre)} ${escapeHtml(cliente.apellido || '')}</strong>
                    ${cliente.cuit ? `<span class="badge badge-neutral" style="margin-left:8px">CUIT: ${escapeHtml(cliente.cuit)}</span>` : ''}
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:8px">
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-action-edit-client">
                    ${Icons.edit} Editar ficha
                  </button>
                  ${draft ? `
                    <button type="button" class="btn btn-ghost btn-sm text-muted" id="btn-action-change-client">
                      Cambiar cliente
                    </button>
                  ` : ''}
                </div>
              </div>
              <div class="summary-grid">
                <div>
                  <span class="text-muted">📞 WhatsApp / Teléfono:</span>
                  <strong>
                    ${cliente.whatsapp || cliente.telefono ? `
                      <a href="https://wa.me/${(cliente.whatsapp || cliente.telefono).replace(/[^0-9]/g, '')}" target="_blank" rel="noopener" style="color:var(--color-primary);text-decoration:underline">
                        ${escapeHtml(cliente.whatsapp || cliente.telefono)}
                      </a>
                    ` : '-'}
                  </strong>
                </div>
                <div><span class="text-muted">📍 Dirección:</span> <strong>${escapeHtml(cliente.direccion || '-')}</strong></div>
                <div><span class="text-muted">✉️ Email:</span> <strong>${escapeHtml(cliente.email || '-')}</strong></div>
                <div><span class="text-muted">🏢 Localidad / Zona:</span> <strong>${escapeHtml(cliente.localidad || cliente.ciudad || '-')}</strong></div>
              </div>
            </div>
          ` : `
            <div class="workflow-two-options-grid">
              <div class="workflow-option-card">
                <div class="workflow-option-header">
                  <span>🔍</span> Opción A: Cliente existente
                </div>
                <p class="text-muted" style="font-size:13px;line-height:1.4">
                  Seleccioná un cliente ya registrado en el sistema administrativo de la marmolería.
                </p>
                <div class="form-group" style="margin-top:10px">
                  <select class="form-select" id="workflow-client-select">
                    <option value="">Buscar o seleccionar cliente...</option>
                    ${DataService.getAll('clientes').map(c => `
                      <option value="${c.id}">${escapeHtml(c.nombre)} ${escapeHtml(c.apellido || '')} (${escapeHtml(c.telefono || c.whatsapp || 'Sin tel')})</option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <div class="workflow-option-card">
                <div class="workflow-option-header">
                  <span>➕</span> Opción B: Cliente nuevo
                </div>
                <p class="text-muted" style="font-size:13px;line-height:1.4">
                  Si es la primera vez que compra, registrá sus datos de contacto ahora mismo.
                </p>
                <button type="button" class="btn btn-primary" id="btn-action-new-client" style="margin-top:auto;width:100%;font-weight:700">
                  ${Icons.plus} Registrar nuevo cliente
                </button>
              </div>
            </div>
          `}

          <div class="step-action-footer">
            <div></div>
            <button type="button" class="btn btn-primary" id="btn-step-next" ${!hasClient ? 'disabled' : ''}>
              Siguiente: Paso 2 (${nextMeta?.title || 'Presupuesto'}) ${Icons['chevron-right']}
            </button>
          </div>
        </div>
      `;
      break;
    }

    // ── PASO 2: PRESUPUESTO ──
    case 2: {
      const hasPres = !!presupuesto;
      bodyHtml = `
        <div class="step-content-section">
          <p class="step-description">
            Confeccioná la cotización detallando las piezas (mesadas, islas, zócalos), materiales de stock seleccionados, terminaciones e instalaciones.
          </p>

          ${hasPres ? `
            <div class="workflow-entity-summary-box">
              <div class="summary-header">
                <div>
                  <strong style="font-size:16px">Presupuesto ${escapeHtml(presupuesto.numero || '#' + presupuesto.id)}</strong>
                  <span style="margin-left:8px">${renderBadge(PRESUPUESTO_ESTADO_LABELS[presupuesto.estado] || presupuesto.estado, PRESUPUESTO_ESTADO_COLORS[presupuesto.estado] || 'neutral')}</span>
                </div>
                <div style="display:flex;gap:8px">
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-action-edit-pres">
                    ${Icons.edit} Modificar cotización
                  </button>
                  <a href="#/presupuestos/${presupuesto.id}" class="btn btn-ghost btn-sm" title="Ver ficha en pestaña Presupuestos">
                    ${Icons.eye} Ver cotización
                  </a>
                </div>
              </div>

              <div class="summary-grid">
                <div><span class="text-muted">Fecha de cotización:</span> <strong>${formatDate(presupuesto.fecha)}</strong></div>
                <div><span class="text-muted">Material principal:</span> <strong>${escapeHtml(presupuesto.material || 'A definir')}</strong></div>
                <div><span class="text-muted">Total cotizado:</span> <strong style="font-size:16px;color:var(--color-stone-900);font-family:var(--font-mono)">${formatCurrency(total, presupuesto.moneda)}</strong></div>
                <div><span class="text-muted">Piezas cotizadas:</span> <strong>${(presupuesto.items || []).length} pieza/s</strong></div>
              </div>

              <!-- Lista resumida de piezas -->
              ${presupuesto.items && presupuesto.items.length > 0 ? `
                <div class="workflow-items-mini-list">
                  ${presupuesto.items.map(it => `
                    <div class="workflow-item-mini-row">
                      <span><strong>${escapeHtml(it.descripcion || 'Pieza')}</strong> · ${escapeHtml(it.material || '')} (${it.largo || 0}×${it.ancho || 0} ${it.unidadMedida || 'cm'})</span>
                      <span class="font-mono font-bold">${formatCurrency(it.subtotal || 0, presupuesto.moneda)}</span>
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          ` : `
            <div class="workflow-action-hero-card">
              <div class="workflow-action-hero-icon">${Icons['file-text']}</div>
              <h3 style="margin-bottom:8px">Confeccionar Cotización Oficial</h3>
              <p class="text-muted" style="max-width:540px;margin:0 auto 20px auto;font-size:13.5px">
                Abrí el Cotizador técnico interactivo. Podés ingresar piezas, calcular metros cuadrados de placas, terminaciones de borde, colocación y bachas.
              </p>
              <button type="button" class="btn btn-primary btn-lg" id="btn-action-create-pres" style="font-weight:700;padding:12px 28px;box-shadow:0 4px 14px rgba(28,25,23,0.15)">
                ${Icons.plus} Abrir Cotizador y Crear Presupuesto
              </button>
            </div>
          `}

          <div class="step-action-footer">
            <button type="button" class="btn btn-secondary" id="btn-step-prev">
              ${Icons['chevron-left']} Paso anterior: ${prevMeta?.title || 'Cliente'}
            </button>
            <button type="button" class="btn btn-primary" id="btn-step-next" ${!hasPres ? 'disabled' : ''}>
              Siguiente: Paso 3 (${nextMeta?.title || 'Confirmación'}) ${Icons['chevron-right']}
            </button>
          </div>
        </div>
      `;
      break;
    }

    // ── PASO 3: CONFIRMACIÓN Y ENVÍO ──
    case 3: {
      const isApproved = presupuesto?.estado === 'aprobado';
      const isEnviado = presupuesto?.estado === 'enviado';
      bodyHtml = `
        <div class="step-content-section">
          <p class="step-description">
            Compartí la propuesta con el cliente. Podés dejar el proceso en espera y retomar cuando el cliente confirme.
          </p>

          <div class="workflow-entity-summary-box">
            <div class="summary-header">
              <div>
                <strong>Estado comercial actual:</strong>
                <span style="margin-left:8px">${renderBadge(PRESUPUESTO_ESTADO_LABELS[presupuesto?.estado] || 'Borrador', PRESUPUESTO_ESTADO_COLORS[presupuesto?.estado] || 'neutral')}</span>
              </div>
              <span class="font-mono font-bold" style="font-size:15px">Total: ${formatCurrency(total, presupuesto?.moneda)}</span>
            </div>

            <div class="workflow-interactive-cards-grid" style="margin-top:16px">
              <!-- Tarjeta 1: Enviar al cliente -->
              <div class="workflow-interactive-card">
                <div class="interactive-card-badge">Paso comercial 1</div>
                <h4 class="interactive-card-title">Enviar Cotización al Cliente</h4>
                <p class="text-muted" style="font-size:13px;line-height:1.4">
                  Generá el PDF oficial o enviá la cotización formateada directamente a su WhatsApp.
                </p>
                <div style="margin-top:auto;display:flex;flex-direction:column;gap:8px">
                  <button type="button" class="btn btn-success" id="btn-action-share-pres" style="background:#25D366;border-color:#25D366;color:#fff;font-weight:700;width:100%">
                    ${Icons.whatsapp} Compartir por WhatsApp o PDF
                  </button>
                  ${!isEnviado && !isApproved ? `
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-action-mark-enviado" style="width:100%">
                      ${Icons.clock} Marcar como Enviado
                    </button>
                  ` : ''}
                </div>
              </div>

              <!-- Tarjeta 2: Respuesta y Aprobación -->
              <div class="workflow-interactive-card">
                <div class="interactive-card-badge">Paso comercial 2</div>
                <h4 class="interactive-card-title">Respuesta del Cliente</h4>
                <p class="text-muted" style="font-size:13px;line-height:1.4">
                  ${isApproved ? 'El cliente confirmó la cotización. El presupuesto está aprobado.' : 'Cuando el cliente dé el visto bueno, aprobá el presupuesto para habilitar la etapa de obra.'}
                </p>
                <div style="margin-top:auto">
                  ${!isApproved ? `
                    <button type="button" class="btn btn-primary" id="btn-action-approve-pres" style="font-weight:700;width:100%;height:42px">
                      ${Icons.check} Marcar Presupuesto como Aprobado
                    </button>
                  ` : `
                    <div class="alert alert-success" style="padding:10px 12px;margin:0;font-size:13px;text-align:center">
                      ✅ Presupuesto aprobado. ${obra ? `Obra #${escapeHtml(String(obra.id))} vinculada.` : 'Continuá al Paso 4 para crear la Obra.'}
                    </div>
                  `}
                </div>
              </div>
            </div>

            <div class="workflow-info-banner" style="margin-top:14px">
              <span style="font-size:18px">💡</span>
              <div>
                <strong>¿El cliente aún no respondió?</strong> En una marmolería es habitual que el cliente tarde unos días en decidirse. Podés salir tranquilamente a atender otros trabajos. Este proceso figurará en la pestaña <strong>"Esperando confirmación"</strong> hasta que el cliente confirme.
              </div>
            </div>
          </div>

          <div class="step-action-footer">
            <button type="button" class="btn btn-secondary" id="btn-step-prev">
              ${Icons['chevron-left']} Paso anterior: ${prevMeta?.title || 'Presupuesto'}
            </button>
            <button type="button" class="btn btn-primary" id="btn-step-next" ${!isApproved ? 'disabled' : ''}>
              Siguiente: Paso 4 (${nextMeta?.title || 'Obra'}) ${Icons['chevron-right']}
            </button>
          </div>
        </div>
      `;
      break;
    }

    // ── PASO 4: OBRA Y ORDEN DE TALLER ──
    case 4: {
      const hasObra = !!obra;
      bodyHtml = `
        <div class="step-content-section">
          <p class="step-description">
            Generá la Orden de Obra técnica para el taller cuando corresponda, o gestioná los datos y responsables de la obra activa.
          </p>

          ${hasObra ? `
            <div class="workflow-entity-summary-box">
              <div class="summary-header">
                <div>
                  <strong style="font-size:16px">Obra Técnica #${escapeHtml(String(obra.id))}</strong>
                  <span style="margin-left:8px">${renderBadge(OBRA_ESTADO_LABELS[obra.estado] || obra.estado, OBRA_ESTADO_COLORS[obra.estado] || 'neutral')}</span>
                </div>
                <div style="display:flex;gap:8px">
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-action-edit-obra">
                    ${Icons.edit} Modificar datos de obra
                  </button>
                  <a href="#/obras/${obra.id}" class="btn btn-ghost btn-sm" title="Ver ficha técnica completa">
                    ${Icons.eye} Ficha de taller
                  </a>
                </div>
              </div>

              <div class="summary-grid">
                <div><span class="text-muted">📍 Dirección de colocación:</span> <strong>${escapeHtml(obra.direccion || '-')}</strong></div>
                <div><span class="text-muted">👷 Responsable de colocación:</span> <strong>${escapeHtml(obra.responsable || 'Sin asignar')}</strong></div>
                <div><span class="text-muted">📅 Fecha de inicio:</span> <strong>${formatDate(obra.fechaInicio) || '-'}</strong></div>
                <div><span class="text-muted">🚚 Fecha estimada de entrega:</span> <strong>${formatDate(obra.fechaEstimada) || 'A coordinar'}</strong></div>
              </div>

              ${obra.observaciones ? `
                <div style="margin-top:14px;padding:10px 14px;background:var(--color-stone-100);border-radius:var(--radius-md);font-size:13px">
                  <strong>Notas técnicas de taller:</strong> ${escapeHtml(obra.observaciones)}
                </div>
              ` : ''}
            </div>
          ` : `
            <div class="workflow-action-hero-card">
              <div class="workflow-action-hero-icon">🏗️</div>
              <h3 style="margin-bottom:8px">Generar Orden de Obra Técnica</h3>
              <p class="text-muted" style="max-width:540px;margin:0 auto 20px auto;font-size:13.5px">
                El presupuesto está aprobado. Podés generar la Orden de Obra técnica para registrar las especificaciones de taller, responsable de colocación y fecha de entrega.
              </p>
              <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap">
                <button type="button" class="btn btn-primary btn-lg" id="btn-action-create-obra-form" style="font-weight:700">
                  ${Icons.plus} Crear Orden de Obra
                </button>
                <button type="button" class="btn btn-secondary btn-lg" id="btn-action-quick-create-obra">
                  ${Icons.zap || '⚡'} Generar obra rápida
                </button>
              </div>
            </div>
          `}

          <div class="step-action-footer">
            <button type="button" class="btn btn-secondary" id="btn-step-prev">
              ${Icons['chevron-left']} Paso anterior: ${prevMeta?.title || 'Confirmación'}
            </button>
            <button type="button" class="btn btn-primary" id="btn-step-next" ${!hasObra ? 'disabled' : ''}>
              Siguiente: Paso 5 (${nextMeta?.title || 'Agenda'}) ${Icons['chevron-right']}
            </button>
          </div>
        </div>
      `;
      break;
    }

    // ── PASO 5: PLANIFICACIÓN Y AGENDA ──
    case 5: {
      const eventosObra = DataService.getAll('eventos').filter(e =>
        (obra && String(e.obraId) === String(obra.id)) ||
        (presupuesto && String(e.presupuestoId) === String(presupuesto.id))
      );
      const isScheduled = eventosObra.length > 0 || (obra && !!obra.fechaEstimada);

      bodyHtml = `
        <div class="step-content-section">
          <p class="step-description">
            Planificá la visita de toma de plantilla/medición o la fecha definitiva de colocación en el Calendario Operativo.
          </p>

          <div class="workflow-entity-summary-box">
            <div class="summary-header">
              <div>
                <strong>Turnos y eventos agendados</strong>
                <span style="margin-left:8px">${isScheduled ? renderBadge('Turno Agendado', 'success') : renderBadge('Falta agendar', 'info')}</span>
              </div>
              <button type="button" class="btn btn-primary btn-sm" id="btn-action-schedule-event">
                ${Icons.calendar} Agendar en Calendario
              </button>
            </div>

            ${eventosObra.length > 0 ? `
              <div class="workflow-events-list" style="margin-top:14px;display:flex;flex-direction:column;gap:8px">
                ${eventosObra.map(ev => `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#fff;border:1px solid var(--color-stone-200);border-radius:var(--radius-md)">
                    <div>
                      <strong>📅 ${formatDate(ev.fecha)} ${ev.hora ? `a las ${ev.hora} hs` : ''}</strong> — <span style="text-transform:capitalize;font-weight:600">${escapeHtml(ev.tipo || 'Evento')}</span>
                      ${ev.direccion ? `<div class="text-muted" style="font-size:12px;margin-top:2px">📍 ${escapeHtml(ev.direccion)}</div>` : ''}
                    </div>
                    <span class="badge badge-neutral">${escapeHtml(ev.estado || 'pendiente')}</span>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="workflow-action-hero-card" style="margin-top:14px;padding:24px 16px">
                <div style="font-size:26px;margin-bottom:8px">📅</div>
                <h4 style="margin-bottom:6px">No hay turno agendado aún</h4>
                <p class="text-muted" style="font-size:13px;max-width:440px;margin:0 auto 14px auto">
                  Fijá la fecha y hora para la medición de plantilla en obra o la cuadrilla de colocación.
                </p>
                <button type="button" class="btn btn-primary" id="btn-action-schedule-event-alt">
                  ${Icons.calendar} Agendar cita ahora
                </button>
              </div>
            `}
          </div>

          <div class="step-action-footer">
            <button type="button" class="btn btn-secondary" id="btn-step-prev">
              ${Icons['chevron-left']} Paso anterior: ${prevMeta?.title || 'Obra'}
            </button>
            <button type="button" class="btn btn-primary" id="btn-step-next">
              Siguiente: Paso 6 (${nextMeta?.title || 'Seña'}) ${Icons['chevron-right']}
            </button>
          </div>
        </div>
      `;
      break;
    }

    // ── PASO 6: COBRO DE SEÑA / ANTICIPO ──
    case 6: {
      const cobrosObra = obra ? DataService.getAll('cobros').filter(c => String(c.obraId) === String(obra.id)) : [];
      const hasCobro = cobrado > 0;
      const señaSugerida = Math.round(total * 0.5);

      bodyHtml = `
        <div class="step-content-section">
          <p class="step-description">
            Condición comercial habitual en marmolería: <strong>50% de anticipo</strong> al aprobar para reservar o cortar los materiales, y 50% restante al colocar.
          </p>

          <div class="workflow-metric-cards-grid">
            <div class="workflow-metric-card">
              <span class="workflow-metric-label">Total del trabajo</span>
              <span class="workflow-metric-val">${formatCurrency(total)}</span>
            </div>
            <div class="workflow-metric-card">
              <span class="workflow-metric-label">Seña sugerida (50%)</span>
              <span class="workflow-metric-val" style="color:var(--color-primary)">${formatCurrency(señaSugerida)}</span>
            </div>
            <div class="workflow-metric-card">
              <span class="workflow-metric-label">Total cobrado</span>
              <span class="workflow-metric-val" style="color:var(--color-success)">${formatCurrency(cobrado)}</span>
            </div>
            <div class="workflow-metric-card">
              <span class="workflow-metric-label">Saldo restante</span>
              <span class="workflow-metric-val" style="color:${saldo > 0 ? 'var(--color-warning)' : 'var(--color-success)'}">${formatCurrency(saldo)}</span>
            </div>
          </div>

          <div class="workflow-entity-summary-box">
            <div class="summary-header">
              <div>
                <strong>Comprobantes de Pago</strong>
                <span style="margin-left:8px">${hasCobro ? renderBadge(`Cobrado: ${Math.round(cobrado/total*100)}%`, 'success') : renderBadge('Sin seña registrada', 'warning')}</span>
              </div>
              <button type="button" class="btn btn-success btn-sm" id="btn-action-add-cobro" style="background:#059669;color:#fff;border-color:#059669;font-weight:700">
                ${Icons['hand-coins']} Registrar Cobro de Seña
              </button>
            </div>

            ${cobrosObra.length > 0 ? `
              <div class="workflow-items-mini-list">
                ${cobrosObra.map(c => `
                  <div class="workflow-item-mini-row">
                    <div>
                      <strong>Recibo #${escapeHtml(String(c.id))}</strong> — ${formatDate(c.fecha)} (${escapeHtml(c.metodoPago || 'Efectivo')})
                    </div>
                    <span class="font-mono font-bold" style="color:var(--color-success);font-size:14px">${formatCurrency(c.importe)}</span>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="alert alert-warning" style="margin-top:14px">
                ⚠️ Aún no se registró ningún cobro para este trabajo. Podés registrar el anticipo ahora o avanzar si se acordó otra modalidad con el cliente.
              </div>
            `}
          </div>

          <div class="step-action-footer">
            <button type="button" class="btn btn-secondary" id="btn-step-prev">
              ${Icons['chevron-left']} Paso anterior: ${prevMeta?.title || 'Agenda'}
            </button>
            <button type="button" class="btn btn-primary" id="btn-step-next">
              Siguiente: Paso 7 (${nextMeta?.title || 'Taller'}) ${Icons['chevron-right']}
            </button>
          </div>
        </div>
      `;
      break;
    }

    // ── PASO 7: TALLER Y SALIDA DE STOCK ──
    case 7: {
      const isStockDesc = !!obra?.stockDescontado;
      bodyHtml = `
        <div class="step-content-section">
          <p class="step-description">
            Corte, inglete, pegado de frentes y pulido de placas en el taller. Descontá los metros cuadrados utilizados del inventario disponible.
          </p>

          <div class="workflow-entity-summary-box">
            <div class="summary-header">
              <div>
                <strong>Estado de Producción y Stock</strong>
                <span style="margin-left:8px">${isStockDesc ? renderBadge('Stock descontado', 'success') : renderBadge('Stock pendiente', 'warning')}</span>
              </div>
              <button type="button" class="btn btn-primary btn-sm" id="btn-action-discount-stock">
                ${Icons.box} Descontar materiales de stock
              </button>
            </div>

            <div class="summary-grid">
              <div><span class="text-muted">Estado actual de la obra:</span> <strong>${OBRA_ESTADO_LABELS[obra?.estado] || obra?.estado || '-'}</strong></div>
              <div><span class="text-muted">Materiales de la pieza:</span> <strong>${escapeHtml(obra?.material || presupuesto?.material || '-')}</strong></div>
              <div><span class="text-muted">Responsable de taller:</span> <strong>${escapeHtml(obra?.responsable || 'Sin asignar')}</strong></div>
              <div><span class="text-muted">Inventario:</span> <strong>${isStockDesc ? '✅ Placas descontadas del stock' : '⏳ Pendiente de salida de taller'}</strong></div>
            </div>

            <!-- Selector rápido de estado operativo de la obra -->
            <div style="margin-top:16px;padding:14px;background:#fff;border:1px solid var(--color-stone-200);border-radius:var(--radius-lg)">
              <label class="form-label" style="font-weight:700;margin-bottom:8px">Avanzar fase de producción:</label>
              <div style="display:flex;gap:8px;flex-wrap:wrap">
                <button type="button" class="btn btn-sm ${obra?.estado === 'en_preparacion' ? 'btn-primary' : 'btn-secondary'}" data-action="set-obra-state" data-state="en_preparacion">
                  1. En preparación
                </button>
                <button type="button" class="btn btn-sm ${obra?.estado === 'en_proceso' ? 'btn-primary' : 'btn-secondary'}" data-action="set-obra-state" data-state="en_proceso">
                  2. En corte y pulido
                </button>
                <button type="button" class="btn btn-sm ${obra?.estado === 'colocacion' ? 'btn-primary' : 'btn-secondary'}" data-action="set-obra-state" data-state="colocacion">
                  3. Listo para colocación
                </button>
              </div>
            </div>
          </div>

          <div class="step-action-footer">
            <button type="button" class="btn btn-secondary" id="btn-step-prev">
              ${Icons['chevron-left']} Paso anterior: ${prevMeta?.title || 'Seña'}
            </button>
            <button type="button" class="btn btn-primary" id="btn-step-next">
              Siguiente: Paso 8 (${nextMeta?.title || 'Cierre'}) ${Icons['chevron-right']}
            </button>
          </div>
        </div>
      `;
      break;
    }

    // ── PASO 8: COLOCACIÓN, SALDO FINAL Y CIERRE ──
    case 8: {
      const isFinal = obra?.estado === 'finalizada';
      bodyHtml = `
        <div class="step-content-section">
          <p class="step-description">
            Instalación en domicilio, verificación de terminaciones y cobro del saldo restante para cerrar el ciclo del trabajo.
          </p>

          <div class="workflow-metric-cards-grid">
            <div class="workflow-metric-card">
              <span class="workflow-metric-label">Total del trabajo</span>
              <span class="workflow-metric-val">${formatCurrency(total)}</span>
            </div>
            <div class="workflow-metric-card">
              <span class="workflow-metric-label">Total cobrado</span>
              <span class="workflow-metric-val" style="color:var(--color-success)">${formatCurrency(cobrado)}</span>
            </div>
            <div class="workflow-metric-card">
              <span class="workflow-metric-label">Saldo a cobrar</span>
              <span class="workflow-metric-val" style="color:${saldo > 0 ? 'var(--color-warning)' : 'var(--color-success)'}">${formatCurrency(saldo)}</span>
            </div>
            <div class="workflow-metric-card">
              <span class="workflow-metric-label">Estado actual</span>
              <span class="workflow-metric-val" style="font-size:14px">${OBRA_ESTADO_LABELS[obra?.estado] || obra?.estado || '-'}</span>
            </div>
          </div>

          <div class="workflow-entity-summary-box">
            <div class="summary-header">
              <div>
                <strong>Cierre Operativo y Cobranza</strong>
                <span style="margin-left:8px">${isFinal ? renderBadge('Finalizada', 'success') : renderBadge('En colocación / cierre', 'info')}</span>
              </div>
              ${saldo > 0 ? `
                <button type="button" class="btn btn-success btn-sm" id="btn-action-add-cobro" style="background:#059669;color:#fff;border-color:#059669;font-weight:700">
                  ${Icons['hand-coins']} Cobrar saldo (${formatCurrency(saldo)})
                </button>
              ` : ''}
            </div>

            ${!isFinal ? `
              <div class="workflow-finalize-card">
                <h4>¿La instalación concluyó satisfactoriamente?</h4>
                <p class="text-muted" style="font-size:13px;margin-bottom:14px;max-width:520px;margin-left:auto;margin-right:auto">
                  Al marcar la obra como finalizada, se completará todo el ciclo de marmolería y el trabajo pasará al historial de procesos finalizados.
                </p>
                <button type="button" class="btn btn-success btn-lg" id="btn-action-finalize-obra" style="font-weight:700;padding:12px 28px;box-shadow:0 4px 14px rgba(5,150,105,0.25)">
                  ${Icons.check} Concluir Trabajo y Finalizar Obra
                </button>
              </div>
            ` : `
              <div class="alert alert-success" style="margin-top:16px;padding:16px">
                ${Icons.check} <strong>¡Trabajo concluido con éxito!</strong> Todos los pasos del ciclo de marmolería fueron completados y la obra está archivada.
              </div>
            `}
          </div>

          <div class="step-action-footer">
            <button type="button" class="btn btn-secondary" id="btn-step-prev">
              ${Icons['chevron-left']} Paso anterior: ${prevMeta?.title || 'Taller'}
            </button>
            <a href="#/paso-a-paso" class="btn btn-primary">
              ${Icons.check} Volver al listado de procesos
            </a>
          </div>
        </div>
      `;
      break;
    }
  }

  return `
    <div class="workflow-step-card-header">
      <div class="step-badge-indicator">Paso ${step} de 8</div>
      <h3 class="step-card-title">${escapeHtml(stepMeta.title)} — ${escapeHtml(stepMeta.subtitle)}</h3>
    </div>
    <div class="workflow-step-card-body">
      ${bodyHtml}
    </div>
  `;
}

// ── VINCULACIÓN DE ACCIONES E INTERACTIVIDAD DEL PASO ──
function attachStepActions({ activeStep, proc, processId, total = null, cobrado = null, saldo = null, onRefresh, onAdvanceTo }) {
  const { draft, presupuesto, obra } = proc;
  const calcTotal = total !== null
    ? total
    : (obra ? DataService.getObraTotal(obra.id) : (presupuesto ? DataService.getPresupuestoTotal(presupuesto) : 0));

  // Botones de navegación Anterior / Siguiente
  document.getElementById('btn-step-prev')?.addEventListener('click', () => {
    if (activeStep > 1) onAdvanceTo(activeStep - 1);
  });

  document.getElementById('btn-step-next')?.addEventListener('click', () => {
    if (activeStep < 8) onAdvanceTo(activeStep + 1);
  });

  // Acciones específicas según el paso
  switch (activeStep) {
    // ── Paso 1: Cliente ──
    case 1: {
      const clientSelect = document.getElementById('workflow-client-select');
      clientSelect?.addEventListener('change', () => {
        const cliId = clientSelect.value;
        if (!cliId) return;
        const cli = DataService.getById('clientes', cliId);
        if (!cli) return;

        if (draft) {
          updateDraft(draft.id, {
            clienteId: cli.id,
            clienteNombre: `${cli.nombre} ${cli.apellido || ''}`.trim(),
            telefono: cli.whatsapp || cli.telefono || '',
            direccion: cli.direccion || ''
          });
        }
        Toast.success('Cliente asignado al proceso');
        onRefresh();
      });

      document.getElementById('btn-action-new-client')?.addEventListener('click', () => {
        openClienteForm(null, (newClient) => {
          if (newClient && draft) {
            updateDraft(draft.id, {
              clienteId: newClient.id,
              clienteNombre: `${newClient.nombre} ${newClient.apellido || ''}`.trim(),
              telefono: newClient.whatsapp || newClient.telefono || '',
              direccion: newClient.direccion || ''
            });
          }
          Toast.success('Cliente creado y vinculado');
          onRefresh();
        });
      });

      document.getElementById('btn-action-change-client')?.addEventListener('click', () => {
        if (draft) {
          updateDraft(draft.id, {
            clienteId: null,
            clienteNombre: 'Borrador sin cliente',
            telefono: '',
            direccion: ''
          });
          Toast.info('Seleccioná un nuevo cliente para el proceso');
          onRefresh();
        }
      });

      document.getElementById('btn-action-edit-client')?.addEventListener('click', () => {
        const cId = proc.cliente?.id || presupuesto?.clienteId || obra?.clienteId;
        if (cId) {
          openClienteForm(cId, () => {
            Toast.success('Cliente actualizado');
            onRefresh();
          });
        }
      });
      break;
    }

    // ── Paso 2: Presupuesto ──
    case 2: {
      document.getElementById('btn-action-create-pres')?.addEventListener('click', () => {
        const c = proc.cliente;
        const prefillData = {
          clienteId: c ? c.id : (draft?.clienteId || ''),
          clienteNombre: c ? `${c.nombre} ${c.apellido || ''}`.trim() : (draft?.clienteNombre || ''),
          telefono: c ? (c.whatsapp || c.telefono || '') : (draft?.telefono || ''),
          direccion: c ? (c.direccion || '') : (draft?.direccion || '')
        };

        openPresupuestoForm(null, (savedPres) => {
          if (savedPres) {
            // Si venía de un draft provisional, descartarlo porque ya tiene presupuesto formal
            if (draft) {
              removeDraft(draft.id);
            }
            Toast.success('Presupuesto creado con éxito');
            window.location.hash = `#/paso-a-paso/pres-${savedPres.id}`;
          }
        }, prefillData);
      });

      document.getElementById('btn-action-edit-pres')?.addEventListener('click', () => {
        if (presupuesto?.id) {
          openPresupuestoForm(presupuesto.id, () => {
            Toast.success('Presupuesto actualizado');
            onRefresh();
          });
        }
      });
      break;
    }

    // ── Paso 3: Confirmación ──
    case 3: {
      document.getElementById('btn-action-share-pres')?.addEventListener('click', () => {
        if (presupuesto) {
          openShareModal(presupuesto);
        }
      });

      document.getElementById('btn-action-mark-enviado')?.addEventListener('click', () => {
        if (presupuesto?.id) {
          DataService.update('presupuestos', presupuesto.id, { estado: 'enviado' });
          Toast.success('Presupuesto marcado como Enviado', 'Queda en espera de confirmación del cliente.');
          onRefresh();
        }
      });

      document.getElementById('btn-action-approve-pres')?.addEventListener('click', () => {
        if (presupuesto?.id) {
          DataService.update('presupuestos', presupuesto.id, { estado: 'aprobado' });
          Toast.success('Presupuesto aprobado', 'Presupuesto confirmado. Ahora podés generar la Orden de Obra en el Paso 4.');
          onAdvanceTo(4);
        }
      });
      break;
    }

    // ── Paso 4: Obra ──
    case 4: {
      document.getElementById('btn-action-edit-obra')?.addEventListener('click', () => {
        if (obra?.id) {
          openObraForm(obra.id, () => {
            Toast.success('Datos de obra actualizados');
            onRefresh();
          });
        }
      });

      const buildPrefillObra = () => {
        const c = proc.cliente || (presupuesto?.clienteId ? DataService.getById('clientes', presupuesto.clienteId) : null);
        const itemDescriptions = (presupuesto?.items || []).map(i => i.descripcion).filter(Boolean);
        const desc = presupuesto?.descripcion || (itemDescriptions.length > 0 ? itemDescriptions.join(' | ') : `Trabajo s/ Presupuesto ${presupuesto?.numero || presupuesto?.id}`);
        const mat = [...new Set((presupuesto?.items || []).map(i => i.material).filter(Boolean))].join(', ') || presupuesto?.material || '';
        const today = new Date().toISOString().split('T')[0];

        return {
          presupuestoId: presupuesto?.id || '',
          presupuestoNumero: presupuesto?.numero || `PRES-${presupuesto?.id}`,
          clienteId: c?.id || presupuesto?.clienteId || null,
          clienteNombre: proc.clienteNombre || (c ? `${c.nombre} ${c.apellido || ''}`.trim() : ''),
          contacto: proc.telefono || c?.telefono || c?.whatsapp || '',
          telefono: proc.telefono || c?.telefono || c?.whatsapp || '',
          direccion: proc.direccion || c?.direccion || presupuesto?.direccion || '',
          descripcion: desc,
          material: mat,
          items: (presupuesto?.items || []).map(i => ({ ...i })),
          importe: calcTotal,
          moneda: presupuesto?.moneda || 'ARS',
          fechaInicio: today,
          fechaEstimada: '',
          responsable: '',
          estado: 'pendiente',
          observaciones: presupuesto?.condiciones ? `Condiciones comerciales presupuestadas:\n${presupuesto.condiciones}` : ''
        };
      };

      document.getElementById('btn-action-create-obra-form')?.addEventListener('click', () => {
        const prefill = buildPrefillObra();
        openObraForm(null, (savedObra) => {
          if (savedObra && presupuesto?.id) {
            DataService.update('presupuestos', presupuesto.id, { obraId: savedObra.id });
          }
          Toast.success('Orden de obra creada con éxito');
          onRefresh();
        }, prefill);
      });

      document.getElementById('btn-action-quick-create-obra')?.addEventListener('click', () => {
        const prefill = buildPrefillObra();
        prefill.archivos = [];
        const savedObra = DataService.create('obras', prefill);
        if (presupuesto?.id) {
          DataService.update('presupuestos', presupuesto.id, { obraId: savedObra.id });
        }
        Toast.success('Orden de obra rápida generada con éxito');
        onRefresh();
      });
      break;
    }

    // ── Paso 5: Agenda ──
    case 5: {
      const handleSchedule = () => {
        const c = proc.cliente;
        openEventoForm({
          clienteId: c?.id || obra?.clienteId || presupuesto?.clienteId || '',
          clienteNombre: proc.clienteNombre,
          obraId: obra?.id || '',
          presupuestoId: presupuesto?.id || '',
          direccion: obra?.direccion || presupuesto?.direccion || '',
          notas: `Obra #${obra?.id || ''} — ${obra?.descripcion || presupuesto?.descripcion || ''}`,
          tipo: 'instalacion'
        }, () => {
          Toast.success('Evento agendado en el Calendario');
          onRefresh();
        });
      };

      document.getElementById('btn-action-schedule-event')?.addEventListener('click', handleSchedule);
      document.getElementById('btn-action-schedule-event-alt')?.addEventListener('click', handleSchedule);
      break;
    }

    // ── Paso 6: Seña / Cobro ──
    case 6: {
      document.getElementById('btn-action-add-cobro')?.addEventListener('click', () => {
        const total = obra ? DataService.getObraTotal(obra.id) : (presupuesto ? DataService.getPresupuestoTotal(presupuesto) : 0);
        const cobrado = obra ? DataService.getObraCobrado(obra.id) : 0;
        const saldo = Math.max(0, total - cobrado);
        // Si no hay cobros, sugerir el 50% de seña; si ya hay cobros, sugerir el saldo restante
        const sugerido = cobrado === 0 ? Math.round(total * 0.5) : saldo;

        openCobroForm(null, {
          clienteId: proc.cliente?.id || obra?.clienteId || presupuesto?.clienteId || '',
          obraId: obra?.id || '',
          importe: sugerido > 0 ? sugerido : ''
        }, () => {
          Toast.success('Cobro registrado');
          onRefresh();
        });
      });
      break;
    }

    // ── Paso 7: Taller y Stock ──
    case 7: {
      document.getElementById('btn-action-discount-stock')?.addEventListener('click', () => {
        if (obra) {
          openDescontarStockObraModal({
            obra,
            presupuesto,
            onDone: () => onRefresh()
          });
        }
      });

      document.querySelectorAll('[data-action="set-obra-state"]').forEach(btn => {
        btn.addEventListener('click', () => {
          const newState = btn.dataset.state;
          if (obra?.id && newState) {
            DataService.update('obras', obra.id, { estado: newState });
            Toast.success('Estado de la obra actualizado a: ' + (OBRA_ESTADO_LABELS[newState] || newState));
            onRefresh();
          }
        });
      });
      break;
    }

    // ── Paso 8: Colocación y Cierre ──
    case 8: {
      document.getElementById('btn-action-add-cobro')?.addEventListener('click', () => {
        const total = obra ? DataService.getObraTotal(obra.id) : (presupuesto ? DataService.getPresupuestoTotal(presupuesto) : 0);
        const cobrado = obra ? DataService.getObraCobrado(obra.id) : 0;
        const saldo = Math.max(0, total - cobrado);

        openCobroForm(null, {
          clienteId: proc.cliente?.id || obra?.clienteId || presupuesto?.clienteId || '',
          obraId: obra?.id || '',
          importe: saldo
        }, () => {
          Toast.success('Cobro de saldo registrado');
          onRefresh();
        });
      });

      document.getElementById('btn-action-finalize-obra')?.addEventListener('click', async () => {
        if (!obra?.id) return;
        const ok = await confirmDialog({
          title: 'Finalizar Obra',
          message: `¿Confirmás que la obra #${obra.id} está finalizada y entregada?`,
          confirmText: 'Sí, finalizar obra',
          type: 'success'
        });
        if (ok) {
          DataService.update('obras', obra.id, {
            estado: 'finalizada',
            fechaFin: new Date().toISOString().split('T')[0]
          });
          Toast.success('¡Obra finalizada con éxito!', 'El trabajo fue archivado como completado.');
          onRefresh();
        }
      });
      break;
    }
  }
}
