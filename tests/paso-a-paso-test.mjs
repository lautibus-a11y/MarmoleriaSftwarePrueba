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
global.localStorage = window.localStorage;

window.open = (url) => ({ closed: false, location: { href: url } });
window.print = () => {};
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);
window.requestAnimationFrame = global.requestAnimationFrame;
window.cancelAnimationFrame = global.cancelAnimationFrame;

// Import app modules
const { DataService } = await import('../frontend/js/services/mockData.js');
const { formatCurrency, formatDate, resolveEntityContact } = await import('../frontend/js/utils/helpers.js');
const { renderPresupuestos, aprobarPresupuesto, openPresupuestoForm } = await import('../frontend/js/pages/presupuestos.js');
const { renderObras, openObraForm } = await import('../frontend/js/pages/obras.js');
const { renderClientes, openClienteForm } = await import('../frontend/js/pages/clientes.js');
const { renderCalendario, openEventoForm } = await import('../frontend/js/pages/calendario.js');
const { renderCobros, openCobroForm } = await import('../frontend/js/pages/cobros.js');
const { renderPasoAPaso, getAllProcesses, calculateProcessState } = await import('../frontend/js/pages/pasoAPaso.js');
const { NAV_ITEMS } = await import('../frontend/js/utils/constants.js');
const { Icons } = await import('../frontend/js/components/ui.js');

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
console.log('🚀 INICIANDO PRUEBAS OBLIGATORIAS: MÓDULO "PASO A PASO"');
console.log('===============================================================\n');

// ── TEST 0: INTEGRACIÓN EN NAVEGACIÓN Y CONSTANTES ──
console.log('--- TEST 0: INTEGRACIÓN EN SIDEBAR Y CONSTANTES ---');
{
  const navItem = NAV_ITEMS.find(item => item.id === 'paso-a-paso');
  assert(!!navItem, 'Item "Paso a Paso" presente en NAV_ITEMS');
  assert(navItem?.path === '/paso-a-paso', 'Ruta de Paso a Paso es "/paso-a-paso"');
  assert(!!Icons.workflow, 'Icono "workflow" disponible en Icons');
}

// ── TEST 1 (CASO 1): MULTIPROCESO SIMULTÁNEO Y PERSISTENCIA ──
// Crear Cliente A → Crear presupuesto → dejarlo esperando confirmación → salir.
// Crear Cliente B → Crear otro presupuesto.
// Volver posteriormente al Cliente A. Debe continuar exactamente donde quedó.
console.log('\n--- TEST 1 (CASO 1): MULTIPROCESO SIMULTÁNEO Y PERSISTENCIA ---');
{
  // 1. Crear Cliente A
  const clienteA = DataService.create('clientes', {
    nombre: 'Cliente',
    apellido: 'Alpha',
    telefono: '11-1111-2222',
    direccion: 'Av. Siempre Viva 123'
  });
  assert(!!clienteA.id, 'Cliente A creado exitosamente');

  // 2. Crear Presupuesto para Cliente A (estado: enviado / esperando confirmación)
  const presA = DataService.create('presupuestos', {
    clienteId: clienteA.id,
    clienteNombre: 'Cliente Alpha',
    telefono: clienteA.telefono,
    direccion: clienteA.direccion,
    descripcion: 'Mesada cocina Negro Brasil',
    material: 'Granito Negro Brasil',
    estado: 'enviado',
    items: [{ id: '1', descripcion: 'Mesada principal', m2: 2.2, precioUnitario: 120000, subtotal: 264000 }]
  });
  assert(!!presA.id, 'Presupuesto A creado exitosamente para Cliente A');

  // 3. Crear Cliente B y Presupuesto B
  const clienteB = DataService.create('clientes', {
    nombre: 'Cliente',
    apellido: 'Beta',
    telefono: '11-3333-4444',
    direccion: 'Belgrano 456'
  });
  const presB = DataService.create('presupuestos', {
    clienteId: clienteB.id,
    clienteNombre: 'Cliente Beta',
    telefono: clienteB.telefono,
    direccion: clienteB.direccion,
    descripcion: 'Isla Silestone Blanco Zeus',
    material: 'Silestone Blanco Zeus',
    estado: 'borrador',
    items: [{ id: '1', descripcion: 'Isla desayunador', m2: 3.0, precioUnitario: 320000, subtotal: 960000 }]
  });
  assert(!!presB.id, 'Presupuesto B creado exitosamente para Cliente B');

  // 4. Consultar listado de procesos en Paso a Paso
  const processes = getAllProcesses();
  const procA = processes.find(p => p.presupuestoId === presA.id);
  const procB = processes.find(p => p.presupuestoId === presB.id);

  assert(!!procA, 'Proceso de Cliente A listado correctamente');
  assert(!!procB, 'Proceso de Cliente B listado simultáneamente');
  assert(procA.stateInfo.currentStep === 3, 'Cliente A se encuentra en Paso 3 (Confirmación)');
  assert(procA.stateInfo.statusKey === 'esperando_confirmacion', 'Cliente A en estado "Esperando confirmación"');
  assert(procA.stateInfo.isWaiting === true, 'Cliente A tiene flag isWaiting activado');

  assert(procB.stateInfo.currentStep === 3, 'Cliente B se encuentra en Paso 3 (Borrador en confección)');
  assert(procB.stateInfo.statusKey === 'borrador', 'Cliente B en estado "Presupuesto en borrador"');

  // 5. Verificar que volver a Cliente A no alteró nada
  const procARetomado = getAllProcesses().find(p => p.presupuestoId === presA.id);
  assert(procARetomado.stateInfo.currentStep === 3, 'Al retomar Cliente A, continúa exactamente en Paso 3');
  assert(procARetomado.stateInfo.statusLabel === 'Esperando confirmación', 'Etiqueta de Cliente A preservada intacta');
}

