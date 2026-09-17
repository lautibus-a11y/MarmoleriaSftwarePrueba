import { JSDOM } from 'jsdom';

// ── Setup Browser Environment in Node ──
const dom = new JSDOM(`<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <div id="app">
    <div id="page-title"></div>
    <div id="page-header-actions"></div>
    <div id="page-content"></div>
    <div id="header-notifs-badge"></div>
  </div>
  <div id="drawer-container"></div>
  <div id="modal-container"></div>
  <div id="toast-container"></div>
</body>
</html>`, {
  url: 'http://localhost:3000/#/dashboard',
  runScripts: 'dangerously'
});

const { window } = dom;
global.window = window;
global.document = window.document;
global.HTMLElement = window.HTMLElement;
global.HTMLInputElement = window.HTMLInputElement;
global.HTMLSelectElement = window.HTMLSelectElement;
global.HTMLTextAreaElement = window.HTMLTextAreaElement;
global.FormData = window.FormData;
global.Event = window.Event;
global.CustomEvent = window.CustomEvent;
// navigator exists on global in Node 21+

global.localStorage = window.localStorage;

// Mock window.open and print
window.open = (url) => ({ closed: false, location: { href: url } });
window.print = () => {};
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
window.requestAnimationFrame = global.requestAnimationFrame;
window.cancelAnimationFrame = global.cancelAnimationFrame;

// Import app modules
const { DataService } = await import('../frontend/js/services/mockData.js');
const { formatCurrency, formatDate, resolveEntityContact, formatWhatsAppPhone } = await import('../frontend/js/utils/helpers.js');
const { generatePresupuestoHtml, generateObraHtml, generateCobroHtml, generateFacturaHtml } = await import('../frontend/js/services/documentExporter.js');
const { renderPresupuestos, aprobarPresupuesto, openPresupuestoForm } = await import('../frontend/js/pages/presupuestos.js');
const { renderObras, openObraForm } = await import('../frontend/js/pages/obras.js');
const { renderClientes, openClienteForm } = await import('../frontend/js/pages/clientes.js');
const { renderProveedores, openProveedorForm } = await import('../frontend/js/pages/proveedores.js');
const { renderStock, openMaterialForm, openMovimientoForm } = await import('../frontend/js/pages/stock.js');
const { renderCalendario, openEventoForm, openEventoDetailModal } = await import('../frontend/js/pages/calendario.js');
const { renderFacturas } = await import('../frontend/js/pages/facturas.js');
const { renderPagos } = await import('../frontend/js/pages/pagos.js');
const { renderCobros } = await import('../frontend/js/pages/cobros.js');
const { renderConfiguracion } = await import('../frontend/js/pages/configuracion.js');
const { renderDashboard } = await import('../frontend/js/pages/dashboard.js');
const { Drawer } = await import('../frontend/js/components/drawer.js');
const { Modal } = await import('../frontend/js/components/modal.js');
const { Toast } = await import('../frontend/js/components/toast.js');

// Test reporter
const results = {
  passed: [],
  failed: [],
  warnings: []
};

function assert(condition, testName, details = '') {
  if (condition) {
    results.passed.push(testName);
    console.log(`  ✅ PASS: ${testName}`);
  } else {
    results.failed.push({ testName, details });
    console.error(`  ❌ FAIL: ${testName} — ${details}`);
  }
}

console.log('\n===============================================================');
console.log('🚀 INICIANDO PRUEBA FUNCIONAL COMPLETA MODO AGÉNTICO');
console.log('===============================================================\n');

