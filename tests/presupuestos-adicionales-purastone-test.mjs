import { JSDOM } from 'jsdom';
import assert from 'assert';

const dom = new JSDOM(`<!DOCTYPE html><html><body><div id="app"></div><div id="drawer-container"></div></body></html>`, {
  url: 'http://localhost:3000'
});

global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.CustomEvent = dom.window.CustomEvent;
global.FormData = dom.window.FormData;
global.Event = dom.window.Event;
global.HTMLElement = dom.window.HTMLElement;
global.requestAnimationFrame = (cb) => cb();

// Clear localStorage before tests
localStorage.clear();

const { DataService } = await import('../frontend/js/services/mockData.js');
const { generatePresupuestoHtml, getCompanyInfo } = await import('../frontend/js/services/documentExporter.js');
const { openPresupuestoForm, PRESUPUESTO_ADICIONALES_KEYS } = await import('../frontend/js/pages/presupuestos.js');

console.log('===============================================================');
console.log('🧪 TEST SUITE: CAMPOS ADICIONALES, ENTREGA Y COLOCACIÓN, PURASTONE');
console.log('===============================================================');

// ── TEST 1: PDF HEADER REEMPLAZA QUARZO / CUARZO POR PURASTONE ──
console.log('\n--- 1. ENCABEZADO PDF Y MARCA PURASTONE ---');
{
  const company = getCompanyInfo();
  assert(company.subtitulo.includes('Purastone'), 'getCompanyInfo() incluye Purastone en subtítulo');
  assert(!company.subtitulo.toLowerCase().includes('cuarzo'), 'getCompanyInfo() NO incluye Cuarzo');
  assert(!company.subtitulo.toLowerCase().includes('quarzo'), 'getCompanyInfo() NO incluye Quarzo');
  console.log('  ✅ PASS: Subtítulo de empresa configurado correctamente con Purastone:', company.subtitulo);

  // PDF renderizado incluye Purastone
  const dummyPres = {
    numero: 'PRES-2026-0001',
    fecha: new Date().toISOString(),
    clienteNombre: 'Cliente Prueba',
    items: [{ descripcion: 'Mesada cocina', material: 'Granito', largo: 200, ancho: 60, cantidad: 1, m2: 1.2, precioUnitario: 50000, subtotal: 60000 }],
    adicionales: {},
    descuento: 0,
    impuestos: 21,
    moneda: 'ARS'
  };
  const pdfHtml = generatePresupuestoHtml(dummyPres);
  assert(pdfHtml.includes('Purastone'), 'El HTML del PDF incluye "Purastone" en el encabezado');
  assert(!pdfHtml.includes('Cuarzo') && !pdfHtml.includes('Quarzo'), 'El HTML del PDF NO contiene "Cuarzo" ni "Quarzo"');
  console.log('  ✅ PASS: El PDF generado incluye Purastone en el encabezado y no exhibe Quarzo');
}

