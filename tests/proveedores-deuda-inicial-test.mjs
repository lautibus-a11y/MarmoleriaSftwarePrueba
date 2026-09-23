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
  </div>
  <div id="drawer-container"></div>
  <div id="modal-container"></div>
  <div id="toast-container"></div>
</body>
</html>`, {
  url: 'http://localhost:3000/#/proveedores',
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
const { renderProveedores, openProveedorForm } = await import('../frontend/js/pages/proveedores.js');
const { renderPagos } = await import('../frontend/js/pages/pagos.js');
const { renderFacturas } = await import('../frontend/js/pages/facturas.js');
const { Drawer } = await import('../frontend/js/components/drawer.js');

const results = {
  passed: [],
  failed: []
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
console.log('💎 SUITE DE PRUEBAS: DEUDA INICIAL EN PROVEEDORES');
console.log('===============================================================\n');

// Limpiar datos para entorno controlado de pruebas
localStorage.clear();

// ── PRUEBA 1: PROVEEDOR NUEVO ──
console.log('--- PRUEBA 1: PROVEEDOR NUEVO (Deuda Inicial $500.000, 0 facturas, 0 pagos) ---');
let prov1 = DataService.create('proveedores', {
  nombre: 'Mármol SA',
  cuit: '30-11223344-5',
  telefono: '11-4455-6677',
  deudaInicial: 500000
});

assert(prov1.id, 'Proveedor creado con ID asignado');
assert(prov1.deudaInicial === 500000, `Deuda inicial guardada correctamente ($500.000). Obtenido: ${prov1.deudaInicial}`);

let saldo1 = DataService.getProveedorSaldo(prov1.id);
assert(saldo1.deudaInicial === 500000, 'Objeto de saldo incluye campo deudaInicial = $500.000');
assert(saldo1.totalFacturas === 0, 'Total facturas es $0');
assert(saldo1.totalPagos === 0, 'Total pagos es $0');
assert(saldo1.saldo === 500000, `Saldo actual esperado: $500.000. Obtenido: ${saldo1.saldo}`);

// ── PRUEBA 2: DEUDA INICIAL + FACTURA ──
console.log('\n--- PRUEBA 2: DEUDA INICIAL $500.000 + FACTURA $300.000 ---');
const fac1 = DataService.create('facturas', {
  proveedorId: prov1.id,
  proveedorNombre: prov1.nombre,
  tipo: 'factura',
  numero: 'FC-A-0001-00000001',
  fecha: '2026-09-22',
  importe: 300000,
  estado: 'pendiente'
});

let saldo2 = DataService.getProveedorSaldo(prov1.id);
assert(saldo2.deudaInicial === 500000, 'Deuda inicial permanece en $500.000');
assert(saldo2.totalFacturas === 300000, 'Total facturas refleja $300.000');
assert(saldo2.totalPagos === 0, 'Total pagos permanece en $0');
assert(saldo2.saldo === 800000, `Saldo actual esperado: $800.000 ($500k + $300k). Obtenido: ${saldo2.saldo}`);

// ── PRUEBA 3: DEUDA INICIAL + FACTURA + PAGO ──
console.log('\n--- PRUEBA 3: DEUDA INICIAL $500.000 + FACTURA $300.000 - PAGO $200.000 ---');
const pago1 = DataService.create('pagos', {
  proveedorId: prov1.id,
  facturaId: fac1.id,
  destinatarioConcepto: prov1.nombre,
  fecha: '2026-09-22',
  importe: 200000,
  metodoPago: 'transferencia',
  estado: 'pagado'
});

let saldo3 = DataService.getProveedorSaldo(prov1.id);
assert(saldo3.deudaInicial === 500000, 'Deuda inicial permanece en $500.000');
assert(saldo3.totalFacturas === 300000, 'Total facturas es $300.000');
assert(saldo3.totalPagos === 200000, 'Total pagos refleja $200.000');
assert(saldo3.saldo === 600000, `Saldo actual esperado: $600.000 ($500k + $300k - $200k). Obtenido: ${saldo3.saldo}`);

// ── PRUEBA 4: PROVEEDOR EXISTENTE CARGADO ANTES ──
console.log('\n--- PRUEBA 4: PROVEEDOR EXISTENTE (Sin deuda previa, luego se le agrega $150.000) ---');
// Simular proveedor antiguo que no tenía el atributo deudaInicial
let provExistente = DataService.create('proveedores', {
  nombre: 'Cantera El Peñón',
  cuit: '30-99887766-3'
  // Sin deudaInicial explícita
});

assert(provExistente.deudaInicial === 0, 'Proveedor sin deudaInicial hereda default 0');

// Cargar facturas existentes por $300.000 y pagos por $100.000
const totalFacturasAntes = DataService.getAll('facturas').length;
const totalPagosAntes = DataService.getAll('pagos').length;

const facExistente = DataService.create('facturas', {
  proveedorId: provExistente.id,
  proveedorNombre: provExistente.nombre,
  tipo: 'factura',
  numero: 'FC-A-0002-00000045',
  fecha: '2026-09-20',
  importe: 300000,
  estado: 'pendiente'
});

const pagoExistente = DataService.create('pagos', {
  proveedorId: provExistente.id,
  facturaId: facExistente.id,
  destinatarioConcepto: provExistente.nombre,
  fecha: '2026-09-21',
  importe: 100000,
  metodoPago: 'transferencia',
  estado: 'pagado'
});

let saldoExistente1 = DataService.getProveedorSaldo(provExistente.id);
assert(saldoExistente1.saldo === 200000, `Saldo inicial de proveedor existente es $200.000 ($300k - $100k). Obtenido: ${saldoExistente1.saldo}`);

// Posteriormente el usuario edita el proveedor y le carga deuda inicial = $150.000
const countFacturasPreEdit = DataService.getAll('facturas').length;
const countPagosPreEdit = DataService.getAll('pagos').length;

provExistente = DataService.update('proveedores', provExistente.id, {
  deudaInicial: 150000
});

assert(provExistente.deudaInicial === 150000, 'Deuda inicial del proveedor existente actualizada a $150.000');

let saldoExistente2 = DataService.getProveedorSaldo(provExistente.id);
assert(saldoExistente2.saldo === 350000, `Nuevo saldo recalculado exacto: $350.000 ($150k + $300k - $100k). Obtenido: ${saldoExistente2.saldo}`);

// Comprobar que NO se crearon facturas ni pagos ficticios
const countFacturasPostEdit = DataService.getAll('facturas').length;
const countPagosPostEdit = DataService.getAll('pagos').length;
assert(countFacturasPostEdit === countFacturasPreEdit, 'NO se crearon facturas ficticias al editar deuda inicial');
assert(countPagosPostEdit === countPagosPreEdit, 'NO se crearon pagos ficticios al editar deuda inicial');

// ── PRUEBA 5: MODIFICAR DEUDA INICIAL DE $150.000 A $200.000 ──
console.log('\n--- PRUEBA 5: MODIFICAR DEUDA INICIAL ($150.000 -> $200.000, saldo aumenta $50.000) ---');
const saldoAntesMod = DataService.getProveedorSaldo(provExistente.id).saldo;

provExistente = DataService.update('proveedores', provExistente.id, {
  deudaInicial: 200000
});

assert(provExistente.deudaInicial === 200000, 'Deuda inicial modificada a $200.000');
let saldoExistente3 = DataService.getProveedorSaldo(provExistente.id);
assert(saldoExistente3.saldo === 400000, `Saldo recalculado es $400.000 ($200k + $300k - $100k). Obtenido: ${saldoExistente3.saldo}`);
assert(saldoExistente3.saldo - saldoAntesMod === 50000, 'El saldo aumentó exactamente en $50.000');

// Verificar nuevamente que no aparecieron movimientos ficticios
assert(DataService.getAll('facturas').length === countFacturasPostEdit, 'Sigue sin haber facturas ficticias');
assert(DataService.getAll('pagos').length === countPagosPostEdit, 'Sigue sin haber pagos ficticios');

// ── PRUEBA 6: VOLVER A CERO ($0) ──
console.log('\n--- PRUEBA 6: VOLVER A CERO ($0) ---');
provExistente = DataService.update('proveedores', provExistente.id, {
  deudaInicial: 0
});

assert(provExistente.deudaInicial === 0, 'Deuda inicial restablecida a $0');
let saldoExistente4 = DataService.getProveedorSaldo(provExistente.id);
assert(saldoExistente4.saldo === 200000, `Saldo recalculado únicamente con facturas y pagos: $200.000. Obtenido: ${saldoExistente4.saldo}`);

// ── PRUEBA 7: VALIDACIÓN Y ROBUSTEZ ──
console.log('\n--- PRUEBA 7: VALIDACIONES, VALORES NULOS, STRINGS Y NEGATIVOS ---');
// String numérico "350000"
let provStr = DataService.create('proveedores', {
  nombre: 'Granitos Córdoba',
  deudaInicial: '350000'
});
assert(provStr.deudaInicial === 350000, `String "350000" parseado a número 350000. Obtenido: ${typeof provStr.deudaInicial} ${provStr.deudaInicial}`);

// String vacío ""
let provVacio = DataService.create('proveedores', {
  nombre: 'Piedras del Sur',
  deudaInicial: ''
});
assert(provVacio.deudaInicial === 0, 'String vacío en deudaInicial guardado como 0');

// Valor null
let provNull = DataService.create('proveedores', {
  nombre: 'Mármoles del Valle',
  deudaInicial: null
});
assert(provNull.deudaInicial === 0, 'Valor null en deudaInicial guardado como 0');

// Valor negativo (debe protegerse a 0)
let provNeg = DataService.create('proveedores', {
  nombre: 'Importadora Andina',
  deudaInicial: -50000
});
assert(provNeg.deudaInicial === 0, 'Valor negativo en deudaInicial protegido y normalizado a 0');

// ── PRUEBA 8: DASHBOARD TOTAL POR PAGAR ──
console.log('\n--- PRUEBA 8: DASHBOARD TOTAL POR PAGAR CENTRALIZADO ---');
// Calcular sumatoria manual esperada de todos los saldos de proveedores
const allProvs = DataService.getAll('proveedores');
const sumaEsperada = allProvs.reduce((sum, p) => sum + DataService.getProveedorSaldo(p.id).saldo, 0);

const dashStats = DataService.getDashboardStats();
assert(dashStats.totalPorPagar === sumaEsperada, `Dashboard totalPorPagar ($${dashStats.totalPorPagar}) coincide exactamente con la suma de saldos ($${sumaEsperada})`);

// ── PRUEBA 9: UI INTERACTIVA (DRAWER Y DETALLE EN DOM) ──
console.log('\n--- PRUEBA 9: VERIFICACIÓN VISUAL EN DOM (Drawer, Formularios y Detalle) ---');
// 1. Abrir formulario de nuevo proveedor
openProveedorForm();
const inputDeudaNueva = document.querySelector('#prov-deuda-inicial');
assert(!!inputDeudaNueva, 'Input #prov-deuda-inicial presente en formulario de nuevo proveedor');
assert(inputDeudaNueva.value === '', 'Input de nuevo proveedor inicia vacío');
Drawer.close();

// 2. Abrir formulario de edición para prov1 (deudaInicial = 500000)
openProveedorForm(prov1.id);
const inputDeudaEdit = document.querySelector('#prov-deuda-inicial');
assert(!!inputDeudaEdit, 'Input #prov-deuda-inicial presente en formulario de edición');
assert(inputDeudaEdit.value === '500000', `Input de edición precarga la deuda inicial existente ($500.000). Obtenido: ${inputDeudaEdit.value}`);
Drawer.close();

// 3. Renderizar vista de detalle del proveedor
const pageContent = document.getElementById('page-content');
const pageActions = document.getElementById('page-header-actions');
renderProveedores(pageContent, pageActions, `#/proveedores/${prov1.id}`);

