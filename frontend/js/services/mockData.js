/* ========================================
   MARMOLERÍA BENJAMIN — Mock Data Service
   ======================================== */

import { generateId } from '../utils/helpers.js';

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
  cobros: []
};

// ── Initialize mock data ──
function initMockData() {
  // === CLIENTES ===
  store.clientes = [
    { id: 'cli-001', nombre: 'Carlos', apellido: 'Rodríguez', telefono: '11-4567-8901', whatsapp: '5491145678901', email: 'carlos.rodriguez@email.com', direccion: 'Av. Libertador 1250, CABA', cuit: '20-34567890-1', observaciones: 'Cliente frecuente, prefiere granito negro', createdAt: '2026-01-15T10:00:00' },
    { id: 'cli-002', nombre: 'María Elena', apellido: 'Gutiérrez', telefono: '11-2345-6789', whatsapp: '5491123456789', email: 'maria.gutierrez@email.com', direccion: 'San Martín 450, Vicente López', cuit: '27-23456789-0', observaciones: '', createdAt: '2026-02-20T14:30:00' },
    { id: 'cli-003', nombre: 'Constructora Del Sur', apellido: 'S.A.', telefono: '11-5678-1234', whatsapp: '5491156781234', email: 'compras@delsur.com.ar', direccion: 'Av. Corrientes 3200, CABA', cuit: '30-71234567-8', observaciones: 'Empresa constructora, volumen alto', createdAt: '2026-03-10T09:00:00' },
    { id: 'cli-004', nombre: 'Roberto', apellido: 'Fernández', telefono: '11-8901-2345', whatsapp: '5491189012345', email: 'roberto.f@email.com', direccion: 'Colón 890, San Isidro', cuit: '', observaciones: 'Referido por Carlos Rodríguez', createdAt: '2026-04-05T11:00:00' },
    { id: 'cli-005', nombre: 'Laura', apellido: 'Martínez', telefono: '11-3456-7890', whatsapp: '5491134567890', email: 'laura.m@email.com', direccion: 'Mitre 1500, Olivos', cuit: '27-30987654-3', observaciones: '', createdAt: '2026-05-12T16:00:00' },
    { id: 'cli-006', nombre: 'Estudio Arq. Bianchi', apellido: '', telefono: '11-6789-0123', whatsapp: '5491167890123', email: 'info@estudiobianchi.com', direccion: 'Av. Callao 1100, CABA', cuit: '30-70123456-9', observaciones: 'Estudio de arquitectura, pide presupuestos por obras grandes', createdAt: '2026-06-01T10:00:00' },
    { id: 'cli-007', nombre: 'Ana', apellido: 'Morales', telefono: '11-7890-1234', whatsapp: '5491178901234', email: 'ana.morales@email.com', direccion: 'Rivadavia 2300, Morón', cuit: '', observaciones: 'Reforma cocina y baño', createdAt: '2026-07-20T09:30:00' },
    { id: 'cli-008', nombre: 'Diego', apellido: 'Sánchez', telefono: '11-0123-4567', whatsapp: '5491101234567', email: 'diego.s@email.com', direccion: 'Belgrano 780, Avellaneda', cuit: '20-29876543-1', observaciones: '', createdAt: '2026-08-10T13:00:00' }
  ];

  // === MATERIALES (Con precios por m² configurados como unidad estándar de marmolería) ===
  store.materiales = [
    { id: 'mat-001', nombre: 'Granito Negro Absoluto', categoria: 'granito', tipo: 'Importado', espesor: '2cm', unidad: 'm2', costo: 110000, precioVenta: 185000, stockMinimo: 10, proveedor: 'prov-001', observaciones: 'Origen: India. Pulido espejo. Cotizado por m².' },
    { id: 'mat-002', nombre: 'Granito Gris Mara', categoria: 'granito', tipo: 'Nacional', espesor: '2cm', unidad: 'm2', costo: 55000, precioVenta: 85000, stockMinimo: 15, proveedor: 'prov-001', observaciones: 'Nacional tradicional, alto tránsito. Cotizado por m².' },
    { id: 'mat-003', nombre: 'Mármol Carrara', categoria: 'marmol', tipo: 'Importado', espesor: '2cm', unidad: 'm2', costo: 160000, precioVenta: 260000, stockMinimo: 8, proveedor: 'prov-002', observaciones: 'Origen: Italia. Veteado clásico blanco. Cotizado por m².' },
    { id: 'mat-004', nombre: 'Mármol Travertino Romano', categoria: 'travertino', tipo: 'Importado', espesor: '2cm', unidad: 'm2', costo: 115000, precioVenta: 175000, stockMinimo: 8, proveedor: 'prov-002', observaciones: 'Tono beige cálido resinado. Cotizado por m².' },
    { id: 'mat-005', nombre: 'Silestone Blanco Zeus', categoria: 'silestone', tipo: 'Importado', espesor: '2cm', unidad: 'm2', costo: 210000, precioVenta: 320000, stockMinimo: 6, proveedor: 'prov-003', observaciones: 'Superficie de cuarzo compacta premium antibacteriana. Cotizado por m².' },
    { id: 'mat-006', nombre: 'Silestone Gris Expo', categoria: 'silestone', tipo: 'Importado', espesor: '2cm', unidad: 'm2', costo: 185000, precioVenta: 280000, stockMinimo: 6, proveedor: 'prov-003', observaciones: 'Cuarzo de alta resistencia uniforme. Cotizado por m².' },
    { id: 'mat-007', nombre: 'Cuarzo Blanco Stellar', categoria: 'cuarzo', tipo: 'Importado', espesor: '2cm', unidad: 'm2', costo: 145000, precioVenta: 220000, stockMinimo: 8, proveedor: 'prov-003', observaciones: 'Superficie con micro-destellos espejados. Cotizado por m².' },
    { id: 'mat-008', nombre: 'Granito Marrón Báltico', categoria: 'granito', tipo: 'Importado', espesor: '2cm', unidad: 'm2', costo: 95000, precioVenta: 145000, stockMinimo: 8, proveedor: 'prov-001', observaciones: 'Estructura circular granítica clásica. Cotizado por m².' },
    { id: 'mat-009', nombre: 'Mármol Botticino', categoria: 'marmol', tipo: 'Importado', espesor: '2cm', unidad: 'm2', costo: 140000, precioVenta: 210000, stockMinimo: 6, proveedor: 'prov-002', observaciones: 'Mármol italiano compacto beige. Cotizado por m².' },
    { id: 'mat-010', nombre: 'Porcelanato Gran Formato', categoria: 'porcelanato', tipo: 'Nacional', espesor: '1cm', unidad: 'm2', costo: 42000, precioVenta: 65000, stockMinimo: 20, proveedor: 'prov-004', observaciones: 'Placas 120x60cm. Cotizado por m².' },
    { id: 'mat-011', nombre: 'Bacha Simple Acero Johnson', categoria: 'otro', tipo: 'Nacional', espesor: '-', unidad: 'unidades', costo: 45000, precioVenta: 72000, stockMinimo: 5, proveedor: 'prov-004', observaciones: 'Para embutir bajo mesada. Precio por unidad.' },
    { id: 'mat-012', nombre: 'Bacha Doble Acero Johnson', categoria: 'otro', tipo: 'Nacional', espesor: '-', unidad: 'unidades', costo: 68000, precioVenta: 105000, stockMinimo: 3, proveedor: 'prov-004', observaciones: 'Doble cuba cocina. Precio por unidad.' },
    { id: 'mat-013', nombre: 'Zócalo Granito Negro', categoria: 'granito', tipo: 'Nacional', espesor: '2cm', unidad: 'metros', costo: 15000, precioVenta: 25000, stockMinimo: 15, proveedor: 'prov-001', observaciones: 'h=10cm. Cotizado por metro lineal.' },
    { id: 'mat-014', nombre: 'Pegamento Especial Mármol', categoria: 'otro', tipo: 'Nacional', espesor: '-', unidad: 'unidades', costo: 12000, precioVenta: 18000, stockMinimo: 10, proveedor: 'prov-005', observaciones: 'Balde 25kg bi-componente. Precio por unidad.' },
    { id: 'mat-015', nombre: 'Ónix Miel', categoria: 'onix', tipo: 'Importado', espesor: '2cm', unidad: 'm2', costo: 290000, precioVenta: 450000, stockMinimo: 4, proveedor: 'prov-002', observaciones: 'Material translúcido para retroiluminar. Cotizado por m².' }
  ];

  // === STOCK MOVIMIENTOS ===
  store.stockMovimientos = [
    { id: 'mov-001', materialId: 'mat-001', tipo: 'entrada', cantidad: 10, fecha: '2026-01-20', referencia: 'Compra inicial', createdAt: '2026-01-20T09:00:00' },
    { id: 'mov-002', materialId: 'mat-001', tipo: 'salida', cantidad: 3, fecha: '2026-03-15', referencia: 'Obra cli-001', createdAt: '2026-03-15T10:00:00' },
    { id: 'mov-003', materialId: 'mat-001', tipo: 'salida', cantidad: 2, fecha: '2026-06-10', referencia: 'Obra cli-003', createdAt: '2026-06-10T11:00:00' },
    { id: 'mov-004', materialId: 'mat-002', tipo: 'entrada', cantidad: 15, fecha: '2026-01-20', referencia: 'Compra inicial', createdAt: '2026-01-20T09:00:00' },
    { id: 'mov-005', materialId: 'mat-002', tipo: 'salida', cantidad: 4, fecha: '2026-04-20', referencia: 'Obra cli-002', createdAt: '2026-04-20T10:00:00' },
    { id: 'mov-006', materialId: 'mat-002', tipo: 'salida', cantidad: 6, fecha: '2026-07-25', referencia: 'Obra cli-006', createdAt: '2026-07-25T10:00:00' },
    { id: 'mov-007', materialId: 'mat-003', tipo: 'entrada', cantidad: 5, fecha: '2026-02-10', referencia: 'Compra Italia', createdAt: '2026-02-10T09:00:00' },
    { id: 'mov-008', materialId: 'mat-003', tipo: 'salida', cantidad: 3, fecha: '2026-05-18', referencia: 'Obra cli-005', createdAt: '2026-05-18T10:00:00' },
    { id: 'mov-009', materialId: 'mat-005', tipo: 'entrada', cantidad: 6, fecha: '2026-03-01', referencia: 'Compra Cosentino', createdAt: '2026-03-01T09:00:00' },
    { id: 'mov-010', materialId: 'mat-005', tipo: 'salida', cantidad: 4, fecha: '2026-06-20', referencia: 'Obras varias', createdAt: '2026-06-20T10:00:00' },
    { id: 'mov-011', materialId: 'mat-005', tipo: 'salida', cantidad: 1, fecha: '2026-08-15', referencia: 'Obra cli-007', createdAt: '2026-08-15T10:00:00' },
    { id: 'mov-012', materialId: 'mat-010', tipo: 'entrada', cantidad: 50, fecha: '2026-01-25', referencia: 'Compra inicial', createdAt: '2026-01-25T09:00:00' },
    { id: 'mov-013', materialId: 'mat-010', tipo: 'salida', cantidad: 35, fecha: '2026-08-01', referencia: 'Obras varias', createdAt: '2026-08-01T10:00:00' },
    { id: 'mov-014', materialId: 'mat-011', tipo: 'entrada', cantidad: 10, fecha: '2026-02-15', referencia: 'Compra inicial', createdAt: '2026-02-15T09:00:00' },
    { id: 'mov-015', materialId: 'mat-011', tipo: 'salida', cantidad: 7, fecha: '2026-07-30', referencia: 'Obras varias', createdAt: '2026-07-30T10:00:00' },
    { id: 'mov-016', materialId: 'mat-014', tipo: 'entrada', cantidad: 20, fecha: '2026-01-20', referencia: 'Compra inicial', createdAt: '2026-01-20T09:00:00' },
    { id: 'mov-017', materialId: 'mat-014', tipo: 'salida', cantidad: 14, fecha: '2026-08-20', referencia: 'Uso general', createdAt: '2026-08-20T10:00:00' },
    { id: 'mov-018', materialId: 'mat-007', tipo: 'entrada', cantidad: 8, fecha: '2026-04-10', referencia: 'Compra', createdAt: '2026-04-10T09:00:00' },
    { id: 'mov-019', materialId: 'mat-007', tipo: 'salida', cantidad: 5, fecha: '2026-08-25', referencia: 'Obras varias', createdAt: '2026-08-25T10:00:00' },
    { id: 'mov-020', materialId: 'mat-015', tipo: 'entrada', cantidad: 2, fecha: '2026-05-01', referencia: 'Compra especial', createdAt: '2026-05-01T09:00:00' },
    { id: 'mov-021', materialId: 'mat-015', tipo: 'salida', cantidad: 1, fecha: '2026-08-10', referencia: 'Obra cli-006', createdAt: '2026-08-10T10:00:00' }
  ];

  // === PROVEEDORES ===
  store.proveedores = [
    { id: 'prov-001', nombre: 'Granitec', razonSocial: 'Granitec S.R.L.', cuit: '30-70111222-3', telefono: '11-4000-1111', email: 'ventas@granitec.com.ar', direccion: 'Parque Industrial Pilar, Buenos Aires', contacto: 'Martín López', observaciones: 'Proveedor principal de granitos', createdAt: '2026-01-10T10:00:00' },
    { id: 'prov-002', nombre: 'Mármoles del Plata', razonSocial: 'Mármoles del Plata S.A.', cuit: '30-70222333-4', telefono: '11-4000-2222', email: 'compras@marmolesdelplata.com', direccion: 'Av. Belgrano 3500, CABA', contacto: 'Susana Pérez', observaciones: 'Mármoles importados y nacionales', createdAt: '2026-01-10T10:00:00' },
    { id: 'prov-003', nombre: 'Cosentino Argentina', razonSocial: 'Cosentino Argentina S.A.', cuit: '30-70333444-5', telefono: '11-4000-3333', email: 'ventas@cosentino.com.ar', direccion: 'Nordelta, Tigre', contacto: 'Fernando García', observaciones: 'Silestone, Dekton, superficies de cuarzo', createdAt: '2026-02-01T10:00:00' },
    { id: 'prov-004', nombre: 'Sanitarios Express', razonSocial: 'Sanitarios Express S.R.L.', cuit: '30-70444555-6', telefono: '11-4000-4444', email: 'info@sanitariosexpress.com', direccion: 'Av. Juan B. Justo 4500, CABA', contacto: 'Pablo Ruiz', observaciones: 'Bachas, grifería, accesorios', createdAt: '2026-02-15T10:00:00' },
    { id: 'prov-005', nombre: 'Adhesivos Pro', razonSocial: 'Adhesivos Pro S.A.', cuit: '30-70555666-7', telefono: '11-4000-5555', email: 'ventas@adhesivospro.com', direccion: 'Zona Industrial Avellaneda', contacto: 'Ricardo Gómez', observaciones: 'Pegamentos, selladores, productos químicos', createdAt: '2026-03-01T10:00:00' }
  ];

  // === PRESUPUESTOS ===
  store.presupuestos = [
    {
      id: 'pres-001', numero: 'PRES-2026-0001', fecha: '2026-07-10', clienteId: 'cli-001', obraId: 'obra-001',
      direccion: 'Av. Libertador 1250, CABA', descripcion: 'Mesada cocina en L con bacha bajo mesada',
      moneda: 'ARS', cotizacionDolar: null, estado: 'aprobado',
      items: [
        { id: 'item-001', descripcion: 'Mesada cocina', material: 'Granito Negro Absoluto', cantidad: 1, largo: 320, ancho: 65, m2: 2.08, precioUnitario: 280000, subtotal: 582400 },
        { id: 'item-002', descripcion: 'Alzada cocina', material: 'Granito Negro Absoluto', cantidad: 1, largo: 320, ancho: 10, m2: 0.32, precioUnitario: 280000, subtotal: 89600 }
      ],
      adicionales: { colocacion: 120000, manoDeObra: 0, transporte: 35000, bacha: 72000, zocalos: 25000, extras: 0 },
      descuento: 0, impuestos: 0,
      observaciones: 'Incluye perforación para bacha y grifería',
      condiciones: 'Presupuesto válido por 15 días.\nForma de pago: 50% al aprobar, 50% al finalizar.\nPlazo de entrega: 10 días hábiles.',
      createdAt: '2026-07-10T10:00:00'
    },
    {
      id: 'pres-002', numero: 'PRES-2026-0002', fecha: '2026-07-25', clienteId: 'cli-002', obraId: null,
      direccion: 'San Martín 450, Vicente López', descripcion: 'Vanitory baño principal',
      moneda: 'ARS', cotizacionDolar: null, estado: 'enviado',
      items: [
        { id: 'item-003', descripcion: 'Vanitory baño', material: 'Mármol Carrara', cantidad: 1, largo: 140, ancho: 55, m2: 0.77, precioUnitario: 380000, subtotal: 292600 }
      ],
      adicionales: { colocacion: 65000, manoDeObra: 0, transporte: 25000, bacha: 0, zocalos: 0, extras: 0 },
      descuento: 0, impuestos: 0,
      observaciones: 'Bacha incluida por el cliente',
      condiciones: 'Presupuesto válido por 15 días.\nForma de pago: 50% al aprobar, 50% al finalizar.',
      createdAt: '2026-07-25T14:00:00'
    },
    {
      id: 'pres-003', numero: 'PRES-2026-0003', fecha: '2026-08-05', clienteId: 'cli-003', obraId: 'obra-002',
      direccion: 'Av. Corrientes 3200, CABA', descripcion: 'Revestimiento lobby edificio',
      moneda: 'USD', cotizacionDolar: 1350, estado: 'aprobado',
      items: [
        { id: 'item-004', descripcion: 'Revestimiento pared lobby', material: 'Mármol Botticino', cantidad: 1, largo: 800, ancho: 300, m2: 24, precioUnitario: 310000, subtotal: 7440000 },
        { id: 'item-005', descripcion: 'Piso lobby', material: 'Mármol Botticino', cantidad: 1, largo: 600, ancho: 400, m2: 24, precioUnitario: 310000, subtotal: 7440000 }
      ],
      adicionales: { colocacion: 2500000, manoDeObra: 1200000, transporte: 350000, bacha: 0, zocalos: 150000, extras: 500000 },
      descuento: 5, impuestos: 0,
      observaciones: 'Obra grande. Coordinación con empresa constructora.',
      condiciones: 'Precio en dólares, cotización al momento de facturación.\n50% anticipo, 25% avance obra, 25% finalización.',
      createdAt: '2026-08-05T09:00:00'
    },
    {
      id: 'pres-004', numero: 'PRES-2026-0004', fecha: '2026-08-15', clienteId: 'cli-004', obraId: null,
      direccion: 'Colón 890, San Isidro', descripcion: 'Mesada cocina recta',
      moneda: 'ARS', cotizacionDolar: null, estado: 'borrador',
      items: [
        { id: 'item-006', descripcion: 'Mesada cocina', material: 'Silestone Blanco Zeus', cantidad: 1, largo: 250, ancho: 60, m2: 1.5, precioUnitario: 480000, subtotal: 720000 }
      ],
      adicionales: { colocacion: 95000, manoDeObra: 0, transporte: 30000, bacha: 105000, zocalos: 0, extras: 0 },
      descuento: 0, impuestos: 0, observaciones: '', condiciones: 'Presupuesto válido por 15 días.',
      createdAt: '2026-08-15T11:00:00'
    },
    {
      id: 'pres-005', numero: 'PRES-2026-0005', fecha: '2026-08-20', clienteId: 'cli-005', obraId: 'obra-003',
      direccion: 'Mitre 1500, Olivos', descripcion: 'Mesada cocina + baño completo',
      moneda: 'ARS', cotizacionDolar: null, estado: 'aprobado',
      items: [
        { id: 'item-007', descripcion: 'Mesada cocina', material: 'Cuarzo Blanco Stellar', cantidad: 1, largo: 280, ancho: 60, m2: 1.68, precioUnitario: 320000, subtotal: 537600 },
        { id: 'item-008', descripcion: 'Vanitory baño', material: 'Cuarzo Blanco Stellar', cantidad: 1, largo: 120, ancho: 55, m2: 0.66, precioUnitario: 320000, subtotal: 211200 }
      ],
      adicionales: { colocacion: 180000, manoDeObra: 0, transporte: 40000, bacha: 72000, zocalos: 35000, extras: 0 },
      descuento: 3, impuestos: 0,
      observaciones: 'Material unificado para cocina y baño',
      condiciones: 'Presupuesto válido por 15 días.\nForma de pago: 50% al aprobar, 50% al finalizar.',
      createdAt: '2026-08-20T16:00:00'
    },
    {
      id: 'pres-006', numero: 'PRES-2026-0006', fecha: '2026-08-28', clienteId: 'cli-007', obraId: null,
      direccion: 'Rivadavia 2300, Morón', descripcion: 'Reforma cocina',
      moneda: 'ARS', cotizacionDolar: null, estado: 'enviado',
      items: [
        { id: 'item-009', descripcion: 'Mesada cocina', material: 'Granito Gris Mara', cantidad: 1, largo: 200, ancho: 60, m2: 1.2, precioUnitario: 195000, subtotal: 234000 }
      ],
      adicionales: { colocacion: 75000, manoDeObra: 0, transporte: 25000, bacha: 72000, zocalos: 20000, extras: 0 },
      descuento: 0, impuestos: 0, observaciones: '', condiciones: 'Presupuesto válido por 15 días.',
      createdAt: '2026-08-28T09:30:00'
    },
    {
      id: 'pres-007', numero: 'PRES-2026-0007', fecha: '2026-09-01', clienteId: 'cli-006', obraId: 'obra-004',
      direccion: 'Av. Del Libertador 4500, Martínez', descripcion: 'Escalera y pisos mármol',
      moneda: 'ARS', cotizacionDolar: null, estado: 'aprobado',
      items: [
        { id: 'item-010', descripcion: 'Escalones', material: 'Mármol Carrara', cantidad: 15, largo: 120, ancho: 35, m2: 6.3, precioUnitario: 380000, subtotal: 2394000 },
        { id: 'item-011', descripcion: 'Pisos hall', material: 'Mármol Carrara', cantidad: 1, largo: 500, ancho: 400, m2: 20, precioUnitario: 380000, subtotal: 7600000 }
      ],
      adicionales: { colocacion: 3500000, manoDeObra: 2000000, transporte: 450000, bacha: 0, zocalos: 350000, extras: 800000 },
      descuento: 0, impuestos: 0,
      observaciones: 'Obra premium. Mármol Carrara seleccionado.',
      condiciones: '30% anticipo, 30% a los 15 días, 40% finalización.\nPlazo estimado: 30 días hábiles.',
      createdAt: '2026-09-01T10:00:00'
    },
    {
      id: 'pres-008', numero: 'PRES-2026-0008', fecha: '2026-09-05', clienteId: 'cli-008', obraId: null,
      direccion: 'Belgrano 780, Avellaneda', descripcion: 'Mesada baño',
      moneda: 'ARS', cotizacionDolar: null, estado: 'rechazado',
      items: [
        { id: 'item-012', descripcion: 'Vanitory', material: 'Granito Negro Absoluto', cantidad: 1, largo: 100, ancho: 50, m2: 0.5, precioUnitario: 280000, subtotal: 140000 }
      ],
      adicionales: { colocacion: 45000, manoDeObra: 0, transporte: 20000, bacha: 0, zocalos: 0, extras: 0 },
      descuento: 0, impuestos: 0, observaciones: 'Cliente decidió usar otro material',
      condiciones: 'Presupuesto válido por 15 días.',
      createdAt: '2026-09-05T13:00:00'
    },
    {
      id: 'pres-009', numero: 'PRES-2026-0009', fecha: '2026-09-10', clienteId: 'cli-002', obraId: null,
      direccion: 'San Martín 450, Vicente López', descripcion: 'Mesada cocina isla',
      moneda: 'ARS', cotizacionDolar: null, estado: 'borrador',
      items: [
        { id: 'item-013', descripcion: 'Isla cocina', material: 'Silestone Gris Expo', cantidad: 1, largo: 200, ancho: 100, m2: 2, precioUnitario: 440000, subtotal: 880000 },
        { id: 'item-014', descripcion: 'Mesada perimetral', material: 'Silestone Gris Expo', cantidad: 1, largo: 350, ancho: 60, m2: 2.1, precioUnitario: 440000, subtotal: 924000 }
      ],
      adicionales: { colocacion: 250000, manoDeObra: 0, transporte: 45000, bacha: 105000, zocalos: 55000, extras: 0 },
      descuento: 5, impuestos: 0, observaciones: '', condiciones: 'Presupuesto válido por 15 días.',
      createdAt: '2026-09-10T11:00:00'
    }
  ];

  // === OBRAS ===
  store.obras = [
    { id: 'obra-001', clienteId: 'cli-001', presupuestoId: 'pres-001', direccion: 'Av. Libertador 1250, CABA', descripcion: 'Mesada cocina en L con bacha bajo mesada', material: 'Granito Negro Absoluto', fechaInicio: '2026-07-20', fechaEstimada: '2026-08-05', responsable: 'Equipo A', estado: 'finalizada', observaciones: 'Obra terminada sin problemas', archivos: [], createdAt: '2026-07-20T10:00:00' },
    { id: 'obra-002', clienteId: 'cli-003', presupuestoId: 'pres-003', direccion: 'Av. Corrientes 3200, CABA', descripcion: 'Revestimiento lobby edificio', material: 'Mármol Botticino', fechaInicio: '2026-08-15', fechaEstimada: '2026-10-15', responsable: 'Equipo A + B', estado: 'en_proceso', observaciones: 'Obra grande en curso', archivos: [], createdAt: '2026-08-15T09:00:00' },
    { id: 'obra-003', clienteId: 'cli-005', presupuestoId: 'pres-005', direccion: 'Mitre 1500, Olivos', descripcion: 'Mesada cocina + baño completo', material: 'Cuarzo Blanco Stellar', fechaInicio: '2026-09-01', fechaEstimada: '2026-09-20', responsable: 'Equipo B', estado: 'en_preparacion', observaciones: 'Esperando que terminen albañilería', archivos: [], createdAt: '2026-09-01T10:00:00' },
    { id: 'obra-004', clienteId: 'cli-006', presupuestoId: 'pres-007', direccion: 'Av. Del Libertador 4500, Martínez', descripcion: 'Escalera y pisos mármol', material: 'Mármol Carrara', fechaInicio: '2026-09-10', fechaEstimada: '2026-10-25', responsable: 'Equipo A', estado: 'pendiente', observaciones: 'Pendiente de coordinar inicio', archivos: [], createdAt: '2026-09-10T10:00:00' },
    { id: 'obra-005', clienteId: 'cli-004', presupuestoId: null, direccion: 'Colón 890, San Isidro', descripcion: 'Reparación mesada existente', material: 'Granito Negro Absoluto', fechaInicio: '2026-09-12', fechaEstimada: '2026-09-14', responsable: 'Equipo B', estado: 'colocacion', observaciones: 'Trabajo de reparación puntual', archivos: [], createdAt: '2026-09-12T10:00:00' }
  ];

  // === FACTURAS ===
  store.facturas = [
    { id: 'fac-001', proveedorId: 'prov-001', tipo: 'factura', numero: 'A-0001-00045678', fecha: '2026-07-15', vencimiento: '2026-08-15', importe: 1850000, moneda: 'ARS', categoria: 'materiales', estado: 'pagada', observaciones: '10 placas granito negro', archivoKey: null, createdAt: '2026-07-15T10:00:00' },
    { id: 'fac-002', proveedorId: 'prov-002', tipo: 'factura', numero: 'A-0002-00012345', fecha: '2026-08-01', vencimiento: '2026-09-01', importe: 2500000, moneda: 'ARS', categoria: 'materiales', estado: 'pagada', observaciones: '5 placas mármol Carrara + 3 Botticino', archivoKey: null, createdAt: '2026-08-01T10:00:00' },
    { id: 'fac-003', proveedorId: 'prov-003', tipo: 'factura', numero: 'A-0003-00007890', fecha: '2026-08-10', vencimiento: '2026-09-10', importe: 3200000, moneda: 'ARS', categoria: 'materiales', estado: 'pendiente', observaciones: '6 placas Silestone Blanco Zeus', archivoKey: null, createdAt: '2026-08-10T10:00:00' },
    { id: 'fac-004', proveedorId: 'prov-001', tipo: 'factura', numero: 'A-0001-00045680', fecha: '2026-08-20', vencimiento: '2026-09-20', importe: 1200000, moneda: 'ARS', categoria: 'materiales', estado: 'pendiente', observaciones: '15 placas Gris Mara', archivoKey: null, createdAt: '2026-08-20T10:00:00' },
    { id: 'fac-005', proveedorId: 'prov-004', tipo: 'factura', numero: 'B-0001-00003456', fecha: '2026-08-25', vencimiento: '2026-09-25', importe: 580000, moneda: 'ARS', categoria: 'materiales', estado: 'pendiente', observaciones: 'Bachas y accesorios', archivoKey: null, createdAt: '2026-08-25T10:00:00' },
    { id: 'fac-006', proveedorId: 'prov-005', tipo: 'factura', numero: 'C-0001-00001234', fecha: '2026-09-01', vencimiento: '2026-10-01', importe: 240000, moneda: 'ARS', categoria: 'materiales', estado: 'pendiente', observaciones: 'Pegamento y selladores', archivoKey: null, createdAt: '2026-09-01T10:00:00' },
    { id: 'fac-007', proveedorId: 'prov-001', tipo: 'nota_credito', numero: 'NC-0001-00000123', fecha: '2026-08-05', vencimiento: null, importe: 185000, moneda: 'ARS', categoria: 'materiales', estado: 'pagada', observaciones: 'Devolución 1 placa defectuosa', archivoKey: null, createdAt: '2026-08-05T10:00:00' },
    { id: 'fac-008', proveedorId: 'prov-002', tipo: 'nota_debito', numero: 'ND-0002-00000045', fecha: '2026-08-10', vencimiento: '2026-09-10', importe: 50000, moneda: 'ARS', categoria: 'servicios', estado: 'pendiente', observaciones: 'Recargo por entrega urgente', archivoKey: null, createdAt: '2026-08-10T10:00:00' },
    { id: 'fac-009', proveedorId: 'prov-003', tipo: 'factura', numero: 'A-0003-00007895', fecha: '2026-09-05', vencimiento: '2026-10-05', importe: 2900000, moneda: 'ARS', categoria: 'materiales', estado: 'pendiente', observaciones: 'Cuarzo y Silestone varios', archivoKey: null, createdAt: '2026-09-05T10:00:00' },
    { id: 'fac-010', proveedorId: 'prov-002', tipo: 'factura', numero: 'A-0002-00012350', fecha: '2026-09-08', vencimiento: '2026-10-08', importe: 4500000, moneda: 'ARS', categoria: 'materiales', estado: 'pendiente', observaciones: 'Mármol Carrara seleccionado para escalera', archivoKey: null, createdAt: '2026-09-08T10:00:00' }
  ];

  // === PAGOS ===
  store.pagos = [
    { id: 'pago-001', proveedorId: 'prov-001', facturaId: 'fac-001', concepto: 'Pago factura A-0001-00045678', importe: 1850000, fecha: '2026-08-10', vencimiento: null, metodoPago: 'transferencia', estado: 'pagado', comprobanteKey: null, observaciones: '', createdAt: '2026-08-10T10:00:00' },
    { id: 'pago-002', proveedorId: 'prov-002', facturaId: 'fac-002', concepto: 'Pago factura A-0002-00012345', importe: 2500000, fecha: '2026-08-28', vencimiento: null, metodoPago: 'transferencia', estado: 'pagado', comprobanteKey: null, observaciones: '', createdAt: '2026-08-28T10:00:00' },
    { id: 'pago-003', proveedorId: 'prov-003', facturaId: 'fac-003', concepto: 'Pago parcial Silestone', importe: 1600000, fecha: '2026-09-05', vencimiento: null, metodoPago: 'transferencia', estado: 'pagado', comprobanteKey: null, observaciones: 'Pago 50%, resto al entregar', createdAt: '2026-09-05T10:00:00' },
    { id: 'pago-004', proveedorId: 'prov-005', facturaId: 'fac-006', concepto: 'Pago adhesivos', importe: 240000, fecha: '2026-09-10', vencimiento: null, metodoPago: 'efectivo', estado: 'pagado', comprobanteKey: null, observaciones: '', createdAt: '2026-09-10T10:00:00' },
    { id: 'pago-005', proveedorId: 'prov-004', facturaId: null, concepto: 'Anticipo próximo pedido', importe: 200000, fecha: '2026-09-12', vencimiento: null, metodoPago: 'mercadopago', estado: 'pagado', comprobanteKey: null, observaciones: 'Anticipo para próximo lote de bachas', createdAt: '2026-09-12T10:00:00' }
  ];

  // === COBROS ===
  store.cobros = [
    { id: 'cob-001', clienteId: 'cli-001', obraId: 'obra-001', presupuestoId: 'pres-001', fecha: '2026-07-12', importe: 462200, metodoPago: 'transferencia', estado: 'cobrado', comprobanteKey: null, observaciones: 'Anticipo 50%', createdAt: '2026-07-12T10:00:00' },
    { id: 'cob-002', clienteId: 'cli-001', obraId: 'obra-001', presupuestoId: 'pres-001', fecha: '2026-08-05', importe: 462200, metodoPago: 'transferencia', estado: 'cobrado', comprobanteKey: null, observaciones: 'Saldo final', createdAt: '2026-08-05T10:00:00' },
    { id: 'cob-003', clienteId: 'cli-003', obraId: 'obra-002', presupuestoId: 'pres-003', fecha: '2026-08-15', importe: 5697150, metodoPago: 'transferencia', estado: 'cobrado', comprobanteKey: null, observaciones: 'Anticipo 30%', createdAt: '2026-08-15T10:00:00' },
    { id: 'cob-004', clienteId: 'cli-005', obraId: 'obra-003', presupuestoId: 'pres-005', fecha: '2026-09-01', importe: 521904, metodoPago: 'transferencia', estado: 'cobrado', comprobanteKey: null, observaciones: 'Anticipo 50%', createdAt: '2026-09-01T10:00:00' },
    { id: 'cob-005', clienteId: 'cli-006', obraId: 'obra-004', presupuestoId: 'pres-007', fecha: '2026-09-10', importe: 5128500, metodoPago: 'cheque', estado: 'cobrado', comprobanteKey: null, observaciones: 'Anticipo 30%', createdAt: '2026-09-10T10:00:00' },
    { id: 'cob-006', clienteId: 'cli-004', obraId: 'obra-005', presupuestoId: null, fecha: '2026-09-14', importe: 150000, metodoPago: 'efectivo', estado: 'cobrado', comprobanteKey: null, observaciones: 'Pago total reparación', createdAt: '2026-09-14T08:00:00' }
  ];
}

// Initialize on import
initMockData();

// ── Data Access Layer (simulates API) ──
export const DataService = {
  // ── Generic CRUD ──
  getAll(collection) {
    return [...(store[collection] || [])];
  },

  getById(collection, id) {
    return store[collection]?.find(item => item.id === id) || null;
  },

  create(collection, data) {
    const record = {
      ...data,
      id: data.id || generateId(),
      createdAt: new Date().toISOString()
    };
    store[collection].push(record);
    return record;
  },

  update(collection, id, data) {
    const idx = store[collection]?.findIndex(item => item.id === id);
    if (idx === -1) return null;
    store[collection][idx] = { ...store[collection][idx], ...data, updatedAt: new Date().toISOString() };
    return store[collection][idx];
  },

  remove(collection, id) {
    const idx = store[collection]?.findIndex(item => item.id === id);
    if (idx === -1) return false;
    store[collection].splice(idx, 1);
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
  }
};