// ── TEST 2 (CASO 2): DETECCIÓN AUTOMÁTICA DE APROBACIÓN EXTERNA ──
// Crear presupuesto desde Paso a Paso.
// Ir manualmente a Presupuestos y aprobarlo.
// Volver a Paso a Paso: debe detectar automáticamente que fue aprobado y mostrar el siguiente paso.
console.log('\n--- TEST 2 (CASO 2): DETECCIÓN AUTOMÁTICA DE APROBACIÓN EXTERNA ---');
{
  const clienteExt = DataService.create('clientes', {
    nombre: 'Mariana',
    apellido: 'Pérez',
    telefono: '11-8888-9999',
    direccion: 'Cabildo 2000'
  });

  const presExt = DataService.create('presupuestos', {
    clienteId: clienteExt.id,
    clienteNombre: 'Mariana Pérez',
    telefono: clienteExt.telefono,
    direccion: clienteExt.direccion,
    descripcion: 'Vanitory Travertino Romano',
    material: 'Mármol Travertino Romano',
    estado: 'enviado',
    items: [{ id: '1', descripcion: 'Tapa vanitory', m2: 1.0, precioUnitario: 175000, subtotal: 175000 }]
  });

  // Verificar estado inicial en Paso a Paso antes de aprobar externamente
  let procExt = getAllProcesses().find(p => p.presupuestoId === presExt.id);
  assert(procExt.stateInfo.currentStep === 3, 'Paso inicial antes de aprobar: 3 (Confirmación)');

  // Aprobar externamente desde la función de Presupuestos
  aprobarPresupuesto(presExt.id);

  // Volver a Paso a Paso y comprobar que detectó la aprobación y la obra creada
  procExt = getAllProcesses().find(p => p.presupuestoId === presExt.id);
  assert(procExt.presupuesto.estado === 'aprobado', 'Presupuesto detectado como "aprobado"');
  assert(!!procExt.obra, 'Obra vinculada detectada automáticamente');
  assert(procExt.stateInfo.currentStep === 5, 'Avanzó automáticamente a Paso 5 (Agenda / Falta agendar)');
  assert(procExt.stateInfo.statusKey === 'falta_agendar', 'Estado detectado en tiempo real: "Falta agendar"');
}

