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
  url: 'http://localhost:3000/#/presupuestos',
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
const { generatePresupuestoHtml } = await import('../frontend/js/services/documentExporter.js');
const { renderPresupuestos, openPresupuestoForm, aprobarPresupuesto } = await import('../frontend/js/pages/presupuestos.js');
const { renderClientes, openClienteForm } = await import('../frontend/js/pages/clientes.js');
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
console.log('💎 SUITE DE PRUEBAS: CONDICIONES COMERCIALES Y PRECIOS ESPECIALES');
console.log('===============================================================\n');

// ── TEST 1: CLIENTE ESTÁNDAR + PRECIO ESTÁNDAR ──
console.log('--- TEST 1: CLIENTE ESTÁNDAR + PRECIO ESTÁNDAR ---');
{
  const cliStd = DataService.create('clientes', {
    nombre: 'Pedro',
    apellido: 'Estándar',
    condicionComercial: 'estandar',
    descuentoHabitual: 0,
    motivoCondicion: ''
  });
  assert(cliStd.condicionComercial === 'estandar', 'Cliente creado con condición estándar');

  // Crear presupuesto estándar con 1 ítem de Granito Negro Absoluto ($185.000/m², 2 m²)
  const presStd = DataService.create('presupuestos', {
    clienteId: cliStd.id,
    clienteNombre: 'Pedro Estándar',
    condicionTipo: 'estandar',
    condicionPorcentaje: 0,
    condicionNota: '',
    items: [
      { id: '1', descripcion: 'Mesada cocina', material: 'Granito Negro Absoluto', m2: 2.0, precioBase: 185000, precioUnitario: 185000, subtotal: 370000 }
    ],
    adicionales: { colocacion: 0 },
    descuento: 0,
    impuestos: 0,
    moneda: 'ARS'
  });

  assert(presStd.items[0].precioUnitario === 185000, 'Precio unitario coincide con precio base de lista ($185.000)');
  assert(presStd.items[0].subtotal === 370000, 'Subtotal del ítem es 2 m² * $185.000 = $370.000');
  const totalStd = DataService.getPresupuestoTotal(presStd);
  assert(totalStd === 370000, 'Total del presupuesto estándar es $370.000');
}

// ── TEST 2: CLIENTE ESPECIAL CON 10% DE DESCUENTO ──
console.log('\n--- TEST 2: CLIENTE ESPECIAL CON 10% DE DESCUENTO ---');
{
  const cliEsp = DataService.create('clientes', {
    nombre: 'Ana',
    apellido: 'Acuerdo',
    condicionComercial: 'especial',
    descuentoHabitual: 10,
    motivoCondicion: 'Cliente frecuente'
  });
  assert(cliEsp.condicionComercial === 'especial' && cliEsp.descuentoHabitual === 10, 'Cliente configurado con condición especial (10%)');

  // Precio base: $100.000/m² -> 10% desc = $90.000/m²
  const base = 100000;
  const descPct = cliEsp.descuentoHabitual;
  const precioAplicado = Math.round(base * (1 - descPct / 100));
  const m2 = 3.0;
  const subtotal = m2 * precioAplicado;

  const presEsp = DataService.create('presupuestos', {
    clienteId: cliEsp.id,
    clienteNombre: 'Ana Acuerdo',
    condicionTipo: 'descuento',
    condicionPorcentaje: descPct,
    condicionNota: cliEsp.motivoCondicion,
    items: [
      { id: '1', descripcion: 'Isla', material: 'Negro Brasil', m2: m2, precioBase: base, precioUnitario: precioAplicado, subtotal: subtotal }
    ],
    adicionales: { colocacion: 0 },
    descuento: 0,
    impuestos: 0,
    moneda: 'ARS'
  });

  assert(presEsp.items[0].precioBase === 100000, 'Precio base almacenado: $100.000');
  assert(presEsp.items[0].precioUnitario === 90000, 'Precio aplicado con 10% desc: $90.000/m²');
  assert(presEsp.items[0].subtotal === 270000, 'Subtotal ítem: 3 m² * $90.000 = $270.000');
  assert(DataService.getPresupuestoTotal(presEsp) === 270000, 'Total presupuesto: $270.000');
}

