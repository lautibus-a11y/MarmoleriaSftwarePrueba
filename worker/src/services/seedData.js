/* ========================================
   MARMOLERÍA BENJAMIN — Seed Data for Cloudflare R2
   Initial seed when R2 collections are created
   ======================================== */

export const INITIAL_SEED = {
  clientes: [
    { id: 'cli-001', nombre: 'Carlos', apellido: 'Rodríguez', telefono: '11-4567-8901', whatsapp: '5491145678901', email: 'carlos.rodriguez@email.com', direccion: 'Av. Libertador 1250, CABA', cuit: '20-34567890-1', observaciones: 'Cliente frecuente, prefiere granito negro', condicionComercial: 'especial', descuentoHabitual: 10, motivoCondicion: 'Cliente habitual', createdAt: '2026-01-15T10:00:00Z' },
    { id: 'cli-002', nombre: 'María Elena', apellido: 'Gutiérrez', telefono: '11-2345-6789', whatsapp: '5491123456789', email: 'maria.gutierrez@email.com', direccion: 'San Martín 450, Vicente López', cuit: '27-23456789-0', observaciones: '', condicionComercial: 'estandar', descuentoHabitual: 0, motivoCondicion: '', createdAt: '2026-02-20T14:30:00Z' },
    { id: 'cli-003', nombre: 'Constructora Del Sur', apellido: 'S.A.', telefono: '11-5678-1234', whatsapp: '5491156781234', email: 'compras@delsur.com.ar', direccion: 'Av. Corrientes 3200, CABA', cuit: '30-71234567-8', observaciones: 'Empresa constructora, volumen alto', condicionComercial: 'especial', descuentoHabitual: 15, motivoCondicion: 'Precio mayorista', createdAt: '2026-03-10T09:00:00Z' },
    { id: 'cli-004', nombre: 'Roberto', apellido: 'Fernández', telefono: '11-8901-2345', whatsapp: '5491189012345', email: 'roberto.f@email.com', direccion: 'Colón 890, San Isidro', cuit: '', observaciones: 'Referido por Carlos Rodríguez', condicionComercial: 'estandar', descuentoHabitual: 0, motivoCondicion: '', createdAt: '2026-04-05T11:00:00Z' },
    { id: 'cli-005', nombre: 'Laura', apellido: 'Martínez', telefono: '11-3456-7890', whatsapp: '5491134567890', email: 'laura.m@email.com', direccion: 'Mitre 1500, Olivos', cuit: '27-30987654-3', observaciones: '', condicionComercial: 'estandar', descuentoHabitual: 0, motivoCondicion: '', createdAt: '2026-05-12T16:00:00Z' },
    { id: 'cli-006', nombre: 'Estudio Arq. Bianchi', apellido: '', telefono: '11-6789-0123', whatsapp: '5491167890123', email: 'info@estudiobianchi.com', direccion: 'Av. Callao 1100, CABA', cuit: '30-70123456-9', observaciones: 'Estudio de arquitectura, pide presupuestos por obras grandes', condicionComercial: 'estandar', descuentoHabitual: 0, motivoCondicion: '', createdAt: '2026-06-01T10:00:00Z' },
    { id: 'cli-007', nombre: 'Ana', apellido: 'Morales', telefono: '11-7890-1234', whatsapp: '5491178901234', email: 'ana.morales@email.com', direccion: 'Rivadavia 2300, Morón', cuit: '', observaciones: 'Reforma cocina y baño', condicionComercial: 'estandar', descuentoHabitual: 0, motivoCondicion: '', createdAt: '2026-07-20T09:30:00Z' },
    { id: 'cli-008', nombre: 'Diego', apellido: 'Sánchez', telefono: '11-0123-4567', whatsapp: '5491101234567', email: 'diego.s@email.com', direccion: 'Belgrano 780, Avellaneda', cuit: '20-29876543-1', observaciones: '', condicionComercial: 'estandar', descuentoHabitual: 0, motivoCondicion: '', createdAt: '2026-08-10T13:00:00Z' }
  ],

  materiales: [
    { id: 'mat-000', nombre: 'Negro Brasil', categoria: 'granito', tipo: 'Importado', largo: 300, ancho: 180, espesor: '20 mm', unidad: 'm2', precioM2: 50000, precioVenta: 50000, stockMinimo: 10, proveedor: 'prov-001', observaciones: 'Granito Negro Brasil clásico. Origen: Brasil.', createdAt: '2026-01-01T08:00:00Z' },
    { id: 'mat-001', nombre: 'Granito Negro Absoluto', categoria: 'granito', tipo: 'Importado', largo: 290, ancho: 175, espesor: '20 mm', unidad: 'm2', precioM2: 185000, precioVenta: 185000, stockMinimo: 15, proveedor: 'prov-001', observaciones: 'Origen: India. Pulido espejo.', createdAt: '2026-01-01T08:01:00Z' },
    { id: 'mat-002', nombre: 'Granito Gris Mara', categoria: 'granito', tipo: 'Nacional', largo: 260, ancho: 160, espesor: '20 mm', unidad: 'm2', precioM2: 85000, precioVenta: 85000, stockMinimo: 20, proveedor: 'prov-001', observaciones: 'Nacional tradicional, alto tránsito.', createdAt: '2026-01-01T08:02:00Z' },
    { id: 'mat-003', nombre: 'Mármol Carrara', categoria: 'marmol', tipo: 'Importado', largo: 280, ancho: 150, espesor: '20 mm', unidad: 'm2', precioM2: 260000, precioVenta: 260000, stockMinimo: 12, proveedor: 'prov-002', observaciones: 'Origen: Italia. Veteado clásico blanco.', createdAt: '2026-01-01T08:03:00Z' },
    { id: 'mat-004', nombre: 'Mármol Travertino Romano', categoria: 'travertino', tipo: 'Importado', largo: 250, ancho: 140, espesor: '20 mm', unidad: 'm2', precioM2: 175000, precioVenta: 175000, stockMinimo: 10, proveedor: 'prov-002', observaciones: 'Tono beige cálido resinado.', createdAt: '2026-01-01T08:04:00Z' },
    { id: 'mat-005', nombre: 'Silestone Blanco Zeus', categoria: 'silestone', tipo: 'Importado', largo: 305, ancho: 140, espesor: '20 mm', unidad: 'm2', precioM2: 320000, precioVenta: 320000, stockMinimo: 10, proveedor: 'prov-003', observaciones: 'Superficie de cuarzo compacta premium antibacteriana.', createdAt: '2026-01-01T08:05:00Z' },
    { id: 'mat-006', nombre: 'Silestone Gris Expo', categoria: 'silestone', tipo: 'Importado', largo: 305, ancho: 140, espesor: '20 mm', unidad: 'm2', precioM2: 280000, precioVenta: 280000, stockMinimo: 8, proveedor: 'prov-003', observaciones: 'Cuarzo de alta resistencia uniforme.', createdAt: '2026-01-01T08:06:00Z' },
    { id: 'mat-007', nombre: 'Cuarzo Blanco Stellar', categoria: 'cuarzo', tipo: 'Importado', largo: 300, ancho: 140, espesor: '20 mm', unidad: 'm2', precioM2: 220000, precioVenta: 220000, stockMinimo: 10, proveedor: 'prov-003', observaciones: 'Superficie con micro-destellos espejados.', createdAt: '2026-01-01T08:07:00Z' },
    { id: 'mat-008', nombre: 'Granito Marrón Báltico', categoria: 'granito', tipo: 'Importado', largo: 270, ancho: 160, espesor: '20 mm', unidad: 'm2', precioM2: 145000, precioVenta: 145000, stockMinimo: 10, proveedor: 'prov-001', observaciones: 'Estructura circular granítica clásica.', createdAt: '2026-01-01T08:08:00Z' },
    { id: 'mat-009', nombre: 'Mármol Botticino', categoria: 'marmol', tipo: 'Importado', largo: 260, ancho: 150, espesor: '20 mm', unidad: 'm2', precioM2: 210000, precioVenta: 210000, stockMinimo: 8, proveedor: 'prov-002', observaciones: 'Mármol italiano compacto beige.', createdAt: '2026-01-01T08:09:00Z' },
    { id: 'mat-010', nombre: 'Porcelanato Gran Formato', categoria: 'porcelanato', tipo: 'Nacional', largo: 120, ancho: 60, espesor: '10 mm', unidad: 'm2', precioM2: 65000, precioVenta: 65000, stockMinimo: 25, proveedor: 'prov-004', observaciones: 'Placas 120x60cm.', createdAt: '2026-01-01T08:10:00Z' },
    { id: 'mat-011', nombre: 'Ónix Miel (Placa Entera)', categoria: 'onix', tipo: 'Importado', largo: 240, ancho: 150, espesor: '20 mm', unidad: 'placas', precioM2: 1200000, precioVenta: 1200000, stockMinimo: 2, proveedor: 'prov-002', observaciones: 'Placa entera translúcida para retroiluminar.', createdAt: '2026-01-01T08:11:00Z' },
    { id: 'mat-012', nombre: 'Granito Exótico Patagonia (Placa)', categoria: 'granito', tipo: 'Importado', largo: 290, ancho: 180, espesor: '20 mm', unidad: 'placas', precioM2: 950000, precioVenta: 950000, stockMinimo: 2, proveedor: 'prov-001', observaciones: 'Placa entera seleccionada con cuarzo cristalino.', createdAt: '2026-01-01T08:12:00Z' },
    { id: 'mat-013', nombre: 'Zócalo Granito Negro', categoria: 'granito', tipo: 'Nacional', largo: 100, ancho: 10, espesor: '20 mm', unidad: 'metros', precioM2: 25000, precioVenta: 25000, stockMinimo: 20, proveedor: 'prov-001', observaciones: 'h=10cm. Cotizado por metro lineal.', createdAt: '2026-01-01T08:13:00Z' },
    { id: 'mat-014', nombre: 'Bacha Simple Acero Johnson', categoria: 'otro', tipo: 'Nacional', largo: 52, ancho: 32, espesor: '-', unidad: 'unidades', precioM2: 72000, precioVenta: 72000, stockMinimo: 5, proveedor: 'prov-004', observaciones: 'Para embutir bajo mesada. Precio por unidad.', createdAt: '2026-01-01T08:14:00Z' },
    { id: 'mat-015', nombre: 'Bacha Doble Acero Johnson', categoria: 'otro', tipo: 'Nacional', largo: 74, ancho: 40, espesor: '-', unidad: 'unidades', precioM2: 105000, precioVenta: 105000, stockMinimo: 3, proveedor: 'prov-004', observaciones: 'Doble cuba cocina. Precio por unidad.', createdAt: '2026-01-01T08:15:00Z' },
    { id: 'mat-016', nombre: 'Pegamento Especial Mármol', categoria: 'otro', tipo: 'Nacional', largo: 0, ancho: 0, espesor: '-', unidad: 'unidades', precioM2: 18000, precioVenta: 18000, stockMinimo: 10, proveedor: 'prov-005', observaciones: 'Balde 25kg bi-componente.', createdAt: '2026-01-01T08:16:00Z' }
  ],

  stockMovimientos: [
    { id: 'mov-001', materialId: 'mat-001', tipo: 'entrada', cantidad: 50, fecha: '2026-01-20', referencia: 'Compra importación 50 m²', createdAt: '2026-01-20T09:00:00Z' },
    { id: 'mov-002', materialId: 'mat-001', tipo: 'salida', cantidad: 12, fecha: '2026-03-15', referencia: 'Obra cli-001 (12 m²)', createdAt: '2026-03-15T10:00:00Z' },
    { id: 'mov-003', materialId: 'mat-001', tipo: 'salida', cantidad: 8, fecha: '2026-06-10', referencia: 'Obra cli-003 (8 m²)', createdAt: '2026-06-10T11:00:00Z' },
    { id: 'mov-004', materialId: 'mat-002', tipo: 'entrada', cantidad: 75, fecha: '2026-01-20', referencia: 'Compra cantera 75 m²', createdAt: '2026-01-20T09:00:00Z' },
    { id: 'mov-005', materialId: 'mat-002', tipo: 'salida', cantidad: 18, fecha: '2026-04-20', referencia: 'Obra cli-002 (18 m²)', createdAt: '2026-04-20T10:00:00Z' },
    { id: 'mov-006', materialId: 'mat-002', tipo: 'salida', cantidad: 25, fecha: '2026-07-25', referencia: 'Obra cli-006 (25 m²)', createdAt: '2026-07-25T10:00:00Z' },
    { id: 'mov-007', materialId: 'mat-003', tipo: 'entrada', cantidad: 35, fecha: '2026-02-10', referencia: 'Importación Italia 35 m²', createdAt: '2026-02-10T09:00:00Z' },
    { id: 'mov-008', materialId: 'mat-003', tipo: 'salida', cantidad: 14, fecha: '2026-05-18', referencia: 'Obra cli-005 (14 m²)', createdAt: '2026-05-18T10:00:00Z' },
    { id: 'mov-009', materialId: 'mat-005', tipo: 'entrada', cantidad: 30, fecha: '2026-03-01', referencia: 'Compra Cosentino 30 m²', createdAt: '2026-03-01T09:00:00Z' },
    { id: 'mov-010', materialId: 'mat-005', tipo: 'salida', cantidad: 16, fecha: '2026-06-20', referencia: 'Obras varias (16 m²)', createdAt: '2026-06-20T10:00:00Z' },
    { id: 'mov-011', materialId: 'mat-005', tipo: 'salida', cantidad: 5, fecha: '2026-08-15', referencia: 'Obra cli-007 (5 m²)', createdAt: '2026-08-15T10:00:00Z' },
    { id: 'mov-012', materialId: 'mat-010', tipo: 'entrada', cantidad: 100, fecha: '2026-01-25', referencia: 'Compra inicial 100 m²', createdAt: '2026-01-25T09:00:00Z' },
    { id: 'mov-013', materialId: 'mat-010', tipo: 'salida', cantidad: 65, fecha: '2026-08-01', referencia: 'Obras varias (65 m²)', createdAt: '2026-08-01T10:00:00Z' },
    { id: 'mov-014', materialId: 'mat-011', tipo: 'entrada', cantidad: 4, fecha: '2026-05-01', referencia: 'Compra 4 placas enteras Ónix', createdAt: '2026-05-01T09:00:00Z' },
    { id: 'mov-015', materialId: 'mat-011', tipo: 'salida', cantidad: 2, fecha: '2026-08-10', referencia: 'Obra cli-006 (2 placas)', createdAt: '2026-08-10T10:00:00Z' },
    { id: 'mov-016', materialId: 'mat-012', tipo: 'entrada', cantidad: 3, fecha: '2026-06-01', referencia: 'Compra 3 placas Patagonia', createdAt: '2026-06-01T09:00:00Z' },
    { id: 'mov-017', materialId: 'mat-012', tipo: 'salida', cantidad: 1, fecha: '2026-08-20', referencia: 'Isla de cocina (1 placa)', createdAt: '2026-08-20T10:00:00Z' },
    { id: 'mov-018', materialId: 'mat-013', tipo: 'entrada', cantidad: 60, fecha: '2026-02-15', referencia: 'Entrada 60 metros lineales', createdAt: '2026-02-15T09:00:00Z' },
    { id: 'mov-019', materialId: 'mat-013', tipo: 'salida', cantidad: 28, fecha: '2026-07-30', referencia: 'Obras varias (28 ml)', createdAt: '2026-07-30T10:00:00Z' },
    { id: 'mov-020', materialId: 'mat-014', tipo: 'entrada', cantidad: 12, fecha: '2026-02-15', referencia: 'Entrada 12 bachas simples', createdAt: '2026-02-15T09:00:00Z' },
    { id: 'mov-021', materialId: 'mat-014', tipo: 'salida', cantidad: 8, fecha: '2026-07-30', referencia: 'Instaladas en obras (8 un)', createdAt: '2026-07-30T10:00:00Z' }
  ],

  proveedores: [
    { id: 'prov-001', nombre: 'Granitec', razonSocial: 'Granitec S.R.L.', cuit: '30-70111222-3', telefono: '11-4000-1111', email: 'ventas@granitec.com.ar', direccion: 'Parque Industrial Pilar, Buenos Aires', contacto: 'Martín López', observaciones: 'Proveedor principal de granitos', createdAt: '2026-01-10T10:00:00Z' },
    { id: 'prov-002', nombre: 'Mármoles del Plata', razonSocial: 'Mármoles del Plata S.A.', cuit: '30-70222333-4', telefono: '11-4000-2222', email: 'compras@marmolesdelplata.com', direccion: 'Av. Belgrano 3500, CABA', contacto: 'Susana Pérez', observaciones: 'Mármoles importados y nacionales', createdAt: '2026-01-10T10:00:00Z' },
    { id: 'prov-003', nombre: 'Cosentino Argentina', razonSocial: 'Cosentino Argentina S.A.', cuit: '30-70333444-5', telefono: '11-4000-3333', email: 'ventas@cosentino.com.ar', direccion: 'Nordelta, Tigre', contacto: 'Fernando García', observaciones: 'Silestone, Dekton, superficies de cuarzo', createdAt: '2026-02-01T10:00:00Z' },
    { id: 'prov-004', nombre: 'Sanitarios Express', razonSocial: 'Sanitarios Express S.R.L.', cuit: '30-70444555-6', telefono: '11-4000-4444', email: 'info@sanitariosexpress.com', direccion: 'Av. Juan B. Justo 4500, CABA', contacto: 'Pablo Ruiz', observaciones: 'Bachas, grifería, accesorios', createdAt: '2026-02-15T10:00:00Z' },
    { id: 'prov-005', nombre: 'Adhesivos Pro', razonSocial: 'Adhesivos Pro S.A.', cuit: '30-70555666-7', telefono: '11-4000-5555', email: 'ventas@adhesivospro.com', direccion: 'Zona Industrial Avellaneda', contacto: 'Ricardo Gómez', observaciones: 'Pegamentos, selladores, productos químicos', createdAt: '2026-03-01T10:00:00Z' }
  ],

  presupuestos: [
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
      createdAt: '2026-07-10T10:00:00Z'
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
      createdAt: '2026-07-25T14:00:00Z'
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
      createdAt: '2026-08-05T09:00:00Z'
    }
  ],

  obras: [
    { id: 'obra-001', clienteId: 'cli-001', presupuestoId: 'pres-001', direccion: 'Av. Libertador 1250, CABA', descripcion: 'Mesada cocina en L con bacha bajo mesada', material: 'Granito Negro Absoluto', fechaInicio: '2026-07-20', fechaEstimada: '2026-08-05', responsable: 'Equipo A', estado: 'finalizada', observaciones: 'Obra terminada sin problemas', archivos: [], createdAt: '2026-07-20T10:00:00Z' },
    { id: 'obra-002', clienteId: 'cli-003', presupuestoId: 'pres-003', direccion: 'Av. Corrientes 3200, CABA', descripcion: 'Revestimiento lobby edificio', material: 'Mármol Botticino', fechaInicio: '2026-08-15', fechaEstimada: '2026-10-15', responsable: 'Equipo A + B', estado: 'en_proceso', observaciones: 'Obra grande en curso', archivos: [], createdAt: '2026-08-15T09:00:00Z' }
  ],

  facturas: [
    { id: 'fac-001', proveedorId: 'prov-001', tipo: 'factura', numero: 'A-0001-00045678', fecha: '2026-07-15', vencimiento: '2026-08-15', importe: 1850000, moneda: 'ARS', categoria: 'materiales', estado: 'pagada', observaciones: '10 placas granito negro', archivoKey: null, createdAt: '2026-07-15T10:00:00Z' },
    { id: 'fac-002', proveedorId: 'prov-002', tipo: 'factura', numero: 'A-0002-00012345', fecha: '2026-08-01', vencimiento: '2026-09-01', importe: 2500000, moneda: 'ARS', categoria: 'materiales', estado: 'pagada', observaciones: '5 placas mármol Carrara + 3 Botticino', archivoKey: null, createdAt: '2026-08-01T10:00:00Z' },
    { id: 'fac-003', proveedorId: 'prov-003', tipo: 'factura', numero: 'A-0003-00007890', fecha: '2026-08-10', vencimiento: '2026-09-10', importe: 3200000, moneda: 'ARS', categoria: 'materiales', estado: 'pendiente', observaciones: '6 placas Silestone Blanco Zeus', archivoKey: null, createdAt: '2026-08-10T10:00:00Z' }
  ],

  pagos: [
    { id: 'pago-001', proveedorId: 'prov-001', facturaId: 'fac-001', destinatarioConcepto: 'Granitec S.R.L.', concepto: 'Pago factura A-0001-00045678', importe: 1850000, fecha: '2026-08-10', vencimiento: null, metodoPago: 'transferencia', estado: 'pagado', comprobanteKey: null, observaciones: '', createdAt: '2026-08-10T10:00:00Z' },
    { id: 'pago-002', proveedorId: 'prov-002', facturaId: 'fac-002', destinatarioConcepto: 'Mármoles del Plata S.A.', concepto: 'Pago factura A-0002-00012345', importe: 2500000, fecha: '2026-08-28', vencimiento: null, metodoPago: 'home_banking', estado: 'pagado', comprobanteKey: null, observaciones: '', createdAt: '2026-08-28T10:00:00Z' }
  ],

  cobros: [
    { id: 'cob-001', clienteId: 'cli-001', obraId: 'obra-001', presupuestoId: 'pres-001', fecha: '2026-07-12', importe: 462200, metodoPago: 'transferencia', estado: 'cobrado', comprobanteKey: null, observaciones: 'Anticipo 50%', createdAt: '2026-07-12T10:00:00Z' },
    { id: 'cob-002', clienteId: 'cli-001', obraId: 'obra-001', presupuestoId: 'pres-001', fecha: '2026-08-05', importe: 462200, metodoPago: 'transferencia', estado: 'cobrado', comprobanteKey: null, observaciones: 'Saldo final', createdAt: '2026-08-05T10:00:00Z' }
  ],

  eventos: [
    {
      id: 'evt-001',
      tipo: 'medicion',
      fecha: '2026-09-15',
      hora: '10:00',
      estado: 'pendiente',
      clienteId: 'cli-002',
      clienteNombre: 'María Elena Gutiérrez',
      presupuestoId: 'pres-002',
      direccion: 'San Martín 450, Vicente López',
      notas: 'Llevar muestras de Mármol Carrara y cinta láser de medición.',
      createdAt: '2026-09-10T10:00:00Z'
    },
    {
      id: 'evt-002',
      tipo: 'instalacion',
      fecha: '2026-09-15',
      hora: '14:30',
      estado: 'pendiente',
      clienteId: 'cli-001',
      clienteNombre: 'Carlos Rodríguez',
      presupuestoId: 'pres-001',
      direccion: 'Av. Libertador 1250, CABA',
      notas: 'Instalación de mesada en L Negro Absoluto con bacha pegada.',
      createdAt: '2026-09-10T11:00:00Z'
    },
    {
      id: 'evt-003',
      tipo: 'entrega',
      fecha: '2026-09-16',
      hora: '09:30',
      estado: 'pendiente',
      clienteId: 'cli-007',
      clienteNombre: 'Ana Morales',
      presupuestoId: null,
      direccion: 'Rivadavia 2300, Morón',
      notas: 'Entrega de piezas pulidas Gris Mara para cocina.',
      createdAt: '2026-09-12T09:00:00Z'
    }
  ],

  config: {
    empresa_nombre: 'Marmolería Benjamin',
    empresa_cuit: '30-71234567-9',
    empresa_direccion: 'Ruta 3 Km 35, Virrey del Pino, Buenos Aires',
    empresa_telefono: '+54 9 11 3456-7890',
    empresa_email: 'contacto@marmoleriabenjamin.com.ar',
    cotizacionDolar: 1350,
    condiciones: 'Presupuesto válido por 15 días corridos a partir de la fecha de emisión.\nForma de pago: 50% de anticipo al confirmar y saldo contra entrega/colocación.\nLos precios no incluyen IVA salvo indicación expresa.\nPlazo de entrega estimado: 10 a 15 días hábiles a partir de la toma de medidas definitiva y acreditación del anticipo.\nLas modificaciones sobre medidas o planos posteriores a la aprobación podrán generar costos adicionales y reprogramación de entrega.\nEl cliente debe garantizar el libre acceso a la obra y suministro eléctrico para la colocación.'
  }
};
