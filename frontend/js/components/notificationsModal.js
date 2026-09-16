/* =========================================================
   MARMOLERÍA BENJAMIN — Notifications & Proactive Alerts Center
   ========================================================= */

import { Modal } from './modal.js';
import { DataService } from '../services/mockData.js';
import { Icons, renderBadge } from './ui.js';
import { formatCurrency, formatDate, escapeHtml } from '../utils/helpers.js';

export function getSystemAlerts() {
  const materiales = DataService.getAll('materiales');
  const facturas = DataService.getAll('facturas');
  const presupuestos = DataService.getAll('presupuestos');
  const proveedores = DataService.getAll('proveedores');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // 1. Stock Crítico
  const stockCritico = materiales.map(m => {
    const actual = DataService.getStockActual(m.id);
    const min = m.stockMinimo || 0;
    return {
      material: m,
      stockActual: actual,
      stockMinimo: min,
      unidad: m.unidad === 'm2' ? 'm²' : (m.unidad === 'metros' ? 'ml' : (m.unidad === 'unidades' ? 'un' : m.unidad)) || 'm²'
    };
  }).filter(item => item.stockActual <= item.stockMinimo);

  // 2. Facturas de proveedores
  const facturasVencidas = [];
  const facturasPorVencer = [];

  facturas.forEach(f => {
    if (f.tipo === 'factura' && (f.estado === 'pendiente' || f.estado === 'parcial')) {
      const prov = f.proveedorId ? proveedores.find(p => p.id === f.proveedorId) : null;
      const provNombre = prov ? prov.nombre : (f.proveedorNombre || 'Proveedor');
      const item = { ...f, proveedorNombre: provNombre };

      if (f.vencimiento < todayStr) {
        facturasVencidas.push(item);
      } else {
        const diffDays = Math.ceil((new Date(f.vencimiento + 'T00:00:00') - now) / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          facturasPorVencer.push({ ...item, diasRestantes: Math.max(0, diffDays) });
        }
      }
    }
  });

  // 3. Presupuestos sin respuesta (> 15 días en 'enviado')
  const presupuestosVencidos = presupuestos.filter(p => {
    if (p.estado !== 'enviado' || !p.fecha) return false;
    const diffDays = Math.floor((now - new Date(p.fecha + 'T00:00:00')) / (1000 * 60 * 60 * 24));
    return diffDays >= 15;
  }).map(p => {
    const diffDays = Math.floor((now - new Date(p.fecha + 'T00:00:00')) / (1000 * 60 * 60 * 24));
    const total = DataService.getPresupuestoTotal(p);
    return { ...p, diasDesdeEnvio: diffDays, totalCalc: total };
  });

  // 4. Clientes con información pendiente
  const clientes = DataService.getAll('clientes') || [];
  const clientesIncompletos = clientes.map(c => {
    const missing = [];
    if (!c.telefono && !c.whatsapp) missing.push('Teléfono / WhatsApp');
    if (!c.direccion) missing.push('Dirección');
    if (!c.cuit) missing.push('CUIT / DNI');
    if (!c.email) missing.push('Email');
    return {
      cliente: c,
      missing,
      missingCount: missing.length
    };
  }).filter(c => c.missingCount > 0);

  const totalCount = stockCritico.length + facturasVencidas.length + facturasPorVencer.length + presupuestosVencidos.length + clientesIncompletos.length;

  return {
    totalCount,
    stockCritico,
    facturasVencidas,
    facturasPorVencer,
    presupuestosVencidos,
    clientesIncompletos
  };
}

