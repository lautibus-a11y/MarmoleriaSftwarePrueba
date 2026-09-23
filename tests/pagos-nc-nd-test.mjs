import { JSDOM } from 'jsdom';

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
  url: 'http://localhost:3000/#/pagos',
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

const { DataService } = await import('../frontend/js/services/mockData.js');
const { renderPagos } = await import('../frontend/js/pages/pagos.js');

function assert(condition, message) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`  ✅ PASS: ${message}`);
  }
}

console.log('===============================================================');
console.log('🧪 TEST: NOTAS DE CRÉDITO Y DÉBITO EN DESPLEGABLE DE PAGOS');
console.log('===============================================================');

// 1. Crear proveedor de prueba
const prov = DataService.create('proveedores', {
  nombre: 'Mármoles del Valle SRL',
  cuit: '30-99887766-5',
  telefono: '11-4455-6677',
  deudaInicial: 50000
});
assert(prov.id, 'Proveedor creado con ID');

// 2. Crear cliente de prueba
const cli = DataService.create('clientes', {
  nombre: 'Carlos',
  apellido: 'Fernandez',
  telefono: '11-2233-4455'
});
assert(cli.id, 'Cliente creado con ID');

// 3. Crear una Nota de Crédito para el proveedor
const nc = DataService.create('facturas', {
  tipo: 'nota_credito',
  proveedorId: prov.id,
  proveedorNombre: prov.nombre,
  numero: 'NC-B-0001-00000088',
  fecha: '2026-09-20',
  importe: 25000,
  estado: 'pendiente'
});
assert(nc.id, 'Nota de crédito creada correctamente');

// 4. Crear una Nota de Débito para el proveedor
const nd = DataService.create('facturas', {
  tipo: 'nota_debito',
  proveedorId: prov.id,
  proveedorNombre: prov.nombre,
  numero: 'ND-B-0001-00000099',
  fecha: '2026-09-21',
  importe: 15000,
  estado: 'pendiente'
});
assert(nd.id, 'Nota de débito creada correctamente');

// 5. Crear una Factura tradicional
const fc = DataService.create('facturas', {
  tipo: 'factura',
  proveedorId: prov.id,
  proveedorNombre: prov.nombre,
  numero: 'FC-A-0001-00000111',
  fecha: '2026-09-22',
  importe: 60000,
  estado: 'pendiente'
});
assert(fc.id, 'Factura tradicional creada');

// 6. Renderizar Pagos y abrir modal de nuevo pago
const pageContent = document.getElementById('page-content');
const pageActions = document.getElementById('page-header-actions');
renderPagos(pageContent, pageActions, '#/pagos');

const btnNewPago = pageActions.querySelector('#btn-new-pago');
assert(!!btnNewPago, 'Botón de nuevo pago visible');
btnNewPago.click();

const provSelect = document.getElementById('pago-proveedor-select');
const facSelect = document.getElementById('pago-factura-select');
const impInput = document.getElementById('pago-importe-input');
assert(!!provSelect, 'Desplegable de destinatario/proveedor/cliente presente');
assert(!!facSelect, 'Desplegable de comprobante presente');

// 7. Verificar que el select tiene los optgroups correspondientes
const optgroups = Array.from(provSelect.querySelectorAll('optgroup'));
assert(optgroups.some(g => g.label === 'Proveedores'), 'Optgroup Proveedores presente');
assert(optgroups.some(g => g.label === 'Clientes'), 'Optgroup Clientes presente');

// 8. Seleccionar el proveedor en el desplegable
provSelect.value = prov.id;
provSelect.dispatchEvent(new Event('change', { bubbles: true }));

// 9. Verificar que el select de comprobantes incluye la NC, la ND y la Factura
const options = Array.from(facSelect.options);
const ncOpt = options.find(o => o.value === nc.id);
const ndOpt = options.find(o => o.value === nd.id);
const fcOpt = options.find(o => o.value === fc.id);

assert(!!ncOpt, 'Nota de Crédito está en el desplegable de comprobantes');
assert(ncOpt.textContent.includes('Nota de Crédito'), 'Etiqueta Nota de Crédito visualizada');
assert(!!ndOpt, 'Nota de Débito está en el desplegable de comprobantes');
assert(ndOpt.textContent.includes('Nota de Débito'), 'Etiqueta Nota de Débito visualizada');
assert(!!fcOpt, 'Factura está en el desplegable de comprobantes');

// 10. Seleccionar la Nota de Crédito específicamente
facSelect.value = nc.id;
facSelect.dispatchEvent(new Event('change', { bubbles: true }));
assert(parseFloat(impInput.value) === 25000, `Importe auto-completado con el valor de la NC ($25.000). Obtenido: ${impInput.value}`);

// 11. Guardar el pago vinculado a la Nota de Crédito
const saveBtn = document.getElementById('drawer-save');
saveBtn.click();

const pagos = DataService.getAll('pagos');
const pagoNC = pagos.find(p => p.facturaId === nc.id);
assert(!!pagoNC, 'Pago guardado con vínculo a la Nota de Crédito');
assert(pagoNC.proveedorId === prov.id, 'Pago vinculado al proveedor de la NC');
assert(pagoNC.importe === 25000, 'Importe del pago coincide');

// 12. Verificar render en la tabla de Pagos
renderPagos(pageContent, pageActions, '#/pagos');
const tableHtml = pageContent.innerHTML;
assert(tableHtml.includes('Nota de Crédito:'), 'Tabla de Pagos muestra etiqueta "Nota de Crédito:"');
assert(tableHtml.includes('NC-B-0001-00000088'), 'Tabla de Pagos muestra el número oficial de la NC');

console.log('===============================================================');
console.log('🎉 TODAS LAS PRUEBAS DE NOTAS DE CRÉDITO Y DÉBITO PASARON');
console.log('===============================================================');
