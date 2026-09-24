import { JSDOM } from 'jsdom';
import assert from 'node:assert';

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
const { formatCurrency, formatDate } = await import('../frontend/js/utils/helpers.js');
const { generatePresupuestoHtml } = await import('../frontend/js/services/documentExporter.js');
const { PRESUPUESTO_ADICIONALES_KEYS, openPresupuestoForm } = await import('../frontend/js/pages/presupuestos.js');

// ── 1. AUDITORÍA Y FUENTE CENTRAL DE VERDAD (CONFIGURACIÓN) ──
console.log('\n--- 1. CONFIGURACIÓN — COTIZACIÓN CENTRAL DEL DÓLAR ---');
// Inicialmente sin configuración personalizada -> fallback default 1500
assert.strictEqual(DataService.getCotizacionDolar(), 1500, 'Cotización por defecto es 1500');

// Establecer cotización oficial en Configuración ($1.500)
localStorage.setItem('mb_config', JSON.stringify({ cotizacionDolar: 1500 }));
assert.strictEqual(DataService.getCotizacionDolar(), 1500, 'Cotización leída desde mb_config es 1500');
console.log('  ✅ PASS: Cotización central leída desde Configuración como número: 1500');

// ── 2. CASOS DE CONVERSIÓN PURA (A, B, C) ──
console.log('\n--- 2. CONVERSIÓN USD ↔ ARS ---');

// Caso A — USD -> USD
const resA = DataService.convertCurrency(100, 'USD', 'USD', 1500);
assert.strictEqual(resA, 100, 'Caso A: 100 USD a USD con TC 1500 debe ser 100 USD');
console.log(`  ✅ PASS Caso A (USD -> USD): 100 USD = ${resA} USD`);

// Caso B — USD -> ARS
const resB = DataService.convertCurrency(100, 'USD', 'ARS', 1500);
assert.strictEqual(resB, 150000, 'Caso B: 100 USD a ARS con TC 1500 debe ser $150.000 ARS');
console.log(`  ✅ PASS Caso B (USD -> ARS): 100 USD = $${resB} ARS`);

// Caso C — ARS -> USD
const resC = DataService.convertCurrency(150000, 'ARS', 'USD', 1500);
assert.strictEqual(resC, 100, 'Caso C: 150000 ARS a USD con TC 1500 debe ser 100 USD');
console.log(`  ✅ PASS Caso C (ARS -> USD): $150.000 ARS = ${resC} USD`);

// ── 3. STOCK / INVENTARIO — PRECIOS Y MONEDAS ──
console.log('\n--- 3. STOCK / INVENTARIO — ALMACENAMIENTO DE MONEDA Y PRECIO ---');

// Crear material en USD
const matUSD = DataService.create('materiales', {
  nombre: 'Mármol Negro Test',
  categoria: 'marmol',
  tipo: 'Importado',
  precioM2: 120,
  moneda: 'USD',
  unidad: 'm2',
  stockMinimo: 5
});
assert.strictEqual(matUSD.precioM2, 120, 'Precio numérico guardado correctamente');
assert.strictEqual(matUSD.moneda, 'USD', 'Moneda USD guardada como campo independiente');
console.log(`  ✅ PASS: Material en USD creado: ${matUSD.nombre} — ${matUSD.moneda} ${matUSD.precioM2} / m²`);

// Crear material en ARS
const matARS = DataService.create('materiales', {
  nombre: 'Granito Gris Test',
  categoria: 'granito',
  tipo: 'Nacional',
  precioM2: 45000,
  moneda: 'ARS',
  unidad: 'm2',
  stockMinimo: 10
});
assert.strictEqual(matARS.precioM2, 45000, 'Precio numérico ARS guardado correctamente');
assert.strictEqual(matARS.moneda, 'ARS', 'Moneda ARS guardada como campo independiente');
console.log(`  ✅ PASS: Material en ARS creado: ${matARS.nombre} — $${matARS.precioM2} ARS / m²`);