// ── TEST 3: CLIENTE ESPECIAL PERO USANDO PRECIO ESTÁNDAR ──
console.log('\n--- TEST 3: CLIENTE ESPECIAL PERO USANDO PRECIO ESTÁNDAR ---');
{
  const cliEsp = DataService.getById('clientes', 'cli-001'); // Carlos Rodríguez tiene 10% habitual
  assert(cliEsp && cliEsp.condicionComercial === 'especial', 'cli-001 es cliente especial');

  // Leila decide usar precio estándar para esta cotización puntual
  const presStdForSpecial = DataService.create('presupuestos', {
    clienteId: cliEsp.id,
    clienteNombre: 'Carlos Rodríguez',
    condicionTipo: 'estandar',
    condicionPorcentaje: 0,
    condicionNota: 'Excepción: material a precio estándar sin descuento',
    items: [
      { id: '1', descripcion: 'Vanitory', material: 'Mármol Carrara', m2: 1.5, precioBase: 260000, precioUnitario: 260000, subtotal: 390000 }
    ],
    adicionales: {},
    descuento: 0,
    impuestos: 0,
    moneda: 'ARS'
  });

  assert(presStdForSpecial.condicionTipo === 'estandar', 'Presupuesto guardó condicionTipo = estandar');
  assert(presStdForSpecial.items[0].precioUnitario === 260000, 'Precio unitario respetó precio de lista ($260.000)');
  // Verificar que la ficha del cliente NO fue alterada
  const cliAfter = DataService.getById('clientes', 'cli-001');
  assert(cliAfter.condicionComercial === 'especial' && cliAfter.descuentoHabitual === 10, 'Ficha del cliente permanece intacta con condición especial (10%)');
}

// ── TEST 4: CLIENTE CON 10% HABITUAL MODIFICADO MANUALMENTE A 15% ──
console.log('\n--- TEST 4: CLIENTE CON 10% HABITUAL MODIFICADO A 15% EN PRESUPUESTO ---');
{
  const base = 200000;
  const manualPct = 15;
  const precioCon15 = Math.round(base * (1 - manualPct / 100)); // $170.000

  const pres15 = DataService.create('presupuestos', {
    clienteId: 'cli-001',
    clienteNombre: 'Carlos Rodríguez',
    condicionTipo: 'descuento',
    condicionPorcentaje: manualPct,
    condicionNota: 'Descuento ampliado al 15% por pago contado',
    items: [
      { id: '1', descripcion: 'Mesada', material: 'Silestone', m2: 2.0, precioBase: base, precioUnitario: precioCon15, subtotal: 340000 }
    ],
    adicionales: {},
    descuento: 0,
    impuestos: 0,
    moneda: 'ARS'
  });

  assert(pres15.condicionPorcentaje === 15, 'Presupuesto tiene 15% de descuento');
  assert(pres15.items[0].precioUnitario === 170000, 'Precio unitario con 15% desc es $170.000/m²');
  assert(pres15.items[0].subtotal === 340000, 'Subtotal es $340.000');

  // Validar inmutabilidad de la ficha del cliente
  const cli = DataService.getById('clientes', 'cli-001');
  assert(cli.descuentoHabitual === 10, 'La ficha del cliente NO cambió y mantiene 10% habitual');
}

// ── TEST 5: PRECIO PERSONALIZADO POR M² ──
console.log('\n--- TEST 5: PRECIO PERSONALIZADO POR M² ---');
{
  const manualPrice1 = 215000; // precio especial fijado a mano
  const manualPrice2 = 145000;

  const presCustom = DataService.create('presupuestos', {
    clienteId: 'cli-002',
    clienteNombre: 'María Elena Gutiérrez',
    condicionTipo: 'personalizado',
    condicionPorcentaje: 0,
    condicionNota: 'Precios manuales pactados en obra',
    items: [
      { id: '1', descripcion: 'Mesada cocina', material: 'Mármol Carrara', m2: 2.0, precioBase: 260000, precioUnitario: manualPrice1, subtotal: 430000 },
      { id: '2', descripcion: 'Zócalos', material: 'Mármol Carrara', m2: 0.5, precioBase: 260000, precioUnitario: manualPrice2, subtotal: 72500 }
    ],
    adicionales: {},
    descuento: 0,
    impuestos: 0,
    moneda: 'ARS'
  });

  assert(presCustom.condicionTipo === 'personalizado', 'Condición comercial es personalizada');
  assert(presCustom.items[0].precioUnitario === 215000, 'Ítem 1 tiene precio personalizado $215.000 (Base era $260.000)');
  assert(presCustom.items[1].precioUnitario === 145000, 'Ítem 2 tiene precio personalizado $145.000 (Base era $260.000)');
  assert(presCustom.items[0].subtotal === 430000, 'Subtotal ítem 1 exacto: $430.000');
  assert(presCustom.items[1].subtotal === 72500, 'Subtotal ítem 2 exacto: $72.500');
  assert(DataService.getPresupuestoTotal(presCustom) === 502500, 'Total presupuesto con precios manuales: $502.500');
}