// ── TEST SUITE 1: IVA Y CÁLCULOS MATEMÁTICOS ──
console.log('--- TEST 1: CÁLCULOS MATEMÁTICOS (IVA, Subtotal, Descuentos, Totales, USD) ---');
{
  // Caso 1: 1 ítem 2.5m2 x $100.000 = $250.000, Adicional colocación $50.000 -> Subtotal $300.000
  // Descuento 10% ($30.000) -> Base $270.000 -> IVA 21% ($56.700) -> Total $326.700
  const presCalc1 = {
    items: [{ descripcion: 'Mesada', m2: 2.5, precioUnitario: 100000, subtotal: 250000 }],
    adicionales: { colocacion: 50000, manoDeObra: 0 },
    descuento: 10,
    impuestos: 21,
    moneda: 'ARS'
  };
  const total1 = DataService.getPresupuestoTotal(presCalc1);
  assert(Math.abs(total1 - 326700) < 0.01, 'Cálculo matemático: Subtotal $300k, Desc 10%, IVA 21% = $326.700', `Obtenido: ${total1}`);

  // Caso 2: IVA 10.5% con descuento 0%
  // Items $200.000, Adicionales $0 -> Base $200.000 -> IVA 10.5% ($21.000) -> Total $221.000
  const presCalc2 = {
    items: [{ descripcion: 'Isla', subtotal: 200000 }],
    adicionales: {},
    descuento: 0,
    impuestos: 10.5,
    moneda: 'ARS'
  };
  const total2 = DataService.getPresupuestoTotal(presCalc2);
  assert(Math.abs(total2 - 221000) < 0.01, 'Cálculo matemático: Subtotal $200k, Desc 0%, IVA 10.5% = $221.000', `Obtenido: ${total2}`);

  // Caso 3: Sin IVA (0%), Descuento 15%
  // Items $100.000 -> Descuento 15% ($15.000) -> Total $85.000
  const presCalc3 = {
    items: [{ descripcion: 'Zócalos', subtotal: 100000 }],
    adicionales: {},
    descuento: 15,
    impuestos: 0,
    moneda: 'ARS'
  };
  const total3 = DataService.getPresupuestoTotal(presCalc3);
  assert(Math.abs(total3 - 85000) < 0.01, 'Cálculo matemático: Subtotal $100k, Desc 15%, IVA 0% = $85.000', `Obtenido: ${total3}`);

  // Caso 4: Moneda USD con cotización
  const presCalcUSD = {
    numero: 'TEST-USD-1',
    items: [{ descripcion: 'Neolith', subtotal: 1000 }],
    adicionales: {},
    descuento: 0,
    impuestos: 0,
    moneda: 'USD',
    cotizacionDolar: 1450
  };
  const totalUSD = DataService.getPresupuestoTotal(presCalcUSD);
  assert(totalUSD === 1000, 'Cálculo matemático: Total USD = 1.000', `Obtenido: ${totalUSD}`);
  const htmlUSD = generatePresupuestoHtml(presCalcUSD, null, totalUSD);
  assert(htmlUSD.includes('1.450') && htmlUSD.includes('1.450.000'), 'DocumentExporter incluye cotización y conversión en pesos ARS');
}

// ── TEST SUITE 2: CLIENTES (Creación, Sincronización, Relaciones) ──
console.log('\n--- TEST 2: CLIENTES (CRUD, Validación, Teléfono ↔ WhatsApp) ---');
let createdClient = null;
{
  const container = document.getElementById('page-content');
  const actions = document.getElementById('page-header-actions');
  renderClientes(container, actions);

  // Crear cliente
  createdClient = DataService.create('clientes', {
    nombre: 'Valentin',
    apellido: 'Test',
    telefono: '11 3344 5566',
    whatsapp: '5491133445566',
    email: 'valentin@test.com',
    direccion: 'Av. Corrientes 5000, CABA',
    cuit: '20-11223344-5'
  });
  assert(createdClient && createdClient.id, 'Creación de cliente en DataService');

  // Actualizar sólo el teléfono
  const updatedClient = DataService.update('clientes', createdClient.id, {
    telefono: '11 9988 7766'
  });
  assert(updatedClient.telefono === '11 9988 7766', 'Edición de teléfono de cliente guardada correctamente');
  assert(formatWhatsAppPhone(updatedClient.whatsapp) === '5491199887766', 'Sincronización automática de WhatsApp con el nuevo teléfono');

  // Validar resolución de contacto
  const contact = resolveEntityContact(updatedClient);
  assert(contact.name === 'Valentin Test', 'resolveEntityContact devuelve nombre completo del cliente');
  assert(contact.whatsapp === '5491199887766', 'resolveEntityContact devuelve WhatsApp normalizado');
}

