/* ========================================
   MARMOLERÍA BENJAMIN — Data Service
   Synchronized reactive store persisting to Cloudflare R2 & localStorage
   ======================================== */

import { generateId, compareNewestFirst, formatWhatsAppPhone } from '../utils/helpers.js';
import { Api } from './api.js';

// Notifica a todas las pestañas y vistas abiertas que hubo un cambio en los datos
function notifyDataChanged(collection, id, action) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('mb-data-changed', {
      detail: { collection, id, action, timestamp: Date.now() }
    }));
  }
}

// ── In-memory data store ──
const store = {
  clientes: [],
  presupuestos: [],
  obras: [],
  materiales: [],
  stockMovimientos: [],
  proveedores: [],
  facturas: [],
  pagos: [],
  cobros: [],
  eventos: []
};

// Map collection name to API route
const COLLECTION_ROUTES = {
  clientes: '/clientes',
  presupuestos: '/presupuestos',
  obras: '/obras',
  materiales: '/materiales',
  stockMovimientos: '/stock-movimientos',
  proveedores: '/proveedores',
  facturas: '/facturas',
  pagos: '/pagos',
  cobros: '/cobros',
  eventos: '/eventos'
};

// ── One-time migration to clear mock data from localStorage if upgrading ──
const MOCK_CLEAN_VERSION = 'mb_clean_production_v1';
if (typeof localStorage !== 'undefined') {
  try {
    if (localStorage.getItem('mb_version_status') !== MOCK_CLEAN_VERSION) {
      const collectionsToClean = ['clientes', 'presupuestos', 'obras', 'materiales', 'stockMovimientos', 'proveedores', 'facturas', 'pagos', 'cobros', 'eventos', 'paso_drafts'];
      collectionsToClean.forEach(col => {
        localStorage.removeItem(`mb_${col}`);
      });
      localStorage.setItem('mb_version_status', MOCK_CLEAN_VERSION);
    }
  } catch (e) {}
}