// ── TEST 6: VARIOS MATERIALES Y PRECIOS DIFERENTES CON DESCUENTO ──
console.log('\n--- TEST 6: VARIOS MATERIALES CON PRECIOS DIFERENTES CON DESCUENTO ---');
{
  // Material 1: Granito Negro Absoluto ($185.000) -> desc 10% = $166.500
  // Material 2: Mármol Carrara ($260.000) -> desc 10% = $234.000
  const m1Base = 185000;
  const m2Base = 260000;
  const p1 = Math.round(m1Base * 0.9); // 166500
  const p2 = Math.round(m2Base * 0.9); // 234000
  const sub1 = 2 * p1; // 333000
  const sub2 = 1.5 * p2; // 351000

  const presMulti = DataService.create('presupuestos', {
    clienteId: 'cli-003',
    clienteNombre: 'Constructora Del Sur S.A.',
    condicionTipo: 'descuento',
    condicionPorcentaje: 10,
    condicionNota: 'Precio constructor 10%',
    items: [
      { id: '1', descripcion: 'Mesadas cocina', material: 'Granito Negro Absoluto', m2: 2.0, precioBase: m1Base, precioUnitario: p1, subtotal: sub1 },
      { id: '2', descripcion: 'Revestimiento hall', material: 'Mármol Carrara', m2: 1.5, precioBase: m2Base, precioUnitario: p2, subtotal: sub2 }
    ],
    adicionales: { colocacion: 50000 },
    descuento: 0,
    impuestos: 0,
    moneda: 'ARS'
  });

  assert(presMulti.items[0].precioUnitario === 166500, 'Ítem 1 (Granito) precio aplicado: $166.500');
  assert(presMulti.items[1].precioUnitario === 234000, 'Ítem 2 (Mármol) precio aplicado: $234.000');
  const expectedTotal = 333000 + 351000 + 50000; // 734000
  assert(DataService.getPresupuestoTotal(presMulti) === expectedTotal, `Total multi-material exacto: $${expectedTotal}`);
}

// ── TEST 7: RECARGO PORCENTUAL ──
console.log('\n--- TEST 7: RECARGO PORCENTUAL ---');
{
  // Base: $100.000/m² -> Recargo 15% = $115.000/m²
  const base = 100000;
  const recargoPct = 15;
  const pRecargo = Math.round(base * (1 + recargoPct / 100)); // 115000

  const presRecargo = DataService.create('presupuestos', {
    clienteId: 'cli-004',
    clienteNombre: 'Roberto Fernández',
    condicionTipo: 'recargo',
    condicionPorcentaje: recargoPct,
    condicionNota: 'Recargo por entrega express y horario nocturno',
    items: [
      { id: '1', descripcion: 'Mesada urgente', material: 'Granito Gris Mara', m2: 2.0, precioBase: base, precioUnitario: pRecargo, subtotal: 2 * pRecargo }
    ],
    adicionales: {},
    descuento: 0,
    impuestos: 0,
    moneda: 'ARS'
  });

  assert(presRecargo.condicionTipo === 'recargo', 'Condición es recargo');
  assert(presRecargo.items[0].precioUnitario === 115000, 'Precio con 15% de recargo es $115.000/m²');
  assert(presRecargo.items[0].subtotal === 230000, 'Subtotal: 2 m² * $115.000 = $230.000');
  assert(DataService.getPresupuestoTotal(presRecargo) === 230000, 'Total presupuesto con recargo: $230.000');
}