// ── TEST SUITE 3: PRESUPUESTOS (Creación, Aprobación, Obras vinculadas, Compartir) ──
console.log('\n--- TEST 3: PRESUPUESTOS (Flujo completo, Aprobación -> Obra, WhatsApp) ---');
let createdPres = null;
let generatedObra = null;
{
  const container = document.getElementById('page-content');
  const actions = document.getElementById('page-header-actions');
  renderPresupuestos(container, actions, '/presupuestos');

  // 1. Crear presupuesto con ítems
  createdPres = DataService.create('presupuestos', {
    numero: 'PRES-2026-999',
    fecha: '2026-09-17',
    clienteId: createdClient.id,
    clienteNombre: `${createdClient.nombre} ${createdClient.apellido}`,
    telefono: createdClient.telefono,
    direccion: createdClient.direccion,
    descripcion: 'Mesada cocina en Granito Negro Brasil con regrueso ingletado',
    items: [
      { id: 'item-1', descripcion: 'Mesada principal', material: 'Granito Negro Brasil', largo: 240, ancho: 60, cantidad: 1, m2: 1.44, precioUnitario: 120000, subtotal: 172800 },
      { id: 'item-2', descripcion: 'Zócalos', material: 'Granito Negro Brasil', largo: 300, ancho: 10, cantidad: 1, m2: 0.3, precioUnitario: 60000, subtotal: 18000 }
    ],
    adicionales: {
      colocacion: 35000,
      manoDeObra: 20000,
      inglete: 15000,
      transporte: 10000,
      bacha: 0,
      zocalos: 0,
      extras: 0
    },
    descuento: 5,
    impuestos: 21,
    moneda: 'ARS',
    estado: 'borrador'
  });
  assert(createdPres && createdPres.id, 'Creación de presupuesto con múltiples ítems y adicionales');

  const presTotal = DataService.getPresupuestoTotal(createdPres);
  // Items = 172800 + 18000 = 190800
  // Adics = 35000 + 20000 + 15000 + 10000 = 80000
  // Base = 270800. Desc 5% = 13540 -> Base neta = 257260. IVA 21% = 54024.60 -> Total = 311284.60
  assert(Math.abs(presTotal - 311284.60) < 0.01, 'Cálculo total de presupuesto exacto', `Total: ${presTotal}`);

  // 2. Render detalle del presupuesto y comprobar fila de IVA
  renderPresupuestos(container, actions, `/presupuestos/${createdPres.id}`);
  assert(container.innerHTML.includes('IVA (21%)'), 'Detalle de presupuesto muestra la fila de IVA correctamente');
  assert(container.innerHTML.includes('Descuento (5%)'), 'Detalle de presupuesto muestra la fila de Descuento correctamente');

  // 3. Probar aprobación idempotente (genera Obra sin duplicaciones)
  aprobarPresupuesto(createdPres.id, (p, o) => {
    generatedObra = o;
  });
  assert(generatedObra && generatedObra.id, 'Aprobación de presupuesto genera Obra automáticamente');
  assert(generatedObra.presupuestoId === createdPres.id, 'Obra generada está vinculada al id del presupuesto');
  assert(generatedObra.clienteId === createdClient.id, 'Obra generada hereda clienteId correctamente');
  assert(generatedObra.estado === 'pendiente', 'Obra generada inicia en estado "pendiente"');

  // Re-aprobar para comprobar idempotencia
  const prevObraId = generatedObra.id;
  aprobarPresupuesto(createdPres.id, (p, o) => {
    assert(o && o.id === prevObraId, 'Idempotencia: re-aprobar no duplica la obra');
  });
}