// ── TEST 3 (CASO 3): ACTUALIZACIÓN DE CLIENTE DESDE LA SOLAPA CLIENTES ──
// Modificar datos de un cliente desde Clientes.
// Volver a Paso a Paso: debe utilizar los datos nuevos, nunca una copia vieja.
console.log('\n--- TEST 3 (CASO 3): ACTUALIZACIÓN DE CLIENTE DESDE CLIENTES ---');
{
  const clienteC = DataService.create('clientes', {
    nombre: 'Facundo',
    apellido: 'Gómez',
    telefono: '11-2222-3333',
    direccion: 'Dirección Antigua 100'
  });

  const presC = DataService.create('presupuestos', {
    clienteId: clienteC.id,
    clienteNombre: 'Facundo Gómez',
    telefono: clienteC.telefono,
    direccion: clienteC.direccion,
    descripcion: 'Mesada cocina',
    estado: 'borrador',
    items: [{ id: '1', descripcion: 'Pieza', m2: 1.5, precioUnitario: 100000, subtotal: 150000 }]
  });

  // Se modifica el cliente desde el módulo Clientes
  DataService.update('clientes', clienteC.id, {
    telefono: '11-9999-0000',
    direccion: 'Nueva Dirección Actualizada 999',
    observaciones: 'Preferencia por entregas por la mañana'
  });

  // Comprobar que Paso a Paso lee inmediatamente los datos nuevos
  const procC = getAllProcesses().find(p => p.presupuestoId === presC.id);
  assert(procC.telefono.includes('1199990000'), 'Paso a Paso refleja el nuevo teléfono del cliente', `Obtenido: ${procC.telefono}`);
  assert(procC.direccion === 'Nueva Dirección Actualizada 999', 'Paso a Paso refleja la nueva dirección del cliente', `Obtenido: ${procC.direccion}`);
}

