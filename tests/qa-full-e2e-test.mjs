import { JSDOM } from 'jsdom';

// ── Setup Browser Environment in Node ──
const dom = new JSDOM(`<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body>
  <div id="app">
    <div id="page-title"></div>
    <div id="page-header-actions"></div>
    <div id="page-content"></div>
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
global.localStorage = window.localStorage;
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
window.requestAnimationFrame = global.requestAnimationFrame;
window.cancelAnimationFrame = global.cancelAnimationFrame;

// Import app modules
const { DataService } = await import('../frontend/js/services/mockData.js');
const { formatCurrency, formatDate } = await import('../frontend/js/utils/helpers.js');
const { generatePresupuestoHtml, generateObraHtml, generateCobroHtml } = await import('../frontend/js/services/documentExporter.js');
const { renderPresupuestos, openPresupuestoForm, aprobarPresupuesto } = await import('../frontend/js/pages/presupuestos.js');
const { renderClientes, openClienteForm } = await import('../frontend/js/pages/clientes.js');
const { renderObras, openObraForm } = await import('../frontend/js/pages/obras.js');
const { renderStock, openMaterialForm, openMovimientoForm } = await import('../frontend/js/pages/stock.js');
const { renderProveedores, openProveedorForm } = await import('../frontend/js/pages/proveedores.js');
const { renderFacturas } = await import('../frontend/js/pages/facturas.js');
const { renderPagos } = await import('../frontend/js/pages/pagos.js');
const { renderCobros } = await import('../frontend/js/pages/cobros.js');
const { renderCalendario, openEventoForm } = await import('../frontend/js/pages/calendario.js');
const { renderDashboard } = await import('../frontend/js/pages/dashboard.js');
const { Drawer } = await import('../frontend/js/components/drawer.js');

const qaResults = {
  sections: {},
  passed: 0,
  failed: 0,
  log(section, name, pass, details = '') {
    if (!this.sections[section]) this.sections[section] = [];
    this.sections[section].push({ name, pass, details });
    if (pass) {
      this.passed++;
      console.log(`  ✅ [${section}] ${name}`);
    } else {
      this.failed++;
      console.error(`  ❌ [${section}] ${name} — ${details}`);
    }
  }
};

console.log('\n===============================================================');
console.log('🕵️‍♂️ REPORTE DE QA END-TO-END — MARMOLERÍA BENJAMÍN');
console.log('===============================================================\n');

// ── 1. DASHBOARD ──
{
  const container = document.getElementById('page-content');
  const actions = document.getElementById('page-header-actions');
  renderDashboard(container, actions);

  const stats = DataService.getDashboardStats();
  qaResults.log('Dashboard', 'Métricas de dashboard calculadas correctamente', typeof stats === 'object');
  qaResults.log('Dashboard', 'Total presupuestos calculado', stats.presupuestosPendientes >= 0 && stats.presupuestosAprobados >= 0);
  qaResults.log('Dashboard', 'Obras activas calculadas', stats.obrasActivas >= 0);
  qaResults.log('Dashboard', 'Saldo por cobrar calculado', stats.totalPorCobrar >= 0);
}

// ── 2. CLIENTES (ALTA, CONDICIÓN ESPECIAL Y FICHA) ──
let testClient = null;
{
  const container = document.getElementById('page-content');
  const actions = document.getElementById('page-header-actions');
  renderClientes(container, actions);

  // Crear nuevo cliente con condición especial 12%
  testClient = DataService.create('clientes', {
    nombre: 'Luciano',
    apellido: 'QA Tester',
    telefono: '11-3344-5566',
    email: 'luciano.qa@test.com',
    direccion: 'Av. Libertador 5000, CABA',
    cuit: '20-33445566-9',
    condicionComercial: 'especial',
    descuentoHabitual: 12,
    motivoCondicion: 'Cliente VIP QA'
  });

  qaResults.log('Clientes', 'Cliente creado en DataService con ID ' + testClient.id, !!testClient.id);
  qaResults.log('Clientes', 'Condición comercial guardada como "especial"', testClient.condicionComercial === 'especial');
  qaResults.log('Clientes', 'Descuento habitual guardado en 12%', testClient.descuentoHabitual === 12);
  qaResults.log('Clientes', 'Motivo de condición guardado: "Cliente VIP QA"', testClient.motivoCondicion === 'Cliente VIP QA');

  // Re-renderizar tabla de clientes y verificar badge
  renderClientes(container, actions);
  const tableHtml = container.innerHTML;
  qaResults.log('Clientes', 'Cliente visible en la tabla de clientes', tableHtml.includes('Luciano') && tableHtml.includes('QA Tester'));
  qaResults.log('Clientes', 'Badge de condición especial visible en la tabla con "12%"', tableHtml.includes('Especial (12%)'));

  // Detalle del cliente
  renderClientes(container, actions, `/clientes/${testClient.id}`);
  const detailHtml = container.innerHTML;
  qaResults.log('Clientes', 'Ficha de cliente muestra condición especial en cabecera', detailHtml.includes('Condición Especial (12% desc.)'));
  qaResults.log('Clientes', 'Ficha de datos incluye condición y motivo "Cliente VIP QA"', detailHtml.includes('Cliente VIP QA'));
}

// ── 3. PRESUPUESTOS (AUTO-DETECCIÓN, CÁLCULOS, CONDICIONES, APROBACIÓN) ──
let approvedPres = null;
let generatedObra = null;
{
  // Abrir formulario
  openPresupuestoForm();
  const drawerEl = document.querySelector('.drawer') || document.body;
  qaResults.log('Presupuestos', 'Drawer de nuevo presupuesto abierto', !!drawerEl);

  const cliSelect = drawerEl.querySelector('#pres-cliente-select');
  const banner = drawerEl.querySelector('#cliente-condicion-banner');
  const condSelect = drawerEl.querySelector('#pres-condicion-tipo-select');
  const condPctInput = drawerEl.querySelector('#pres-condicion-porcentaje-input');

  // Simular selección de cliente con condición especial
  if (cliSelect) {
    cliSelect.value = testClient.id;
    cliSelect.dispatchEvent(new Event('change'));
  }

  qaResults.log('Presupuestos', 'Banner informativo de condición especial se muestra', banner && banner.style.display !== 'none');
  qaResults.log('Presupuestos', 'Banner indica descuento habitual del 12%', banner && banner.textContent.includes('12%'));
  qaResults.log('Presupuestos', 'Banner indica nota interna "Cliente VIP QA"', banner && banner.textContent.includes('Cliente VIP QA'));
  qaResults.log('Presupuestos', 'Condición precargada automáticamente a "descuento"', condSelect && condSelect.value === 'descuento');
  qaResults.log('Presupuestos', 'Porcentaje precargado automáticamente en 12%', condPctInput && Number(condPctInput.value) === 12);

  Drawer.close();

  // Test de cálculos matemáticos:
  // Item 1: Negro Brasil base $50.000 x 200x60 cm (1.2 m²) con 10% desc = $45.000/m² -> Subtotal: $54.000
  // Item 2: Mármol Carrara base $260.000 x 150x50 cm (0.75 m²) con 10% desc = $234.000/m² -> Subtotal: $175.500
  // Adicional colocación: $30.500 -> Subtotal general: $260.000
  // IVA 21%: $54.600 -> Total presupuesto: $314.600
  const presTest = DataService.create('presupuestos', {
    clienteId: testClient.id,
    clienteNombre: 'Luciano QA Tester',
    telefono: '11-3344-5566',
    direccion: 'Av. Libertador 5000, CABA',
    descripcion: 'Mesada cocina y vanitory QA',
    condicionTipo: 'descuento',
    condicionPorcentaje: 10,
    condicionNota: 'Cliente VIP QA',
    items: [
      { id: '1', descripcion: 'Mesada cocina', material: 'Negro Brasil', m2: 1.2, precioBase: 50000, precioUnitario: 45000, subtotal: 54000 },
      { id: '2', descripcion: 'Vanitory', material: 'Mármol Carrara', m2: 0.75, precioBase: 260000, precioUnitario: 234000, subtotal: 175500 }
    ],
    adicionales: { colocacion: 30500 },
    descuento: 0,
    impuestos: 21,
    moneda: 'ARS',
    estado: 'borrador'
  });

  const totalCalculado = DataService.getPresupuestoTotal(presTest);
  qaResults.log('Presupuestos', 'Subtotal ítem 1 (1.2 m² x $45.000 = $54.000)', presTest.items[0].subtotal === 54000);
  qaResults.log('Presupuestos', 'Subtotal ítem 2 (0.75 m² x $234.000 = $175.500)', presTest.items[1].subtotal === 175500);
  qaResults.log('Presupuestos', 'Total con adicionales ($30.500) e IVA 21% = $314.600 exactos', Math.abs(totalCalculado - 314600) < 0.01, `Obtenido: ${totalCalculado}`);

  // Test de PDF del presupuesto
  const pdfHtml = generatePresupuestoHtml(presTest, testClient, totalCalculado);
  qaResults.log('Presupuestos', 'PDF incluye precio aplicado de ítem 1 ($45.000)', pdfHtml.includes('45.000'));
  qaResults.log('Presupuestos', 'PDF incluye precio aplicado de ítem 2 ($234.000)', pdfHtml.includes('234.000'));
  qaResults.log('Presupuestos', 'PDF incluye total general ($314.600)', pdfHtml.includes('314.600'));
  qaResults.log('Presupuestos', 'PDF NO filtra ni exhibe nota interna "Cliente VIP QA"', !pdfHtml.includes('Cliente VIP QA'));
  qaResults.log('Presupuestos', 'PDF NO exhibe etiqueta "Cliente especial"', !pdfHtml.includes('Cliente especial'));

  // Aprobar presupuesto -> Debe crear Obra
  aprobarPresupuesto(presTest.id, (approved, obra) => {
    approvedPres = approved;
    generatedObra = obra;
  });

  qaResults.log('Presupuestos', 'Presupuesto pasa a estado "aprobado"', approvedPres && approvedPres.estado === 'aprobado');
  qaResults.log('Presupuestos', 'Obra generada automáticamente con id ' + (generatedObra?.id || ''), !!generatedObra);
  qaResults.log('Presupuestos', 'Obra inicia en estado "pendiente"', generatedObra && generatedObra.estado === 'pendiente');
  qaResults.log('Presupuestos', 'Obra hereda importe total congelado $314.600', generatedObra && generatedObra.importe === 314600);
}

// ── 4. OBRAS (ESTADOS Y CONGELAMIENTO) ──
{
  const container = document.getElementById('page-content');
  const actions = document.getElementById('page-header-actions');
  renderObras(container, actions);
  const obrasHtml = container.innerHTML;
  qaResults.log('Obras', 'La obra generada aparece en el listado de Obras', obrasHtml.includes(testClient.nombre) || obrasHtml.includes(generatedObra.id));

  // Actualizar estado de la obra
  DataService.update('obras', generatedObra.id, { estado: 'en_preparacion' });
  const obraActualizada = DataService.getById('obras', generatedObra.id);
  qaResults.log('Obras', 'Estado actualizado a "en_preparacion"', obraActualizada.estado === 'en_preparacion');
  qaResults.log('Obras', 'Importe de la obra se mantiene congelado tras cambio de estado', DataService.getObraTotal(generatedObra.id) === 314600);
}

// ── 5. COBROS Y SALDOS EN TIEMPO REAL ──
let testCobro = null;
{
  // Saldo inicial de la obra: $314.600
  const saldoAntes = DataService.getObraTotal(generatedObra.id) - DataService.getObraCobrado(generatedObra.id);
  qaResults.log('Cobros', 'Saldo pendiente inicial de la obra: $314.600', saldoAntes === 314600);

  // Registrar cobro de seña de $100.000
  testCobro = DataService.create('cobros', {
    obraId: generatedObra.id,
    clienteId: testClient.id,
    clienteNombre: `${testClient.nombre} ${testClient.apellido}`,
    importe: 100000,
    metodoPago: 'transferencia',
    fecha: '2026-09-20',
    estado: 'cobrado'
  });

  const cobradoObra = DataService.getObraCobrado(generatedObra.id);
  const saldoDespues = DataService.getObraTotal(generatedObra.id) - cobradoObra;
  qaResults.log('Cobros', 'Monto cobrado en obra actualizado a $100.000', cobradoObra === 100000);
  qaResults.log('Cobros', 'Saldo pendiente de la obra reducido a $214.600', saldoDespues === 214600);

  // Sincronización en la ficha del Cliente
  const clienteSaldo = DataService.getClienteSaldo(testClient.id);
  qaResults.log('Cobros -> Clientes', 'Saldo del cliente refleja obras por $314.600', clienteSaldo.totalObras === 314600);
  qaResults.log('Cobros -> Clientes', 'Saldo del cliente refleja cobrado $100.000', clienteSaldo.totalCobrado === 100000);
  qaResults.log('Cobros -> Clientes', 'Saldo pendiente del cliente calculado en $214.600', clienteSaldo.saldo === 214600);
}

// ── 6. SINCRONIZACIÓN REACTIVA DE CONTACTO (CLIENTE -> OBRAS Y COBROS) ──
{
  // Editar teléfono y dirección del cliente
  const nuevoTelefono = '11-9988-1122';
  const nuevaDireccion = 'Calle 50 Nº 1200, La Plata';
  DataService.update('clientes', testClient.id, {
    telefono: nuevoTelefono,
    direccion: nuevaDireccion
  });

  const obraSincronizada = DataService.getById('obras', generatedObra.id);
  qaResults.log('Sync Cross-Module', 'Teléfono de la obra sincronizado en vivo', obraSincronizada.telefono === nuevoTelefono);
  qaResults.log('Sync Cross-Module', 'Dirección de la obra sincronizada en vivo', obraSincronizada.direccion === nuevaDireccion);

  const presSincronizado = DataService.getById('presupuestos', approvedPres.id);
  qaResults.log('Sync Cross-Module', 'Teléfono del presupuesto sincronizado en vivo', presSincronizado.telefono === nuevoTelefono);
  qaResults.log('Sync Cross-Module', 'Precios e importes del presupuesto permanecen inmutables', DataService.getPresupuestoTotal(presSincronizado) === 314600);
}

// ── 7. STOCK E INVENTARIO (MOVIMIENTOS Y CÁLCULOS) ──
{
  const matTest = DataService.create('materiales', {
    nombre: 'Cuarzo Smoke Gray',
    categoria: 'cuarzo',
    tipo: 'Importado',
    precioM2: 120000,
    precioVenta: 120000,
    stockMinimo: 5
  });

  // Entrada inicial de 20 m2
  DataService.create('stockMovimientos', {
    materialId: matTest.id,
    tipo: 'entrada',
    cantidad: 20,
    fecha: '2026-09-20',
    referencia: 'Compra importación'
  });

  // Salida de 6 m2
  DataService.create('stockMovimientos', {
    materialId: matTest.id,
    tipo: 'salida',
    cantidad: 6,
    fecha: '2026-09-20',
    referencia: 'Corte mesada'
  });

  const stockActual = DataService.getStockActual(matTest.id);
  qaResults.log('Stock', 'Cálculo de stock actual (20 entradas - 6 salidas = 14)', stockActual === 14);

  // Modificar precio de catálogo para probar que no afecta presupuestos existentes
  DataService.update('materiales', matTest.id, { precioM2: 150000 });
  const presVerif = DataService.getById('presupuestos', approvedPres.id);
  qaResults.log('Stock -> Presupuestos', 'Presupuestos históricos inmunes a cambios de precio en Stock', DataService.getPresupuestoTotal(presVerif) === 314600);
}

// ── 8. PROVEEDORES, FACTURAS Y PAGOS ──
{
  const prov = DataService.create('proveedores', {
    nombre: 'Canteras del Sur',
    telefono: '11-4455-6677',
    email: 'contacto@canterasdelsur.com'
  });

  // Factura de compra $500.000
  const fac = DataService.create('facturas', {
    proveedorId: prov.id,
    tipo: 'factura',
    numero: 'A-0001-99887766',
    fecha: '2026-09-10',
    importe: 500000,
    estado: 'pendiente'
  });

  // Pago parcial $200.000
  DataService.create('pagos', {
    proveedorId: prov.id,
    facturaId: fac.id,
    importe: 200000,
    metodoPago: 'transferencia',
    estado: 'pagado',
    fecha: '2026-09-15'
  });

  const facActualizada = DataService.getById('facturas', fac.id);
  qaResults.log('Facturas / Pagos', 'Factura pasa automáticamente a estado "parcial"', facActualizada.estado === 'parcial');
  const provSaldo = DataService.getProveedorSaldo(prov.id);
  qaResults.log('Facturas / Pagos', 'Saldo de cuenta corriente del proveedor ($500k - $200k = $300k)', provSaldo.saldo === 300000);
}

// ── 9. CALENDARIO Y AGENDAMIENTO VINCULADO ──
{
  const ev = DataService.create('eventos', {
    clienteId: testClient.id,
    obraId: generatedObra.id,
    tipo: 'colocacion',
    fecha: '2026-09-25',
    hora: '09:00',
    descripcion: 'Instalación de mesada en cocina',
    estado: 'pendiente'
  });

  const eventosCliente = DataService.getEventosCliente(testClient.id);
  qaResults.log('Calendario', 'Evento agendado aparece en la agenda del cliente', eventosCliente.some(e => e.id === ev.id));
}

console.log('\n===============================================================');
console.log(`🏁 FIN DE QA END-TO-END: ${qaResults.passed} PASADAS, ${qaResults.failed} FALLADAS`);
console.log('===============================================================\n');

if (qaResults.failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