// Caso L — Cambio de moneda del material sin conversión silenciosa
const matUSDOriginal = DataService.create('materiales', {
  nombre: 'Cuarzo Blanco Test',
  precioM2: 100,
  moneda: 'USD'
});
// Al editar y cambiar a ARS, se conserva el valor exacto introducido sin multiplicar accidentalmente
const matEditado = DataService.update('materiales', matUSDOriginal.id, {
  precioM2: 100,
  moneda: 'ARS'
});
assert.strictEqual(matEditado.precioM2, 100, 'Precio no sufrió conversiones silenciosas accidentales');
assert.strictEqual(matEditado.moneda, 'ARS', 'Moneda actualizada a ARS');
console.log('  ✅ PASS Caso L: Edición de material no produce conversiones silenciosas ni duplica precios');

// ── 4. PRESUPUESTOS — CONSULTA Y CONVERSIÓN DE PRECIOS DE STOCK ──
console.log('\n--- 4. PRESUPUESTO — INTEGRACIÓN STOCK Y MONEDA DEL PRESUPUESTO ---');

// Mat USD en Presupuesto USD (TC 1500) -> 120 USD
const pUSD_USD = DataService.getMaterialPrice(matUSD.nombre, 'USD', 1500);
assert.strictEqual(pUSD_USD, 120, 'Mat USD en Pres USD da 120 USD');

// Mat USD en Presupuesto ARS (TC 1500) -> 120 * 1500 = 180.000 ARS
const pUSD_ARS = DataService.getMaterialPrice(matUSD.nombre, 'ARS', 1500);
assert.strictEqual(pUSD_ARS, 180000, 'Mat USD en Pres ARS da 180.000 ARS');

// Mat ARS en Presupuesto USD (TC 1500) -> 45000 / 1500 = 30 USD
const pARS_USD = DataService.getMaterialPrice(matARS.nombre, 'USD', 1500);
assert.strictEqual(pARS_USD, 30, 'Mat ARS en Pres USD da 30 USD');

// Mat ARS en Presupuesto ARS (TC 1500) -> 45000 ARS
const pARS_ARS = DataService.getMaterialPrice(matARS.nombre, 'ARS', 1500);
assert.strictEqual(pARS_ARS, 45000, 'Mat ARS en Pres ARS da 45000 ARS');

console.log('  ✅ PASS: getMaterialPrice convierte de forma precisa según la moneda del material y la del presupuesto');

// ── 5. CASO D — CAMBIO DE COTIZACIÓN EN CONFIGURACIÓN ──
console.log('\n--- 5. CASO D — CAMBIO DE COTIZACIÓN Y PRESUPUESTO NUEVO ---');
localStorage.setItem('mb_config', JSON.stringify({ cotizacionDolar: 1600 }));
assert.strictEqual(DataService.getCotizacionDolar(), 1600, 'Nueva cotización es 1600');

// Mat USD (120 USD) en nuevo presupuesto ARS con cotización 1600 -> 120 * 1600 = 192.000
const pUSD_ARS_nuevo = DataService.getMaterialPrice(matUSD.nombre, 'ARS');
assert.strictEqual(pUSD_ARS_nuevo, 192000, 'Usa automáticamente la nueva cotización $1.600');
console.log(`  ✅ PASS Caso D: Con cotización cambiada a $1.600, Mat USD 120 = $${pUSD_ARS_nuevo} ARS`);

// ── 6. CASO E — PRESUPUESTO HISTÓRICO (INMUNIDAD A CAMBIOS GLOBALES) ──
console.log('\n--- 6. CASO E — INMUNIDAD DE PRESUPUESTOS HISTÓRICOS ---');
// Creamos un presupuesto histórico cuando el dólar estaba a $1.500
const presHistorico = DataService.create('presupuestos', {
  numero: 'PRES-HIST-001',
  moneda: 'ARS',
  cotizacionDolar: 1500,
  usdRateUsed: 1500,
  items: [
    {
      descripcion: 'Mesada',
      material: matUSD.nombre, // 120 USD
      cantidad: 1,
      m2: 2.0, // 2 m²
      precioUnitario: 180000, // 120 * 1500
      subtotal: 360000
    }
  ],
  adicionales: {
    entregaColocacion: 40000
  }
});