// ── TEST 4 (CASO 4): FLUJO COMPLETO UNIFICADO CLIENTE -> PRESUPUESTO -> OBRA -> CALENDARIO -> COBRO -> FINALIZAR ──
console.log('\n--- TEST 4 (CASO 4): FLUJO COMPLETO UNIFICADO Y COMPROBACIÓN CRUZADA ---');
{
  // Esperar liberación de mutex de aprobación (650ms)
  await new Promise(r => setTimeout(r, 650));

  // 1. Alta de Cliente
  const cliFull = DataService.create('clientes', {
    nombre: 'Esteban',
    apellido: 'Quito',
    telefono: '11-7777-8888',
    direccion: 'Santa Fe 3400'
  });

  // 2. Alta de Presupuesto
  const presFull = DataService.create('presupuestos', {
    clienteId: cliFull.id,
    clienteNombre: `${cliFull.nombre} ${cliFull.apellido}`,
    telefono: cliFull.telefono,
    direccion: cliFull.direccion,
    descripcion: 'Mesada doble bacha',
    material: 'Granito Negro Absoluto',
    estado: 'enviado',
    items: [{ id: '1', descripcion: 'Mesada y zócalos', m2: 2.0, precioUnitario: 185000, subtotal: 370000 }]
  });

  let pFlow = getAllProcesses().find(p => p.presupuestoId === presFull.id);
  assert(pFlow.stateInfo.currentStep === 3, 'Paso 3: Esperando confirmación');

  // 3. Aprobación del presupuesto -> Genera Obra
  aprobarPresupuesto(presFull.id);
  pFlow = getAllProcesses().find(p => p.presupuestoId === presFull.id);
  assert(!!pFlow.obra, 'Obra creada en la aprobación');
  assert(pFlow.stateInfo.currentStep === 5, 'Paso 5: Falta agendar obra');

  // Comprobar que la obra existe en la colección de Obras tradicional
  const obraEnTradicional = DataService.getById('obras', pFlow.obra.id);
  assert(!!obraEnTradicional, 'La obra generada existe en DataService (Módulo Obras tradicional)');

  // 4. Agendar en Calendario
  const evento = DataService.create('eventos', {
    clienteId: cliFull.id,
    obraId: pFlow.obra.id,
    presupuestoId: presFull.id,
    tipo: 'instalacion',
    fecha: '2026-10-15',
    hora: '09:00',
    estado: 'pendiente',
    direccion: pFlow.obra.direccion
  });
  assert(!!evento.id, 'Evento agendado en Calendario');

  pFlow = getAllProcesses().find(p => p.presupuestoId === presFull.id);
  // Al estar agendada pero sin cobro de seña, pasa a Paso 6 (Seña)
  assert(pFlow.stateInfo.currentStep === 6, 'Paso 6: Pendiente de seña tras agendar');
  assert(pFlow.stateInfo.statusKey === 'pendiente_sena', 'Estado: "Pendiente de seña"');

  // Comprobar que el evento existe en la colección de Calendario
  const eventoEnCalendario = DataService.getById('eventos', evento.id);
  assert(!!eventoEnCalendario, 'El evento creado existe en Calendario');

  // 5. Registrar cobro de seña (50% = $185.000)
  const cobro1 = DataService.create('cobros', {
    clienteId: cliFull.id,
    obraId: pFlow.obra.id,
    importe: 185000,
    fecha: '2026-09-21',
    metodoPago: 'transferencia',
    estado: 'cobrado'
  });
  assert(!!cobro1.id, 'Cobro de anticipo registrado en DataService');

  // Comprobar que el cobro aparece en el módulo Cobros
  const cobroTradicional = DataService.getById('cobros', cobro1.id);
  assert(!!cobroTradicional, 'Cobro visible en pestaña Cobros');

  pFlow = getAllProcesses().find(p => p.presupuestoId === presFull.id);
  // Al registrar seña pero no tener salida de stock o taller, pasa a Paso 7
  assert(pFlow.stateInfo.currentStep === 7, 'Paso 7: En preparación / taller tras registrar seña');

  // 6. Taller y salida de stock
  DataService.update('obras', pFlow.obra.id, {
    stockDescontado: true,
    estado: 'colocacion'
  });

  pFlow = getAllProcesses().find(p => p.presupuestoId === presFull.id);
  assert(pFlow.stateInfo.currentStep === 8, 'Paso 8: En colocación / cobro de saldo');

  // 7. Cobrar saldo restante ($185.000) y Finalizar Obra
  DataService.create('cobros', {
    clienteId: cliFull.id,
    obraId: pFlow.obra.id,
    importe: 185000,
    fecha: '2026-10-15',
    metodoPago: 'efectivo',
    estado: 'cobrado'
  });

  DataService.update('obras', pFlow.obra.id, {
    estado: 'finalizada',
    fechaFin: '2026-10-15'
  });

  pFlow = getAllProcesses().find(p => p.presupuestoId === presFull.id);
  assert(pFlow.stateInfo.currentStep === 8, 'Paso 8 completado');
  assert(pFlow.stateInfo.isCompleted === true, 'Proceso marcado como Finalizado');
  assert(pFlow.stateInfo.statusLabel === 'Finalizado', 'Etiqueta final: "Finalizado"');

  // Comprobar que la obra en la pestaña Obras tradicional quedó como "finalizada"
  const obraFinalizada = DataService.getById('obras', pFlow.obra.id);
  assert(obraFinalizada.estado === 'finalizada', 'Obra en módulo Obras está en estado "finalizada"');
}

// ── TEST 5 (CASO 5): CONCURRENCIA DE MÚLTIPLES PROCESOS SIN INTERFERENCIA ──
console.log('\n--- TEST 5 (CASO 5): CONCURRENCIA Y AISLAMIENTO ENTRE PROCESOS ---');
{
  const processes = getAllProcesses();
  const stepCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
  processes.forEach(p => {
    stepCounts[p.stateInfo.currentStep] = (stepCounts[p.stateInfo.currentStep] || 0) + 1;
  });

  assert(processes.length >= 4, `Múltiples procesos abiertos concurrentemente (${processes.length} totales)`);
  assert(stepCounts[3] >= 2, `Existen al menos 2 procesos en Paso 3 de forma independiente (encontrados: ${stepCounts[3]})`);
  assert(stepCounts[8] >= 1, `Existe al menos 1 proceso en Paso 8 finalizado (encontrados: ${stepCounts[8]})`);

  // Modificar uno no debe alterar a los demás
  const pA = processes.find(p => p.clienteNombre === 'Cliente Alpha');
  const pB = processes.find(p => p.clienteNombre === 'Cliente Beta');
  assert(pA.stateInfo.statusKey !== pB.stateInfo.statusKey, 'Proceso A y Proceso B mantienen sus estados individuales diferenciados');
}