// ── TEST 2: NUEVOS CAMPOS ADICIONALES EN PRESUPUESTOS ──
console.log('\n--- 2. NUEVOS CAMPOS ADICIONALES EN CÁLCULO Y DEFINICIÓN ---');
{
  const expectedKeys = [
    'entregaColocacion',
    'manoDeObra',
    'inglete',
    'bacha',
    'zocalos',
    'mensulas',
    'acarreo',
    'porEscalera',
    'traforoBachaAnafe',
    'traforoCajasLuzGas',
    'traforoDesague',
    'extras'
  ];

  expectedKeys.forEach(k => {
    assert(PRESUPUESTO_ADICIONALES_KEYS.includes(k), `PRESUPUESTO_ADICIONALES_KEYS incluye ${k}`);
  });
  console.log('  ✅ PASS: Todos los nuevos campos adicionales están definidos en PRESUPUESTO_ADICIONALES_KEYS');

  const presConNuevosAdicionales = {
    numero: 'PRES-2026-0002',
    items: [
      { descripcion: 'Mesada Purastone Blanco', m2: 2.0, precioUnitario: 100000, subtotal: 200000 }
    ],
    adicionales: {
      entregaColocacion: 40000,
      mensulas: 15000,
      acarreo: 10000,
      porEscalera: 8000,
      traforoBachaAnafe: 12000,
      traforoCajasLuzGas: 5000,
      traforoDesague: 3000,
      bacha: 20000,
      zocalos: 15000
    },
    descuento: 0,
    impuestos: 21,
    moneda: 'ARS'
  };

  // Subtotal items: 200.000
  // Adicionales: 40k + 15k + 10k + 8k + 12k + 5k + 3k + 20k + 15k = 128.000
  // Subtotal base: 328.000
  // IVA 21%: 68.880
  // Total: 396.880
  const total = DataService.getPresupuestoTotal(presConNuevosAdicionales);
  assert(Math.abs(total - 396880) < 0.01, `Cálculo con nuevos adicionales exacto. Esperado 396.880, obtenido: ${total}`);
  console.log('  ✅ PASS: Cálculo matemático con nuevos adicionales ($396.880) coincide al 100%');

  // Verificar en PDF los nuevos adicionales
  const pdfConAdicionales = generatePresupuestoHtml(presConNuevosAdicionales, null, total);
  assert(pdfConAdicionales.includes('Entrega y colocación:'), 'PDF incluye "Entrega y colocación"');
  assert(pdfConAdicionales.includes('Ménsulas:'), 'PDF incluye "Ménsulas"');
  assert(pdfConAdicionales.includes('Acarreo:'), 'PDF incluye "Acarreo"');
  assert(pdfConAdicionales.includes('Por escalera:'), 'PDF incluye "Por escalera"');
  assert(pdfConAdicionales.includes('Trafóro bacha y/o anafe:'), 'PDF incluye "Trafóro bacha y/o anafe"');
  assert(pdfConAdicionales.includes('Trafóro cajas de luz y/o gas:'), 'PDF incluye "Trafóro cajas de luz y/o gas"');
  assert(pdfConAdicionales.includes('Trafóro de desagüe:'), 'PDF incluye "Trafóro de desagüe"');
  console.log('  ✅ PASS: Todos los nuevos adicionales se renderizan en el desglose del PDF');
}

// ── TEST 3: UNIFICACIÓN DE ENTREGA Y COLOCACIÓN (SIN CAMPOS SEPARADOS) ──
console.log('\n--- 3. UNIFICACIÓN DE ENTREGA Y COLOCACIÓN ---');
{
  const presUnificado = {
    numero: 'PRES-2026-0003',
    items: [
      { descripcion: 'Isla', m2: 1.0, precioUnitario: 100000, subtotal: 100000 }
    ],
    adicionales: {
      entregaColocacion: 35000
    },
    descuento: 0,
    impuestos: 0,
    moneda: 'ARS'
  };

  const pdfUnificado = generatePresupuestoHtml(presUnificado);
  assert(pdfUnificado.includes('Entrega y colocación'), 'PDF muestra "Entrega y colocación"');
  assert(!pdfUnificado.includes('Colocación en obra'), 'PDF NO muestra "Colocación en obra"');
  assert(!pdfUnificado.includes('Flete / Transporte'), 'PDF NO muestra "Flete / Transporte"');
  console.log('  ✅ PASS: En PDF aparece únicamente "Entrega y colocación", nunca por separado');

  // Verificar compatibilidad con presupuestos legacy que tenían colocacion o transporte
  const presLegacy = {
    numero: 'PRES-2026-LEGACY',
    items: [
      { descripcion: 'Mesada antigua', m2: 1.0, precioUnitario: 50000, subtotal: 50000 }
    ],
    adicionales: {
      colocacion: 20000,
      transporte: 10000
    },
    descuento: 0,
    impuestos: 0,
    moneda: 'ARS'
  };
  const totalLegacy = DataService.getPresupuestoTotal(presLegacy);
  assert(totalLegacy === 80000, `Total legacy esperado: 80.000, obtenido: ${totalLegacy}`);

  const pdfLegacy = generatePresupuestoHtml(presLegacy);
  assert(pdfLegacy.includes('Entrega y colocación'), 'PDF legacy unifica y muestra "Entrega y colocación"');
  assert(!pdfLegacy.includes('Colocación en obra'), 'PDF legacy NO exhibe "Colocación en obra"');
  assert(!pdfLegacy.includes('Flete / Transporte'), 'PDF legacy NO exhibe "Flete / Transporte"');
  assert(pdfLegacy.includes('$30.000') || pdfLegacy.includes('30.000'), 'PDF legacy suma colocación y transporte ($30.000)');
  console.log('  ✅ PASS: Presupuestos legacy se migran/muestran transparentemente como "Entrega y colocación"');
}

