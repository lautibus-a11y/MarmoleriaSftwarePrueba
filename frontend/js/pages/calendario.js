/* ========================================
   MARMOLERÍA BENJAMIN — Calendario Operativo
   Organización diaria: Mediciones, Visitas,
   Instalaciones, Entregas, Cobros y Fabricación
   ======================================== */

import { DataService } from '../services/mockData.js';
import { formatCurrency, formatDate, escapeHtml } from '../utils/helpers.js';
import { Icons, renderBadge, renderEmptyState } from '../components/ui.js';
import { Drawer } from '../components/drawer.js';
import { Modal } from '../components/modal.js';
import { Toast } from '../components/toast.js';
import { confirmDialog } from '../components/confirmDialog.js';
import {
  EVENTO_TIPOS,
  EVENTO_TIPO_LABELS,
  EVENTO_TIPO_COLORS,
  EVENTO_ESTADOS,
  EVENTO_ESTADO_LABELS,
  EVENTO_ESTADO_COLORS
} from '../utils/constants.js';

// Month names in Spanish
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function renderCalendario(container, actionsEl, path) {
  // Current view state
  let currentView = 'agenda'; // Default to Agenda (Mobile First)
  let currentDate = new Date(); // Current viewing date
  let selectedDateStr = new Date().toISOString().split('T')[0]; // Selected day
  let filterTipo = '';
  let filterEstado = '';

  function getEventsFiltered() {
    let evts = DataService.getAll('eventos');
    if (filterTipo) evts = evts.filter(e => e.tipo === filterTipo);
    if (filterEstado) evts = evts.filter(e => e.estado === filterEstado);
    return evts.sort((a, b) => ((a.fecha || '') + (a.hora || '')).localeCompare((b.fecha || '') + (b.hora || '')));
  }

  function renderHeaderActions() {
    actionsEl.innerHTML = `
      <div class="calendar-actions-wrapper" style="display:flex;align-items:center;gap:var(--space-2);flex-wrap:wrap">
        <div class="view-toggle-group">
          <button type="button" class="btn btn-sm ${currentView === 'agenda' ? 'btn-primary' : 'btn-secondary'}" id="btn-view-agenda" title="Vista Agenda">
            ${Icons.clock} <span class="nav-toggle-text">Agenda</span>
          </button>
          <button type="button" class="btn btn-sm ${currentView === 'mes' ? 'btn-primary' : 'btn-secondary'}" id="btn-view-mes" title="Vista Mes">
            ${Icons.calendar} <span class="nav-toggle-text">Mes</span>
          </button>
        </div>
        <button class="btn btn-primary btn-sm" id="btn-new-event" style="font-weight:var(--font-semibold);gap:6px">
          ${Icons.plus} <span>Nuevo evento</span>
        </button>
      </div>
    `;

    document.getElementById('btn-view-agenda')?.addEventListener('click', () => {
      currentView = 'agenda';
      render();
    });
    document.getElementById('btn-view-mes')?.addEventListener('click', () => {
      currentView = 'mes';
      render();
    });
    document.getElementById('btn-new-event')?.addEventListener('click', () => {
      openEventoForm({ fecha: selectedDateStr }, () => render());
    });
  }

  function render() {
    renderHeaderActions();

    const todayStr = new Date().toISOString().split('T')[0];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = MESES[month];
    const events = getEventsFiltered();

    const topBarHtml = `
      <div class="calendar-nav-bar">
        <div class="calendar-nav-controls">
          <button type="button" class="btn btn-ghost btn-icon btn-sm" id="cal-prev-month" title="Mes anterior">
            ${Icons['chevron-left']}
          </button>
          <div class="calendar-month-title">${monthName} ${year}</div>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" id="cal-next-month" title="Mes siguiente">
            ${Icons['chevron-right']}
          </button>
          <button type="button" class="btn btn-secondary btn-sm" id="cal-today-btn" style="margin-left:4px;font-size:12px;padding:4px 10px">
            Hoy
          </button>
        </div>

        <div class="calendar-filters">
          <select class="filter-select" id="cal-filter-tipo" style="font-size:12.5px;padding:5px 8px">
            <option value="">Todos los tipos</option>
            ${Object.entries(EVENTO_TIPO_LABELS).map(([k, v]) => `<option value="${k}" ${filterTipo === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
          <select class="filter-select" id="cal-filter-estado" style="font-size:12.5px;padding:5px 8px">
            <option value="">Todos los estados</option>
            ${Object.entries(EVENTO_ESTADO_LABELS).map(([k, v]) => `<option value="${k}" ${filterEstado === k ? 'selected' : ''}>${v}</option>`).join('')}
          </select>
        </div>
      </div>
    `;

    if (currentView === 'agenda') {
      container.innerHTML = `
        ${topBarHtml}
        <div class="agenda-view-container">
          ${renderAgendaContent(events, todayStr)}
        </div>
      `;
    } else {
      container.innerHTML = `
        ${topBarHtml}
        <div class="month-view-container">
          ${renderMonthCalendar(year, month, events, todayStr, selectedDateStr)}
          <div class="month-selected-day-panel" id="selected-day-events-panel">
            ${renderSelectedDayEvents(selectedDateStr, events, todayStr)}
          </div>
        </div>
      `;
    }

    attachCalendarEvents();
  }

  function renderAgendaContent(events, todayStr) {
    const todayEvents = events.filter(e => e.fecha === todayStr);
    const upcomingEvents = events.filter(e => e.fecha > todayStr && e.estado !== 'cancelado');
    const pastEvents = events.filter(e => e.fecha < todayStr);

    const formatDayHeader = (dateStr) => {
      if (!dateStr || typeof dateStr !== 'string') return '';
      const parts = dateStr.split('-');
      if (parts.length < 3) return dateStr;
      const [y, m, d] = parts.map(Number);
      const dt = new Date(y, m - 1, d);
      const dayName = dt.toLocaleDateString('es-AR', { weekday: 'long' });
      const capitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      return `${capitalized} ${d} de ${MESES[m - 1]}`;
    };

    // Group upcoming events by date
    const upcomingGrouped = {};
    upcomingEvents.forEach(e => {
      if (!upcomingGrouped[e.fecha]) upcomingGrouped[e.fecha] = [];
      upcomingGrouped[e.fecha].push(e);
    });

    const isTomorrow = (dateStr) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return dateStr === tomorrow.toISOString().split('T')[0];
    };

    return `
      <!-- SECCIÓN HOY -->
      <div class="agenda-section mb-5">
        <div class="agenda-section-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="agenda-section-badge-today">HOY</span>
            <h3 class="agenda-section-title">${formatDayHeader(todayStr)}</h3>
          </div>
          <span class="text-muted" style="font-size:12px;font-weight:var(--font-semibold)">${todayEvents.length} ${todayEvents.length === 1 ? 'trabajo' : 'trabajos'}</span>
        </div>

        ${todayEvents.length > 0 ? `
          <div class="agenda-cards-list">
            ${todayEvents.map(e => renderAgendaCard(e)).join('')}
          </div>
        ` : `
          <div class="agenda-empty-card">
            <div style="color:var(--color-stone-400);margin-bottom:6px">${Icons.calendar}</div>
            <div style="font-weight:var(--font-semibold);color:var(--color-stone-700);font-size:13.5px">No hay trabajos agendados para hoy</div>
            <p class="text-muted" style="font-size:12px;margin:2px 0 10px">Podés agendar una medición, visita o instalación para hoy.</p>
            <button type="button" class="btn btn-secondary btn-sm" data-action="quick-add-today">
              ${Icons.plus} Agendar para hoy
            </button>
          </div>
        `}
      </div>

      <!-- SECCIÓN PRÓXIMOS TRABAJOS -->
      <div class="agenda-section">
        <div class="agenda-section-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="agenda-section-badge-upcoming">PRÓXIMOS TRABAJOS</span>
            <h3 class="agenda-section-title">Calendario semanal y próximos días</h3>
          </div>
          <span class="text-muted" style="font-size:12px;font-weight:var(--font-semibold)">${upcomingEvents.length} programados</span>
        </div>

        ${Object.keys(upcomingGrouped).length > 0 ? `
          <div class="agenda-upcoming-groups">
            ${Object.entries(upcomingGrouped).map(([dateKey, dayEvts]) => `
              <div class="agenda-day-group">
                <div class="agenda-day-group-title">
                  <span>${isTomorrow(dateKey) ? '<strong>Mañana</strong> — ' : ''}${formatDayHeader(dateKey)}</span>
                  <span class="badge badge-neutral" style="font-size:10px">${dayEvts.length}</span>
                </div>
                <div class="agenda-cards-list">
                  ${dayEvts.map(e => renderAgendaCard(e)).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        ` : `
          <div class="agenda-empty-card">
            <div style="color:var(--color-stone-400);margin-bottom:6px">${Icons.clock}</div>
            <div style="font-weight:var(--font-semibold);color:var(--color-stone-700);font-size:13.5px">No hay trabajos futuros registrados</div>
            <p class="text-muted" style="font-size:12px;margin:2px 0 10px">Agendá instalaciones, mediciones o entregas para los próximos días.</p>
          </div>
        `}
      </div>

      ${pastEvents.length > 0 ? `
        <details class="agenda-past-toggle mt-4">
          <summary style="font-size:12px;color:var(--color-stone-500);cursor:pointer;padding:8px 0">
            Ver trabajos anteriores (${pastEvents.length})
          </summary>
          <div class="agenda-cards-list mt-2" style="opacity:0.75">
            ${pastEvents.slice(-5).reverse().map(e => renderAgendaCard(e)).join('')}
          </div>
        </details>
      ` : ''}
    `;
  }

  function renderAgendaCard(e) {
    const cliente = e.clienteId ? DataService.getById('clientes', e.clienteId) : null;
    const cliName = cliente ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : (e.clienteNombre || 'Sin cliente');
    const pres = e.presupuestoId ? DataService.getById('presupuestos', e.presupuestoId) : null;
    const isDone = e.estado === 'realizado';
    const isCancel = e.estado === 'cancelado';
    const tipoLabel = EVENTO_TIPO_LABELS[e.tipo] || e.tipo;
    const tipoColor = EVENTO_TIPO_COLORS[e.tipo] || 'neutral';

    const subtitle = e.direccion || (pres?.material ? `Material: ${pres.material}` : '');

    return `
      <div class="agenda-card ${isDone ? 'is-done' : ''} ${isCancel ? 'is-canceled' : ''}" data-event-id="${e.id}">
        <div class="agenda-card-time-col">
          <span class="agenda-time-val">${escapeHtml(e.hora || 'S/H')}</span>
          <button type="button" class="agenda-check-btn ${isDone ? 'checked' : ''}" data-action="toggle-status" data-id="${e.id}" title="${isDone ? 'Marcar como pendiente' : 'Marcar como realizado'}">
            ${Icons.check}
          </button>
        </div>

        <div class="agenda-card-body">
          <div class="agenda-card-top-row">
            <span class="badge badge-${tipoColor}" style="font-size:11px;font-weight:var(--font-bold)">
              ${escapeHtml(tipoLabel)}
            </span>
            ${pres ? `<span class="agenda-pres-pill">#${escapeHtml(pres.numero)}</span>` : ''}
            <span class="badge badge-${EVENTO_ESTADO_COLORS[e.estado] || 'neutral'}" style="font-size:10px;margin-left:auto">
              ${escapeHtml(EVENTO_ESTADO_LABELS[e.estado] || e.estado)}
            </span>
          </div>

          <div class="agenda-card-client-row">
            <strong class="agenda-client-name">${escapeHtml(cliName)}</strong>
          </div>

          ${subtitle ? `
            <div class="agenda-card-sub-row">
              <span class="agenda-sub-icon">${Icons['map-pin']}</span>
              <span class="agenda-sub-text text-truncate">${escapeHtml(subtitle)}</span>
            </div>
          ` : ''}

          ${e.notas ? `
            <div class="agenda-card-note-row">
              <span style="font-size:11.5px;color:var(--color-stone-600);font-style:italic">"${escapeHtml(e.notas)}"</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function renderMonthCalendar(year, month, events, todayStr, selectedDateStr) {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const startOffset = (firstDayIndex === 0 ? 6 : firstDayIndex - 1);
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const monthEventsMap = {};
    events.forEach(e => {
      if (e.fecha && e.fecha.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) {
        if (!monthEventsMap[e.fecha]) monthEventsMap[e.fecha] = [];
        monthEventsMap[e.fecha].push(e);
      }
    });

    let cellsHtml = '';

    for (let i = startOffset - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      cellsHtml += `<div class="calendar-day-cell is-other-month"><span class="day-num">${dayNum}</span></div>`;
    }

    for (let day = 1; day <= totalDaysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = (dateStr === todayStr);
      const isSelected = (dateStr === selectedDateStr);
      const dayEvts = monthEventsMap[dateStr] || [];

      cellsHtml += `
        <div class="calendar-day-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}" data-date="${dateStr}">
          <div class="calendar-day-header">
            <span class="day-num">${day}</span>
            ${dayEvts.length > 0 ? `<span class="day-events-count">${dayEvts.length}</span>` : ''}
          </div>
          <div class="calendar-day-chips">
            ${dayEvts.slice(0, 3).map(e => `
              <div class="calendar-event-chip ${e.estado === 'realizado' ? 'is-done' : ''}" data-event-id="${e.id}">
                <span class="chip-dot" style="background:var(--color-${EVENTO_TIPO_COLORS[e.tipo] || 'neutral'})"></span>
                <span class="chip-text">${escapeHtml(e.hora || '')} ${escapeHtml(EVENTO_TIPO_LABELS[e.tipo] || e.tipo)}</span>
              </div>
            `).join('')}
            ${dayEvts.length > 3 ? `<div class="calendar-more-chip">+${dayEvts.length - 3} más</div>` : ''}
          </div>
        </div>
      `;
    }

    const totalFilled = startOffset + totalDaysInMonth;
    const remaining = (totalFilled <= 35 ? 35 : 42) - totalFilled;
    for (let day = 1; day <= remaining; day++) {
      cellsHtml += `<div class="calendar-day-cell is-other-month"><span class="day-num">${day}</span></div>`;
    }

    return `
      <div class="calendar-month-card">
        <div class="calendar-weekdays-row">
          ${DIAS_SEMANA.map(d => `<div class="calendar-weekday">${d}</div>`).join('')}
        </div>
        <div class="calendar-grid">
          ${cellsHtml}
        </div>
      </div>
    `;
  }

  function renderSelectedDayEvents(dateStr, events, todayStr) {
    const dayEvts = events.filter(e => e.fecha === dateStr);
    let formatted = dateStr;
    if (dateStr && typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length >= 3) {
        const [y, m, d] = parts.map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayName = dateObj.toLocaleDateString('es-AR', { weekday: 'long' });
        const capitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        formatted = `${capitalized} ${d} de ${MESES[m - 1]} de ${y}`;
      }
    }
    const isToday = (dateStr === todayStr);

    return `
      <div class="selected-day-box">
        <div class="selected-day-header">
          <div>
            <div style="display:flex;align-items:center;gap:6px">
              ${isToday ? '<span class="agenda-section-badge-today">HOY</span>' : ''}
              <h4 style="margin:0;font-size:15px;font-weight:var(--font-bold);color:var(--color-stone-900)">${formatted}</h4>
            </div>
            <span class="text-muted" style="font-size:12px">${dayEvts.length} ${dayEvts.length === 1 ? 'evento programado' : 'eventos programados'}</span>
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="btn-add-for-selected-day" style="font-weight:var(--font-semibold)">
            ${Icons.plus} Agendar
          </button>
        </div>

        ${dayEvts.length > 0 ? `
          <div class="agenda-cards-list mt-3">
            ${dayEvts.map(e => renderAgendaCard(e)).join('')}
          </div>
        ` : `
          <div class="agenda-empty-card mt-3" style="padding:var(--space-4)">
            <p class="text-muted" style="font-size:12px;margin:0">No hay tareas programadas para este día.</p>
          </div>
        `}
      </div>
    `;
  }

  function attachCalendarEvents() {
    document.getElementById('cal-prev-month')?.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      render();
    });

    document.getElementById('cal-next-month')?.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      render();
    });

    document.getElementById('cal-today-btn')?.addEventListener('click', () => {
      currentDate = new Date();
      selectedDateStr = new Date().toISOString().split('T')[0];
      render();
    });

    document.getElementById('cal-filter-tipo')?.addEventListener('change', (e) => {
      filterTipo = e.target.value;
      render();
    });

    document.getElementById('cal-filter-estado')?.addEventListener('change', (e) => {
      filterEstado = e.target.value;
      render();
    });

    container.querySelector('[data-action="quick-add-today"]')?.addEventListener('click', () => {
      const todayStr = new Date().toISOString().split('T')[0];
      openEventoForm({ fecha: todayStr }, () => render());
    });

    document.getElementById('btn-add-for-selected-day')?.addEventListener('click', () => {
      openEventoForm({ fecha: selectedDateStr }, () => render());
    });

    container.querySelectorAll('.calendar-day-cell[data-date]').forEach(cell => {
      cell.addEventListener('click', (e) => {
        if (e.target.closest('[data-event-id]')) return;
        selectedDateStr = cell.dataset.date;
        const panel = document.getElementById('selected-day-events-panel');
        if (panel) {
          container.querySelectorAll('.calendar-day-cell').forEach(c => c.classList.remove('is-selected'));
          cell.classList.add('is-selected');
          const evts = getEventsFiltered();
          panel.innerHTML = renderSelectedDayEvents(selectedDateStr, evts, new Date().toISOString().split('T')[0]);
          document.getElementById('btn-add-for-selected-day')?.addEventListener('click', () => {
            openEventoForm({ fecha: selectedDateStr }, () => render());
          });
        }
      });
    });

    container.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('[data-action="toggle-status"]');
      if (toggleBtn) {
        e.stopPropagation();
        const eventId = toggleBtn.dataset.id;
        const evt = DataService.getById('eventos', eventId);
        if (evt) {
          const nextEstado = evt.estado === 'realizado' ? 'pendiente' : 'realizado';
          DataService.update('eventos', eventId, { estado: nextEstado });
          Toast.success(nextEstado === 'realizado' ? '¡Trabajo marcado como realizado!' : 'Trabajo marcado como pendiente');
          render();
        }
        return;
      }

      const eventEl = e.target.closest('[data-event-id]');
      if (eventEl) {
        const eventId = eventEl.dataset.eventId;
        openEventoDetailModal(eventId, () => render());
      }
    });
  }

  render();
}

// ── Detalle del Evento (Modal / Bottom Sheet) ──
export function openEventoDetailModal(eventId, onUpdated = null) {
  const evt = DataService.getById('eventos', eventId);
  if (!evt) return;

  const cliente = evt.clienteId ? DataService.getById('clientes', evt.clienteId) : null;
  const cliName = cliente ? `${cliente.nombre} ${cliente.apellido || ''}`.trim() : (evt.clienteNombre || 'Sin cliente registrado');
  const cliPhone = cliente?.whatsapp || cliente?.telefono || '';
  const cleanPhone = cliPhone.replace(/\D/g, '');

  const pres = evt.presupuestoId ? DataService.getById('presupuestos', evt.presupuestoId) : null;
  const isDone = evt.estado === 'realizado';
  const tipoLabel = EVENTO_TIPO_LABELS[evt.tipo] || evt.tipo;
  const tipoColor = EVENTO_TIPO_COLORS[evt.tipo] || 'neutral';

  Modal.open({
    title: `<div style="display:flex;align-items:center;gap:8px">
              <span class="badge badge-${tipoColor}">${escapeHtml(tipoLabel)}</span>
              <span class="badge badge-${EVENTO_ESTADO_COLORS[evt.estado] || 'neutral'}">${escapeHtml(EVENTO_ESTADO_LABELS[evt.estado] || evt.estado)}</span>
            </div>`,
    size: 'md',
    content: `
      <div class="event-detail-sheet">
        <!-- Título y Cliente -->
        <div style="margin-bottom:var(--space-4);padding-bottom:var(--space-3);border-bottom:1px solid var(--color-stone-200)">
          <div style="font-size:11.5px;font-weight:var(--font-bold);color:var(--color-stone-500);text-transform:uppercase;letter-spacing:0.5px">Cliente</div>
          <div style="font-size:var(--text-lg);font-weight:var(--font-bold);color:var(--color-stone-900);margin-top:2px;display:flex;align-items:center;justify-content:space-between">
            <span>${escapeHtml(cliName)}</span>
            ${cleanPhone ? `
              <a href="https://wa.me/${cleanPhone}" target="_blank" class="btn btn-ghost btn-sm" style="color:#25D366;padding:4px 8px;gap:4px">
                ${Icons.whatsapp} <span style="font-size:12px">WhatsApp</span>
              </a>
            ` : ''}
          </div>
          ${cliente?.direccion ? `<div style="font-size:12.5px;color:var(--color-stone-600);margin-top:2px">${escapeHtml(cliente.direccion)}</div>` : ''}
        </div>

        <!-- Fecha y Hora -->
        <div class="form-row-2 mb-3">
          <div class="detail-mini-card">
            <span class="detail-mini-label">${Icons.calendar} Fecha</span>
            <span class="detail-mini-val">${formatDate(evt.fecha)}</span>
          </div>
          <div class="detail-mini-card">
            <span class="detail-mini-label">${Icons.clock} Horario</span>
            <span class="detail-mini-val">${escapeHtml(evt.hora || 'A coordinar')}</span>
          </div>
        </div>

        <!-- Dirección de trabajo / obra -->
        ${evt.direccion ? `
          <div class="detail-info-block mb-3">
            <span class="detail-mini-label">${Icons['map-pin']} Dirección del trabajo</span>
            <div style="font-size:13.5px;font-weight:var(--font-semibold);color:var(--color-stone-800);margin-top:3px">
              ${escapeHtml(evt.direccion)}
            </div>
          </div>
        ` : ''}

        <!-- Presupuesto y Materiales Vinculados -->
        ${pres ? `
          <div class="detail-info-block mb-3" style="background:var(--color-stone-50);border:1px solid var(--color-stone-200);border-radius:var(--radius-md);padding:10px 12px">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <span class="detail-mini-label" style="margin:0">${Icons['file-text']} Presupuesto vinculado</span>
              <a href="#/presupuestos/${pres.id}" class="btn btn-ghost btn-sm" id="detail-link-pres" style="padding:2px 6px;font-size:12px;font-weight:var(--font-bold)">
                ${pres.numero} →
              </a>
            </div>
            ${pres.material ? `
              <div style="font-size:12.5px;color:var(--color-stone-700);margin-top:4px">
                <strong>Materiales:</strong> ${escapeHtml(pres.material)}
              </div>
            ` : ''}
            ${pres.descripcion ? `
              <div style="font-size:12px;color:var(--color-stone-500);margin-top:2px">
                ${escapeHtml(pres.descripcion)}
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- Notas / Observaciones -->
        ${evt.notas ? `
          <div class="detail-info-block mb-4">
            <span class="detail-mini-label">Notas e instrucciones</span>
            <div style="font-size:13px;color:var(--color-stone-700);margin-top:3px;white-space:pre-wrap;background:var(--color-stone-50);padding:8px 12px;border-radius:var(--radius-md);border-left:3px solid var(--color-stone-400)">${escapeHtml(evt.notas)}</div>
          </div>
        ` : ''}

        <!-- Botón de acción principal de 1 toque: Marcar como Realizado -->
        <div style="margin-top:var(--space-4);display:flex;flex-direction:column;gap:8px">
          <button type="button" class="btn ${isDone ? 'btn-secondary' : 'btn-success'} btn-lg" id="modal-btn-toggle-done" style="width:100%;justify-content:center;font-weight:var(--font-bold)">
            ${Icons.check} ${isDone ? 'Reabrir como pendiente' : 'Marcar como realizado'}
          </button>

          <div style="display:flex;gap:8px">
            <button type="button" class="btn btn-secondary" id="modal-btn-edit" style="flex:1;justify-content:center">
              ${Icons.edit} Editar
            </button>
            ${cliente ? `
              <a href="#/clientes/${cliente.id}" class="btn btn-secondary" id="modal-btn-view-client" style="flex:1;justify-content:center">
                ${Icons.users} Ficha cliente
              </a>
            ` : ''}
          </div>

          <button type="button" class="btn btn-ghost btn-sm" id="modal-btn-delete" style="color:var(--color-error);justify-content:center;margin-top:4px">
            ${Icons.trash} Eliminar este evento
          </button>
        </div>
      </div>
    `,
    footer: `
      <button type="button" class="btn btn-secondary" id="modal-detail-close" style="width:100%;justify-content:center">Cerrar</button>
    `
  });

  document.getElementById('modal-detail-close')?.addEventListener('click', () => Modal.close());
  document.getElementById('detail-link-pres')?.addEventListener('click', () => Modal.close());
  document.getElementById('modal-btn-view-client')?.addEventListener('click', () => Modal.close());

  document.getElementById('modal-btn-toggle-done')?.addEventListener('click', () => {
    const nextEstado = isDone ? 'pendiente' : 'realizado';
    DataService.update('eventos', eventId, { estado: nextEstado });
    Toast.success(nextEstado === 'realizado' ? '¡Trabajo marcado como realizado!' : 'Trabajo marcado como pendiente');
    Modal.close();
    if (onUpdated) onUpdated();
  });

  document.getElementById('modal-btn-edit')?.addEventListener('click', () => {
    Modal.close();
    openEventoForm(evt, onUpdated);
  });

  document.getElementById('modal-btn-delete')?.addEventListener('click', async () => {
    const confirmed = await confirmDialog({
      title: 'Eliminar evento',
      message: '¿Estás seguro de que deseás eliminar este evento del calendario?',
      confirmText: 'Eliminar',
      type: 'danger'
    });
    if (confirmed) {
      DataService.remove('eventos', eventId);
      Toast.success('Evento eliminado');
      Modal.close();
      if (onUpdated) onUpdated();
    }
  });
}

// ── Formulario Nuevo / Editar Evento ──
export function openEventoForm(presetData = null, onSaved = null) {
  const isEdit = presetData && presetData.id;
  const evt = isEdit ? { ...presetData } : {
    tipo: presetData?.tipo || 'medicion',
    fecha: presetData?.fecha || new Date().toISOString().split('T')[0],
    hora: presetData?.hora || '10:00',
    estado: presetData?.estado || 'pendiente',
    clienteId: presetData?.clienteId || '',
    clienteNombre: presetData?.clienteNombre || '',
    presupuestoId: presetData?.presupuestoId || '',
    direccion: presetData?.direccion || '',
    notas: presetData?.notas || ''
  };

  const clientes = DataService.getAll('clientes');
  const presupuestos = DataService.getAll('presupuestos');
  const isNuevoInicial = !evt.clienteId && !!evt.clienteNombre;

  let clientPendingBalance = 0;
  if (evt.clienteId) {
    const saldo = DataService.getClienteSaldo(evt.clienteId);
    clientPendingBalance = saldo.saldo || 0;
  }

  Drawer.open({
    title: isEdit ? 'Editar evento' : 'Nuevo evento en calendario',
    size: 'lg',
    content: `
      <form id="evento-form">
        <!-- Tipo de evento -->
        <div class="form-group mb-3">
          <label class="form-label">Tipo de evento <span class="required">*</span></label>
          <select class="form-select" name="tipo" id="evento-tipo-select" style="font-weight:var(--font-semibold);font-size:14px;padding:10px 12px">
            ${Object.entries(EVENTO_TIPO_LABELS).map(([k, v]) => `
              <option value="${k}" ${evt.tipo === k ? 'selected' : ''}>${v}</option>
            `).join('')}
          </select>
        </div>

        <!-- Fecha y Hora -->
        <div class="form-row-2 mb-3">
          <div class="form-group mb-0">
            <label class="form-label">Fecha <span class="required">*</span></label>
            <input type="date" class="form-input" name="fecha" value="${evt.fecha}" required>
          </div>
          <div class="form-group mb-0">
            <label class="form-label">Hora</label>
            <input type="time" class="form-input" name="hora" value="${evt.hora}">
          </div>
        </div>

        <!-- Banner de Saldo para Cobros -->
        <div id="evento-cobro-alert" style="${evt.tipo === 'cobro' && clientPendingBalance > 0 ? 'display:block' : 'display:none'};margin-bottom:var(--space-3)">
          <div class="alert alert-warning" style="padding:10px 12px;font-size:12.5px">
            ${Icons['dollar-sign']} Saldo pendiente del cliente: <strong id="evento-saldo-val">${formatCurrency(clientPendingBalance)}</strong>
          </div>
        </div>

        <!-- Selector de Cliente: Habitual vs Nuevo -->
        <div class="form-group mb-3">
          <label class="form-label">Cliente</label>
          <div class="client-type-toggle" id="evt-client-type-toggle">
            <button type="button" class="client-type-btn ${!isNuevoInicial ? 'active' : ''}" data-type="habitual">Cliente habitual</button>
            <button type="button" class="client-type-btn ${isNuevoInicial ? 'active' : ''}" data-type="nuevo">Cliente nuevo / ocasional</button>
          </div>
          <input type="hidden" name="tipoCliente" id="evt-tipo-cliente-val" value="${isNuevoInicial ? 'nuevo' : 'habitual'}">
        </div>

        <div id="evt-cliente-habitual-wrap" style="${isNuevoInicial ? 'display:none' : 'display:block'}">
          <div class="form-group mb-3">
            <label class="form-label">Seleccionar cliente registrado</label>
            <select class="form-select" name="clienteId" id="evt-cliente-select">
              <option value="">Seleccionar cliente...</option>
              ${clientes.map(c => `
                <option value="${c.id}" ${evt.clienteId === c.id ? 'selected' : ''}>
                  ${escapeHtml(c.nombre)} ${escapeHtml(c.apellido || '')}
                </option>
              `).join('')}
            </select>
          </div>
        </div>

        <div id="evt-cliente-nuevo-wrap" style="${isNuevoInicial ? 'display:block' : 'display:none'}">
          <div class="form-group mb-3">
            <label class="form-label">Nombre del cliente</label>
            <input type="text" class="form-input" name="clienteNombre" id="evt-cliente-nuevo-input" value="${escapeHtml(evt.clienteNombre || '')}" placeholder="Ej: Juan Pérez">
          </div>
        </div>

        <!-- Presupuesto relacionado (opcional) -->
        <div class="form-group mb-3" id="evt-pres-wrap">
          <label class="form-label">Presupuesto relacionado (opcional)</label>
          <select class="form-select" name="presupuestoId" id="evt-pres-select">
            <option value="">Sin presupuesto asociado</option>
            ${presupuestos.map(p => {
              const cli = clientes.find(c => c.id === p.clienteId);
              const isSel = (evt.presupuestoId === p.id);
              const cliTitle = cli ? `${cli.nombre} ${cli.apellido || ''}`.trim() : (p.clienteNombre || '');
              return `<option value="${p.id}" data-cliente="${p.clienteId || ''}" data-dir="${escapeHtml(p.direccion || '')}" data-mat="${escapeHtml(p.material || '')}" ${isSel ? 'selected' : ''}>
                ${p.numero} — ${escapeHtml(cliTitle)} (${escapeHtml(p.descripcion || 'Sin descripción')})
              </option>`;
            }).join('')}
          </select>
        </div>

        <!-- Dirección -->
        <div class="form-group mb-3">
          <label class="form-label">Dirección del trabajo / obra</label>
          <div style="position:relative">
            <input type="text" class="form-input" name="direccion" id="evt-direccion-input" value="${escapeHtml(evt.direccion || '')}" placeholder="Ej: Av. Rivadavia 1234, CABA">
          </div>
          <span class="form-hint">Se completa automáticamente si el cliente o presupuesto tienen dirección registrada.</span>
        </div>

        <!-- Notas / Observaciones -->
        <div class="form-group mb-3">
          <label class="form-label">Notas e instrucciones</label>
          <textarea class="form-textarea" name="notas" id="evt-notas-input" rows="3" placeholder="Ej: Llevar muestras de Negro Brasil y cinta métrica">${escapeHtml(evt.notas || '')}</textarea>
        </div>

        <!-- Estado -->
        <div class="form-group mb-4">
          <label class="form-label">Estado</label>
          <select class="form-select" name="estado">
            <option value="pendiente" ${evt.estado === 'pendiente' ? 'selected' : ''}>Pendiente</option>
            <option value="realizado" ${evt.estado === 'realizado' ? 'selected' : ''}>Realizado</option>
            <option value="cancelado" ${evt.estado === 'cancelado' ? 'selected' : ''}>Cancelado</option>
          </select>
        </div>
      </form>
    `,
    footer: `
      <button type="button" class="btn btn-secondary" id="drawer-event-cancel">Cancelar</button>
      <button type="button" class="btn btn-primary" id="drawer-event-save" style="font-weight:var(--font-bold)">
        ${Icons.check} ${isEdit ? 'Guardar cambios' : 'Agendar evento'}
      </button>
    `
  });

  const toggleWrap = document.getElementById('evt-client-type-toggle');
  const tipoVal = document.getElementById('evt-tipo-cliente-val');
  const habWrap = document.getElementById('evt-cliente-habitual-wrap');
  const nueWrap = document.getElementById('evt-cliente-nuevo-wrap');
  const cliSelect = document.getElementById('evt-cliente-select');
  const presSelect = document.getElementById('evt-pres-select');
  const dirInput = document.getElementById('evt-direccion-input');
  const notasInput = document.getElementById('evt-notas-input');
  const tipoSelect = document.getElementById('evento-tipo-select');
  const cobroAlert = document.getElementById('evento-cobro-alert');
  const saldoValEl = document.getElementById('evento-saldo-val');

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
    const selectedCliId = e.target.value;
    const selectedCli = clientes.find(c => c.id === selectedCliId);

    if (presSelect) {
      Array.from(presSelect.options).forEach(opt => {
        if (!opt.value) return;
        const optCli = opt.dataset.cliente;
        if (!selectedCliId || optCli === selectedCliId) {
          opt.style.display = 'block';
        } else {
          opt.style.display = 'none';
        }
      });
      const currentPres = presupuestos.find(p => p.id === presSelect.value);
      if (currentPres && currentPres.clienteId !== selectedCliId) {
        presSelect.value = '';
      }
    }

    if (selectedCli && dirInput && !dirInput.value) {
      dirInput.value = selectedCli.direccion || '';
    }

    if (selectedCliId) {
      const saldo = DataService.getClienteSaldo(selectedCliId);
      if (saldoValEl) saldoValEl.textContent = formatCurrency(saldo.saldo || 0);
      if (cobroAlert && tipoSelect.value === 'cobro' && (saldo.saldo > 0)) {
        cobroAlert.style.display = 'block';
      }
    }
  });

  presSelect?.addEventListener('change', (e) => {
    const opt = presSelect.options[presSelect.selectedIndex];
    if (opt && opt.value) {
      const dir = opt.dataset.dir;
      const mat = opt.dataset.mat;
      if (dir && dirInput && !dirInput.value) {
        dirInput.value = dir;
      }
      if (mat && notasInput && !notasInput.value) {
        notasInput.value = `Materiales: ${mat}`;
      }
    }
  });

  tipoSelect?.addEventListener('change', (e) => {
    if (e.target.value === 'cobro' && cliSelect.value) {
      const saldo = DataService.getClienteSaldo(cliSelect.value);
      if (saldo.saldo > 0 && cobroAlert) {
        cobroAlert.style.display = 'block';
      }
    } else if (cobroAlert) {
      cobroAlert.style.display = 'none';
    }
  });

  document.getElementById('drawer-event-cancel')?.addEventListener('click', () => Drawer.close());
  document.getElementById('drawer-event-save')?.addEventListener('click', () => {
    const form = document.getElementById('evento-form');
    if (!form) return;
    const fd = new FormData(form);
    const data = Object.fromEntries(fd);

    const tipoCliente = data.tipoCliente || 'habitual';
    let clienteId = null;
    let clienteNombre = null;

    if (tipoCliente === 'habitual') {
      clienteId = data.clienteId || null;
      const cli = clientes.find(c => c.id === clienteId);
      clienteNombre = cli ? `${cli.nombre} ${cli.apellido || ''}`.trim() : null;
    } else {
      clienteNombre = (data.clienteNombre || '').trim();
      clienteId = null;
    }

    if (!data.fecha) {
      Toast.warning('Por favor seleccioná una fecha para el evento');
      return;
    }

    const record = {
      tipo: data.tipo,
      fecha: data.fecha,
      hora: data.hora || '',
      estado: data.estado || 'pendiente',
      clienteId,
      clienteNombre,
      presupuestoId: data.presupuestoId || null,
      direccion: (data.direccion || '').trim(),
      notas: (data.notas || '').trim()
    };

    if (isEdit) {
      DataService.update('eventos', isEdit, record);
      Toast.success('Evento actualizado en el calendario');
    } else {
      DataService.create('eventos', record);
      Toast.success('Evento agendado con éxito');
    }

    Drawer.close();
    if (onSaved) onSaved();
  });
}
