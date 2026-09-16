/* ========================================
   MARMOLERÍA BENJAMIN — Data Service
   Synchronized reactive store persisting to Cloudflare R2 & localStorage
   ======================================== */

import { generateId } from '../utils/helpers.js';
import { Api } from './api.js';

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

// ── Initialize local cache ──
function initLocalCache() {
  const initialMateriales = [
    { id: 'mat-000', nombre: 'Negro Brasil', categoria: 'granito', tipo: 'Importado', largo: 300, ancho: 180, espesor: '20 mm', unidad: 'm2', precioM2: 50000, precioVenta: 50000, stockMinimo: 10, proveedor: 'prov-001', observaciones: 'Granito Negro Brasil clásico. Origen: Brasil.' },
    { id: 'mat-001', nombre: 'Granito Negro Absoluto', categoria: 'granito', tipo: 'Importado', largo: 290, ancho: 175, espesor: '20 mm', unidad: 'm2', precioM2: 185000, precioVenta: 185000, stockMinimo: 15, proveedor: 'prov-001', observaciones: 'Origen: India. Pulido espejo.' },
    { id: 'mat-002', nombre: 'Granito Gris Mara', categoria: 'granito', tipo: 'Nacional', largo: 260, ancho: 160, espesor: '20 mm', unidad: 'm2', precioM2: 85000, precioVenta: 85000, stockMinimo: 20, proveedor: 'prov-001', observaciones: 'Nacional tradicional, alto tránsito.' },
    { id: 'mat-003', nombre: 'Mármol Carrara', categoria: 'marmol', tipo: 'Importado', largo: 280, ancho: 150, espesor: '20 mm', unidad: 'm2', precioM2: 260000, precioVenta: 260000, stockMinimo: 12, proveedor: 'prov-002', observaciones: 'Origen: Italia. Veteado clásico blanco.' },
    { id: 'mat-004', nombre: 'Mármol Travertino Romano', categoria: 'travertino', tipo: 'Importado', largo: 250, ancho: 140, espesor: '20 mm', unidad: 'm2', precioM2: 175000, precioVenta: 175000, stockMinimo: 10, proveedor: 'prov-002', observaciones: 'Tono beige cálido resinado.' },
    { id: 'mat-005', nombre: 'Silestone Blanco Zeus', categoria: 'silestone', tipo: 'Importado', largo: 305, ancho: 140, espesor: '20 mm', unidad: 'm2', precioM2: 320000, precioVenta: 320000, stockMinimo: 10, proveedor: 'prov-003', observaciones: 'Superficie de cuarzo compacta premium antibacteriana.' },
    { id: 'mat-006', nombre: 'Silestone Gris Expo', categoria: 'silestone', tipo: 'Importado', largo: 305, ancho: 140, espesor: '20 mm', unidad: 'm2', precioM2: 280000, precioVenta: 280000, stockMinimo: 8, proveedor: 'prov-003', observaciones: 'Cuarzo de alta resistencia uniforme.' },
    { id: 'mat-007', nombre: 'Cuarzo Blanco Stellar', categoria: 'cuarzo', tipo: 'Importado', largo: 300, ancho: 140, espesor: '20 mm', unidad: 'm2', precioM2: 220000, precioVenta: 220000, stockMinimo: 10, proveedor: 'prov-003', observaciones: 'Superficie con micro-destellos espejados.' },
    { id: 'mat-008', nombre: 'Granito Marrón Báltico', categoria: 'granito', tipo: 'Importado', largo: 270, ancho: 160, espesor: '20 mm', unidad: 'm2', precioM2: 145000, precioVenta: 145000, stockMinimo: 10, proveedor: 'prov-001', observaciones: 'Estructura circular granítica clásica.' },
    { id: 'mat-009', nombre: 'Mármol Botticino', categoria: 'marmol', tipo: 'Importado', largo: 260, ancho: 150, espesor: '20 mm', unidad: 'm2', precioM2: 210000, precioVenta: 210000, stockMinimo: 8, proveedor: 'prov-002', observaciones: 'Mármol italiano compacto beige.' },
    { id: 'mat-010', nombre: 'Porcelanato Gran Formato', categoria: 'porcelanato', tipo: 'Nacional', largo: 120, ancho: 60, espesor: '10 mm', unidad: 'm2', precioM2: 65000, precioVenta: 65000, stockMinimo: 25, proveedor: 'prov-004', observaciones: 'Placas 120x60cm.' },
    { id: 'mat-011', nombre: 'Ónix Miel (Placa Entera)', categoria: 'onix', tipo: 'Importado', largo: 240, ancho: 150, espesor: '20 mm', unidad: 'placas', precioM2: 1200000, precioVenta: 1200000, stockMinimo: 2, proveedor: 'prov-002', observaciones: 'Placa entera translúcida para retroiluminar.' },
    { id: 'mat-012', nombre: 'Granito Exótico Patagonia (Placa)', categoria: 'granito', tipo: 'Importado', largo: 290, ancho: 180, espesor: '20 mm', unidad: 'placas', precioM2: 950000, precioVenta: 950000, stockMinimo: 2, proveedor: 'prov-001', observaciones: 'Placa entera seleccionada con cuarzo cristalino.' },
    { id: 'mat-013', nombre: 'Zócalo Granito Negro', categoria: 'granito', tipo: 'Nacional', largo: 100, ancho: 10, espesor: '20 mm', unidad: 'metros', precioM2: 25000, precioVenta: 25000, stockMinimo: 20, proveedor: 'prov-001', observaciones: 'h=10cm. Cotizado por metro lineal.' },
    { id: 'mat-014', nombre: 'Bacha Simple Acero Johnson', categoria: 'otro', tipo: 'Nacional', largo: 52, ancho: 32, espesor: '-', unidad: 'unidades', precioM2: 72000, precioVenta: 72000, stockMinimo: 5, proveedor: 'prov-004', observaciones: 'Para embutir bajo mesada. Precio por unidad.' },
    { id: 'mat-015', nombre: 'Bacha Doble Acero Johnson', categoria: 'otro', tipo: 'Nacional', largo: 74, ancho: 40, espesor: '-', unidad: 'unidades', precioM2: 105000, precioVenta: 105000, stockMinimo: 3, proveedor: 'prov-004', observaciones: 'Doble cuba cocina. Precio por unidad.' },
    { id: 'mat-016', nombre: 'Pegamento Especial Mármol', categoria: 'otro', tipo: 'Nacional', largo: 0, ancho: 0, espesor: '-', unidad: 'unidades', precioM2: 18000, precioVenta: 18000, stockMinimo: 10, proveedor: 'prov-005', observaciones: 'Balde 25kg bi-componente.' }
  ];

  const initialClientes = [
    { id: 'cli-001', nombre: 'Carlos', apellido: 'Rodríguez', telefono: '11-4567-8901', whatsapp: '5491145678901', email: 'carlos.rodriguez@email.com', direccion: 'Av. Libertador 1250, CABA', cuit: '20-34567890-1', observaciones: 'Cliente frecuente, prefiere granito negro', createdAt: '2026-01-15T10:00:00' },
    { id: 'cli-002', nombre: 'María Elena', apellido: 'Gutiérrez', telefono: '11-2345-6789', whatsapp: '5491123456789', email: 'maria.gutierrez@email.com', direccion: 'San Martín 450, Vicente López', cuit: '27-23456789-0', observaciones: '', createdAt: '2026-02-20T14:30:00' },
    { id: 'cli-003', nombre: 'Constructora Del Sur', apellido: 'S.A.', telefono: '11-5678-1234', whatsapp: '5491156781234', email: 'compras@delsur.com.ar', direccion: 'Av. Corrientes 3200, CABA', cuit: '30-71234567-8', observaciones: 'Empresa constructora, volumen alto', createdAt: '2026-03-10T09:00:00' },
    { id: 'cli-004', nombre: 'Roberto', apellido: 'Fernández', telefono: '11-8901-2345', whatsapp: '5491189012345', email: 'roberto.f@email.com', direccion: 'Colón 890, San Isidro', cuit: '', observaciones: 'Referido por Carlos Rodríguez', createdAt: '2026-04-05T11:00:00' },
    { id: 'cli-005', nombre: 'Laura', apellido: 'Martínez', telefono: '11-3456-7890', whatsapp: '5491134567890', email: 'laura.m@email.com', direccion: 'Mitre 1500, Olivos', cuit: '27-30987654-3', observaciones: '', createdAt: '2026-05-12T16:00:00' },
    { id: 'cli-006', nombre: 'Estudio Arq. Bianchi', apellido: '', telefono: '11-6789-0123', whatsapp: '5491167890123', email: 'info@estudiobianchi.com', direccion: 'Av. Callao 1100, CABA', cuit: '30-70123456-9', observaciones: 'Estudio de arquitectura, pide presupuestos por obras grandes', createdAt: '2026-06-01T10:00:00' },
    { id: 'cli-007', nombre: 'Ana', apellido: 'Morales', telefono: '11-7890-1234', whatsapp: '5491178901234', email: 'ana.morales@email.com', direccion: 'Rivadavia 2300, Morón', cuit: '', observaciones: 'Reforma cocina y baño', createdAt: '2026-07-20T09:30:00' },
    { id: 'cli-008', nombre: 'Diego', apellido: 'Sánchez', telefono: '11-0123-4567', whatsapp: '5491101234567', email: 'diego.s@email.com', direccion: 'Belgrano 780, Avellaneda', cuit: '20-29876543-1', observaciones: '', createdAt: '2026-08-10T13:00:00' }
  ];

  const collections = ['clientes', 'presupuestos', 'obras', 'materiales', 'stockMovimientos', 'proveedores', 'facturas', 'pagos', 'cobros', 'eventos'];
  
  collections.forEach(col => {
    try {
      const cached = localStorage.getItem(`mb_${col}`);
      if (cached) {
        store[col] = JSON.parse(cached);
      }
    } catch (e) {}
  });

  if (!store.materiales || store.materiales.length === 0) store.materiales = initialMateriales;
  if (!store.clientes || store.clientes.length === 0) store.clientes = initialClientes;
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
            store[col] = data[col];
            try { localStorage.setItem(`mb_${col}`, JSON.stringify(data[col])); } catch (e) {}
          }
        });

        if (data.config && typeof data.config === 'object') {
          try { localStorage.setItem('mb_config', JSON.stringify(data.config)); } catch (e) {}
        }
        return { success: true, timestamp: new Date().toISOString() };
      }
    } catch (err) {
      console.info('Using local offline cache for data store');
      return { success: false, error: err.message };
    }
  },

  // ── Generic CRUD ──
  getAll(collection) {
    return [...(store[collection] || [])].filter(Boolean);
  },

  getById(collection, id) {
    if (!id) return null;
    return store[collection]?.find(item => item && String(item.id) === String(id)) || null;
  },

  create(collection, data) {
    const id = data.id || (collection.substring(0, 3) + '-' + generateId());
    const record = {
      ...data,
      id,
      createdAt: new Date().toISOString()
    };
    
    if (!store[collection]) store[collection] = [];
    store[collection].push(record);
    
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

    return record;
  },

  update(collection, id, data) {
    const idx = store[collection]?.findIndex(item => item && String(item.id) === String(id));
    if (idx === -1 || idx === undefined) return null;
    
    store[collection][idx] = { ...store[collection][idx], ...data, updatedAt: new Date().toISOString() };
    try { localStorage.setItem(`mb_${collection}`, JSON.stringify(store[collection])); } catch (e) {}

    // Async sync to Cloudflare Worker R2
    const route = COLLECTION_ROUTES[collection];
    if (route) {
      Api.put(`${route}/${id}`, data).catch(err => {
        console.warn(`Background sync failed for update on ${collection}:`, err.message);
      });
    }

    return store[collection][idx];
  },

  remove(collection, id) {
    const idx = store[collection]?.findIndex(item => item && String(item.id) === String(id));
    if (idx === -1 || idx === undefined) return false;

    store[collection].splice(idx, 1);
    try { localStorage.setItem(`mb_${collection}`, JSON.stringify(store[collection])); } catch (e) {}

    // Async sync to Cloudflare Worker R2
    const route = COLLECTION_ROUTES[collection];
    if (route) {
      Api.delete(`${route}/${id}`).catch(err => {
        console.warn(`Background sync failed for delete on ${collection}:`, err.message);
      });
    }

    return true;
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
    const obra = store.obras.find(o => o.id === obraId);
    if (!obra || !obra.presupuestoId) return 0;
    const pres = store.presupuestos.find(p => p.id === obra.presupuestoId);
    return pres ? this.getPresupuestoTotal(pres) : 0;
  },

  getObraCobrado(obraId) {
    return store.cobros
      .filter(c => c.obraId === obraId && c.estado === 'cobrado')
      .reduce((s, c) => s + c.importe, 0);
  },

  getClienteSaldo(clienteId) {
    const obras = store.obras.filter(o => o.clienteId === clienteId);
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
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
      .map(p => {
        const cli = store.clientes.find(c => c.id === p.clienteId);
        return { ...p, clienteNombre: cli ? `${cli.nombre} ${cli.apellido}` : 'Desconocido', total: this.getPresupuestoTotal(p) };
      });
  },

  getUltimosPagos(limit = 5) {
    return [...store.pagos]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
      .slice(0, limit)
      .map(p => {
        const prov = store.proveedores.find(pr => pr.id === p.proveedorId);
        return { ...p, proveedorNombre: prov?.nombre || '-' };
      });
  },

  getUltimosCobros(limit = 5) {
    return [...store.cobros]
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
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