// ── TEST 4: INTERFAZ DE USUARIO (DRAWER DE CREACIÓN Y EDICIÓN) ──
console.log('\n--- 4. INTERFAZ DE USUARIO: DRAWER, INPUTS Y CÁLCULO EN VIVO ---');
{
  openPresupuestoForm();
  const drawerEl = document.querySelector('.drawer');
  assert(drawerEl, 'Drawer de nuevo presupuesto abierto en DOM');

  // Verificar existencia de los nuevos inputs en el DOM del drawer
  const inputEntregaColocacion = drawerEl.querySelector('input[name="adic_entregaColocacion"]');
  const inputMensulas = drawerEl.querySelector('input[name="adic_mensulas"]');
  const inputAcarreo = drawerEl.querySelector('input[name="adic_acarreo"]');
  const inputPorEscalera = drawerEl.querySelector('input[name="adic_porEscalera"]');
  const inputTraforoBachaAnafe = drawerEl.querySelector('input[name="adic_traforoBachaAnafe"]');
  const inputTraforoCajas = drawerEl.querySelector('input[name="adic_traforoCajasLuzGas"]');
  const inputTraforoDesague = drawerEl.querySelector('input[name="adic_traforoDesague"]');

  assert(inputEntregaColocacion, 'Input "adic_entregaColocacion" presente en el DOM');
  assert(inputMensulas, 'Input "adic_mensulas" presente en el DOM');
  assert(inputAcarreo, 'Input "adic_acarreo" presente en el DOM');
  assert(inputPorEscalera, 'Input "adic_porEscalera" presente en el DOM');
  assert(inputTraforoBachaAnafe, 'Input "adic_traforoBachaAnafe" presente en el DOM');
  assert(inputTraforoCajas, 'Input "adic_traforoCajasLuzGas" presente en el DOM');
  assert(inputTraforoDesague, 'Input "adic_traforoDesague" presente en el DOM');

  // Verificar que NO existan inputs viejos separados
  assert(!drawerEl.querySelector('input[name="adic_colocacion"]'), 'Input "adic_colocacion" ya NO existe en el formulario');
  assert(!drawerEl.querySelector('input[name="adic_transporte"]'), 'Input "adic_transporte" ya NO existe en el formulario');
  assert(!drawerEl.querySelector('input[name="adic_entrega"]'), 'Input "adic_entrega" ya NO existe en el formulario');

  // Verificar etiquetas visibles en el formulario
  const labels = Array.from(drawerEl.querySelectorAll('.presupuesto-adicionales .form-label')).map(l => l.textContent.trim());
  assert(labels.includes('Entrega y colocación'), 'Etiqueta "Entrega y colocación" visible');
  assert(labels.includes('Ménsulas'), 'Etiqueta "Ménsulas" visible');
  assert(labels.includes('Acarreo'), 'Etiqueta "Acarreo" visible');
  assert(labels.includes('Por escalera'), 'Etiqueta "Por escalera" visible');
  assert(labels.includes('Trafóro bacha y/o anafe'), 'Etiqueta "Trafóro bacha y/o anafe" visible');
  assert(labels.includes('Trafóro cajas de luz y/o gas'), 'Etiqueta "Trafóro cajas de luz y/o gas" visible');
  assert(labels.includes('Trafóro de desagüe'), 'Etiqueta "Trafóro de desagüe" visible');
  assert(!labels.includes('Colocación'), 'Etiqueta "Colocación" separada NO existe');
  assert(!labels.includes('Transporte'), 'Etiqueta "Transporte" separada NO existe');

  console.log('  ✅ PASS: Formulario del drawer renderiza correctamente todos los nuevos campos y unifica Entrega y colocación');

  // Simular ingreso de valores y verificar resumen reactivo
  inputEntregaColocacion.value = '25000';
  inputMensulas.value = '10000';
  inputAcarreo.value = '5000';
  inputEntregaColocacion.dispatchEvent(new Event('input', { bubbles: true }));

  const summaryEl = drawerEl.querySelector('#pres-summary');
  assert(summaryEl, 'Elemento de resumen presente');
  assert(summaryEl.textContent.includes('40.000'), `Resumen calcula suma de adicionales ($40.000): ${summaryEl.textContent}`);
  console.log('  ✅ PASS: Cálculo dinámico de campos adicionales en el resumen del drawer funciona en tiempo real');
}