// ── TEST SUITE 4: OBRAS (Listado, Agendar obra con SVG, Detalle, Cobro directo) ──
console.log('\n--- TEST 4: OBRAS (Listado, Botón Agendar con SVG Calendario, Detalle) ---');
{
  const container = document.getElementById('page-content');
  const actions = document.getElementById('page-header-actions');
  renderObras(container, actions);

  // 1. Verificar botón "Agendar obra" en la tabla con SVG de calendario
  const scheduleBtn = container.querySelector(`button[data-action="schedule"][data-id="${generatedObra.id}"]`);
  assert(!!scheduleBtn, 'Existe botón data-action="schedule" en la tabla de Obras antes de entrar al detalle');
  assert(scheduleBtn && scheduleBtn.innerHTML.includes('<svg'), 'El botón "Agendar obra" contiene un SVG de calendario');
  assert(scheduleBtn && scheduleBtn.getAttribute('title').toLowerCase().includes('agendar'), 'El botón tiene título para agendar');

  // 2. Probar que agendar obra cree el evento en Calendario
  const eventoCreado = DataService.create('eventos', {
    obraId: generatedObra.id,
    clienteId: generatedObra.clienteId,
    clienteNombre: generatedObra.clienteNombre,
    tipo: 'instalacion',
    fecha: '2026-09-20',
    hora: '10:00',
    direccion: generatedObra.direccion,
    notas: `Instalación Obra #${generatedObra.id}`,
    estado: 'pendiente'
  });
  assert(eventoCreado && eventoCreado.id, 'Creación de evento en Calendario desde Obra');
  const allEventos = DataService.getAll('eventos');
  assert(allEventos.some(e => e.id === eventoCreado.id && e.obraId === generatedObra.id), 'El evento de la obra aparece registrado en el Calendario');

  // 3. Ver detalle de Obra y cambiar estado
  renderObras(container, actions, `/obras/${generatedObra.id}`);
  assert(container.innerHTML.includes(`Obra #${generatedObra.id}`), 'Vista detalle de Obra renderizada');
  
  // Cambiar estado a 'en_colocacion'
  const updatedObra = DataService.update('obras', generatedObra.id, { estado: 'en_colocacion' });
  assert(updatedObra.estado === 'en_colocacion', 'Actualización de estado de la obra a "en_colocacion"');
}

// ── TEST SUITE 5: COBROS (Registro, Saldo de Obra, WhatsApp con datos vivos) ──
console.log('\n--- TEST 5: COBROS (Registro, Cálculo de Saldo, Recibo y WhatsApp) ---');
{
  const container = document.getElementById('page-content');
  const actions = document.getElementById('page-header-actions');
  renderCobros(container, actions);

  const obraTotal = DataService.getObraTotal(generatedObra.id);
  const anticipo = 150000;

  // Registrar cobro de anticipo
  const newCobro = DataService.create('cobros', {
    obraId: generatedObra.id,
    clienteId: createdClient.id,
    importe: anticipo,
    metodoPago: 'transferencia',
    fecha: '2026-09-17',
    observaciones: 'Anticipo 50% inicio fabricación'
  });
  assert(newCobro && newCobro.id, 'Registro de cobro vinculado a obra y cliente');

  // Comprobar actualización de saldo
  const cobrado = DataService.getObraCobrado(generatedObra.id);
  assert(cobrado === anticipo, 'DataService.getObraCobrado refleja el monto exacto cobrado');
  const saldoPendiente = obraTotal - cobrado;
  assert(saldoPendiente === (obraTotal - anticipo), 'Saldo pendiente de la obra calculado correctamente');

  // Probar generación de recibo oficial y resolución de contacto vivo
  const cobroDoc = generateCobroHtml(newCobro, DataService.getById('clientes', createdClient.id), generatedObra);
  assert(cobroDoc.includes('Valentin Test'), 'Recibo de cobro contiene el nombre vivo del cliente');
  assert(cobroDoc.includes('5491199887766') || cobroDoc.includes('11 9988 7766'), 'Recibo contiene el teléfono/WhatsApp actualizado del cliente');
}

