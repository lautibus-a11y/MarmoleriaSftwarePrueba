import { JSDOM } from 'jsdom';

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
global.MouseEvent = window.MouseEvent;
global.localStorage = window.localStorage;

window.open = (url) => ({ closed: false, location: { href: url } });
window.print = () => {};
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
window.requestAnimationFrame = global.requestAnimationFrame;
window.cancelAnimationFrame = global.cancelAnimationFrame;

const { DataService } = await import('../frontend/js/services/mockData.js');
const { formatCurrency, formatDate, resolveEntityContact } = await import('../frontend/js/utils/helpers.js');
const { renderPresupuestos, openPresupuestoForm } = await import('../frontend/js/pages/presupuestos.js');
const { renderObras, openObraForm } = await import('../frontend/js/pages/obras.js');
const { renderClientes, openClienteForm } = await import('../frontend/js/pages/clientes.js');
const { renderProveedores, openProveedorForm } = await import('../frontend/js/pages/proveedores.js');
const { renderStock } = await import('../frontend/js/pages/stock.js');
const { renderCalendario, openEventoForm } = await import('../frontend/js/pages/calendario.js');
const { renderFacturas } = await import('../frontend/js/pages/facturas.js');
const { renderPagos } = await import('../frontend/js/pages/pagos.js');
const { renderCobros } = await import('../frontend/js/pages/cobros.js');
const { renderConfiguracion } = await import('../frontend/js/pages/configuracion.js');
const { renderDashboard } = await import('../frontend/js/pages/dashboard.js');
const { Drawer } = await import('../frontend/js/components/drawer.js');
const { Modal } = await import('../frontend/js/components/modal.js');
const { Toast } = await import('../frontend/js/components/toast.js');

const results = { passed: [], failed: [] };
function assert(cond, name, info = '') {
  if (cond) {
    results.passed.push(name);
    console.log(`  ✅ ${name}`);
  } else {
    results.failed.push({ name, info });
    console.error(`  ❌ ${name} — ${info}`);
  }
}

console.log('\n===============================================================');
console.log('🧪 PRUEBAS INTERACTIVAS DE BOTONES, MODALES Y BUSCADORES');
console.log('===============================================================\n');

const container = document.getElementById('page-content');
const actions = document.getElementById('page-header-actions');

// ── 1. BUSCADORES Y FILTROS EN TABLAS ──
console.log('--- 1. BUSCADORES Y FILTROS EN TABLAS ---');
{
  // Clientes: buscar por nombre
  renderClientes(container, actions);
  const searchCli = container.querySelector('#search-input');
  assert(!!searchCli, 'Input de búsqueda presente en Clientes');
  
  // Obras: filtro por estado
  renderObras(container, actions);
  const filterObras = container.querySelector('#filter-estado');
  assert(!!filterObras, 'Selector de filtro por estado presente en Obras');
  assert(filterObras.options.length >= 5, 'Opciones de estado de Obras completas');

  // Presupuestos: filtro por estado
  renderPresupuestos(container, actions);
  const filterPres = container.querySelector('#filter-estado');
  assert(!!filterPres, 'Selector de filtro por estado presente en Presupuestos');

  // Facturas: filtros de tipo y estado
  renderFacturas(container, actions);
  const filterTipoFac = container.querySelector('#filter-tipo');
  const filterEstadoFac = container.querySelector('#filter-estado');
  assert(!!filterTipoFac && !!filterEstadoFac, 'Filtros de tipo y estado presentes en Facturas');

  // Pagos: filtros de estado y método
  renderPagos(container, actions);
  const filterMetodoPago = container.querySelector('#filter-metodo');
  assert(!!filterMetodoPago, 'Filtro de método de pago presente en Pagos');

  // Cobros: filtro de estado
  renderCobros(container, actions);
  const filterCobros = container.querySelector('#filter-estado');
  assert(!!filterCobros, 'Filtro de estado presente en Cobros');
}

// ── Preparar datos de prueba para verificar filas interactivas ──
let testPresupuesto = DataService.getAll('presupuestos')[0];
if (!testPresupuesto) {
  testPresupuesto = DataService.create('presupuestos', {
    numero: 'PRES-TEST-001',
    clienteId: 'cli-001',
    clienteNombre: 'Carlos Rodríguez',
    items: [{ descripcion: 'Mesada cocina', cantidad: 2, precioUnitario: 100000 }],
    adicionales: [],
    descuento: 0,
    impuestos: 21,
    estado: 'borrador'
  });
}

let testObra = DataService.getAll('obras')[0];
if (!testObra) {
  testObra = DataService.create('obras', {
    clienteId: 'cli-001',
    clienteNombre: 'Carlos Rodríguez',
    direccion: 'Av. Libertador 1250, CABA',
    material: 'Negro Brasil',
    estado: 'en_produccion',
    presupuestoId: testPresupuesto.id,
    presupuestoNumero: testPresupuesto.numero
  });
}