export function openNotificationsModal() {
  const alerts = getSystemAlerts();

  if (alerts.totalCount === 0) {
    Modal.open({
      title: `${Icons.bell} Centro de Alertas y Notificaciones`,
      size: 'md',
      content: `
        <div style="text-align:center;padding:var(--space-6) var(--space-4)">
          <div style="width:56px;height:56px;border-radius:50%;background:rgba(34,197,94,0.1);color:#15803D;display:flex;align-items:center;justify-content:center;margin:0 auto var(--space-3);font-size:26px">
            ${Icons.check}
          </div>
          <h4 style="font-size:var(--text-lg);font-weight:var(--font-bold);color:var(--color-stone-900);margin-bottom:6px">¡Todo al día y en orden!</h4>
          <p class="text-muted" style="font-size:var(--text-sm);max-width:320px;margin:0 auto">
            No tenés facturas por vencer, los presupuestos están al día y todos los materiales se encuentran por encima del stock mínimo.
          </p>
        </div>
      `
    });
    return;
  }

  const contentHtml = `
    <div style="display:flex;flex-direction:column;gap:var(--space-4)">
      
      <!-- Resumen superior -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:var(--color-stone-100);border-radius:var(--radius-md);font-size:var(--text-xs);font-weight:var(--font-semibold);color:var(--color-stone-600)">
        <span>Atención requerida</span>
        <span class="badge badge-warning">${alerts.totalCount} asunto${alerts.totalCount > 1 ? 's' : ''} pendiente${alerts.totalCount > 1 ? 's' : ''}</span>
      </div>

      <!-- 1. Stock Crítico -->
      ${alerts.stockCritico.length > 0 ? `
        <div class="alert-group">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-2)">
            <span style="color:#DC2626;display:flex">${Icons['alert-triangle']}</span>
            <strong style="font-size:var(--text-sm);color:#991B1B">Stock Crítico o Agotado (${alerts.stockCritico.length})</strong>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${alerts.stockCritico.map(s => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#FEF2F2;border:1px solid #FCA5A5;border-radius:var(--radius-md)">
                <div style="min-width:0;flex:1">
                  <div style="font-weight:var(--font-semibold);font-size:var(--text-sm);color:#7F1D1D">${escapeHtml(s.material.nombre)}</div>
                  <div style="font-size:var(--text-xs);color:#991B1B">
                    Actual: <strong style="color:${s.stockActual <= 0 ? '#DC2626' : '#B45309'}">${s.stockActual} ${s.unidad}</strong> · Mínimo: ${s.stockMinimo} ${s.unidad}
                  </div>
                </div>
                <a href="#/stock" class="btn btn-sm btn-secondary notif-action-link" style="padding:3px 8px;font-size:12px">Reponer →</a>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- 2. Facturas Vencidas -->
      ${alerts.facturasVencidas.length > 0 ? `
        <div class="alert-group">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-2)">
            <span style="color:#DC2626;display:flex">${Icons.receipt}</span>
            <strong style="font-size:var(--text-sm);color:#991B1B">Facturas Vencidas a Pagar (${alerts.facturasVencidas.length})</strong>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${alerts.facturasVencidas.map(f => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#FFF1F2;border:1px solid #FECDD3;border-radius:var(--radius-md)">
                <div style="min-width:0;flex:1">
                  <div style="font-weight:var(--font-semibold);font-size:var(--text-sm);color:#9F1239">${escapeHtml(f.proveedorNombre)} — ${f.numero || 'S/N'}</div>
                  <div style="font-size:var(--text-xs);color:#BE123C">
                    Venció el ${formatDate(f.vencimiento)} · Total: <strong>${formatCurrency(f.total)}</strong>
                  </div>
                </div>
                <a href="#/facturas" class="btn btn-sm btn-secondary notif-action-link" style="padding:3px 8px;font-size:12px">Pagar →</a>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- 3. Facturas por vencer (próximos 7 días) -->
      ${alerts.facturasPorVencer.length > 0 ? `
        <div class="alert-group">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-2)">
            <span style="color:#D97706;display:flex">${Icons.clock}</span>
            <strong style="font-size:var(--text-sm);color:#92400E">Facturas por Vencer en 7 días (${alerts.facturasPorVencer.length})</strong>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${alerts.facturasPorVencer.map(f => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:var(--radius-md)">
                <div style="min-width:0;flex:1">
                  <div style="font-weight:var(--font-semibold);font-size:var(--text-sm);color:#92400E">${escapeHtml(f.proveedorNombre)} — ${f.numero || 'S/N'}</div>
                  <div style="font-size:var(--text-xs);color:#B45309">
                    Vence en ${f.diasRestantes === 0 ? 'hoy' : `${f.diasRestantes} días (${formatDate(f.vencimiento)})`} · Total: <strong>${formatCurrency(f.total)}</strong>
                  </div>
                </div>
                <a href="#/facturas" class="btn btn-sm btn-secondary notif-action-link" style="padding:3px 8px;font-size:12px">Ver →</a>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- 4. Presupuestos sin respuesta (> 15 días) -->
      ${alerts.presupuestosVencidos.length > 0 ? `
        <div class="alert-group">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-2)">
            <span style="color:#2563EB;display:flex">${Icons['file-text']}</span>
            <strong style="font-size:var(--text-sm);color:#1E40AF">Presupuestos Enviados sin Respuesta (${alerts.presupuestosVencidos.length})</strong>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${alerts.presupuestosVencidos.map(p => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:var(--radius-md)">
                <div style="min-width:0;flex:1">
                  <div style="font-weight:var(--font-semibold);font-size:var(--text-sm);color:#1E3A8A">${p.numero} — ${escapeHtml(p.clienteNombre || 'Cliente')}</div>
                  <div style="font-size:var(--text-xs);color:#1D4ED8">
                    Enviado hace ${p.diasDesdeEnvio} días · ${formatCurrency(p.totalCalc, p.moneda)}
                  </div>
                </div>
                <a href="#/presupuestos/${p.id}" class="btn btn-sm btn-secondary notif-action-link" style="padding:3px 8px;font-size:12px">Contactar →</a>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- 5. Clientes con datos incompletos -->
      ${alerts.clientesIncompletos && alerts.clientesIncompletos.length > 0 ? `
        <div class="alert-group">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:var(--space-2)">
            <span style="color:#D97706;display:flex">⚠️</span>
            <strong style="font-size:var(--text-sm);color:#92400E">Clientes con datos incompletos (${alerts.clientesIncompletos.length})</strong>
          </div>
          <div style="display:flex;flex-direction:column;gap:6px">
            ${alerts.clientesIncompletos.slice(0, 5).map(c => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:#FFFBEB;border:1px solid #FDE68A;border-radius:var(--radius-md)">
                <div style="min-width:0;flex:1">
                  <div style="font-weight:var(--font-semibold);font-size:var(--text-sm);color:#78350F">${escapeHtml(c.cliente.nombre)} ${escapeHtml(c.cliente.apellido || '')}</div>
                  <div style="font-size:var(--text-xs);color:#92400E">
                    Falta: <strong>${c.missing.join(', ')}</strong>
                  </div>
                </div>
                <a href="#/clientes/${c.cliente.id}" class="btn btn-sm btn-secondary notif-action-link" style="padding:3px 8px;font-size:12px">Completar →</a>
              </div>
            `).join('')}
            ${alerts.clientesIncompletos.length > 5 ? `
              <div style="text-align:center;font-size:11.5px;color:var(--color-stone-500);margin-top:2px">
                +${alerts.clientesIncompletos.length - 5} clientes más con datos pendientes en <a href="#/clientes" class="notif-action-link" style="color:var(--color-primary);font-weight:600">Clientes</a>
              </div>
            ` : ''}
          </div>
        </div>
      ` : ''}

    </div>
  `;

  Modal.open({
    title: `${Icons.bell} Centro de Alertas y Notificaciones`,
    size: 'md',
    content: contentHtml
  });

  // Attach click handler to close modal when clicking action links
  document.querySelectorAll('.notif-action-link').forEach(link => {
    link.addEventListener('click', () => {
      Modal.close();
    });
  });
}