// ── Initialize local cache ──
function initLocalCache() {
  const collections = ['clientes', 'presupuestos', 'obras', 'materiales', 'stockMovimientos', 'proveedores', 'facturas', 'pagos', 'cobros', 'eventos'];
  
  collections.forEach(col => {
    try {
      const cached = localStorage.getItem(`mb_${col}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        store[col] = (Array.isArray(parsed) && col !== 'eventos' && col !== 'config')
          ? parsed.sort(compareNewestFirst)
          : parsed;
      } else {
        store[col] = [];
      }
    } catch (e) {
      store[col] = [];
    }
  });

  // Ensure store collections are ordered newest first initially
  collections.forEach(col => {
    if (Array.isArray(store[col]) && col !== 'eventos' && col !== 'config') {
      store[col].sort(compareNewestFirst);
    }
  });
}

initLocalCache();

// ── Data Access Layer ──
export const DataService = {
  // Sync all data from Cloudflare Worker / R2
  async syncAll() {
    try {
      const data = await Api.get('/sync');
      if (data && typeof data === 'object') {
        Object.keys(COLLECTION_ROUTES).forEach(col => {
          if (Array.isArray(data[col])) {
            const sorted = (col === 'eventos' || col === 'config')
              ? data[col]
              : [...data[col]].sort(compareNewestFirst);
            store[col] = sorted;
            try { localStorage.setItem(`mb_${col}`, JSON.stringify(sorted)); } catch (e) {}
          }
        });

        if (data.config && typeof data.config === 'object') {
          try { localStorage.setItem('mb_config', JSON.stringify(data.config)); } catch (e) {}
        }
        this.recalcularTodasLasFacturas();
        return { success: true, timestamp: new Date().toISOString() };
      }
    } catch (err) {
      console.info('Using local offline cache for data store');
      return { success: false, error: err.message };
    }
  },

  // ── Limpieza completa de datos (Local y Backend) ──
  async clearAll() {
    const collections = ['clientes', 'presupuestos', 'obras', 'materiales', 'stockMovimientos', 'proveedores', 'facturas', 'pagos', 'cobros', 'eventos'];
    collections.forEach(col => {
      store[col] = [];
      try { localStorage.setItem(`mb_${col}`, '[]'); } catch (e) {}
    });
    try { localStorage.removeItem('mb_paso_drafts'); } catch (e) {}

    try {
      await Api.post('/backups/clear', {});
    } catch (err) {
      console.warn('API clear failed (offline mode):', err.message);
    }

    notifyDataChanged('all', null, 'clear');
    return { success: true };
  },

  // ── Generic CRUD ──
  getAll(collection) {
    const list = [...(store[collection] || [])].filter(Boolean);
    if (collection === 'config' || collection === 'eventos') return list;
    return list.sort(compareNewestFirst);
  },

  getById(collection, id) {
    if (!id) return null;
    return store[collection]?.find(item => item && String(item.id) === String(id)) || null;
  },

  create(collection, data) {
    const id = data.id || (collection.substring(0, 3) + '-' + generateId());
    if ((collection === 'clientes' || collection === 'proveedores') && data.telefono && !data.whatsapp) {
      data.whatsapp = data.telefono;
    }
    const record = {
      ...data,
      id,
      createdAt: data.createdAt || new Date().toISOString()
    };
    
    if (!store[collection]) store[collection] = [];
    store[collection].unshift(record); // Always place newest at the top
    
    try { localStorage.setItem(`mb_${collection}`, JSON.stringify(store[collection])); } catch (e) {}

    // Async sync to Cloudflare Worker R2, keeping the same stable ID
    const route = COLLECTION_ROUTES[collection];
    if (route) {
      Api.post(route, record).then(serverItem => {
        if (serverItem) {
          const idx = store[collection].findIndex(i => i && String(i.id) === String(id));
          if (idx !== -1) {
            store[collection][idx] = { ...record, ...serverItem, id };
            try { localStorage.setItem(`mb_${collection}`, JSON.stringify(store[collection])); } catch (e) {}
          }
        }
      }).catch(err => {
        console.warn(`Background sync failed for create on ${collection}:`, err.message);
      });
    }

    // Automación: actualizar estado de factura si se registra un pago asociado
    if (collection === 'pagos' && record.facturaId) {
      this.recalcularEstadoFactura(record.facturaId);
    }

    notifyDataChanged(collection, id, 'create');
    return record;
  },

  update(collection, id, data) {
    const idx = store[collection]?.findIndex(item => item && String(item.id) === String(id));
    if (idx === -1 || idx === undefined) return null;
    
    const prevPago = collection === 'pagos' ? { ...store.pagos[idx] } : null;

    // Sincronización inteligente de contacto para Clientes
    if (collection === 'clientes') {
      const prevClient = store.clientes[idx] || {};
      // Si se editó teléfono y whatsapp está vacío o era igual al teléfono anterior
      if (data.telefono && (!data.whatsapp || data.whatsapp === prevClient.whatsapp || data.whatsapp === prevClient.telefono)) {
        data.whatsapp = data.telefono;
      }
    } else if (collection === 'proveedores') {
      const prevProv = store.proveedores[idx] || {};
      if (data.telefono && (!data.whatsapp || data.whatsapp === prevProv.whatsapp || data.whatsapp === prevProv.telefono)) {
        data.whatsapp = data.telefono;
      }
    }

    store[collection][idx] = { ...store[collection][idx], ...data, updatedAt: new Date().toISOString() };
    const updatedRecord = store[collection][idx];
    try { localStorage.setItem(`mb_${collection}`, JSON.stringify(store[collection])); } catch (e) {}

    // Async sync to Cloudflare Worker R2
    const route = COLLECTION_ROUTES[collection];
    if (route) {
      Api.put(`${route}/${id}`, data).catch(err => {
        console.warn(`Background sync failed for update on ${collection}:`, err.message);
      });
    }

    // Cascada de sincronización de seguridad para entidades dependientes
    if (collection === 'clientes') {
      const cliName = `${updatedRecord.nombre || ''} ${updatedRecord.apellido || ''}`.trim();
      const cliPhone = updatedRecord.telefono || updatedRecord.whatsapp || '';

      if (store.presupuestos) {
        store.presupuestos.forEach(p => {
          if (p && String(p.clienteId) === String(id)) {
            p.clienteNombre = cliName;
            p.telefono = cliPhone;
            if (updatedRecord.direccion) p.direccion = updatedRecord.direccion;
          }
        });
        try { localStorage.setItem('mb_presupuestos', JSON.stringify(store.presupuestos)); } catch (e) {}
      }

      if (store.obras) {
        store.obras.forEach(o => {
          if (o && String(o.clienteId) === String(id)) {
            o.clienteNombre = cliName;
            o.contacto = cliPhone;
            o.telefono = cliPhone;
            if (updatedRecord.direccion) o.direccion = updatedRecord.direccion;
          }
        });
        try { localStorage.setItem('mb_obras', JSON.stringify(store.obras)); } catch (e) {}
      }

      if (store.cobros) {
        store.cobros.forEach(c => {
          if (c && String(c.clienteId) === String(id)) {
            c.clienteNombre = cliName;
          }
        });
        try { localStorage.setItem('mb_cobros', JSON.stringify(store.cobros)); } catch (e) {}
      }

      if (store.eventos) {
        store.eventos.forEach(ev => {
          if (ev && String(ev.clienteId) === String(id)) {
            ev.clienteNombre = cliName;
            if (updatedRecord.direccion) ev.direccion = updatedRecord.direccion;
          }
        });
        try { localStorage.setItem('mb_eventos', JSON.stringify(store.eventos)); } catch (e) {}
      }
    } else if (collection === 'proveedores') {
      const provName = updatedRecord.nombre || 'Proveedor';
      if (store.facturas) {
        store.facturas.forEach(f => {
          if (f && String(f.proveedorId) === String(id)) {
            f.proveedorNombre = provName;
          }
        });
        try { localStorage.setItem('mb_facturas', JSON.stringify(store.facturas)); } catch (e) {}
      }
      if (store.pagos) {
        store.pagos.forEach(p => {
          if (p && String(p.proveedorId) === String(id)) {
            p.destinatarioConcepto = provName;
          }
        });
        try { localStorage.setItem('mb_pagos', JSON.stringify(store.pagos)); } catch (e) {}
      }
    } else if (collection === 'obras') {
      if (updatedRecord.clienteId && store.cobros) {
        store.cobros.forEach(c => {
          if (c && String(c.obraId) === String(id) && (!c.clienteId || c.clienteId !== updatedRecord.clienteId)) {
            c.clienteId = updatedRecord.clienteId;
          }
        });
        try { localStorage.setItem('mb_cobros', JSON.stringify(store.cobros)); } catch (e) {}
      }
    }

    // Automación: actualizar estado de factura si se modificó un pago
    if (collection === 'pagos') {
      const prevFacId = prevPago?.facturaId;
      const newFacId = data.facturaId !== undefined ? data.facturaId : prevFacId;
      if (prevFacId) this.recalcularEstadoFactura(prevFacId);
      if (newFacId && newFacId !== prevFacId) this.recalcularEstadoFactura(newFacId);
    } else if (collection === 'facturas' && data.importe !== undefined) {
      this.recalcularEstadoFactura(id);
    }

    notifyDataChanged(collection, id, 'update');
    return updatedRecord;
  },

  remove(collection, id) {
    const idx = store[collection]?.findIndex(item => item && String(item.id) === String(id));
    if (idx === -1 || idx === undefined) return false;

    const pagoEliminado = collection === 'pagos' ? store.pagos[idx] : null;

    store[collection].splice(idx, 1);
    try { localStorage.setItem(`mb_${collection}`, JSON.stringify(store[collection])); } catch (e) {}

    // Async sync to Cloudflare Worker R2
    const route = COLLECTION_ROUTES[collection];
    if (route) {
      Api.delete(`${route}/${id}`).catch(err => {
        console.warn(`Background sync failed for delete on ${collection}:`, err.message);
      });
    }

    // Automación: si se eliminó un pago vinculado a factura, reevaluar su estado
    if (pagoEliminado && pagoEliminado.facturaId) {
      this.recalcularEstadoFactura(pagoEliminado.facturaId);
    }

    notifyDataChanged(collection, id, 'delete');
    return true;
  },

  // ── Entity Resolution Helpers ──
  resolveCliente(clienteId, fallback = {}) {
    if (clienteId) {
      const found = this.getById('clientes', clienteId);
      if (found) return found;
    }
    return fallback;
  },

  resolveProveedor(proveedorId, fallback = {}) {
    if (proveedorId) {
      const found = this.getById('proveedores', proveedorId);
      if (found) return found;
    }
    return fallback;
  },

  // ── Facturas & Pagos Automation ──
  getFacturaTotalPagado(facturaId) {
    if (!facturaId) return 0;
    const pagos = (store.pagos || []).filter(p =>
      p && String(p.facturaId) === String(facturaId) && p.estado === 'pagado'
    );
    return pagos.reduce((sum, p) => sum + (parseFloat(p.importe) || 0), 0);
  },

  getFacturaSaldoPendiente(facturaId, excludePagoId = null) {
    const fac = this.getById('facturas', facturaId);
    if (!fac) return 0;
    const pagos = (store.pagos || []).filter(p =>
      p && String(p.facturaId) === String(facturaId) &&
      p.estado === 'pagado' &&
      (!excludePagoId || String(p.id) !== String(excludePagoId))
    );
    const totalPagado = pagos.reduce((sum, p) => sum + (parseFloat(p.importe) || 0), 0);
    const saldo = (parseFloat(fac.importe) || 0) - totalPagado;
    return Math.max(0, saldo);
  },

  recalcularEstadoFactura(facturaId, triggerSync = true) {
    if (!facturaId) return false;
    const fac = this.getById('facturas', facturaId);
    if (!fac || fac.tipo !== 'factura') return false;

    const totalPagado = this.getFacturaTotalPagado(facturaId);
    const importeFac = parseFloat(fac.importe) || 0;

    let nuevoEstado = fac.estado;
    if (importeFac > 0 && totalPagado >= (importeFac - 0.01)) {
      nuevoEstado = 'pagada';
    } else if (totalPagado > 0) {
      nuevoEstado = 'parcial';
    } else {
      // Sin pagos efectivos: si estaba pagada o parcial, vuelve a pendiente/vencida
      if (fac.estado === 'pagada' || fac.estado === 'parcial' || fac.estado === 'pagado') {
        const isVencida = fac.vencimiento && (new Date(fac.vencimiento) < new Date());
        nuevoEstado = isVencida ? 'vencida' : 'pendiente';
      }
    }

    if (fac.estado !== nuevoEstado) {
      fac.estado = nuevoEstado;
      try { localStorage.setItem('mb_facturas', JSON.stringify(store.facturas)); } catch (e) {}

      if (triggerSync) {
        const route = COLLECTION_ROUTES['facturas'];
        if (route) {
          Api.put(`${route}/${fac.id}`, { estado: nuevoEstado }).catch(err => {
            console.warn('Error sincronizando estado de factura con API:', err.message);
          });
        }
      }
      return true;
    }
    return false;
  },

  recalcularTodasLasFacturas() {
    const facturas = store.facturas || [];
    let cambios = 0;
    facturas.forEach(f => {
      if (f && f.tipo === 'factura') {
        const huboCambio = this.recalcularEstadoFactura(f.id, true);
        if (huboCambio) cambios++;
      }
    });
    return cambios;
  },

  // ── Computed Values ──
  getPresupuestoTotal(pres) {
    const itemsTotal = (pres.items || []).reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const adicionalesTotal = Object.values(pres.adicionales || {}).reduce((sum, v) => sum + (v || 0), 0);
    const subtotal = itemsTotal + adicionalesTotal;
    const descuentoMonto = pres.descuento ? subtotal * pres.descuento / 100 : 0;
    const impuestoMonto = pres.impuestos ? (subtotal - descuentoMonto) * pres.impuestos / 100 : 0;
    return subtotal - descuentoMonto + impuestoMonto;
  },

  getStockActual(materialId) {
    const movs = store.stockMovimientos.filter(m => m.materialId === materialId);
    return movs.reduce((stock, mov) => {
      if (mov.tipo === 'entrada' || mov.tipo === 'devolucion') return stock + mov.cantidad;
      if (mov.tipo === 'salida') return stock - mov.cantidad;
      return stock + mov.cantidad; // ajuste can be positive or negative
    }, 0);
  },

  getProveedorSaldo(proveedorId) {
    const facturas = store.facturas.filter(f => f.proveedorId === proveedorId);
    const pagos = store.pagos.filter(p => p.proveedorId === proveedorId);

    const totalFacturas = facturas.filter(f => f.tipo === 'factura').reduce((s, f) => s + f.importe, 0);
    const totalND = facturas.filter(f => f.tipo === 'nota_debito').reduce((s, f) => s + f.importe, 0);
    const totalNC = facturas.filter(f => f.tipo === 'nota_credito').reduce((s, f) => s + f.importe, 0);
    const totalPagos = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + p.importe, 0);

    return {
      totalFacturas,
      totalND,
      totalNC,
      totalPagos,
      saldo: totalFacturas + totalND - totalNC - totalPagos
    };
  },

  getObraTotal(obraId) {
    const obra = store.obras?.find(o => String(o.id) === String(obraId));
    if (!obra) return 0;
    if (obra.importe) return parseFloat(obra.importe) || 0;
    if (!obra.presupuestoId) return 0;
    const pres = store.presupuestos?.find(p => String(p.id) === String(obra.presupuestoId));
    return pres ? this.getPresupuestoTotal(pres) : 0;
  },

  getObraCobrado(obraId) {
    return (store.cobros || [])
      .filter(c => String(c.obraId) === String(obraId) && (c.estado === 'cobrado' || !c.estado))
      .reduce((s, c) => s + (parseFloat(c.importe) || 0), 0);
  },

  getClienteSaldo(clienteId) {
    const obras = (store.obras || []).filter(o => String(o.clienteId) === String(clienteId));
    let totalObras = 0;
    let totalCobrado = 0;
    obras.forEach(o => {
      totalObras += this.getObraTotal(o.id);
      totalCobrado += this.getObraCobrado(o.id);
    });
    return { totalObras, totalCobrado, saldo: totalObras - totalCobrado };
  },

  // ── Dashboard Computed ──
  getDashboardStats() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const totalPorCobrar = store.obras.reduce((s, o) => {
      return s + (this.getObraTotal(o.id) - this.getObraCobrado(o.id));
    }, 0);

    const totalPorPagar = store.proveedores.reduce((s, p) => {
      return s + this.getProveedorSaldo(p.id).saldo;
    }, 0);

    const facturasVencidas = store.facturas.filter(f =>
      f.estado === 'pendiente' && f.vencimiento && new Date(f.vencimiento) < now
    ).length;

    const presupuestosPendientes = store.presupuestos.filter(p =>
      p.estado === 'borrador' || p.estado === 'enviado'
    ).length;

    const presupuestosAprobados = store.presupuestos.filter(p => p.estado === 'aprobado').length;

    const obrasActivas = store.obras.filter(o =>
      !['finalizada', 'cancelada'].includes(o.estado)
    ).length;

    const cobrosDelMes = store.cobros.filter(c => {
      const d = new Date(c.fecha);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && c.estado === 'cobrado';
    }).reduce((s, c) => s + c.importe, 0);

    const pagosDelMes = store.pagos.filter(p => {
      const d = new Date(p.fecha);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear && p.estado === 'pagado';
    }).reduce((s, p) => s + p.importe, 0);

    const stockBajo = store.materiales.filter(m => {
      const actual = this.getStockActual(m.id);
      return actual <= m.stockMinimo;
    });

    return {
      totalPorCobrar, totalPorPagar, facturasVencidas,
      presupuestosPendientes, presupuestosAprobados, obrasActivas,
      cobrosDelMes, pagosDelMes, stockBajo
    };
  },

  getProximosVencimientos(days = 30) {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + days);

    return store.facturas
      .filter(f => f.vencimiento && f.estado === 'pendiente')
      .filter(f => {
        const d = new Date(f.vencimiento);
        return d <= future;
      })
      .sort((a, b) => new Date(a.vencimiento) - new Date(b.vencimiento))
      .map(f => {
        const prov = store.proveedores.find(p => p.id === f.proveedorId);
        return { ...f, proveedorNombre: prov?.nombre || 'Desconocido' };
      });
  },

  getUltimosPresupuestos(limit = 5) {
    return [...store.presupuestos]
      .sort(compareNewestFirst)
      .slice(0, limit)
      .map(p => {
        const cli = store.clientes.find(c => c.id === p.clienteId);
        return { ...p, clienteNombre: cli ? `${cli.nombre} ${cli.apellido}` : 'Desconocido', total: this.getPresupuestoTotal(p) };
      });
  },

  getUltimosPagos(limit = 5) {
    return [...store.pagos]
      .sort(compareNewestFirst)
      .slice(0, limit)
      .map(p => {
        const prov = store.proveedores.find(pr => pr.id === p.proveedorId);
        return { ...p, proveedorNombre: prov?.nombre || '-' };
      });
  },

  getUltimosCobros(limit = 5) {
    return [...store.cobros]
      .sort(compareNewestFirst)
      .slice(0, limit)
      .map(c => {
        const cli = store.clientes.find(cl => cl.id === c.clienteId);
        return { ...c, clienteNombre: cli ? `${cli.nombre} ${cli.apellido}` : '-' };
      });
  },

  // ── Eventos del Calendario ──
  getEventos(filtros = {}) {
    let evts = [...store.eventos];
    if (filtros.estado) evts = evts.filter(e => e.estado === filtros.estado);
    if (filtros.tipo) evts = evts.filter(e => e.tipo === filtros.tipo);
    if (filtros.clienteId) evts = evts.filter(e => e.clienteId === filtros.clienteId);
    if (filtros.presupuestoId) evts = evts.filter(e => e.presupuestoId === filtros.presupuestoId);
    if (filtros.fecha) evts = evts.filter(e => e.fecha === filtros.fecha);
    return evts.sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));
  },

  getEventosHoy() {
    const today = new Date().toISOString().split('T')[0];
    return this.getEventosPorFecha(today);
  },

  getProximosEventos(limit = 10) {
    const today = new Date().toISOString().split('T')[0];
    return [...store.eventos]
      .filter(e => e.fecha >= today && e.estado !== 'cancelado')
      .sort((a, b) => (a.fecha + (a.hora || '')).localeCompare(b.fecha + (b.hora || '')));
  },

  getEventosPorFecha(fecha) {
    return [...store.eventos]
      .filter(e => e.fecha === fecha)
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
  },

  getEventosCliente(clienteId) {
    return [...store.eventos]
      .filter(e => e.clienteId === clienteId)
      .sort((a, b) => (b.fecha + (b.hora || '')).localeCompare(a.fecha + (a.hora || '')));
  },

  getEventosPresupuesto(presupuestoId) {
    return [...store.eventos]
      .filter(e => e.presupuestoId === presupuestoId)
      .sort((a, b) => (b.fecha + (b.hora || '')).localeCompare(a.fecha + (a.hora || '')));
  }
};

// Auto-recalcular facturas al inicio con los datos de caché local
DataService.recalcularTodasLasFacturas();