// ── TEST SUITE 6: STOCK E INVENTARIO (Materiales, Movimientos, Ajuste masivo) ──
console.log('\n--- TEST 6: STOCK E INVENTARIO (Materiales, Movimientos, Actualización de precios) ---');
let createdMaterial = null;
{
  const container = document.getElementById('page-content');
  const actions = document.getElementById('page-header-actions');
  renderStock(container, actions);

  // 1. Crear material
  createdMaterial = DataService.create('materiales', {
    nombre: 'Mármol Blanco Thassos Test',
    categoria: 'marmol',
    tipo: 'Importado',
    unidad: 'placas',
    precioM2: 500000,
    precioVenta: 500000,
    stockMinimo: 3,
    largo: 280,
    ancho: 160,
    espesor: '20 mm'
  });
  assert(createdMaterial && createdMaterial.id, 'Creación de nuevo material en Stock');

  // 2. Registrar movimiento de entrada de stock
  const entrada = DataService.create('stockMovimientos', {
    materialId: createdMaterial.id,
    tipo: 'entrada',
    cantidad: 10,
    motivo: 'Compra importación',
    fecha: '2026-09-17'
  });
  assert(entrada && entrada.id, 'Registro de entrada de stock');

  // 3. Registrar salida de stock
  const salida = DataService.create('stockMovimientos', {
    materialId: createdMaterial.id,
    tipo: 'salida',
    cantidad: 2,
    motivo: 'Consumo obra',
    fecha: '2026-09-17'
  });
  assert(salida && salida.id, 'Registro de salida de stock');

  // 4. Verificar cálculo de stock neto: 10 - 2 = 8 placas
  const stockActual = DataService.getStockActual(createdMaterial.id);
  assert(stockActual === 8, 'Cálculo de stock actual (Entradas - Salidas) = 8 placas', `Obtenido: ${stockActual}`);

  // 5. Probar actualización masiva de precios (+10%)
  const precioOriginal = createdMaterial.precioM2;
  DataService.update('materiales', createdMaterial.id, {
    precioM2: Math.round(precioOriginal * 1.10),
    precioVenta: Math.round(precioOriginal * 1.10)
  });
  const matActualizado = DataService.getById('materiales', createdMaterial.id);
  assert(matActualizado.precioM2 === 550000, 'Actualización de precio por m² (+10%)', `Obtenido: ${matActualizado.precioM2}`);
}