// ── TEST 5: EDICIÓN DE UN PRESUPUESTO EXISTENTE Y PERSISTENCIA ──
console.log('\n--- 5. EDICIÓN Y PERSISTENCIA DE ADICIONALES ---');
{
  const { renderPresupuestos } = await import('../frontend/js/pages/presupuestos.js');

  const cli = DataService.create('clientes', { nombre: 'Mariana', apellido: 'López' });

  const presCreado = DataService.create('presupuestos', {
    numero: 'PRES-EDIT-001',
    clienteId: cli.id,
    clienteNombre: 'Mariana López',
    items: [{ id: 'item-1', descripcion: 'Mesada cocina', m2: 2.0, precioUnitario: 80000, subtotal: 160000 }],
    adicionales: {
      entregaColocacion: 30000,
      mensulas: 12000,
      traforoBachaAnafe: 15000
    },
    descuento: 0,
    impuestos: 21,
    moneda: 'ARS',
    estado: 'borrador'
  });

  // Abrir formulario en modo edición
  openPresupuestoForm(presCreado.id);
  const drawerEl = document.querySelector('.drawer');
  assert(drawerEl, 'Drawer abierto para edición');

  const inputEntregaColocacion = drawerEl.querySelector('input[name="adic_entregaColocacion"]');
  const inputMensulas = drawerEl.querySelector('input[name="adic_mensulas"]');
  const inputTraforo = drawerEl.querySelector('input[name="adic_traforoBachaAnafe"]');
  const inputAcarreo = drawerEl.querySelector('input[name="adic_acarreo"]');

  assert(inputEntregaColocacion.value === '30000', 'Input entregaColocacion precarga 30000');
  assert(inputMensulas.value === '12000', 'Input mensulas precarga 12000');
  assert(inputTraforo.value === '15000', 'Input traforoBachaAnafe precarga 15000');
  assert(inputAcarreo.value === '0', 'Input acarreo inicia en 0');

  // Modificar valores
  inputAcarreo.value = '7000';
  inputAcarreo.setAttribute('value', '7000');
  inputMensulas.value = '18000';
  inputMensulas.setAttribute('value', '18000');

  // Simular guardado haciendo click en el botón de guardar
  const saveBtn = drawerEl.querySelector('#drawer-save') || drawerEl.querySelector('#drawer-header-save') || drawerEl.querySelector('#btn-inline-save');
  assert(saveBtn, 'Botón de guardar presente en el drawer');
  saveBtn.click();

  const presActualizado = DataService.getById('presupuestos', presCreado.id);
  console.log('presActualizado.adicionales:', presActualizado?.adicionales);
  assert(presActualizado.adicionales.entregaColocacion === 30000, 'Persiste entregaColocacion 30000');
  assert(presActualizado.adicionales.mensulas === 18000, 'Persiste mensulas actualizado a 18000');
  assert(presActualizado.adicionales.acarreo === 7000, 'Persiste acarreo nuevo en 7000');
  assert(presActualizado.adicionales.traforoBachaAnafe === 15000, 'Persiste traforoBachaAnafe en 15000');
  assert(presActualizado.adicionales.colocacion === undefined, 'No persiste campo separado colocacion');
  assert(presActualizado.adicionales.transporte === undefined, 'No persiste campo separado transporte');

  console.log('  ✅ PASS: Edición y guardado de presupuesto persiste correctamente los nuevos adicionales y unifica Entrega y colocación');

  // ── TEST 6: DETALLE DEL PRESUPUESTO EN DOM ──
  console.log('\n--- 6. VISTA DETALLE DEL PRESUPUESTO EN DOM ---');
  const container = document.createElement('div');
  const actions = document.createElement('div');
  renderPresupuestos(container, actions, `/presupuestos/${presActualizado.id}`);

  assert(container.innerHTML.includes('Entrega y colocación'), 'Detalle incluye "Entrega y colocación"');
  assert(container.innerHTML.includes('Ménsulas'), 'Detalle incluye "Ménsulas"');
  assert(container.innerHTML.includes('Acarreo'), 'Detalle incluye "Acarreo"');
  assert(container.innerHTML.includes('Trafóro bacha y/o anafe'), 'Detalle incluye "Trafóro bacha y/o anafe"');
  assert(!container.innerHTML.includes('Colocación:'), 'Detalle NO incluye "Colocación:" separada');
  assert(!container.innerHTML.includes('Transporte:'), 'Detalle NO incluye "Transporte:" separada');
  console.log('  ✅ PASS: Vista de detalle muestra correctamente todos los adicionales configurados y ningún campo separado');
}

console.log('\n===============================================================');
console.log('🎉 TODAS LAS PRUEBAS DE CAMPOS ADICIONALES Y PURASTONE PASARON');
console.log('===============================================================');