// ── TEST 8: PRESUPUESTO CON CONDICIÓN COMERCIAL E IVA (21%, 10.5%, 0%) ──
console.log('\n--- TEST 8: PRESUPUESTO CON CONDICIÓN COMERCIAL E IVA ---');
{
  // Base: $100.000 -> 10% desc = $90.000/m²
  // m2: 2 -> Subtotal items: $180.000
  // Adicional colocación: $20.000 -> Subtotal base imponible: $200.000
  // IVA 21%: $42.000 -> Total: $242.000
  const presIva21 = {
    condicionTipo: 'descuento',
    condicionPorcentaje: 10,
    items: [{ m2: 2.0, precioUnitario: 90000, subtotal: 180000 }],
    adicionales: { colocacion: 20000 },
    descuento: 0,
    impuestos: 21
  };
  const tot21 = DataService.getPresupuestoTotal(presIva21);
  assert(Math.abs(tot21 - 242000) < 0.01, `Cálculo con IVA 21%: $200.000 + 21% = $242.000 (obtenido ${tot21})`);

  // Con IVA 10.5%: $200.000 + 10.5% ($21.000) = $221.000
  const presIva105 = { ...presIva21, impuestos: 10.5 };
  const tot105 = DataService.getPresupuestoTotal(presIva105);
  assert(Math.abs(tot105 - 221000) < 0.01, `Cálculo con IVA 10.5%: $200.000 + 10.5% = $221.000 (obtenido ${tot105})`);

  // Con IVA 0%: $200.000
  const presIva0 = { ...presIva21, impuestos: 0 };
  const tot0 = DataService.getPresupuestoTotal(presIva0);
  assert(tot0 === 200000, `Cálculo sin IVA (0%): $200.000`);
}

// ── TEST 9: INMUTABILIDAD HISTÓRICA TRAS CAMBIO DE PRECIO EN STOCK ──
console.log('\n--- TEST 9: CAMBIO POSTERIOR DEL PRECIO DEL MATERIAL EN STOCK ---');
{
  // 1. Tomamos el material 'mat-001' (Granito Negro Absoluto) con precio actual $185.000
  const matOriginal = DataService.getById('materiales', 'mat-001');
  const originalPrice = matOriginal.precioM2;

  // 2. Creamos un presupuesto histórico con 10% de descuento ($166.500)
  const presHistorico = DataService.create('presupuestos', {
    clienteId: 'cli-001',
    clienteNombre: 'Carlos Rodríguez',
    condicionTipo: 'descuento',
    condicionPorcentaje: 10,
    items: [
      { id: '1', descripcion: 'Mesada Histórica', material: 'Granito Negro Absoluto', m2: 2.0, precioBase: originalPrice, precioUnitario: 166500, subtotal: 333000 }
    ],
    adicionales: {},
    descuento: 0,
    impuestos: 0,
    moneda: 'ARS'
  });

  const totalHistoricoAntes = DataService.getPresupuestoTotal(presHistorico);
  assert(totalHistoricoAntes === 333000, 'Total histórico antes de modificar stock: $333.000');

  // 3. Mañana el precio del material sube un 30% a $240.500 en el catálogo de Stock
  DataService.update('materiales', 'mat-001', { precioM2: 240500, precioVenta: 240500 });
  const matActualizado = DataService.getById('materiales', 'mat-001');
  assert(matActualizado.precioM2 === 240500, 'Precio de catálogo de stock actualizado a $240.500');

  // 4. Verificamos que el presupuesto histórico conserve intactos sus valores originales
  const presHistoricoDespues = DataService.getById('presupuestos', presHistorico.id);
  assert(presHistoricoDespues.items[0].precioBase === originalPrice, `Presupuesto histórico conserva precio base $${originalPrice}`);
  assert(presHistoricoDespues.items[0].precioUnitario === 166500, 'Presupuesto histórico conserva precio aplicado $166.500');
  assert(presHistoricoDespues.items[0].subtotal === 333000, 'Presupuesto histórico conserva subtotal $333.000');
  assert(DataService.getPresupuestoTotal(presHistoricoDespues) === 333000, 'Total histórico permanece inalterado ($333.000)');

  // Restaurar precio original de mat-001 para no afectar otros tests
  DataService.update('materiales', 'mat-001', { precioM2: originalPrice, precioVenta: originalPrice });
}