// ── 2. BOTONES DE ACCIÓN EN TABLA DE OBRAS ──
console.log('\n--- 2. BOTONES DE ACCIÓN EN OBRAS ---');
{
  renderObras(container, actions);
  const rowBtns = container.querySelectorAll('.table-actions-group button[data-action]');
  assert(rowBtns.length > 0, 'Botones de acción presentes en filas de obras');
  
  const actionsFound = new Set();
  rowBtns.forEach(b => actionsFound.add(b.dataset.action));
  assert(actionsFound.has('schedule'), 'Acción "schedule" (Agendar obra) presente en la tabla');
  assert(actionsFound.has('view'), 'Acción "view" presente en la tabla');
  assert(actionsFound.has('share'), 'Acción "share" presente en la tabla');
  assert(actionsFound.has('export'), 'Acción "export" presente en la tabla');
  assert(actionsFound.has('delete'), 'Acción "delete" presente en la tabla');
}

// ── 3. BOTONES DE ACCIÓN EN TABLA DE PRESUPUESTOS ──
console.log('\n--- 3. BOTONES DE ACCIÓN EN PRESUPUESTOS ---');
{
  renderPresupuestos(container, actions);
  const presBtns = container.querySelectorAll('tbody button[data-action]');
  assert(presBtns.length > 0, 'Botones de acción presentes en filas de presupuestos');
  
  const presActionsFound = new Set();
  presBtns.forEach(b => presActionsFound.add(b.dataset.action));
  assert(presActionsFound.has('schedule'), 'Acción "schedule" presente en presupuestos');
  assert(presActionsFound.has('share'), 'Acción "share" presente en presupuestos');
  assert(presActionsFound.has('export'), 'Acción "export" presente en presupuestos');
  assert(presActionsFound.has('edit'), 'Acción "edit" presente en presupuestos');
  assert(presActionsFound.has('duplicate'), 'Acción "duplicate" presente en presupuestos');
  assert(presActionsFound.has('delete'), 'Acción "delete" presente en presupuestos');
}

// ── 4. APERTURA Y CIERRE DE DRAWERS DE FORMULARIOS ──
console.log('\n--- 4. DRAWERS Y FORMULARIOS DE ALTA ---');
{
  // Formulario nuevo cliente
  openClienteForm();
  assert(Drawer.isOpen, 'Drawer se abre para nuevo cliente');
  const cliNombreInput = document.querySelector('input[name="nombre"]');
  assert(!!cliNombreInput, 'Campo de nombre presente en formulario de cliente');
  Drawer.close();
  assert(!Drawer.isOpen, 'Drawer se cierra correctamente');

  // Formulario nuevo proveedor
  openProveedorForm();
  assert(Drawer.isOpen, 'Drawer se abre para nuevo proveedor');
  Drawer.close();

  // Formulario nuevo material desde renderStock header action
  renderStock(container, actions);
  const btnNewMat = actions.querySelector('#btn-new-mat');
  if (btnNewMat) btnNewMat.click();
  assert(Drawer.isOpen, 'Drawer se abre para nuevo material vía botón de acción');
  Drawer.close();

  // Formulario nuevo movimiento de stock desde renderStock header action (abre Modal)
  const btnNewMov = actions.querySelector('#btn-new-mov');
  if (btnNewMov) btnNewMov.click();
  assert(Modal.isOpen, 'Modal se abre para registrar nuevo movimiento de stock');
  Modal.close();
  assert(!Modal.isOpen, 'Modal de movimiento se cierra correctamente');

  // Formulario nuevo evento calendario
  openEventoForm();
  assert(Drawer.isOpen, 'Drawer se abre para nuevo evento');
  Drawer.close();
}

// ── 5. PERSISTENCIA TOTAL TRAS RECARGA SIMULADA ──
console.log('\n--- 5. PERSISTENCIA EN LOCALSTORAGE TRAS RECARGA ---');
{
  const testClientName = 'Cliente Persistente ' + Date.now();
  const c = DataService.create('clientes', {
    nombre: testClientName,
    telefono: '11 1234 5678',
    whatsapp: '5491112345678'
  });

  // Verificar que se guardó en localStorage
  const cachedJson = localStorage.getItem('mb_clientes');
  assert(cachedJson && cachedJson.includes(testClientName), 'Cliente nuevo persistido inmediatamente en mb_clientes de localStorage');

  // Simular recarga: leer desde localStorage y verificar que se reconstruye
  const parsed = JSON.parse(cachedJson);
  const found = parsed.find(x => x.id === c.id);
  assert(!!found, 'Cliente recuperable directamente desde almacenamiento local');
  assert(found.nombre === testClientName, 'Nombre del cliente coincide tras deserialización');
}

console.log('\n===============================================================');
console.log(`🏁 FIN DE PRUEBAS INTERACTIVAS: ${results.passed.length} PASADAS, ${results.failed.length} FALLADAS`);
console.log('===============================================================\n');

if (results.failed.length > 0) process.exit(1);
else process.exit(0);