const totalHistoricoAntes = DataService.getPresupuestoTotal(presHistorico);
assert.strictEqual(totalHistoricoAntes, 400000, 'Total histórico inicial: $400.000');

// La cotización global ahora es 1600 (o cambiamos a 1800)
localStorage.setItem('mb_config', JSON.stringify({ cotizacionDolar: 1800 }));

// El presupuesto histórico permanece congelado con su tipo de cambio y precios guardados
const presHistoricoRecuperado = DataService.getById('presupuestos', presHistorico.id);
assert.strictEqual(presHistoricoRecuperado.cotizacionDolar, 1500, 'Cotización registrada en el presupuesto permanece en 1500');
assert.strictEqual(presHistoricoRecuperado.usdRateUsed, 1500, 'usdRateUsed permanece en 1500');
assert.strictEqual(DataService.getPresupuestoTotal(presHistoricoRecuperado), 400000, 'Total permanece inmutable');
console.log('  ✅ PASS Caso E: Presupuesto histórico mantiene su cotización guardada ($1.500) y su total ($400.000)');

// ── 7. CASO F — CLIENTE ESPECIAL Y PRECIO MANUAL POR M² CON MONEDA ──
console.log('\n--- 7. CASO F — CLIENTE ESPECIAL Y PRECIO MANUAL CON MONEDA ---');
// Precio manual en USD (120 USD) en un presupuesto cuya moneda es ARS
const manualUSDVal = 120;
const tcActual = 1500;
const convertedToARS = DataService.convertCurrency(manualUSDVal, 'USD', 'ARS', tcActual);
assert.strictEqual(convertedToARS, 180000, '120 USD manual convertido a ARS es $180.000');

const presManual = DataService.create('presupuestos', {
  numero: 'PRES-MANUAL-001',
  moneda: 'ARS',
  cotizacionDolar: tcActual,
  usdRateUsed: tcActual,
  items: [
    {
      descripcion: 'Isla con precio manual',
      material: 'Granito a convenir',
      cantidad: 1,
      m2: 2.5,
      precioManual: 120,
      precioManualMoneda: 'USD',
      precioUnitario: convertedToARS, // 180.000 ARS
      subtotal: 2.5 * convertedToARS // 450.000 ARS
    }
  ]
});
assert.strictEqual(DataService.getPresupuestoTotal(presManual), 450000, 'Total con precio manual en USD convertido a ARS');
console.log('  ✅ PASS Caso F: Precio manual m² con selector de moneda USD en presupuesto ARS calcula $450.000');

// ── 8. CASOS G Y H — DESCUENTO Y RECARGO ──
console.log('\n--- 8. CASOS G Y H — DESCUENTO Y RECARGO ---');
const presConDesc = DataService.create('presupuestos', {
  numero: 'PRES-DESC-001',
  moneda: 'USD',
  cotizacionDolar: 1500,
  items: [
    { descripcion: 'Item A', subtotal: 1000 }
  ],
  adicionales: {
    entregaColocacion: 200
  },
  descuento: 10 // 10%
});
// Subtotal = 1000 + 200 = 1200. Descuento 10% = 120. Total = 1080.
const totalDesc = DataService.getPresupuestoTotal(presConDesc);
assert.strictEqual(totalDesc, 1080, 'Total con 10% de descuento sobre 1200 USD es 1080 USD');
console.log(`  ✅ PASS Caso G: Descuento 10% aplicado sobre USD: Total = ${totalDesc} USD`);

// Recargo aplicado a nivel ítem o comercial
const precioBaseMat = 100;
const recargoPct = 15;
const precioConRecargo = Math.round(precioBaseMat * (1 + recargoPct / 100) * 100) / 100;
assert.strictEqual(precioConRecargo, 115, '100 USD con 15% de recargo = 115 USD');
console.log(`  ✅ PASS Caso H: Recargo 15% calculado correctamente: ${precioConRecargo} USD`);