const summaryItems = pageContent.querySelectorAll('.cc-summary-item');
assert(summaryItems.length >= 5, `Resumen de cuenta corriente renderiza tarjetas (encontradas: ${summaryItems.length})`);

const htmlContent = pageContent.innerHTML;
assert(htmlContent.includes('Deuda inicial'), 'Ficha de proveedor incluye etiqueta "Deuda inicial"');
assert(htmlContent.includes('Total facturado'), 'Ficha de proveedor incluye "Total facturado"');
assert(htmlContent.includes('Total pagos'), 'Ficha de proveedor incluye "Total pagos"');

// ── PRUEBA 10: VINCULACIÓN DIRECTA ENTRE PROVEEDOR, FACTURAS Y NUEVO PAGO ──
console.log('\n--- PRUEBA 10: VINCULACIÓN REACTIVA ENTRE PROVEEDOR, FACTURA Y PAGOS ---');
// 1. Crear proveedor con deuda inicial
const provNorte = DataService.create('proveedores', {
  nombre: 'Piedras del Norte SA',
  cuit: '30-77665544-2',
  deudaInicial: 200000
});
assert(provNorte.id, 'Proveedor Piedras del Norte SA creado');
assert(provNorte.deudaInicial === 200000, 'Deuda inicial guardada en $200.000');