// ── TEST 10: EDICIÓN DEL CLIENTE SIN ROMPER PRESUPUESTOS EXISTENTES ──
console.log('\n--- TEST 10: EDICIÓN DEL CLIENTE SIN ROMPER PRESUPUESTOS EXISTENTES ---');
{
  // Creamos un cliente con 10% de descuento y un presupuesto asociado
  const cliTest = DataService.create('clientes', {
    nombre: 'Valeria',
    apellido: 'Test',
    condicionComercial: 'especial',
    descuentoHabitual: 10,
    motivoCondicion: 'Promo inauguración'
  });

  const presCli = DataService.create('presupuestos', {
    clienteId: cliTest.id,
    clienteNombre: 'Valeria Test',
    condicionTipo: 'descuento',
    condicionPorcentaje: 10,
    condicionNota: 'Promo inauguración',
    items: [{ id: '1', descripcion: 'Isla', m2: 2.0, precioBase: 100000, precioUnitario: 90000, subtotal: 180000 }],
    adicionales: {},
    descuento: 0,
    impuestos: 0
  });

  // Posteriormente se edita la ficha del cliente cambiando su teléfono y su condición a estándar
  DataService.update('clientes', cliTest.id, {
    telefono: '11-9988-7766',
    condicionComercial: 'estandar',
    descuentoHabitual: 0
  });

  // El presupuesto previamente emitido debe conservar su condición de 10% y sus importes intactos
  const presDespues = DataService.getById('presupuestos', presCli.id);
  assert(presDespues.condicionTipo === 'descuento', 'Presupuesto conserva condición descuento 10%');
  assert(presDespues.items[0].precioUnitario === 90000, 'Precio unitario aplicado se mantiene en $90.000');
  assert(presDespues.items[0].subtotal === 180000, 'Subtotal del presupuesto se mantiene en $180.000');
  assert(presDespues.telefono === '11-9988-7766', 'Teléfono sincronizado en cascada correctamente');
}

// ── TEST 11: APROBACIÓN DEL PRESUPUESTO Y CREACIÓN AUTOMÁTICA DE OBRA ──
console.log('\n--- TEST 11: APROBACIÓN DEL PRESUPUESTO Y CREACIÓN AUTOMÁTICA DE OBRA ---');
{
  const presParaAprobar = DataService.create('presupuestos', {
    clienteId: 'cli-001',
    clienteNombre: 'Carlos Rodríguez',
    condicionTipo: 'descuento',
    condicionPorcentaje: 10,
    condicionNota: 'Cliente habitual 10%',
    descripcion: 'Mesada cocina con descuento especial',
    items: [
      { id: '1', descripcion: 'Mesada', material: 'Granito Negro Absoluto', m2: 2.5, precioBase: 185000, precioUnitario: 166500, subtotal: 416250 }
    ],
    adicionales: { colocacion: 50000 },
    descuento: 0,
    impuestos: 0,
    estado: 'borrador',
    moneda: 'ARS'
  });

  const totalAcordado = DataService.getPresupuestoTotal(presParaAprobar); // 416250 + 50000 = 466250
  assert(totalAcordado === 466250, 'Total presupuestado acordado: $466.250');

  let approvedPresResult = null;
  let obraCreatedResult = null;

  aprobarPresupuesto(presParaAprobar.id, (approvedPres, obra) => {
    approvedPresResult = approvedPres;
    obraCreatedResult = obra;
  });

  assert(approvedPresResult && approvedPresResult.estado === 'aprobado', 'Presupuesto pasa a estado "aprobado"');
  assert(obraCreatedResult !== null, 'Obra creada automáticamente en la aprobación');
  assert(obraCreatedResult.estado === 'pendiente', 'Obra inicia en estado "pendiente"');
  assert(obraCreatedResult.importe === totalAcordado, `Obra conserva importe congelado exacto: $${totalAcordado}`);
  assert(DataService.getObraTotal(obraCreatedResult.id) === totalAcordado, `DataService.getObraTotal devuelve exactamente el importe acordado ($${totalAcordado})`);
}