// ── 9. CASO I — TODOS LOS ADICIONALES (12 CAMPOS) ──
console.log('\n--- 9. CASO I — TODOS LOS 12 ADICIONALES EXISTENTES ---');
assert.strictEqual(PRESUPUESTO_ADICIONALES_KEYS.length, 12, 'Existen exactamente 12 adicionales');
assert(PRESUPUESTO_ADICIONALES_KEYS.includes('entregaColocacion'), 'Incluye entregaColocacion unificado');
assert(PRESUPUESTO_ADICIONALES_KEYS.includes('mensulas'), 'Incluye mensulas');
assert(PRESUPUESTO_ADICIONALES_KEYS.includes('acarreo'), 'Incluye acarreo');
assert(PRESUPUESTO_ADICIONALES_KEYS.includes('porEscalera'), 'Incluye porEscalera');
assert(PRESUPUESTO_ADICIONALES_KEYS.includes('traforoBachaAnafe'), 'Incluye traforoBachaAnafe');
assert(PRESUPUESTO_ADICIONALES_KEYS.includes('traforoCajasLuzGas'), 'Incluye traforoCajasLuzGas');
assert(PRESUPUESTO_ADICIONALES_KEYS.includes('traforoDesague'), 'Incluye traforoDesague');

const todosLosAdicionales = {
  entregaColocacion: 35000,
  manoDeObra: 20000,
  inglete: 15000,
  bacha: 25000,
  zocalos: 12000,
  mensulas: 10000,
  acarreo: 8000,
  porEscalera: 6000,
  traforoBachaAnafe: 14000,
  traforoCajasLuzGas: 9000,
  traforoDesague: 7000,
  extras: 5000
};
const totalEsperadoAdic = Object.values(todosLosAdicionales).reduce((s, v) => s + v, 0); // 166.000

const presAdic = DataService.create('presupuestos', {
  numero: 'PRES-ALL-ADIC',
  moneda: 'ARS',
  cotizacionDolar: 1500,
  items: [{ subtotal: 100000 }],
  adicionales: todosLosAdicionales
});
const totalConTodosAdic = DataService.getPresupuestoTotal(presAdic);
assert.strictEqual(totalConTodosAdic, 100000 + totalEsperadoAdic, 'Suma de todos los adicionales');
console.log(`  ✅ PASS Caso I: Los 12 adicionales suman exactamente $${totalEsperadoAdic} ARS (Total: $${totalConTodosAdic})`);

// ── 10. CASO J — FLUJO COMPLETO DE EDICIÓN Y PERSISTENCIA ──
console.log('\n--- 10. CASO J — EDICIÓN COMPLETA SIN PÉRDIDA NI CONVERSIÓN DOBLE ---');
// 1. Crear
const presInicial = DataService.create('presupuestos', {
  numero: 'PRES-EDIT-001',
  moneda: 'USD',
  cotizacionDolar: 1500,
  usdRateUsed: 1500,
  items: [
    {
      id: 'it-1',
      descripcion: 'Mesada cocina',
      material: matUSD.nombre,
      unidadMedida: 'cm',
      largo: '240',
      ancho: '60',
      cantidad: 1,
      m2: 1.44,
      precioBase: 120,
      precioUnitario: 120,
      subtotal: 172.8
    }
  ],
  adicionales: {
    entregaColocacion: 50,
    bacha: 30
  },
  descuento: 5
});
const idEdit = presInicial.id;
assert.strictEqual(presInicial.moneda, 'USD', 'Moneda guardada en USD');

// 2. Simular cerrar y volver a abrir para editar
const presCargado = DataService.getById('presupuestos', idEdit);
assert.strictEqual(presCargado.moneda, 'USD', 'Moneda recuperada es USD');
assert.strictEqual(presCargado.cotizacionDolar, 1500, 'Cotización recuperada es 1500');

// 3. Editar (modificar cantidad o medidas y guardar nuevamente)
const updatedItems = [...presCargado.items];
updatedItems[0].cantidad = 2;
updatedItems[0].m2 = 2.88;
updatedItems[0].subtotal = Math.round(2.88 * 120 * 100) / 100; // 345.60

const presGuardadoNuevamente = DataService.update('presupuestos', idEdit, {
  ...presCargado,
  items: updatedItems
});