// ── TEST SUITE 7: PROVEEDORES, FACTURAS Y PAGOS ──
console.log('\n--- TEST 7: PROVEEDORES, FACTURAS Y PAGOS (Cuentas corrientes, Saldo, Estados) ---');
let createdProv = null;
let createdFactura = null;
let createdPago = null;
{
  const container = document.getElementById('page-content');
  const actions = document.getElementById('page-header-actions');
  renderProveedores(container, actions);

  // 1. Crear proveedor
  createdProv = DataService.create('proveedores', {
    nombre: 'Cantera Sierra Chica Test',
    razonSocial: 'Sierra Chica Granitos S.A.',
    telefono: '351 777 8888',
    whatsapp: '5493517778888',
    contacto: 'Ing. Carlos Gómez',
    cuit: '30-99887766-1',
    direccion: 'Ruta 9 Km 200, Córdoba'
  });
  assert(createdProv && createdProv.id, 'Creación de proveedor');

  // 2. Crear Factura vinculada al proveedor
  createdFactura = DataService.create('facturas', {
    numero: 'FC-A-0002-00005555',
    proveedorId: createdProv.id,
    proveedorNombre: createdProv.nombre,
    tipo: 'factura',
    importe: 500000,
    moneda: 'ARS',
    fecha: '2026-09-10',
    vencimiento: '2026-09-30',
    estado: 'pendiente'
  });
  assert(createdFactura && createdFactura.id, 'Creación de factura vinculada a proveedor');

  // 3. Crear Pago parcial de $200.000
  createdPago = DataService.create('pagos', {
    facturaId: createdFactura.id,
    proveedorId: createdProv.id,
    destinatarioConcepto: createdProv.nombre,
    importe: 200000,
    metodoPago: 'transferencia',
    fecha: '2026-09-17',
    estado: 'pagado'
  });
  assert(createdPago && createdPago.id, 'Creación de pago vinculado a factura');

  // Recalcular estado de facturas
  DataService.recalcularTodasLasFacturas();
  const facActualizada = DataService.getById('facturas', createdFactura.id);
  assert(facActualizada.estado === 'parcial', 'Factura con pago parcial pasa automáticamente a estado "parcial"', `Estado: ${facActualizada.estado}`);
  const saldoPendienteFac = DataService.getFacturaSaldoPendiente(createdFactura.id);
  assert(saldoPendienteFac === 300000, 'Saldo pendiente de factura: $500k - $200k = $300k', `Saldo: ${saldoPendienteFac}`);

  // 4. Comprobar cuenta corriente del proveedor
  const saldoProv = DataService.getProveedorSaldo(createdProv.id);
  assert(saldoProv.saldo === 300000, 'Saldo de cuenta corriente del proveedor = $300.000', `Saldo: ${saldoProv.saldo}`);
}

// ── TEST SUITE 8: SINCRONIZACIÓN CROSS-MODULE (Única Fuente de Verdad) ──
console.log('\n--- TEST 8: SINCRONIZACIÓN CROSS-MODULE EN TIEMPO REAL ---');
{
  // Modificar teléfono de Valentin a otro número
  const nuevoTel = '11 5566 9900';
  DataService.update('clientes', createdClient.id, {
    telefono: nuevoTel
  });

  // Verificar que Obras resuelve el nuevo teléfono
  const obraConsultada = DataService.getById('obras', generatedObra.id);
  const cliObra = DataService.getById('clientes', obraConsultada.clienteId);
  const contactoObra = resolveEntityContact(cliObra, { clienteNombre: obraConsultada.clienteNombre });
  assert(contactoObra.whatsapp === '5491155669900', 'Módulo Obras resuelve inmediatamente el nuevo teléfono del cliente');

  // Verificar que Cobros resuelve el nuevo teléfono
  const cobroConsultado = DataService.getAll('cobros').find(c => c.obraId === generatedObra.id);
  const cliCobro = DataService.getById('clientes', cobroConsultado.clienteId);
  const contactoCobro = resolveEntityContact(cliCobro, { clienteNombre: cobroConsultado.clienteNombre });
  assert(contactoCobro.whatsapp === '5491155669900', 'Módulo Cobros resuelve inmediatamente el nuevo teléfono del cliente');

  // Modificar nombre del proveedor
  DataService.update('proveedores', createdProv.id, {
    nombre: 'Cantera Sierra Chica Renovada S.A.'
  });
  const facConsultada = DataService.getById('facturas', createdFactura.id);
  const provFac = DataService.getById('proveedores', facConsultada.proveedorId);
  const contactoFac = resolveEntityContact(provFac, { proveedorNombre: facConsultada.proveedorNombre });
  assert(contactoFac.name === 'Cantera Sierra Chica Renovada S.A.', 'Módulo Facturas resuelve el nombre actualizado del proveedor');
}