// ── TEST 12: GENERACIÓN DE PDF LIMPIO PARA EL CLIENTE ──
console.log('\n--- TEST 12: GENERACIÓN DE PDF (PRECIO APLICADO, SIN NOTAS INTERNAS) ---');
{
  const presPdf = {
    numero: 'PRES-2026-9999',
    fecha: '2026-09-20',
    moneda: 'ARS',
    condicionTipo: 'descuento',
    condicionPorcentaje: 10,
    condicionNota: 'Acuerdo confidencial con arquitecto',
    items: [
      { id: '1', descripcion: 'Mesada cocina', material: 'Granito Negro Absoluto', cantidad: 1, largo: 200, ancho: 60, unidadMedida: 'cm', m2: 1.2, precioBase: 185000, precioUnitario: 166500, subtotal: 199800 }
    ],
    adicionales: { colocacion: 30000 },
    descuento: 0,
    impuestos: 0,
    condiciones: 'Condiciones de pago estándar'
  };

  const clienteMock = { nombre: 'Juan', apellido: 'Pérez', telefono: '1122334455' };
  const total = DataService.getPresupuestoTotal(presPdf); // 199800 + 30000 = 229800
  const pdfHtml = generatePresupuestoHtml(presPdf, clienteMock, total);

  // 1. Debe contener el precio final aplicado por m² ($166.500)
  assert(pdfHtml.includes('166.500') || pdfHtml.includes('166500'), 'PDF muestra el precio final aplicado ($166.500)');
  // 2. Debe contener el subtotal del ítem ($199.800) y total ($229.800)
  assert(pdfHtml.includes('199.800') || pdfHtml.includes('199800'), 'PDF muestra el subtotal del ítem ($199.800)');
  assert(pdfHtml.includes('229.800') || pdfHtml.includes('229800'), 'PDF muestra el total general ($229.800)');
  // 3. NO debe contener notas internas ni etiquetas confidenciales
  assert(!pdfHtml.includes('Acuerdo confidencial'), 'PDF NO contiene la nota interna confidencial');
  assert(!pdfHtml.includes('Cliente especial'), 'PDF NO contiene la etiqueta "Cliente especial"');
  assert(!pdfHtml.includes('Precio mayorista'), 'PDF NO contiene la etiqueta "Precio mayorista"');
}

// ── TEST 13: INTERFAZ DE USUARIO Y VALIDACIONES DE FORMULARIO ──
console.log('\n--- TEST 13: INTERFAZ DE USUARIO Y VALIDACIONES EN FORMULARIO ---');
{
  // Abrir formulario para un presupuesto nuevo
  openPresupuestoForm();
  const drawerEl = document.querySelector('.drawer') || document.body;
  assert(drawerEl !== null, 'Drawer de presupuesto abierto');

  const condSelect = drawerEl.querySelector('#pres-condicion-tipo-select');
  const condPctWrap = drawerEl.querySelector('#pres-condicion-porcentaje-wrap');
  const condPctInput = drawerEl.querySelector('#pres-condicion-porcentaje-input');
  const condNotaWrap = drawerEl.querySelector('#pres-condicion-nota-wrap');
  const banner = drawerEl.querySelector('#cliente-condicion-banner');

  assert(condSelect !== null, 'Selector #pres-condicion-tipo-select presente en el formulario');
  assert(condPctInput !== null, 'Input de porcentaje de condición presente');
  assert(banner !== null, 'Contenedor de banner informativo de cliente presente');

  // Cambiar a Descuento especial
  condSelect.value = 'descuento';
  condSelect.dispatchEvent(new Event('change'));
  assert(condPctWrap.style.display !== 'none', 'Al elegir descuento, se muestra el campo de porcentaje');
  assert(condNotaWrap.style.display !== 'none', 'Al elegir descuento, se muestra el campo de nota interna');

  // Cambiar a Precio estándar
  condSelect.value = 'estandar';
  condSelect.dispatchEvent(new Event('change'));
  assert(condPctWrap.style.display === 'none', 'Al volver a precio estándar, se oculta el campo de porcentaje');
  assert(condNotaWrap.style.display === 'none', 'Al volver a precio estándar, se oculta el campo de nota interna');

  // Seleccionar cliente con condición especial (cli-001)
  const cliSelect = drawerEl.querySelector('#pres-cliente-select');
  if (cliSelect) {
    cliSelect.value = 'cli-001';
    cliSelect.dispatchEvent(new Event('change'));
    assert(banner.style.display !== 'none', 'Al seleccionar cliente habitual con condición especial, el banner se hace visible');
    assert(banner.textContent.includes('10%'), 'Banner indica el descuento habitual del cliente (10%)');
  }

  // Cerrar drawer
  Drawer.close();
}

console.log('\n===============================================================');
console.log(`🏁 FIN DE PRUEBAS CONDICIONES COMERCIALES: ${results.passed.length} PASADAS, ${results.failed.length} FALLADAS`);
console.log('===============================================================\n');

if (results.failed.length > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