// 2. Crear factura en Facturas / Cuentas para ese proveedor
const facNorte = DataService.create('facturas', {
  proveedorId: provNorte.id,
  proveedorNombre: provNorte.nombre,
  tipo: 'factura',
  numero: 'FC-A-0099-00001234',
  fecha: '2026-09-10',
  vencimiento: '2026-09-15', // Vencida
  importe: 450000,
  estado: 'vencida'
});
assert(facNorte.id, 'Factura FC-A-0099-00001234 creada');

// 3. Renderizar vista de Pagos
renderPagos(pageContent, pageActions, '#/pagos');

// 4. Hacer clic en "Nuevo pago"
const btnNewPago = pageActions.querySelector('#btn-new-pago');
assert(!!btnNewPago, 'Botón "+ Nuevo pago" presente en cabecera de Pagos');
btnNewPago.click();

const destInputEl = document.getElementById('pago-destinatario-concepto');
const facSelectEl = document.getElementById('pago-factura-select');
const impInputEl = document.getElementById('pago-importe-input');
assert(!!destInputEl, 'Input destinatario presente en drawer de nuevo pago');
assert(!!facSelectEl, 'Selector de factura presente en drawer de nuevo pago');

// 5. Usuario escribe/selecciona el proveedor en "Destinatario / Concepto"
destInputEl.value = 'Piedras del Norte SA';
destInputEl.dispatchEvent(new Event('input', { bubbles: true }));
destInputEl.dispatchEvent(new Event('change', { bubbles: true }));