// ── TEST 5.5: NO GENERACIÓN AUTOMÁTICA DE OBRA EN PASO A PASO ──
console.log('\n--- TEST 5.5: NO GENERACIÓN AUTOMÁTICA DE OBRA EN PASO A PASO ---');
{
  const cliManual = DataService.create('clientes', {
    nombre: 'Gonzalo',
    apellido: 'Manual',
    telefono: '11-5555-6666'
  });
  const presManual = DataService.create('presupuestos', {
    clienteId: cliManual.id,
    clienteNombre: 'Gonzalo Manual',
    telefono: cliManual.telefono,
    descripcion: 'Mesada cocina',
    estado: 'enviado'
  });

  // Al aprobar en Paso a Paso: solo cambia el estado del presupuesto a "aprobado", NO crea la obra automáticamente
  DataService.update('presupuestos', presManual.id, { estado: 'aprobado' });
  let procManual = getAllProcesses().find(p => p.presupuestoId === presManual.id);

  assert(procManual.presupuesto.estado === 'aprobado', 'Presupuesto aprobado');
  assert(!procManual.obra, 'En Paso a Paso NO se genera obra automáticamente al aprobar');
  assert(procManual.stateInfo.currentStep === 4, 'Pasa a Paso 4 (Obra) para que el usuario la cree cuando decida');
  assert(procManual.stateInfo.statusKey === 'crear_obra', 'Estado en Paso 4: "crear_obra"');

  // En Paso 4 el usuario decide crear la orden de obra
  const obraCreada = DataService.create('obras', {
    presupuestoId: presManual.id,
    presupuestoNumero: presManual.numero || `PRES-${presManual.id}`,
    clienteId: cliManual.id,
    clienteNombre: 'Gonzalo Manual',
    descripcion: 'Mesada cocina',
    estado: 'pendiente'
  });
  DataService.update('presupuestos', presManual.id, { obraId: obraCreada.id });

  procManual = getAllProcesses().find(p => p.presupuestoId === presManual.id);
  assert(!!procManual.obra, 'Obra vinculada tras creación explícita en Paso 4');
  assert(procManual.stateInfo.currentStep === 5, 'Con la obra creada avanza a Paso 5 (Agenda)');
}

// ── TEST 6: RENDERIZADO VISUAL EN EL DOM ──
console.log('\n--- TEST 6: RENDERIZADO VISUAL EN DOM DE PASO A PASO ---');
{
  const container = document.getElementById('page-content');
  const actionsEl = document.getElementById('page-header-actions');

  renderPasoAPaso(container, actionsEl, '/paso-a-paso');

  assert(!!container.querySelector('.paso-container'), 'Contenedor principal .paso-container renderizado');
  assert(!!container.querySelector('.workflow-hero-banner'), 'Banner informativo renderizado');
  assert(!!container.querySelector('.workflow-tabs-group'), 'Grupo de pestañas de filtro presente');
  assert(container.querySelectorAll('.workflow-process-card').length > 0, 'Tarjetas de procesos renderizadas en el DOM');
  assert(!!actionsEl.querySelector('#btn-workflow-new-process'), 'Botón "+ Iniciar nuevo proceso" presente en la cabecera');

  // Renderizar la vista guiada de un proceso específico
  const allP = getAllProcesses();
  if (allP.length > 0) {
    const sampleId = allP[0].processId;
    renderPasoAPaso(container, actionsEl, `/paso-a-paso/${sampleId}`);

    assert(!!container.querySelector('.workflow-stepper'), 'Stepper horizontal renderizado en detalle de proceso');
    assert(container.querySelectorAll('.step-node').length === 8, 'Los 8 nodos del stepper están presentes');
    assert(!!container.querySelector('.workflow-step-card'), 'Tarjeta enfocada del paso presente');
    assert(!!actionsEl.querySelector('a[href="#/paso-a-paso"]'), 'Botón "Guardar y salir" presente en la cabecera');
  }
}

console.log('\n===============================================================');
console.log(`🏁 FIN DE PRUEBAS PASO A PASO: ${results.passed.length} PASADAS, ${results.failed.length} FALLADAS`);
console.log('===============================================================\n');

if (results.failed.length > 0) {
  process.exit(1);
}