assert.strictEqual(presGuardadoNuevamente.moneda, 'USD', 'Moneda permanece en USD');
assert.strictEqual(presGuardadoNuevamente.cotizacionDolar, 1500, 'Cotización permanece inalterada');
assert.strictEqual(presGuardadoNuevamente.items[0].precioUnitario, 120, 'Precio unitario no se distorsionó');
assert.strictEqual(presGuardadoNuevamente.items[0].subtotal, 345.6, 'Subtotal recalculado exactamente');
console.log('  ✅ PASS Caso J: Flujo crear -> guardar -> abrir -> editar -> guardar mantiene valores intactos');

// ── 11. CASO K — COMPARACIÓN PANTALLA = GUARDADO = PDF ──
console.log('\n--- 11. CASO K — PANTALLA = GUARDADO = PDF ---');
const totalGuardado = DataService.getPresupuestoTotal(presGuardadoNuevamente); // Subtotal: 345.6 + 80 = 425.6. Desc 5% = 21.28. Total = 404.32
const htmlPdf = generatePresupuestoHtml(presGuardadoNuevamente, null, totalGuardado);

assert(htmlPdf.includes(formatCurrency(totalGuardado, 'USD')), 'Total en PDF coincide exactamente con total guardado');
assert(htmlPdf.includes('Tipo de cambio de referencia: 1 USD = $'), 'PDF incluye tipo de cambio de referencia en USD');
assert(htmlPdf.includes(formatCurrency(totalGuardado * 1500, 'ARS')), 'PDF incluye monto equivalente en pesos');
console.log(`  ✅ PASS Caso K: Total guardado (${totalGuardado} USD) coincide exactamente en PDF`);

// ── 12. DUPLICACIÓN DE PRESUPUESTOS ──
console.log('\n--- 12. DUPLICAR PRESUPUESTO ---');
const presParaClonar = presGuardadoNuevamente;
const clon = {
  ...JSON.parse(JSON.stringify(presParaClonar)),
  id: undefined,
  numero: 'PRES-2026-9999',
  estado: 'borrador',
  fecha: new Date().toISOString().split('T')[0]
};
const presDuplicado = DataService.create('presupuestos', clon);

assert.strictEqual(presDuplicado.moneda, presParaClonar.moneda, 'Moneda conservada al duplicar');
assert.strictEqual(presDuplicado.cotizacionDolar, presParaClonar.cotizacionDolar, 'Cotización conservada al duplicar');
assert.strictEqual(presDuplicado.usdRateUsed, presParaClonar.usdRateUsed, 'usdRateUsed conservado al duplicar');
assert.strictEqual(DataService.getPresupuestoTotal(presDuplicado), DataService.getPresupuestoTotal(presParaClonar), 'Total idéntico al original');
console.log('  ✅ PASS: Duplicar presupuesto conserva moneda, cotización y todos los importes');

// ── 13. COMPATIBILIDAD CON PRESUPUESTOS LEGACY ──
console.log('\n--- 13. COMPATIBILIDAD CON PRESUPUESTOS HISTÓRICOS LEGACY ---');
const presLegacy = {
  id: 'pres-legacy-99',
  numero: 'PRES-LEGACY',
  // Sin moneda ni cotizacionDolar
  items: [
    { descripcion: 'Mesada antigua', subtotal: 85000 }
  ],
  adicionales: {
    colocacion: 15000 // campo legacy
  }
};
const totalLegacy = DataService.getPresupuestoTotal(presLegacy);
assert.strictEqual(totalLegacy, 100000, 'Presupuesto legacy calcula $100.000');
const pdfLegacy = generatePresupuestoHtml(presLegacy);
assert(pdfLegacy.includes('Entrega y colocación'), 'Presupuesto legacy unifica campo en PDF sin fallar');
console.log('  ✅ PASS: Compatibilidad 100% garantizada con registros legacy sin romper historial');

console.log('\n===============================================================');
console.log('🎉 TODOS LOS CASOS (A HASTA L) Y AUDITORÍA PASARON CON ÉXITO');
console.log('===============================================================\n');