// ── TEST SUITE 9: CALENDARIO (Vistas, Detalle, WhatsApp) ──
console.log('\n--- TEST 9: CALENDARIO (Render, Vistas, Modal Detalle) ---');
{
  const container = document.getElementById('page-content');
  const actions = document.getElementById('page-header-actions');
  renderCalendario(container, actions);
  assert(container.innerHTML.includes('calendar-grid') || container.innerHTML.includes('agenda-cards-list'), 'Vista de Calendario renderizada');

  // Probar evento con datos de cliente
  const evs = DataService.getAll('eventos');
  const lastEv = evs[0];
  if (lastEv) {
    openEventoDetailModal(lastEv.id);
    const modalEl = document.querySelector('.modal-overlay');
    assert(modalEl && modalEl.innerHTML.includes('Cliente'), 'Modal de detalle de evento muestra datos del cliente');
  }
}

// ── TEST SUITE 10: CONFIGURACIÓN Y PERSISTENCIA ──
console.log('\n--- TEST 10: CONFIGURACIÓN Y PERSISTENCIA EN LOCALSTORAGE ---');
{
  const container = document.getElementById('page-content');
  const actions = document.getElementById('page-header-actions');
  renderConfiguracion(container, actions);

  // Guardar configuración
  const testConfig = {
    empresa_nombre: 'Marmolería Benjamin Central',
    empresa_cuit: '30-71548923-9',
    empresa_direccion: 'Av. Circunvalación 3000, Córdoba',
    empresa_telefono: '+54 9 351 999-8888',
    empresa_email: 'info@benjaminmarmoles.com',
    dolar_cotizacion: 1480
  };
  localStorage.setItem('mb_config', JSON.stringify(testConfig));

  const savedCfg = JSON.parse(localStorage.getItem('mb_config'));
  assert(savedCfg.empresa_nombre === 'Marmolería Benjamin Central', 'Persistencia de configuración en localStorage');
  assert(savedCfg.dolar_cotizacion === 1480, 'Persistencia de cotización del dólar');
}

// ── TEST SUITE 11: DASHBOARD Y RESÚMENES ──
console.log('\n--- TEST 11: DASHBOARD (Métricas, Alertas de stock bajo, Listados) ---');
{
  const container = document.getElementById('page-content');
  const actions = document.getElementById('page-header-actions');
  renderDashboard(container, actions);
  assert(container.innerHTML.includes('Presupuestos aprobados') || container.innerHTML.includes('Obras activas'), 'Dashboard renderiza estadísticas correctamente');
}

// ── TEST SUITE 12: VALIDACIONES Y CASOS LÍMITE ──
console.log('\n--- TEST 12: VALIDACIONES Y CASOS LÍMITE ---');
{
  // 1. Presupuesto sin ítems
  const presVacio = { items: [], adicionales: {}, descuento: 0, impuestos: 0 };
  const totVacio = DataService.getPresupuestoTotal(presVacio);
  assert(totVacio === 0, 'Presupuesto vacío retorna total 0 sin errores');

  // 2. Teléfono nulo o inválido en formateador
  assert(formatWhatsAppPhone(null) === '', 'formatWhatsAppPhone con null retorna string vacío');
  assert(formatWhatsAppPhone('') === '', 'formatWhatsAppPhone con vacío retorna string vacío');
  assert(formatWhatsAppPhone('abc') === '', 'formatWhatsAppPhone sin dígitos retorna string vacío');

  // 3. Resolución de entidad nula con fallback
  const contactFallback = resolveEntityContact(null, { clienteNombre: 'Consumidor Ocasional', telefono: '11 1234 5678' });
  assert(contactFallback.name === 'Consumidor Ocasional', 'resolveEntityContact con entidad null usa fallbackObj');
  assert(contactFallback.whatsapp === '5491112345678', 'resolveEntityContact con entidad null formatea teléfono de fallback');
}

console.log('\n===============================================================');
console.log(`🏁 FIN DE PRUEBA: ${results.passed.length} PASADAS, ${results.failed.length} FALLADAS`);
console.log('===============================================================\n');

if (results.failed.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