// 6. Verificar que el select de facturas contiene la factura del proveedor
const options = Array.from(facSelectEl.options);
const foundOption = options.find(opt => opt.value === facNorte.id);
assert(!!foundOption, 'Selector de factura contiene la factura FC-A-0099-00001234 del proveedor');
assert(facSelectEl.value === facNorte.id, 'Selector de factura auto-seleccionó la factura pendiente');
assert(parseFloat(impInputEl.value) === 450000, `Input de importe auto-completó el saldo de la factura ($450.000). Obtenido: ${impInputEl.value}`);

// 7. Guardar el pago
const savePagoBtn = document.getElementById('drawer-save');
savePagoBtn.click();

// 8. Verificar que el pago se guardó asociado a la factura
const allPagos = DataService.getAll('pagos');
const nuevoPago = allPagos.find(p => p.facturaId === facNorte.id);
assert(!!nuevoPago, 'Pago guardado con facturaId correctamente vinculado');
assert(nuevoPago.proveedorId === provNorte.id, 'Pago guardado con proveedorId correctamente vinculado');
assert(nuevoPago.importe === 450000, 'Importe del pago coincide ($450.000)');

// 9. Verificar que la factura pasó automáticamente a estado "pagada"
const facActualizada = DataService.getById('facturas', facNorte.id);
assert(facActualizada.estado === 'pagada', 'Factura cambió automáticamente a estado "pagada"');

// 10. Verificar que en la tabla de Pagos se visualiza la factura asociada
renderPagos(pageContent, pageActions, '#/pagos');
const pagosHtml = pageContent.innerHTML;
assert(pagosHtml.includes('Factura:'), 'Tabla de Pagos muestra la etiqueta "Factura:"');
assert(pagosHtml.includes('FC-A-0099-00001234'), 'Tabla de Pagos muestra el número oficial de la factura asociada');

// 11. Verificar saldo final del proveedor (Deuda Inicial $200k + Factura $450k - Pago $450k = $200k)
const saldoFinalNorte = DataService.getProveedorSaldo(provNorte.id);
assert(saldoFinalNorte.saldo === 200000, `Saldo del proveedor final exacto: $200.000. Obtenido: ${saldoFinalNorte.saldo}`);

console.log('\n===============================================================');
console.log(`🏁 FIN DE PRUEBAS DEUDA INICIAL: ${results.passed.length} PASADAS, ${results.failed.length} FALLADAS`);
console.log('===============================================================\n');

if (results.failed.length > 0) {
  process.exit(1);
}
